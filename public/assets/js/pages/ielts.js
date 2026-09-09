// pages/ielts.js
import { store } from '../state.js';
import { icon } from '../ui.js';
import { IELTS_INFO, LISTENING, READING, WRITING, BANK } from '../data.js';
import { BAND_SCALE } from '../ai.js';

const SUB = [
  { k: '', label: 'Overview' }, { k: 'listening', label: 'Listening' }, { k: 'reading', label: 'Reading' },
  { k: 'writing', label: 'Writing' }, { k: 'speaking', label: 'Speaking' },
];

export function render(segs) {
  const sub = segs[0] || '';
  const nav = `<nav class="subnav">${SUB.map(s => `<a class="${s.k === sub ? 'active' : ''}" href="#/ielts/${s.k}">${s.label}</a>`).join('')}</nav>`;
  let body = '';
  if (sub === 'listening') body = listening();
  else if (sub === 'reading') body = reading();
  else if (sub === 'writing') body = writing();
  else if (sub === 'speaking') body = speaking();
  else body = overview();
  return `<div class="page"><div class="crumb"><a href="#/home">首页</a><span class="sep">/</span><span>IELTS</span></div>
    <div class="section-head"><div><h2>IELTS 雅思专区</h2><div class="sub">Academic & General Training · 听说读写四科完整体系</div></div>
    <span class="badge badge-brand">${icon('globe', { size: 15 })} IELTS</span></div>
    ${nav}${body}</div>`;
}

function overview() {
  const sec = IELTS_INFO.sections;
  const bands = IELTS_INFO.bands;
  return `
  <div class="grid grid-2 mb-6">
    <div class="card">
      <div class="card-title mb-2">IELTS 是什么</div>
      <p class="muted">${IELTS_INFO.intro}</p>
      <div class="grid grid-2 mt-4">
        <div class="ai-panel"><b>Academic 学术类</b><p class="mt-2 text-sm">适用于留学、专业注册。Reading / Writing 偏学术（图表、议论文）。</p></div>
        <div class="ai-panel"><b>General Training</b><p class="mt-2 text-sm">适用于移民、工作。Reading / Writing 偏生活与工作场景（书信）。</p></div>
      </div>
      <div class="hint mt-3">Listening 与 Speaking 在两类考试中完全相同。</div>
    </div>
    <div class="card">
      <div class="card-title mb-3">考试流程</div>
      <div class="timeline">
        <div class="tl-item done"><b>报名</b><div class="muted text-sm">选择 Academic / General 与考点</div></div>
        <div class="tl-item done"><b>笔试日</b><div class="muted text-sm">Listening 30min + Reading 60min + Writing 60min</div></div>
        <div class="tl-item"><b>口语日</b><div class="muted text-sm">单独预约，Part 1–3 真人对话 11–14 分钟</div></div>
        <div class="tl-item"><b>出分</b><div class="muted text-sm">通常 13 天后公布，有效期 2 年</div></div>
      </div>
    </div>
  </div>

  <div class="card mb-6">
    <div class="card-title mb-4">四科结构</div>
    <div class="grid grid-4">
      ${sec.map(s => `<div class="ai-panel"><div class="row gap-2" style="color:var(--c-ielts)">${icon(s.key === 'listening' ? 'headphones' : s.key === 'reading' ? 'doc' : s.key === 'writing' ? 'edit' : 'mic', { size: 20 })}<b>${s.name}</b></div>
        <div class="badge mt-2">${s.time}</div><div class="muted text-sm mt-2">${s.detail}</div></div>`).join('')}
    </div>
  </div>

  <div class="grid grid-2 mb-6">
    <div class="card">
      <div class="card-title mb-3">Band 评分体系</div>
      <div class="stack gap-2">${bands.map(b => `<div class="list-item" style="padding:10px 0"><span class="badge badge-brand" style="min-width:54px;text-align:center">Band ${b}</span><span class="strong">${IELTS_INFO.bandDesc[b]}</span><span class="muted text-sm full" style="text-align:right">${BAND_SCALE[b].slice(0, 6)}…</span></div>`).join('')}</div>
    </div>
    <div class="card">
      <div class="card-title mb-3">备考路线</div>
      <ol class="stack gap-2" style="list-style:decimal;padding-left:18px">
        <li class="text-sm">自测当前水平，明确目标 Band</li>
        <li class="text-sm">词汇 + 语法打底（去「学习中心」）</li>
        <li class="text-sm">分科专项：听力精听、阅读技巧、写作结构、口语题库</li>
        <li class="text-sm">刷官方 Sample / Practice 真题</li>
        <li class="text-sm">每周完整模考 + AI 分析</li>
      </ol>
      <a class="btn btn-primary btn-block mt-4" href="#/mock">${icon('target', { size: 16 })}<span>去模拟考试</span></a>
      <a class="btn btn-soft btn-block mt-2" href="#/plan">${icon('calendar', { size: 16 })}<span>生成学习计划</span></a>
    </div>
  </div>`;
}

function listening() {
  const items = LISTENING.filter(l => l.exam === 'IELTS');
  const sections = [
    { n: 1, d: '日常对话（两人）', t: '填空 / 单选' }, { n: 2, d: '独白（生活类）', t: '地图 / 填空' },
    { n: 3, d: '学术对话（多人）', t: '多选 / 配对' }, { n: 4, d: '学术独白', t: '填空 / 完成句' },
  ];
  return `<div class="grid grid-2 mb-6">${sections.map(s => `<div class="card card-pad-sm"><div class="row gap-2"><span class="badge badge-brand">Section ${s.n}</span></div><div class="card-title mt-3">${s.d}</div><div class="muted text-sm">题型：${s.t}</div></div>`).join('')}</div>
  <div class="section-title">真题 / 题型训练</div>
  <div class="grid grid-2">${items.length ? items.map(it => `<a class="card card-click" href="#/learn/listening/${it.id}"><div class="row gap-2"><span class="badge" style="color:var(--c-listen)">IELTS</span><span class="badge">${it.level}</span></div><div class="card-title mt-3">${it.title}</div><div class="row gap-2 mt-3 muted text-sm">${icon('clock', { size: 14 })} ${it.duration} · ${it.questions.length} 题</div></a>`).join('') : emptyTip()}
  ${BANK.filter(b => b.exam === 'IELTS' && b.subject === 'Listening').map(b => `<a class="card card-click" href="#/bank"><div class="badge" style="color:var(--c-listen)">${b.type}</b></div><div class="card-title mt-2">${b.title}</div><div class="muted text-sm">${b.desc}</div></a>`).join('')}</div>`;
}

function reading() {
  const items = READING.filter(r => r.exam === 'IELTS');
  const types = ['True / False / Not Given', 'Matching 信息匹配', 'Heading 段落主旨', 'Multiple Choice 单选', 'Sentence Completion 填空'];
  return `<div class="grid grid-2 mb-6"><div class="card"><div class="card-title mb-3">题型训练</div><div class="stack gap-2">${types.map(t => `<span class="chip">${t}</span>`).join('')}</div>
    <div class="ai-panel mt-4"><b>长难句技巧</b><p class="mt-2 text-sm">先找主干（主谓宾），再看修饰（从句 / 分词）。遇到长句先拆，不要逐词翻译。</p></div></div>
    <div class="card"><div class="card-title mb-3">阅读技巧</div><ul class="stack gap-2" style="list-style:decimal;padding-left:18px"><li class="text-sm">扫读找结构，精读定位句</li><li class="text-sm">同意替换是解题核心</li><li class="text-sm">Not Given = 原文完全未提及</li><li class="text-sm">先题后文，带着关键词回原文</li></ul></div></div>
  <div class="section-title">真题训练</div>
  <div class="grid grid-2">${items.length ? items.map(it => `<a class="card card-click" href="#/learn/reading/${it.id}"><div class="row gap-2"><span class="badge" style="color:var(--c-read)">IELTS</span><span class="badge">${it.level}</span></div><div class="card-title mt-3">${it.title}</div><div class="row gap-2 mt-3 muted text-sm">${icon('doc', { size: 14 })} ${it.questions.length} 题</div></a>`).join('') : emptyTip()}
  ${BANK.filter(b => b.exam === 'IELTS' && b.subject === 'Reading').map(b => `<a class="card card-click" href="#/bank"><div class="badge" style="color:var(--c-read)">${b.type}</div><div class="card-title mt-2">${b.title}</div><div class="muted text-sm">${b.desc}</div></a>`).join('')}</div>`;
}

function writing() {
  const items = WRITING.filter(w => w.exam === 'IELTS');
  const t1types = ['柱状图 Bar', '折线图 Line', '饼图 Pie', '表格 Table', '流程图 Process', '地图 Map'];
  return `<div class="grid grid-2 mb-6">
    <div class="card"><div class="row gap-2 mb-3"><span class="badge" style="color:var(--c-write)">Task 1</span><b>Academic</b></div>
      <p class="muted text-sm">根据图表 / 表格 / 流程图 / 地图写至少 150 词报告，20 分钟。</p>
      <div class="row gap-2 wrap mt-3">${t1types.map(t => `<span class="chip">${t}</span>`).join('')}</div>
      <div class="ai-panel mt-3"><b>General Training Task 1</b><p class="mt-2 text-sm">改为写一封书信（正式 / 半正式 / 非正式），同样至少 150 词。</p></div></div>
    <div class="card"><div class="row gap-2 mb-3"><span class="badge" style="color:var(--c-write)">Task 2</span><b>议论文</b></div>
      <p class="muted text-sm">回应一个观点 / 问题，写至少 250 词议论文，40 分钟。A 类与 G 类相同。</p>
      <div class="ai-panel mt-3"><b>AI 批改</b><p class="mt-2 text-sm">写完后让 AI 按任务回应、连贯、词汇、语法四维打分，并逐条解释「为什么错 → 怎么改 → 为什么这样改」。</p>
      <a class="btn btn-soft btn-sm mt-3" href="#/learn/writing">${icon('sparkles', { size: 14 })}<span>去写作模块</span></a></div></div>
  </div>
  <div class="section-title">写作真题 / 范文</div>
  <div class="grid grid-2">${items.map(p => `<a class="card card-click" href="#/learn/writing/${p.id}"><div class="row gap-2"><span class="badge" style="color:var(--c-write)">${p.task}</span></div><div class="card-title mt-2">${p.title}</div><div class="muted text-sm">${p.prompt.slice(0, 48)}…</div></a>`).join('')}
  ${BANK.filter(b => b.exam === 'IELTS' && b.subject === 'Writing').map(b => `<a class="card card-click" href="#/bank"><div class="badge" style="color:var(--c-write)">${b.type}</div><div class="card-title mt-2">${b.title}</div><div class="muted text-sm">${b.desc}</div></a>`).join('')}</div>`;
}

function speaking() {
  const i = { part1: ['What is your name?', 'Do you work or study?', 'What do you do on weekends?'], part2: ['Describe a book that influenced you.', 'Describe a place you like to visit.'], part3: ['Why do people need to read more?', 'Do books get replaced by screens?'] };
  return `<div class="card mb-6"><div class="card-title mb-2">IELTS Speaking 官方结构</div><p class="muted text-sm">共三部分，约 11–14 分钟，真人考官对话。Part 1 自我介绍与日常；Part 2 个人陈述（1 分钟准备 + 2 分钟说）；Part 3 抽象讨论。</p>
    <div class="grid grid-3 mt-4">${[['Part 1', '4–5 分钟', '日常话题问答'], ['Part 2', '3–4 分钟', '话题卡个人陈述'], ['Part 3', '4–5 分钟', '深度讨论']].map(([p, t, d]) => `<div class="ai-panel"><b>${p}</b><div class="muted text-sm mt-1">${t} · ${d}</div></div>`).join('')}</div></div>
  <div class="section-title">口语题库 + AI 模拟考官</div>
  <div class="grid grid-2">
    <div class="card"><div class="card-title mb-3">Part 1 示例</div>${i.part1.map(q => `<div class="list-item"><span class="dot dot-success"></span><span>${q}</span></div>`).join('')}
      <div class="card-title mt-4 mb-3">Part 2 话题卡</div>${i.part2.map(q => `<div class="list-item"><span class="dot dot-warning"></span><span>${q}</span></div>`).join('')}
      <div class="card-title mt-4 mb-3">Part 3 讨论</div>${i.part3.map(q => `<div class="list-item"><span class="dot dot-danger"></span><span>${q}</span></div>`).join('')}</div>
    <div class="card ai-panel"><div class="row gap-2" style="color:var(--brand)">${icon('sparkles', { size: 20 })}<b>AI 模拟考官</b></div>
      <p class="mt-3 text-sm">按 Part 1 → 2 → 3 完整模拟，不打断、不提前给答案。考试结束后生成 Fluency / Vocabulary / Grammar / Pronunciation / 预估 Band / 具体问题 / 改进建议。</p>
      <a class="btn btn-primary mt-4" href="#/partner/ielts">${icon('mic', { size: 16 })}<span>开始 IELTS 口语模拟</span></a>
      <a class="btn btn-soft mt-2" href="#/learn/speaking">${icon('mic', { size: 16 })}<span>口语练习场</span></a></div>
  </div>`;
}

function emptyTip() { return `<div class="card empty" style="padding:32px;grid-column:1/-1"><div class="muted">更多真题持续补充中，可先使用上方练习模块。</div></div>`; }
