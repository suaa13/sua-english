// state.js — global app state, persisted to localStorage
import { fmtDate, uid } from './ui.js';
import { api, setTokens, clearTokens, isAuthed, getRefreshToken } from './api.js';
import { syncNow, flushAndClear } from './sync.js';

const KEY = 'sua-english-v1';

const defaultState = () => ({
  user: {
    name: '学习者',
    email: '',
    level: 'beginner',          // beginner | elementary | intermediate | upper | advanced
    levelLabel: '英语 0 基础',
    ieltsTarget: 6.5,
    toeflTarget: 90,
    exam: 'ielts',
    examDate: '',
    dailyMins: 30,
    joined: fmtDate(),
    streak: 1,
    lastActive: fmtDate(),
    credits: 0,            // 后端积分：走平台 AI 代理时每次消耗 1
    lastCheckIn: null,     // 最近签到日 YYYY-MM-DD（服务端日期）
  },
  vocab: {},                    // wordId -> {status, reps, correct, wrong, lastSeen}
  errors: [],                   // {id,type,q,a,correct,ts,tag,note}
  plan: null,                   // generated study plan
  mocks: [],                    // mock test results
  activity: [],                 // {date, mins, items}
  settings: { theme: 'light' },
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
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
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
  setVocab(id, status, correct, wrong) {
    const cur = state.vocab[id] || { status: 'new', reps: 0, correct: 0, wrong: 0, lastSeen: null };
    cur.reps += 1;
    if (correct) cur.correct += 1; else if (wrong) cur.wrong += 1;
    cur.status = status;
    cur.lastSeen = fmtDate();
    state.vocab[id] = cur;
    persist();
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
  vocabSizeGuess() { return 800 + state.vocab ? Object.values(state.vocab).reduce((a, x) => a + x.correct * 3, 0) : 800; },

  // ---- errors ----
  addError(e) {
    const rec = { id: uid(), ts: Date.now(), ...e };
    state.errors.unshift(rec);
    if (state.errors.length > 500) state.errors.length = 500;
    persist();
    return rec;
  },
  errorStats() {
    const by = { vocab: 0, grammar: 0, listening: 0, reading: 0, writing: 0, speaking: 0 };
    state.errors.forEach(e => { by[e.type] = (by[e.type] || 0) + 1; });
    return by;
  },
  removeError(id) { state.errors = state.errors.filter(e => e.id !== id); persist(); },
  clearErrors(type) { if (type) state.errors = state.errors.filter(e => e.type !== type); else state.errors = []; persist(); },

  // ---- plan ----
  setPlan(plan) { state.plan = plan; persist(); },

  // ---- mock ----
  addMock(m) { state.mocks.unshift({ id: uid(), ts: Date.now(), ...m }); persist(); },
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
    // streak
    if (state.user.lastActive !== today) {
      const y = new Date(); y.setDate(y.getDate() - 1);
      const yStr = fmtDate(y);
      state.user.streak = (state.user.lastActive === yStr) ? state.user.streak + 1 : 1;
      state.user.lastActive = today;
    }
    persist();
  },
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
    state.user.name = '学习者';
    persist();
  },

  async me() {
    try {
      const r = await api('/auth/me');
      this._applyUser(r.data.user);
      persist();
      return r.data.user;
    } catch (e) {
      if (e.status === 401) { state.user.name = '学习者'; persist(); }
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
