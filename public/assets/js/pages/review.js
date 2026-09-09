// pages/review.js — 每周复盘
// 结构借鉴 byoungd/up 的 weekly review 流程（四项检查 + 下周只改一件事），
// 判定规则与全部中文文案均为原创改写。核心原则：不要因为一周状态差就重写整套计划，
// 先区分「偶发波动」与「连续三次出现的模式」。
import { icon, toast, modal, closeModal } from '../ui.js';
import { getWeeklyReviews, setWeeklyReviews, markReviewRemoved, scheduleSync } from '../sync.js';

// ---------------- ISO 周 ----------------
/** 返回 ISO-8601 周键，如 2026-W35。 */
export function isoWeek(d = new Date()) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);            // 移到本周周四（决定年份归属）
  const year = t.getUTCFullYear();
  const yearStart = Date.UTC(year, 0, 1);
  const week = Math.ceil(((t.getTime() - yearStart) / 86400000 + 1) / 7);
  return `${year}-W${String(week).padStart(2, '0')}`;
}

/** 该周周一 00:00 UTC。 */
function weekMonday(key) {
  const m = /^(\d{4})-W(\d{1,2})$/.exec(key || '');
  if (!m) return null;
  const y = Number(m[1]);
  const w = Number(m[2]);
  const d = new Date(Date.UTC(y, 0, 4));             // 1 月 4 日必在第 1 周
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() - day + 1 + (w - 1) * 7);
  return d;
}

/** 周序号（便于计算相隔几周）。 */
function weekIndex(key) {
  const mon = weekMonday(key);
  return mon ? Math.round(mon.getTime() / 604800000) : NaN;
}

export function weekRange(key) {
  const mon = weekMonday(key);
  if (!mon) return key;
  const sun = new Date(mon.getTime() + 6 * 86400000);
  const f = (x) => `${x.getUTCMonth() + 1}月${x.getUTCDate()}日`;
  return `${f(mon)} – ${f(sun)}`;
}

/** 从本周往前推 n 周的键列表（含本周）。 */
function recentWeeks(n = 12) {
  const out = [];
  const now = new Date();
  for (let i = 0; i < n; i += 1) {
    const d = new Date(now.getTime() - i * 7 * 86400000);
    out.push(isoWeek(d));
  }
  return Array.from(new Set(out));
}

// ---------------- 四项检查 ----------------
const CHECKS = [
  { key: 'done', label: '完成', hint: '这周计划做的事，实际做到了多少', opts: ['基本没做', '做了一部分', '按计划完成'] },
  { key: 'quality', label: '质量', hint: '做到的部分，达到你自己定的标准了吗', opts: ['明显不够', '勉强够', '稳定达标'] },
  { key: 'kept', label: '保持', hint: '之前定下来的方法，这周还在用吗', opts: ['已经丢了', '断断续续', '基本保持'] },
  { key: 'transfer', label: '迁移', hint: '练过的东西，换个场景还能用出来吗', opts: ['换个场景就不会', '需要提示才想得起', '能自己迁移'] },
];
const ENERGY = {
  key: 'energy', label: '精力与恢复',
  hint: '这一周的时间和状态，是可持续的吗',
  opts: ['透支或总被打断', '勉强撑住', '够用且能持续'],
};
const SCORE_LABEL = ['0', '1', '2'];

// ---------------- 本地状态 ----------------
let root = null;
let sel = null;      // 当前选择的周
let draft = null;    // 当前编辑中的 doc

function reviewsSorted() {
  return (getWeeklyReviews() || [])
    .filter((x) => x && x.weekStart)
    .slice()
    .sort((a, b) => weekIndex(b.weekStart) - weekIndex(a.weekStart));
}

function loadDraft(weekStart) {
  const hit = reviewsSorted().find((x) => x.weekStart === weekStart);
  const d = (hit && hit.doc) || {};
  return {
    checks: Object.assign({ done: null, quality: null, kept: null, transfer: null }, d.checks || {}),
    energy: d.energy == null ? null : d.energy,
    evidence: d.evidence || '',
    errorPattern: d.errorPattern || '',
    oneThing: d.oneThing || '',
    savedAt: d.savedAt || (hit ? new Date(hit.updatedAt || Date.now()).toISOString() : ''),
  };
}

/** 判定：把「当前草稿 + 已有历史」拼成按周连续的时间序列，再找连续三周的低分。 */
function analyse(weekStart, d) {
  const curIdx = weekIndex(weekStart);
  const map = new Map();
  reviewsSorted().forEach((r) => {
    if (r.weekStart === weekStart) return;
    map.set(weekIndex(r.weekStart), (r.doc || {}));
  });
  map.set(curIdx, d);

  const idxs = [curIdx - 2, curIdx - 1, curIdx].filter((i) => Number.isFinite(i) && map.has(i));
  const window = (idxs.length === 3 && idxs[2] - idxs[0] === 2) ? idxs.map((i) => map.get(i)) : null;

  const patterns = [];
  if (window) {
    CHECKS.concat([ENERGY]).forEach((c) => {
      const val = (w) => {
        if (c.key === 'energy') return w.energy;
        return (w.checks || {})[c.key];
      };
      if (window.every((w) => val(w) != null && Number(val(w)) <= 1)) patterns.push(c.label);
    });
  }

  const set = CHECKS.map((c) => d.checks[c.key]).filter((v) => v != null);
  const low = set.filter((v) => Number(v) <= 1).length;
  const full = set.length === CHECKS.length;
  const errStreak = Boolean(window) && window.every((w) => String(w.errorPattern || '').trim().length > 0);

  return { patterns, low, full, errStreak, hasWindow: Boolean(window) };
}

function verdictHtml(weekStart, d) {
  const a = analyse(weekStart, d);
  if (a.patterns.length) {
    return `<div class="rv-alert warn">
      <b>模式，不是波动。</b>「${a.patterns.map(esc).join('」「')}」连续三周都没到 2 分。
      这已经不能用「这周状态不好」解释了——下周只改这一处，其余照旧。整套计划先别动。
    </div>`;
  }
  if (a.errStreak) {
    return `<div class="rv-alert warn">
      <b>连续三周都在记同一类问题。</b>把它拎出来做成一个专项（固定题型 + 固定复盘点），
      不要再靠泛泛练习等它自己消失。
    </div>`;
  }
  if (!a.full) {
    return `<div class="rv-alert muted">先给四项打分，页面会给出判断：是偶发波动，还是该换方法的模式。</div>`;
  }
  if (a.low > 0) {
    return `<div class="rv-alert info">
      <b>本周有 ${a.low} 项没到 2 分，先当偶发波动处理。</b>
      下周只改一件事，节奏保持不变。一周的数据不足以推翻整套计划。
    </div>`;
  }
  return `<div class="rv-alert ok">
    <b>四项都到 2 分。</b>下一周给任务加一点难度，或者换个场景再做一遍——
    同样的难度重复做，只会让记录好看，不会让能力提升。
  </div>`;
}

function segHtml(group, value) {
  const btns = group.opts.map((o, i) =>
    `<button type="button" data-v="${i}" class="${String(value) === String(i) ? 'active' : ''}">${SCORE_LABEL[i]} ${esc(o)}</button>`).join('');
  return `<div class="seg" data-group="${group.key}">${btns}</div>`;
}

function checkRow(group, d, plain) {
  const v = group.key === 'energy' ? d.energy : d.checks[group.key];
  return `<div class="rv-check">
    <div class="rv-check-t">${plain ? '' : `<b>${esc(group.label)}</b>`}<span class="muted text-sm">${esc(group.hint)}</span></div>
    ${segHtml(group, v)}
  </div>`;
}

function historyHtml(all) {
  if (!all.length) {
    return `<div class="empty"><div class="ic">${icon('calendar', { size: 26 })}</div>还没有复盘记录<br><span class="text-sm">每周一次，记得住的一周才算数</span></div>`;
  }
  return all.map((r) => {
    const d = r.doc || {};
    const chips = CHECKS.concat([ENERGY]).map((c) => {
      const v = c.key === 'energy' ? d.energy : (d.checks || {})[c.key];
      if (v == null) return '';
      const cls = Number(v) >= 2 ? 'chip chip-success' : (Number(v) === 1 ? 'chip chip-due' : 'chip chip-danger');
      return `<span class="${cls}">${esc(c.label)} ${Number(v)}</span>`;
    }).join('');
    const one = String(d.oneThing || '').trim();
    const err = String(d.errorPattern || '').trim();
    return `<div class="rv-row">
      <div class="rv-row-head">
        <b>${esc(r.weekStart)}</b>
        <span class="muted text-sm">${esc(weekRange(r.weekStart))}</span>
        <button class="btn btn-soft btn-sm rv-open" data-wk="${esc(r.weekStart)}">查看</button>
      </div>
      <div class="row gap-2" style="flex-wrap:wrap">${chips}</div>
      ${one ? `<div class="rv-row-line"><span class="muted text-sm">下周只改一件事</span><span>${esc(one)}</span></div>` : ''}
      ${err ? `<div class="rv-row-line"><span class="muted text-sm">待补问题</span><span>${esc(err)}</span></div>` : ''}
    </div>`;
  }).join('');
}

function body() {
  const all = reviewsSorted();
  const cur = isoWeek();
  const weekStart = sel || cur;
  const d = draft || loadDraft(weekStart);
  const exists = all.some((x) => x.weekStart === weekStart);
  const today = new Date().getDay();
  const nudge = (today === 0 && !all.some((x) => x.weekStart === cur));

  const opts = recentWeeks(12).map((w) =>
    `<option value="${w}" ${w === weekStart ? 'selected' : ''}>${w} · ${esc(weekRange(w))}${w === cur ? '（本周）' : ''}</option>`).join('');

  return `<div class="crumb"><a href="#/profile">我的学习</a><span class="sep">/</span><span>每周复盘</span></div>
    <div class="section-head"><div><h2>每周复盘</h2>
      <div class="sub">日连胜记录你有没有出现，周复盘决定下周改什么——两个节奏互不替代。</div></div>
      <span class="chip ${exists ? 'chip-success' : 'chip-due'}">${exists ? '本周已复盘' : '本周未复盘'}</span>
    </div>

    ${nudge ? `<div class="rv-nudge">${icon('calendar', { size: 16 })}<span>今天是周日。花五分钟把这一周记下来——下周的改动只从这里出，不从感觉出。</span></div>` : ''}

    <div class="card mb-6">
      <div class="card-title mb-3">选择周</div>
      <select class="input" id="rv-week" style="max-width:340px">${opts}</select>
      <p class="hint mt-2">一周的标准是：做了什么（有证据的才算），做到了什么水平，下周改哪一件事。</p>
    </div>

    <div class="card mb-6">
      <div class="card-title mb-2">四项检查（各 0–2）</div>
      <div class="muted text-sm mb-3">0 = 没做到，1 = 做了一部分，2 = 稳定做到。分数给的是这一周的真实情况，不是你的努力程度。</div>
      <div class="stack gap-4">${CHECKS.map((c) => checkRow(c, d)).join('')}</div>
    </div>

    <div class="card mb-6">
      <div class="card-title mb-3">${esc(ENERGY.label)}</div>
      ${checkRow(ENERGY, d, true)}
    </div>

    <div class="card mb-6">
      <div class="card-title mb-3">记录</div>
      <div class="form-grid">
        <label class="muted text-sm">本周证据（能拿出来看的才算）
          <input class="input" id="rv-evidence" value="${esc(d.evidence)}" placeholder="如：一段 2 分钟录音 / 一篇 200 词作文 / 模考 6.5">
        </label>
        <label class="muted text-sm">反复出现的错误
          <input class="input" id="rv-err" value="${esc(d.errorPattern)}" placeholder="如：第三人称单数 -s 总漏">
        </label>
      </div>
      <label class="muted text-sm mt-4" style="display:block">下周只改一件事
        <input class="input" id="rv-one" value="${esc(d.oneThing)}" placeholder="如：口语每天先录音再对稿，只练 Part 2">
      </label>
      <p class="hint mt-2">只写一件事。写三件等于一件都不改。</p>
    </div>

    <div class="card mb-6">
      <div class="card-title mb-3">判定</div>
      <div id="rv-verdict">${verdictHtml(weekStart, d)}</div>
    </div>

    <div class="row gap-3" style="flex-wrap:wrap">
      <button class="btn btn-primary" id="rv-save">${icon('check', { size: 16 })}<span>保存本周复盘</span></button>
      ${exists ? `<button class="btn btn-soft" id="rv-del">${icon('trash', { size: 15 })}<span>删除本周记录</span></button>` : ''}
      <a class="btn btn-soft" href="#/journal">${icon('doc', { size: 15 })}<span>学习状态档案</span></a>
      <a class="btn btn-soft" href="#/profile">${icon('chevron', { size: 15, class: 'rot-180' })}<span>返回我的学习</span></a>
    </div>

    <div class="card mt-6">
      <div class="card-title mb-3">历史记录</div>
      ${historyHtml(all)}
    </div>`;
}

export function render(segs) {
  const param = (segs && segs[0]) || null;
  sel = /^\d{4}-W\d{1,2}$/.test(param || '') ? param : null;
  const weekStart = sel || isoWeek();
  draft = loadDraft(weekStart);
  return `<div class="page" id="rv-root">${body()}</div>`;
}

// ---------------- 交互 ----------------
function paint() {
  if (!root) return;
  root.innerHTML = body();
  bind();
}

function readForm() {
  const d = draft || loadDraft(sel || isoWeek());
  const next = {
    checks: Object.assign({}, d.checks),
    energy: d.energy,
    evidence: val('rv-evidence'),
    errorPattern: val('rv-err'),
    oneThing: val('rv-one'),
    savedAt: d.savedAt,
  };
  return next;
}

function repaintVerdict() {
  const box = document.getElementById('rv-verdict');
  if (box) box.innerHTML = verdictHtml(sel || isoWeek(), draft);
}

function bind() {
  const weekSel = document.getElementById('rv-week');
  if (weekSel) {
    weekSel.addEventListener('change', () => {
      sel = weekSel.value;
      draft = loadDraft(sel);
      paint();
    });
  }

  document.querySelectorAll('#rv-root .seg').forEach((seg) => {
    const key = seg.getAttribute('data-group');
    seg.querySelectorAll('button').forEach((b) => {
      b.addEventListener('click', () => {
        const v = Number(b.getAttribute('data-v'));
        seg.querySelectorAll('button').forEach((x) => x.classList.toggle('active', x === b));
        if (key === 'energy') draft.energy = v;
        else draft.checks[key] = v;
        repaintVerdict();
      });
    });
  });

  ['rv-evidence', 'rv-err', 'rv-one'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', () => { draft = readForm(); repaintVerdict(); });
  });

  const save = document.getElementById('rv-save');
  if (save) save.addEventListener('click', () => {
    draft = readForm();
    const weekStart = sel || isoWeek();
    const set = CHECKS.map((c) => draft.checks[c.key]).filter((v) => v != null);
    if (set.length < CHECKS.length) { toast('四项检查还没打完分'); return; }
    if (!String(draft.oneThing).trim()) { toast('写下周只改的那件事'); return; }

    const now = Date.now();
    const record = {
      weekStart,
      doc: Object.assign({}, draft, { savedAt: new Date().toISOString() }),
      updatedAt: now,
    };
    const list = (getWeeklyReviews() || []).filter((x) => x && x.weekStart !== weekStart);
    list.push(record);
    setWeeklyReviews(list);
    scheduleSync(800);
    toast('已保存本周复盘，正在同步');
    draft = loadDraft(weekStart);
    paint();
  });

  const del = document.getElementById('rv-del');
  if (del) del.addEventListener('click', () => { askDelete(sel || isoWeek()); });

  document.querySelectorAll('#rv-root .rv-open').forEach((b) => {
    b.addEventListener('click', () => {
      const wk = b.getAttribute('data-wk');
      sel = wk;
      draft = loadDraft(wk);
      paint();
      if (root) root.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}

function askDelete(weekStart) {
  const box = modal(`
    <div class="modal-head">
      <h3>删除这一周的复盘</h3>
      <button class="icon-btn" onclick="closeModal()" aria-label="关闭">${icon('x', { size: 16 })}</button>
    </div>
    <p class="muted text-sm">${esc(weekStart)} 的记录会从本机和其他设备上一并移除。删掉很容易，但复盘的价值来自连续——不确定的话，留着。</p>
    <div class="row gap-2" style="justify-content:flex-end;margin-top:20px">
      <button class="btn btn-soft" id="rv-del-cancel">取消</button>
      <button class="btn btn-primary" id="rv-del-ok">确认删除</button>
    </div>`);
  box.querySelector('#rv-del-cancel').onclick = closeModal;
  box.querySelector('#rv-del-ok').onclick = () => {
    markReviewRemoved(weekStart);
    scheduleSync(800);
    closeModal();
    toast('已删除该周复盘');
    draft = loadDraft(weekStart);
    paint();
  };
}

render._init = function () {
  root = document.getElementById('rv-root');
  if (!root) return;
  draft = draft || loadDraft(sel || isoWeek());
  bind();
};

function val(id) { const el = document.getElementById(id); return el ? el.value.trim() : ''; }
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
