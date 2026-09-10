// pages/auth.js — Login / Account (connected to the backend)
import { store, levelToLabel } from '../state.js';
import { icon, toast, modal, closeModal } from '../ui.js';
import { isLocalOnly, clearLocalSyncData, hasLocalData } from '../sync.js';

export function render() {
  const authed = store.isAuthed();
  const u = store.state.user;

  if (!authed) {
    return `<div class="page"><div class="crumb"><a href="#/home">首页</a><span class="sep">/</span><span>登录</span></div>
      <div class="section-head"><div><h2>登录 SUA English</h2><div class="sub">使用你的账户，学习数据将保存到云端</div></div></div>
      <div class="grid grid-2">
        <div class="card">
          <div class="tabs mb-4">
            <button class="tab active" id="tab-login" type="button">登录</button>
            <button class="tab" id="tab-register" type="button">注册</button>
          </div>
          <form id="a-form" autocomplete="off">
            <div class="field" id="f-name" style="display:none"><label class="label">昵称</label><input class="input" id="a-name" placeholder="例如：小明"></div>
            <div class="field"><label class="label">邮箱</label><input class="input" id="a-email" type="email" placeholder="you@example.com"></div>
            <div class="field"><label class="label">密码</label><input class="input" id="a-pw" type="password" placeholder="至少 8 位，含字母和数字"></div>
            <div id="f-goals" style="display:none">
              <div class="field"><label class="label">目标考试</label><select class="select" id="a-exam">
                <option value="ielts">IELTS</option><option value="toefl">TOEFL</option></select></div>
              <div class="grid grid-2">
                <div class="field"><label class="label">IELTS 目标</label><input class="input" id="a-it" type="number" step="0.5" value="6.5"></div>
                <div class="field"><label class="label">TOEFL 目标</label><input class="input" id="a-tt" type="number" step="5" value="90"></div>
              </div>
              <div class="field"><label class="label">考试日期</label><input class="input" id="a-date" type="date"></div>
              <div class="field"><label class="label">每天学习时间（分钟）</label><input class="input" id="a-mins" type="number" step="5" value="30"></div>
            </div>
            <div id="a-msg" class="text-sm" style="color:var(--danger);min-height:18px;margin:8px 0"></div>
            <button class="btn btn-primary btn-block" id="a-submit" type="submit">登录</button>
          </form>
        </div>
        <div class="card">
          <div class="card-title mb-3">欢迎来到 SUA English</div>
          <p class="muted text-sm">从真正的 0 基础开始，一路学到 IELTS / TOEFL。</p>
          <ul class="list mt-3">
            <li class="list-item"><span class="dot dot-success"></span><span>注册即建立你的学习画像</span></li>
            <li class="list-item"><span class="dot dot-success"></span><span>词汇、错题、计划自动保存到云端</span></li>
            <li class="list-item"><span class="dot dot-success"></span><span>多设备同步你的学习进度</span></li>
          </ul>
          <div class="hint mt-4">演示账户：demo@sua.english / Password123</div>
        </div>
      </div>
    </div>`;
  }

  return `<div class="page"><div class="crumb"><a href="#/home">首页</a><span class="sep">/</span><span>我的账户</span></div>
    <div class="section-head"><div><h2>我的账户</h2><div class="sub">你的学习档案已与云端同步</div></div></div>
    <div class="grid grid-2">
      <div class="card">
        <div class="row gap-3" style="margin-bottom:16px">
          <div class="avatar">${(u.name || 'S').slice(0, 1).toUpperCase()}</div>
          <div><div class="card-title">${u.name}</div><div class="muted text-sm">${u.email || ''}</div><div class="muted text-sm">${levelToLabel(u.level)} · 目标 ${u.exam.toUpperCase()} ${u.exam === 'ielts' ? u.ieltsTarget : u.toeflTarget}</div></div>
        </div>
        <button class="btn btn-soft btn-block" id="a-logout">${icon('arrowR', { size: 15 })}<span>退出登录</span></button>
      </div>
      <div class="card">
        <div class="card-title mb-4">学习目标设置</div>
        <div class="field"><label class="label">当前水平</label><select class="select" id="a-level">
          ${['beginner', 'elementary', 'intermediate', 'upper', 'advanced'].map(l => `<option value="${l}" ${u.level === l ? 'selected' : ''}>${levelToLabel(l)}</option>`).join('')}</select></div>
        <div class="field"><label class="label">目标考试</label><select class="select" id="a-exam">
          <option value="ielts" ${u.exam === 'ielts' ? 'selected' : ''}>IELTS</option><option value="toefl" ${u.exam === 'toefl' ? 'selected' : ''}>TOEFL</option></select></div>
        <div class="grid grid-2">
          <div class="field"><label class="label">IELTS 目标</label><input class="input" id="a-it" type="number" step="0.5" value="${u.ieltsTarget}"></div>
          <div class="field"><label class="label">TOEFL 目标</label><input class="input" id="a-tt" type="number" step="5" value="${u.toeflTarget}"></div>
        </div>
        <div class="field"><label class="label">考试日期</label><input class="input" id="a-date" type="date" value="${u.examDate || ''}"></div>
        <div class="field"><label class="label">每天学习时间（分钟）</label><input class="input" id="a-mins" type="number" step="5" value="${u.dailyMins}"></div>
        <button class="btn btn-primary btn-block mt-2" id="a-save">${icon('check', { size: 15 })}<span>保存设置</span></button>
      </div>
    </div>
    <div class="card mt-6">
      <div class="row between"><div><div class="card-title">本地数据</div><div class="muted text-sm">词汇进度、错题、计划等仍保存在本浏览器（localStorage），用于离线学习。</div></div>
      <button class="btn btn-danger btn-sm" id="a-reset">${icon('trash', { size: 15 })}<span>重置本地数据</span></button></div>
    </div>
  </div>`;
}

window.addEventListener('page:rendered', (e) => {
  if (e.detail.seg !== 'auth') return;
  const root = document.getElementById('app');

  if (!store.isAuthed()) {
    let mode = 'login';
    const tabLogin = root.querySelector('#tab-login');
    const tabReg = root.querySelector('#tab-register');
    const fName = root.querySelector('#f-name');
    const fGoals = root.querySelector('#f-goals');
    const submit = root.querySelector('#a-submit');
    const msg = root.querySelector('#a-msg');

    const setMode = (m) => {
      mode = m;
      tabLogin.classList.toggle('active', m === 'login');
      tabReg.classList.toggle('active', m === 'register');
      fName.style.display = m === 'register' ? '' : 'none';
      fGoals.style.display = m === 'register' ? '' : 'none';
      submit.textContent = m === 'register' ? '注册并进入' : '登录';
    };
    tabLogin.onclick = () => setMode('login');
    tabReg.onclick = () => setMode('register');

    root.querySelector('#a-form').addEventListener('submit', async (ev) => {
      ev.preventDefault();
      msg.textContent = '';
      const email = root.querySelector('#a-email').value.trim();
      const password = root.querySelector('#a-pw').value;
      if (!email || !password) { msg.textContent = '请输入邮箱和密码'; return; }
      submit.disabled = true; submit.textContent = '处理中…';
      try {
        if (mode === 'login') {
          await store.login(email, password);
          toast('登录成功'); location.hash = '#/home';
        } else {
          const name = root.querySelector('#a-name').value.trim();
          const exam = root.querySelector('#a-exam').value;
          // 昵称常常是中文，而用户名只允许字母/数字/下划线 —— 过滤后可能为空，
          // 直接回退生成合法用户名，避免用户看到后端的英文校验错误不知所措。
          let username = (name || email.split('@')[0] || 'user').replace(/[^a-zA-Z0-9_]/g, '');
          if (username.length < 3) username = 'user' + String(Date.now()).slice(-6);
          if (!name) { msg.textContent = '请填写昵称'; submit.disabled = false; submit.textContent = '注册并进入'; return; }
          if (!/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(password)) { msg.textContent = '密码至少 8 位，且包含字母和数字'; submit.disabled = false; submit.textContent = '注册并进入'; return; }
          await store.register({
            email, username, password, exam,
            ieltsTarget: parseFloat(root.querySelector('#a-it').value) || 6.5,
            toeflTarget: parseFloat(root.querySelector('#a-tt').value) || 90,
            examDate: root.querySelector('#a-date').value || undefined,
            dailyMins: parseInt(root.querySelector('#a-mins').value) || 30,
          });
          toast('注册成功，欢迎加入'); location.hash = '#/home';
        }
      } catch (err) {
        msg.textContent = (err && err.message) || '操作失败，请稍后再试';
        submit.disabled = false; submit.textContent = mode === 'register' ? '注册并进入' : '登录';
      }
    });
    return;
  }

  // authed
  const save = root.querySelector('#a-save');
  if (save) save.onclick = async () => {
    const exam = root.querySelector('#a-exam').value;
    save.disabled = true;
    try {
      await store.saveGoals({
        level: root.querySelector('#a-level').value,
        exam,
        ieltsTarget: parseFloat(root.querySelector('#a-it').value) || 6.5,
        toeflTarget: parseFloat(root.querySelector('#a-tt').value) || 90,
        examDate: root.querySelector('#a-date').value,
        dailyMins: parseInt(root.querySelector('#a-mins').value) || 30,
      });
      toast('设置已保存到云端'); location.hash = '#/auth';
    } catch (err) { toast((err && err.message) || '保存失败'); save.disabled = false; }
  };
  const logout = root.querySelector('#a-logout');
  if (logout) logout.onclick = async () => {
    // 仅本机模式下登出不清本地（本地是唯一副本），于是换账号会看到上一个人的数据。
    // 这里显式问一句，把选择权交回给用户。
    if (isLocalOnly() && hasLocalData()) {
      const keep = await askKeepLocalData();
      if (keep === null) return;            // 用户取消登出
      if (keep === false) { clearLocalSyncData(); store.reset(); }
    }
    await store.logout();
    toast('已退出'); location.hash = '#/auth';
  };
  const reset = root.querySelector('#a-reset');
  if (reset) reset.onclick = () => {
    modal(`<div class="card-title">重置本地数据？</div><p class="muted mt-2">将清空浏览器中的学习进度、错题、计划与模考记录（不影响云端账户）。</p>
      <div class="row gap-2 mt-4"><button class="btn btn-ghost" onclick="closeModal()">取消</button><button class="btn btn-danger" id="a-confirm-reset">确认重置</button></div>`);
    setTimeout(() => { const c = document.getElementById('a-confirm-reset'); if (c) c.onclick = () => { store.reset(); closeModal(); toast('已重置本地数据'); location.hash = '#/home'; }; }, 0);
  };
});

// 仅本机模式下登出时的三选一：保留 / 清空 / 取消登出。
// 返回 true=保留，false=清空，null=取消整个登出动作。
function askKeepLocalData() {
  return new Promise((resolve) => {
    modal(`<div class="card-title">退出登录：本机数据怎么办？</div>
      <p class="muted mt-2">你开启了「仅本机存储」，学习数据只存在这台设备上，退出登录不会带走。如果接下来换账号登录，对方会看到这些错题与计划。</p>
      <div class="row gap-2 mt-4" style="flex-wrap:wrap">
        <button class="btn btn-ghost" id="lk-cancel">取消</button>
        <button class="btn btn-danger" id="lk-clear">清空本机数据</button>
        <button class="btn btn-primary" id="lk-keep">保留在这台设备</button>
      </div>`, { dismissable: false });
    setTimeout(() => {
      const c = document.getElementById('lk-cancel');
      const k = document.getElementById('lk-keep');
      const cl = document.getElementById('lk-clear');
      if (c) c.onclick = () => { closeModal(); resolve(null); };
      if (k) k.onclick = () => { closeModal(); resolve(true); };
      if (cl) cl.onclick = () => { closeModal(); resolve(false); };
    }, 0);
  });
}
