// pages/errors.js — Error Book / 错题本
import { store } from '../state.js';
import { icon, toast, modal } from '../ui.js';
import { weaknesses } from '../ai.js';

let f = { type: 'all' };

export function render() {
  const all = store.state.errors;
  const stats = store.errorStats();
  const wk = weaknesses(all);
  const types = ['all', 'vocab', 'grammar', 'listening', 'reading', 'writing', 'speaking'];
  const labels = { all: '全部', vocab: '词汇', grammar: '语法', listening: '听力', reading: '阅读', writing: '写作', speaking: '口语' };
  const list = all.filter(e => f.type === 'all' || e.type === f.type);

  return `<div class="page"><div class="crumb"><a href="#/home">首页</a><span class="sep">/</span><span>错题本</span></div>
    <div class="section-head"><div><h2>错题本</h2><div class="sub">所有练习与模考的错题自动进入 · AI 分析你的薄弱点</div></div>
      ${all.length ? `<button class="btn btn-danger btn-sm" id="e-clear">${icon('trash', { size: 15 })}<span>清空全部</span></button>` : ''}</div>

    ${all.length === 0 ? emptyState() : `
    <div class="grid grid-4 mb-6">
      <div class="card card-pad-sm"><div class="muted text-sm">错题总数</div><div class="val" style="font-size:28px;font-weight:760">${all.length}</div></div>
      ${['vocab', 'grammar', 'listening', 'reading', 'writing', 'speaking'].filter(t => stats[t]).slice(0, 3).map(t => `<div class="card card-pad-sm"><div class="muted text-sm">${labels[t]}</div><div class="val" style="font-size:28px;font-weight:760">${stats[t]}</div></div>`).join('')}
    </div>

    <div class="card mb-6 ai-panel">
      <div class="row gap-2" style="color:var(--brand)">${icon('sparkles', { size: 20 })}<b>AI 薄弱点分析</b></div>
      <div class="hint">你最近最常犯的错误：</div>
      <div class="grid grid-3 mt-3">
        ${wk.top.map((w, i) => `<div class="card card-pad-sm"><div class="row gap-2"><span class="badge badge-warning">Top ${i + 1}</span><b>${w.name}</b><span class="badge" style="margin-left:auto">${w.count}</span></div>
          <div class="text-sm mt-2">${wk.advice[w.name] || '针对性训练：回到对应模块练习。'}</div></div>`).join('')}
      </div>
      <button class="btn btn-primary mt-4" id="e-train">${icon('target', { size: 15 })}<span>生成针对性训练</span></button>
    </div>

    <div class="tabs mb-5" style="max-width:680px">${types.map(t => `<button class="tab ${f.type === t ? 'active' : ''}" data-et="${t}">${labels[t]}${stats[t] ? ' ' + stats[t] : ''}</button>`).join('')}</div>

    <div class="card"><div class="card-title mb-3">错题列表（${list.length}）</div>
      <div class="stack gap-2">${list.map(e => `<div class="list-item" style="align-items:flex-start">
        <span class="badge" style="margin-top:2px;color:var(--brand)">${labels[e.type] || e.type}</span>
        <div class="full"><div class="text-sm strong">${e.q || e.tag || '错题'}</div>
        ${e.a ? `<div class="muted text-sm">你的答案：${e.a}</div>` : ''}
        ${e.tag ? `<div class="hint">分类：${e.tag}</div>` : ''}</div>
        <button class="icon-btn" data-del="${e.id}" title="删除">${icon('x', { size: 16 })}</button>
      </div><div class="list-divider"></div>`).join('').replace(/<div class="list-divider"><\/div>$/, '')}</div>
    </div>`}
  </div>`;
}

function emptyState() {
  return `<div class="card empty" style="padding:64px"><div class="ic">${icon('check', { size: 28 })}</div>
    <div class="strong" style="font-size:18px">还没有错题</div>
    <div class="muted mt-2">去做几道题，错了的会自动出现在这里，AI 会帮你分析薄弱点。</div>
    <a class="btn btn-primary mt-5" href="#/learn">${icon('book', { size: 16 })}<span>去学习中心</span></a></div>`;
}

window.addEventListener('page:rendered', (e) => {
  if (e.detail.seg !== 'errors') return;
  const root = document.getElementById('app');
  root.querySelectorAll('[data-et]').forEach(b => b.onclick = () => { f.type = b.dataset.et; location.hash = '#/errors'; });
  root.querySelectorAll('[data-del]').forEach(b => b.onclick = () => { store.removeError(b.dataset.del); location.hash = '#/errors'; });
  const clr = root.querySelector('#e-clear'); if (clr) clr.onclick = () => { modal(`<div class="card-title">清空错题本？</div><p class="muted mt-2">这会删除全部 ${store.state.errors.length} 条错题记录，无法恢复。</p><div class="row gap-2 mt-4"><button class="btn btn-ghost" onclick="closeModal()">取消</button><button class="btn btn-danger" id="e-confirm">确认清空</button></div>`); setTimeout(() => { const c = document.getElementById('e-confirm'); if (c) c.onclick = () => { store.clearErrors(); closeModal(); location.hash = '#/errors'; }; }, 0); };
  const train = root.querySelector('#e-train'); if (train) train.onclick = () => { const wk = weaknesses(store.state.errors).top[0]; const map = { 'Vocabulary': '#/learn/vocab/review', 'Grammar': '#/learn/grammar', 'Listening': '#/learn/listening', 'Reading': '#/learn/reading', 'Writing': '#/learn/writing', 'Speaking': '#/learn/speaking' }; const url = map[wk.name] || '#/learn'; location.hash = url; toast('已为你打开针对性训练'); };
});
