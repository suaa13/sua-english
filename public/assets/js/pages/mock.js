// pages/mock.js — Mock Test / 模拟考试
import { store } from '../state.js';
import { icon, toast } from '../ui.js';
import { donut } from '../charts.js';
import { LISTENING, READING, WRITING, SPEAKING, MOCK_TEMPLATE } from '../data.js';
import { writingCritique, speakingAnalyze, BAND_SCALE } from '../ai.js';
import { animatePage } from '../anim.js';

let m = { step: 'pick', exam: 'ielts', answers: {}, timer: null, remain: 0, report: null };

function examData(exam) {
  return {
    listening: LISTENING.filter(l => l.exam.toUpperCase() === exam.toUpperCase()),
    reading: READING.filter(r => r.exam.toUpperCase() === exam.toUpperCase()),
    writing: WRITING.filter(w => w.exam.toUpperCase() === exam.toUpperCase()),
    speaking: exam === 'ielts' ? SPEAKING.ielts : SPEAKING.toefl,
  };
}

export function render() {
  if (m.step === 'pick') return pickView();
  if (m.step === 'exam') return examView();
  if (m.step === 'report') return reportView();
  return pickView();
}

function pickView() {
  const t = MOCK_TEMPLATE;
  return `<div class="page"><div class="crumb"><a href="#/home">首页</a><span class="sep">/</span><span>模拟考试</span></div>
    <div class="section-head"><div><h2>模拟考试</h2><div class="sub">完整流程：自动计时 · 自动保存 · 完成后自动评分</div></div></div>
    <div class="grid grid-2">
      ${['ielts', 'toefl'].map(ex => `<div class="card card-click" data-exam="${ex}">
        <div class="row gap-2" style="color:${ex === 'ielts' ? 'var(--c-ielts)' : 'var(--c-toefl)'}">${icon(ex === 'ielts' ? 'globe' : 'flag', { size: 26 })}<div class="card-title">${t[ex].name}</div></div>
        <div class="stack gap-2 mt-4">${t[ex].parts.map(p => `<div class="list-item" style="padding:8px 0"><span class="badge">${p.name}</span><span class="muted text-sm full" style="text-align:right">${p.time / 60} 分钟 · ${p.questions} 题</span></div>`).join('')}</div>
        <div class="row gap-2 mt-4" style="color:${ex === 'ielts' ? 'var(--c-ielts)' : 'var(--c-toefl)'}">开始模考 ${icon('arrowR', { size: 15 })}</div>
      </div>`).join('')}
    </div>
    <div class="hint center-text mt-6">模考使用官方风格 sample 题目；正式上线后将接入完整题库。</div></div>`;
}

function examView() {
  const d = examData(m.exam);
  const parts = [];
  if (d.listening.length) parts.push({ key: 'listening', name: 'Listening', html: listenBlock(d.listening) });
  if (d.reading.length) parts.push({ key: 'reading', name: 'Reading', html: readBlock(d.reading) });
  if (d.writing.length) parts.push({ key: 'writing', name: 'Writing', html: writeBlock(d.writing[0]) });
  parts.push({ key: 'speaking', name: 'Speaking', html: speakBlock(d.speaking) });

  const total = MOCK_TEMPLATE[m.exam].parts.reduce((a, p) => a + p.time, 0);
  return `<div class="page"><div class="crumb"><a href="#/home">首页</a><span class="sep">/</span><span>模拟考试</span></div>
    <div class="card mb-5" style="position:sticky;top:72px;z-index:10">
      <div class="row between">
        <div class="row gap-3"><b>${MOCK_TEMPLATE[m.exam].name}</b><span class="badge">${m.exam.toUpperCase()}</span></div>
        <div class="row gap-3"><span class="badge badge-warning" id="m-timer">${fmt(m.remain)}</span><button class="btn btn-primary btn-sm" id="m-submit">${icon('check', { size: 15 })}<span>提交并评分</span></button><button class="btn btn-ghost btn-sm" id="m-quit">退出</button></div>
      </div>
      <div class="hint mt-2">答案自动保存。听力 / 阅读自动评分；写作 / 口语由 AI 估算。</div>
    </div>
    <div id="exam-parts">${parts.map((p, i) => `<div class="card mb-5"><div class="row gap-2 mb-3"><span class="badge" style="color:var(--brand)">Part ${i + 1}</span><b>${p.name}</b></div>${p.html}</div>`).join('')}</div>
  </div>`;
}
function listenBlock(items) {
  return items.map(it => `<div class="mb-4"><div class="strong mb-2">${it.title}</div><div class="muted text-sm mb-2">${it.transcript.slice(0, 120)}…（练习中可点「播放」逐题作答）</div>
    ${it.questions.map((q, qi) => `<div class="mb-3"><div class="text-sm mb-1">${qi + 1}. ${q.q}</div><div class="stack gap-1">${q.options.map((o, j) => `<button class="btn" style="justify-content:flex-start" data-mq="L-${it.id}-${qi}" data-o="${j}" data-ans="${q.answer}">${o}</button>`).join('')}</div></div>`).join('')}</div>`).join('');
}
function readBlock(items) {
  return items.map(it => `<div class="mb-4"><div class="strong mb-2">${it.title}</div>
    ${it.questions.map((q, qi) => `<div class="mb-3"><div class="text-sm mb-1">${qi + 1}. ${q.q}</div><div class="stack gap-1">${q.options.map((o, j) => `<button class="btn" style="justify-content:flex-start" data-mq="R-${it.id}-${qi}" data-o="${j}" data-ans="${q.answer}">${o}</button>`).join('')}</div></div>`).join('')}</div>`).join('');
}
function writeBlock(p) {
  return `<div class="mb-2"><div class="text-sm">${p.task}：${p.title}</div><div class="muted text-sm my-2">${p.prompt}</div>
    <textarea class="textarea" data-mwrite="W" placeholder="在此写作…"></textarea></div>`;
}
function speakBlock(sp) {
  const q = m.exam === 'ielts' ? sp.part1[0] : sp.tasks[0].cue;
  return `<div class="mb-2"><div class="text-sm">口语题目：</div><div class="ai-panel mt-2">${q}</div>
    <textarea class="textarea mt-2" data-mspeak="S" placeholder="用英语写下 / 描述你的回答…"></textarea></div>`;
}

function reportView() {
  const r = m.report; const u = store.state.user;
  const target = m.exam === 'ielts' ? u.ieltsTarget : u.toeflTarget;
  const isI = m.exam === 'ielts';
  const overall = (r.scores.listening + r.scores.reading + r.scores.writing + r.scores.speaking) / 4;
  const gap = target - overall;
  const skillRows = [
    { k: 'listening', label: 'Listening', v: r.scores.listening },
    { k: 'reading', label: 'Reading', v: r.scores.reading },
    { k: 'writing', label: 'Writing', v: r.scores.writing },
    { k: 'speaking', label: 'Speaking', v: r.scores.speaking },
  ];
  const weakest = [...skillRows].sort((a, b) => a.v - b.v)[0];
  return `<div class="page"><div class="crumb"><a href="#/home">首页</a><span class="sep">/</span><span>模拟考试</span></div>
    <div class="section-head"><div><h2>Score Report</h2><div class="sub">${MOCK_TEMPLATE[m.exam].name}</div></div>
      <button class="btn btn-soft btn-sm" id="m-again">${icon('refresh', { size: 15 })}<span>再考一次</span></button></div>
    <div class="grid grid-2 mb-6">
      <div class="card center-text"><div style="color:var(--brand)">OVERALL ${isI ? 'BAND' : 'SCORE'}</div>
        <div style="font-size:54px;font-weight:800;letter-spacing:-0.03em;line-height:1.1;margin:8px 0">${overall.toFixed(1)}</div>
        <div class="muted">目标 ${target} · ${gap > 0 ? `差距 ${gap.toFixed(1)}` : '已达标 🎉'}</div>
        ${donut(Math.min(100, overall / (isI ? 9 : 6) * 100), { label: overall.toFixed(1), sub: isI ? 'Band' : '/6', size: 120 })}</div>
      <div class="card"><div class="card-title mb-4">分科成绩</div>
        ${skillRows.map(s => `<div class="mb-4"><div class="row between mb-1"><span class="text-sm strong">${s.label}</span><span class="badge">${s.v.toFixed(1)}${isI ? '' : '/6'}</span></div><div class="progress progress-thin"><span style="width:${Math.min(100, s.v / (isI ? 9 : 6) * 100)}%"></span></div></div>`).join('')}
        <div class="ai-panel mt-4"><b>当前水平 → 目标 → 差距</b><p class="mt-2 text-sm">当前 ${overall.toFixed(1)}，目标 ${target}。最弱项是 <b>${weakest.label}</b>。</p>
        <div class="hint mt-2">建议优先补强 ${weakest.label}：去「学习中心」做专项，或让 AI 生成针对性训练。</div>
        <a class="btn btn-primary btn-sm mt-3" href="#/learn/${weakest.k}">${icon('arrowR', { size: 14 })}<span>去补强 ${weakest.label}</span></a></div>
      </div>
    </div>
    <div class="row gap-3"><a class="btn btn-soft" href="#/errors">${icon('alert', { size: 15 })}<span>查看错题本</span></a><a class="btn btn-soft" href="#/plan">${icon('calendar', { size: 15 })}<span>调整学习计划</span></a><a class="btn btn-ghost" href="#/profile">${icon('chart', { size: 15 })}<span>学习趋势</span></a></div>
  </div>`;
}

function fmt(s) { const m2 = Math.floor(s / 60), sec = s % 60; return `${String(m2).padStart(2, '0')}:${String(sec).padStart(2, '0')}`; }

function computeReport() {
  const d = examData(m.exam); const isI = m.exam === 'ielts';
  // listening + reading auto-grade
  let lCorr = 0, lTot = 0, rCorr = 0, rTot = 0;
  d.listening.forEach(it => it.questions.forEach((q, qi) => { lTot++; const k = `L-${it.id}-${qi}`; if (m.answers[k] != null && +m.answers[k] === q.answer) lCorr++; }));
  d.reading.forEach(it => it.questions.forEach((q, qi) => { rTot++; const k = `R-${it.id}-${qi}`; if (m.answers[k] != null && +m.answers[k] === q.answer) rCorr++; }));
  const lScore = isI ? Math.max(1, Math.round(lCorr / lTot * 9 * 10) / 10) : 1 + Math.round(lCorr / lTot * 5 * 10) / 10;
  const rScore = isI ? Math.max(1, Math.round(rCorr / rTot * 9 * 10) / 10) : 1 + Math.round(rCorr / rTot * 5 * 10) / 10;
  // writing
  let wScore = 5.5; const wText = m.answers['W'];
  if (wText && wText.trim().length > 20) wScore = writingCritique(wText, d.writing[0] || { exam: m.exam.toUpperCase(), task: 'Task 2' }).overall;
  // speaking
  let sScore = 5.5; const sText = m.answers['S'];
  if (sText && sText.trim().length > 20) sScore = speakingAnalyze(sText, {}).band;
  const report = { scores: { listening: lScore, reading: rScore, writing: wScore, speaking: sScore } };
  store.addMock({ exam: m.exam, kind: 'full', score: (lScore + rScore + wScore + sScore) / 4, detail: MOCK_TEMPLATE[m.exam].name });
  return report;
}

// ---- init ----
function rerender() { document.getElementById('app').innerHTML = render(); bind(); animatePage(document.getElementById('app')); }
function submit() {
  if (m.timer) clearInterval(m.timer);
  m.report = computeReport();
  m.step = 'report';
  rerender();
  toast('评分完成，已生成 Score Report');
}
function bind() {
  if (m.step === 'pick') {
    const root = document.getElementById('app');
    root.querySelectorAll('[data-exam]').forEach(c => c.onclick = () => {
      m = { step: 'exam', exam: c.dataset.exam, answers: {}, timer: null, remain: MOCK_TEMPLATE[c.dataset.exam].parts.reduce((a, p) => a + p.time, 0), report: null };
      rerender();
    });
    return;
  }
  if (m.step === 'exam') {
    const root = document.getElementById('app');
    if (m.timer) clearInterval(m.timer);
    m.timer = setInterval(() => { m.remain--; const t = root.querySelector('#m-timer'); if (t) t.textContent = fmt(m.remain); if (m.remain <= 0) { clearInterval(m.timer); submit(); } }, 1000);
    root.querySelectorAll('[data-mq]').forEach(b => b.onclick = () => {
      const grp = b.dataset.mq;
      root.querySelectorAll(`[data-mq="${grp}"]`).forEach(x => { x.style.background = ''; x.style.color = ''; });
      b.style.background = 'var(--brand-soft)'; b.style.color = 'var(--brand)';
      m.answers[grp] = +b.dataset.o;
    });
    const w = root.querySelector('[data-mwrite]'); if (w) w.oninput = () => m.answers['W'] = w.value;
    const s = root.querySelector('[data-mspeak]'); if (s) s.oninput = () => m.answers['S'] = s.value;
    root.querySelector('#m-submit').onclick = submit;
    root.querySelector('#m-quit').onclick = () => { if (m.timer) clearInterval(m.timer); m = { step: 'pick', exam: 'ielts', answers: {}, timer: null, remain: 0, report: null }; rerender(); };
    return;
  }
  if (m.step === 'report') {
    const root = document.getElementById('app');
    root.querySelector('#m-again').onclick = () => { if (m.timer) clearInterval(m.timer); m = { step: 'pick', exam: 'ielts', answers: {}, timer: null, remain: 0, report: null }; rerender(); };
    return;
  }
}
window.addEventListener('page:rendered', () => { bind(); });
