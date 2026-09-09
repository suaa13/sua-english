// assets/js/config.js — 部署期唯一需要改的前端配置（在 app.js 之前加载）
//
// 生产环境（上线后）：把下面的值改成你的后端公网地址，必须带 /api/v1 后缀。
//   例：https://sua-api.onrender.com/api/v1
//   例：https://api.sua.eu.org/api/v1
//
// 留空 '' 表示「同源」——仅当你把前端也交给后端同一域名托管时才用得到。
//
// 本地开发：保持默认即可（前端 :8099 + 后端 :4000 分端口）。
// 部署版：前后端同源（同一端口），API 基址直接用当前站点 origin
window.__SUA_API_BASE__ = (typeof location !== 'undefined' ? location.origin : '') + '/api/v1';
