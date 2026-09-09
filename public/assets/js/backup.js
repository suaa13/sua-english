// assets/js/backup.js — 把全部学习数据导出成一个 JSON 文件，或从文件恢复。
//
// 范围：localStorage 里所有 `sua_english-v1` 与 `sua_*` 键。
// 刻意**排除** `sua-at` / `sua-rt`（JWT 令牌）—— 令牌短命且不该落盘到备份文件里。
// 备份里会包含 `sua_llm`（用户自己填的 API Key），UI 上已明确提示。

const ROOT_KEY = 'sua-english-v1';
const EXCLUDE = new Set(['sua-at', 'sua-rt']);

function isDataKey(k) {
  return k === ROOT_KEY || (k.startsWith('sua_') && !EXCLUDE.has(k));
}

export function backupKeys() {
  const keys = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && isDataKey(k)) keys.push(k);
    }
  } catch (e) { /* ignore */ }
  return keys;
}

/** 收集全部本地数据。返回可序列化的普通对象。 */
export function collectBackup() {
  const data = {};
  backupKeys().forEach((k) => {
    const raw = localStorage.getItem(k);
    if (raw == null) return;
    try { data[k] = JSON.parse(raw); } catch (e) { data[k] = raw; }
  });
  return {
    app: 'sua-english',
    version: 1,
    exportedAt: new Date().toISOString(),
    keys: Object.keys(data),
    data,
  };
}

export function backupFilename() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `sua-english-备份-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}.json`;
}

/** 触发浏览器下载。返回文件名。 */
export function downloadBackup() {
  const payload = collectBackup();
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const name = backupFilename();
  const a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return name;
}

/** 读取用户选择的文件并解析。失败抛错（文案可直接 toast）。 */
export function readBackupFile(file) {
  return new Promise((resolve, reject) => {
    if (!file) { reject(new Error('没有选择文件')); return; }
    const fr = new FileReader();
    fr.onerror = () => reject(new Error('文件读取失败'));
    fr.onload = () => {
      try {
        const j = JSON.parse(String(fr.result));
        if (!j || j.app !== 'sua-english' || !j.data || typeof j.data !== 'object') {
          reject(new Error('这不是 SUA English 的备份文件'));
          return;
        }
        resolve(j);
      } catch (e) {
        reject(new Error('文件不是合法 JSON'));
      }
    };
    fr.readAsText(file);
  });
}

/** 写回本地。replace=true 先清空现有数据键，false 则按键覆盖（合并）。返回写入键数。 */
export function applyBackup(payload, { replace = true } = {}) {
  const data = (payload && payload.data) || {};
  if (replace) backupKeys().forEach((k) => { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } });
  let n = 0;
  Object.keys(data).forEach((k) => {
    if (!isDataKey(k)) return;
    const v = data[k];
    try {
      localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v));
      n++;
    } catch (e) { /* 配额满则跳过 */ }
  });
  return n;
}

/** 便于 UI 展示的体量估算（字节）。 */
export function backupSize() {
  try { return new Blob([JSON.stringify(collectBackup())]).size; } catch (e) { return 0; }
}
