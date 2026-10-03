// === Theme application ===
// 'system' leaves the OS in charge; an explicit choice stamps data-theme so it
// wins over the media query in both directions.

const META_DARK = '#0e0f13';
const META_LIGHT = '#f4f5f7';

export function applyTheme(choice = 'system') {
  const root = document.documentElement;
  const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
  const effective = choice === 'system' ? (prefersLight ? 'light' : 'dark') : choice;

  if (choice === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', choice);

  // Mirrored so the next launch can paint the right theme before IndexedDB opens.
  try { localStorage.setItem('wl.theme', choice); } catch { /* storage unavailable */ }

  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', effective === 'light' ? META_LIGHT : META_DARK);
}

export function watchSystemTheme(getChoice) {
  const mq = window.matchMedia('(prefers-color-scheme: light)');
  const handler = () => {
    if (getChoice() === 'system') applyTheme('system');
  };
  if (mq.addEventListener) mq.addEventListener('change', handler);
  else mq.addListener(handler);
}
