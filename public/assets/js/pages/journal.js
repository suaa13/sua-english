// pages/journal.js — 学习状态档案（Learning State）
// 结构借鉴 byoungd/up 的 learning state 记录法（目标 / 基线 / 已完成 / 待补 / 已验证方法 / 假设 / 下一步），
// 全部中文文案与字段设计为原创。核心原则：进度只认拿得出证据的产出，不认「学过了」。
import { store } from '../state.js';
import { icon, toast } from '../ui.js';
import { getLearningState, setLearningState, getCefr, scheduleSync } from '../sync.js';

const FIELDS = [
  {
    key: 'goal', label: '目标', rows: 2,
    hint: '12 周内能交出的一件具体事。写「一次 5 分钟英文汇报」，不要写「提高英语」。',
    ph: '如：12 周后能做一次 5 分钟英文工作汇报，听众不用切中文',
  },
  {
    key: 'baseline', label: '当前水平与基线', rows: 2,
    hint: '有证据的起点：能力诊断等级、最近一次模考、一段录音。拿不出来就先补一次诊断。',
    ph: '如：CEFR B1（8 月诊断）；模考 IELTS 5.5；口语录音 90 秒',
  },
  {
    key: 'done', label: '已完成', rows: 3,
    hint: '真正做完并且拿得出证据的部分。看过的课不算，做出来的才算。',
    ph: '如：听力专项 12 套；口语 Part 2 录音 8 段（第 1 段与第 8 段已存档）',
  },
  {
    key: 'gaps', label: '错误与待补', rows: 3,
    hint: '反复错的点，按题型或结构归类，不要按日期流水账。',
    ph: '如：听力地图题定位慢；第三人称单数 -s 漏写',
  },
  {
    key: 'methods', label: '已验证有效的方法', rows: 3,
    hint: '在你身上真的奏效的做法——不是收藏夹里的方法。写清做法，以及它改变了哪个数字。',
    ph: '如：影子跟读 15 分钟/天，听力细节题由 5/10 升到 8/10',
  },
  {
    key: 'hypotheses', label: '待验证假设', rows: 2,
    hint: '还没验证的猜测。写成两星期内能被证实或推翻的一句话。',
    ph: '如：把精读挪到早上，长难句理解会更好（两周后对比正确率）',
  },
];

const NEXT_N = 3;

function emptyDoc() {
  const doc = {};
  FIELDS.forEach((f) => { doc[f.key] = ''; });
  doc.next = Array.from({ length: NEXT_N }, () => ({ task: '', mins: '', evidence: '' }));
  return doc;
}

function loadDoc() {
  const s = getLearningState();
  const src = (s && s.doc) || {};
  const doc = emptyDoc();
  FIELDS.forEach((f) => { if (typeof src[f.key] === 'string') doc[f.key] = src[f.key]; });
  if (Array.isArray(src.next)) {
    doc.next = Array.from({ length: NEXT_N }, (_, i) => {
      const it = src.next[i] || {};
      return { task: String(it.task || ''), mins: it.mins == null ? '' : String(it.mins), evidence: String(it.evidence || '') };
    });
  }
  return doc;
}

/** 错题本里出现次数最多的题型，用于「带入待补」。 */
function topErrorTags(n = 3) {
  const count = new Map();
  (store.state.errors || []).forEach((e) => {
    const t = String(e.tag || e.type || '').trim();
    if (t) count.set(t, (count.get(t) || 0) + 1);
  });
  return Array.from(count.entries()).sort((a, b) => b[1] - a[1]).slice(0, n).map(([t, c]) => ({ tag: t, count: c }));
}

function planCard() {
  const pl = store.state.plan;
  if (!pl) {
    return `<div class="card mb-6">
      <div class="card-title mb-2">每日计划联动</div>
      <div class="hint">还没有生成学习计划。「下一步」写的是这一周要推进的最小任务，需要一条每日路线来托住它。</div>
      <a class="btn btn-soft btn-sm mt-3" href="#/plan">${icon('calendar', { size: 15 })}<span>去生成学习计划</span></a>
    </div>`;
  }
  const exam = String(pl.input?.exam || '').toUpperCase();
  const target = pl.input?.target ?? '';
  const today = Array.isArray(pl.todayTask) ? pl.todayTask : [];
  return `<div class="card mb-6">
    <div class="card-title mb-3">每日计划联动</div>
    <div class="row gap-3 mb-3" style="flex-wrap:wrap">
      <span class="chip chip-due">${esc(exam)} ${esc(String(target))}</span>
      <span class="chip">${esc(String(pl.totalWeeks || ''))} 周路线</span>
      <span class="chip">每天 ${esc(String(pl.input?.dailyMins || ''))} 分钟</span>
      ${pl.examDay ? `<span class="chip">考试日 ${esc(String(pl.examDay))}</span>` : ''}
    </div>
    ${today.length ? `<div class="muted text-sm mb-2">今天该学什么</div><div class="row gap-2" style="flex-wrap:wrap">${today.map((t) => `<span class="chip">${esc(String(t))}</span>`).join('')}</div>` : ''}
    <a class="btn btn-soft btn-sm mt-3" href="#/plan">${icon('calendar', { size: 15 })}<span>查看完整计划</span></a>
  </div>`;
}

function fieldHtml(f, doc) {
  return `<div class="jr-block">
    <label class="jr-label" for="jr-${f.key}">${esc(f.label)}</label>
    <div class="hint mb-2">${esc(f.hint)}</div>
    <textarea class="input textarea" id="jr-${f.key}" rows="${f.rows}" placeholder="${esc(f.ph)}">${esc(doc[f.key] || '')}</textarea>
  </div>`;
}

function nextRows(doc) {
  return doc.next.map((it, i) => `<div class="jr-next">
    <div class="jr-next-i">${i + 1}</div>
    <input class="input" data-next="task" data-i="${i}" value="${esc(it.task)}" placeholder="最小任务：这一步做完就能勾掉">
    <input class="input jr-mins" type="number" min="0" step="5" data-next="mins" data-i="${i}" value="${esc(it.mins)}" placeholder="分钟">
    <input class="input" data-next="evidence" data-i="${i}" value="${esc(it.evidence)}" placeholder="完成证据：做完留下的东西">
  </div>`).join('');
}

export function render() {
  const doc = loadDoc();
  const s = getLearningState();
  const updated = s && (s.updatedAt || s.createdAt) ? new Date(s.updatedAt || s.createdAt).toLocaleString('zh-CN') : '';
  const tags = topErrorTags(3);
  const cefr = getCefr();

  return `<div class="page"><div class="crumb"><a href="#/profile">我的学习</a><span class="sep">/</span><span>学习状态档案</span></div>
    <div class="section-head"><div><h2>学习状态档案</h2>
      <div class="sub">一页写清楚：要到哪、现在在哪、已经做成什么、下一步做什么。每周更新一次就够了。</div></div>
      ${updated ? `<span class="muted text-sm">更新于 ${esc(updated)}</span>` : ''}
    </div>

    ${planCard()}

    <div class="card mb-6">
      <div class="card-title mb-2">目标与基线</div>
      <div class="stack gap-5">${[FIELDS[0], FIELDS[1]].map((f) => fieldHtml(f, doc)).join('')}</div>
      <div class="row gap-2 mt-3" style="flex-wrap:wrap">
        ${cefr ? `<button class="btn btn-soft btn-sm" id="jr-cefr">${icon('compass', { size: 15 })}<span>带入能力诊断结果</span></button>` : `<a class="btn btn-soft btn-sm" href="#/diagnostic">${icon('compass', { size: 15 })}<span>先做能力诊断</span></a>`}
      </div>
    </div>

    <div class="card mb-6">
      <div class="card-title mb-2">进展：做成了什么，还差什么</div>
      <div class="stack gap-5">${[FIELDS[2], FIELDS[3]].map((f) => fieldHtml(f, doc)).join('')}</div>
      ${tags.length ? `<div class="row gap-2 mt-3" style="flex-wrap:wrap">
        <span class="muted text-sm">错题本高频：</span>
        ${tags.map((t) => `<span class="chip chip-danger">${esc(t.tag)} ${t.count}</span>`).join('')}
        <button class="btn btn-soft btn-sm" id="jr-tags">${icon('alert', { size: 15 })}<span>带入待补</span></button>
      </div>` : ''}
    </div>

    <div class="card mb-6">
      <div class="card-title mb-2">方法与假设</div>
      <div class="stack gap-5">${[FIELDS[4], FIELDS[5]].map((f) => fieldHtml(f, doc)).join('')}</div>
      <p class="hint mt-3">方法要写清「做了什么 + 哪个数字变了」，假设要写清「怎么验证」。两者都不写，就等于没有。</p>
    </div>

    <div class="card mb-6">
      <div class="card-title mb-2">下一步（最多三条）</div>
      <div class="muted text-sm mb-3">每条都是能在一周内做完的最小任务，并且留下一份证据。三条以上等于没有重点。</div>
      <div class="stack gap-3">${nextRows(doc)}</div>
    </div>

    <div class="row gap-3" style="flex-wrap:wrap">
      <button class="btn btn-primary" id="jr-save">${icon('check', { size: 16 })}<span>保存并同步</span></button>
      <a class="btn btn-soft" href="#/review">${icon('calendar', { size: 15 })}<span>去做本周复盘</span></a>
      <a class="btn btn-soft" href="#/profile">${icon('chevron', { size: 15, class: 'rot-180' })}<span>返回我的学习</span></a>
    </div>
  </div>`;
}

render._init = function () {
  const root = document.getElementById('app');

  const read = () => {
    const doc = emptyDoc();
    FIELDS.forEach((f) => {
      const el = root.querySelector(`#jr-${f.key}`);
      if (el) doc[f.key] = el.value.trim();
    });
    doc.next = Array.from({ length: NEXT_N }, (_, i) => ({ task: '', mins: '', evidence: '' }));
    root.querySelectorAll('[data-next]').forEach((el) => {
      const i = Number(el.getAttribute('data-i'));
      const k = el.getAttribute('data-next');
      if (doc.next[i]) doc.next[i][k] = String(el.value || '').trim();
    });
    return doc;
  };

  const save = root.querySelector('#jr-save');
  if (save) save.addEventListener('click', () => {
    const doc = read();
    const prev = getLearningState();
    const now = Date.now();
    setLearningState({
      doc,
      createdAt: prev?.createdAt || now,
      updatedAt: now,
    });
    scheduleSync(800);
    toast('已保存学习状态档案，正在同步');
  });

  const cefrBtn = root.querySelector('#jr-cefr');
  if (cefrBtn) cefrBtn.addEventListener('click', () => {
    const c = getCefr() || {};
    const sk = c.skills || {};
    const SK = { listening: '听力', reading: '阅读', speaking: '口语', writing: '写作' };
    const parts = Object.keys(SK).filter((k) => sk[k]).map((k) => `${SK[k]} ${sk[k]}`);
    const line = `CEFR ${c.overall || ''}${parts.length ? `（${parts.join(' / ')}）` : ''}`;
    const el = root.querySelector('#jr-baseline');
    if (!el) return;
    const cur = el.value.trim();
    if (cur && !cur.includes(line)) el.value = `${cur}\n${line}`;
    else if (!cur) el.value = line;
    toast('已带入能力诊断结果');
  });

  const tagBtn = root.querySelector('#jr-tags');
  if (tagBtn) tagBtn.addEventListener('click', () => {
    const tags = topErrorTags(3).map((t) => t.tag);
    if (!tags.length) return;
    const el = root.querySelector('#jr-gaps');
    if (!el) return;
    const cur = el.value.trim();
    const add = tags.filter((t) => !cur.includes(t));
    if (!add.length) { toast('待补里已经有了'); return; }
    el.value = cur ? `${cur}；${add.join('；')}` : add.join('；');
    toast('已带入高频错误类型');
  });
};

function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
