// charts.js — dependency-free SVG charts

export function donut(percent, opts = {}) {
  const size = opts.size || 120;
  const stroke = opts.stroke || 12;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, percent));
  const off = c * (1 - pct / 100);
  const color = opts.color || 'var(--brand)';
  const label = opts.label != null ? opts.label : Math.round(pct) + '%';
  const sub = opts.sub || '';
  return `<div class="ring-wrap" style="width:${size}px;height:${size}px">
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="var(--surface-3)" stroke-width="${stroke}"/>
      <circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="${color}" stroke-width="${stroke}"
        stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${off}"
        transform="rotate(-90 ${size/2} ${size/2})" style="transition:stroke-dashoffset 1s var(--ease)"/>
    </svg>
    <div class="ring-label" style="flex-direction:column">
      <div style="font-size:${opts.labelSize||22}px;font-weight:760;line-height:1">${label}</div>
      ${sub ? `<div class="muted" style="font-size:11px;margin-top:2px">${sub}</div>` : ''}
    </div>
  </div>`;
}

export function barChart(data, opts = {}) {
  const w = opts.width || 520, h = opts.height || 220;
  const pad = 36;
  const max = Math.max(1, ...data.map(d => d.value));
  const bw = (w - pad * 2) / data.length * 0.6;
  const gap = (w - pad * 2) / data.length;
  const bars = data.map((d, i) => {
    const bh = (d.value / max) * (h - pad * 2);
    const x = pad + i * gap + (gap - bw) / 2;
    const y = h - pad - bh;
    const col = d.color || 'var(--brand)';
    return `<g>
      <rect x="${x}" y="${y}" width="${bw}" height="${bh}" rx="6" fill="${col}"/>
      <text x="${x + bw/2}" y="${y - 7}" text-anchor="middle" font-size="12" font-weight="700" fill="var(--text)">${d.value}</text>
      <text x="${x + bw/2}" y="${h - pad + 16}" text-anchor="middle" font-size="11" fill="var(--text-muted)">${d.label}</text>
    </g>`;
  }).join('');
  return `<svg viewBox="0 0 ${w} ${h}" width="100%" style="max-width:${w}px;display:block;margin:auto">
    <line x1="${pad}" y1="${h-pad}" x2="${w-pad}" y2="${h-pad}" stroke="var(--border)" stroke-width="1"/>
    ${bars}
  </svg>`;
}

export function lineChart(series, opts = {}) {
  const w = opts.width || 520, h = opts.height || 220;
  const pad = 36;
  const max = Math.max(1, ...series.map(p => p.v));
  const min = Math.min(0, ...series.map(p => p.v));
  const range = (max - min) || 1;
  const step = (w - pad * 2) / Math.max(1, series.length - 1);
  const pts = series.map((p, i) => {
    const x = pad + i * step;
    const y = h - pad - ((p.v - min) / range) * (h - pad * 2);
    return [x, y];
  });
  const line = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
  const area = line + ` L ${pts[pts.length-1][0].toFixed(1)} ${h-pad} L ${pts[0][0].toFixed(1)} ${h-pad} Z`;
  const dots = pts.map((p, i) => `<circle cx="${p[0]}" cy="${p[1]}" r="3.5" fill="var(--brand)"/><text x="${p[0]}" y="${h-pad+16}" text-anchor="middle" font-size="10" fill="var(--text-muted)">${series[i].l}</text>`).join('');
  // 面积用低透明度实色填充（不用渐变），保持图表干净
  return `<svg viewBox="0 0 ${w} ${h}" width="100%" style="max-width:${w}px;display:block;margin:auto">
    <path d="${area}" fill="var(--brand)" fill-opacity="0.1"/>
    <path d="${line}" fill="none" stroke="var(--brand)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
    ${dots}
  </svg>`;
}

export function radar(scores, opts = {}) {
  const size = opts.size || 240;
  const cx = size / 2, cy = size / 2, R = size / 2 - 38;
  const n = scores.length;
  const max = opts.max || 9;
  const ang = (i) => (Math.PI * 2 * i) / n - Math.PI / 2;
  const point = (i, val) => {
    const r = (val / max) * R;
    return [cx + r * Math.cos(ang(i)), cy + r * Math.sin(ang(i))];
  };
  const poly = scores.map((s, i) => point(i, s.value).join(',')).join(' ');
  const rings = [0.25, 0.5, 0.75, 1].map(f => {
    const p = scores.map((_, i) => point(i, f * max).join(',')).join(' ');
    return `<polygon points="${p}" fill="none" stroke="var(--border)" stroke-width="1"/>`;
  }).join('');
  const axes = scores.map((s, i) => {
    const [x, y] = point(i, max);
    const [lx, ly] = point(i, max * 1.18);
    return `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="var(--border)" stroke-width="1"/>
      <text x="${lx}" y="${ly}" text-anchor="middle" dominant-baseline="middle" font-size="11" fill="var(--text-muted)">${s.label}</text>`;
  }).join('');
  const dataPoly = `<polygon points="${poly}" fill="var(--brand)" fill-opacity="0.22" stroke="var(--brand)" stroke-width="2"/>`;
  const dots = scores.map((s, i) => { const [x, y] = point(i, s.value); return `<circle cx="${x}" cy="${y}" r="3" fill="var(--brand)"/>`; }).join('');
  return `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" style="display:block;margin:auto">${rings}${axes}${dataPoly}${dots}</svg>`;
}
