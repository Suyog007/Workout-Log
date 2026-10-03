// === Bootstrap ===

import * as store from './core/store.js';
import * as M from './core/model.js';
import * as sync from './core/sync.js';
import { route, start as startRouter, go } from './core/router.js';
import { suggest } from './logic/progression.js';
import { applyTheme, watchSystemTheme } from './app-theme.js';
import * as timer from './ui/timer.js';
import { h, icon } from './ui/components.js';

import * as home from './views/home.js';
import * as workout from './views/workout.js';
import * as finish from './views/finish.js';
import * as progress from './views/progress.js';
import * as history from './views/history.js';
import * as sessionDetail from './views/session-detail.js';
import * as compare from './views/compare.js';
import * as metrics from './views/metrics.js';
import * as profile from './views/profile.js';
import * as library from './views/library.js';
import * as week from './views/week.js';
import * as block from './views/block.js';
import * as welcome from './views/welcome.js';

const RESET_KEY = 'wl.reset.v2';

async function main() {
  applyTheme(localStorage.getItem('wl.theme') || 'system');

  await clearPreviousVersion();

  await store.open();
  await store.hydrate();
  await M.bootstrap();

  // Break the import cycle between the model and the progression engine.
  M.registerProgression(suggest);

  const settings = M.settings();
  applyTheme(settings.theme);
  watchSystemTheme(() => M.settings().theme);

  buildChrome();
  registerRoutes();

  timer.mount(document.getElementById('rest-bar'));
  document.addEventListener('pointerdown', () => timer.primeAudio(), { once: true });

  if (!M.activeProgram() && !location.hash.startsWith('#/welcome')) {
    location.replace('#/welcome');
  } else if (!location.hash) {
    location.replace('#/home');
  }

  startRouter(document.getElementById('app'));

  // Non-blocking: cloud backup only runs if it was switched on.
  sync.init().catch((err) => console.warn('[sync] init skipped', err));
  registerServiceWorker();
}

/**
 * One-time cleanup of the previous version of this app: its Firestore offline
 * cache and stray localStorage keys. The new app keeps its own IndexedDB
 * database and writes to namespaced cloud collections, so nothing collides.
 */
async function clearPreviousVersion() {
  if (localStorage.getItem(RESET_KEY)) return;
  try {
    ['restDefault', 'gymlog.theme', 'lastWorkout'].forEach((k) => localStorage.removeItem(k));
    if (indexedDB.databases) {
      const dbs = await indexedDB.databases();
      await Promise.all(
        dbs
          .map((d) => d.name)
          .filter((name) => name && name !== store.DB_NAME)
          .map((name) => new Promise((resolve) => {
            const req = indexedDB.deleteDatabase(name);
            req.onsuccess = req.onerror = req.onblocked = () => resolve();
          }))
      );
    }
  } catch (err) {
    console.warn('[boot] cleanup of previous version skipped', err);
  }
  localStorage.setItem(RESET_KEY, String(Date.now()));
}

function registerRoutes() {
  route('/', home);
  route('/home', home);
  route('/welcome', welcome);
  route('/workout', workout);
  route('/finish/:id', finish);
  route('/progress', progress);
  route('/history', history);
  route('/history/:id', sessionDetail);
  route('/compare/:a/:b', compare);
  route('/metrics', metrics);
  route('/profile', profile);
  route('/library', library);
  route('/week/:n', week);
  route('/block', block);
}

const NAV = [
  { tab: 'home', label: 'Home', icon: 'home', path: '/home' },
  { tab: 'workout', label: 'Workout', icon: 'dumbbell', path: '/workout' },
  { tab: 'progress', label: 'Progress', icon: 'chart', path: '/progress' },
  { tab: 'history', label: 'History', icon: 'history', path: '/history' },
  { tab: 'profile', label: 'Profile', icon: 'user', path: '/profile' },
];

function buildChrome() {
  const nav = document.getElementById('nav-items');
  NAV.forEach((item) => {
    nav.appendChild(h('button', {
      class: 'nav-item', type: 'button', dataset: { tab: item.tab },
      onClick: () => go(item.path),
    }, icon(item.icon, 22), item.label));
  });

  const header = document.getElementById('header-sub');
  const program = M.activeProgram();
  if (program) {
    header.textContent = `Week ${Math.min(M.currentWeek(), program.weeks)}/${program.weeks}`;
  }
  store.on('change', () => {
    const p = M.activeProgram();
    header.textContent = p ? `Week ${Math.min(M.currentWeek(), p.weeks)}/${p.weeks}` : '';
  });
}

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  const hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.register('/sw.js').catch((err) => console.warn('[sw] registration failed', err));
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    // Only reload when an existing install was replaced by a new deploy.
    if (!hadController || reloading) return;
    reloading = true;
    location.reload();
  });
}

main().catch((err) => {
  console.error('[boot] failed', err);
  const app = document.getElementById('app');
  if (app) {
    app.innerHTML = '';
    app.appendChild(h('div', { class: 'card' },
      h('h2', { class: 'card-title' }, 'Could not start'),
      h('p', { class: 'small muted' }, String(err && err.message ? err.message : err)),
      h('button', { class: 'btn btn-secondary', onClick: () => location.reload() }, 'Reload')
    ));
  }
});
