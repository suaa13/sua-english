// pages/partner.js — AI English Partner
// 两种用法：自由对话 / 模拟考官（casual·ielts·toefl），以及引导练习（coach）。
// coach 走「定边界 → 切小片 → 用户先产出 → 按标准反馈 → 收尾留证据」，默认不代答。
import { store } from '../state.js';
import { icon, toast, openLlmSettings, modal, closeModal, mdText, mdEscape } from '../ui.js';
import {
  tutor, speakingAnalyze, readLlmCfg, aiChat, lastAiEngine, lastAiErrorCode,
  COACH_KINDS, COACH_FIELDS,
  coachBrief, coachSlices, coachFeedback, coachReference, coachWrap, coachLlm,
} from '../ai.js';
import { SPEAKING } from '../data.js';

const PARTNER_SYS = 'You are SUA English\'s AI English Partner, a friendly and encouraging IELTS/TOEFL tutor. Reply in the same language the user writes (English if they write English, Chinese if Chinese). Help with grammar, vocabulary, pronunciation, speaking practice, and study planning. Keep replies concise and practical. If the user wants to practice speaking, give them a question or topic.';

const MODES = [
  ['casual', '自由对话'],
  ['coach', '引导练习'],
  ['ielts', 'IELTS 模拟考官'],
  ['toefl', 'TOEFL 训练'],
];

// 开场引导：给不知道从何说起的用户一个明确的起点（点一下就能用）
const QUICK_STARTS = [
  { t: '陪我练一段日常口语', s: 'casual', hint: 'Let\'s practise small talk. Ask me one question at a time and correct my mistakes afterwards.' },
  { t: '帮我改一段英文', s: 'casual', hint: 'I will paste a short paragraph. Please point out my grammar and word-choice problems, then show a better version.' },
  { t: '讲清现在完成时', s: 'casual', hint: 'Explain the present perfect in simple terms with 3 examples, then give me 2 quick questions to check I got it.' },
  { t: '按我的水平排今天的任务', s: 'casual', hint: 'Based on a beginner aiming for IELTS 6.5, give me today\'s 30-minute study plan with concrete steps.' },
];

const CHAT_HIST_KEY = 'sua_partner_chat';
const HIST_MAX = 24;   // 每个模式保留的消息条数

// 徽标如实说明当前回答来自哪个引擎，避免「以为在用 AI」的静默降级
const ENGINE_BADGE = {
  server: ['on', 'AI 在线 · 服务端模型'],
  byo: ['on', 'AI 在线 · 本机密钥'],
  local: ['off', '本地规则 · 未接模型'],
  error: ['off', 'AI 不可用 · 本地规则'],
};
function refreshBadge() {
  const el = document.getElementById('p-ai-mode');
  if (!el) return;
  // 徽标如实反映最近一次回答来自哪个引擎；还没问过就按当前配置推断
  const engine = lastAiEngine();
  const [cls, txt] = (engine && ENGINE_BADGE[engine]) || ENGINE_BADGE[readLlmCfg() ? 'byo' : 'local'];
  el.className = 'llm-badge ' + cls;
  el.textContent = txt;
}

let p = { mode: 'casual', qIdx: 0, transcript: '', messages: null };

function buildIELTS() {
  const i = SPEAKING.ielts;
  const qs = [];
  qs.push({ t: `Good. Let's begin with Part 1. ${i.part1[0]}`, part: 'Part 1' });
  i.part1.slice(1).forEach(q => qs.push({ t: q, part: 'Part 1' }));
  const p2 = i.part2[0];
  qs.push({ t: `Now Part 2. ${p2.cue}\nYou may make notes. Points to cover: ${p2.points.join(', ')}. Please speak for 1–2 minutes.`, part: 'Part 2' });
  i.part3.forEach(q => qs.push({ t: q, part: 'Part 3' }));
  return qs;
}
function buildTOEFL() {
  const t = SPEAKING.toefl;
  const qs = [];
  qs.push({ t: `TOEFL Independent Task. ${t.tasks[0].cue}\n(You have 15 seconds to prepare, then 45 seconds to speak.)`, part: 'Task 1' });
  qs.push({ t: `Integrated Task. ${t.tasks[1].cue}\n(Read the announcement, listen, then explain the student's attitude.)`, part: 'Task 2' });
  return qs;
}

function loadHist(mode) {
  try {
    const all = JSON.parse(localStorage.getItem(CHAT_HIST_KEY) || '{}');
    return Array.isArray(all[mode]) ? all[mode] : null;
  } catch (e) { return null; }
}
function saveHist() {
  try {
    const all = JSON.parse(localStorage.getItem(CHAT_HIST_KEY) || '{}');
    all[p.mode] = (p.messages || []).slice(-HIST_MAX);
    localStorage.setItem(CHAT_HIST_KEY, JSON.stringify(all));
  } catch (e) { /* 容量超限时静默 */ }
}

function fresh(mode) {
  p = { mode, qIdx: 0, transcript: '', messages: [] };
  if (mode === 'casual') {
    // 回到这一页时接着上次聊，而不是每次都重新打招呼
    const saved = loadHist('casual');
    p.messages = (saved && saved.length)
      ? saved
      : [{ role: 'ai', text: `Hi ${store.state.user.name}! I'm your AI English Partner. ${randGreeting()}` }];
  }
  else if (mode === 'ielts') { p.ielts = buildIELTS(); p.messages = [{ role: 'ai', text: `IELTS Speaking mock exam begins. I'll be your examiner through Part 1, 2 and 3. ${p.ielts[0].t}` }]; p.qIdx = 1; }
  else if (mode === 'toefl') { p.toefl = buildTOEFL(); p.messages = [{ role: 'ai', text: `TOEFL Speaking training. ${p.toefl[0].t}` }]; p.qIdx = 1; }
  else if (mode === 'coach') freshCoach();
}
function randGreeting() { const g = ['What would you like to talk about today?', 'How was your day?', 'Want to practice some English?', 'Ask me anything about grammar or vocab!']; return g[Math.floor(Math.random() * g.length)]; }

// ============================================================
// 引导练习（coach）
// ============================================================
const COACH_STEPS = [['brief', '任务简报'], ['scope', '边界确认'], ['slice', '切片练习'], ['wrap', '收尾复盘']];
const COACH_HIST = 'sua_coach_sessions';
const COACH_BRIEF = 'sua_coach_brief';

let c = null;   // 当前引导练习会话

function freshCoach() {
  c = { stage: 'brief', brief: { kind: 'speaking' }, slices: [], idx: 0, log: [], draft: '', fb: null, ref: '', llmBrief: '', wrap: null, busy: false };
}
function kindLabel(key) { const k = COACH_KINDS.find(x => x.key === key); return k ? k.label : key; }
function lastPerSlice() {
  const m = new Map();
  (c ? c.log : []).forEach(x => m.set(x.i, x));
  return Array.from(m.values()).sort((a, b) => a.i - b.i);
}
function loadSessions() {
  try { return JSON.parse(localStorage.getItem(COACH_HIST) || '[]'); } catch (e) { return []; }
}
function saveSession(s) {
  const list = loadSessions();
  list.unshift(s);
  try { localStorage.setItem(COACH_HIST, JSON.stringify(list.slice(0, 30))); } catch (e) { /* 容量超限时静默 */ }
}

function readBrief(root) {
  const b = { kind: (root.querySelector('#c-kind') || {}).value || 'speaking' };
  COACH_FIELDS.forEach(f => { const el = root.querySelector('#c-' + f.key); b[f.key] = el ? el.value.trim() : ''; });
  return b;
}

function coachStages(cur) {
  const ci = COACH_STEPS.findIndex(s => s[0] === cur);
  return COACH_STEPS.map((s, i) =>
    `<div class="coach-step ${i === ci ? 'active' : ''} ${i < ci ? 'done' : ''}"><span class="coach-dot">${i < ci ? '✓' : i + 1}</span><span>${s[1]}</span></div>`
  ).join('<span class="coach-line"></span>');
}

function briefHtml() {
  const b = c.brief || {};
  const kindOpts = COACH_KINDS.map(k => `<option value="${k.key}" ${k.key === (b.kind || 'speaking') ? 'selected' : ''}>${k.label}</option>`).join('');
  return `<div>
    <div class="muted text-sm mb-3">先花一分钟说清「要做什么、给谁看、怎样算做好」。这三项决定后面每一步的判定标准。</div>
    <label class="form-row"><span>练习类型</span><select class="input" id="c-kind">${kindOpts}</select></label>
    <div class="form-grid">
      ${COACH_FIELDS.map(f => `<label class="muted text-sm">${f.label}${f.req ? ' <span class="coach-req">必填</span>' : ''}<input class="input" id="c-${f.key}" placeholder="${esc(f.ph)}" value="${esc(b[f.key] || '')}"></label>`).join('')}
    </div>
    <div class="row gap-2 mt-3 wrap">
      <button class="btn btn-primary" id="c-to-scope">${icon('arrowR', { size: 15 })}<span>生成边界复述</span></button>
      <button class="btn btn-ghost" id="c-restore">用上次简报</button>
    </div>
  </div>`;
}

function scopeHtml() {
  return `<div>
    <div class="coach-panel">${esc(coachBrief(c.brief)).replace(/\n/g, '<br>')}</div>
    ${c.llmBrief ? `<div class="coach-llm mt-3"><b>AI 复述</b><div class="mt-1">${esc(c.llmBrief).replace(/\n/g, '<br>')}</div></div>` : ''}
    <div class="row gap-2 mt-3 wrap">
      <button class="btn btn-primary" id="c-start">${icon('check', { size: 15 })}<span>确认开始</span></button>
      <button class="btn btn-soft" id="c-edit">返回修改</button>
      <button class="btn btn-ghost" id="c-llm-brief" ${c.busy ? 'disabled' : ''}>${c.busy ? 'AI 复述中…' : '让 AI 复述边界'}</button>
    </div>
  </div>`;
}

function renderFb(fb) {
  const okN = fb.checks.filter(x => x.ok).length;
  return `<div class="coach-fb ${fb.pass ? 'ok' : 'no'} mt-3">
    <div class="row between"><b>${esc(fb.verdict)}</b><span class="muted text-sm">${okN}/${fb.checks.length} 项达标</span></div>
    <div class="coach-checks mt-2">${fb.checks.map(x => `<span class="coach-check ${x.ok ? 'ok' : 'no'}">${x.ok ? '✓' : '○'} ${esc(x.label)}</span>`).join('')}</div>
    ${fb.oneFix ? `<div class="mt-2">${esc(fb.oneFix)}</div>` : ''}
    ${fb.llm ? `<div class="coach-llm mt-2">${esc(fb.llm).replace(/\n/g, '<br>')}</div>` : ''}
    ${fb.bar ? `<div class="muted text-sm mt-2">你的验收标准：${esc(fb.bar)}</div>` : ''}
  </div>`;
}

function sliceHtml() {
  const s = c.slices[Math.min(c.idx, c.slices.length - 1)];
  const last = c.log.length ? c.log[c.log.length - 1] : null;
  const passedSet = new Set(c.log.filter(x => x.pass).map(x => x.i));
  const isLast = c.idx >= c.slices.length - 1;
  const canNext = last && last.i === c.idx && last.pass && !isLast;
    const attempts = c.log.map(x => `<div class="coach-log">
      <div class="row between"><b>切片 ${x.i + 1} · 第 ${x.n} 次</b><span class="chip ${x.pass ? 'chip-success' : 'chip-danger'}">${x.pass ? '通过' : '未通过'}</span></div>
      <div class="muted text-sm mt-1">${esc(x.task)}</div>
      <div class="coach-ans">${esc(x.ans)}</div>
      <div class="mt-1 text-sm">${esc(x.fb.verdict)}${x.fb.oneFix ? ' ' + esc(x.fb.oneFix) : ''}</div>
    </div>`).join('');

  return `<div>
    <div class="row between mb-2">
      <span class="muted text-sm">切片 ${c.idx + 1} / ${c.slices.length}</span>
      <span class="muted text-sm">已通过 ${passedSet.size} / ${c.slices.length}</span>
    </div>
    <div class="coach-slice">
      <div class="coach-slice-task">${esc(s.t)}</div>
      <div class="muted text-sm mt-2">完成标准：${esc(s.bar)}${c.brief.bar ? ` ｜ 你的验收：${esc(c.brief.bar)}` : ''}</div>
    </div>
    <textarea class="textarea full mt-3" id="c-ans" style="min-height:110px" placeholder="先自己写，不要查词。写完再提交。">${esc(c.draft || '')}</textarea>
    <div class="row gap-2 mt-2 wrap">
      <button class="btn btn-primary" id="c-submit" ${c.busy ? 'disabled' : ''}>${c.busy ? '评判中…' : '提交这一片'}</button>
      <button class="btn btn-soft" id="c-ref" ${c.busy ? 'disabled' : ''}>直接给范例</button>
      ${canNext ? `<button class="btn btn-primary" id="c-next">${icon('arrowR', { size: 15 })}<span>下一片</span></button>` : ''}
      ${c.log.length ? `<button class="btn btn-ghost" id="c-end">结束并复盘</button>` : ''}
    </div>
    ${c.ref ? `<div class="coach-ref mt-3"><b>范例（仅供参考，别照抄）</b><div class="mt-1">${esc(c.ref).replace(/\n/g, '<br>')}</div></div>` : ''}
    ${c.fb && c.fb === (last && last.fb) ? renderFb(c.fb) : ''}
    ${attempts ? `<hr class="hr"><div class="card-title mb-2">本轮记录</div>${attempts}` : ''}
  </div>`;
}

function wrapHtml() {
  const w = c.wrap || coachWrap(c.brief, lastPerSlice());
  return `<div>
    <div class="row between mb-3">
      <span class="card-title">本次复盘</span>
      <span class="chip chip-ok">${esc(w.done)}</span>
    </div>
    <div class="coach-wrap-grid">
      <div class="coach-box"><div class="coach-box-t">完成</div><div>${esc(w.done)}</div></div>
      <div class="coach-box"><div class="coach-box-t">证据</div><div>${esc(w.evidence || '无')}</div></div>
      <div class="coach-box"><div class="coach-box-t">错误</div><div>${w.errors.length ? w.errors.map(e => '• ' + esc(e)).join('<br>') : '无'}</div></div>
      <div class="coach-box"><div class="coach-box-t">下一步</div><div>${esc(w.next)}</div></div>
    </div>
    <div class="row gap-2 mt-3 wrap">
      <button class="btn btn-primary" id="c-save">${icon('check', { size: 15 })}<span>保存为练习记录</span></button>
      <button class="btn btn-soft" id="c-again">同任务再来一轮</button>
      <button class="btn btn-ghost" id="c-new">换个任务</button>
    </div>
  </div>`;
}

function coachBody() {
  if (c.stage === 'brief') return briefHtml();
  if (c.stage === 'scope') return scopeHtml();
  if (c.stage === 'slice') return sliceHtml();
  return wrapHtml();
}

function coachCard() {
  return `<div class="card" style="max-width:820px">
    <div class="row between mb-3">
      <div class="row gap-2 wrap">
        <span class="llm-badge off" id="p-ai-mode">AI 本地规则</span>
        ${creditBarHtml()}
      </div>
      <div class="row gap-2">
        <button class="btn btn-ghost btn-sm" id="c-history">${icon('bookmark', { size: 14 })}<span>练习记录</span></button>
        <button class="btn btn-ghost btn-sm" id="p-ai-cfg">${icon('settings', { size: 14 })}<span>AI 设置</span></button>
      </div>
    </div>
    <div class="coach-steps mb-4" id="c-steps">${coachStages(c.stage)}</div>
    <div id="c-body">${coachBody()}</div>
  </div>`;
}

function openHistory() {
  const list = loadSessions();
  const box = modal(`
    <div class="modal-head">
      <h3>练习记录</h3>
      <button class="icon-btn" onclick="closeModal()" aria-label="关闭">${icon('x', { size: 16 })}</button>
    </div>
    ${list.length ? list.map(s => `<div class="wq-item mb-2">
      <div class="row between"><b>${esc(s.kindLabel)}</b><span class="muted text-sm">${esc(s.date)}</span></div>
      <div class="muted text-sm mt-1">${esc(s.goal)}</div>
      <div class="muted text-sm mt-1">${esc(s.done)}</div>
      ${s.next ? `<div class="muted text-sm mt-1">下一步：${esc(s.next)}</div>` : ''}
    </div>`).join('') : '<div class="empty">还没有记录。走完一轮引导练习后点「保存为练习记录」。</div>'}
    ${list.length ? '<button class="btn btn-ghost btn-sm mt-3" id="c-clear-hist">清空记录</button>' : ''}
  `);
  const clr = box.querySelector('#c-clear-hist');
  if (clr) clr.onclick = () => { localStorage.removeItem(COACH_HIST); toast('已清空练习记录'); closeModal(); };
}

// ============================================================
// 对话模式（casual / ielts / toefl）
// ============================================================
function chatCard(mode) {
  return `<div class="card" style="max-width:820px">
      <div class="row between mb-3">
        <div class="row gap-2 wrap">
          <span class="llm-badge off" id="p-ai-mode">AI 本地规则</span>
          ${creditBarHtml()}
        </div>
        <div class="row gap-2">
          ${(p.messages || []).length > 1 ? `<button class="btn btn-ghost btn-sm" id="p-new">${icon('refresh', { size: 14 })}<span>新对话</span></button>` : ''}
          <button class="btn btn-ghost btn-sm" id="p-ai-cfg">${icon('settings', { size: 14 })}<span>AI 设置</span></button>
        </div>
      </div>
      <div id="chat" class="chat" style="max-height:54vh;overflow-y:auto;padding-right:6px">${renderMsgs()}</div>
      <div id="p-extra">${quickStartHtml()}${retryHtml()}</div>
      <div class="hr"></div>
      <div class="row gap-2">
        <input class="input full" id="p-input" placeholder="用英语输入，或点麦克风说…" autocomplete="off">
        <button class="btn btn-ghost btn-icon" id="p-mic" title="麦克风">${icon('mic', { size: 18 })}</button>
        <button class="btn btn-primary" id="p-send">${icon('send', { size: 16 })}</button>
      </div>
      ${(mode === 'ielts' || mode === 'toefl') ? `<div class="row between mt-3"><span class="hint">${mode === 'ielts' ? '按 Part 1→2→3 逐步回答，结束前不要看答案。' : '按任务逐一回答，结束后生成分析。'}</span><button class="btn btn-soft btn-sm" id="p-finish">结束并生成报告</button></div>` : ''}
    </div>`;
}

function renderMsgs() {
  return (p.messages || []).map(m => {
    // AI 回复按 Markdown 渲染（模型爱用加粗/列表）；用户消息只做纯文本转义
    const body = m.role === 'ai' ? mdText(m.text) : mdEscape(m.text).replace(/\n/g, '<br>');
    return `<div class="msg ${m.role}"><div class="bubble"><div class="who">${m.role === 'ai' ? 'AI Partner' : 'You'}</div>${body}</div></div>`;
  }).join('');
}

// 上一轮 AI 调用失败时给一个明确的重试入口，而不是把失败藏起来
function retryHtml() {
  if (!p.retry) return '';
  return `<div class="p-retry">
    <span class="hint">${esc(p.retryMsg || 'AI 服务暂时不可用')}</span>
    <button class="btn btn-ghost btn-sm" id="p-retry">${icon('refresh', { size: 14 })}<span>重新用 AI 回答</span></button>
  </div>`;
}

// 开场引导卡：只在对话刚开始时出现，点一下就把问题发出去
function quickStartHtml() {
  if ((p.messages || []).length > 1) return '';
  return `<div class="p-quick mt-3">
    <div class="muted text-sm mb-2">不知道从哪开始？点一个试试：</div>
    <div class="row gap-2 wrap">
      ${QUICK_STARTS.map((q, i) => `<button class="chip chip-btn p-quick-btn" data-i="${i}">${esc(q.t)}</button>`).join('')}
    </div>
  </div>`;
}

export function render(segs) {
  const mode = MODES.some(m => m[0] === segs[0]) ? segs[0] : 'casual';
  if (!p.messages || p.mode !== mode) fresh(mode);
  const sub = mode === 'coach' ? '一次一小片 · 先产出再反馈 · 默认不代答'
    : (mode === 'casual' ? '随时说英语 · 模拟考官 · 答疑解惑' : '按考试流程作答，结束后生成报告');
  return `<div class="page"><div class="crumb"><a href="#/home">首页</a><span class="sep">/</span><span>AI 英语伙伴</span></div>
    <div class="section-head"><div><h2>AI English Partner</h2><div class="sub">${sub}</div></div></div>
    <div class="tabs mb-5" style="max-width:640px">${MODES.map(c2 => `<button class="tab ${c2[0] === mode ? 'active' : ''}" onclick="location.hash='#/partner/${c2[0]}'">${c2[1]}</button>`).join('')}</div>
    ${mode === 'coach' ? coachCard() : chatCard(mode)}
  </div>`;
}

// ============================================================
// 积分
// 走平台 server 代理每次消耗 1 积分；用户填自己的 API Key 不消耗积分。
// 这里只展示余额——签到的唯一入口在「我的学习」页，点整条积分跳转过去，
// 避免两处都能签到造成状态不一致。余额以后端为准，进页与调用后校准。
// ============================================================
function creditBarHtml() {
  // 未登录不展示：积分只存在于服务端，本地没有可信值
  if (!store.isAuthed()) return '';
  const c = store.state.user.credits ?? 0;
  const can = store.state.user.canCheckIn !== false;
  return `<a class="credit-chip credit-chip-link" href="#/profile"
      title="使用平台 AI 每次消耗 1 积分；填自己的 API Key 不消耗积分。去「我的学习」签到领积分"><b id="p-credit-num">${c}</b> 积分<span class="credit-chip-sep">·</span><span id="p-checkin-hint">${can ? '签到 +5' : '今日已签'}</span></a>`;
}

/** 只改文本，不重建节点，保留 href 跳转。 */
function refreshCredits(root) {
  const num = root.querySelector('#p-credit-num');
  if (num) num.textContent = store.state.user.credits ?? 0;
  const hint = root.querySelector('#p-checkin-hint');
  if (hint) hint.textContent = store.state.user.canCheckIn !== false ? '签到 +5' : '今日已签';
}

function bindCredits(root) {
  // 进入页面时以后端为准校准一次余额（签到按钮已移走，这里不再绑定点击）
  store.fetchCredits().then(() => refreshCredits(root));
}

// ---- init ----
window.addEventListener('page:rendered', (e) => {
  if (e.detail.seg !== 'partner') return;
  const root = document.getElementById('app');
  refreshBadge();
  bindCredits(root);
  const cfgBtn = root.querySelector('#p-ai-cfg');
  if (cfgBtn) cfgBtn.onclick = () => openLlmSettings(() => {
    refreshBadge();
    // 改了本机密钥配置后，引擎可能从 byo 变成别的，顺带校准一次积分显示
    store.fetchCredits().then(() => refreshCredits(root));
  });

  if (p.mode === 'coach') { initCoach(root); return; }
  initChat(root);
});

function initCoach(root) {
  const body = root.querySelector('#c-body');
  const steps = root.querySelector('#c-steps');

  function paint() {
    if (steps) steps.innerHTML = coachStages(c.stage);
    if (body) body.innerHTML = coachBody();
    bind();
  }

  const hist = root.querySelector('#c-history');
  if (hist) hist.onclick = openHistory;

  function bind() {
    const q = (id) => root.querySelector('#' + id);

    const toScope = q('c-to-scope');
    if (toScope) toScope.onclick = () => {
      const b = readBrief(root);
      if (!b.goal || !b.audience || !b.bar) { toast('至少填「目标 / 受众 / 验收标准」'); return; }
      c.brief = b;
      c.llmBrief = '';
      try { localStorage.setItem(COACH_BRIEF, JSON.stringify(b)); } catch (err) { /* ignore */ }
      c.stage = 'scope'; paint();
    };

    const restore = q('c-restore');
    if (restore) restore.onclick = () => {
      let b = null;
      try { b = JSON.parse(localStorage.getItem(COACH_BRIEF) || 'null'); } catch (err) { b = null; }
      if (!b || !b.goal) { toast('还没有上次的简报'); return; }
      c.brief = b; paint();
    };

    const edit = q('c-edit');
    if (edit) edit.onclick = () => { c.stage = 'brief'; paint(); };

    const llmB = q('c-llm-brief');
    if (llmB) llmB.onclick = async () => {
      c.busy = true; paint();
      const b = c.brief;
      const out = await coachLlm([{
        role: 'user',
        content: `练习简报：\n${COACH_FIELDS.map(f => `${f.label}：${b[f.key] || '（未填）'}`).join('\n')}\n\n请复述任务边界（六项），指出缺失或含糊之处，并给出你建议的验收标准。不要给答案或范文。`,
      }]);
      c.busy = false;
      refreshBadge();
      if (out) c.llmBrief = out; else toast('AI 未返回结果，已保留本地复述');
      paint();
    };

    const start = q('c-start');
    if (start) start.onclick = () => {
      c.slices = coachSlices(c.brief);
      c.idx = 0; c.log = []; c.draft = ''; c.fb = null; c.ref = ''; c.wrap = null;
      c.stage = 'slice'; paint();
    };

    const submit = q('c-submit');
    if (submit) submit.onclick = () => submitSlice();

    const ref = q('c-ref');
    if (ref) ref.onclick = async () => {
      const s = c.slices[c.idx];
      // 未接任何模型时 aiChat 会立刻返回，不会让用户空等
      c.busy = true; paint();
      const out = await coachLlm([{
        role: 'user',
        content: `任务边界：${JSON.stringify(c.brief)}\n当前切片：${s.t}\n完成标准：${s.bar}\n请只给这一片的范例（1–3 句），并附一行说明它为什么达标。不要展开成完整答案。`,
      }]);
      c.busy = false;
      refreshBadge();
      c.ref = out || coachReference(c.brief, c.idx);
      paint();
    };

    const next = q('c-next');
    if (next) next.onclick = () => {
      c.idx = Math.min(c.idx + 1, c.slices.length - 1);
      c.draft = ''; c.fb = null; c.ref = '';
      paint();
    };

    const end = q('c-end');
    if (end) end.onclick = () => {
      c.wrap = coachWrap(c.brief, lastPerSlice());
      c.stage = 'wrap'; paint();
    };

    const save = q('c-save');
    if (save) save.onclick = () => {
      const w = c.wrap || coachWrap(c.brief, lastPerSlice());
      saveSession({
        kind: c.brief.kind,
        kindLabel: kindLabel(c.brief.kind),
        goal: c.brief.goal,
        done: w.done,
        next: w.next,
        date: new Date().toISOString().slice(0, 10),
      });
      toast('已保存练习记录');
    };

    const again = q('c-again');
    if (again) again.onclick = () => {
      c.slices = coachSlices(c.brief);
      c.idx = 0; c.log = []; c.draft = ''; c.fb = null; c.ref = ''; c.wrap = null;
      c.stage = 'slice'; paint();
    };

    const neu = q('c-new');
    if (neu) neu.onclick = () => { freshCoach(); paint(); };
  }

  async function submitSlice() {
    const el = root.querySelector('#c-ans');
    const ans = (el ? el.value : '').trim();
    if (!ans) { toast('先写出你的答案'); return; }
    c.draft = ans;
    const s = c.slices[c.idx];
    const fb = coachFeedback(c.brief, c.idx, ans);
    // 本地判定先出结论（立刻可见），再叠加模型意见
    c.busy = true; paint();
    const out = await coachLlm([{
      role: 'user',
      content: `任务边界：${JSON.stringify(c.brief)}\n当前切片：${s.t}\n完成标准：${s.bar}\n用户产出：\n${ans}\n\n请先判定是否达标（通过 / 未通过），再只给一条最关键的修改建议。不要给完整范文。`,
    }]);
    c.busy = false;
    refreshBadge();
    if (out) fb.llm = out;
    // AI 没返回时，只有「积分不足」值得单独讲一句 —— 其余情况本地规则已足够
    else if (lastAiErrorCode() === 'INSUFFICIENT_CREDITS') toast('积分不足，已用本地规则评判。去「我的学习」签到，或填自己的 API Key 后可启用 AI 点评');
    const n = c.log.filter(x => x.i === c.idx).length + 1;
    c.fb = fb;
    c.log.push({ i: c.idx, n, task: s.t, ans, pass: fb.pass, fb });
    paint();
  }

  paint();
}

function initChat(root) {
  const input = root.querySelector('#p-input');
  const send = root.querySelector('#p-send');
  const chat = root.querySelector('#chat');
  if (!chat) return;
  const scroll = () => { chat.scrollTop = chat.scrollHeight; };
  scroll();

  function showTyping() {
    hideTyping();
    const t = document.createElement('div');
    t.className = 'msg ai'; t.id = 'typing-row';
    t.innerHTML = `<div class="bubble"><div class="who">AI Partner</div><div class="typing"><span></span><span></span><span></span></div></div>`;
    chat.appendChild(t); scroll();
  }
  function hideTyping() { const t = chat.querySelector('#typing-row'); if (t) t.remove(); }
  function aiReply(text) { showTyping(); setTimeout(() => { hideTyping(); push('ai', text); }, 650); }

  function push(role, text) {
    p.messages.push({ role, text });
    chat.innerHTML = renderMsgs(); scroll();
    saveHist();
    paintExtra();   // 第一条消息发出后，开场引导卡自动收起
  }

  function userSay(text) {
    text = text.trim(); if (!text) return;
    push('me', text);
    p.transcript += ' ' + text;
    if (p.mode === 'casual') {
      casualReply(text);
    } else if (p.mode === 'ielts') {
      const qs = p.ielts;
      if (p.qIdx < qs.length) { aiReply(qs[p.qIdx].t); p.qIdx++; }
      else aiReply('Thank you. That concludes the speaking test.');
    } else if (p.mode === 'toefl') {
      const qs = p.toefl;
      if (p.qIdx < qs.length) { aiReply(qs[p.qIdx].t); p.qIdx++; }
      else aiReply('Good. That completes the TOEFL speaking tasks.');
    }
    store.recordActivity(3, 1);
  }

  async function casualReply(text) {
    // 带上最近 12 条上下文（服务端还会再截断），交给统一调用链
    const history = (p.messages || [])
      .slice(-12)
      .map(m => ({ role: m.role === 'me' ? 'user' : 'assistant', content: m.text }));

    const res = await aiChat(history, { scene: 'casual', system: PARTNER_SYS, temperature: 0.7 });

    if (res && res.text) {
      refreshBadge();
      clearRetry();
      if (res.engine === 'byo' && res.error) toast('服务端模型不可用，已用本机密钥回答');
      // 走平台代理时服务端已扣 1 积分，本地同步显示
      if (res.engine === 'server') { store.spendCredit(1); refreshCredits(root); }
      aiReply(res.text);
      return;
    }

    // 只有「本来该有、却坏了」才提示并给重试；
    // 压根没接模型属于正常兜底，徽标已经写明，不再用警告条打扰。
    refreshBadge();
    if (res && res.engine === 'error') {
      // 积分不足时重试也没用，直接讲清原因并指两条出路
      if (res.code === 'INSUFFICIENT_CREDITS') {
        // 后端文案只讲规则，位置信息由前端补：签到入口在「我的学习」页
        toast(res.error ? res.error + '（签到入口在「我的学习」页）' : '积分不足，去「我的学习」签到或填自己的 API Key 后可用');
        store.fetchCredits().then(() => refreshCredits(root));
      }
      setRetry(text, res.error || 'AI 服务不可用，先用本地规则回答');
    }
    else clearRetry();
    aiReply(tutor(text, { name: store.state.user.name }));
  }

  function setRetry(text, msg) {
    p.retry = text; p.retryMsg = msg;
    paintExtra();
  }
  function clearRetry() {
    if (!p.retry) return;
    p.retry = null; p.retryMsg = '';
    paintExtra();
  }
  function paintExtra() {
    const box = root.querySelector('#p-extra');
    if (!box) return;
    box.innerHTML = quickStartHtml() + retryHtml();
    bindExtra();
  }

  function bindExtra() {
    root.querySelectorAll('.p-quick-btn').forEach(btn => {
      btn.onclick = () => {
        const q = QUICK_STARTS[Number(btn.dataset.i)];
        if (!q) return;
        userSay(q.hint);
      };
    });
    const retry = root.querySelector('#p-retry');
    if (retry) retry.onclick = () => { clearRetry(); casualReply(p.retry || ''); };
  }

  send.onclick = () => { userSay(input.value); input.value = ''; };
  input.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') { userSay(input.value); input.value = ''; } });

  const mic = root.querySelector('#p-mic');
  if (mic) mic.onclick = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { toast('浏览器不支持语音识别，请直接输入'); return; }
    const rec = new SR(); rec.lang = 'en-US'; rec.interimResults = false;
    rec.onresult = (ev) => userSay(ev.results[0][0].transcript);
    rec.onerror = () => toast('识别失败，请重试或直接输入');
    rec.start(); toast('聆听中…说完自动发送');
  };

  const neu = root.querySelector('#p-new');
  if (neu) neu.onclick = () => {
    p.messages = [{ role: 'ai', text: `Hi ${store.state.user.name}! I'm your AI English Partner. ${randGreeting()}` }];
    p.transcript = ''; p.retry = null; p.retryMsg = '';
    chat.innerHTML = renderMsgs();
    saveHist();
    paintExtra();
  };

  bindExtra();

  const finish = root.querySelector('#p-finish');
  if (finish) finish.onclick = () => {
    if (p.transcript.trim().length < 10) { toast('先回答几题再生成报告'); return; }
    const r = speakingAnalyze(p.transcript, {});
    store.addMock({ exam: p.mode, kind: 'speaking', score: r.band, detail: p.mode === 'ielts' ? 'IELTS 口语模拟' : 'TOEFL 口语训练' });
    const report = `<div class="msg ai"><div class="bubble"><div class="who">AI Partner · 评分报告</div>
      <b>预估 Band ${r.band}</b>
      <div class="grid grid-4 mt-2">${[['流利度', r.scores.fluency], ['词汇', r.scores.vocabulary], ['语法', r.scores.grammar], ['发音', r.scores.pronunciation]].map(([k, v]) => `<div style="text-align:center"><div style="font-size:20px;font-weight:760">${v}</div><div class="muted text-xs">${k}</div></div>`).join('')}</div>
      ${r.issues.length ? `<div class="mt-2"><b>具体问题：</b><br>${r.issues.map(i => `• ${i.label}：${i.detail}`).join('<br>')}</div>` : ''}
      <div class="mt-2"><b>建议：</b><br>${r.suggestions.map(s => '• ' + s).join('<br>')}</div>
      <div class="hint mt-2">报告已保存。去「模拟考试 / 我的学习」查看趋势。</div></div></div>`;
    showTyping();
    setTimeout(() => {
      hideTyping();
      push('ai', 'Exam finished. Here is your report:');
      chat.insertAdjacentHTML('beforeend', report); scroll();
    }, 750);
  };
}

function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch])); }
