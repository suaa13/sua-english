// state.js — global app state, persisted to localStorage
import { fmtDate, uid } from './ui.js';
import { api, setTokens, clearTokens, isAuthed, getRefreshToken } from './api.js';
import { syncNow, flushAndClear, scheduleSync, markAppStateHydrated } from './sync.js';
import { recordReview, advanceStreak, buildSession, levelFromXp, awardXp as engineAwardXp } from './learning-engine.js';

const KEY = 'sua-english-v1';

// 未注册/未登录时的初始状态：一切归零，不预置任何"看起来像真人"的数据。
// 注册登录后由服务端下发该账号的真实数据（见下方 sync:done 监听）。
const defaultState = () => ({
  user: {
    name: '',
    email: '',
    level: 'beginner',          // beginner | elementary | intermediate | upper | advanced
    levelLabel: '英语 0 基础',
    ieltsTarget: 6.5,
    toeflTarget: 90,
    exam: 'ielts',
    examDate: '',
    dailyMins: 30,
    joined: '',
    streak: 0,
    lastActive: '',
    xp: 0,                 // 游戏化累计经验（Duolingo 式激励闭环），与 CEFR 的 level 分开
    glevel: 1,             // 由 xp 推出的游戏等级
    credits: 0,            // 后端积分：走平台 AI 代理时每次消耗 1
    lastCheckIn: null,     // 最近签到日 YYYY-MM-DD（服务端日期）
  },
  vocab: {},                    // wordId -> {status, reps, correct, wrong, lastSeen}
  errors: [],                   // {id,type,q,a,correct,ts,tag,note}
  plan: null,                   // generated study plan
  mocks: [],                    // mock test results
  activity: [],                 // {date, mins, items}
  settings: { theme: 'light' },
  savedAt: 0,                   // 本地最后落盘时间，作为服务端 last-write-wins 的比较键
});

let state = load();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...defaultState(), ...JSON.parse(raw) };
  } catch (e) {}
  return defaultState();
}
function persist() {
  // savedAt 是服务端 last-write-wins 的比较键 —— 只有"确实含学习内容"时才推进它。
  // 否则冷启动时 me()/主题切换这类纯身份写入也会把时间戳刷成"现在"，
  // 让一份空壳状态在服务端赢过云端真实数据（真实踩过的坑）。
  if (hasContent(state)) state.savedAt = Date.now();
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
}

/** 本地主状态是否含真实学习内容（词汇/错题/活动/模考/计划任一非空）。 */
function hasContent(s) {
  if (!s) return false;
  const vocab = s.vocab && typeof s.vocab === 'object' ? Object.keys(s.vocab).length : 0;
  const errors = Array.isArray(s.errors) ? s.errors.length : 0;
  const activity = Array.isArray(s.activity) ? s.activity.length : 0;
  const mocks = Array.isArray(s.mocks) ? s.mocks.length : 0;
  const plan = s.plan ? 1 : 0;
  return vocab + errors + activity + mocks + plan > 0;
}

export const store = {
  get state() { return state; },
  save: persist,

  // ---- user ----
  updateUser(patch) { Object.assign(state.user, patch); persist(); },
  setTheme(t) { state.settings.theme = t; document.documentElement.dataset.theme = t === 'dark' ? 'dark' : 'light'; persist(); },
  toggleTheme() { this.setTheme(state.settings.theme === 'dark' ? 'light' : 'dark'); },

  // ---- vocabulary ----
  vocabStatus(id) { return state.vocab[id]?.status || 'new'; },
  // 手动标记（learn.js 的"标记为掌握/学习中"开关）：映射到质量后交给引擎统一更新。
  // 标 known → EASY(3)，标 learning → GOOD(2)，其余 → HARD(1)；并据此推进掌握度 + 发 XP。
  setVocab(id, status, correct, wrong) {
    const quality = status === 'known' ? 3 : status === 'learning' ? 2 : 1;
    const updated = recordReview(state.vocab[id] || {}, quality);
    if (status === 'known') { updated.mastery = Math.max(updated.mastery, 0.85); updated.status = 'known'; }
    state.vocab[id] = updated;
    this.awardXp(engineAwardXp(updated, quality));
    persist();
    scheduleSync();
  },
  // 真实练习回合计调入口（题库/错题/未来测验页都用它）：统一 SRS + 掌握度 + XP。
  recordReview(id, quality) {
    const updated = recordReview(state.vocab[id] || {}, quality);
    state.vocab[id] = updated;
    this.awardXp(engineAwardXp(updated, quality));
    persist();
    scheduleSync();
    return updated;
  },
  vocabStats() {
    const v = Object.values(state.vocab);
    return {
      total: v.length,
      known: v.filter(x => x.status === 'known').length,
      learning: v.filter(x => x.status === 'learning').length,
      new: v.filter(x => x.status === 'new').length,
    };
  },
  // 只统计"确实练过"的词，不再凭空加 800 基线（未登录时自然为 0）。
  vocabSizeGuess() {
    return Object.values(state.vocab).reduce((a, x) => a + (x.correct || 0) * 3, 0);
  },

  // ---- errors ----
  addError(e) {
    const rec = { id: uid(), ts: Date.now(), ...e };
    state.errors.unshift(rec);
    if (state.errors.length > 500) state.errors.length = 500;
    persist();
    scheduleSync();
    return rec;
  },
  errorStats() {
    const by = { vocab: 0, grammar: 0, listening: 0, reading: 0, writing: 0, speaking: 0 };
    state.errors.forEach(e => { by[e.type] = (by[e.type] || 0) + 1; });
    return by;
  },
  removeError(id) { state.errors = state.errors.filter(e => e.id !== id); persist(); scheduleSync(); },
  clearErrors(type) { if (type) state.errors = state.errors.filter(e => e.type !== type); else state.errors = []; persist(); scheduleSync(); },

  // ---- plan ----
  setPlan(plan) { state.plan = plan; persist(); scheduleSync(); },

  // ---- mock ----
  addMock(m) { state.mocks.unshift({ id: uid(), ts: Date.now(), ...m }); persist(); scheduleSync(); },
  mockStats() {
    if (!state.mocks.length) return null;
    const latest = state.mocks[0];
    const prev = state.mocks[1];
    return { latest, prev };
  },

  // ---- activity / streak ----
  recordActivity(mins = 0, items = 1) {
    const today = fmtDate();
    let a = state.activity.find(x => x.date === today);
    if (!a) { a = { date: today, mins: 0, items: 0 }; state.activity.push(a); }
    a.mins += mins; a.items += items;
    // streak：统一交给引擎，消除"前端 recordActivity / 后端 progress / 签到积分"三套互不连通的实现。
    state.user.streak = advanceStreak(state.user.streak, state.user.lastActive, today);
    state.user.lastActive = today;
    persist();
    scheduleSync();
  },
  // 游戏化 XP：累加并按等级曲线推出 glevel。所有学习动作的唯一经验 sink。
  awardXp(amount) {
    if (!amount) return;
    state.user.xp = (state.user.xp || 0) + amount;
    state.user.glevel = levelFromXp(state.user.xp).level;
    persist();
  },
  // 练习会话编排：到期复习优先 → 新词配额 → 最弱补足。供未来测验/复习页调用。
  buildSession(candidates, opts) { return buildSession(candidates, opts); },
  totalMins() { return state.activity.reduce((a, x) => a + (x.mins || 0), 0); },
  totalItems() { return state.activity.reduce((a, x) => a + (x.items || 0), 0); },
  daysActive() { return new Set(state.activity.map(a => a.date)).size; },

  // ---- reset (dev/clean) ----
  reset() { state = defaultState(); persist(); },

  // ---- backend auth (real REST, JWT) ----
  isAuthed() { return isAuthed(); },

  async login(email, password) {
    const r = await api('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
    setTokens(r.data.tokens.accessToken, r.data.tokens.refreshToken);
    this._applyUser(r.data.user);
    persist();
    // 登录后立刻双向合并一次：本地（离线期间的）改动上行，服务端已有数据下行。
    // syncNow 内部吞掉所有错误，同步失败绝不影响登录本身。
    await syncNow();
    return r.data.user;
  },

  async register(payload) {
    const r = await api('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email: payload.email,
        username: payload.username,
        password: payload.password,
        targetExam: (payload.exam || 'ielts').toUpperCase(),
        targetScore: payload.exam === 'toefl' ? payload.toeflTarget : payload.ieltsTarget,
        currentLevel: payload.level || state.user.level,
        examDate: payload.examDate || undefined,
        dailyStudyMinutes: payload.dailyMins || 30,
      }),
    });
    setTokens(r.data.tokens.accessToken, r.data.tokens.refreshToken);
    this._applyUser(r.data.user);
    persist();
    await syncNow();
    return r.data.user;
  },

  async logout() {
    // 先把本地改动推上去再清本地，否则未同步的错题/计划会丢；
    // 清本地也是必要的 —— 否则下一个登录的账号会继承上一个人的数据。
    await flushAndClear();
    try { await api('/auth/logout', { method: 'POST', body: JSON.stringify({ refreshToken: getRefreshToken() }) }); } catch (e) { /* ignore */ }
    clearTokens();
    // 回到"零数据"的初始态：下一个账号不该看到上一个人的任何痕迹。
    state = defaultState();
    persist();
  },

  async me() {
    try {
      const r = await api('/auth/me');
      this._applyUser(r.data.user);
      persist();
      return r.data.user;
    } catch (e) {
      if (e.status === 401) { clearTokens(); state = defaultState(); persist(); }
      throw e;
    }
  },

  async saveGoals(goals) {
    const exam = goals.exam || state.user.exam;
    const r = await api('/users/goals', {
      method: 'PATCH',
      body: JSON.stringify({
        targetExam: exam.toUpperCase(),
        targetScore: exam === 'toefl' ? goals.toeflTarget : goals.ieltsTarget,
        currentLevel: goals.level || state.user.level,
        examDate: goals.examDate || undefined,
        dailyStudyMinutes: goals.dailyMins || 30,
      }),
    });
    this._applyUser(r.data.user);
    persist();
    return r.data.user;
  },

  // Map a backend SanitizedUser onto the frontend user shape.
  _applyUser(u) {
    if (!u) return;
    state.user.id = u.id || state.user.id;
    state.user.name = u.username || state.user.name;
    state.user.email = u.email || '';
    const exam = (u.targetExam || 'IELTS').toLowerCase();
    state.user.exam = exam === 'toefl' ? 'toefl' : 'ielts';
    state.user.ieltsTarget = state.user.exam === 'ielts' ? (u.targetScore ?? 6.5) : (state.user.ieltsTarget || 6.5);
    state.user.toeflTarget = state.user.exam === 'toefl' ? (u.targetScore ?? 90) : (state.user.toeflTarget || 90);
    state.user.examDate = (u.examDate || '').slice(0, 10);
    state.user.dailyMins = u.dailyStudyMinutes || 30;
    if (u.currentLevel) state.user.level = u.currentLevel;
    // 积分：后端才是真相；接口没带回这两个字段时保留本地值，不要清零。
    if (typeof u.credits === 'number') state.user.credits = u.credits;
    if (u.lastCheckIn !== undefined) state.user.lastCheckIn = u.lastCheckIn || null;
  },

  // ---- credits / 签到（后端为准）----
  /** 拉取余额与今日签到状态。未登录时静默返回 null，不打扰未登录用户。 */
  async fetchCredits() {
    if (!isAuthed()) return null;
    try {
      const r = await api('/credits');
      const d = r && r.data;
      if (d) {
        state.user.credits = d.credits;
        state.user.lastCheckIn = d.lastCheckIn || null;
        state.user.canCheckIn = !!d.canCheckIn;
        persist();
      }
      return d || null;
    } catch (e) { return null; }
  },

  /** 每日签到。返回 { credits, awarded, message }；awarded=0 表示今天已领过。 */
  async checkIn() {
    const r = await api('/credits/checkin', { method: 'POST' });
    const d = (r && r.data) || {};
    state.user.credits = d.credits ?? state.user.credits;
    state.user.lastCheckIn = d.lastCheckIn || state.user.lastCheckIn;
    state.user.canCheckIn = false;
    persist();
    return d;
  },

  /** 本地扣减（用于 AI 调用成功后的乐观更新，真实值以后端为准）。 */
  spendCredit(n = 1) {
    if (typeof state.user.credits === 'number') {
      state.user.credits = Math.max(0, state.user.credits - n);
      persist();
    }
    return state.user.credits;
  },
};

// ---------------------------------------------------------------------------
// 服务端主状态回填：登录/同步完成后，用账号下的真实数据覆盖本地缓存。
// 只在已登录时生效 —— 游客态必须保持零数据。
// ---------------------------------------------------------------------------
function applyServerDoc(doc) {
  if (!doc || typeof doc !== 'object') return false;
  const next = defaultState();
  // 学习数据域：以服务端为准
  next.vocab = doc.vocab && typeof doc.vocab === 'object' ? doc.vocab : {};
  next.errors = Array.isArray(doc.errors) ? doc.errors : [];
  next.activity = Array.isArray(doc.activity) ? doc.activity : [];
  next.mocks = Array.isArray(doc.mocks) ? doc.mocks : [];
  next.plan = doc.plan || null;
  next.savedAt = Number(doc.savedAt) || 0;
  // 用户域：只回填统计/偏好类字段，身份字段交给 /auth/me
  if (doc.user && typeof doc.user === 'object') {
    next.user.streak = Number(doc.user.streak) || 0;
    next.user.lastActive = doc.user.lastActive || '';
    next.user.xp = Number(doc.user.xp) || 0;
    next.user.glevel = Number(doc.user.glevel) || 1;
    next.user.joined = doc.user.joined || '';
    next.user.level = doc.user.level || next.user.level;
    next.user.exam = doc.user.exam || next.user.exam;
    next.user.ieltsTarget = Number(doc.user.ieltsTarget) || next.user.ieltsTarget;
    next.user.toeflTarget = Number(doc.user.toeflTarget) || next.user.toeflTarget;
    next.user.examDate = doc.user.examDate || '';
    next.user.dailyMins = Number(doc.user.dailyMins) || next.user.dailyMins;
  }
  // 会话身份与主题保持不变
  next.user.id = state.user.id || next.user.id;
  next.user.name = state.user.name || next.user.name;
  next.user.email = state.user.email || next.user.email;
  next.user.credits = state.user.credits;
  next.user.lastCheckIn = state.user.lastCheckIn;
  next.settings = state.settings;
  state = next;
  persist();
  return true;
}

document.addEventListener('sync:done', (e) => {
  const app = e && e.detail && e.detail.appState;
  if (!isAuthed()) return;                 // 游客不接受服务端数据
  // 只要与服务端完成过一次往返，就解除"空壳不上行"的限制。
  markAppStateHydrated();
  if (!app || !app.doc) return;
  // 本地有更新的内容时不回退（本地为准，稍后会推上去）。
  const serverTs = Number(app.updatedAt) || 0;
  const localHasContent = hasContent(state);
  if (localHasContent && state.savedAt && serverTs && serverTs < state.savedAt) return;
  if (applyServerDoc(app.doc)) {
    document.dispatchEvent(new CustomEvent('state:hydrated', { detail: { source: 'server' } }));
  }
});

/** 当前账号学习数据打包（供 sync.js 上行）。不含任何令牌/密码。 */
export function appStateDoc() {
  return {
    vocab: state.vocab,
    errors: state.errors,
    activity: state.activity,
    mocks: state.mocks,
    plan: state.plan,
    user: {
      streak: state.user.streak,
      lastActive: state.user.lastActive,
      xp: state.user.xp,
      glevel: state.user.glevel,
      joined: state.user.joined,
      level: state.user.level,
      exam: state.user.exam,
      ieltsTarget: state.user.ieltsTarget,
      toeflTarget: state.user.toeflTarget,
      examDate: state.user.examDate,
      dailyMins: state.user.dailyMins,
    },
    savedAt: state.savedAt || Date.now(),
  };
}

// derived helpers
export function accuracy() {
  let c = 0, w = 0;
  Object.values(state.vocab).forEach(v => { c += v.correct; w += v.wrong; });
  state.errors.forEach(e => { if (e.correct === false) w++; });
  return c + w ? Math.round((c / (c + w)) * 100) : 0;
}

export function levelToLabel(lv) {
  return ({ beginner: '英语 0 基础', elementary: '基础 A1–A2', intermediate: '中级 B1', upper: '中高级 B2', advanced: '高级 C1' })[lv] || lv;
}
