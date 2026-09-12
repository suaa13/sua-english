// learning-engine.js — 统一学习引擎（纯函数，零依赖，浏览器/Node 通用）
// ---------------------------------------------------------------------------
// 把散落在各处的「学习逻辑」收敛到一处，对齐用户要的"一套逻辑"：
//   1) 间隔复习(SRS)   —— 借鉴 FSRS(open-spaced-repetition/fsrs4)「按回忆概率排程」+
//                         SM-2 的 ease 因子；用 Leitner 盒表达梯度。
//   2) 掌握度模型       —— 借鉴百词斩「四档掌握」(不认识/模糊/熟悉/掌握)，
//                         用质量 EMA 推出连续 mastery∈[0,1]，再映射档位。
//   3) 激励闭环         —— 借鉴 Duolingo 的 XP + 等级 + 连胜(streak)。
//   4) 练习会话编排     —— 借鉴 Duolingo/百词斩「混合复习」：优先到期 → 新词配额 → 最弱补足。
//
// 设计约束：纯函数为主，不碰 storage；旧 vocab 记录(status 仅有 known/learning/new)
// 首次进入引擎时按 status 迁移出 box/mastery，向后兼容。

export const QUALITY = { AGAIN: 0, HARD: 1, GOOD: 2, EASY: 3 };

// Leitner 盒 → 间隔(天)。盒 0 = 本次会话内重练（10 分钟后）。
export const BOX_INTERVALS_DAYS = [0, 1, 3, 7, 16, 35];
export const BOX_COUNT = BOX_INTERVALS_DAYS.length;
const SAME_SESSION_MS = 10 * 60 * 1000;
const DAY = 86400000;
const DEFAULT_EASE = 2.5;
const MIN_EASE = 1.3;

// 四档掌握（对齐百词斩），由 mastery 映射。
export const TIERS = ['new', 'learning', 'familiar', 'known'];

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const clamp01 = (v) => clamp(v, 0, 1);
const clampQuality = (q) => clamp(Math.round(Number(q)), 0, 3);

function fmtDateStatic(d = new Date()) {
  const x = d instanceof Date ? d : new Date(d);
  const p = (n) => String(n).padStart(2, '0');
  return `${x.getFullYear()}-${p(x.getMonth() + 1)}-${p(x.getDate())}`;
}

export function tierFromMastery(m) {
  if (m >= 0.85) return 'known';
  if (m >= 0.55) return 'familiar';
  if (m >= 0.25) return 'learning';
  return 'new';
}

// 归一化 + 旧数据迁移：旧 vocab 只有 status(known/learning/new)，无 box/mastery。
function normalize(entry, now = Date.now()) {
  const e = entry && typeof entry === 'object' ? entry : {};
  const out = {
    box: typeof e.box === 'number' ? e.box : 0,
    ease: typeof e.ease === 'number' ? e.ease : DEFAULT_EASE,
    reps: typeof e.reps === 'number' ? e.reps : 0,
    lapses: typeof e.lapses === 'number' ? e.lapses : 0,
    interval: typeof e.interval === 'number' ? e.interval : 0,
    due: typeof e.due === 'number' ? e.due : now,
    correct: typeof e.correct === 'number' ? e.correct : 0,
    wrong: typeof e.wrong === 'number' ? e.wrong : 0,
    mastery: typeof e.mastery === 'number' ? e.mastery : 0,
    lastSeen: e.lastSeen || null,
    status: e.status || 'new',
  };
  // 首次进入引擎：按旧 status 给一个合理的初始档位（幂等，box 存在则跳过）。
  if (e.box == null) {
    if (e.status === 'known') { out.box = BOX_COUNT - 1; out.mastery = 0.9; out.status = 'known'; }
    else if (e.status === 'learning') { out.box = 2; out.mastery = 0.45; out.status = 'learning'; }
    else { out.box = 0; out.mastery = 0; out.status = 'new'; }
  }
  return out;
}

// ---- 核心：由单次回忆质量更新一条学习记录（纯函数） ----
export function recordReview(entry, quality, now = Date.now()) {
  const e = normalize(entry, now);
  const q = clampQuality(quality);

  // Leitner 盒推进：AGAIN 回盒0；HARD 不倒退但也不冒进；GOOD +1；EASY +2(更快毕业)。
  let box = e.box;
  if (q === 0) box = 0;
  else if (q === 1) box = Math.min(box, BOX_COUNT - 2);
  else if (q === 2) box = Math.min(BOX_COUNT - 1, box + 1);
  else box = Math.min(BOX_COUNT - 1, box + 2);

  // 掌握度：主要由 Leitner 毕业进度驱动（盒越高越熟），叠一点正确率；
  // 答错(AGAIN)则掌握度减半（不归零留底）并回盒0重新排程。
  // 这样"连续答对、爬到顶盒"自然 = known，与 SRS 毕业同一套逻辑。
  let m;
  if (q === 0) {
    m = clamp01((e.mastery || 0) * 0.5);
  } else {
    const boxProg = box / (BOX_COUNT - 1);
    const correctN = (e.correct || 0) + 1;
    const wrongN = (e.wrong || 0);
    const acc = correctN / (correctN + wrongN);
    m = clamp01(boxProg * 0.8 + acc * 0.2);
  }

  // 间隔与到期
  let intervalDays, due;
  if (q === 0) { intervalDays = 0; due = now + SAME_SESSION_MS; }
  else {
    intervalDays = BOX_INTERVALS_DAYS[box];
    if (q === 3) intervalDays = Math.round(intervalDays * e.ease); // EASY 用 ease 额外拉长
    due = now + intervalDays * DAY;
  }

  // ease 因子(SM-2)
  let ease = e.ease;
  if (q === 0) ease = Math.max(MIN_EASE, ease - 0.2);
  else ease = clamp(ease + (q === 3 ? 0.15 : q === 2 ? 0.1 : 0), MIN_EASE, 3.0);

  const reps = (e.reps || 0) + 1;
  const lapses = q === 0 ? (e.lapses || 0) + 1 : (e.lapses || 0);

  return {
    ...e,
    box, ease, reps, lapses,
    interval: intervalDays,
    due,
    mastery: m,
    correct: (e.correct || 0) + (q >= 1 ? 1 : 0), // HARD 及以上算答对(回忆成功，只是吃力)
    wrong: (e.wrong || 0) + (q === 0 ? 1 : 0),
    lastSeen: fmtDateStatic(now),
    status: tierFromMastery(m),
  };
}

// 连胜：唯一真源。今天已计则返回原值；昨天活跃 +1；断档则重置为 1。
export function advanceStreak(streak, lastActive, today) {
  if (lastActive === today) return streak || 0;
  const y = new Date(today); y.setDate(y.getDate() - 1);
  const yStr = fmtDateStatic(y);
  if (lastActive === yStr) return (streak || 0) + 1;
  return 1;
}

// 单次复习 XP：基础分 × 盒难度系数(越熟仍给分维持习惯) × 质量系数。
export function awardXp(entry, quality) {
  const q = clampQuality(quality);
  const box = (entry && entry.box) || 0;
  const base = 10;
  const difficulty = 1 + box * 0.4;
  const qMult = [0, 1, 1.5, 2][q];
  return Math.round(base * difficulty * qMult);
}

// 等级曲线：累计 XP → 等级。每级所需 XP 递增（L1→50, L2→75, ...）。
export function levelFromXp(xp) {
  let level = 1, acc = 0, need = xpForLevel(1);
  while (xp >= acc + need) { acc += need; level++; need = xpForLevel(level); }
  return { level, intoLevel: xp - acc, need, total: xp };
}
function xpForLevel(l) { return 50 + (l - 1) * 25; }

// 练习会话编排：到期复习(配额) → 新词(配额) → 最弱已知补足。
// 复习与新词各有独立配额，互不挤占；余量用最弱已知词填满。
// candidates: [{ id, entry }]，entry 含 due/mastery/status/box/reps。
export function buildSession(candidates, opts = {}) {
  const now = opts.now || Date.now();
  const newPerDay = opts.newPerDay ?? 10;
  const reviewPerDay = opts.reviewPerDay ?? 20;
  const due = [], fresh = [], known = [];
  for (const c of candidates) {
    const en = c.entry || {};
    if (en.status === 'new' || en.box == null || (en.reps || 0) === 0) fresh.push(c);
    else if ((en.due || 0) <= now) due.push(c);
    else known.push(c);
  }
  due.sort((a, b) => (a.entry.due || 0) - (b.entry.due || 0));
  known.sort((a, b) => (a.entry.mastery || 0) - (b.entry.mastery || 0)); // 最弱优先
  const reviews = due.slice(0, reviewPerDay);
  const news = fresh.slice(0, newPerDay);
  const taken = reviews.length + news.length;
  const fill = Math.max(0, newPerDay + reviewPerDay - taken);
  const picks = [...reviews, ...news, ...known.slice(0, fill)];
  return picks.map((c) => c.id);
}
