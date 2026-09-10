// app.js — bootstrap, nav, routes
import { NAV } from './data.js';
import { store } from './state.js';
import { icon, h, ICON_D } from './ui.js';
import * as router from './router.js';
import { syncNow } from './sync.js';

import { render as home } from './pages/home.js';
import { render as learn } from './pages/learn.js';
import { render as ielts } from './pages/ielts.js';
import { render as toefl } from './pages/toefl.js';
import { render as partner } from './pages/partner.js';
import { render as bank } from './pages/bank.js';
import { render as mock } from './pages/mock.js';
import { render as errors } from './pages/errors.js';
import { render as plan } from './pages/plan.js';
import { render as profile } from './pages/profile.js';
import { render as diagnostic } from './pages/diagnostic.js';
import { render as review } from './pages/review.js';
import { render as journal } from './pages/journal.js';
import { render as auth } from './pages/auth.js';
import { animatePage } from './anim.js';

// ---- Theme init ----
const savedTheme = store.state.settings.theme || 'light';
document.documentElement.dataset.theme = savedTheme === 'dark' ? 'dark' : 'light';

// ---- Session restore ----
// If a JWT is present, rehydrate the user from the backend so the nav/account
// reflect the real account (and refresh silently if the token is still valid).
if (store.isAuthed()) {
  store.me()
    .then(() => { renderNav(); return syncNow(); })
    .catch(() => { /* invalid token; stays logged out locally */ });
}

// ---- Nav ----
function renderNav() {
  const nav = document.getElementById('nav');
  const seg = (location.hash.replace(/^#\//, '').split('/')[0]) || 'home';
  const links = NAV.map(n => `<a class="nav-link ${n.seg === seg ? 'active' : ''}" href="#/${n.seg}">${icon(n.icon, { size: 16 })}<span>${n.label}</span></a>`).join('');
  const isAuthed = store.isAuthed();
  nav.innerHTML = `
    <div class="nav-inner">
      <a class="brand" href="#/home">
        <span class="brand-mark">S</span>
        <span>SUA English<small>IELTS · TOEFL</small></span>
  </a>
      <nav class="nav-links">${links}</nav>
      <div class="nav-actions">
        <button class="icon-btn" id="theme-btn" title="切换主题" aria-label="切换主题"><morph-icon id="theme-morph" icon="${ICON_D[document.documentElement.dataset.theme === 'dark' ? 'sun' : 'moon']}" size="20" stroke-width="1.8" aria-hidden="true"></morph-icon></button>
        <a class="btn btn-soft btn-sm hide-sm" href="#/plan">${icon('calendar', { size: 15 })}<span>学习计划</span></a>
        <a class="btn btn-primary btn-sm" href="#/auth">${isAuthed ? icon('user', { size: 15 }) + '<span>' + store.state.user.name + '</span>' : icon('user', { size: 15 }) + '<span>登录</span>'}</a>
        <button class="icon-btn nav-toggle" id="nav-toggle" aria-label="菜单" aria-expanded="false" aria-controls="drawer">${burgerHtml()}</button>
      </div>
    </div>`;
  // 主题切换走 morph-icon 弹簧形变（sun↔moon），不再整体重渲染导航——
  // 顺带修掉旧 bug：savedTheme 是启动时的闭包常量，路由切换重渲染后图标会回退到启动主题。
  document.getElementById('theme-btn').onclick = () => {
    const wasDark = document.documentElement.dataset.theme === 'dark';
    store.toggleTheme();
    const m = document.getElementById('theme-morph');
    if (m && m.morphTo) m.morphTo(ICON_D[wasDark ? 'moon' : 'sun'], 'snappy');
  };
  document.getElementById('nav-toggle').onclick = toggleDrawer;
}

// 菜单(Menu) ↔ 关闭(X) 形变：用 morphicons 的 <morph-icon>，
// 在 openDrawer / closeDrawer 里跟随 aria-expanded 调用 morphTo。
function burgerHtml() {
  return `<morph-icon id="nav-morph" class="nav-morph" icon="${ICON_D.menu}" size="22" stroke-width="2" aria-hidden="true"></morph-icon>`;
}

function toggleDrawer() {
  const existing = document.querySelector('.drawer');
  if (existing) { closeDrawer(existing); return; }
  openDrawer();
}

function openDrawer() {
  const seg = (location.hash.replace(/^#\//, '').split('/')[0]) || 'home';
  const links = NAV.map(n => `<a class="nav-link ${n.seg === seg ? 'active' : ''}" href="#/${n.seg}">${icon(n.icon, { size: 18 })}<span>${n.label}</span></a>`).join('');
  const d = h(`<div class="drawer" id="drawer"><div class="drawer-panel"><div class="brand" style="margin-bottom:16px"><span class="brand-mark">S</span><span>SUA English</span></div>${links}<a class="btn btn-primary btn-block" style="margin-top:16px" href="#/auth">${icon('user', { size: 15 })}<span>登录 / 我的</span></a></div></div>`);
  // 点遮罩或任一内链都关闭，并把汉堡按钮复位成「菜单」态
  d.addEventListener('click', (e) => { if (e.target === d) closeDrawer(d); });
  d.querySelectorAll('a').forEach(a => a.addEventListener('click', () => closeDrawer(d)));
  document.body.appendChild(d);
  document.body.classList.add('drawer-open');
  document.addEventListener('keydown', escClose);
  const btn = document.getElementById('nav-toggle');
  if (btn) {
    btn.setAttribute('aria-expanded', 'true');
    const m = btn.querySelector('#nav-morph');
    if (m && m.morphTo) m.morphTo(ICON_D.x, 'snappy');
  }
}

function escClose(e) {
  if (e.key !== 'Escape') return;
  const d = document.querySelector('.drawer');
  if (d) closeDrawer(d);
}

function closeDrawer(d) {
  d.remove();
  document.body.classList.remove('drawer-open');
  document.removeEventListener('keydown', escClose);
  const btn = document.getElementById('nav-toggle');
  if (btn) {
    btn.setAttribute('aria-expanded', 'false');
    const m = btn.querySelector('#nav-morph');
    if (m && m.morphTo) m.morphTo(ICON_D.menu, 'snappy');
  }
}

// ---- Routes ----
router.route('home', home);
router.route('learn', learn);
router.route('ielts', ielts);
router.route('toefl', toefl);
router.route('partner', partner);
router.route('bank', bank);
router.route('mock', mock);
router.route('errors', errors);
router.route('plan', plan);
router.route('profile', profile);
router.route('diagnostic', diagnostic);
router.route('review', review);
router.route('journal', journal);
router.route('auth', auth);
router.setNotFound(() => `<div class="container page"><div class="empty"><div class="ic">${icon('compass', { size: 26 })}</div>页面不存在<br><a class="btn btn-soft btn-sm" href="#/home" style="margin-top:16px">返回首页</a></div></div>`);

router.onAfterRender(() => { renderNav(); animatePage(document.getElementById('app')); });

// 服务端数据回填（登录 / 同步完成）后重绘当前页 —— 否则首页还是渲染时的旧数字。
document.addEventListener('state:hydrated', () => {
  renderNav();
  router.navigate(location.hash || '#/home');
});

// ---- Start ----
renderNav();
router.startRouter();
