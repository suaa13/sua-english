// assets/js/register.js — 语域阶梯训练（四档改写）
//
// 产品化核心（见 .workbuddy/research/language-stratification.md §3.2）：
//   中国英语教育只教"说对"，不教"说哪种话"。同一意思四档语域语法全对，
//   但能进的"房间"不同——语言正是在这一层分化阶层。本训练把"判对错"改成"判语域适配度"。
//
// 玩法：随机选一个语义簇 + 随机一个场景房间 → 给出意思与场合 → 用户从四档句子里挑最适配的一句
//   → 揭示四档阶梯（casual→executive）+ 适配度判定（选中的房间 vs 场景房间）→ 换一题。
// 每条句子可悬停 / 点 ⓘ 看详情悬浮卡（意思、语域层、场合、用法提示），卡内"由此及彼"用同口吻换意思延伸。
// 复用 guides.js 的卡片范式与 ui.js 的 speak 委托（data-sp 触发发音）。

import { icon } from './ui.js';
import { store } from './state.js';
import { REGISTER_CLUSTERS, REGISTERS, ROOMS, REGISTER_ORDER, roomLabel, registerMeta } from './register-data.js';

let cur = null;                       // 当前题目：{ cluster, room, options:[{...tier,idx}], correctIdx, answered }
const stats = { done: 0, fit: 0 };

const escAttr = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// ---------- 出题 ----------
function buildQuestion(cluster) {
  const rooms = cluster.tiers.map((t) => t.room);
  const room = rooms[Math.floor(Math.random() * rooms.length)];
  const opts = cluster.tiers.map((t, i) => ({ ...t, idx: i }));
  for (let i = opts.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    ;[opts[i], opts[j]] = [opts[j], opts[i]];
  }
  const correctIdx = cluster.tiers.findIndex((t) => t.room === room);
  return { cluster, room, options: opts, correctIdx, answered: -1 };
}
function pickQuestion() {
  return buildQuestion(REGISTER_CLUSTERS[Math.floor(Math.random() * REGISTER_CLUSTERS.length)]);
}

// ---------- 用法提示 + 由此及彼（类比延伸） ----------
const REGISTER_TONE = {
  casual: '轻松、口语化，一线沟通最自然，但面对外部客户或高层会显得分量不足。',
  neutral: '中性安全，绝大多数商务沟通的默认档，不出错也不出彩。',
  professional: '专业、克制、有分寸，面向客户提案与跨部门会议时更可信。',
  executive: '用数据说话、简练而有重量，留给董事会与战略决策场合。',
};
function usageTip(register, room) {
  const r = registerMeta(register);
  const rm = ROOMS[room] || {};
  return `属于【${r.cn}】：${REGISTER_TONE[register] || ''}　适合【${rm.cn || room}】——${rm.desc || ''}。`;
}
function analogies(cluster, tier) {
  const out = [];
  for (const c of REGISTER_CLUSTERS) {
    if (c.key === cluster.key) continue;
    const t = c.tiers.find((x) => x.register === tier.register && x.room === tier.room);
    if (t) out.push({ cluster: c, tier: t });
    if (out.length >= 3) break;
  }
  return out;
}

// ---------- 入口卡片（挂在写作/口语列表页） ----------
export function registerLauncherHTML(where) {
  const accent = where === 'speaking' ? 'var(--c-speak)' : 'var(--c-write)';
  return `<div class="card card-click reg-launch" data-register-open="${where}" style="--accent-c:var(--brand)">
    <div class="row gap-3"><span style="color:${accent}">${icon('layers', { size: 26 })}</span>
      <div class="flex-1">
        <div class="card-title">语域阶梯训练 · 四档改写</div>
        <div class="card-sub">同一个意思，有四扇门。练"说哪种话"，而不只是"说对"。</div>
      </div>
    </div>
    <div class="row gap-2 mt-4" style="color:${accent}">开始训练 ${icon('arrowR', { size: 15 })}</div>
  </div>`;
}

// ---------- 训练卡片 ----------
function trainerCardHTML(q) {
  const room = ROOMS[q.room] || { cn: q.room, desc: '' };
  const optBtns = q.options.map((o, i) => `<div class="reg-opt" data-reg-opt="${i}">
      <button class="reg-opt-main" data-reg-pick="${i}">
        <span class="reg-opt-en serif">${o.phrase}</span>
        <span class="reg-opt-cn muted text-sm">${o.phraseCn}</span>
      </button>
      <button class="icon-btn reg-opt-sp" data-sp="${escAttr(o.phrase)}" title="听发音" aria-label="听发音">${icon('volume', { size: 16 })}</button>
      <button class="icon-btn reg-opt-info" data-reg-info="opt:${i}" title="查看详情与由此及彼" aria-label="详情">${icon('info', { size: 16 })}</button>
    </div>`).join('');
  return `<div class="card reg-card" id="reg-card">
    <div class="row between">
      <div class="row gap-2" style="color:var(--brand)">${icon('layers', { size: 18 })}<div class="card-title" style="color:var(--text)">语域阶梯训练</div></div>
      <button class="icon-btn" data-register-close title="收起" aria-label="收起">${icon('x', { size: 16 })}</button>
    </div>
    <div class="ai-panel mt-3">
      <div class="row gap-2"><span class="badge" style="color:var(--brand)">${icon('flag', { size: 14 })} ${room.cn}</span>
        <span class="muted text-sm">${room.desc}</span></div>
      <div class="strong mt-3" style="font-size:18px">要表达：「${q.cluster.cn}」</div>
      <div class="hint mt-2">在这个场合，下面四句话里，哪一句最"门当户对"？</div>
    </div>
    <div class="reg-opts mt-4">${optBtns}</div>
    <div class="hint mt-3">把鼠标移到句子上可看详情，点 ⓘ 可固定查看「由此及彼」（同口吻换意思）。</div>
    <div class="row gap-3 mt-4">
      <button class="btn btn-ghost btn-sm" data-register-skip>${icon('refresh', { size: 14 })}<span>换一题</span></button>
      <span class="muted text-sm" id="reg-score">已练 ${stats.done} 题 · 适配 ${stats.fit}</span>
    </div>
    <div id="reg-reveal"></div>
  </div>`;
}

// ---------- 悬浮详情卡 ----------
function phraseCardHTML(cluster, tier) {
  const r = registerMeta(tier.register);
  const rm = ROOMS[tier.room] || {};
  const anas = analogies(cluster, tier);
  const anaHTML = anas.length
    ? `<div class="reg-ana">
        <div class="reg-ana-head"><b>由此及彼</b><span class="muted text-xs">同一种口吻（${r.cn} · ${rm.cn || tier.room}），换个意思还能这样说</span></div>
        ${anas.map((a) => `<button class="reg-ana-item" data-reg-jump="${a.cluster.key}">
          <span class="serif">${a.tier.phrase}</span>
          <span class="muted text-xs">${a.tier.phraseCn}</span>
        </button>`).join('')}
      </div>`
    : '';
  return `<div class="reg-pop-card">
    <div class="reg-pop-en serif">${tier.phrase}</div>
    <div class="reg-pop-cn">${tier.phraseCn}</div>
    <div class="reg-pop-meta">
      <span class="badge" style="color:var(--brand)">${r.cn}</span>
      <span class="badge" style="color:var(--c-speak)">${rm.cn || tier.room}</span>
    </div>
    <div class="reg-pop-tip">${usageTip(tier.register, tier.room)}</div>
    ${anaHTML}
  </div>`;
}

// ---------- 适配度判定 ----------
function fitVerdict(q) {
  const chosen = q.options[q.answered];
  if (chosen.room === q.room) {
    return `适配正确：你选的这句「${chosen.phrase}」本就是为【${roomLabel(chosen.room)}】准备的，用在这里门当户对。`;
  }
  const orderChosen = REGISTER_ORDER.indexOf(chosen.register);
  const sceneTier = q.cluster.tiers.find((t) => t.room === q.room);
  const orderScene = REGISTER_ORDER.indexOf(sceneTier.register);
  const meta = registerMeta(chosen.register);
  if (orderChosen < orderScene) {
    return `偏低一档：这句「${chosen.phrase}」属于【${meta.cn}】，更适【${roomLabel(chosen.room)}】。在【${roomLabel(q.room)}】里会显得不够分量，对方可能低估你的专业度。`;
  }
  return `偏高一档：这句「${chosen.phrase}」属于【${meta.cn}】，偏【${roomLabel(chosen.room)}】的正式度。在【${roomLabel(q.room)}】里会显得用力过猛，甚至有点距离感。`;
}

function revealHTML(q) {
  const chosen = q.options[q.answered];
  const chosenOk = chosen.room === q.room;
  const ladder = REGISTER_ORDER.map((rk) => {
    const t = q.cluster.tiers.find((x) => x.register === rk);
    const ti = q.cluster.tiers.indexOf(t);
    const isHit = t.room === q.room;
    const meta = registerMeta(rk);
    const tag = isHit
      ? `<span class="badge badge-success">${icon('check', { size: 13 })} 适配此场合</span>`
      : `<span class="muted text-xs">更适合：${roomLabel(t.room)}</span>`;
    return `<div class="reg-step ${isHit ? 'reg-step-hit' : ''}">
      <span class="badge reg-layer" style="color:var(--brand)">${meta.cn}</span>
      <div class="reg-step-body">
        <button class="reg-step-en serif" data-reg-info="step:${ti}">${t.phrase}</button>
        <span class="reg-step-cn muted text-sm">${t.phraseCn}</span>
      </div>
      <span class="reg-step-tag">${tag}</span>
    </div>`;
  }).join('');
  return `<div class="mt-5 reg-reveal">
    <div class="ai-panel">
      <div class="row gap-2"><b>${chosenOk ? icon('check', { size: 16 }) : icon('info', { size: 16 })} 适配度判定</b></div>
      <p class="mt-2 text-sm">${fitVerdict(q)}</p>
    </div>
    <div class="card-title mt-4 mb-2">同一意思的四扇门</div>
    <div class="reg-ladder">${ladder}</div>
    <div class="hint mt-3">语法全对，差别只在"进哪个房间"。练到能按场合自动切档，你的英语才真正开始分层。</div>
  </div>`;
}

// ---------- 渲染 / 出题切换 ----------
function renderTrainer() {
  const old = document.getElementById('reg-card');
  const wrap = document.createElement('div');
  wrap.innerHTML = trainerCardHTML(cur);
  if (old) old.replaceWith(wrap.firstElementChild);
  const nc = document.getElementById('reg-card');
  if (nc) nc.scrollIntoView({ behavior: 'smooth', block: 'center' });
}
function startCluster(cluster) {
  cur = buildQuestion(cluster);
  renderTrainer();
  closePop();
}

// ---------- 悬浮卡状态 ----------
let popEl = null;
let popPinned = false;
let popTimer = null;
let curPopKey = null;

function ensurePop() {
  if (popEl && popEl.isConnected) return;
  popEl = null;
  const app = document.getElementById('app');
  if (!app) return;
  popEl = document.createElement('div');
  popEl.id = 'reg-pop';
  popEl.className = 'reg-pop';
  popEl.style.display = 'none';
  app.appendChild(popEl);
  popEl.addEventListener('mouseenter', () => { clearTimeout(popTimer); popPinned = true; });
  popEl.addEventListener('mouseleave', () => { popTimer = setTimeout(closePop, 200); });
}
function positionPop(el) {
  const r = el.getBoundingClientRect();
  const pr = popEl.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  let top = r.bottom + 8;
  if (top + pr.height > vh - 8) top = Math.max(8, r.top - pr.height - 8);
  let left = r.left;
  if (left + pr.width > vw - 8) left = Math.max(8, vw - pr.width - 8);
  popEl.style.top = top + 'px';
  popEl.style.left = left + 'px';
}
function openPop(tier, el, pin) {
  ensurePop();
  if (!popEl) return;
  clearTimeout(popTimer);
  popEl.innerHTML = phraseCardHTML(cur.cluster, tier);
  popEl.style.display = 'block';
  popPinned = !!pin;
  curPopKey = el && el.dataset.regInfo ? el.dataset.regInfo : 'pick:' + cur.options.indexOf(tier);
  positionPop(el);
  popEl.querySelectorAll('[data-reg-jump]').forEach((b) => {
    b.onclick = () => { const c = REGISTER_CLUSTERS.find((x) => x.key === b.dataset.regJump); if (c) startCluster(c); };
  });
}
function closePop() {
  if (popEl) { popEl.style.display = 'none'; popEl.innerHTML = ''; }
  popPinned = false;
  curPopKey = null;
}
function phraseFor(el) {
  if (!cur) return null;
  if (el.hasAttribute('data-reg-pick')) return cur.options[+el.dataset.regPick];
  const v = el.dataset.regInfo;
  if (!v) return null;
  const [k, i] = v.split(':');
  return k === 'opt' ? cur.options[+i] : cur.cluster.tiers[+i];
}

// ---------- 交互 ----------
let regBound = false;
export function initRegister() {
  if (regBound) return;
  const app = document.getElementById('app');
  if (!app) return;
  app.addEventListener('mouseover', (e) => {
    if (popPinned) return;
    const ph = e.target.closest('[data-reg-pick],[data-reg-info]');
    if (ph) { const t = phraseFor(ph); if (t) openPop(t, ph, false); }
  });
  app.addEventListener('mouseout', (e) => {
    if (popPinned) return;
    const ph = e.target.closest('[data-reg-pick],[data-reg-info]');
    if (!ph) return;
    const to = e.relatedTarget;
    if (to && to.closest && to.closest('[data-reg-pick],[data-reg-info]')) return;
    popTimer = setTimeout(closePop, 180);
  });
  app.addEventListener('click', (e) => {
    // 点详情卡外的区域：若已固定则收起
    if (!e.target.closest('#reg-pop') && !e.target.closest('[data-reg-info]') &&
        !e.target.closest('[data-sp]') && !e.target.closest('[data-reg-pick]')) {
      if (popPinned) closePop();
    }
    const info = e.target.closest('[data-reg-info]');
    if (info) {
      e.preventDefault();
      const t = phraseFor(info);
      if (!t) return;
      const key = info.dataset.regInfo;
      if (popEl && popEl.style.display === 'block' && popPinned && curPopKey === key) closePop();
      else openPop(t, info, true);
      return;
    }
    const open = e.target.closest('[data-register-open]');
    if (open) { openTrainer(open); return; }
    const close = e.target.closest('[data-register-close]');
    if (close) { closePop(); const c = document.getElementById('reg-card'); if (c) c.remove(); return; }
    const pick = e.target.closest('[data-reg-pick]');
    if (pick) { chooseOption(pick); return; }
    const skip = e.target.closest('[data-register-skip]');
    if (skip) { nextQuestion(); return; }
  });
  regBound = true;
}

function openTrainer(openEl) {
  if (document.getElementById('reg-card')) {
    document.getElementById('reg-card').scrollIntoView({ behavior: 'auto', block: 'center' });
    return;
  }
  cur = pickQuestion();
  const wrap = document.createElement('div');
  wrap.innerHTML = trainerCardHTML(cur);
  openEl.after(wrap.firstElementChild);
  const card = document.getElementById('reg-card');
  if (card) card.scrollIntoView({ behavior: 'auto', block: 'center' });
}

function chooseOption(pick) {
  if (!cur || cur.answered >= 0) return;
  const i = +pick.dataset.regPick;
  cur.answered = i;
  const card = document.getElementById('reg-card');
  if (!card) return;
  card.querySelectorAll('[data-reg-pick]').forEach((b) => {
    b.disabled = true;
    const oi = +b.dataset.regPick;
    if (oi === cur.correctIdx) b.classList.add('reg-correct');
    else if (oi === i) b.classList.add('reg-wrong');
  });
  stats.done++;
  if (cur.options[i].room === cur.room) stats.fit++;
  const rev = card.querySelector('#reg-reveal');
  if (rev) rev.innerHTML = revealHTML(cur);
  const score = card.querySelector('#reg-score');
  if (score) score.textContent = `已练 ${stats.done} 题 · 适配 ${stats.fit}`;
  try { store.recordActivity(1, 1); } catch (err) { /* 学习记录不可用时忽略 */ }
}

function nextQuestion() {
  cur = pickQuestion();
  renderTrainer();
  closePop();
}
