// router.js — minimal hash router, route by first segment, pass rest as segments

const routes = new Map();   // segment -> { render }
let notFound = null;
let afterRender = null;

export function route(seg, renderFn) { routes.set(seg, renderFn); }
export function setNotFound(fn) { notFound = fn; }
export function onAfterRender(fn) { afterRender = fn; }

export function navigate(path) {
  const clean = path.startsWith('#') ? path : '#' + (path.startsWith('/') ? path : '/' + path);
  if (location.hash === clean) render();
  else location.hash = clean;
}

function parse() {
  let h = location.hash.replace(/^#/, '');
  if (!h || h === '/') return [];
  return h.split('/').filter(Boolean);
}

export function currentPath() { return location.hash || '#/'; }

async function render() {
  const segs = parse();
  const app = document.getElementById('app');
  const seg = segs[0] || 'home';
  const renderFn = routes.get(seg) || notFound;
  if (!renderFn) { app.innerHTML = '<div class="container page"><div class="empty">页面不存在</div></div>'; return; }
  try {
    const html = await renderFn(segs.slice(1), { seg });
    if (typeof html === 'string') app.innerHTML = html;
    else if (html instanceof Node) { app.innerHTML = ''; app.appendChild(html); }
    // run page init if provided
    if (renderFn._init) renderFn._init(segs.slice(1));
    window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
    if (afterRender) afterRender(seg, segs);
    // dispatch event for page scripts
    window.dispatchEvent(new CustomEvent('page:rendered', { detail: { seg, segs } }));
  } catch (err) {
    console.error('[router] render error', err);
    app.innerHTML = `<div class="container page"><div class="empty"><strong>渲染出错</strong><br><span class="muted">${err.message}</span></div></div>`;
  }
}

export function startRouter() {
  window.addEventListener('hashchange', render);
  if (!location.hash) location.hash = '#/home';
  else render();
}

export function getParams(segs) { return segs; }
