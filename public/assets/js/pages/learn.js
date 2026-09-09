// pages/learn.js — Learn hub: Vocabulary, Grammar, Listening, Reading, Writing, Speaking
import { store } from '../state.js';
import { icon, toast, modal, playMorph } from '../ui.js';
import { VOCAB, GRAMMAR, LISTENING, READING, WRITING, SPEAKING } from '../data.js';
import { writingCritique, speakingAnalyze } from '../ai.js';
import { api } from '../api.js';
import { animateIn } from '../anim.js';
import { guideCard, LOW_SHARE_THRESHOLD } from '../guides.js';
import { registerLauncherHTML, initRegister } from '../register.js';
import { initVocabPop, setVocabPool } from '../vocab-pop.js';

// ---- Phase E：微学习指南联动 ----
// 读取学习计划中各科目的动态权重占比；占比偏低的科目高亮推荐对应方法锦囊。
const PLAN_KEY = 'sua_study_plan';
const SHARE_MAP = { listening: 'Listening', reading: 'Reading', speaking: 'Speaking', writing: 'Writing' };
function planSubjectShare(subject) {
  const k = SHARE_MAP[subject];
  if (!k) return null;
  try {
    const plan = JSON.parse(localStorage.getItem(PLAN_KEY) || 'null');
    const w = plan && plan.weights;
    if (!w) return null;
    const sum = ['Listening', 'Reading', 'Speaking', 'Writing'].reduce((a, kk) => a + (Number(w[kk]) || 0), 0);
    if (!sum) return null;
    return (Number(w[k]) || 0) / sum;
  } catch (e) { return null; }
}
function guideBlock(key, subject) {
  const share = planSubjectShare(subject);
  const hot = share != null && share < LOW_SHARE_THRESHOLD;
  return `<div class="mt-7">${guideCard(key, { hot })}</div>`;
}
function guideBand() {
  return `<div class="card-title mt-7 mb-4">方法锦囊</div>
    <div class="grid grid-2 gap-4">
      ${guideCard('cognition')}
      ${guideCard('ai')}
    </div>`;
}

// ---- TTS helper ----
let voice = null;
function loadVoice() { try { voice = window.speechSynthesis.getVoices().find(v => /en[-_]/i.test(v.lang)) || null; } catch (e) {} }
loadVoice();
if (window.speechSynthesis) window.speechSynthesis.onvoiceschanged = loadVoice;
// btn（可选）：触发播放的按钮，播放期间图标 volume→pause，结束自动复位。
export function speak(text, rate = 0.95, btn = null) {
  try {
    if (!window.speechSynthesis) { toast('当前浏览器不支持语音播放'); return; }
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-US'; u.rate = rate; if (voice) u.voice = voice;
    const done = playMorph(btn);
    if (done) {
      let settled = false;
      let timer = null;
      const finish = () => { if (settled) return; settled = true; if (timer) clearTimeout(timer); done(); };
      u.onend = finish; u.onerror = finish;
      // 无声卡 / 无语音包时 onend 可能不触发，超时兜底避免图标卡在 pause
      timer = setTimeout(finish, Math.min(8000, 900 + text.length * 90));
    }
    window.speechSynthesis.speak(u);
  } catch (e) {}
}

const SUBNAV = [
  { k: '', label: '总览' }, { k: 'vocab', label: '词汇 Vocabulary' }, { k: 'grammar', label: '语法 Grammar' },
  { k: 'listening', label: '听力 Listening' }, { k: 'reading', label: '阅读 Reading' },
  { k: 'writing', label: '写作 Writing' }, { k: 'speaking', label: '口语 Speaking' },
];

let curView = 'overview';
let learnSpeakBound = false;
export function render(segs) {
  const sub = segs[0] || '';
  curView = ['vocab', 'grammar', 'listening', 'reading', 'writing', 'speaking'].includes(sub) ? sub : 'overview';
  const nav = `<nav class="subnav">${SUBNAV.map(s => `<a class="${s.k === sub ? 'active' : ''}" href="#/learn/${s.k}">${s.label}</a>`).join('')}</nav>`;
  let body = '';
  if (curView === 'overview') body = viewOverview();
  else if (curView === 'vocab') body = viewVocab(segs);
  else if (curView === 'grammar') body = viewGrammar(segs);
  else if (curView === 'listening') body = viewListening(segs);
  else if (curView === 'reading') body = viewReading(segs);
  else if (curView === 'writing') body = viewWriting(segs);
  else if (curView === 'speaking') body = viewSpeaking(segs);
  return `<div class="page"><div class="crumb"><a href="#/home">首页</a><span class="sep">/</span><span>学习</span></div>
    <div class="section-head"><div><h2>学习中心</h2><div class="sub">真正提升英语能力的训练场</div></div></div>
    <div class="row gap-3 mb-5" style="flex-wrap:wrap">
      <a class="btn btn-soft" href="#/ielts">${icon('globe', { size: 16 })}<span>IELTS 考试模式</span></a>
      <a class="btn btn-soft" href="#/toefl">${icon('flag', { size: 16 })}<span>TOEFL 考试模式</span></a>
      <span class="muted text-sm">按考试赛道进入听说读写专项</span>
    </div>
    ${nav}${body}</div>`;
}

// ---------------- Overview ----------------
function viewOverview() {
  const cards = [
    { k: 'vocab', ic: 'book', t: '词汇 Vocabulary', d: '从基础到 IELTS / TOEFL 核心词，含音标、例句、搭配、AI 例句。', c: 'var(--c-vocab)' },
    { k: 'grammar', ic: 'pen', t: '语法 Grammar', d: '从 0 基础字母到写作复杂句，互动练习 + AI 讲解。', c: 'var(--c-grammar)' },
    { k: 'listening', ic: 'headphones', t: '听力 Listening', d: '基础 / IELTS / TOEFL 听力，精听、听写、跟读。', c: 'var(--c-listen)' },
    { k: 'reading', ic: 'doc', t: '阅读 Reading', d: '基础 / IELTS / TOEFL 阅读，长难句、主旨、推断。', c: 'var(--c-read)' },
    { k: 'writing', ic: 'edit', t: '写作 Writing', d: 'IELTS / TOEFL 写作，计时器 + AI 批改 + 分数预测。', c: 'var(--c-write)' },
    { k: 'speaking', ic: 'mic', t: '口语 Speaking', d: 'IELTS / TOEFL 口语，麦克风实战 + AI 分析。', c: 'var(--c-speak)' },
  ];
  return `<div class="grid grid-3">${cards.map(c => `<a class="card card-click" href="#/learn/${c.k}">
    <div class="row gap-3" style="color:${c.c}">${icon(c.ic, { size: 26 })}</div>
    <div class="card-title mt-3">${c.t}</div>
    <div class="card-sub">${c.d}</div>
    <div class="row gap-2 mt-4" style="color:${c.c}">进入 ${icon('arrowR', { size: 15 })}</div>
  </a>`).join('')}</div>${guideBand()}`;
}

// ---------------- Vocabulary ----------------
const VOCAB_TABS = [['library', '词库'], ['deck', '每日单词'], ['test', '单词测试'], ['listen', '听音识词'], ['spell', '拼写练习'], ['review', '智能复习'], ['wrong', '错词本']];
let vstate = { tab: 'deck', idx: 0, deck: [], wrong: [] };
let allWords = null;                 // cached API vocabulary (null until loaded)
let poolPrimed = false;              // 随机池是否已完成首次就绪（用于首屏重绘一次）
const DAILY = 10;                    // words shown per daily deck
const vpool = () => allWords || VOCAB;  // live API words if available, else local fallback

function viewVocab(segs) {
  const tab = segs[1] && VOCAB_TABS.find(t => t[0] === segs[1]) ? segs[1] : 'library';
  vstate.tab = tab;
  if (tab === 'deck' && !vstate.deck.length) vstate.deck = vpool().slice(0, DAILY).map(v => v.id);
  if (tab === 'review') vstate.deck = vpool().filter(v => ['new', 'learning'].includes(store.vocabStatus(v.id))).map(v => v.id);
  if (tab === 'wrong') vstate.wrong = [...new Set(store.state.errors.filter(e => e.type === 'vocab').map(e => e.word))];
  const tabs = `<div class="tabs mb-5">${VOCAB_TABS.map(t => `<button class="tab ${t[0] === tab ? 'active' : ''}" onclick="location.hash='#/learn/vocab/${t[0]}'">${t[1]}</button>`).join('')}</div>`;
  return tabs + `<div id="vocab-body">${vocabInner()}</div>` + guideBlock('vocabulary', 'vocab');
}
function vocabInner() {
  const tab = vstate.tab;
  if (tab === 'library') return vocabLibrary();
  if (tab === 'deck' || tab === 'review') return vocabDeck();
  if (tab === 'test') return vocabTest();
  if (tab === 'listen') return vocabListen();
  if (tab === 'spell') return vocabSpell();
  if (tab === 'wrong') return vocabWrong();
  return '';
}

/** 只渲染有内容的字段行，避免数据缺失时露出 "null" 或空标签 */
function fieldRow(label, value, cls) {
  const t = (value == null ? '' : String(value)).trim();
  if (!t || t === 'null' || t === 'undefined') return '';
  return `<div class="text-sm mt-2"><b>${label}</b> <span class="${cls || 'muted'}">${t}</span></div>`;
}

function vocabCardHTML(v, showBack) {
  const lvl = v.level === 'basic' ? '基础' : String(v.level || 'basic').toUpperCase();
  const back = [
    fieldRow('例句', v.example, 'serif'),
    fieldRow('', v.exampleCn),
    fieldRow('搭配', v.collocation),
    fieldRow('同义', v.synonym),
    fieldRow('场景', v.scenario),
  ].filter(Boolean).join('');
  return `<div class="flashcard ${showBack ? 'flipped' : ''}" data-id="${v.id}">
    <div class="flashcard-inner">
      <div class="flashcard-face">
        <div class="row gap-2" style="color:var(--text-faint)"><span class="badge badge-brand">${lvl}</span>${v.pos ? `<span class="muted text-sm">${v.pos}</span>` : ''}</div>
        <div style="font-size:42px;font-weight:780;letter-spacing:-0.02em">${v.word}</div>
        <div class="muted">${v.ipa || ''}</div>
        <button class="btn btn-soft btn-sm" data-act="speak">${icon('volume', { size: 16 })}<span>发音</span></button>
        <div class="hint">点击卡片查看释义</div>
      </div>
      <div class="flashcard-face flashcard-back" style="text-align:left;align-items:stretch;justify-content:flex-start;padding:28px">
        <div class="row between"><b style="font-size:26px">${v.word}</b><button class="icon-btn" data-act="speak">${icon('volume')}</button></div>
        <div class="strong" style="font-size:18px;color:var(--brand)">${v.cn || ''}</div>
        ${v.en ? `<div class="muted text-sm">${v.en}</div>` : ''}
        ${back ? '<div class="list-divider"></div>' + back : ''}
      </div>
    </div>
  </div>`;
}

function vocabDeck() {
  const ids = vstate.deck;
  if (!ids.length) return emptyBox('没有待学单词', '去「错词本」或完成测试后会出现新词。');
  const v = vpool().find(x => x.id === ids[vstate.idx]) || VOCAB.find(x => x.id === ids[vstate.idx]);
  if (!v) return emptyBox('完成啦', '本组单词已全部过完。');
  const total = ids.length, done = vstate.idx;
  return `<div class="row between mb-3"><span class="muted text-sm">进度 ${done + 1} / ${total}</span><span class="badge">${store.vocabStatus(v.id) === 'known' ? '已掌握' : store.vocabStatus(v.id) === 'learning' ? '学习中' : '未学习'}</span></div>
    <div class="progress mb-5"><span style="width:${((done) / total) * 100}%"></span></div>
    <div style="max-width:460px;margin:0 auto">${vocabCardHTML(v)}
      <div class="row gap-3 mt-5">
        <button class="btn btn-danger full" data-mark="learning">${icon('refresh', { size: 16 })}<span>还需复习</span></button>
        <button class="btn btn-primary full" data-mark="known">${icon('check', { size: 16 })}<span>我记住了</span></button>
      </div>
      <div class="row gap-2 mt-3"><button class="btn btn-ghost btn-sm full" data-prev>上一词</button><button class="btn btn-ghost btn-sm full" data-next>下一词</button></div>
    </div>`;
}

function vocabTest() {
  const src = vpool().slice();
  const pick = src.sort(() => Math.random() - 0.5).slice(0, 5);
  const q = pick.map(v => {
    const others = src.filter(x => x.id !== v.id).sort(() => Math.random() - 0.5).slice(0, 3).map(x => x.cn);
    const opts = [...others, v.cn].sort(() => Math.random() - 0.5);
    return { v, opts, ans: opts.indexOf(v.cn) };
  });
  return `<div class="card" style="max-width:560px;margin:0 auto"><div class="card-title mb-4">单词测试 · 选出正确中文释义</div>
    <div id="vtest">${q.map((it, i) => `<div class="mb-5"><div class="row gap-2 mb-2"><b style="font-size:20px">${it.v.word}</b><button class="icon-btn" data-sp="${it.v.word}">${icon('volume')}</button><span class="muted text-sm">${it.v.ipa}</span></div>
      <div class="grid grid-2">${it.opts.map((o, j) => `<button class="btn" data-vq="${i}" data-o="${j}" data-ans="${it.ans}">${o}</button>`).join('')}</div></div>`).join('')}
    <button class="btn btn-primary btn-block" data-vtest-submit>提交并查看结果</button></div>
    <div id="vtest-result"></div></div>`;
}

function vocabListen() {
  const src = vpool().slice().sort(() => Math.random() - 0.5).slice(0, 5);
  const q = src.map(v => {
    const others = src.filter(x => x.id !== v.id).sort(() => Math.random() - 0.5).slice(0, 3).map(x => x.cn);
    const opts = [...others, v.cn].sort(() => Math.random() - 0.5);
    return { v, opts, ans: opts.indexOf(v.cn) };
  });
  return `<div class="card" style="max-width:560px;margin:0 auto"><div class="card-title mb-2">听音识词</div><div class="hint mb-4">点击播放，选出你听到的单词释义。</div>
    <div id="vlisten">${q.map((it, i) => `<div class="mb-5"><div class="row gap-2 mb-2"><button class="btn btn-soft" data-play="${it.v.word}">${icon('volume', { size: 16 })}<span>播放</span></button><span class="muted text-sm">第 ${i + 1} 题</span></div>
      <div class="grid grid-2">${it.opts.map((o, j) => `<button class="btn" data-lq="${i}" data-o="${j}" data-ans="${it.ans}">${o}</button>`).join('')}</div></div>`).join('')}
    <button class="btn btn-primary btn-block" data-vlisten-submit>提交</button></div><div id="vlisten-result"></div></div>`;
}

function vocabSpell() {
  const src = vpool().slice().sort(() => Math.random() - 0.5).slice(0, 5);
  return `<div class="card" style="max-width:560px;margin:0 auto"><div class="card-title mb-2">拼写练习</div><div class="hint mb-4">听发音，拼写出单词。</div>
    <div id="vspell">${src.map((v, i) => `<div class="mb-4"><div class="row gap-2 mb-2"><button class="btn btn-soft" data-play="${v.word}">${icon('volume', { size: 16 })}<span>播放</span></button><span class="muted text-sm">${v.cn} · ${v.pos}</span></div>
      <input class="input" data-spell="${i}" data-word="${v.word}" placeholder="输入拼写…" autocomplete="off"></div>`).join('')}
    <button class="btn btn-primary btn-block" data-vspell-submit>检查拼写</button></div><div id="vspell-result"></div></div>`;
}

function vocabWrong() {
  if (!vstate.wrong.length) return emptyBox('错词本为空', '在测试或听音中答错的词会进入这里。');
  const items = vstate.wrong.map(id => vpool().find(v => v.word === id) || VOCAB.find(v => v.word === id) || vpool().find(v => v.id === id)).filter(Boolean);
  return `<div class="grid grid-2">${items.map(v => `<div class="card card-pad-sm">${vocabCardHTML(v)}</div>`).join('')}</div>`;
}

// ---------------- Vocabulary Library (live API + 服务端分页) ----------------
const LIB_SIZE = 48;
let libFilter = 'all', libQ = '', libPage = 1;
let libState = { items: [], total: 0, remote: false };

function vocabLibrary() {
  return `<div id="vocab-library"><div class="muted">正在从词库加载真实单词…</div></div>`;
}
/**
 * 练习词池：供 每日单词 / 测试 / 听音 / 拼写 抽题用（与浏览分页解耦）。
 * 关键改造：走 /vocabulary/random 而非固定排序的 /vocabulary。后者是
 * level asc + word asc 固定序，前端固定拉第一页就永远只练到排序最靠前的那批词，
 * 全库 3 万词里绝大部分永远练不到。random 按用户等级分层抽 400 个随机词，
 * 真正覆盖全表。后端不可用时 allWords 保持 null，vpool() 回落本地 VOCAB。
 */
const LEVEL_MAP = { beginner: 'basic', elementary: 'basic', intermediate: 'ielts', upper: 'ielts', advanced: 'toefl' };
async function loadAllWords() {
  if (allWords) return allWords;
  try {
    const lvl = LEVEL_MAP[store.state.user.level] || 'basic';
    const body = await api(`/vocabulary/random?level=${lvl}&n=400`);
    const items = (body && body.data && Array.isArray(body.data.items)) ? body.data.items : [];
    allWords = items.length ? items : null;
  } catch (e) {
    allWords = null;
  }
  return allWords;
}
async function loadLibrary() {
  const wrap = vocabRoot && vocabRoot.querySelector('#vocab-library');
  if (!wrap) return;
  if (!allWords) { try { await loadAllWords(); } catch (e) { /* 后端未连，练习走本地兜底 */ } }
  await loadLibraryPage();
}
async function loadLibraryPage() {
  const wrap = vocabRoot && vocabRoot.querySelector('#vocab-library');
  if (!wrap) return;
  const p = new URLSearchParams({ page: String(libPage), pageSize: String(LIB_SIZE) });
  if (libFilter !== 'all') p.set('level', libFilter);
  if (libQ.trim()) p.set('search', libQ.trim());
  try {
    const body = await api('/vocabulary?' + p.toString());
    const d = (body && body.data) || {};
    libState = { items: Array.isArray(d.items) ? d.items : [], total: Number(d.total) || 0, remote: true };
  } catch (e) {
    libState = { items: [], total: 0, remote: false };
  }
  renderLibraryGrid();
}
function renderLibraryGrid() {
  const wrap = vocabRoot && vocabRoot.querySelector('#vocab-library');
  if (!wrap) return;

  // 后端不可用时，退回本地词库浏览
  if (!libState.remote) {
    const src = vpool();
    const list = src.filter(w => (libFilter === 'all' || (w.level || 'basic') === libFilter) &&
      (!libQ || (w.word || '').toLowerCase().includes(libQ.toLowerCase()) || (w.cn || '').includes(libQ)));
    setVocabPool(list);
    wrap.innerHTML = `
      <div class="row gap-2 mb-4" style="flex-wrap:wrap">
        <input class="input" data-ls placeholder="搜索单词或中文释义…" value="${libQ.replace(/"/g, '&quot;')}" style="max-width:280px" autocomplete="off">
        ${['all', 'basic', 'ielts', 'toefl'].map(f => `<button class="btn btn-sm ${libFilter === f ? 'btn-primary' : 'btn-ghost'}" data-lf="${f}">${f === 'all' ? '全部' : f.toUpperCase()}</button>`).join('')}
      </div>
      <div class="hint mb-3">未连接到后端，当前显示本地示例词库（${list.length} 个）。</div>
      <div class="grid grid-3">${list.length ? list.map(libCard).join('') : '<div class="muted">没有匹配的单词。</div>'}</div>`;
    bindLibrary(wrap);
    return;
  }

  const pages = Math.max(1, Math.ceil(libState.total / LIB_SIZE));
  const from = (libPage - 1) * LIB_SIZE + 1;
  const to = Math.min(libPage * LIB_SIZE, libState.total);
  const pager = pages <= 1 ? '' : `
    <div class="row gap-3 mt-5" style="justify-content:center;align-items:center;flex-wrap:wrap">
      <button class="btn btn-ghost" data-lp="first" ${libPage <= 1 ? 'disabled' : ''}><span>首页</span></button>
      <button class="btn btn-ghost" data-lp="prev" ${libPage <= 1 ? 'disabled' : ''}>${icon('arrowL', { size: 15 })}<span>上一页</span></button>
      <span class="muted text-sm">${from}–${to} / 共 ${libState.total} 词</span>
      <span class="row gap-2" style="align-items:center">
        <span class="muted text-sm">第</span>
        <input class="input" id="lib-jump" type="number" min="1" max="${pages}" value="${libPage}"
          style="width:84px;text-align:center;padding:6px 8px" aria-label="跳转到页码">
        <span class="muted text-sm">/ ${pages} 页</span>
        <button class="btn btn-ghost" data-lp="go">跳转</button>
      </span>
      <button class="btn btn-ghost" data-lp="next" ${libPage >= pages ? 'disabled' : ''}><span>下一页</span>${icon('chevron', { size: 15 })}</button>
      <button class="btn btn-ghost" data-lp="last" ${libPage >= pages ? 'disabled' : ''}><span>末页</span></button>
    </div>`;

  setVocabPool(libState.items);
  wrap.innerHTML = `
    <div class="row gap-2 mb-4" style="flex-wrap:wrap">
      <input class="input" data-ls placeholder="搜索单词或中文释义…" value="${libQ.replace(/"/g, '&quot;')}" style="max-width:280px" autocomplete="off">
      ${['all', 'basic', 'ielts', 'toefl'].map(f => `<button class="btn btn-sm ${libFilter === f ? 'btn-primary' : 'btn-ghost'}" data-lf="${f}">${f === 'all' ? '全部' : f.toUpperCase()}</button>`).join('')}
    </div>
    <div class="hint mb-3">共 ${libState.total} 个真实单词 · 支持按考试分级检索与发音试听。</div>
    <div class="grid grid-3">${libState.items.length ? libState.items.map(libCard).join('') : '<div class="muted">没有匹配的单词。</div>'}</div>
    ${pager}`;
  bindLibrary(wrap);
}
function libCard(w) {
  const lvl = (w.level || 'basic') === 'basic' ? '基础' : (w.level || 'basic').toUpperCase();
  return `<div class="card card-pad-sm vocab-lib-card" data-vpop="${w.id}">
    <div class="row between"><span class="badge badge-brand">${lvl}</span><div class="row gap-1"><button class="icon-btn" data-vpop="${w.id}" title="查看详情与由此及彼">${icon('info', { size: 16 })}</button><button class="icon-btn" data-lspeak="${w.word}">${icon('volume')}</button></div></div>
    <div class="row gap-2 mt-2" style="align-items:baseline"><button class="vocab-pop-trigger" data-vpop="${w.id}" title="查看详情与由此及彼">${w.word}</button><span class="muted text-sm">${w.ipa || ''}</span></div>
    <div class="strong mt-1" style="color:var(--brand)">${w.cn || ''}</div>
    <div class="muted text-xs clamp-2" style="margin-top:4px">${w.en || ''}</div>
    <div class="row gap-2 mt-3"><button class="btn btn-soft btn-sm" data-ladd="${w.id}">${icon('plus', { size: 14 })}<span>加入学习</span></button></div>
  </div>`;
}
let libTimer = null;
function bindLibrary(wrap) {
  const s = wrap.querySelector('[data-ls]');
  if (s) s.oninput = (e) => {
    libQ = e.target.value;
    libPage = 1;
    clearTimeout(libTimer);
    // 输入防抖；后端不可用时直接本地过滤
    libTimer = setTimeout(() => (libState.remote ? loadLibraryPage() : renderLibraryGrid()), 300);
  };
  wrap.querySelectorAll('[data-lf]').forEach(b => b.onclick = () => {
    libFilter = b.dataset.lf;
    libPage = 1;
    if (libState.remote) loadLibraryPage(); else renderLibraryGrid();
  });
  wrap.querySelectorAll('[data-lp]').forEach(b => b.onclick = () => {
    const pages = Math.max(1, Math.ceil(libState.total / LIB_SIZE));
    const act = b.dataset.lp;
    if (act === 'next') libPage = Math.min(libPage + 1, pages);
    else if (act === 'prev') libPage = Math.max(libPage - 1, 1);
    else if (act === 'first') libPage = 1;
    else if (act === 'last') libPage = pages;
    else if (act === 'go') {
      const inp = wrap.querySelector('#lib-jump');
      const n = parseInt(inp && inp.value, 10);
      if (!n || n === libPage) return;
      libPage = Math.min(Math.max(1, n), pages);
    }
    loadLibraryPage();
  });
  // 页码输入框：回车跳转 + 越界自动夹取
  const libJump = wrap.querySelector('#lib-jump');
  if (libJump) {
    const pages = Math.max(1, Math.ceil(libState.total / LIB_SIZE));
    libJump.onkeydown = (e) => {
      if (e.key !== 'Enter') return;
      const n = parseInt(libJump.value, 10);
      if (n && n !== libPage) { libPage = Math.min(Math.max(1, n), pages); loadLibraryPage(); }
    };
    libJump.oninput = () => {
      const n = parseInt(libJump.value, 10);
      if (n > pages) libJump.value = pages;
      if (n < 1 && libJump.value !== '') libJump.value = 1;
    };
  }
  wrap.querySelectorAll('[data-lspeak]').forEach(b => b.onclick = () => speak(b.dataset.lspeak));
  wrap.querySelectorAll('[data-ladd]').forEach(b => b.onclick = () => {
    const id = b.dataset.ladd;
    if (!vstate.deck.includes(id)) { vstate.deck.push(id); toast('已加入学习卡片'); }
    else toast('已在学习中');
  });
}

// ---------------- Grammar ----------------
function viewGrammar(segs) {
  const id = segs[1];
  if (id) { const g = GRAMMAR.find(x => x.id === id); if (g) return grammarLesson(g); }
  return `<div class="grid grid-2">${GRAMMAR.map(g => `<a class="card card-click" href="#/learn/grammar/${g.id}">
    <div class="row gap-2"><span class="badge" style="color:var(--c-grammar)">${g.level}</span></div>
    <div class="card-title mt-3">${g.title}</div>
    <div class="card-sub clamp-2">${g.summary}</div>
    <div class="row gap-2 mt-4" style="color:var(--c-grammar)">学习 ${icon('arrowR', { size: 15 })}</div>
  </a>`).join('')}</div>` + guideBlock('cognition', 'grammar');
}
function grammarLesson(g) {
  const ex = g.exercise;
  return `<a class="btn btn-ghost btn-sm mb-4" href="#/learn/grammar">${icon('arrowL', { size: 15 })}<span>返回语法列表</span></a>
  <div class="grid grid-2">
    <div class="card">
      <div class="row gap-2 mb-3"><span class="badge" style="color:var(--c-grammar)">${g.level}</span><span class="card-title">${g.title}</span></div>
      <p>${g.explain}</p>
      <div class="ai-panel mt-4"><div class="row gap-2" style="color:var(--brand)">${icon('bulb', { size: 18 })}<b>示例</b></div>
        <ul class="stack gap-2 mt-2">${g.examples.map(e => `<li class="serif" style="font-size:16px">${e}</li>`).join('')}</ul></div>
      <button class="btn btn-soft mt-4" id="g-ai">${icon('sparkles', { size: 16 })}<span>让 AI 再讲一遍</span></button>
    </div>
    <div class="card">
      <div class="card-title mb-3">互动练习</div>
      <div class="strong mb-3">${ex.q}</div>
      <div id="g-ex">
        ${ex.type === 'mc' ? ex.options.map((o, i) => `<button class="btn full" style="justify-content:flex-start;margin-bottom:10px" data-gopt="${i}" data-ans="${ex.answer}">${String.fromCharCode(65 + i)}. ${o}</button>`).join('') : `<input class="input" id="g-fill" placeholder="输入答案…" autocomplete="off"><div class="hint mt-2">提示：${ex.hint || ''}</div>`}
      </div>
      <div id="g-fb" class="mt-4"></div>
    </div>
  </div>`;
}

// ---------------- Listening ----------------
function viewListening(segs) {
  const id = segs[1];
  if (id) { const it = LISTENING.find(x => x.id === id); if (it) return listeningPlayer(it); }
  return `<div class="tabs mb-5"><button class="tab active">听力练习</button><button class="tab" data-lt="dictate">精听 / 听写</button><button class="tab" data-lt="shadow">跟读</button></div>
  <div id="listen-body"><div class="grid grid-2">${LISTENING.map((it, i) => `<a class="card card-click" href="#/learn/listening/${it.id}">
    <div class="row gap-2"><span class="badge" style="color:var(--c-listen)">${it.exam}</span><span class="badge">${it.level}</span></div>
    <div class="card-title mt-3">${it.title}</div>
    <div class="row gap-2 mt-3 muted text-sm">${icon('clock', { size: 14 })} ${it.duration} · ${it.questions.length} 题</div>
  </a>`).join('')}</div></div>` + guideBlock('listening', 'listening');
}
function listeningPlayer(it) {
  return `<a class="btn btn-ghost btn-sm mb-4" href="#/learn/listening">${icon('arrowL', { size: 15 })}<span>返回听力列表</span></a>
  <div class="grid grid-2">
    <div class="card">
      <div class="row gap-2 mb-3"><span class="badge" style="color:var(--c-listen)">${it.exam}</span><span class="card-title">${it.title}</span></div>
      <button class="btn btn-primary" id="l-play">${icon('play', { size: 16 })}<span>播放录音</span></button>
      <button class="btn btn-ghost btn-sm mt-2" id="l-play-slow">${icon('volume', { size: 14 })}<span>慢速播放</span></button>
      <div class="ai-panel mt-4"><div class="row gap-2" style="color:var(--c-listen)">${icon('headphones', { size: 18 })}<b>录音文本</b></div>
        <p class="serif" style="margin-top:8px;line-height:1.7">${it.transcript}</p></div>
    </div>
    <div class="card">
      <div class="card-title mb-3">答题</div>
      <div id="l-quiz">${it.questions.map((q, i) => `<div class="mb-5"><div class="strong mb-2">${i + 1}. ${q.q}</div>
        <div class="stack gap-2">${q.options.map((o, j) => `<button class="btn" style="justify-content:flex-start" data-lq="${i}" data-o="${j}" data-ans="${q.answer}">${String.fromCharCode(65 + j)}. ${o}</button>`).join('')}</div></div>`).join('')}
      <button class="btn btn-primary btn-block" id="l-submit">提交答案</button></div>
      <div id="l-result" class="mt-4"></div>
    </div>
  </div>`;
}

// ---------------- Reading ----------------
function viewReading(segs) {
  const id = segs[1];
  if (id) { const it = READING.find(x => x.id === id); if (it) return readingView(it); }
  return `<div class="grid grid-2">${READING.map(it => `<a class="card card-click" href="#/learn/reading/${it.id}">
    <div class="row gap-2"><span class="badge" style="color:var(--c-read)">${it.exam}</span><span class="badge">${it.level}</span></div>
    <div class="card-title mt-3">${it.title}</div>
    <div class="row gap-2 mt-3 muted text-sm">${icon('doc', { size: 14 })} ${it.questions.length} 题</div>
  </a>`).join('')}</div>` + guideBlock('reading', 'reading');
}
function readingView(it) {
  return `<a class="btn btn-ghost btn-sm mb-4" href="#/learn/reading">${icon('arrowL', { size: 15 })}<span>返回阅读列表</span></a>
  <div class="grid grid-2">
    <div class="card"><div class="card-title mb-3">${it.title}</div><p class="serif" style="line-height:1.8;white-space:pre-line">${it.text}</p></div>
    <div class="card"><div class="card-title mb-3">答题</div>
      <div id="r-quiz">${it.questions.map((q, i) => `<div class="mb-5"><div class="strong mb-2">${i + 1}. ${q.q}</div>
        <div class="stack gap-2">${q.options.map((o, j) => `<button class="btn" style="justify-content:flex-start" data-rq="${i}" data-o="${j}" data-ans="${q.answer}" data-type="${q.type || 'mc'}">${o}</button>`).join('')}</div></div>`).join('')}
      <button class="btn btn-primary btn-block" id="r-submit">提交答案</button></div>
      <div id="r-result" class="mt-4"></div>
    </div>
  </div>`;
}

// ---------------- Writing ----------------
function viewWriting(segs) {
  const id = segs[1];
  if (id) { const p = WRITING.find(x => x.id === id); if (p) return writingView(p); }
  return `<div class="grid grid-2">${WRITING.map(p => `<a class="card card-click" href="#/learn/writing/${p.id}">
    <div class="row gap-2"><span class="badge" style="color:var(--c-write)">${p.exam}</span><span class="badge">${p.task}</span></div>
    <div class="card-title mt-3">${p.title}</div>
    <div class="row gap-2 mt-3 muted text-sm">${icon('clock', { size: 14 })} 建议 ${p.time} 分钟</div>
  </a>`).join('')}</div>
    <div class="mt-7">${registerLauncherHTML('writing')}</div>` + guideBlock('writing', 'writing');
}
function writingView(p) {
  const chartBlock = p.chart ? chartPreview(p.chart) : '';
  const struct = p.structure ? `<div class="ai-panel mt-4"><b>${icon('layers', { size: 16 })} 推荐结构</b><ol class="stack gap-1 mt-2" style="padding-left:18px;list-style:decimal">${p.structure.map(s => `<li class="text-sm">${s}</li>`).join('')}</ol></div>` : '';
  return `<a class="btn btn-ghost btn-sm mb-4" href="#/learn/writing">${icon('arrowL', { size: 15 })}<span>返回写作列表</span></a>
  <div class="grid grid-2">
    <div class="card">
      <div class="row gap-2 mb-2"><span class="badge" style="color:var(--c-write)">${p.exam} ${p.task}</span></div>
      <div class="card-title">${p.title}</div>
      <p class="muted mt-2">${p.prompt}</p>
      ${chartBlock}${struct}
    </div>
    <div class="card">
      <div class="row between mb-3"><div class="card-title">开始写作</div><span class="badge" id="w-timer">${p.time}:00</span></div>
      <textarea class="textarea" id="w-text" placeholder="在这里写作，完成后点「AI 批改」获取详细反馈…"></textarea>
      <div class="row gap-2 mt-3"><button class="btn btn-primary full" id="w-grade">${icon('sparkles', { size: 16 })}<span>AI 批改</span></button><button class="btn" id="w-clear">清空</button></div>
      <div id="w-result"></div>
    </div>
  </div>`;
}
function chartPreview(chart) {
  if (chart.type === 'line') {
    const colors = ['var(--brand)', 'var(--c-read)', 'var(--c-listen)'];
    const max = Math.max(...chart.series.flatMap(s => s.data));
    const w = 460, h = 180, pad = 30;
    const lines = chart.series.map((s, si) => {
      const step = (w - pad * 2) / (s.data.length - 1);
      const pts = s.data.map((d, i) => [pad + i * step, h - pad - (d / max) * (h - pad * 2)]);
      const path = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(0) + ' ' + p[1].toFixed(0)).join(' ');
      return `<polyline points="${pts.map(p => p.join(',')).join(' ')}" fill="none" stroke="${colors[si]}" stroke-width="2.5"/>`;
    }).join('');
    return `<div class="ai-panel mt-3"><b>图表数据</b>
      <svg viewBox="0 0 ${w} ${h}" width="100%" style="margin-top:8px">${lines}
      ${chart.labels.map((l, i) => `<text x="${pad + i * ((w - pad * 2) / (chart.labels.length - 1))}" y="${h - 8}" text-anchor="middle" font-size="10" fill="var(--text-muted)">${l}</text>`).join('')}</svg>
      <div class="row gap-3 mt-2">${chart.series.map((s, i) => `<span class="text-xs" style="color:${colors[i]}">● ${s.name}</span>`).join('')}</div></div>`;
  }
  return '';
}

// ---------------- Speaking ----------------
function viewSpeaking() {
  const i = SPEAKING.ielts, t = SPEAKING.toefl;
  return `<div class="tabs mb-5">
      <button class="tab active" data-st="ielts">IELTS Speaking</button>
      <button class="tab" data-st="toefl">TOEFL Speaking</button>
    </div>
    <div id="speak-body">
      <div class="grid grid-2">
        <div class="card">
          <div class="card-title mb-3">IELTS Speaking（Part 1–3）</div>
          <div class="subnav" style="margin:0">
            <button class="chip active" data-ip="1">Part 1</button><button class="chip" data-ip="2">Part 2</button><button class="chip" data-ip="3">Part 3</button>
          </div>
          <div id="speak-q" class="mt-3">${i.part1.map(q => `<div class="list-item"><span class="dot dot-success"></span><span>${q}</span></div>`).join('')}</div>
          <button class="btn btn-primary full mt-4" id="speak-record">${icon('mic', { size: 16 })}<span>开始回答（麦克风）</span></button>
          <div id="speak-out" class="mt-4"></div>
        </div>
        <div class="card">
          <div class="card-title mb-3">TOEFL Speaking 任务</div>
          ${t.tasks.map(tk => `<div class="ai-panel mb-3"><div class="row gap-2"><span class="badge" style="color:var(--c-toefl)">Task ${tk.n}</span><b>${tk.type}</b></div>
            <p class="mt-2 text-sm">${tk.cue}</p><div class="hint mt-2">准备 ${tk.prep}s · 作答 ${tk.speak}s</div></div>`).join('')}
          <button class="btn btn-primary full" id="speak-record-toefl">${icon('mic', { size: 16 })}<span>开始 TOEFL 回答</span></button>
          <div id="speak-out-toefl" class="mt-4"></div>
        </div>
      </div>
    </div>
    <div class="mt-7">${registerLauncherHTML('speaking')}</div>` + guideBlock('speaking', 'speaking');
}

function emptyBox(title, sub) { return `<div class="card empty" style="padding:48px"><div class="ic">${icon('inbox', { size: 26 })}</div><div class="strong">${title}</div><div class="muted mt-2">${sub}</div></div>`; }

// ============================ INIT ============================
window.addEventListener('page:rendered', (e) => {
  if (e.detail.seg !== 'learn') return;
  const root = document.getElementById('app');
  // generic speak buttons (delegated) — attach once to the persistent #app node
  if (!learnSpeakBound) {
    root.addEventListener('click', (ev) => {
      const sp = ev.target.closest('[data-sp]'); if (sp) { speak(sp.getAttribute('data-sp'), 0.95, sp); return; }
      const play = ev.target.closest('[data-play]'); if (play) { speak(play.getAttribute('data-play'), 0.95, play); return; }
    });
    learnSpeakBound = true;
  }

  if (curView === 'vocab') initVocab(root);
  else if (curView === 'grammar') initGrammar(root);
  else if (curView === 'listening') initListening(root);
  else if (curView === 'reading') initReading(root);
  else   if (curView === 'writing') { initWriting(root); initRegister(); }
  else if (curView === 'speaking') { initSpeaking(root); initRegister(); }
});

// Vocab interactions
let vocabRoot = null;
function initVocab(root) {
  vocabRoot = root;
  initVocabPop(root);                      // 单词详情悬浮卡 + 由此及彼
  bindVocabBody(root);
  // 异步预热练习词池。首屏 render 时 allWords 还没就绪，练习标签页会先用本地兜底词
  // 渲染；这里在随机池首次就绪后，用随机池重建 deck / review 并对练习标签页重绘一次，
  // 让练习真正覆盖全库 3 万词。后端不可用时 allWords 保持 null，poolPrimed 不置位，
  // 各练习页继续走本地 VOCAB 兜底。poolPrimed 只置位一次，避免后续每次导航都重绘。
  loadAllWords().then(() => {
    if (!poolPrimed && allWords) {
      poolPrimed = true;
      if (vstate.tab === 'deck') { vstate.deck = allWords.slice(0, DAILY).map(v => v.id); vstate.idx = 0; }
      if (vstate.tab === 'review') {
        const r = allWords.filter(v => ['new', 'learning'].includes(store.vocabStatus(v.id))).map(v => v.id);
        if (r.length) { vstate.deck = r; vstate.idx = 0; }
      }
      if (['deck', 'review', 'test', 'listen', 'spell'].includes(vstate.tab)) paint();
    }
    if (vstate.tab === 'library') loadLibrary();
  }).catch(() => {
    if (vstate.tab === 'library') loadLibrary();
  });
}
function paint() { if (vocabRoot) { const b = vocabRoot.querySelector('#vocab-body'); if (b) { b.innerHTML = vocabInner(); bindVocabBody(vocabRoot); animateIn(b); } } }
function bindVocabBody(root) {
  const body = root.querySelector('#vocab-body'); if (!body) return;
  const card = body.querySelector('.flashcard');
  if (card) {
    card.onclick = (ev) => { const sp = ev.target.closest('[data-act="speak"]'); if (sp) { const v = vpool().find(x => x.id === card.dataset.id) || VOCAB.find(x => x.id === card.dataset.id); if (v) speak(v.word, 0.95, sp); return; } card.classList.toggle('flipped'); };
  }
  body.querySelectorAll('[data-mark]').forEach(b => b.onclick = () => {
    const id = card?.dataset.id; if (!id) return;
    store.setVocab(id, b.dataset.mark, b.dataset.mark === 'known', false);
    store.recordActivity(2, 1);
    toast(b.dataset.mark === 'known' ? '已标记为掌握' : '已加入复习');
    vstate.idx++;
    if (vstate.idx >= vstate.deck.length) { if (vstate.tab === 'deck') vstate.deck = vpool().slice(0, DAILY).map(v => v.id); vstate.idx = 0; }
    paint();
  });
  body.querySelectorAll('[data-prev]').forEach(b => b.onclick = () => { vstate.idx = Math.max(0, vstate.idx - 1); paint(); });
  body.querySelectorAll('[data-next]').forEach(b => b.onclick = () => { vstate.idx = Math.min(vstate.deck.length - 1, vstate.idx + 1); paint(); });

  const vtSub = body.querySelector('[data-vtest-submit]');
  if (vtSub) vtSub.onclick = () => {
    const picks = [...body.querySelectorAll('[data-vq]')].map(b => ({ q: +b.dataset.vq, o: +b.dataset.o, ans: +b.dataset.ans }));
    if (new Set(picks.map(p => p.q)).size < 5) { toast('请完成所有题目'); return; }
    let correct = 0; const res = picks.map(p => { const ok = p.o === p.ans; if (ok) correct++; else { const w = src[p.q]; store.addError({ type: 'vocab', word: w.word, q: w.word, a: w.cn, correct: false, tag: 'Vocabulary' }); } return ok; });
    store.recordActivity(5, 5);
    body.querySelector('#vtest-result').innerHTML = `<div class="ai-panel"><b>结果：${correct} / 5</b><div class="mt-2">${res.map((ok, i) => `<div class="list-item"><span class="dot ${ok ? 'dot-success' : 'dot-danger'}"></span><span>第 ${i + 1} 题 ${ok ? '正确' : '错误'}</span></div>`).join('')}</div></div>`;
    toast(`测试完成：${correct}/5`);
  };
  const vlSub = body.querySelector('[data-vlisten-submit]');
  if (vlSub) vlSub.onclick = () => {
    const picks = [...body.querySelectorAll('[data-lq]')].map(b => ({ q: +b.dataset.lq, o: +b.dataset.o, ans: +b.dataset.ans }));
    if (new Set(picks.map(p => p.q)).size < 5) { toast('请完成所有题目'); return; }
    let correct = 0; picks.forEach(p => { const ok = p.o === p.ans; if (ok) correct++; else { const w = src[p.q]; store.addError({ type: 'vocab', word: w.word, q: w.word, a: w.cn, correct: false, tag: 'Vocabulary' }); } });
    store.recordActivity(5, 5);
    body.querySelector('#vlisten-result').innerHTML = `<div class="ai-panel"><b>听音识词：${correct} / 5</b></div>`;
  };
  const vsSub = body.querySelector('[data-vspell-submit]');
  if (vsSub) vsSub.onclick = () => {
    const ins = [...body.querySelectorAll('[data-spell]')];
    let correct = 0; ins.forEach(inp => { const ok = inp.value.trim().toLowerCase() === inp.dataset.word.toLowerCase(); if (ok) correct++; else store.addError({ type: 'vocab', word: inp.dataset.word, q: '拼写 ' + inp.dataset.word, a: inp.value, correct: false, tag: 'Vocabulary' }); });
    store.recordActivity(5, ins.length);
    body.querySelector('#vspell-result').innerHTML = `<div class="ai-panel"><b>拼写：${correct} / ${ins.length}</b></div>`;
  };
}

// Grammar
function initGrammar(root) {
  const ai = root.querySelector('#g-ai'); if (ai) ai.onclick = () => modal(`<div class="card-title">AI 讲解</div><p class="mt-3">${GRAMMAR.find(g => location.hash.includes(g.id))?.explain || ''}</p><p class="muted mt-3">记忆窍门：把这个知识点放进你自己的例句里，并连续三天复习，就会变成长期记忆。需要我出几道类似题巩固吗？</p><button class="btn btn-primary mt-4" onclick="closeModal()">明白了</button>`);
  root.querySelectorAll('[data-gopt]').forEach(b => b.onclick = () => {
    const ok = +b.dataset.o === +b.dataset.ans;
    root.querySelectorAll(`[data-gopt]`).forEach(x => x.disabled = true);
    b.style.background = ok ? 'var(--success-soft)' : 'var(--danger-soft)'; b.style.color = ok ? 'var(--success)' : 'var(--danger)';
    if (!ok) { const ans = root.querySelector(`[data-gopt="${b.dataset.ans}"]`); if (ans) { ans.style.background = 'var(--success-soft)'; ans.style.color = 'var(--success)'; } }
    const fb = root.querySelector('#g-fb');
    fb.innerHTML = ok ? `<div class="badge badge-success">${icon('check', { size: 14 })} 答对了！</div>` : `<div class="ai-panel"><b>为什么这样选？</b><p class="mt-2 text-sm">选错很正常——关键是理解规则。${GRAMMAR.find(g => location.hash.includes(g.id))?.summary}</p><button class="btn btn-soft btn-sm mt-3" id="g-next">下一课</button></div>`;
    if (!ok) store.addError({ type: 'grammar', q: '语法练习', a: '', correct: false, tag: 'Grammar' });
    store.recordActivity(3, 1);
    const nx = root.querySelector('#g-next'); if (nx) nx.onclick = () => { const idx = GRAMMAR.findIndex(g => location.hash.includes(g.id)); const nxt = GRAMMAR[idx + 1]; if (nxt) location.hash = `#/learn/grammar/${nxt.id}`; };
  });
  const fill = root.querySelector('#g-fill');
  if (fill) { const sub = root.querySelector('#l-submit'); const btn = document.createElement('button'); btn.className = 'btn btn-primary btn-block mt-3'; btn.textContent = '检查'; btn.onclick = () => { const ok = fill.value.trim().toLowerCase() === GRAMMAR.find(g => location.hash.includes(g.id)).exercise.answer.toLowerCase(); const fb = root.querySelector('#g-fb'); fb.innerHTML = ok ? `<div class="badge badge-success">${icon('check', { size: 14 })} 正确！</div>` : `<div class="ai-panel">正确答案：<b>${GRAMMAR.find(g => location.hash.includes(g.id)).exercise.answer}</b><p class="mt-2 text-sm">${GRAMMAR.find(g => location.hash.includes(g.id)).exercise.hint}</p></div>`; if (!ok) store.addError({ type: 'grammar', q: '语法填空', a: fill.value, correct: false, tag: 'Grammar' }); store.recordActivity(3, 1); }; root.querySelector('#g-ex').appendChild(btn); }
}

// Listening
function initListening(root) {
  root.querySelectorAll('[data-lt]').forEach(b => b.onclick = () => toast('精听 / 跟读模式：在录音文本中逐句听读即可（可点「播放录音」反复练习）。'));
  const it = LISTENING.find(x => location.hash.includes(x.id));
  if (!it) return;
  const play = root.querySelector('#l-play'); if (play) play.onclick = () => speak(it.transcript, 0.98, play);
  const slow = root.querySelector('#l-play-slow'); if (slow) slow.onclick = () => speak(it.transcript, 0.7, slow);
  const sub = root.querySelector('#l-submit'); if (sub) sub.onclick = () => {
    const picks = [...root.querySelectorAll('[data-lq]')].map(b => ({ o: +b.dataset.o, ans: +b.dataset.ans }));
    let correct = 0; picks.forEach(p => { const ok = p.o === p.ans; if (ok) correct++; else store.addError({ type: 'listening', q: it.title, a: '', correct: false, tag: 'Listening' }); });
    store.recordActivity(8, picks.length);
    root.querySelector('#l-result').innerHTML = `<div class="ai-panel"><b>得分：${correct} / ${picks.length}</b><div class="mt-2 text-sm">错题已进入错题本，建议做「精听」：听一句写一句，对照原文。</div></div>`;
    toast(`听力：${correct}/${picks.length}`);
  };
}

// Reading
function initReading(root) {
  const it = READING.find(x => location.hash.includes(x.id)); if (!it) return;
  const sub = root.querySelector('#r-submit'); if (sub) sub.onclick = () => {
    const picks = [...root.querySelectorAll('[data-rq]')].map(b => ({ o: +b.dataset.o, ans: +b.dataset.ans, type: b.dataset.type }));
    let correct = 0; picks.forEach(p => { const ok = p.o === p.ans; if (ok) correct++; else store.addError({ type: 'reading', q: it.title + ' (' + (p.type || 'mc') + ')', a: '', correct: false, tag: 'Reading' }); });
    store.recordActivity(10, picks.length);
    root.querySelector('#r-result').innerHTML = `<div class="ai-panel"><b>得分：${correct} / ${picks.length}</b><div class="mt-2 text-sm">读不懂的题，回看原文定位句；Not Given 指原文完全没提。</div></div>`;
    toast(`阅读：${correct}/${picks.length}`);
  };
}

// Writing
function initWriting(root) {
  const p = WRITING.find(x => location.hash.includes(x.id)); if (!p) return;
  let remain = p.time * 60; const timerEl = root.querySelector('#w-timer');
  const timer = setInterval(() => { remain--; if (remain < 0) { clearInterval(timer); toast('时间到，可以提交批改了'); return; } const m = Math.floor(remain / 60), s = remain % 60; if (timerEl) timerEl.textContent = `${m}:${String(s).padStart(2, '0')}`; }, 1000);
  const clear = root.querySelector('#w-clear'); if (clear) clear.onclick = () => { root.querySelector('#w-text').value = ''; };
  const grade = root.querySelector('#w-grade'); if (grade) grade.onclick = () => {
    const text = root.querySelector('#w-text').value;
    if (text.trim().length < 20) { toast('写一点内容再批改吧'); return; }
    clearInterval(timer);
    const r = writingCritique(text, p);
    const out = root.querySelector('#w-result');
    out.innerHTML = `<div class="mt-5"><div class="row between"><div class="card-title">AI 批改报告</div><div class="badge badge-brand" style="font-size:16px">预估 ${p.exam === 'IELTS' ? 'Band ' + r.overall : r.overall + ' 分'}</div></div>
      <div class="grid grid-4 mt-3">${[['任务回应', r.scores.taskResponse], ['连贯衔接', r.scores.coherence], ['词汇', r.scores.lexical], ['语法', r.scores.grammar]].map(([k, v]) => `<div class="card card-pad-sm"><div class="muted text-xs">${k}</div><div class="val" style="font-size:24px;font-weight:760">${v}</div></div>`).join('')}</div>
      <div class="ai-panel mt-4"><b>字数：${r.wordCount} / 建议 ${r.minWords} ${r.meets ? '✓ 达标' : '✗ 不足'}</b></div>
      ${r.issues.length ? `<div class="mt-4"><b>逐条诊断（为什么错 → 怎么改 → 为什么这样改）</b>${r.issues.map(is => `<div class="card card-pad-sm mt-3"><div class="row gap-2"><span class="badge badge-warning">${is.tag}</span></div>
        <div class="mt-2 text-sm"><b>为什么：</b>${is.why}</div><div class="text-sm mt-1"><b>怎么改：</b>${is.fix}</div><div class="text-sm mt-1"><b>为什么这样改更好：</b>${is.advanced}</div>${is.example ? `<div class="serif mt-1 text-sm" style="color:var(--brand)">${is.example}</div>` : ''}</div>`).join('')}</div>` : `<div class="ai-panel mt-4">整体不错，没有明显的结构性问题。</div>`}
      <div class="ai-panel mt-4"><b>高分示范句</b><div class="serif mt-2" style="line-height:1.7">${r.advancedVersion}</div></div>
      <div class="mt-4"><b>下一步建议</b><ul class="stack gap-1 mt-2">${r.suggestions.map(s => `<li class="text-sm list-item" style="padding-left:0"><span class="dot dot-success"></span>${s}</li>`).join('')}</ul></div>
      <button class="btn btn-soft mt-4" id="w-save">${icon('bookmark', { size: 15 })}<span>保存这次练习</span></button>
    </div>`;
    store.recordActivity(p.time, 1);
    const save = root.querySelector('#w-save'); if (save) save.onclick = () => { store.addMock({ exam: p.exam.toLowerCase(), kind: 'writing', score: r.overall, detail: p.title }); toast('已保存到学习记录'); };
  };
}

// Speaking
function initSpeaking(root) {
  root.querySelectorAll('[data-st]').forEach(b => b.onclick = () => { root.querySelectorAll('[data-st]').forEach(x => x.classList.remove('active')); b.classList.add('active'); toast(b.dataset.st === 'toefl' ? '已切换到 TOEFL 任务' : '已切换到 IELTS 任务'); });
  root.querySelectorAll('[data-ip]').forEach(b => b.onclick = () => {
    root.querySelectorAll('[data-ip]').forEach(x => x.classList.remove('active')); b.classList.add('active');
    const i = SPEAKING.ielts; const map = { '1': i.part1, '2': i.part2.map(c => c.cue + '（' + c.points.join(' / ') + '）'), '3': i.part3 };
    root.querySelector('#speak-q').innerHTML = map[b.dataset.ip].map(q => `<div class="list-item"><span class="dot dot-success"></span><span>${q}</span></div>`).join('');
  });
  const rec = root.querySelector('#speak-record'); if (rec) rec.onclick = () => runSpeaking(root, '#speak-out', 'IELTS');
  const recT = root.querySelector('#speak-record-toefl'); if (recT) recT.onclick = () => runSpeaking(root, '#speak-out-toefl', 'TOEFL');
}

function runSpeaking(root, outSel, kind) {
  const out = root.querySelector(outSel);
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    out.innerHTML = `<div class="ai-panel"><b>麦克风识别不可用</b><p class="mt-2 text-sm">你的浏览器不支持语音识别。请在下方直接输入你的回答，AI 仍会给出分析：</p>
      <textarea class="textarea mt-3" id="s-fallback" placeholder="用英语写下你的回答…"></textarea>
      <button class="btn btn-primary mt-3" id="s-fallback-go">分析</button></div>`;
    out.querySelector('#s-fallback-go').onclick = () => { const txt = out.querySelector('#s-fallback').value; if (txt.trim().length < 5) { toast('写一点内容'); return; } showSpeakResult(out, txt, kind); };
    return;
  }
  out.innerHTML = `<div class="ai-panel"><div class="row gap-2" style="color:var(--c-speak)">${icon('mic', { size: 18 })}<b>正在聆听…</b></div><div class="hint mt-2">请开始用英语回答，说完点「停止」。</div><button class="btn btn-danger mt-3" id="s-stop">${icon('x', { size: 15 })}<span>停止并分析</span></button><div id="s-live" class="serif mt-3 text-sm"></div></div>`;
  const recog = new SR(); recog.lang = 'en-US'; recog.interimResults = true; recog.continuous = true;
  let final = '';
  recog.onresult = (e) => { let t = ''; for (let i = e.resultIndex; i < e.results.length; i++) t += e.results[i][0].transcript + ' '; final += t; out.querySelector('#s-live').textContent = final; };
  recog.onerror = () => { toast('语音识别出错，可改用文本输入'); };
  recog.start();
  out.querySelector('#s-stop').onclick = () => { recog.stop(); showSpeakResult(out, final, kind); };
}
function showSpeakResult(out, transcript, kind) {
  if (!transcript.trim()) { toast('没有识别到内容'); return; }
  const r = speakingAnalyze(transcript, {});
  store.recordActivity(5, 1);
  out.innerHTML = `<div class="mt-4"><div class="row between"><div class="card-title">AI 口语分析</div><div class="badge badge-brand" style="font-size:16px">预估 Band ${r.band}</div></div>
    <div class="grid grid-4 mt-3">${[['流利度', r.scores.fluency], ['词汇', r.scores.vocabulary], ['语法', r.scores.grammar], ['发音', r.scores.pronunciation]].map(([k, v]) => `<div class="card card-pad-sm"><div class="muted text-xs">${k}</div><div class="val" style="font-size:24px;font-weight:760">${v}</div></div>`).join('')}</div>
    <div class="ai-panel mt-4"><b>你的回答</b><div class="serif mt-2 text-sm" style="line-height:1.7">${transcript}</div><div class="hint mt-2">单词数 ${r.wordCount} · 填充词 ${r.fillerCount} · 词汇多样性 ${r.diversity}%</div></div>
    ${r.issues.length ? `<div class="mt-4"><b>具体问题</b>${r.issues.map(is => `<div class="card card-pad-sm mt-3"><div class="badge badge-warning">${is.label}</div><div class="mt-2 text-sm">${is.detail}</div></div>`).join('')}</div>` : `<div class="ai-panel mt-4">表现不错，继续保持！</div>`}
    <div class="mt-4"><b>改进建议</b><ul class="stack gap-1 mt-2">${r.suggestions.map(s => `<li class="text-sm list-item" style="padding-left:0"><span class="dot dot-success"></span>${s}</li>`).join('')}</ul></div>
    <button class="btn btn-soft mt-4" id="s-save">${icon('bookmark', { size: 15 })}<span>保存分析</span></button></div>`;
  const save = out.querySelector('#s-save'); if (save) save.onclick = () => { store.addMock({ exam: kind.toLowerCase(), kind: 'speaking', score: r.band, detail: '口语模拟' }); toast('已保存'); };
}
