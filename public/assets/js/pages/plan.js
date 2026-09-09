// pages/plan.js — Study Plan / 学习计划
import { store, levelToLabel } from '../state.js';
import { icon, toast } from '../ui.js';
import { plan } from '../ai.js';

export function render() {
  const existing = store.state.plan;
  return `<div class="page"><div class="crumb"><a href="#/home">首页</a><span class="sep">/</span><span>学习计划</span></div>
    <div class="section-head"><div><h2>学习计划</h2><div class="sub">告诉 AI 你的起点与目标，自动生成专属路线</div></div></div>
    ${existing ? planView(existing) : formView()}</div>`;
}

function formView() {
  const u = store.state.user;
  return `<div class="grid grid-2">
    <div class="card">
      <div class="card-title mb-4">填写你的信息</div>
      <div class="field"><label class="label">当前英语水平</label><select class="select" id="p-level">
        ${['beginner', 'elementary', 'intermediate', 'upper', 'advanced'].map(l => `<option value="${l}" ${u.level === l ? 'selected' : ''}>${levelToLabel(l)}</option>`).join('')}
      </select></div>
      <div class="field"><label class="label">目标考试</label><select class="select" id="p-exam">
        <option value="ielts" ${u.exam === 'ielts' ? 'selected' : ''}>IELTS</option>
        <option value="toefl" ${u.exam === 'toefl' ? 'selected' : ''}>TOEFL</option>
      </select></div>
      <div class="field"><label class="label">${u.exam === 'ielts' ? 'IELTS 目标分数 (Band)' : 'TOEFL 目标分数 (0–120)'}</label>
        <input class="input" id="p-target" type="number" value="${u.exam === 'ielts' ? u.ieltsTarget : u.toeflTarget}" step="${u.exam === 'ielts' ? '0.5' : '5'}"></div>
      <div class="field"><label class="label">考试日期</label><input class="input" id="p-date" type="date" value="${u.examDate || ''}"></div>
      <div class="field"><label class="label">每天学习时间（分钟）</label><input class="input" id="p-mins" type="number" value="${u.dailyMins}" step="5"></div>
      <button class="btn btn-primary btn-block mt-4" id="p-gen">${icon('sparkles', { size: 16 })}<span>生成学习计划</span></button>
    </div>
    <div class="card ai-panel">
      <div class="row gap-2" style="color:var(--brand)">${icon('bulb', { size: 20 })}<b>AI 会为你规划</b></div>
      <ul class="stack gap-3 mt-4">
        <li class="list-item" style="padding:0"><span class="dot dot-success"></span><span><b>路线</b>：英语基础 → 词汇语法 → 听读 → 四科专项 → 真题 → 模考 → 冲刺</span></li>
        <li class="list-item" style="padding:0"><span class="dot dot-success"></span><span><b>节奏</b>：拆成阶段（phases），每阶段有周目标与每日任务</span></li>
        <li class="list-item" style="padding:0"><span class="dot dot-success"></span><span><b>日常</b>：每天告诉你「今天该学什么」</span></li>
        <li class="list-item" style="padding:0"><span class="dot dot-success"></span><span><b>闭环</b>：结合你的错题与模考成绩动态调整</span></li>
      </ul>
    </div>
  </div>`;
}

function planView(pl) {
  const total = pl.phases.reduce((a, p) => a + p.weeks, 0);
  return `<div class="card mb-6">
    <div class="row between mb-4">
      <div><div class="row gap-2"><span class="badge badge-brand">${pl.input.exam.toUpperCase()}</span><b class="text-lg">专属学习计划</b></div>
        <div class="muted text-sm mt-1">目标 ${pl.input.exam.toUpperCase()} ${pl.input.target} · 约 ${pl.totalWeeks} 周（${pl.startDay} → ${pl.examDay}）</div></div>
      <button class="btn btn-soft btn-sm" id="p-regen">${icon('refresh', { size: 15 })}<span>重新生成</span></button>
    </div>
    <div class="ai-panel"><div class="row gap-2" style="color:var(--brand)">${icon('calendar', { size: 18 })}<b>今天该学什么</b></div>
      <div class="row gap-2 wrap mt-2">${pl.todayTask.map(t => `<span class="chip">${icon('check', { size: 14 })} ${t}</span>`).join('')}</div>
      <a class="btn btn-primary btn-sm mt-3" href="#/learn">${icon('book', { size: 14 })}<span>开始今日学习</span></a></div>
  </div>

  <div class="timeline">
    ${pl.phases.map((p, i) => `<div class="tl-item ${i < 2 ? 'done' : ''}">
      <div class="row gap-3" style="align-items:flex-start">
        <div class="card" style="flex:1"><div class="row between"><b>${i + 1}. ${p.name}</b><span class="badge">${p.weeks} 周</span></div>
          <div class="muted text-sm mt-1">${p.focus}</div>
          <div class="row gap-2 wrap mt-3">${p.daily.map(d => `<span class="chip">${d}</span>`).join('')}</div></div>
      </div>
    </div>`).join('')}
  </div>`;
}

window.addEventListener('page:rendered', (e) => {
  if (e.detail.seg !== 'plan') return;
  const root = document.getElementById('app');
  const gen = root.querySelector('#p-gen');
  if (gen) gen.onclick = () => {
    const exam = root.querySelector('#p-exam').value;
    const input = {
      level: root.querySelector('#p-level').value,
      exam,
      target: parseFloat(root.querySelector('#p-target').value) || (exam === 'ielts' ? 6.5 : 90),
      examDate: root.querySelector('#p-date').value,
      dailyMins: parseInt(root.querySelector('#p-mins').value) || 30,
    };
    const pl = plan(input);
    store.setPlan(pl);
    store.updateUser({ level: input.level, exam, ieltsTarget: exam === 'ielts' ? input.target : store.state.user.ieltsTarget, toeflTarget: exam === 'toefl' ? input.target : store.state.user.toeflTarget, examDate: input.examDate, dailyMins: input.dailyMins });
    toast('学习计划已生成');
    location.hash = '#/plan';
  };
  const regen = root.querySelector('#p-regen'); if (regen) regen.onclick = () => { store.setPlan(null); location.hash = '#/plan'; };
});
