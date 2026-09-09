// pages/toefl.js — TOEFL iBT (2026 new structure)
import { icon } from '../ui.js';
import { TOEFL_INFO, LISTENING, READING, WRITING, BANK } from '../data.js';

const SUB = [
  { k: '', label: 'Overview' }, { k: 'reading', label: 'Reading' }, { k: 'listening', label: 'Listening' },
  { k: 'speaking', label: 'Speaking' }, { k: 'writing', label: 'Writing' },
];

export function render(segs) {
  const sub = segs[0] || '';
  const nav = `<nav class="subnav">${SUB.map(s => `<a class="${s.k === sub ? 'active' : ''}" href="#/toefl/${s.k}">${s.label}</a>`).join('')}</nav>`;
  let body = '';
  if (sub === 'reading') body = reading();
  else if (sub === 'listening') body = listening();
  else if (sub === 'speaking') body = speaking();
  else if (sub === 'writing') body = writing();
  else body = overview();
  return `<div class="page"><div class="crumb"><a href="#/home">首页</a><span class="sep">/</span><span>TOEFL</span></div>
    <div class="section-head"><div><h2>TOEFL 托福专区</h2><div class="sub">2026 年 1 月 21 日后的新版 TOEFL iBT</div></div>
    <span class="badge" style="color:var(--c-toefl);background:var(--c-toefl);color:#fff">${icon('flag', { size: 15 })} 新版</span></div>
    ${nav}${body}</div>`;
}

function overview() {
  const sec = TOEFL_INFO.sections;
  return `
  <div class="card mb-6" style="border-color:var(--c-toefl)">
    <div class="row gap-2" style="color:var(--c-toefl)">${icon('info', { size: 20 })}<b>新版结构要点</b></div>
    <p class="mt-3">${TOEFL_INFO.intro}</p>
    <div class="ai-panel mt-3"><b>评分体系</b><p class="mt-2 text-sm">${TOEFL_INFO.scoring}</p>
      <div class="hint mt-2">阅读 / 听力 / 口语 / 写作各 1–6 分；总评 4–24 分，过渡期同时提供可比的 0–120 分。</div></div>
  </div>

  <div class="grid grid-2 mb-6">
    <div class="card"><div class="card-title mb-3">四科结构（新版）</div><div class="stack gap-3">
      ${sec.map(s => `<div class="list-item" style="padding:12px 0"><div class="row gap-2" style="color:var(--c-toefl)">${icon(s.key === 'reading' ? 'doc' : s.key === 'listening' ? 'headphones' : s.key === 'speaking' ? 'mic' : 'edit', { size: 20 })}<b class="full">${s.name}</b><span class="badge">${s.time}</span></div><div class="muted text-sm">${s.detail}</div></div>`).join('')}
    </div></div>
    <div class="card"><div class="card-title mb-3">备考路线</div><ol class="stack gap-2" style="list-style:decimal;padding-left:18px">
      <li class="text-sm">确认当前水平与目标 0–120 分</li>
      <li class="text-sm">学术词汇 + 听力抓主干</li>
      <li class="text-sm">综合任务（读 + 听 + 说 / 写）专项</li>
      <li class="text-sm">官方 Practice / 真题训练</li>
      <li class="text-sm">每周模考 + AI 评分反馈</li>
    </ol>
      <a class="btn btn-primary btn-block mt-4" href="#/mock">${icon('target', { size: 16 })}<span>去模拟考试</span></a>
      <a class="btn btn-soft btn-block mt-2" href="#/plan">${icon('calendar', { size: 16 })}<span>生成学习计划</span></a></div>
  </div>

  <div class="card"><div class="card-title mb-3">新版任务变化</div>
    <div class="grid grid-2">
      <div class="ai-panel"><b>Speaking</b><p class="mt-2 text-sm">更贴近课堂的学术讨论任务，强调观点表达与回应他人。</p></div>
      <div class="ai-panel"><b>Writing</b><p class="mt-2 text-sm">学术讨论写作（更短、更互动）+ 综合写作，整体时长压缩到约 29 分钟。</p></div>
    </div>
  </div>`;
}

function reading() {
  const items = READING.filter(r => r.exam === 'TOEFL');
  return `<div class="card mb-6"><div class="card-title mb-2">TOEFL Reading（新版）</div><p class="muted text-sm">约 2 篇文章，每篇 10 题，学术主题，限时约 36 分钟。题型含事实信息、推断、词汇、插入句子、主旨。</p></div>
  <div class="section-title">真题 / 练习</div>
  <div class="grid grid-2">${items.length ? items.map(it => `<a class="card card-click" href="#/learn/reading/${it.id}"><div class="row gap-2"><span class="badge" style="color:var(--c-toefl)">TOEFL</span><span class="badge">${it.level}</span></div><div class="card-title mt-3">${it.title}</div><div class="row gap-2 mt-3 muted text-sm">${icon('doc', { size: 14 })} ${it.questions.length} 题</div></a>`).join('') : ''}
  ${BANK.filter(b => b.exam === 'TOEFL' && b.subject === 'Reading').map(b => `<a class="card card-click" href="#/bank"><div class="badge" style="color:var(--c-toefl)">${b.type}</div><div class="card-title mt-2">${b.title}</div><div class="muted text-sm">${b.desc}</div></a>`).join('')}</div>`;
}

function listening() {
  const items = LISTENING.filter(l => l.exam === 'TOEFL');
  return `<div class="card mb-6"><div class="card-title mb-2">TOEFL Listening（新版）</div><p class="muted text-sm">讲座与对话，综合理解，限时约 36 分钟。重点训练抓主旨、态度、细节与推断。</p></div>
  <div class="section-title">真题 / 练习</div>
  <div class="grid grid-2">${items.length ? items.map(it => `<a class="card card-click" href="#/learn/listening/${it.id}"><div class="row gap-2"><span class="badge" style="color:var(--c-toefl)">TOEFL</span><span class="badge">${it.level}</span></div><div class="card-title mt-3">${it.title}</div><div class="row gap-2 mt-3 muted text-sm">${icon('clock', { size: 14 })} ${it.duration} · ${it.questions.length} 题</div></a>`).join('') : ''}
  ${BANK.filter(b => b.exam === 'TOEFL' && b.subject === 'Listening').map(b => `<a class="card card-click" href="#/bank"><div class="badge" style="color:var(--c-toefl)">${b.type}</div><div class="card-title mt-2">${b.title}</div><div class="muted text-sm">${b.desc}</div></a>`).join('')}</div>`;
}

function speaking() {
  const t = { tasks: [{ n: 1, type: 'Independent', cue: '小组学习 vs 独自学习，你选哪个？' }, { n: 2, type: 'Integrated', cue: '读校园通知 + 听学生观点，解释其态度。' }, { n: 3, type: 'Academic Discussion', cue: '参与课堂讨论，回应教授与同学的观点。' }, { n: 4, type: 'Integrated', cue: '读学术段落 + 听讲座，总结两者关系。' }] };
  return `<div class="card mb-6"><div class="card-title mb-2">TOEFL Speaking（新版）</div><p class="muted text-sm">约 16 分钟，4 个任务，含独立与综合（读 + 听 + 说）。综合任务重点考察课堂学术讨论能力。</p></div>
  <div class="grid grid-2">
    <div class="card"><div class="card-title mb-3">任务总览</div>${t.tasks.map(tk => `<div class="list-item" style="padding:12px 0"><span class="badge" style="color:var(--c-toefl)">Task ${tk.n}</span><b class="full">${tk.type}</b></div><div class="muted text-sm mb-2">${tk.cue}</div>`).join('')}</div>
    <div class="card ai-panel"><div class="row gap-2" style="color:var(--brand)">${icon('sparkles', { size: 20 })}<b>AI Speaking 训练</b></div><p class="mt-3 text-sm">按新版任务模拟训练，用麦克风回答，AI 分析流利度、词汇、语法、发音并给改进建议。</p>
      <a class="btn btn-primary mt-4" href="#/partner/toefl">${icon('mic', { size: 16 })}<span>开始 TOEFL 口语训练</span></a>
      <a class="btn btn-soft mt-2" href="#/learn/speaking">${icon('mic', { size: 16 })}<span>口语练习场</span></a></div>
  </div>`;
}

function writing() {
  const items = WRITING.filter(w => w.exam === 'TOEFL');
  return `<div class="card mb-6"><div class="card-title mb-2">TOEFL Writing（新版）</div><p class="muted text-sm">约 29 分钟：学术讨论写作（更短更互动）+ 综合写作（读 + 听 + 写）。</p></div>
  <div class="section-title">写作真题 / AI 批改</div>
  <div class="grid grid-2">${items.map(p => `<a class="card card-click" href="#/learn/writing/${p.id}"><div class="row gap-2"><span class="badge" style="color:var(--c-toefl)">${p.task}</span></div><div class="card-title mt-2">${p.title}</div><div class="muted text-sm">${p.prompt.slice(0, 48)}…</div></a>`).join('')}
  ${BANK.filter(b => b.exam === 'TOEFL' && b.subject === 'Writing').map(b => `<a class="card card-click" href="#/bank"><div class="badge" style="color:var(--c-toefl)">${b.type}</div><div class="card-title mt-2">${b.title}</div><div class="muted text-sm">${b.desc}</div></a>`).join('')}</div>`;
}
