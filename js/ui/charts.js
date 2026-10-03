// === Minimal SVG charts ===
// One measure per chart on a single y-axis, a 7-day-average line that leads
// over faint daily dots, a crosshair tooltip, and a collapsible data table so
// the values are never colour-only.

import { h, icon } from './components.js';
import { fromISODate, fmtDate, fmtNum } from '../core/util.js';

const NS = 'http://www.w3.org/2000/svg';
const PAD = { top: 14, right: 58, bottom: 22, left: 36 };
const HEIGHT = 190;

function svgEl(tag, attrs = {}) {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v !== null && v !== undefined) el.setAttribute(k, v);
  }
  return el;
}

/** Pleasant axis ticks covering [min,max]. */
function niceScale(min, max, ticks = 4) {
  if (min === max) {
    const pad = Math.abs(min) * 0.05 || 1;
    min -= pad;
    max += pad;
  }
  const span = max - min;
  const raw = span / ticks;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / mag;
  const stepMul = norm >= 7.5 ? 10 : norm >= 3.5 ? 5 : norm >= 1.5 ? 2 : 1;
  const step = stepMul * mag;
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  const out = [];
  for (let v = lo; v <= hi + step / 2; v += step) out.push(Math.round(v * 1e6) / 1e6);
  return { lo, hi, ticks: out };
}

/**
 * @param {object} cfg
 *   series: [{ name, points:[{date,value}], slot:1|2, style:'line'|'dots', fill?:boolean }]
 *   formatValue, unit, goal?: {value,label}, emptyText
 */
export function lineChart(cfg) {
  const container = h('figure', { class: 'chart' });
  const plot = h('div', { class: 'chart-plot' });
  const tooltip = h('div', { class: 'chart-tooltip', role: 'status', 'aria-live': 'off' });
  const series = (cfg.series || []).filter((s) => s.points && s.points.length);

  if (cfg.caption) container.appendChild(h('figcaption', { class: 'chart-caption' }, cfg.caption));

  if (series.length >= 2) {
    container.appendChild(
      h('div', { class: 'chart-legend' },
        ...series.map((s) =>
          h('span', { class: 'legend-item' },
            h('span', { class: `legend-swatch slot-${s.slot || 1} ${s.style === 'dots' ? 'is-dots' : ''}`.trim() }),
            s.name
          )
        )
      )
    );
  }

  if (!series.length) {
    container.appendChild(h('p', { class: 'chart-empty' }, cfg.emptyText || 'No data yet.'));
    return container;
  }

  plot.appendChild(tooltip);
  container.appendChild(plot);
  container.appendChild(dataTable(series, cfg));

  const draw = () => {
    const width = Math.max(260, plot.clientWidth || container.clientWidth || 320);
    plot.querySelectorAll('svg').forEach((n) => n.remove());
    plot.appendChild(render(series, cfg, width, tooltip));
  };

  // Render once attached so the measured width is real.
  requestAnimationFrame(draw);
  if (typeof ResizeObserver !== 'undefined') {
    let last = 0;
    const ro = new ResizeObserver(() => {
      const w = plot.clientWidth;
      if (Math.abs(w - last) < 8) return;
      last = w;
      draw();
    });
    ro.observe(plot);
  }
  return container;
}

function render(series, cfg, width, tooltip) {
  const fmt = cfg.formatValue || ((v) => fmtNum(v, 1));
  const all = series.flatMap((s) => s.points);
  const times = all.map((p) => fromISODate(p.date).getTime());
  const values = all.map((p) => p.value).filter((v) => v != null);
  if (cfg.goal && cfg.goal.value != null) values.push(cfg.goal.value);

  const tMin = Math.min(...times);
  const tMax = Math.max(...times);
  const { lo, hi, ticks } = niceScale(Math.min(...values), Math.max(...values), 4);

  const innerW = width - PAD.left - PAD.right;
  const innerH = HEIGHT - PAD.top - PAD.bottom;
  const x = (date) => {
    const t = fromISODate(date).getTime();
    if (tMax === tMin) return PAD.left + innerW / 2;
    return PAD.left + ((t - tMin) / (tMax - tMin)) * innerW;
  };
  const y = (v) => PAD.top + innerH - ((v - lo) / (hi - lo)) * innerH;

  const svg = svgEl('svg', {
    viewBox: `0 0 ${width} ${HEIGHT}`,
    width: '100%',
    height: HEIGHT,
    role: 'img',
    'aria-label': cfg.caption || 'Chart',
    class: 'chart-svg',
  });

  // Recessive gridlines + y labels.
  const grid = svgEl('g', { class: 'chart-grid' });
  ticks.forEach((t) => {
    grid.appendChild(svgEl('line', { x1: PAD.left, x2: width - PAD.right, y1: y(t), y2: y(t) }));
    const label = svgEl('text', { x: PAD.left - 7, y: y(t) + 3.5, class: 'chart-axis-label', 'text-anchor': 'end' });
    label.textContent = fmtNum(t, 1);
    grid.appendChild(label);
  });
  svg.appendChild(grid);

  // Optional reference line (step goal, target waist, …).
  if (cfg.goal && cfg.goal.value != null && cfg.goal.value >= lo && cfg.goal.value <= hi) {
    const g = svgEl('g', { class: 'chart-goal' });
    g.appendChild(svgEl('line', { x1: PAD.left, x2: width - PAD.right, y1: y(cfg.goal.value), y2: y(cfg.goal.value) }));
    const t = svgEl('text', { x: width - PAD.right, y: y(cfg.goal.value) - 5, 'text-anchor': 'end', class: 'chart-goal-label' });
    t.textContent = cfg.goal.label || '';
    g.appendChild(t);
    svg.appendChild(g);
  }

  // x labels: first, middle, last only — never one per point.
  const xAxis = svgEl('g', { class: 'chart-xaxis' });
  const sorted = [...new Set(all.map((p) => p.date))].sort();
  const xLabelDates = sorted.length > 2 ? [sorted[0], sorted[Math.floor(sorted.length / 2)], sorted[sorted.length - 1]] : sorted;
  xLabelDates.forEach((d, i) => {
    const anchor = i === 0 ? 'start' : i === xLabelDates.length - 1 ? 'end' : 'middle';
    const t = svgEl('text', { x: x(d), y: HEIGHT - 6, class: 'chart-axis-label', 'text-anchor': anchor });
    t.textContent = fmtDate(d);
    xAxis.appendChild(t);
  });
  svg.appendChild(xAxis);

  // Marks.
  const lineSeries = [];
  series.forEach((s) => {
    const pts = s.points.filter((p) => p.value != null).sort((a, b) => a.date.localeCompare(b.date));
    if (!pts.length) return;
    const slot = s.slot || 1;
    if (s.style === 'dots') {
      const g = svgEl('g', { class: `chart-dots slot-${slot}` });
      pts.forEach((p) => g.appendChild(svgEl('circle', { cx: x(p.date), cy: y(p.value), r: 2.4 })));
      svg.appendChild(g);
      return;
    }
    const d = pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.date).toFixed(1)} ${y(p.value).toFixed(1)}`).join(' ');
    if (s.fill !== false && pts.length > 1) {
      const area = `${d} L${x(pts[pts.length - 1].date).toFixed(1)} ${(PAD.top + innerH).toFixed(1)} L${x(pts[0].date).toFixed(1)} ${(PAD.top + innerH).toFixed(1)} Z`;
      svg.appendChild(svgEl('path', { d: area, class: `chart-area slot-${slot}` }));
    }
    svg.appendChild(svgEl('path', { d, class: `chart-line slot-${slot}`, 'vector-effect': 'non-scaling-stroke' }));
    if (pts.length === 1) {
      svg.appendChild(svgEl('circle', { cx: x(pts[0].date), cy: y(pts[0].value), r: 4.5, class: `chart-point slot-${slot}` }));
    }
    // Direct label on the latest value only.
    const last = pts[pts.length - 1];
    svg.appendChild(svgEl('circle', { cx: x(last.date), cy: y(last.value), r: 4, class: `chart-point slot-${slot}` }));
    const lbl = svgEl('text', {
      x: Math.min(x(last.date) + 8, width - 4),
      y: Math.max(PAD.top + 4, Math.min(y(last.value) + 4, HEIGHT - PAD.bottom)),
      class: 'chart-last-label',
      'text-anchor': 'start',
    });
    lbl.textContent = fmt(last.value);
    svg.appendChild(lbl);
    lineSeries.push({ ...s, pts });
  });

  // Crosshair + tooltip.
  const primary = lineSeries[0] || { pts: series[0].points.filter((p) => p.value != null).sort((a, b) => a.date.localeCompare(b.date)), name: series[0].name, slot: series[0].slot || 1 };
  if (primary.pts.length) {
    const hair = svgEl('line', { class: 'chart-hair', y1: PAD.top, y2: PAD.top + innerH, x1: 0, x2: 0, opacity: 0 });
    const marker = svgEl('circle', { class: 'chart-marker', r: 5.5, opacity: 0 });
    svg.appendChild(hair);
    svg.appendChild(marker);

    const hit = svgEl('rect', {
      x: PAD.left - 10, y: 0, width: innerW + 20, height: HEIGHT, fill: 'transparent', class: 'chart-hit',
    });
    svg.appendChild(hit);

    const show = (evt) => {
      const rect = svg.getBoundingClientRect();
      const scale = width / rect.width;
      const px = (evt.clientX - rect.left) * scale;
      let nearest = primary.pts[0];
      let bestDist = Infinity;
      primary.pts.forEach((p) => {
        const d = Math.abs(x(p.date) - px);
        if (d < bestDist) {
          bestDist = d;
          nearest = p;
        }
      });
      hair.setAttribute('x1', x(nearest.date));
      hair.setAttribute('x2', x(nearest.date));
      hair.setAttribute('opacity', 1);
      marker.setAttribute('cx', x(nearest.date));
      marker.setAttribute('cy', y(nearest.value));
      marker.setAttribute('opacity', 1);
      marker.setAttribute('class', `chart-marker slot-${primary.slot}`);

      const lines = series
        .map((s) => {
          const match = s.points.find((p) => p.date === nearest.date && p.value != null);
          return match ? `${s.name}: ${fmt(match.value)}` : null;
        })
        .filter(Boolean);
      tooltip.textContent = '';
      tooltip.appendChild(h('strong', null, fmtDate(nearest.date)));
      lines.forEach((l) => tooltip.appendChild(h('span', null, l)));
      tooltip.classList.add('is-visible');
      const leftPct = (x(nearest.date) / width) * 100;
      tooltip.style.left = `${Math.max(6, Math.min(94, leftPct))}%`;
      tooltip.style.transform = `translateX(-${Math.max(6, Math.min(94, leftPct)) > 70 ? 85 : leftPct < 30 ? 15 : 50}%)`;
    };
    const hide = () => {
      hair.setAttribute('opacity', 0);
      marker.setAttribute('opacity', 0);
      tooltip.classList.remove('is-visible');
    };
    hit.addEventListener('pointerdown', show);
    hit.addEventListener('pointermove', (e) => {
      if (e.pointerType === 'touch' && e.buttons === 0 && !e.isPrimary) return;
      show(e);
    });
    hit.addEventListener('pointerleave', hide);
    hit.addEventListener('pointerup', () => setTimeout(hide, 1600));
  }

  return svg;
}

function dataTable(series, cfg) {
  const fmt = cfg.formatValue || ((v) => fmtNum(v, 1));
  const dates = [...new Set(series.flatMap((s) => s.points.map((p) => p.date)))].sort().reverse();
  const head = h('tr', null, h('th', { scope: 'col' }, 'Date'), ...series.map((s) => h('th', { scope: 'col' }, s.name)));
  const rows = dates.slice(0, 120).map((d) =>
    h('tr', null,
      h('th', { scope: 'row' }, fmtDate(d)),
      ...series.map((s) => {
        const p = s.points.find((pt) => pt.date === d && pt.value != null);
        return h('td', null, p ? fmt(p.value) : '—');
      })
    )
  );
  return h('details', { class: 'chart-table' },
    h('summary', null, 'Data table', icon('chevron', 14)),
    h('div', { class: 'table-scroll' }, h('table', null, h('thead', null, head), h('tbody', null, ...rows)))
  );
}

/** Compact inline sparkline for list rows. */
export function sparkline(points, { width = 72, height = 24, slot = 1 } = {}) {
  const pts = (points || []).filter((p) => p.value != null);
  if (pts.length < 2) return h('span', { class: 'spark-empty' }, '');
  const values = pts.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const d = pts
    .map((p, i) => {
      const px = (i / (pts.length - 1)) * (width - 2) + 1;
      const py = height - 2 - ((p.value - min) / span) * (height - 4);
      return `${i ? 'L' : 'M'}${px.toFixed(1)} ${py.toFixed(1)}`;
    })
    .join(' ');
  const svg = svgEl('svg', { viewBox: `0 0 ${width} ${height}`, width, height, class: 'spark', 'aria-hidden': 'true' });
  svg.appendChild(svgEl('path', { d, class: `chart-line slot-${slot}`, 'vector-effect': 'non-scaling-stroke' }));
  return svg;
}
