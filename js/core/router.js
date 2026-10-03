// === Hash router ===
// Hash routes keep the app a pure static deploy (no server rewrites) and make
// back/forward work like a native app.

import { clear } from '../ui/components.js';
import * as store from './store.js';

const routes = [];
let outlet = null;
let current = null;
let unmount = null;
const scrollMemory = new Map();

/**
 * @param {string} pattern e.g. '/history/:id'
 * @param {object} view    { render(params) => Node, live?: boolean, tab?: string }
 */
export function route(pattern, view) {
  const parts = pattern.split('/').filter(Boolean);
  routes.push({ pattern, parts, view });
}

function match(path) {
  const segs = path.split('/').filter(Boolean);
  for (const r of routes) {
    if (r.parts.length !== segs.length) continue;
    const params = {};
    let ok = true;
    for (let i = 0; i < r.parts.length; i++) {
      const p = r.parts[i];
      if (p.startsWith(':')) params[p.slice(1)] = decodeURIComponent(segs[i]);
      else if (p !== segs[i]) {
        ok = false;
        break;
      }
    }
    if (ok) return { ...r, params };
  }
  return null;
}

export function currentPath() {
  const hash = location.hash.replace(/^#/, '');
  return hash || '/';
}

export function go(path, { replace = false } = {}) {
  const target = `#${path}`;
  if (location.hash === target) {
    render();
    return;
  }
  if (replace) location.replace(target);
  else location.hash = target;
}

export const back = () => history.back();

export function start(el) {
  outlet = el;
  window.addEventListener('hashchange', () => render());
  store.on('change', () => {
    if (current && current.view.live !== false) render({ keepScroll: true });
  });
  render();
}

export function render({ keepScroll = false } = {}) {
  if (!outlet) return;
  const path = currentPath();
  const found = match(path) || match('/');
  if (!found) return;

  const sameRoute = current && current.pattern === found.pattern &&
    JSON.stringify(current.params) === JSON.stringify(found.params);

  if (!sameRoute && current) scrollMemory.set(current.pattern + JSON.stringify(current.params), window.scrollY);

  const scrollY = keepScroll && sameRoute ? window.scrollY : scrollMemory.get(found.pattern + JSON.stringify(found.params)) || 0;

  if (unmount) {
    try { unmount(); } catch (err) { console.error('[router] unmount failed', err); }
    unmount = null;
  }

  let node;
  try {
    node = found.view.render(found.params);
  } catch (err) {
    console.error('[router] render failed', err);
    node = document.createElement('div');
    node.className = 'card';
    node.textContent = 'Something went wrong rendering this screen.';
  }
  if (node && node.unmount) unmount = node.unmount;

  clear(outlet);
  outlet.appendChild(node);
  current = found;
  setActiveTab(found.view.tab || found.parts[0] || 'home');
  requestAnimationFrame(() => window.scrollTo(0, scrollY));
  document.title = found.view.title ? `${found.view.title} · Workout Log` : 'Workout Log';
}

function setActiveTab(tab) {
  document.querySelectorAll('.nav-item').forEach((btn) => {
    const isActive = btn.dataset.tab === tab;
    btn.classList.toggle('is-active', isActive);
    btn.setAttribute('aria-current', isActive ? 'page' : 'false');
  });
}

export const activeParams = () => (current ? current.params : {});
