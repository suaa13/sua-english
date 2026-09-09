// assets/js/vocab-pop.js — 词库单词详情（居中弹窗 + 背景虚化）+ 由此及彼
import { icon } from './ui.js';
import { VOCAB } from './data.js';

let overlayEl = null;
let keyHandlerBound = false;
let livePool = [];
let scrollY = 0;

const escAttr = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function fmtText(s) {
  let t = escAttr(s);
  t = t.replace(/\\n/g, '\n');   // 字面 \n -> 真实换行
  t = t.replace(/\n/g, '<br>');  // 换行 -> 可视换行
  return t;
}

export function setVocabPool(pool) {
  livePool = Array.isArray(pool) ? pool : [];
}

function fullPool() {
  const map = new Map();
  for (const v of livePool) map.set(v.id, v);
  for (const v of VOCAB || []) map.set(v.id, v);
  return [...map.values()];
}

function wordById(id) {
  return livePool.find((x) => x.id === id) || VOCAB.find((x) => x.id === id) || null;
}

function levelLabel(level) {
  return (level || 'basic') === 'basic' ? '基础' : String(level || '').toUpperCase();
}

// 由此及彼：优先显式同义词，其次同词性 + 同难度延伸
function analogies(v) {
  const pool = fullPool();
  const out = [];
  const syns = String(v.synonym || '').split(/[,，]/).map((s) => s.trim()).filter(Boolean);
  for (const s of syns) {
    const found = pool.find((x) => x.word.toLowerCase() === s.toLowerCase());
    if (found && found.id !== v.id) {
      out.push({ rel: '近义替换', v: found });
      if (out.length >= 4) return out;
    }
  }
  for (const x of pool) {
    if (x.id === v.id) continue;
    if (x.pos === v.pos && x.level === v.level) {
      out.push({ rel: '同类延伸', v: x });
      if (out.length >= 4) return out;
    }
  }
  return out;
}

function popHTML(v) {
  const anas = analogies(v);
  const anaBlock = anas.length
    ? `<div class="vocab-ana">
        <div class="vocab-ana-label">由此及彼 <span class="muted text-xs">意思相近或同类的词，点一下接着看</span></div>
        <div class="vocab-ana-items">${anas.map((a) => `<button class="vocab-ana-item" data-vpop="${a.v.id}">
          <span class="serif">${escAttr(a.v.word)}</span>
          <span class="muted text-xs">${escAttr(a.rel)} · ${escAttr(a.v.cn || '')}</span>
        </button>`).join('')}</div>
      </div>`
    : '';
  const example = v.example
    ? `<div class="vocab-row"><div class="vocab-row-label">例句</div><div class="vocab-row-body">
        <div class="serif">${fmtText(v.example)}</div>
        <div class="muted text-xs mt-1">${fmtText(v.exampleCn || '')}</div>
      </div></div>`
    : '';
  const colloc = v.collocation
    ? `<div class="vocab-row"><div class="vocab-row-label">搭配</div><div class="vocab-row-body muted">${fmtText(v.collocation)}</div></div>`
    : '';
  const scenario = v.scenario
    ? `<div class="vocab-row"><div class="vocab-row-label">场景</div><div class="vocab-row-body muted">${fmtText(v.scenario)}</div></div>`
    : '';
  return `<div class="vocab-modal" role="dialog" aria-modal="true">
    <div class="vocab-modal-head">
      <div>
        <div class="vocab-modal-word serif">${escAttr(v.word)}</div>
        <div class="vocab-modal-ipa muted">${escAttr(v.ipa || '')}</div>
      </div>
      <div class="vocab-modal-actions">
        <button class="icon-btn" data-sp="${escAttr(v.word)}" title="发音">${icon('volume', { size: 18 })}</button>
        <button class="vocab-modal-close" data-vpop-close aria-label="关闭">${icon('x', { size: 18 })}</button>
      </div>
    </div>
    <div class="vocab-modal-meta">
      ${v.pos ? `<span class="badge">${escAttr(v.pos)}</span>` : ''}
      <span class="badge badge-brand">${levelLabel(v.level)}</span>
    </div>
    <div class="vocab-modal-cn">${escAttr(v.cn || '')}</div>
    ${v.en ? `<div class="vocab-modal-en muted">${fmtText(v.en)}</div>` : ''}
    ${(example || colloc || scenario) ? `<div class="vocab-modal-detail">${example}${colloc}${scenario}</div>` : ''}
    ${anaBlock}
  </div>`;
}

function ensureOverlay() {
  if (overlayEl && overlayEl.isConnected) return;
  const app = document.getElementById('app');
  if (!app) return;
  overlayEl = document.createElement('div');
  overlayEl.id = 'vocab-modal-overlay';
  overlayEl.className = 'vocab-modal-overlay';
  app.appendChild(overlayEl);
  overlayEl.addEventListener('click', (e) => {
    if (e.target === overlayEl || e.target.closest('[data-vpop-close]')) closeModal();
  });
  if (!keyHandlerBound) {
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });
    keyHandlerBound = true;
  }
}

function openModal(id) {
  const v = wordById(id);
  if (!v) return;
  ensureOverlay();
  if (!overlayEl) return;
  overlayEl.innerHTML = popHTML(v);
  overlayEl.style.display = 'flex';
  scrollY = window.scrollY;
  document.body.style.overflow = 'hidden';
  overlayEl.querySelectorAll('[data-vpop]').forEach((b) => {
    b.addEventListener('click', (e) => { e.stopPropagation(); openModal(b.dataset.vpop); });
  });
}

function closeModal() {
  if (overlayEl) { overlayEl.style.display = 'none'; overlayEl.innerHTML = ''; }
  document.body.style.overflow = '';
  if (scrollY) window.scrollTo(0, scrollY);
}

export function initVocabPop(root) {
  if (root.dataset.vocabPopBound) return;
  root.addEventListener('click', (e) => {
    const tr = e.target.closest('[data-vpop]');
    if (tr) { e.preventDefault(); openModal(tr.dataset.vpop); }
  });
  root.dataset.vocabPopBound = '1';
}
