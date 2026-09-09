// ui.js — DOM helpers, icons, toast, modal, formatting

// morphicons: register the <morph-icon> custom element once (idempotent).
// Icons are passed as raw `d` path strings so any two can morph.
import { defineMorphIcon } from '../vendor/morphicons/element.js';
defineMorphIcon();

export function h(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

export function frag(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content;
}

export const qs = (sel, root = document) => root.querySelector(sel);
export const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));

// ---- Icons (inline SVG, stroke-based, 24x24) ----
const I = {
  home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/>',
  book: '<path d="M4 5a2 2 0 0 1 2-2h12v16H6a2 2 0 0 0-2 2z"/><path d="M4 21a2 2 0 0 1 2-2h14"/>',
  mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/><path d="M12 18v3"/>',
  headphones: '<path d="M4 13a8 8 0 0 1 16 0"/><rect x="3" y="13" width="4" height="7" rx="2"/><rect x="17" y="13" width="4" height="7" rx="2"/>',
  doc: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/><path d="M9 12h6M9 16h6"/>',
  pen: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  brain: '<path d="M9 4a3 3 0 0 0-3 3 3 3 0 0 0-1 5 3 3 0 0 0 2 4 3 3 0 0 0 5 1V4a3 3 0 0 0-3-0z"/><path d="M15 4a3 3 0 0 1 3 3 3 3 0 0 1 1 5 3 3 0 0 1-2 4 3 3 0 0 1-5 1"/>',
  trophy: '<path d="M8 4h8v4a4 4 0 0 1-8 0z"/><path d="M8 5H5v2a3 3 0 0 0 3 3M16 5h3v2a3 3 0 0 1-3 3"/><path d="M12 12v4M9 20h6M10 16h4v4h-4z"/>',
  chart: '<path d="M4 20V4"/><path d="M4 20h16"/><path d="M8 16v-4M12 16V8M16 16v-6"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18M8 3v4M16 3v4"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.3 1a7 7 0 0 0-1.7-1l-.3-2.6h-4l-.3 2.6a7 7 0 0 0-1.7 1l-2.3-1-2 3.4 2 1.5a7 7 0 0 0 0 2l-2 1.5 2 3.4 2.3-1a7 7 0 0 0 1.7 1l.3 2.6h4l.3-2.6a7 7 0 0 0 1.7-1l2.3 1 2-3.4-2-1.5a7 7 0 0 0 .1-1z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19"/>',
  moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
  menu: '<path d="M3 6h18M3 12h18M3 18h18"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4-4"/>',
  check: '<path d="M5 12l5 5 9-11"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  arrowR: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  arrowL: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
  play: '<path d="M7 4v16l13-8z"/>',
  pause: '<path d="M8 4v16M16 4v16"/>',
  star: '<path d="M12 3l2.7 5.5 6 .9-4.3 4.2 1 6-5.4-2.8L6.6 19.6l1-6L3.3 9.4l6-.9z"/>',
  heart: '<path d="M12 21s-7-4.5-9.5-9A5 5 0 0 1 12 6a5 5 0 0 1 9.5 6c-2.5 4.5-9.5 9-9.5 9z"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/>',
  sparkles: '<path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5z"/><path d="M19 14l.8 2.2L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8z"/>',
  layers: '<path d="M12 3 3 8l9 5 9-5z"/><path d="M3 13l9 5 9-5"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18z"/>',
  flame: '<path d="M12 3c1 3-2 4-2 7a2 2 0 0 0 4 0c0-1 0-1 .5-2 2 2 3 4 3 6a5.5 5.5 0 0 1-11 0c0-4 3-6 5.5-11z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  refresh: '<path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/>',
  chevron: '<path d="M9 6l6 6-6 6"/>',
  filter: '<path d="M3 5h18l-7 8v6l-4 2v-8z"/>',
  bookmark: '<path d="M6 3h12v18l-6-4-6 4z"/>',
  alert: '<path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17v.5"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8v.5"/>',
  graduation: '<path d="M3 9l9-4 9 4-9 4z"/><path d="M7 11v5c0 1 2.2 2 5 2s5-1 5-2v-5"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  volume: '<path d="M11 5 6 9H3v6h3l5 4z"/><path d="M16 9a4 4 0 0 1 0 6M19 6a8 8 0 0 1 0 12"/>',
  camera: '<path d="M3 8h4l2-3h6l2 3h4v11H3z"/><circle cx="12" cy="13" r="3.5"/>',
  send: '<path d="M22 2 11 13M22 2l-7 20-4-9-9-4z"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
  target2: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>',
  bulb: '<path d="M9 18h6M10 22h4"/><path d="M12 2a6 6 0 0 0-4 10c1 1 1 2 1 3h6c0-1 0-2 1-3a6 6 0 0 0-4-10z"/>',
  compass: '<circle cx="12" cy="12" r="9"/><path d="M15 9l-2 5-4 2 2-5z"/>',
  chat: '<path d="M21 12a8 8 0 0 1-11.5 7.2L4 21l1.8-5.5A8 8 0 1 1 21 12z"/>',
  book2: '<path d="M4 5a2 2 0 0 1 2-2h12v16H6a2 2 0 0 0-2 2z"/><path d="M4 21a2 2 0 0 1 2-2h14"/>',
  flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  inbox: '<path d="M3 8h4l2-3h6l2 3h4v11H3z"/><path d="M3 13h5l1 2h6l1-2h5"/>',
};

// Build raw `d` path strings for morphicons. The `I` map above wraps each icon
// in `<path d="…"/>` markup; morphicons wants the unwrapped `d` string so any
// two icons can morph between each other. Multi-subpath icons are flattened
// into one `d` string (the browser renders multiple M commands in a single path).
const D = {};
for (const k in I) {
  const ds = I[k].match(/d="([^"]*)"/g) || [];
  D[k] = ds.map((s) => s.slice(3, -1)).join(' ');
}
export const ICON_D = D;

export function icon(name, opts = {}) {
  const size = opts.size || 20;
  const stroke = opts.stroke || 1.8;
  const d = D[name] || D.info;
  const cls = opts.class ? ` class="${opts.class}"` : '';
  return `<morph-icon${cls} icon="${d}" size="${size}" stroke-width="${stroke}" aria-hidden="true"></morph-icon>`;
}

// ---- 播放态形变（volume ↔ pause）----
// 图标本来就渲染成 <morph-icon>（见 icon()），播放按钮直接形变即可。
// 返回复位函数：语音结束 / 出错 / 超时后调一次，把图标变回 volume。
let playSeq = 0;
let playing = null; // { token, btn, from }  from = 按钮原本的图标 d

function restoreIcon(rec) {
  const m = rec.btn && rec.btn.querySelector('morph-icon');
  if (m && typeof m.morphTo === 'function') m.morphTo(rec.from, 'snappy');
}

export function playMorph(btn) {
  const prev = playing;
  // 打断上一条：换按钮时把上一个先复位（同一按钮保持 pause，避免来回抖）
  if (prev && prev.btn !== btn) restoreIcon(prev);
  const m = btn && btn.querySelector('morph-icon');
  if (!m || typeof m.morphTo !== 'function') { playing = null; return null; }
  const from = m.getAttribute('icon') || D.volume; // 可能是 play，也可能是 volume
  if (!prev || prev.btn !== btn) m.morphTo(D.pause, 'snappy');
  const token = ++playSeq;
  const rec = { token, btn, from };
  playing = rec;
  return () => {
    if (!playing || playing.token !== token) return; // 已被下一条接管，交给新的一条复位
    playing = null;
    m.morphTo(from, 'snappy');
  };
}

export function stars(n, max = 5) {
  let s = '';
  for (let i = 0; i < max; i++) s += icon(i < n ? 'star' : 'star', { class: i < n ? 'star-on' : 'star-off', size: 16 });
  return s;
}

// ---- Toast ----
export function toast(msg, ms = 2400) {
  const root = document.getElementById('toast-root');
  if (!root) return;
  const t = h(`<div class="toast">${msg}</div>`);
  root.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateY(8px)'; setTimeout(() => t.remove(), 220); }, ms);
}

// ---- Modal ----
let modalEl = null;
export function modal(htmlContent, opts = {}) {
  closeModal();
  const overlay = h(`<div class="overlay"></div>`);
  const box = h(`<div class="modal card card-solid">${htmlContent}</div>`);
  if (opts.wide) box.style.maxWidth = '760px';
  if (opts.className) box.classList.add(opts.className);
  overlay.appendChild(box);
  overlay.addEventListener('click', (e) => { if (e.target === overlay && opts.dismissable !== false) closeModal(); });
  document.getElementById('overlay-root').appendChild(overlay);
  modalEl = overlay;
  return box;
}
export function closeModal() {
  if (modalEl) { modalEl.remove(); modalEl = null; }
}
window.closeModal = closeModal;

// ---- AI gateway settings (writes localStorage.sua_llm) ----
const escAttr = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
export function openLlmSettings(onSaved) {
  let cfg = null;
  try { cfg = JSON.parse(localStorage.getItem('sua_llm') || 'null'); } catch (e) { cfg = null; }
  cfg = cfg || {};
  const box = modal(`
    <div class="modal-head">
      <h3>AI 网关设置</h3>
      <button class="icon-btn" onclick="closeModal()" aria-label="关闭">${icon('x', { size: 16 })}</button>
    </div>
    <div class="muted text-sm mb-3">配置你自己的 OpenAI 兼容网关。密钥仅保存在本机浏览器（localStorage），不会上传到本平台服务器。配置后 AI 伙伴对话、AI 讲题将调用真实模型；留空则使用本地规则引擎。</div>
    <label class="form-row"><span>Base URL</span><input class="input full" id="llm-base" placeholder="https://api.openai.com/v1" value="${escAttr(cfg.base || '')}"></label>
    <label class="form-row"><span>API Key</span><input class="input full" id="llm-key" type="password" placeholder="sk-..." value="${escAttr(cfg.key || '')}" autocomplete="off"></label>
    <label class="form-row"><span>Model</span><input class="input full" id="llm-model" placeholder="gpt-4o-mini" value="${escAttr(cfg.model || '')}"></label>
    <div class="row gap-2 mt-3">
      <button class="btn btn-primary" id="llm-save">保存</button>
      <button class="btn btn-ghost" id="llm-clear">清除配置</button>
    </div>
    <div class="hint mt-3">生产环境建议把密钥放在后端代理，避免前端暴露。此为个人本地试用通道。</div>
  `, { wide: false });
  const baseEl = box.querySelector('#llm-base');
  const keyEl = box.querySelector('#llm-key');
  const modelEl = box.querySelector('#llm-model');
  box.querySelector('#llm-save').onclick = () => {
    const base = baseEl.value.trim();
    const key = keyEl.value.trim();
    const model = modelEl.value.trim();
    if (!base || !key) { toast('Base URL 与 API Key 均必填'); return; }
    localStorage.setItem('sua_llm', JSON.stringify({ base, key, model }));
    toast('已保存，AI 将使用真实模型');
    closeModal();
    if (typeof onSaved === 'function') onSaved();
  };
  box.querySelector('#llm-clear').onclick = () => {
    localStorage.removeItem('sua_llm');
    toast('已清除，切回本地规则引擎');
    closeModal();
    if (typeof onSaved === 'function') onSaved();
  };
}

// ---- Formatting ----
export const fmtDate = (d = new Date()) => {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};
export const fmtTime = (mins) => {
  if (mins < 60) return `${Math.round(mins)} 分钟`;
  const h = Math.floor(mins / 60), m = Math.round(mins % 60);
  return m ? `${h} 小时 ${m} 分` : `${h} 小时`;
};
export const uid = () => Math.random().toString(36).slice(2, 10);

// Mini helper to build SVG donut used in many places
export function levelBar(score, max = 9) {
  const pct = Math.max(0, Math.min(100, (score / max) * 100));
  return `<div class="progress"><span style="width:${pct}%"></span></div>`;
}

// ---------------- Markdown（极简子集） ----------------
// AI 回复里常见的几种标记：代码块、`行内代码`、**粗体**、*斜体*、- 列表、1. 列表、空行分段。
// 先整段转义再套标记，保证模型返回任何内容都不会被当成 HTML 执行。
const MD_ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export function mdEscape(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (ch) => MD_ESC[ch]);
}
function mdInline(s) {
  return mdEscape(s)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[\s(])\*([^*\n]+)\*(?=[\s).,!?]|$)/g, '$1<em>$2</em>');
}
export function mdText(src) {
  const lines = String(src == null ? '' : src).split('\n');
  let html = '';
  let para = [];
  let list = null;        // 'ul' | 'ol'
  let code = null;        // 收集代码围栏内容

  const flushPara = () => {
    if (!para.length) return;
    html += '<p>' + mdInline(para.join(' ')) + '</p>';
    para = [];
  };
  const closeList = () => {
    if (list) { html += '</' + list + '>'; list = null; }
  };
  const openList = (type) => {
    if (list !== type) { closeList(); list = type; html += '<' + type + '>'; }
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (/^\s*```/.test(line)) {
      if (code === null) { flushPara(); closeList(); code = []; }
      else { html += '<pre><code>' + mdEscape(code.join('\n')) + '</code></pre>'; code = null; }
      continue;
    }
    if (code !== null) { code.push(raw); continue; }

    if (!line.trim()) { flushPara(); closeList(); continue; }

    const ul = line.match(/^\s*[-*+]\s+(.*)$/);
    const ol = line.match(/^\s*\d+[.)]\s+(.*)$/);
    if (ul || ol) {
      flushPara();
      openList(ul ? 'ul' : 'ol');
      html += '<li>' + mdInline((ul || ol)[1]) + '</li>';
      continue;
    }
    closeList();
    para.push(line.trim());
  }
  if (code !== null) html += '<pre><code>' + mdEscape(code.join('\n')) + '</code></pre>';
  flushPara();
  closeList();
  return html;
}
