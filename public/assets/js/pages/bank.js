// pages/bank.js — 真题题库（后端驱动 + 分页 + 在线练习）
import { icon, modal, toast, qsa, openLlmSettings } from '../ui.js';
import { api } from '../api.js';
import { llmChat } from '../ai.js';
import { scheduleSync, syncNow, markTombstone, markPlanRemoved, syncLabel } from '../sync.js';
import { GUIDES } from '../guides.js';
import { recordReview, awardXp as engineAwardXp } from '../learning-engine.js';
import { store } from '../state.js';

const PAGE_SIZE = 24;

let f = { exam: 'all', subject: 'all', difficulty: 'all', q: '' };
let page = 1;
let total = 0;
let items = [];
let remote = false; // 是否已成功接入后端

const EXAMS = [['all', '全部'], ['IELTS', 'IELTS'], ['TOEFL', 'TOEFL']];
const SUBJECTS = [['all', '全部'], ['Listening', '听力'], ['Reading', '阅读'], ['Writing', '写作'], ['Speaking', '口语'], ['Vocabulary', '词汇']];
const DIFFS = [['all', '全部'], ['easy', '入门'], ['medium', '进阶'], ['hard', '挑战']];

const levelTone = (exam) => (exam === 'IELTS' ? 'var(--c-ielts)' : 'var(--c-toefl)');
const diffLabel = (d) => ({ easy: '入门', medium: '进阶', hard: '挑战' }[d] || d || '');

// ---- Phase 4：互动练习 + 错题本（localStorage，无需登录）----
const WQ_KEY = 'sua_wrong_questions';
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const parseMC = (prompt) => {
  const re = /([A-D])\.\s*(.+)/g; const opts = []; let m;
  while ((m = re.exec(prompt || ''))) opts.push({ letter: m[1], text: m[2].trim() });
  return opts.length >= 2 ? opts : null;
};
const parseCorrectLetter = (ref) => { const m = String(ref || '').match(/正确答案[:：]\s*([A-D])/); return m ? m[1] : null; };
const parseAnswerWord = (ref) => { const m = String(ref || '').match(/正确答案[:：]\s*([A-Za-z][A-Za-z'’.\-]*)/); return m ? m[1] : null; };
const DAY = 86400000;
const loadWQ = () => {
  try { return (JSON.parse(localStorage.getItem(WQ_KEY) || '[]')).map((x) => ({
    dueAt: x.dueAt != null ? x.dueAt : (x.wrongAt || Date.now()),
    interval: x.interval != null ? x.interval : 0,
    ease: x.ease != null ? x.ease : 2.5,
    reps: x.reps != null ? x.reps : 0,
    lastReview: x.lastReview || 0,
    updatedAt: x.updatedAt != null ? x.updatedAt : (x.lastReview || x.wrongAt || Date.now()),
    ...x,
  })); } catch (e) { return []; }
};
const saveWQ = (list) => localStorage.setItem(WQ_KEY, JSON.stringify(list.slice(0, 500)));
const addWQ = (b) => {
  const list = loadWQ();
  if (list.some((x) => x.id === b.id)) return false;
  const now = Date.now();
  list.unshift({ id: b.id, exam: b.exam, subject: b.subject, type: b.type, title: b.title, prompt: b.prompt, referenceAnswer: b.referenceAnswer, wrongAt: now, dueAt: now, interval: 0, ease: 2.5, reps: 0, lastReview: 0, updatedAt: now });
  saveWQ(list);
  scheduleSync();
  return true;
};
// 删除要留墓碑，否则另一台设备上的旧副本下次推送时会把它复活。
const removeWQ = (id) => { markTombstone(id); saveWQ(loadWQ().filter((x) => x.id !== id)); scheduleSync(); };
// 清空同理：只写空数组不留墓碑的话，服务端记录会在下次合并时全部回流，清空等于无效。
const clearWQ = () => { loadWQ().forEach((x) => markTombstone(x.id)); saveWQ([]); scheduleSync(); };
const wqCount = () => loadWQ().length;
const dueCount = () => loadWQ().filter((x) => (x.dueAt || 0) <= Date.now()).length;
const schedLabel = (b) => {
  const d = b.dueAt || 0;
  if (d <= Date.now()) return '待复习';
  const days = Math.round((d - Date.now()) / DAY);
  return days <= 0 ? '今天' : `${days} 天后`;
};
const refreshWqBadge = () => {
  const el = document.getElementById('bank-wrong');
  if (el) { const s = el.querySelector('span'); if (s) s.textContent = `错题本 (${wqCount()})`; }
  const rv = document.getElementById('bank-review');
  if (rv) { const s = rv.querySelector('span'); if (s) s.textContent = `复习错题 (${dueCount()})`; }
};
const shuffle = (a) => { const r = a.slice(); for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; } return r; };
const session = { correct: 0, total: 0 };

// ---- Phase 9：跨设备同步的状态展示与手动触发 ----
const syncChip = () => {
  const s = syncLabel();
  const tone = s.tone === 'ok' ? 'chip-ok' : (s.tone === 'warn' ? 'chip-due' : '');
  const tip = s.localOnly ? '已开启仅本机存储：学习数据不会上传到服务器'
    : s.authed ? '已登录：学习计划与错题本会自动跨设备同步' : '未登录：数据仅保存在本机，登录后自动同步';
  return `<span class="chip ${tone}" id="sync-chip" title="${tip}">${s.text}</span>`;
};
const syncBtn = () => (syncLabel().localOnly
  ? '<span class="muted text-sm" id="sync-hint">仅本机模式，数据不上传</span>'
  : (syncLabel().authed
  ? `<button class="btn btn-soft btn-sm" id="sync-now">${icon('refresh', { size: 14 })}<span>立即同步</span></button>`
  : '<span class="muted text-sm" id="sync-hint">登录后可跨设备同步</span>'));
const bindSyncBtn = (rerender) => {
  const btn = document.getElementById('sync-now');
  if (!btn) return;
  btn.onclick = async () => {
    const lab = btn.querySelector('span');
    const old = lab ? lab.textContent : '';
    btn.disabled = true;
    if (lab) lab.textContent = '同步中…';
    const r = await syncNow();
    if (lab) lab.textContent = old;
    btn.disabled = false;
    if (r && r.ok) { toast(`同步完成 · ${r.items} 题`); refreshWqBadge(); if (rerender) rerender(); }
    else if (r && r.skipped) toast('未登录，数据仅保存在本机');
    else toast((r && r.error) || '同步失败，稍后再试');
  };
};

// ---- Phase 6/10：学习计划（localStorage，无需登录）----
// 设计要点：
//  - 「每天记的词」与「每天做的题」拆成两条独立轨道：单词量稳定（默认 30，几十个），题目量按日期浮动、不雷同。
//  - 科目配比按题库真实题量动态计算（fetchSubjectWeights），而非写死权重；口语/写作语料极小，自然占比低。
//  - 每日题量用日期哈希确定性浮动（同天稳定、跨天变化），并随连续打卡轻微上浮、周末略减。
const PLAN_KEY = 'sua_study_plan';
const SUBJECT_CN = { Listening: '听力', Reading: '阅读', Writing: '写作', Speaking: '口语', Vocabulary: '词汇' };
const GOALS = [['IELTS', 'IELTS'], ['TOEFL', 'TOEFL'], ['CET4', '四级'], ['CET6', '六级']];
const PRACTICE_SUBJECTS = ['Listening', 'Reading', 'Speaking', 'Writing']; // 非词汇的「做题」科目
// 后端不可用时兜底：按题库大致规模（口语/写作语料极小故压低）
const FALLBACK_WEIGHTS = { Listening: 46, Reading: 33, Speaking: 12, Writing: 9 };
const todayKey = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const loadPlan = () => { try { return JSON.parse(localStorage.getItem(PLAN_KEY) || 'null'); } catch (e) { return null; } };
const savePlan = (p) => {
  const stamped = { ...p, updatedAt: Date.now() };
  localStorage.setItem(PLAN_KEY, JSON.stringify(stamped));
  scheduleSync();
  return stamped;
};
const removePlan = () => { markPlanRemoved(); localStorage.removeItem(PLAN_KEY); scheduleSync(); };

// 确定性字符串哈希（同输入 → 同输出，范围 [0,1)）
const hashStr = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967295; };
// 每日「非词汇」题量：以 base 为中枢，按日期确定性浮动；保证每天不一样、有些天明显更少
const dayQuota = (dateStr, base, streak = 0) => {
  const r = hashStr('q:' + dateStr);
  const swing = 0.35 + r * 1.05;            // 0.35 ~ 1.40
  const dow = new Date(dateStr + 'T00:00:00').getDay();
  const weekend = (dow === 0 || dow === 6) ? 0.8 : 1; // 周末略减
  const streakAdj = Math.min(0.2, (streak || 0) * 0.01); // 连续打卡越高，小幅上浮
  return Math.max(1, Math.round(base * swing * weekend * (1 + streakAdj)));
};
// 按权重把 total 分到各科目（每科至少 1；先削溢出再补不足）
const distributeBy = (total, weights) => {
  const entries = Object.entries(weights).filter(([, w]) => w > 0);
  const sum = entries.reduce((a, [, w]) => a + w, 0) || 1;
  const raw = entries.map(([s, w]) => (total * w) / sum);
  let alloc = entries.map(([s], i) => [s, Math.max(1, Math.floor(raw[i]))]);
  let over = alloc.reduce((a, [, n]) => a + n, 0) - total;
  while (over > 0) {
    let mi = 0; for (let k = 1; k < alloc.length; k++) if (alloc[k][1] > alloc[mi][1]) mi = k;
    if (alloc[mi][1] <= 1) break;
    alloc[mi][1]--; over--;
  }
  let under = total - alloc.reduce((a, [, n]) => a + n, 0);
  const frac = raw.map((v, i) => [i, v - Math.floor(v)]).sort((a, b) => b[1] - a[1]);
  for (let k = 0; k < under; k++) alloc[frac[k % frac.length][0]][1]++;
  return alloc.map(([s, n]) => ({ subject: s, count: n }));
};
// 实时探测题库各科目真实题量 → 归一化权重（动态配比核心）；探测失败回退静态权重
async function fetchSubjectWeights(goal) {
  const probe = async (subject) => {
    try {
      const p = new URLSearchParams(); p.set('subject', subject); p.set('take', '1');
      if (goal && goal !== 'all') p.set('exam', goal);
      const res = await api('/question-bank/random?' + p.toString());
      return (res && res.data && Number(res.data.total)) || 0;
    } catch (e) { return 0; }
  };
  const totals = {}; let any = false;
  await Promise.all(PRACTICE_SUBJECTS.map(async (s) => { const t = await probe(s); totals[s] = t; if (t > 0) any = true; }));
  return any ? totals : { ...FALLBACK_WEIGHTS };
}
const genPlan = (goal, wordsPerDay, questionsBase, days, weights) => ({
  goal, wordsPerDay, questionsBase, days,
  weights,                      // {Listening,Reading,Speaking,Writing} 实时题量（动态配比）
  createdAt: Date.now(), streak: 0, progress: {},
});
// 某天任务（确定性、随日期浮动；不含实时到期错题）
const dayTasks = (plan, dateStr) => {
  const words = plan.wordsPerDay || 0;
  const w = (plan.weights && plan.weights.Listening != null) ? plan.weights : FALLBACK_WEIGHTS;
  const other = distributeBy(dayQuota(dateStr, plan.questionsBase || 12, plan.streak), w);
  const newTotal = words + other.reduce((a, t) => a + t.count, 0);
  return { words, other, newTotal };
};
const planTodayTasks = (plan) => dayTasks(plan, todayKey());
const planTodayNewTotal = (plan) => planTodayTasks(plan).newTotal;
const planTodayDone = (plan) => ((plan && plan.progress && plan.progress[todayKey()]) || 0);

// ---- 间隔复习：统一走 learning-engine（与词汇/错题同一套 SRS + 掌握度 + XP）----
// 答错(quality 0)立即回盒0重练；答对(quality 3)按 Leitner 盒 + ease 拉长间隔。
const recordSM2 = (b, ok) => {
  let list = loadWQ();
  let it = list.find((x) => x.id === b.id);
  if (!it) { addWQ(b); list = loadWQ(); it = list.find((x) => x.id === b.id); }
  if (!it) return;
  session.total++; if (ok) session.correct++;
  // 把引擎算出的排程映射回错题本字段（dueAt/interval/ease/box/mastery/status）。
  const u = recordReview(it, ok ? 3 : 0);
  it.box = u.box; it.ease = u.ease; it.reps = u.reps; it.lapses = u.lapses;
  it.interval = u.interval; it.dueAt = u.due; it.mastery = u.mastery; it.status = u.status;
  it.lastReview = Date.now(); it.updatedAt = it.lastReview;
  saveWQ(list);
  store.awardXp(engineAwardXp(u, ok ? 3 : 0)); // 题库练习也计入游戏化 XP
  refreshWqBadge();
  scheduleSync();
};

function query(pageNo) {
  const p = new URLSearchParams();
  p.set('page', String(pageNo || page));
  p.set('pageSize', String(PAGE_SIZE));
  if (f.exam !== 'all') p.set('exam', f.exam);
  if (f.subject !== 'all') p.set('subject', f.subject);
  if (f.difficulty !== 'all') p.set('difficulty', f.difficulty);
  if (f.q.trim()) p.set('search', f.q.trim());
  return p.toString();
}

function cardHtml(b) {
  return `<div class="card card-click" data-bank="${b.id}">
    <div class="row gap-2">
      <span class="badge" style="color:${levelTone(b.exam)}">${b.exam}</span>
      <span class="badge">${b.subject}</span>
      ${b.year ? `<span class="badge" style="margin-left:auto">${b.year}</span>` : ''}
    </div>
    <div class="card-title mt-3">${b.title}</div>
    ${b.type ? `<div class="row gap-2 mt-2"><span class="chip">${b.type}</span><span class="chip">${diffLabel(b.difficulty)}</span></div>` : ''}
    <div class="muted text-sm clamp-2 mt-2">${(b.prompt || '').replace(/\n/g, ' ').slice(0, 90)}…</div>
    <div class="row gap-2 mt-3" style="margin-top:auto"><span class="text-sm" style="color:var(--brand)">开始练习</span>${icon('chevron', { size: 14 })}</div>
  </div>`;
}

function pagerHtml() {
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (pages <= 1) return '';
  const from = (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, total);
  return `<div class="row gap-3 mt-5" style="justify-content:center;align-items:center;flex-wrap:wrap">
    <button class="btn btn-ghost" id="pg-first" ${page <= 1 ? 'disabled' : ''}><span>首页</span></button>
    <button class="btn btn-ghost" id="pg-prev" ${page <= 1 ? 'disabled' : ''}>${icon('arrowL', { size: 15 })}<span>上一页</span></button>
    <span class="muted text-sm">${from}–${to} / 共 ${total} 题</span>
    ${pages > 1 ? `<span class="row gap-2" style="align-items:center">
      <span class="muted text-sm">第</span>
      <input class="input" id="pg-jump" type="number" min="1" max="${pages}" value="${page}"
        style="width:84px;text-align:center;padding:6px 8px" aria-label="跳转到页码">
      <span class="muted text-sm">/ ${pages} 页</span>
      <button class="btn btn-ghost" id="pg-go">跳转</button>
    </span>` : ''}
    <button class="btn btn-ghost" id="pg-next" ${page >= pages ? 'disabled' : ''}><span>下一页</span>${icon('chevron', { size: 15 })}</button>
    <button class="btn btn-ghost" id="pg-last" ${page >= pages ? 'disabled' : ''}><span>末页</span></button>
  </div>`;
}

export function render() {
  return `<div class="page"><div class="crumb"><a href="#/home">首页</a><span class="sep">/</span><span>真题题库</span></div>
    <div class="section-head"><div><h2>真题题库</h2><div class="sub" id="bank-note">正在加载真题库…</div></div>
      <span class="badge" id="bank-count">—</span></div>

    <div class="card mb-5">
      <div class="grid grid-4 gap-4">
        <div><label class="label">考试</label><select class="select" id="f-exam">${EXAMS.map(([v, l]) => `<option value="${v}" ${f.exam === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
        <div><label class="label">科目</label><select class="select" id="f-subject">${SUBJECTS.map(([v, l]) => `<option value="${v}" ${f.subject === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
        <div><label class="label">难度</label><select class="select" id="f-diff">${DIFFS.map(([v, l]) => `<option value="${v}" ${f.difficulty === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
        <div><label class="label">搜索</label><div class="row gap-2"><input class="input" id="f-q" placeholder="关键词 / 题型…" value="${f.q}">${icon('search', { size: 16 })}</div></div>
      </div>
      <div class="row gap-2 mt-4" style="flex-wrap:wrap">
        <button class="btn btn-primary" id="bank-random">${icon('refresh', { size: 16 })}<span>随机抽题</span></button>
        <button class="btn btn-soft" id="bank-review">${icon('clock', { size: 16 })}<span>复习错题 (${dueCount()})</span></button>
        <button class="btn btn-soft" id="bank-wrong">${icon('bookmark', { size: 16 })}<span>错题本 (${wqCount()})</span></button>
        <button class="btn btn-soft" id="bank-plan">${icon('target', { size: 16 })}<span>学习计划</span></button>
        <span class="muted text-sm">在当前筛选条件内随机抽 1 题，答题自动收集错题并按记忆曲线安排复习；适合 10 万+ 题库的日常练习。</span>
      </div>
    </div>

    <div id="bank-body">
      <div class="grid grid-3" id="bank-list"><div class="muted" style="grid-column:1/-1;padding:40px">正在从真题库加载…</div></div>
    </div>
  </div>`;
}

function paintBody() {
  const body = document.getElementById('bank-body');
  if (!body) return;
  body.innerHTML = (items.length
    ? `<div class="grid grid-3" id="bank-list">${items.map(cardHtml).join('')}</div>`
    : `<div class="card empty" style="padding:48px"><div class="muted">没有匹配的题目，换个筛选条件试试。</div></div>`)
    + pagerHtml();
  bindCards(body);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const prev = document.getElementById('pg-prev');
  const next = document.getElementById('pg-next');
  const first = document.getElementById('pg-first');
  const last = document.getElementById('pg-last');
  const jump = document.getElementById('pg-jump');
  const go = document.getElementById('pg-go');
  if (prev) prev.onclick = () => goPage(page - 1);
  if (next) next.onclick = () => goPage(page + 1);
  if (first) first.onclick = () => goPage(1);
  if (last) last.onclick = () => goPage(pages);
  const doJump = () => {
    const n = parseInt(jump && jump.value, 10);
    if (!n || n === page) return;
    goPage(n);
  };
  if (go) go.onclick = doJump;
  // 回车即可跳转，输入框只接受 1..pages
  if (jump) {
    jump.onkeydown = (e) => { if (e.key === 'Enter') doJump(); };
    jump.oninput = () => {
      const n = parseInt(jump.value, 10);
      if (n > pages) jump.value = pages;
      if (n < 1 && jump.value !== '') jump.value = 1;
    };
  }
}

function paintMeta() {
  const cnt = document.getElementById('bank-count');
  if (cnt) cnt.textContent = total ? `${total} 题` : '0 题';
  const note = document.getElementById('bank-note');
  if (note) {
    note.textContent = remote
      ? `已接入后端真题库 · 共 ${total} 题，支持筛选、搜索与在线练习`
      : '后端未连接，暂不可用（请启动 backend 服务）';
  }
}

function goPage(n) {
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  page = Math.min(Math.max(1, n), pages);
  load();
}

let loadToken = 0;
async function load() {
  const my = ++loadToken;
  if (!remote) {
    const body = document.getElementById('bank-body');
    if (body) body.innerHTML = '<div class="muted" style="padding:40px">正在连接真题库…</div>';
  }
  try {
    const res = await api('/question-bank?' + query());
    if (my !== loadToken) return; // 丢弃过期响应
    const data = (res && res.data) || {};
    items = Array.isArray(data.items) ? data.items : [];
    total = Number(data.total) || 0;
    remote = true;
  } catch (e) {
    if (my !== loadToken) return;
    items = []; total = 0; remote = false;
  }
  paintBody();
  paintMeta();
}

function bindCards(root) {
  root.querySelectorAll('[data-bank]').forEach((c) => {
    c.onclick = () => {
      const b = items.find((x) => x.id === c.dataset.bank);
      if (b) openQuestion(b);
    };
  });
}

/** 在当前筛选条件内随机抽 1 题并直接打开练习弹窗 */
async function pickRandom() {
  const btn = document.getElementById('bank-random');
  const label = btn && btn.querySelector('span');
  if (btn) btn.disabled = true;
  if (label) label.textContent = '抽取中…';
  try {
    const p = new URLSearchParams();
    if (f.exam !== 'all') p.set('exam', f.exam);
    if (f.subject !== 'all') p.set('subject', f.subject);
    if (f.difficulty !== 'all') p.set('difficulty', f.difficulty);
    if (f.q.trim()) p.set('search', f.q.trim());
    const res = await api('/question-bank/random?' + p.toString());
    const list = (res && res.data && Array.isArray(res.data.items)) ? res.data.items : [];
    if (!list.length) {
      if (label) label.textContent = '暂无匹配题目';
      return;
    }
    openQuestion(list[0]);
  } catch (e) {
    if (label) label.textContent = '抽取失败';
  } finally {
    if (btn) btn.disabled = false;
    setTimeout(() => { if (label) label.textContent = '随机抽题'; }, 600);
  }
}

function openQuestion(b, opts = {}) {
  const ansId = 'q-ans-' + String(b.id).replace(/[^a-zA-Z0-9_-]/g, '');
  const mc = parseMC(b.prompt);
  const correctLetter = parseCorrectLetter(b.referenceAnswer);
  const isChoice = mc && correctLetter;
  const ansWord = parseAnswerWord(b.referenceAnswer);
  const isSpelling = /拼写填空|听写填空/.test(b.type || '') && ansWord;

  let body = '';
  if (isChoice) {
    body = `<div class="q-opts mt-4">${mc.map((o) => `<button class="q-opt" data-letter="${o.letter}"><span class="q-opt-key">${o.letter}</span><span class="q-opt-txt">${esc(o.text)}</span></button>`).join('')}</div>`;
  } else if (isSpelling) {
    body = `<div class="row gap-2 mt-4"><input class="input" id="${ansId}-inp" placeholder="输入答案（不区分大小写）" style="flex:1"><button class="btn btn-primary" id="${ansId}-chk"><span>检查</span></button></div>`;
  } else {
    body = `<div class="muted mt-4 text-sm">本题为开放式题型，点击「显示参考答案」查看评分要点。</div>`;
  }

  modal(`<div class="row gap-2 mb-2">
      <span class="badge" style="color:${levelTone(b.exam)}">${b.exam}</span>
      <span class="badge">${b.subject}</span>
      ${b.type ? `<span class="badge">${b.type}</span>` : ''}
      ${b.year ? `<span class="badge">${b.year}</span>` : ''}
    </div>
    <div class="card-title mt-2">${esc(b.title)}</div>
    <div class="ai-panel mt-4"><b>题目</b>
      <p class="mt-2 text-sm" style="white-space:pre-line">${esc(b.prompt)}</p></div>
    ${body}
    <div class="ai-panel mt-3" id="${ansId}" style="display:none"><b>参考答案 / 要点</b>
      <p class="mt-2 text-sm" style="white-space:pre-line">${esc(b.referenceAnswer || '该题暂未提供参考答案。')}</p></div>
    <div class="ai-panel mt-3" id="${ansId}-explain" style="display:none"><b>AI 智能解析</b><span class="llm-badge off" id="${ansId}-eb">本地规则</span>
      <div class="mt-2 text-sm" id="${ansId}-explain-body"></div></div>
    <div class="row gap-2 mt-4" style="flex-wrap:wrap;align-items:center">
      <button class="btn btn-soft" id="${ansId}-rev"><span>显示参考答案</span></button>
      <button class="btn btn-primary" id="${ansId}-next">${icon('refresh', { size: 15 })}<span>下一题</span></button>
      <button class="btn btn-soft" id="${ansId}-save">${icon('bookmark', { size: 15 })}<span>加入错题本</span></button>
      <button class="btn btn-soft" id="${ansId}-ai">${icon('sparkles', { size: 15 })}<span>AI 讲题</span></button>
      <button class="btn btn-ghost btn-icon" id="${ansId}-aiconf" title="配置 AI 网关">${icon('settings', { size: 15 })}</button>
      <button class="btn btn-ghost" onclick="closeModal()"><span>关闭</span></button>
      <span class="muted text-sm" id="${ansId}-stat" style="margin-left:auto">本次练习 ${session.correct}/${session.total}</span>
    </div>`, { wide: true });

  const revBtn = document.getElementById(ansId + '-rev');
  const panel = document.getElementById(ansId);
  const stat = () => { const s = document.getElementById(ansId + '-stat'); if (s) s.textContent = `本次练习 ${session.correct}/${session.total}`; };
  const recordIfWrong = (ok) => {
    session.total++;
    if (ok) session.correct++;
    else if (addWQ(b)) { toast('答错，已加入错题本'); refreshWqBadge(); }
    stat();
  };
  const onResult = opts.onResult || recordIfWrong;
  if (revBtn && panel) revBtn.onclick = () => {
    const show = panel.style.display === 'none'; panel.style.display = show ? 'block' : 'none';
    revBtn.querySelector('span').textContent = show ? '隐藏参考答案' : '显示参考答案';
  };

  if (isChoice) {
    const optEls = qsa('.q-opt');
    let done = false;
    optEls.forEach((el) => {
      el.onclick = () => {
        if (done) return; done = true;
        const ok = el.dataset.letter === correctLetter;
        optEls.forEach((o) => { if (o.dataset.letter === correctLetter) o.classList.add('q-correct'); else if (o === el) o.classList.add('q-wrong'); o.disabled = true; });
        onResult(ok);
        if (panel) panel.style.display = 'block';
        if (revBtn) revBtn.querySelector('span').textContent = '隐藏参考答案';
      };
    });
  } else if (isSpelling) {
    const inp = document.getElementById(ansId + '-inp');
    const chk = document.getElementById(ansId + '-chk');
    const check = () => {
      if (!inp || inp.disabled) return;
      const ok = inp.value.trim().toLowerCase() === String(ansWord).toLowerCase();
      inp.disabled = true; if (chk) chk.disabled = true;
      inp.classList.add(ok ? 'q-input-ok' : 'q-input-bad');
      onResult(ok);
      if (panel) panel.style.display = 'block';
      if (revBtn) revBtn.querySelector('span').textContent = '隐藏参考答案';
    };
    if (chk) chk.onclick = check;
    if (inp) inp.onkeydown = (e) => { if (e.key === 'Enter') check(); };
  }

  const nextBtn = document.getElementById(ansId + '-next');
  if (nextBtn) nextBtn.onclick = opts.next || pickRandom;
  const saveBtn = document.getElementById(ansId + '-save');
  if (saveBtn) {
    if (opts.review) { saveBtn.querySelector('span').textContent = '已在错题本'; saveBtn.disabled = true; }
    else saveBtn.onclick = () => { if (addWQ(b)) { toast('已加入错题本'); refreshWqBadge(); } else toast('已在错题本中'); };
  }

  const aiBtn = document.getElementById(ansId + '-ai');
  const explainPanel = document.getElementById(ansId + '-explain');
  const explainBody = document.getElementById(ansId + '-explain-body');
  const explainBadge = document.getElementById(ansId + '-eb');
  if (aiBtn && explainPanel && explainBody) {
    aiBtn.onclick = async () => {
      explainPanel.style.display = 'block';
      aiBtn.disabled = true;
      const lab = aiBtn.querySelector('span'); if (lab) lab.textContent = '解析中…';
      try {
        const res = await explainQuestion(b, mc, correctLetter, ansWord);
        explainBody.innerHTML = res.html;
        if (explainBadge) { explainBadge.textContent = res.mode === 'llm' ? '真实模型' : '本地规则'; explainBadge.className = 'llm-badge ' + (res.mode === 'llm' ? 'on' : 'off'); }
      }
      catch (e) { explainBody.innerHTML = '<div class="muted">解析失败，请稍后再试。</div>'; }
      if (lab) lab.textContent = 'AI 讲题';
      aiBtn.disabled = false;
    };
  }
  const aiConf = document.getElementById(ansId + '-aiconf');
  if (aiConf) aiConf.onclick = () => openLlmSettings();
}

/** 错题本：展示 localStorage 中收集到的错题，支持重练 / 移除 / 清空 / 间隔复习 */
function openWrongBook() {
  const list = loadWQ();
  const items = list.length
    ? list.map((b) => `<div class="wq-item" data-wq="${b.id}">
        <div class="row gap-2"><span class="badge" style="color:${levelTone(b.exam)}">${b.exam}</span><span class="badge">${b.subject}</span>${b.type ? `<span class="chip">${b.type}</span>` : ''}<span class="chip ${ (b.dueAt || 0) <= Date.now() ? 'chip-due' : 'chip-ok' }" style="margin-left:auto">${schedLabel(b)}</span></div>
        <div class="card-title mt-2">${esc(b.title)}</div>
        <div class="muted text-sm clamp-2 mt-2">${esc(b.prompt).replace(/\n/g, ' ').slice(0, 80)}…</div>
        <div class="row gap-2 mt-3"><button class="btn btn-soft btn-sm" data-retry="${b.id}"><span>重练</span></button><button class="btn btn-ghost btn-sm" data-del="${b.id}"><span>移除</span></button></div>
      </div>`).join('')
    : `<div class="muted" style="padding:32px;grid-column:1/-1">还没有错题。答错的题目会自动收集到这里，并按记忆曲线安排复习。</div>`;
  modal(`<div class="row gap-2 mb-3"><h3>错题本</h3>${syncChip()}<span class="badge" style="margin-left:auto">${list.length} 题 · ${dueCount()} 待复习</span></div>
    ${list.length ? `<div class="row gap-2 mb-3"><button class="btn btn-soft btn-sm" id="wq-clear">清空</button><button class="btn btn-primary btn-sm" id="wq-practice">随机重练</button><button class="btn btn-soft btn-sm" id="wq-review">${icon('clock', { size: 14 })}<span>开始复习 (${dueCount()})</span></button>${syncBtn()}</div>` : `<div class="row gap-2 mb-3">${syncBtn()}</div>`}
    <div class="grid grid-2" id="wq-list">${items}</div>`, { wide: true });
  qsa('#wq-list [data-retry]').forEach((el) => el.onclick = () => { const b = list.find((x) => x.id === el.dataset.retry); if (b) openQuestion(b); });
  qsa('#wq-list [data-del]').forEach((el) => el.onclick = () => { removeWQ(el.dataset.del); openWrongBook(); });
  bindSyncBtn(() => openWrongBook());
  const clear = document.getElementById('wq-clear');
  if (clear) clear.onclick = () => { clearWQ(); openWrongBook(); toast('已清空错题本'); refreshWqBadge(); };
  const practice = document.getElementById('wq-practice');
  if (practice) practice.onclick = () => { const b = list[Math.floor(Math.random() * list.length)]; if (b) openQuestion(b); };
  const review = document.getElementById('wq-review');
  if (review) review.onclick = () => startReview();
}

/** 间隔复习：仅抽出当前到期的错题，逐题练习并写入 SM-2 调度 */
function startReview() {
  const due = loadWQ().filter((x) => (x.dueAt || 0) <= Date.now());
  if (!due.length) { toast('暂无可复习的错题，都复习完啦'); return; }
  const queue = shuffle(due.slice());
  let i = 0;
  const step = () => {
    if (i >= queue.length) {
      const remain = dueCount();
      toast(remain ? `本轮复习结束，还有 ${remain} 题待复习` : '全部复习完成，今天稳了');
      openWrongBook();
      return;
    }
    const b = queue[i++];
    openQuestion(b, {
      review: true,
      onResult: (ok) => recordSM2(b, ok),
      next: () => step(),
    });
  };
  step();
}

// ---- Phase 7：AI 讲题（本地规则化，可选 LLM 钩子）----
const safeParse = (s) => { try { return JSON.parse(s); } catch (e) { return null; } };
async function explainQuestion(b, mc, correctLetter, ansWord) {
  const llm = safeParse(localStorage.getItem('sua_llm'));
  if (llm && llm.base && llm.key) {
    try { const r = await llmExplain(b, llm); if (r) return { html: `<div style="white-space:pre-line">${esc(r)}</div>`, mode: 'llm' }; } catch (e) { /* 回退规则 */ }
  }
  return { html: ruleExplain(b, mc, correctLetter, ansWord), mode: 'rule' };
}
function ruleExplain(b, mc, correctLetter, ansWord) {
  const parts = [];
  const subj = SUBJECT_CN[b.subject] || b.subject;
  if (mc && correctLetter) {
    const corr = mc.find((o) => o.letter === correctLetter);
    parts.push(`<div class="ex-row"><span class="ex-dot ex-ok">✓</span><b>正确答案：${correctLetter}. ${esc(corr ? corr.text : '')}</b></div>`);
    mc.forEach((o) => {
      if (o.letter === correctLetter) return;
      parts.push(`<div class="ex-row"><span class="ex-dot ex-bad">✗</span>干扰项 ${o.letter}. ${esc(o.text)}（语义与正确项不同，注意区分）</div>`);
    });
  } else if (ansWord) {
    parts.push(`<div class="ex-row"><span class="ex-dot ex-ok">✓</span><b>答案词：${esc(ansWord)}</b>（${ansWord.length} 个字母，首字母 ${esc(ansWord[0].toUpperCase())}）</div>`);
  }
  const TYPE_TIP = { '音标辨词': '音标与发音对应', '音标选义': '听音辨义', '听写填空': '拼写与音标对应', '语境词义': '上下文词义推断', '选词填空': '词语搭配与语法', '词义辨析': '近义词辨析' };
  parts.push(`<div class="ex-row"><b>考点：</b>${TYPE_TIP[b.type] || (subj + '基础训练')}</div>`);
  const wm = String(b.referenceAnswer || '').match(/（([A-Za-z][A-Za-z'’.\-]*)\s*[··]\s*([^）]+)）/);
  if (wm) parts.push(`<div class="ex-row"><b>词目：</b>${esc(wm[1])} — ${esc(wm[2])}</div>`);
  parts.push(`<div class="muted text-sm mt-2">理解词义与语境比死记更牢；答错会自动进错题本并按记忆曲线复习。</div>`);
  return parts.join('');
}
async function llmExplain(b, llm) {
  const prompt = `请用中文简要讲解这道题的考点与解题思路（不超过 200 字）。题目：${b.prompt} 参考答案：${b.referenceAnswer}`;
  const r = await llmChat([{ role: 'user', content: prompt }], { cfg: llm, temperature: 0.3 });
  return r || null;
}

// ---- Phase 10：学习计划 UI 与今日练习（动态配比 + 每日浮动 + 错题穿插）----
// Phase E：计划内占比偏低的科目，推荐去对应练习页看「方法锦囊」（与 fetchSubjectWeights 动态配比联动）
function lowWeightRecommend(plan) {
  const w = plan && plan.weights;
  if (!w) return '';
  const keys = ['Listening', 'Reading', 'Speaking', 'Writing'];
  const sum = keys.reduce((a, k) => a + (Number(w[k]) || 0), 0);
  if (!sum) return '';
  const low = keys.filter((k) => (Number(w[k]) || 0) / sum < 0.18).map((k) => ({ k, cn: SUBJECT_CN[k] }));
  if (!low.length) return '';
  return `<div class="ai-panel mt-4"><div class="row gap-2" style="color:var(--brand)">${icon('bulb', { size: 18 })}<b>微指南推荐</b></div>
    <div class="muted text-sm mt-2">本周以下科目在计划里占比偏低，去对应练习页看「方法锦囊」补强：</div>
    <div class="row gap-2 mt-3" style="flex-wrap:wrap">${low.map((s) => `<a class="btn btn-soft btn-sm" href="#/learn/${s.k.toLowerCase()}">${icon('arrowR', { size: 14 })}<span>${s.cn}指南</span></a>`).join('')}</div></div>`;
}
function openPlan() {
  const plan = loadPlan();
  if (!plan) { renderPlanConfig(); return; }
  const today = planTodayTasks(plan);
  const due = dueCount();
  const done = planTodayDone(plan);
  const newTotal = today.newTotal;
  const remain = Math.max(0, newTotal - done);
  const pct = newTotal ? Math.round((done / newTotal) * 100) : 0;
  const otherChips = today.other.map((t) => `<span class="chip">${SUBJECT_CN[t.subject] || t.subject} ${t.count}</span>`).join('');
  const otherTotal = today.other.reduce((a, t) => a + t.count, 0);
  let preview = '';
  for (let d = 0; d < 7; d++) {
    const dt = new Date(); dt.setDate(dt.getDate() + d);
    const ds = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
    const tk = dayTasks(plan, ds);
    const isT = d === 0;
    preview += `<div class="plan-day ${isT ? 'plan-day-today' : ''}"><div class="row gap-2"><span class="badge">${ds.slice(5)}</span>${isT ? '<span class="chip chip-due">今天</span>' : ''}</div>
      <div class="row gap-2 mt-2" style="flex-wrap:wrap"><span class="chip">记 ${tk.words} 词</span>${tk.other.map((t) => `<span class="chip">${SUBJECT_CN[t.subject] || t.subject} ${t.count}</span>`).join('')}</div>
      <div class="muted text-sm mt-2">新题 ${tk.newTotal} + 复习 ${dueCount()}</div></div>`;
  }
  modal(`<div class="row gap-2 mb-3"><h3>学习计划</h3>${syncChip()}<span class="badge" style="margin-left:auto">${plan.goal} · 每天记 ${plan.wordsPerDay} 词 · ${plan.days} 天</span></div>
    <div class="ai-panel mt-2"><div class="row gap-3" style="align-items:center">
      <div class="ring" style="--p:${pct}"><span>${pct}%</span></div>
      <div><div class="card-title">今日任务</div>
        <div class="muted text-sm mt-1">记 <b>${today.words}</b> 个单词 + 做 <b>${otherTotal}</b> 道题（${otherChips || '—'}）${due ? ` + 复习 <b>${due}</b> 道错题` : ''}　|　连续打卡 ${plan.streak || 0} 天</div>
        <div class="muted text-sm mt-1">每日题量按日期自动浮动（有些天少、有些天多），并按题库真实题量动态配比科目；到期的错题会优先穿插复习。</div></div>
    </div></div>
    <div class="row gap-2 mt-4" style="flex-wrap:wrap">
      <button class="btn btn-primary" id="plan-start">${icon('target', { size: 16 })}<span>${remain ? '继续今日练习' : '开始今日练习'}</span></button>
      <button class="btn btn-soft" id="plan-reset">${icon('refresh', { size: 15 })}<span>重新生成</span></button>
      ${syncBtn()}
    </div>
    ${lowWeightRecommend(plan)}
    <div class="card-title mt-5">近期日程（每天题量不同）</div>
    <div class="grid grid-3 gap-3 mt-3" id="plan-sched">${preview}</div>`, { wide: true });
  const start = document.getElementById('plan-start');
  if (start) start.onclick = () => startDailyPractice(plan);
  const reset = document.getElementById('plan-reset');
  if (reset) reset.onclick = () => { removePlan(); renderPlanConfig(); };
  bindSyncBtn(() => openPlan());
}
function renderPlanConfig() {
  modal(`<div class="row gap-2 mb-3"><h3>生成学习计划</h3></div>
    <div class="card"><div class="grid grid-3 gap-4">
      <div><label class="label">目标考试</label><select class="select" id="plan-goal">${GOALS.map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}</select></div>
      <div><label class="label">每天记单词数（几十个）</label><input class="input" id="plan-words" type="number" min="10" max="60" value="30"></div>
      <div><label class="label">每日基础题量（听力/阅读/口语/写作，会浮动）</label><input class="input" id="plan-qbase" type="number" min="5" max="60" value="12"></div>
    </div>
    <div class="grid grid-3 gap-4 mt-3">
      <div><label class="label">周期（天）</label><input class="input" id="plan-days" type="number" min="7" max="180" value="30"></div>
    </div>
    <div class="muted text-sm mt-3" id="plan-wnote">生成时会自动探测题库中各科目真实题量，按比例动态分配每日科目；每日题量随日期浮动，避免每天雷同。把「每日基础题量」调小，轻量天的题会更少。</div>
    <div class="row gap-2 mt-4"><button class="btn btn-primary" id="plan-gen">${icon('sparkles', { size: 16 })}<span>生成计划</span></button></div></div>`, { wide: true });
  const gen = document.getElementById('plan-gen');
  if (gen) gen.onclick = async () => {
    const goal = document.getElementById('plan-goal').value;
    const wordsPerDay = Math.max(10, Math.min(60, parseInt(document.getElementById('plan-words').value, 10) || 30));
    const questionsBase = Math.max(5, Math.min(60, parseInt(document.getElementById('plan-qbase').value, 10) || 12));
    const days = Math.max(7, Math.min(180, parseInt(document.getElementById('plan-days').value, 10) || 30));
    const note = document.getElementById('plan-wnote'); if (note) note.textContent = '正在探测题库题量…';
    gen.disabled = true;
    let weights;
    try { weights = await fetchSubjectWeights(goal); } catch (e) { weights = { ...FALLBACK_WEIGHTS }; }
    gen.disabled = false;
    savePlan(genPlan(goal, wordsPerDay, questionsBase, days, weights));
    toast('学习计划已生成（已按题库题量动态配比）');
    openPlan();
  };
}
async function startDailyPractice(plan) {
  const today = planTodayTasks(plan);
  const due = loadWQ().filter((x) => (x.dueAt || 0) <= Date.now());
  const newTotal = today.newTotal;
  let doneNew = planTodayDone(plan);
  if (doneNew >= newTotal && !due.length) { toast('今日已完成，明天再来'); openPlan(); return; }

  // 拉新题：单词走词汇科目，其余按动态权重分配到各科目；考试无题则退回全量
  const pull = async (subject, n, exam) => {
    if (n <= 0) return [];
    const tryExam = async (ex) => {
      try {
        const p = new URLSearchParams(); p.set('subject', subject); p.set('take', String(Math.min(50, n)));
        if (ex && ex !== 'all') p.set('exam', ex);
        const res = await api('/question-bank/random?' + p.toString());
        return (res && res.data && Array.isArray(res.data.items)) ? res.data.items : [];
      } catch (e) { return []; }
    };
    let items = await tryExam(exam);
    if (!items.length && exam && exam !== 'all') items = await tryExam(null); // 该考试无题则退回全量
    return items;
  };
  let newQueue = [];
  newQueue.push(...(await pull('Vocabulary', today.words, plan.goal)));
  for (const t of today.other) newQueue.push(...(await pull(t.subject, t.count, plan.goal)));
  newQueue = shuffle(newQueue).slice(Math.min(doneNew, newQueue.length)); // 续做：跳过已完成的新题

  const reviewQueue = shuffle(due.slice());
  const queue = [...reviewQueue, ...newQueue]; // 错题优先穿插
  if (!queue.length) { toast('拉取题目失败，请确认后端已连接'); return; }

  let i = 0;
  const step = () => {
    if (i >= queue.length) {
      plan.progress[todayKey()] = newTotal;
      const y = new Date(); y.setDate(y.getDate() - 1);
      const yk = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, '0')}-${String(y.getDate()).padStart(2, '0')}`;
      plan.streak = (plan.progress[yk] != null) ? (plan.streak || 0) + 1 : 1;
      savePlan(plan);
      const left = dueCount();
      toast(left ? `今日练习完成，连续打卡 ${plan.streak || 0} 天（还有 ${left} 道待复习）` : `今日练习完成，连续打卡 ${plan.streak || 0} 天`);
      openPlan();
      return;
    }
    const b = queue[i];
    const isReview = i < reviewQueue.length;
    openQuestion(b, {
      review: isReview,
      onResult: (ok) => {
        if (isReview) recordSM2(b, ok);
        else { if (!ok) { addWQ(b); refreshWqBadge(); } doneNew++; plan.progress[todayKey()] = doneNew; savePlan(plan); }
        session.total++; if (ok) session.correct++;
      },
      next: () => { i++; step(); },
    });
  };
  step();
}

window.addEventListener('page:rendered', (e) => {
  if (e.detail.seg !== 'bank') return;
  const root = document.getElementById('app');
  root.querySelector('#f-exam').onchange = (ev) => { f.exam = ev.target.value; page = 1; load(); };
  root.querySelector('#f-subject').onchange = (ev) => { f.subject = ev.target.value; page = 1; load(); };
  root.querySelector('#f-diff').onchange = (ev) => { f.difficulty = ev.target.value; page = 1; load(); };
  const rndBtn = root.querySelector('#bank-random');
  if (rndBtn) rndBtn.onclick = pickRandom;
  const wqBtn = root.querySelector('#bank-wrong');
  if (wqBtn) wqBtn.onclick = openWrongBook;
  const reviewBtn = root.querySelector('#bank-review');
  if (reviewBtn) reviewBtn.onclick = startReview;
  const planBtn = root.querySelector('#bank-plan');
  if (planBtn) planBtn.onclick = openPlan;

  let t = null;
  root.querySelector('#f-q').oninput = (ev) => {
    f.q = ev.target.value;
    clearTimeout(t);
    t = setTimeout(() => { page = 1; load(); }, 320); // 输入防抖，避免每敲一个字就请求
  };

  load();
});
