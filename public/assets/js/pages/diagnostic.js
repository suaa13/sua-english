// pages/diagnostic.js — CEFR 能力诊断（原创改写自 byoungd/up 的 CEFR 方法论，仅借鉴结构）
// 流程：选综合等级 → 听说读写四项各做一次微任务并 0-2 自评 → 填 12 周真实目标 → 保存并同步。
import { getCefr, setCefr, scheduleSync } from '../sync.js';
import { icon, toast } from '../ui.js';

// CEFR 等级（欧洲委员会 Global Scale 的原创中文概括，公共方法论）
const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const LEVEL_DESC = {
  A1: '能理解并使用非常常见的表达；对方说得慢、愿意帮助时能简单互动。',
  A2: '能处理个人信息、购物、地点、工作等熟悉主题的直接交流。',
  B1: '能理解熟悉主题的主要意思；在旅行与日常场景中应对，并简单说明经历、计划与理由。',
  B2: '能理解具体或抽象复杂文本的主要观点；与熟练使用者较自然地互动，并清楚表达立场。',
  C1: '能理解要求高、篇幅长的材料并把握隐含意义；在学术、职业和社会场景中灵活表达。',
  C2: '几乎能轻松理解听到或读到的内容；能综合不同来源、重构论点并精确表达细微差别。',
};
const SKILLS = [
  { key: 'listening', label: '听力' },
  { key: 'reading', label: '阅读' },
  { key: 'speaking', label: '口语' },
  { key: 'writing', label: '写作' },
];
// 四项微任务（原创，非照搬 up 模板）：各 10–20 分钟，先不查词完成第一版。
const MICRO = {
  listening: '听 2–4 分钟材料，写下主旨、3 个细节，再复述。',
  reading: '读 600–1000 词文章，写五句摘要并提一个质疑。',
  speaking: '不读稿录 2 分钟，解释一段经历、观点或流程。',
  writing: '20 分钟写 180–250 词邮件、说明或短文。',
};

function row(skill) {
  const opts = LEVELS.map(l => `<option value="${l}">${l}</option>`).join('');
  return `<div class="cefr-skill">
    <div class="cefr-skill-head"><b>${skill.label}</b><span class="muted text-sm">${MICRO[skill.key]}</span></div>
    <div class="cefr-skill-ctrl">
      <label class="muted text-sm">分项等级</label>
      <select class="input" data-skill="${skill.key}">${opts}</select>
      <label class="muted text-sm">本次自评 (0–2)</label>
      <div class="seg" data-rate="${skill.key}">
        <button type="button" data-v="0">0 未完成</button>
        <button type="button" data-v="1">1 部分</button>
        <button type="button" data-v="2">2 稳定</button>
      </div>
    </div>
  </div>`;
}

export function render() {
  const c = getCefr() || {};
  const cur = c.overall || 'A1';
  const skills = c.skills || {};
  const diag = c.diagnostic || {};
  const goal = c.goal12w || {};

  const levelOpts = LEVELS.map(l =>
    `<option value="${l}" ${l === cur ? 'selected' : ''}>${l} · ${LEVEL_DESC[l].slice(0, 12)}…</option>`).join('');

  return `<div class="page"><div class="crumb"><a href="#/profile">我的学习</a><span class="sep">/</span><span>能力诊断</span></div>
    <div class="section-head"><div><h2>能力诊断（CEFR）</h2>
      <div class="sub">CEFR 描述的是「在真实情境能完成什么」，不是积分或词汇量。先选你稳定做到的等级，再对四项各做一次小任务并自评。</div></div></div>

    <div class="card mb-6">
      <div class="card-title mb-3">综合等级</div>
      <select class="input" id="cefr-overall" style="max-width:320px">${levelOpts}</select>
      <p class="hint mt-2" id="cefr-level-desc">${LEVEL_DESC[cur]}</p>
    </div>

    <div class="card mb-6">
      <div class="card-title mb-2">四项能力（各选等级 + 做一次微任务自评）</div>
      <div class="muted text-sm mb-3">微任务先不查词完成第一版，再按「任务完成 / 可理解度 / 准确 / 组织 / 修订」整体自评 0–2。</div>
      <div class="stack gap-4">${SKILLS.map(row).join('')}</div>
    </div>

    <div class="card mb-6">
      <div class="card-title mb-3">12 周真实目标</div>
      <div class="form-grid">
        <label class="muted text-sm">真实场景<input class="input" id="goal-scene" value="${esc(goal.scene || '')}" placeholder="如：工作汇报 / 出国旅行"></label>
        <label class="muted text-sm">具体任务<input class="input" id="goal-task" value="${esc(goal.task || '')}" placeholder="如：一次 5 分钟英文汇报"></label>
        <label class="muted text-sm">质量门槛<input class="input" id="goal-bar" value="${esc(goal.qualityBar || '')}" placeholder="如：听众无需切中文也能复述要点"></label>
        <label class="muted text-sm">到期 / 证据<input class="input" id="goal-due" value="${esc(goal.due || '')}" placeholder="如：12 周后保存第 1/4/8/12 周样本"></label>
      </div>
    </div>

    <div class="row gap-3">
      <button class="btn btn-primary" id="cefr-save">${icon('check', { size: 16 })}<span>保存并同步</span></button>
      <a class="btn btn-soft" href="#/profile">${icon('chevron', { size: 15, class: 'rot-180' })}<span>返回我的学习</span></a>
    </div>
    <p class="hint mt-3" id="cefr-hint">未登录时仅保存在本机；登录后会随学习数据一起跨设备同步。</p>
  </div>`;
}

// 页面渲染后绑定交互（router 调用 render._init）
render._init = function () {
  const overall = document.getElementById('cefr-overall');
  if (overall) overall.addEventListener('change', () => {
    const d = document.getElementById('cefr-level-desc');
    if (d) d.textContent = LEVEL_DESC[overall.value];
  });

  // 自评分段按钮
  document.querySelectorAll('.cefr-skill .seg').forEach(seg => {
    const key = seg.getAttribute('data-rate');
    const saved = (getCefr()?.diagnostic?.rates || {})[key];
    const paint = (v) => seg.querySelectorAll('button').forEach(b => b.classList.toggle('active', b.getAttribute('data-v') === String(v)));
    if (saved != null) paint(saved);
    seg.querySelectorAll('button').forEach(b => b.addEventListener('click', () => { paint(b.getAttribute('data-v')); seg._rate = b.getAttribute('data-v'); }));
  });

  const save = document.getElementById('cefr-save');
  if (save) save.addEventListener('click', () => {
    const rates = {};
    document.querySelectorAll('.cefr-skill .seg').forEach(seg => { rates[seg.getAttribute('data-rate')] = Number(seg._rate ?? 0); });
    const skills = {};
    document.querySelectorAll('.cefr-skill select[data-skill]').forEach(s => { skills[s.getAttribute('data-skill')] = s.value; });

    const now = Date.now();
    const prev = getCefr() || {};
    const next = {
      overall: overall?.value || 'A1',
      skills,
      diagnostic: { rates, date: new Date().toISOString().slice(0, 10), note: '首次诊断样本留痕' },
      goal12w: {
        scene: val('goal-scene'), task: val('goal-task'), qualityBar: val('goal-bar'), due: val('goal-due'),
      },
      createdAt: prev.createdAt || now,
      updatedAt: now,
    };
    setCefr(next);
    scheduleSync(800);
    toast('已保存能力诊断，正在同步');
    setTimeout(() => { location.hash = '#/profile'; }, 700);
  });
};

function val(id) { const el = document.getElementById(id); return el ? el.value.trim() : ''; }
function esc(s) { return (s || '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
