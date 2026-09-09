// assets/js/api.js — minimal REST client for the SUA English backend.
// The backend is the single source of truth for auth; the browser only holds
// short-lived JWTs (in localStorage) and never the password.

// Dev default. In production serve frontend+backend same-origin or set
// window.__SUA_API_BASE__ before this module loads.
const API_BASE =
  (typeof window !== 'undefined' && window.__SUA_API_BASE__) ||
  'http://127.0.0.1:4000/api/v1';

const AT_KEY = 'sua-at';
const RT_KEY = 'sua-rt';

function safeGet(k) {
  try { return localStorage.getItem(k); } catch { return null; }
}
function safeSet(k, v) {
  try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch { /* ignore */ }
}

let accessToken = safeGet(AT_KEY);
let refreshToken = safeGet(RT_KEY);
let refreshing = null;

export function setTokens(at, rt) {
  accessToken = at ?? null;
  refreshToken = rt ?? null;
  safeSet(AT_KEY, accessToken);
  safeSet(RT_KEY, refreshToken);
}
export function getAccessToken() { return accessToken; }
export function getRefreshToken() { return refreshToken; }
export function clearTokens() { setTokens(null, null); }
export function isAuthed() { return !!accessToken; }

async function refresh() {
  if (!refreshToken) throw new Error('NO_REFRESH');
  const res = await fetch(API_BASE + '/auth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  if (!res.ok) { clearTokens(); throw new Error('REFRESH_FAILED'); }
  const j = await res.json();
  const t = j && j.data && j.data.tokens;
  if (!t) throw new Error('REFRESH_NO_TOKENS');
  setTokens(t.accessToken, t.refreshToken);
  return t.accessToken;
}

async function raw(path, opts) {
  const headers = Object.assign({ 'Content-Type': 'application/json' }, opts.headers || {});
  if (accessToken) headers['Authorization'] = 'Bearer ' + accessToken;
  return fetch(API_BASE + path, Object.assign({}, opts, { headers }));
}

// Central request. On 401, transparently rotates the refresh token once.
export async function api(path, opts = {}) {
  let res = await raw(path, opts);
  if (res.status === 401 && refreshToken && !opts._noRefresh) {
    try {
      const at = await refresh();
      if (at) {
        const h = Object.assign({}, opts.headers || {});
        h['Authorization'] = 'Bearer ' + at;
        res = await raw(path, Object.assign({}, opts, { headers: h }));
      }
    } catch { /* fall through to error below */ }
  }
  let body = null;
  try { body = await res.json(); } catch { /* ignore */ }
  if (!res.ok) {
    const err = new Error((body && body.message) || ('请求失败 (' + res.status + ')'));
    err.status = res.status;
    err.code = body && body.error && body.error.code;
    err.body = body;
    throw err;
  }
  return body;
}

export { API_BASE };
