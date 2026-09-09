// anim.js — GSAP-powered page transitions & micro-reveals
// Graceful fallback: if GSAP failed to load or reduced-motion is requested,
// elements stay fully visible (no hidden content, no blank pages).

const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Structural blocks that should reveal on a full page entrance.
const PAGE_SEL = '.hero, .page-head, .section-head, .section, .card, .stat, .kpi, .ai-panel, .bento-item, .timeline, .table-wrap';
// Children worth animating on an in-page update (tab switch, deck paint).
const PARTIAL_SEL = '.card, .ai-panel, .flashcard, .section, .stat, .page-head, .list-item';

function gsap() { return window.gsap || null; }

// Full page reveal — called by the router after every navigation.
export function animatePage(root = document.getElementById('app')) {
  const el = root;
  if (!el) return;
  const g = gsap();
  const items = Array.from(el.querySelectorAll(PAGE_SEL));
  if (!items.length) return;
  if (!g || REDUCED) { items.forEach((n) => (n.style.opacity = '')); return; }

  const heads = items.filter((n) => n.matches('.hero, .page-head, .section-head'));
  const bodies = items.filter((n) => !heads.includes(n));

  // Set start state synchronously (before browser paint) to avoid flash.
  g.set([...heads, ...bodies], { autoAlpha: 0, y: 18 });
  const tl = g.timeline({ defaults: { ease: 'power3.out' } });
  if (heads.length) tl.to(heads, { autoAlpha: 1, y: 0, duration: 0.6, stagger: 0.07 }, 0);
  tl.to(bodies, {
    autoAlpha: 1, y: 0, duration: 0.5, stagger: 0.045,
    clearProps: 'transform,opacity,visibility',
  }, heads.length ? 0.14 : 0);
}

// Partial reveal for a container that was swapped in-place (no full route change).
export function animateIn(el) {
  if (!el) return;
  const g = gsap();
  if (!g || REDUCED) return;
  const items = Array.from(el.children).filter((c) => c.matches(PARTIAL_SEL));
  if (!items.length) return;
  g.fromTo(items, { autoAlpha: 0, y: 14 }, {
    autoAlpha: 1, y: 0, duration: 0.45, ease: 'power3.out', stagger: 0.04,
    clearProps: 'all',
  });
}

// Staggered reveal for a list of rows.
export function animateList(el, sel = '.list-item') {
  if (!el) return;
  const g = gsap();
  if (!g || REDUCED) return;
  const items = Array.from(el.querySelectorAll(sel));
  if (!items.length) return;
  g.fromTo(items, { autoAlpha: 0, y: 10 }, {
    autoAlpha: 1, y: 0, duration: 0.4, ease: 'power2.out', stagger: 0.03,
    clearProps: 'all',
  });
}
