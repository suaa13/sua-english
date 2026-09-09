// pages/profile.js — My Learning / 我的学习
import { store, accuracy } from '../state.js';
import { icon, toast } from '../ui.js';
import { getCefr, getWeeklyReviews, getLearningState, isLocalOnly, setLocalOnly, syncLabel } from '../sync.js';
import { downloadBackup, readBackupFile, applyBackup, backupSize } from '../backup.js';
import { isoWeek, weekRange } from './review.js';
import { donut, barChart, lineChart, radar } from '../charts.js';

export function render() {
  const u = store.state.user;
  const days = store.daysActive();
  const streak = u.streak;
  const mins = store.totalMins();
  const items = store.totalItems();
  const vs = store.vocabStats();
  const vocabSize = 800 + store.state.activity.reduce((a, x) => a + (x.items || 0) * 2, 0);
  const acc = accuracy();
  const m = store.mockStats();
  const ieltsEst = m?.latest && m.latest.exam === 'ielts' ? m.latest.score : est(5.5, u.level);
  const toeflEst = m?.latest && m.latest.exam === 'toefl' ? m.latest.score : est(70, u.level, true);

  const skills = m?.latest?.scores ? [
    { label: '听力', value: m.latest.scores.listening }, { label: '阅读', value: m.latest.scores.reading },
    { label: '写作', value: m.latest.scores.writing }, { label: '口语', value: m.latest.scores.speaking },
  ] : [
    { label: '听力', value: est(5.5, u.level) }, { label: '阅读', value: est(6, u.level) },
    { label: '写作', value: est(5.2, u.level) }, { label: '口语', value: est(5.5, u.level) },
  ];

  // CEFR 能力档案（来自同步层；未做诊断时引导去诊断）
  const cefr = getCefr();
  const SK = { listening: '听力', reading: '阅读', speaking: '口语', writing: '写作' };
  const cefrCard = cefr ? `
    <div class="card mb-6">
      <div class="card-title mb-3">CEFR 能力等级</div>
      <div class="row gap-3 mb-3" style="align-items:center">
        <span class="cefr-badge">${cefr.overall || 'A1'}</span>
        <span class="muted text-sm">综合等级 · 更新于 ${new Date(cefr.updatedAt || cefr.createdAt || Date.now()).toLocaleDateString('zh-CN')}</span>
      </div>
      <div class="row gap-2" style="flex-wrap:wrap">
        ${Object.keys(SK).map(k => `<span class="chip">${SK[k]} ${cefr.skills?.[k] || '—'}</span>`).join('')}
      </div>
      <a class="btn btn-soft btn-sm mt-3" href="#/diagnostic">${icon('compass', { size: 15 })}<span>重新诊断</span></a>
    </div>`
    : `
    <div class="card mb-6">
      <div class="card-title mb-3">CEFR 能力等级</div>
      <div class="hint">还没有做能力诊断。CEFR 等级按「真实情境能完成什么」给你分级，比只看考试目标更能反映起点。</div>
      <a class="btn btn-primary btn-sm mt-3" href="#/diagnostic">${icon('compass', { size: 15 })}<span>去做能力诊断</span></a>
    </div>`;

  // 每周复盘 / 学习状态档案 入口（日连胜之外，周节奏的落脚点）
  const curWeek = isoWeek();
  const rv = (getWeeklyReviews() || []).find((x) => x && x.weekStart === curWeek);
  const rvDone = Boolean(rv);
  const rvThing = rv && rv.doc ? String(rv.doc.oneThing || '').trim() : '';
  const st = getLearningState();
  const stNext = st && st.doc && Array.isArray(st.doc.next) ? st.doc.next.filter((x) => x && String(x.task || '').trim()) : [];
  const stUpdated = st && (st.updatedAt || st.createdAt) ? new Date(st.updatedAt || st.createdAt).toLocaleDateString('zh-CN') : '';

  // 学习积分卡：登录展示余额 + 签到；未登录给注册引导（注册即送 10 分）
  const creditsCard = store.isAuthed() ? `
    <div class="card">
      <div class="row gap-2" style="color:var(--brand)">${icon('sparkles', { size: 18 })}<b>学习积分</b></div>
      <div class="card-sub">AI 陪练每次消耗 1 积分 · 填自己的 API Key 不消耗</div>
      <div class="row gap-2 mt-3" style="align-items:center;flex-wrap:wrap">
        <span class="credit-chip" title="使用平台 AI 每次消耗 1 积分"><b id="pr-credit-num">${u.credits ?? 0}</b> 积分</span>
        <button class="btn btn-ghost btn-sm" id="pr-checkin" title="每日签到 +5 积分">${icon('check', { size: 14 })}<span id="pr-checkin-txt">签到 +5</span></button>
      </div>
      <div class="hint mt-3">每日签到得 5 积分，用于 AI 陪练对话与口语点评。</div>
    </div>` : `
    <a class="card card-click" href="#/auth">
      <div class="row gap-2" style="color:var(--brand)">${icon('sparkles', { size: 18 })}<b>学习积分</b></div>
      <div class="card-sub">登录后每日签到领积分，兑换 AI 陪练</div>
      <div class="hint mt-3">注册即送 10 积分，每天签到再得 5 分。</div>
    </a>`;

  const metaCards = `
    <div class="grid grid-3 mb-6">
      <a class="card card-click" href="#/review">
        <div class="row gap-2" style="color:var(--brand)">${icon('calendar', { size: 18 })}<b>每周复盘</b></div>
        <div class="card-sub">${curWeek} · ${weekRange(curWeek)}</div>
        <div class="row gap-2 mt-3" style="flex-wrap:wrap">
          <span class="chip ${rvDone ? 'chip-success' : 'chip-due'}">${rvDone ? '本周已复盘' : '本周未复盘'}</span>
        </div>
        ${rvThing ? `<div class="hint mt-3">下周只改：${esc(rvThing)}</div>` : `<div class="hint mt-3">四项打分 + 下周只改一件事，五分钟填完。</div>`}
      </a>
      <a class="card card-click" href="#/journal">
        <div class="row gap-2" style="color:var(--brand)">${icon('doc', { size: 18 })}<b>学习状态档案</b></div>
        <div class="card-sub">目标 · 基线 · 已验证方法 · 下一步</div>
        <div class="row gap-2 mt-3" style="flex-wrap:wrap">
          <span class="chip ${stNext.length ? 'chip-success' : 'chip-due'}">${stNext.length ? `下一步 ${stNext.length} 条` : '未填写下一步'}</span>
          ${stUpdated ? `<span class="chip">更新于 ${stUpdated}</span>` : ''}
        </div>
        <div class="hint mt-3">${st ? '一页写清楚现在到哪、下一步做什么。' : '还没建立档案，先写下目标和基线。'}</div>
      </a>
      ${creditsCard}
    </div>`;

  // 数据与存储：让用户自己决定学习数据是否离开这台设备，并留一份可带走的备份
  const dataCard = dataPrivacyCard();

  // trend: activity by date (last 14)
  const act = store.state.activity.slice(-14);
  const trend = act.map(a => ({ l: a.date.slice(5), v: a.mins || 0 }));
  if (!trend.length) trend.push({ l: '—', v: 0 });

  return `<div class="page"><div class="crumb"><a href="#/home">首页</a><span class="sep">/</span><span>我的学习</span></div>
    <div class="section-head"><div><h2>我的学习</h2><div class="sub">${u.name} · ${levelLabel(u.level)}</div></div>
      <a class="btn btn-soft btn-sm" href="#/auth">${icon('settings', { size: 15 })}<span>账户设置</span></a></div>

    <div class="grid grid-4 mb-6">
      ${stat(icon('flame'), streak, '连续学习 (天)')}
      ${stat(icon('clock'), fmtMins(mins), '总学习时间')}
      ${stat(icon('book'), vocabSize.toLocaleString(), '词汇量')}
      ${stat(icon('check'), items, '完成题目')}
    </div>

    ${cefrCard}

    ${metaCards}

    ${dataCard}

    <div class="split mb-6">
      <div class="card">
        <div class="card-title mb-3">学习趋势（近期每日时长）</div>
        ${lineChart(trend, { height: 200 })}
        <div class="hint center-text mt-2">坚持每天学习，曲线会越来越好看。</div>
      </div>
      <div class="card">
        <div class="card-title mb-3">正确率</div>
        <div class="center-text" style="padding:12px 0">${donut(acc, { label: acc + '%', sub: '综合正确率', size: 150 })}</div>
        <div class="row between mt-3"><span class="muted text-sm">已掌握单词</span><b>${vs.known}</b></div>
        <div class="row between"><span class="muted text-sm">学习中</span><b>${vs.learning}</b></div>
        <div class="row between"><span class="muted text-sm">未学习</span><b>${vs.new}</b></div>
      </div>
    </div>

    <div class="grid grid-2 mb-6">
      <div class="card">
        <div class="card-title mb-3">预计考试成绩</div>
        <div class="grid grid-2 gap-4">
          <div class="ai-panel center-text"><div class="muted text-sm">IELTS 预计</div><div style="font-size:36px;font-weight:800">${ieltsEst.toFixed(1)}</div><div class="hint">目标 ${u.ieltsTarget}</div></div>
          <div class="ai-panel center-text"><div class="muted text-sm">TOEFL 预计</div><div style="font-size:36px;font-weight:800">${toeflEst.toFixed(0)}</div><div class="hint">目标 ${u.toeflTarget}</div></div>
        </div>
        ${m?.latest ? `<div class="hint mt-3">最近一次模考：${m.latest.detail} · ${new Date(m.latest.ts).toLocaleDateString('zh-CN')}</div>` : `<div class="hint mt-3">还没有模考记录，去「模拟考试」获得真实成绩。</div>`}
        <a class="btn btn-primary btn-block mt-3" href="#/mock">${icon('target', { size: 15 })}<span>去模拟考试</span></a>
      </div>
      <div class="card">
        <div class="card-title mb-3">四科能力</div>
        ${barChart(skills.map(s => ({ label: s.label, value: Math.round(s.value * 10) / 10, color: 'var(--brand)' })), { height: 200 })}
      </div>
    </div>

    <div class="card mb-6">
      <div class="card-title mb-3">能力雷达</div>
      <div class="center-text">${radar(skills, { size: 260 })}</div>
    </div>

    <div class="row gap-3">
      <a class="btn btn-soft" href="#/plan">${icon('calendar', { size: 15 })}<span>我的学习计划</span></a>
      <a class="btn btn-soft" href="#/errors">${icon('alert', { size: 15 })}<span>错题本</span></a>
      <a class="btn btn-soft" href="#/learn">${icon('book', { size: 15 })}<span>继续学习</span></a>
    </div>
  </div>`;
}

function dataPrivacyCard() {
  const local = isLocalOnly();
  const label = syncLabel();
  const kb = Math.max(1, Math.round(backupSize() / 1024));
  const hint = local
    ? '学习数据只存在这台设备的浏览器里，不会上传到服务器，登出也不会删除本地数据。换设备或清理浏览器数据会丢失，请定期导出备份。'
    : '学习数据默认就存在这台设备的浏览器里；登录后错题本与学习计划会自动同步到服务器，方便换设备继续。开启「仅本机存储」后，即使登录也不上传任何学习数据。';
  return `<div class="card mb-6">
    <div class="row gap-2" style="color:var(--brand)">${icon('layers', { size: 18 })}<b>数据与存储</b></div>
    <div class="card-sub">当前状态：<span class="chip ${label.tone === 'ok' ? 'chip-success' : 'chip-due'}">${label.text}</span></div>
    <div class="row gap-2 mt-3" style="flex-wrap:wrap">
      <button class="btn ${local ? 'btn-primary' : 'btn-soft'} btn-sm" id="dp-local">${icon(local ? 'check' : 'globe', { size: 14 })}<span id="dp-local-txt">${local ? '已开启 · 仅本机存储' : '开启仅本机存储'}</span></button>
      <button class="btn btn-soft btn-sm" id="dp-export">${icon('doc', { size: 14 })}<span>导出备份（约 ${kb} KB）</span></button>
      <button class="btn btn-soft btn-sm" id="dp-import">${icon('inbox', { size: 14 })}<span>导入备份</span></button>
      <input type="file" id="dp-file" accept="application/json,.json" style="display:none">
    </div>
    <div class="hint mt-3">${hint}</div>
    <div class="hint mt-2">备份是纯文本文件，包含单词进度、错题本、学习计划、周复盘，以及你填写的自有 API Key；不含登录令牌。</div>
  </div>`;
}

function initDataPrivacy() {
  const root = document.getElementById('app');
  const btn = root.querySelector('#dp-local');
  const fileInput = root.querySelector('#dp-file');
  if (!btn) return;

  const repaint = () => {
    const local = isLocalOnly();
    btn.classList.toggle('btn-primary', local);
    btn.classList.toggle('btn-soft', !local);
    const txt = btn.querySelector('#dp-local-txt');
    if (txt) txt.textContent = local ? '已开启 · 仅本机存储' : '开启仅本机存储';
  };

  btn.onclick = () => {
    const next = !isLocalOnly();
    setLocalOnly(next);
    repaint();
    toast(next ? '已开启「仅本机存储」，学习数据不再上传服务器' : '已关闭「仅本机存储」，登录后恢复跨设备同步');
  };

  const exp = root.querySelector('#dp-export');
  if (exp) exp.onclick = () => { try { toast('已导出 ' + downloadBackup()); } catch (e) { toast('导出失败：' + (e.message || e)); } };

  const imp = root.querySelector('#dp-import');
  if (imp && fileInput) {
    imp.onclick = () => fileInput.click();
    fileInput.onchange = async () => {
      const f = fileInput.files && fileInput.files[0];
      if (!f) return;
      try {
        const payload = await readBackupFile(f);
        const keys = Object.keys(payload.data || {});
        if (!confirm(`导入 ${keys.length} 项数据（${payload.exportedAt ? new Date(payload.exportedAt).toLocaleString('zh-CN') : '未知时间'} 导出），将覆盖本设备上的现有数据。继续？`)) return;
        const n = applyBackup(payload, { replace: true });
        toast(`已导入 ${n} 项，正在刷新…`);
        setTimeout(() => location.reload(), 800);
      } catch (e) {
        toast('导入失败：' + ((e && e.message) || e));
      } finally {
        fileInput.value = '';
      }
    };
  }
}

function stat(ic, val, lbl) {
  return `<div class="card card-pad-sm"><div class="row gap-2" style="color:var(--brand)">${ic}</div><div class="stat mt-3"><span class="val">${val}</span><span class="lbl">${lbl}</span></div></div>`;
}

// ---- 数据与存储卡片（未登录也要可用）----
window.addEventListener('page:rendered', (e) => {
  if (e.detail.seg !== 'profile') return;
  initDataPrivacy();
});

// ---- 积分卡：进页以后端为准校准余额与签到状态，签到后即时刷新 ----
window.addEventListener('page:rendered', (e) => {
  if (e.detail.seg !== 'profile' || !store.isAuthed()) return;
  const root = document.getElementById('app');
  const num = root.querySelector('#pr-credit-num');
  if (!num) return;

  const refresh = () => {
    num.textContent = store.state.user.credits ?? 0;
    const btn = root.querySelector('#pr-checkin');
    if (!btn) return;
    const can = store.state.user.canCheckIn !== false;
    btn.disabled = !can;
    const txt = btn.querySelector('#pr-checkin-txt');
    if (txt) txt.textContent = can ? '签到 +5' : '今日已签';
  };

  store.fetchCredits().then(refresh).catch(() => { /* 余额留在登录时带回的值 */ });

  const btn = root.querySelector('#pr-checkin');
  if (btn) btn.onclick = async () => {
    btn.disabled = true;
    try {
      const d = await store.checkIn();
      toast(d.message || '签到成功');
    } catch (err) {
      toast((err && err.message) || '签到失败，请稍后重试');
    }
    refresh();
  };
});
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
function est(base, lv, toefl) { const add = { beginner: 0, elementary: toefl ? 10 : 1, intermediate: toefl ? 25 : 2.5, upper: toefl ? 45 : 4, advanced: toefl ? 60 : 5.5 }[lv] || 0; return Math.round((base + add) * 10) / 10; }
function levelLabel(lv) { return ({ beginner: '英语 0 基础', elementary: '基础 A1–A2', intermediate: '中级 B1', upper: '中高级 B2', advanced: '高级 C1' })[lv] || lv; }
function fmtMins(m) { return m >= 60 ? (m / 60).toFixed(1) + ' 小时' : m + ' 分'; }
