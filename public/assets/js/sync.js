// assets/js/sync.js — 学习计划 / 错题本的跨设备同步
//
// 设计要点：
//  1. 服务端 POST /sync/push 本身就是"双向合并"——它按每条记录的 clientUpdatedAt
//     做 last-write-wins，然后回吐合并后的权威全量。所以客户端只需要一个动作：
//     把本地推上去，再用响应覆盖本地。不需要单独的 pull-then-merge 分支。
//  2. 删除必须靠墓碑传播。物理删本地记录后如果不留痕，另一台设备上的旧副本
//     会在下次推送时把它"复活"。
//  3. 未登录时全部静默 no-op —— 纯本地模式必须继续可用，同步只是增强。
//  4. 「仅本机存储」开关（sua_local_only）优先级最高：即使用户已登录也完全不上行，
//     且登出时不能清本地同步域数据 —— 那已经是用户唯一的副本。

import { api, isAuthed } from './api.js';

export const PLAN_KEY = 'sua_study_plan';
export const WQ_KEY = 'sua_wrong_questions';
export const CEFR_KEY = 'sua_cefr_profile';
export const STATE_KEY = 'sua_learning_state';
export const REVIEW_KEY = 'sua_weekly_reviews';
const TOMB_KEY = 'sua_wq_tombstones';
const REVIEW_TOMB_KEY = 'sua_weekly_review_tombstones';
const PLAN_DEL_KEY = 'sua_plan_removed_at';
const LAST_KEY = 'sua_sync_last';
const LOCAL_KEY = 'sua_local_only';
/** 主状态：本地键（sua-english-v1，由 state.js 维护）+ 服务端副本键。 */
const APP_KEY = 'sua-english-v1';
const APP_SERVER_KEY = 'sua_app_state';

/** 「仅本机存储」开关：打开后即使已登录也不做任何上行。默认关闭（跟随登录）。 */
export function isLocalOnly() {
  try { return localStorage.getItem(LOCAL_KEY) === '1'; } catch (e) { return false; }
}
export function setLocalOnly(v) {
  try { if (v) localStorage.setItem(LOCAL_KEY, '1'); else localStorage.removeItem(LOCAL_KEY); } catch (e) { /* ignore */ }
}

const jget = (k, fb) => {
  try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? fb : v; }
  catch (e) { return fb; }
};
const jset = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* 配额满则忽略 */ } };
const del = (k) => { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } };

// ---------------- 墓碑 ----------------
export function markTombstone(id) {
  if (!id) return;
  const list = jget(TOMB_KEY, []);
  const now = Date.now();
  const i = list.findIndex((x) => x && x.id === id);
  if (i >= 0) list[i].ts = now; else list.push({ id: String(id), ts: now });
  jset(TOMB_KEY, list.slice(-2000));
}
export function markPlanRemoved() { try { localStorage.setItem(PLAN_DEL_KEY, String(Date.now())); } catch (e) { /* ignore */ } }
export function lastSyncAt() { const v = Number(localStorage.getItem(LAST_KEY) || 0); return Number.isFinite(v) ? v : 0; }

// ---------------- 归一化（必须满足服务端 DTO 约束，否则 400）----------------
const int = (v, fb) => { const n = Math.trunc(Number(v)); return Number.isFinite(n) && n >= 0 ? n : fb; };
const str = (v, max) => (v == null || v === '' ? undefined : String(v).slice(0, max));
const clamp = (v, lo, hi, fb) => { const n = Number(v); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : fb; };

function cleanItem(x) {
  const now = Date.now();
  const wrongAt = int(x.wrongAt, now);
  const lastReview = int(x.lastReview, 0);
  return {
    id: String(x.id).slice(0, 64),
    exam: str(x.exam, 32),
    subject: str(x.subject, 32),
    type: str(x.type, 64),
    title: str(x.title, 500),
    prompt: str(x.prompt, 8000),
    referenceAnswer: str(x.referenceAnswer, 8000),
    wrongAt,
    dueAt: int(x.dueAt, wrongAt),
    interval: Math.min(36500, int(x.interval, 0)),
    ease: clamp(x.ease, 1.3, 3, 2.5),
    reps: int(x.reps, 0),
    lastReview,
    updatedAt: int(x.updatedAt, lastReview || wrongAt),
  };
}

function cleanPlan(p) {
  const created = int(p.createdAt, Date.now());
  return {
    goal: str(p.goal, 32) || 'IELTS',
    daily: Math.round(clamp(p.daily, 1, 500, 20)),
    days: Math.round(clamp(p.days, 1, 365, 30)),
    weights: p.weights && typeof p.weights === 'object' ? p.weights : undefined,
    schedule: Array.isArray(p.schedule) ? p.schedule.slice(0, 400) : undefined,
    progress: p.progress && typeof p.progress === 'object' ? p.progress : undefined,
    streak: int(p.streak, 0),
    createdAt: created,
    updatedAt: int(p.updatedAt, created),
  };
}

function cleanCefr(c) {
  if (!c || typeof c !== 'object') return undefined;
  const created = int(c.createdAt, Date.now());
  return {
    overall: str(c.overall, 4) || 'A1',
    skills: c.skills && typeof c.skills === 'object' ? c.skills : undefined,
    diagnostic: c.diagnostic && typeof c.diagnostic === 'object' ? c.diagnostic : undefined,
    goal12w: c.goal12w && typeof c.goal12w === 'object' ? c.goal12w : undefined,
    createdAt: created,
    updatedAt: int(c.updatedAt, created),
  };
}

function cleanState(s) {
  if (!s || typeof s !== 'object') return undefined;
  const created = int(s.createdAt, Date.now());
  return {
    doc: s.doc && typeof s.doc === 'object' ? s.doc : undefined,
    createdAt: created,
    updatedAt: int(s.updatedAt, created),
  };
}

function cleanReview(x) {
  if (!x || typeof x !== 'object') return null;
  const weekStart = str(x.weekStart, 16);
  if (!weekStart) return null;
  const updatedAt = int(x.updatedAt, Date.now());
  return {
    weekStart,
    doc: x.doc && typeof x.doc === 'object' ? x.doc : undefined,
    deleted: Boolean(x.deleted),
    updatedAt,
  };
}

/** 读取 / 写入本地 CEFR 能力档案（未登录也保留，登录后随同步上行）。 */
export function getCefr() { return jget(CEFR_KEY, null); }
export function setCefr(obj) { jset(CEFR_KEY, obj); }

/** 读取 / 写入本地学习状态（Learning State）。 */
export function getLearningState() { return jget(STATE_KEY, null); }
export function setLearningState(obj) { jset(STATE_KEY, obj); }

/** 读取 / 写入本地每周复盘列表。 */
export function getWeeklyReviews() { return jget(REVIEW_KEY, []); }
export function setWeeklyReviews(arr) { jset(REVIEW_KEY, Array.isArray(arr) ? arr : []); }

/** 删除某周复盘：落墓碑并从本地列表移除，下次同步传播删除。 */
export function markReviewRemoved(weekStart) {
  if (!weekStart) return;
  const list = jget(REVIEW_KEY, []).filter((x) => x && x.weekStart !== weekStart);
  jset(REVIEW_KEY, list);
  const tombs = jget(REVIEW_TOMB_KEY, []);
  const now = Date.now();
  const i = tombs.findIndex((t) => t && t.weekStart === weekStart);
  if (i >= 0) tombs[i].ts = now; else tombs.push({ weekStart: String(weekStart), ts: now });
  jset(REVIEW_TOMB_KEY, tombs.slice(-104));
}

// ---------------- 同步 ----------------
let timer = null;
let inFlight = null;
let again = false;

/** 本地变更后调用：合并短时间内的多次改动，避免每答一题打一次网络。 */
export function scheduleSync(delay = 1500) {
  if (!isAuthed() || isLocalOnly()) return;
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => { timer = null; syncNow(); }, delay);
}

/** 立即同步。未登录 / 仅本机模式都静默跳过，不抛错、不打扰用户。 */
export async function syncNow() {
  if (isLocalOnly()) return { skipped: 'local-only' };
  if (!isAuthed()) return { skipped: 'anonymous' };
  if (inFlight) { again = true; return inFlight; }
  inFlight = run().finally(() => {
    inFlight = null;
    if (again) { again = false; scheduleSync(400); }
  });
  return inFlight;
}

async function run() {
  const plan = jget(PLAN_KEY, null);
  const items = jget(WQ_KEY, []);
  const tombs = jget(TOMB_KEY, []);
  const removedAt = int(localStorage.getItem(PLAN_DEL_KEY), 0);
  const cefr = cleanCefr(jget(CEFR_KEY, null));
  const state = cleanState(jget(STATE_KEY, null));
  const reviews = jget(REVIEW_KEY, []);
  const reviewTombs = jget(REVIEW_TOMB_KEY, []);
  // 主状态（词汇进度 / 错题 / 每日活动 / 模考 / 计划）：整体一个 JSON 文档上行。
  // 直接读 localStorage 而不是 import state.js —— 后者 import 了本模块，会形成环。
  const appRaw = jget(APP_KEY, null);
  const appTs = int(appRaw && appRaw.savedAt, 0);

  const body = {
    wrongQuestions: (Array.isArray(items) ? items : []).filter((x) => x && x.id).slice(0, 1000).map(cleanItem),
    tombstones: (Array.isArray(tombs) ? tombs : []).filter((x) => x && x.id).slice(-2000)
      .map((t) => ({ id: String(t.id).slice(0, 64), ts: int(t.ts, 0) })),
    weeklyReviews: (Array.isArray(reviews) ? reviews : []).filter((x) => x && x.weekStart).slice(0, 104).map(cleanReview),
    weeklyReviewTombstones: (Array.isArray(reviewTombs) ? reviewTombs : []).filter((x) => x && x.weekStart).slice(-104)
      .map((t) => ({ weekStart: String(t.weekStart).slice(0, 16), ts: int(t.ts, 0) })),
  };
  if (plan) body.plan = cleanPlan(plan);
  else if (removedAt) body.planRemovedAt = removedAt;
  if (cefr) body.cefr = cefr;
  if (state) body.state = state;
  if (appRaw && appTs) body.appState = { doc: appRaw, updatedAt: appTs };

  try {
    const r = await api('/sync/push', { method: 'POST', body: JSON.stringify(body) });
    const d = r && r.data;
    if (!d) throw new Error('同步响应为空');

    // 服务端返回的是合并后的权威全量 —— 直接覆盖本地。
    jset(WQ_KEY, Array.isArray(d.wrongQuestions) ? d.wrongQuestions : []);
    jset(TOMB_KEY, Array.isArray(d.tombstones) ? d.tombstones : []);
    if (d.plan) jset(PLAN_KEY, d.plan); else del(PLAN_KEY);
    if (d.cefr) jset(CEFR_KEY, d.cefr); else del(CEFR_KEY);
    if (d.state) jset(STATE_KEY, d.state); else del(STATE_KEY);
    if (d.appState) jset(APP_SERVER_KEY, d.appState); else del(APP_SERVER_KEY);
    if (Array.isArray(d.weeklyReviews)) {
      const live = d.weeklyReviews.filter((x) => x && !x.deleted);
      jset(REVIEW_KEY, live);
    } else {
      del(REVIEW_KEY);
    }
    // 服务端回吐的墓碑只用于和本地 tomb 去重，这里保留未确认的本地 tomb 直到服务端确认？
    // 简单做法：服务端返回全量墓碑，用服务端墓碑替换本地墓碑。
    jset(REVIEW_TOMB_KEY, Array.isArray(d.weeklyReviewTombstones) ? d.weeklyReviewTombstones : []);
    del(PLAN_DEL_KEY);
    try { localStorage.setItem(LAST_KEY, String(Date.now())); } catch (e) { /* ignore */ }

    const res = { ok: true, items: (d.wrongQuestions || []).length, plan: !!d.plan, appState: d.appState || null };
    document.dispatchEvent(new CustomEvent('sync:done', { detail: res }));
    return res;
  } catch (e) {
    const res = { ok: false, error: (e && e.message) || '同步失败' };
    document.dispatchEvent(new CustomEvent('sync:fail', { detail: res }));
    return res;
  }
}

/** 清掉同步域数据（错题、计划、CEFR、学习状态、周复盘）。
 *  仅本机模式下由用户在登出确认框里**显式**触发，不能在登出流程里自动调。 */
export function clearLocalSyncData() {
  del(WQ_KEY); del(TOMB_KEY); del(PLAN_KEY); del(CEFR_KEY); del(STATE_KEY); del(REVIEW_KEY); del(REVIEW_TOMB_KEY); del(PLAN_DEL_KEY); del(LAST_KEY);
}

/** 本机是否有值得提醒的同步域数据（用于登出确认）。 */
export function hasLocalData() {
  try {
    const wq = jget(WQ_KEY, null);
    if (Array.isArray(wq) && wq.length) return true;
    if (jget(PLAN_KEY, null)) return true;
    if (jget(CEFR_KEY, null)) return true;
    if (jget(STATE_KEY, null)) return true;
    const rv = jget(REVIEW_KEY, []);
    if (Array.isArray(rv) && rv.length) return true;
  } catch (e) { /* ignore */ }
  return false;
}

/** 登出前调用：先把本地推上去，再清掉同步域数据，避免下一个账号继承上一个人的错题。
 *  仅本机模式下**不清本地** —— 本地就是唯一副本，清掉等于删用户数据。
 *  该模式下的串号风险由 auth.js 的登出确认框兜底（用户显式选择保留或清空）。 */
export async function flushAndClear() {
  if (isLocalOnly()) return { skipped: 'local-only', kept: true };
  if (isAuthed()) { try { await syncNow(); } catch (e) { /* 尽力而为 */ } }
  clearLocalSyncData();
}

/** 同步状态文案，供 UI 直接渲染。 */
export function syncLabel() {
  if (isLocalOnly()) return { text: '仅本机存储', tone: 'ok', authed: isAuthed(), localOnly: true };
  if (!isAuthed()) return { text: '仅本机', tone: 'muted', authed: false };
  const t = lastSyncAt();
  if (!t) return { text: '待同步', tone: 'warn', authed: true };
  const mins = Math.floor((Date.now() - t) / 60000);
  if (mins < 1) return { text: '已同步', tone: 'ok', authed: true };
  if (mins < 60) return { text: `${mins} 分钟前同步`, tone: 'ok', authed: true };
  return { text: `${Math.floor(mins / 60)} 小时前同步`, tone: 'ok', authed: true };
}
