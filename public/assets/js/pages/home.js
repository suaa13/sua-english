// pages/home.js
import { store, accuracy, levelToLabel } from '../state.js';
import { getCefr } from '../sync.js';
import { icon } from '../ui.js';
import { donut, radar, barChart } from '../charts.js';

// CEFR → IELTS 分数带（通行对照：A1≈2.0 … C2≈8.5）
const CEFR_TO_BAND = { A1: 2.0, A2: 3.0, B1: 4.5, B2: 6.0, C1: 7.5, C2: 8.5 };

function skillEstimates() {
  const lv = store.state.user.level;
  const base = { beginner: 2, elementary: 3.5, intermediate: 5, upper: 6.5, advanced: 7.5 }[lv] || 3;
  const m = store.state.mocks[0];
  if (m && m.scores) {
    return { Listening: m.scores.listening || base, Reading: m.scores.reading || base, Writing: m.scores.writing || base, Speaking: m.scores.speaking || base, real: 'mock' };
  }
  // 有能力诊断结果 → 按四项 CEFR 等级换算，未诊断的单项回落到等级基数
  const cefrSkills = getCefr()?.skills;
  if (cefrSkills) {
    const band = (k) => CEFR_TO_BAND[cefrSkills[k]] ?? base;
    return { Listening: band('listening'), Reading: band('reading'), Writing: band('writing'), Speaking: band('speaking'), real: 'cefr' };
  }
  // 无模考也无诊断 → 四项统一用等级基数预估，不再编造 ±0.3 的假差异
  return { Listening: base, Reading: base, Writing: base, Speaking: base, real: false };
}

export function render() {
  const u = store.state.user;
  const authed = store.isAuthed();      // 游客态不展示任何"用户数据"，一律占位
  const dash = '<span class="muted">—</span>';
  const s = skillEstimates();
  const vs = store.vocabStats();
  const days = store.daysActive();
  const streak = u.streak;
  const vocabSize = store.vocabSizeGuess();
  const items = store.totalItems();
  const tasks = (store.state.plan && store.state.plan.todayTask) || ['每日单词 15 个', '语法基础课 1 节', '跟读练习 5 分钟'];
  const recent = store.state.activity.slice(-4).reverse();

  const radarData = [
    { label: '听力', value: s.Listening }, { label: '阅读', value: s.Reading },
    { label: '写作', value: s.Writing }, { label: '口语', value: s.Speaking },
  ];

  const overall = Math.round(((s.Listening + s.Reading + s.Writing + s.Speaking) / 4) * 10) / 10;

  return `
  <div class="page">
    <!-- Hero -->
    <section class="hero">
      <div class="row gap-2" style="margin-bottom:14px"><span class="badge badge-brand">${icon('sparkles', { size: 14 })} AI 驱动的一站式英语学习</span></div>
      <h1>从真正的英语 0 基础，<br>一路走到 IELTS / TOEFL。</h1>
      <p class="lead">课程 + 练习 + 真题 + AI Tutor + 模考 + 学习数据，一体化 AI 英语学习系统。不需要自己研究「该学什么」——系统直接告诉你从哪里开始、今天学什么、哪里错了、下一步怎么走。</p>
      <div class="row gap-3 mt-5">
        <a class="btn btn-primary btn-lg" href="#/learn">${icon('book', { size: 18 })}<span>开始学习</span></a>
        <a class="btn btn-lg" href="#/partner">${icon('sparkles', { size: 18 })}<span>和 AI 英语伙伴聊聊</span></a>
      </div>
    </section>

    <!-- Stats -->
    <section class="grid grid-4 mb-6">
      ${statCard(icon('flame'), authed ? days : dash, '学习天数', 'var(--c-read)')}
      ${statCard(icon('star'), authed ? streak : dash, '连续学习', 'var(--c-speak)')}
      ${statCard(icon('book'), authed ? vocabSize.toLocaleString() : dash, '词汇量', 'var(--c-vocab)')}
      ${statCard(icon('check'), authed ? items : dash, '完成题目', 'var(--c-grammar)')}
    </section>
    ${authed ? '' : guestBanner()}

    <!-- Progress + Today -->
    <section class="split mb-6">
      <div class="card">
        <div class="row between" style="margin-bottom:18px">
          <div><div class="card-title">当前学习进度</div><div class="card-sub">基于你的学习与测评数据</div></div>
          <span class="badge badge-brand">${u.exam.toUpperCase()}</span>
        </div>
        <div class="row gap-6 wrap" style="align-items:center">
          <div style="flex:0 0 auto">${authed
            ? donut(Math.min(100, overall / 9 * 100), { label: overall.toFixed(1), sub: '预估总评', color: 'var(--brand)', size: 130 })
            : donut(0, { label: '—', sub: '预估总评', color: 'var(--brand)', size: 130 })}</div>
          <div class="chart-pane">${barChart([
            { label: '听力', value: s.Listening, color: 'var(--c-listen)' },
            { label: '阅读', value: s.Reading, color: 'var(--c-read)' },
            { label: '写作', value: s.Writing, color: 'var(--c-write)' },
            { label: '口语', value: s.Speaking, color: 'var(--c-speak)' },
          ].map(b => (authed ? b : { ...b, value: 0 })), { height: 180 })}</div>
        </div>
        <div class="hint mt-3">${!authed ? '注册并登录后，这里才会记录并显示你的真实学习数据。' : s.real === 'mock' ? '数据来自最近一次模考。' : s.real === 'cefr' ? '预估来自你的能力诊断结果；去「模拟考试」获得真实成绩。' : '尚未模考与诊断，显示为按当前水平的保守预估；去「能力诊断」或「模拟考试」获得更准的结果。'}</div>
      </div>

      <div class="card">
        <div class="row between" style="margin-bottom:14px">
          <div class="card-title">今日学习任务</div>
          <span class="badge">${new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })}</span>
        </div>
        <div class="stack gap-2" id="today-tasks">
          ${tasks.map((t, i) => `<label class="list-item" style="cursor:pointer">
            <input type="checkbox" class="task-chk" data-i="${i}" style="width:18px;height:18px;accent-color:var(--brand)">
            <span class="task-txt">${icon('list', { size: 16 })} ${t}</span>
          </label>`).join('')}
        </div>
        <a class="btn btn-soft btn-block mt-4" href="#/learn">${icon('arrowR', { size: 15 })}<span>进入学习中心</span></a>
      </div>
    </section>

    <!-- Targets -->
    <section class="grid grid-3 mb-6">
      ${infoCard('target', '当前英语水平', levelToLabel(u.level), '基于你的自测与学习记录')}
      ${infoCard('globe', 'IELTS 目标分数', u.ieltsTarget.toFixed(1), 'Academic / General 通用目标')}
      ${infoCard('flag', 'TOEFL 目标分数', u.toeflTarget.toString(), '2026 新版 0–120 制')}
    </section>

    <!-- AI Partner + 4 skills + recent -->
    <section class="split mb-6">
      <div class="card ai-panel">
        <div class="row gap-3" style="margin-bottom:10px"><span class="brand-mark" style="width:40px;height:40px">AI</span>
          <div><div class="card-title">AI English Partner</div><div class="card-sub">随时陪你练口语、讲语法、改作文</div></div></div>
        <p class="muted" style="margin:8px 0 16px">三种模式：日常闲聊、IELTS Speaking 模拟考官、TOEFL Speaking 训练。也可以随时问「为什么这里用 have？」「我作文为什么只有 5.5？」</p>
        <div class="row gap-2 wrap">
          <a class="btn btn-primary" href="#/partner">${icon('chat', { size: 16 })}<span>开始对话</span></a>
          <a class="btn" href="#/partner/casual">Casual</a>
          <a class="btn" href="#/partner/ielts">IELTS 模式</a>
          <a class="btn" href="#/partner/toefl">TOEFL 模式</a>
        </div>
      </div>
      <div class="card">
        <div class="card-title" style="margin-bottom:10px">四项能力雷达</div>
        ${radar(radarData, { size: 230 })}
        <div class="hint center-text mt-2">听 · 读 · 写 · 说，哪一格最扁就从哪格开始补。</div>
      </div>
    </section>

    <!-- Recent -->
    <section>
      <div class="section-head"><div><h2>最近学习内容</h2><div class="sub">系统记录你的每一次学习与练习</div></div><a class="btn btn-ghost btn-sm" href="#/profile">查看全部</a></div>
      ${recent.length ? `<div class="card card-pad-sm">` + recent.map(a => `<div class="list-item"><span class="dot dot-success"></span><div class="full"><div class="strong" style="font-size:14px">${a.date}</div><div class="muted text-sm">学习 ${a.mins || 0} 分钟 · 完成 ${a.items || 0} 项</div></div></div><div class="list-divider"></div>`).join('').replace(/<div class="list-divider"><\/div>$/, '') + `</div>`
        : `<div class="card card-pad-sm empty" style="padding:32px"><div class="muted">还没有学习记录，点「开始学习」开启第一天吧。</div></div>`}
    </section>
  </div>`;
}

/** 未注册时的引导条：说明数据只属于账号，注册后才会开始记录。 */
function guestBanner() {
  return `<section class="card mb-6" style="border:1px dashed var(--border);background:var(--surface-2)">
    <div class="row between gap-4 wrap">
      <div>
        <div class="card-title">你正在以游客身份浏览</div>
        <div class="muted text-sm mt-1">词库、课程、真题都可以直接体验；但学习记录、错题本、进度与模考成绩属于账号数据 —— 注册后才会开始记录，并保存在云端（换设备也不会丢）。</div>
      </div>
      <div class="row gap-2">
        <a class="btn btn-primary" href="#/auth">注册 / 登录</a>
      </div>
    </div>
  </section>`;
}

function statCard(ic, val, lbl, color) {
  return `<div class="card card-pad-sm"><div class="row gap-3" style="color:${color}">${ic}</div><div class="stat mt-3"><span class="val">${val}</span><span class="lbl">${lbl}</span></div></div>`;
}
function infoCard(ic, title, val, sub) {
  return `<div class="card card-pad-sm card-center"><div class="row gap-3" style="color:var(--brand)">${icon(ic, { size: 22 })}</div><div class="mt-3"><div class="muted text-sm">${title}</div><div class="val" style="font-size:26px;font-weight:760;letter-spacing:-0.02em">${val}</div><div class="hint">${sub}</div></div></div>`;
}

window.addEventListener('page:rendered', (e) => {
  if (e.detail.seg !== 'home') return;
  document.querySelectorAll('.task-chk').forEach(chk => {
    chk.addEventListener('change', () => {
      const txt = chk.closest('.list-item').querySelector('.task-txt');
      txt.style.textDecoration = chk.checked ? 'line-through' : 'none';
      txt.style.opacity = chk.checked ? '0.5' : '1';
      if (chk.checked) { store.recordActivity(10, 1); }
    });
  });
});
