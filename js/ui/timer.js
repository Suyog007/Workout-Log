// === Rest timer ===
// State is a target timestamp in localStorage, so the countdown stays correct
// across a locked screen, a backgrounded tab or a reload.

import { h, clear, icon, haptic } from './components.js';
import { fmtClock } from '../core/util.js';

const KEY = 'wl.restTimer';
const listeners = new Set();
let bar = null;
let interval = null;
let audioCtx = null;

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const state = JSON.parse(raw);
    return state && state.endsAt ? state : null;
  } catch {
    return null;
  }
}

function write(state) {
  try {
    if (state) localStorage.setItem(KEY, JSON.stringify(state));
    else localStorage.removeItem(KEY);
  } catch { /* storage unavailable */ }
}

export function remaining() {
  const state = read();
  if (!state) return null;
  return Math.max(0, Math.round((state.endsAt - Date.now()) / 1000));
}

export function isRunning() {
  const r = remaining();
  return r !== null && r > 0;
}

export function onRestChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function notifyListeners() {
  listeners.forEach((fn) => fn(remaining()));
}

export function start(seconds, label = 'Rest') {
  write({ endsAt: Date.now() + seconds * 1000, durationSec: seconds, label, notified: false });
  ensureTicking();
  renderBar();
  notifyListeners();
}

export function adjust(deltaSeconds) {
  const state = read();
  if (!state) return;
  const base = Math.max(Date.now(), state.endsAt);
  const endsAt = Math.max(Date.now() + 1000, base + deltaSeconds * 1000);
  write({ ...state, endsAt, notified: false });
  renderBar();
  notifyListeners();
}

export function stop() {
  write(null);
  renderBar();
  notifyListeners();
}

function ensureTicking() {
  if (interval) return;
  interval = setInterval(() => {
    const state = read();
    if (!state) {
      clearInterval(interval);
      interval = null;
      renderBar();
      return;
    }
    const left = remaining();
    if (left === 0 && !state.notified) {
      write({ ...state, notified: true });
      fire(state);
    }
    renderBar();
    notifyListeners();
  }, 500);
}

function fire(state) {
  haptic([30, 80, 30]);
  beep();
  if (document.hidden && 'Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification('Rest complete', { body: `${state.label} — next set.`, tag: 'wl-rest', silent: false });
    } catch { /* some platforms require a service-worker registration */ }
  }
}

function beep() {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const now = audioCtx.currentTime;
    [0, 0.18].forEach((offset) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.0001, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.25, now + offset + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.14);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start(now + offset);
      osc.stop(now + offset + 0.16);
    });
  } catch { /* audio blocked until first gesture */ }
}

/** Unlock WebAudio on the first user gesture so the end-of-rest beep works. */
export function primeAudio() {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
  } catch { /* ignore */ }
}

export async function requestAlerts() {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

// --- Floating bar --------------------------------------------------------
export function mount(host) {
  bar = host;
  renderBar();
  const state = read();
  if (state) ensureTicking();
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) renderBar();
  });
}

function renderBar() {
  if (!bar) return;
  const state = read();
  if (!state) {
    bar.classList.remove('is-visible');
    document.body.classList.remove('rest-active');
    clear(bar);
    return;
  }
  document.body.classList.add('rest-active');
  const left = remaining();
  const pct = state.durationSec ? Math.max(0, (left / state.durationSec) * 100) : 0;
  const done = left === 0;
  clear(bar);
  bar.className = `rest-bar is-visible ${done ? 'is-done' : ''}`.trim();
  bar.appendChild(h('span', { class: 'rest-progress', style: { width: `${pct}%` } }));
  bar.appendChild(
    h('div', { class: 'rest-inner' },
      h('span', { class: 'rest-icon' }, icon(done ? 'check' : 'timer', 18)),
      h('span', { class: 'rest-label' }, done ? 'Rest complete' : state.label),
      h('span', { class: 'rest-clock', 'aria-live': 'off' }, fmtClock(left)),
      h('div', { class: 'rest-actions' },
        h('button', { class: 'rest-btn', type: 'button', onClick: () => adjust(-15) }, '−15s'),
        h('button', { class: 'rest-btn', type: 'button', onClick: () => adjust(30) }, '+30s'),
        h('button', { class: 'rest-btn rest-btn-stop', type: 'button', onClick: stop }, done ? 'Done' : 'Skip')
      )
    )
  );
}

// --- Elapsed workout clock ----------------------------------------------

/** Ticks `fn(seconds)` once a second from a start timestamp. */
export function elapsedTicker(startedAt, fn) {
  const tick = () => fn(Math.max(0, Math.round((Date.now() - startedAt) / 1000)));
  tick();
  const id = setInterval(tick, 1000);
  return () => clearInterval(id);
}
