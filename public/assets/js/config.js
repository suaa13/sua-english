// assets/js/config.js — 前端唯一的后端地址配置（必须在 app.js 之前加载）
//
// 规则（自动判断，避免"本地配置被复制到生产"这类事故）：
//   · 访问地址是 127.0.0.1 / localhost → 走本地后端 http://127.0.0.1:4000/api/v1
//   · 其他域名（生产）→ 同源，即 location.origin + '/api/v1'
//     前提：生产由 NestJS 用 express.static 同时托管前端，前后端同源（当前部署方式）
//   · 若前后端分离部署，在 index.html 里于本文件之前显式设置 window.__SUA_API_BASE__ 即可覆盖。
(function () {
  if (window.__SUA_API_BASE__) return;
  var h = location.hostname;
  var isLocal = h === '127.0.0.1' || h === 'localhost' || h === '[::1]';
  window.__SUA_API_BASE__ = isLocal ? 'http://127.0.0.1:4000/api/v1' : location.origin + '/api/v1';
})();
