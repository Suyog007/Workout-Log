// === Small shared helpers: ids, dates, numbers, formatting ===

export const uid = (prefix = '') =>
  prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

// --- Dates (all calendar dates are stored as 'YYYY-MM-DD' local strings) ---
export function toISODate(d = new Date()) {
  const dt = d instanceof Date ? d : new Date(d);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export const today = () => toISODate(new Date());

export function fromISODate(iso) {
  const [y, m, d] = String(iso).split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function addDays(iso, n) {
  const d = fromISODate(iso);
  d.setDate(d.getDate() + n);
  return toISODate(d);
}

export function daysBetween(fromIso, toIso) {
  const a = fromISODate(fromIso);
  const b = fromISODate(toIso);
  return Math.round((b - a) / 86400000);
}

/** Monday-based start of week. */
export function startOfWeek(iso) {
  const d = fromISODate(iso);
  const dow = d.getDay(); // 0=Sun
  const back = dow === 0 ? 6 : dow - 1;
  d.setDate(d.getDate() - back);
  return toISODate(d);
}

export const weekdayOf = (iso) => fromISODate(iso).getDay();

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DOWS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function fmtDate(iso) {
  const d = fromISODate(iso);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

export function fmtDateLong(iso) {
  const d = fromISODate(iso);
  return `${DOWS[d.getDay()]} ${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

export function fmtDayName(iso) {
  return DOWS[fromISODate(iso).getDay()];
}

export function relativeDay(iso) {
  const diff = daysBetween(iso, today());
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff > 1 && diff < 7) return `${diff} days ago`;
  return fmtDate(iso);
}

// --- Numbers ---
export const sum = (arr) => arr.reduce((a, b) => a + (Number(b) || 0), 0);
export const avg = (arr) => (arr.length ? sum(arr) / arr.length : null);
export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/** Round to the nearest multiple of `step` (e.g. nearest 2.5 kg). */
export function roundTo(value, step) {
  if (!step) return value;
  return Math.round(value / step) * step;
}

/** Trim trailing zeros: 52.5 → "52.5", 50.0 → "50" */
export function fmtNum(v, maxDp = 2) {
  if (v === null || v === undefined || Number.isNaN(v)) return '—';
  const n = Number(v);
  return String(Number(n.toFixed(maxDp)));
}

export const fmtWeight = (v, unit = 'kg') =>
  v === null || v === undefined ? '—' : `${fmtNum(v)} ${unit}`;

export const fmtInt = (v) =>
  v === null || v === undefined || Number.isNaN(v) ? '—' : Math.round(v).toLocaleString();

/** Epley estimated 1RM. Only meaningful in lower rep ranges. */
export function e1rm(weight, reps) {
  if (!weight || !reps || reps < 1 || reps > 15) return null;
  return weight * (1 + reps / 30);
}

export function fmtDuration(seconds) {
  if (seconds === null || seconds === undefined) return '—';
  const s = Math.max(0, Math.round(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`;
  return `${m} min`;
}

export function fmtClock(seconds) {
  const s = Math.max(0, Math.round(seconds));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

export function fmtSigned(v, dp = 1, unit = '') {
  if (v === null || v === undefined || Number.isNaN(v)) return '—';
  const n = Number(v);
  const s = n > 0 ? '+' : n < 0 ? '−' : '';
  return `${s}${fmtNum(Math.abs(n), dp)}${unit ? ' ' + unit : ''}`;
}

export function debounce(fn, ms) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

/** Rolling mean over a date-ordered series; window counts entries, not days. */
export function rollingMean(points, windowDays = 7) {
  const out = [];
  for (let i = 0; i < points.length; i++) {
    const cutoff = addDays(points[i].date, -(windowDays - 1));
    const slice = points.filter((p) => p.date >= cutoff && p.date <= points[i].date);
    out.push({ date: points[i].date, value: avg(slice.map((p) => p.value)) });
  }
  return out;
}

/** Most frequent value; ties resolve to the largest. */
export function mode(values) {
  if (!values.length) return null;
  const counts = new Map();
  values.forEach((v) => counts.set(v, (counts.get(v) || 0) + 1));
  let best = null;
  let bestCount = -1;
  for (const [v, c] of counts) {
    if (c > bestCount || (c === bestCount && v > best)) {
      best = v;
      bestCount = c;
    }
  }
  return best;
}
