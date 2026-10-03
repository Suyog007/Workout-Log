// === Tiny DOM toolkit + shared widgets ===
// No framework: `h()` builds real nodes, so screens can patch one row without
// re-rendering (and without losing input focus mid-set).

export function h(tag, props = null, ...children) {
  const node = document.createElement(tag);
  if (props) {
    for (const [key, value] of Object.entries(props)) {
      if (value === null || value === undefined || value === false) continue;
      if (key === 'class' || key === 'className') node.className = value;
      else if (key === 'style' && typeof value === 'object') Object.assign(node.style, value);
      else if (key === 'dataset') Object.assign(node.dataset, value);
      else if (key === 'html') node.innerHTML = value;
      else if (key.startsWith('on') && typeof value === 'function') {
        node.addEventListener(key.slice(2).toLowerCase(), value);
      } else if (key === 'value' || key === 'checked' || key === 'disabled') node[key] = value;
      else node.setAttribute(key, value === true ? '' : value);
    }
  }
  append(node, children);
  return node;
}

function append(node, children) {
  children.flat(Infinity).forEach((child) => {
    if (child === null || child === undefined || child === false) return;
    node.appendChild(child instanceof Node ? child : document.createTextNode(String(child)));
  });
}

export function frag(...children) {
  const f = document.createDocumentFragment();
  append(f, children);
  return f;
}

export function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
  return node;
}

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

// --- Icons ---------------------------------------------------------------
const ICONS = {
  home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.5"/><path d="M9.5 21v-6h5v6"/>',
  dumbbell: '<path d="M6.5 6.5v11M3.5 9v6M17.5 6.5v11M20.5 9v6M6.5 12h11"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  history: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>',
  user: '<circle cx="12" cy="8" r="3.5"/><path d="M5 20c0-3.5 3.1-5.5 7-5.5s7 2 7 5.5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  check: '<path d="M4 12.5 9 17.5 20 6.5"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7.5V12l3 1.8"/>',
  trophy: '<path d="M8 4h8v4a4 4 0 0 1-8 0z"/><path d="M8 5H5.5a2.5 2.5 0 0 0 2.5 4M16 5h2.5a2.5 2.5 0 0 1-2.5 4"/><path d="M12 12v4M9 20h6M10 16h4"/>',
  chevron: '<path d="M9 5l7 7-7 7"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  edit: '<path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17z"/>',
  swap: '<path d="M4 8h12l-3-3M20 16H8l3 3"/>',
  note: '<path d="M6 3h9l4 4v14H6z"/><path d="M9 11h7M9 15h5"/>',
  walk: '<circle cx="13" cy="4" r="2"/><path d="M11 8l-2 5 3 2 1 6M14 9l3 2 1 4M9 13l-3 8"/>',
  scale: '<rect x="3" y="4" width="18" height="16" rx="3"/><path d="M8 11a4 4 0 0 1 8 0"/><path d="M12 11 10 8.5"/>',
  flame: '<path d="M12 21c4 0 6-2.6 6-6 0-4.5-4.5-6-4.5-10C10 7 9 9 9 11c-1-.6-1.5-1.6-1.5-3C6 9.5 6 12 6 15c0 3.4 2 6 6 6z"/>',
  timer: '<circle cx="12" cy="13" r="8"/><path d="M12 9.5V13M9.5 2h5"/>',
  play: '<path d="M7 4.5v15l13-7.5z"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14"/>',
  download: '<path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M5 20h14"/>',
  upload: '<path d="M12 15V4M7.5 8.5 12 4l4.5 4.5M5 20h14"/>',
  cloud: '<path d="M7 18h10a3.5 3.5 0 0 0 .3-7A5 5 0 0 0 7.6 10 3.8 3.8 0 0 0 7 18z"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M18.4 5.6l-1.8 1.8M7.4 16.6l-1.8 1.8"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="16" rx="2.5"/><path d="M8 3v4M16 3v4M3.5 10h17"/>',
  book: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v18H6.5A2.5 2.5 0 0 0 4 18.5z"/><path d="M4 18.5A2.5 2.5 0 0 1 6.5 16H20"/>',
  arrowRight: '<path d="M5 12h14M13 6l6 6-6 6"/>',
};

export function icon(name, size = 20, cls = '') {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', size);
  svg.setAttribute('height', size);
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.8');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  if (cls) svg.setAttribute('class', cls);
  svg.innerHTML = ICONS[name] || '';
  return svg;
}

// --- Layout primitives ---------------------------------------------------
export const card = (props, ...children) =>
  h('section', { ...props, class: `card ${props?.class || ''}`.trim() }, ...children);

export const row = (props, ...children) =>
  h('div', { ...props, class: `row ${props?.class || ''}`.trim() }, ...children);

export function sectionHeader(title, action) {
  return h('div', { class: 'section-header' },
    h('h2', { class: 'section-title' }, title),
    action || null
  );
}

export function linkButton(label, onClick, iconName) {
  return h('button', { class: 'link-btn', type: 'button', onClick },
    label,
    iconName ? icon(iconName, 16) : null
  );
}

export function button(label, props = {}) {
  const { variant = 'secondary', iconName, ...rest } = props;
  return h('button', { type: 'button', ...rest, class: `btn btn-${variant} ${rest.class || ''}`.trim() },
    iconName ? icon(iconName, 18) : null,
    h('span', null, label)
  );
}

export function statTile(label, value, sub, opts = {}) {
  return h('div', { class: `stat ${opts.class || ''}`.trim() },
    h('div', { class: 'stat-label' }, label),
    h('div', { class: `stat-value ${opts.tone ? 'tone-' + opts.tone : ''}`.trim() }, value),
    sub ? h('div', { class: `stat-sub ${opts.subTone ? 'tone-' + opts.subTone : ''}`.trim() }, sub) : null
  );
}

export function progressBar(pct, opts = {}) {
  const clamped = Math.max(0, Math.min(100, Math.round(pct || 0)));
  return h('div', {
    class: `progress ${opts.class || ''}`.trim(),
    role: 'progressbar',
    'aria-valuenow': clamped,
    'aria-valuemin': '0',
    'aria-valuemax': '100',
    'aria-label': opts.label || 'Progress',
  }, h('span', { class: 'progress-fill', style: { width: clamped + '%' } }));
}

export function pill(text, tone = 'neutral') {
  return h('span', { class: `pill pill-${tone}` }, text);
}

export function emptyState(title, body, action) {
  return h('div', { class: 'empty' },
    h('p', { class: 'empty-title' }, title),
    body ? h('p', { class: 'empty-body' }, body) : null,
    action || null
  );
}

export function segmented(options, value, onChange, opts = {}) {
  const wrap = h('div', { class: `segmented ${opts.class || ''}`.trim(), role: 'group' });
  options.forEach((opt) => {
    const o = typeof opt === 'string' ? { value: opt, label: opt } : opt;
    const btn = h('button', {
      type: 'button',
      class: `seg ${o.value === value ? 'is-active' : ''}`.trim(),
      'aria-pressed': o.value === value ? 'true' : 'false',
      onClick: () => {
        [...wrap.children].forEach((c) => {
          c.classList.remove('is-active');
          c.setAttribute('aria-pressed', 'false');
        });
        btn.classList.add('is-active');
        btn.setAttribute('aria-pressed', 'true');
        onChange(o.value);
      },
    }, o.label);
    wrap.appendChild(btn);
    // A long day/week strip can start scrolled past the active option.
    if (o.value === value) {
      requestAnimationFrame(() => {
        if (wrap.scrollWidth > wrap.clientWidth) {
          wrap.scrollLeft = btn.offsetLeft - (wrap.clientWidth - btn.offsetWidth) / 2;
        }
      });
    }
  });
  return wrap;
}

/**
 * Big numeric field with −/+ steppers. Returns the wrapper with `.input`
 * exposed so callers can read/patch the value without a re-render.
 */
export function numberField({ value, step = 1, min = 0, max = null, decimals = false, label, onChange, size = 'md', placeholder = '' }) {
  const input = h('input', {
    class: `num-input num-${size}`,
    type: 'text',
    inputmode: decimals ? 'decimal' : 'numeric',
    enterkeyhint: 'done',
    'aria-label': label || 'Value',
    value: value === null || value === undefined ? '' : String(value),
    placeholder,
  });

  const read = () => {
    const raw = input.value.replace(',', '.').trim();
    if (raw === '') return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  };

  const commit = (next) => {
    let n = next;
    if (n !== null) {
      if (min !== null) n = Math.max(min, n);
      if (max !== null) n = Math.min(max, n);
      n = Math.round(n * 1000) / 1000;
    }
    input.value = n === null ? '' : String(n);
    if (onChange) onChange(n);
  };

  const bump = (dir) => {
    const current = read();
    const base = current === null ? (value ?? 0) : current;
    commit(base + dir * step);
  };

  input.addEventListener('change', () => commit(read()));
  input.addEventListener('blur', () => commit(read()));
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') input.blur();
  });

  const wrap = h('div', { class: 'num-field' },
    h('button', { type: 'button', class: 'num-btn', 'aria-label': `Decrease ${label || ''}`, onClick: () => bump(-1) }, icon('minus', 18)),
    input,
    h('button', { type: 'button', class: 'num-btn', 'aria-label': `Increase ${label || ''}`, onClick: () => bump(1) }, icon('plus', 18))
  );
  wrap.input = input;
  wrap.read = read;
  wrap.set = (v) => {
    input.value = v === null || v === undefined ? '' : String(v);
  };
  return wrap;
}

export function field(label, control, hint) {
  return h('label', { class: 'field' },
    h('span', { class: 'field-label' }, label),
    control,
    hint ? h('span', { class: 'field-hint' }, hint) : null
  );
}

export function textInput({ value = '', placeholder = '', type = 'text', onChange, inputmode, label }) {
  const input = h('input', {
    class: 'text-input', type, value, placeholder,
    'aria-label': label || placeholder || 'Text',
    inputmode: inputmode || null,
  });
  if (onChange) {
    input.addEventListener('change', () => onChange(input.value));
    input.addEventListener('blur', () => onChange(input.value));
  }
  return input;
}

export function textArea({ value = '', placeholder = '', onChange, rows = 3, label }) {
  const ta = h('textarea', { class: 'text-area', rows, placeholder, 'aria-label': label || placeholder || 'Notes' });
  ta.value = value || '';
  if (onChange) {
    ta.addEventListener('change', () => onChange(ta.value));
    ta.addEventListener('blur', () => onChange(ta.value));
  }
  return ta;
}

export function toggle(label, checked, onChange, hint) {
  const input = h('input', { type: 'checkbox', class: 'toggle-input', checked });
  input.addEventListener('change', () => onChange(input.checked));
  return h('label', { class: 'toggle-row' },
    h('span', { class: 'toggle-text' },
      h('span', { class: 'toggle-label' }, label),
      hint ? h('span', { class: 'toggle-hint' }, hint) : null
    ),
    h('span', { class: 'toggle' }, input, h('span', { class: 'toggle-track' }, h('span', { class: 'toggle-knob' })))
  );
}

// --- Bottom sheet --------------------------------------------------------
let openSheet = null;

export function sheet(title, content, opts = {}) {
  closeSheet();
  const body = h('div', { class: 'sheet-body' }, content);
  const panel = h('div', { class: 'sheet', role: 'dialog', 'aria-modal': 'true', 'aria-label': title || 'Dialog' },
    h('div', { class: 'sheet-head' },
      h('h3', null, title || ''),
      h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Close', onClick: () => closeSheet() }, icon('close', 20))
    ),
    body,
    opts.footer ? h('div', { class: 'sheet-foot' }, opts.footer) : null
  );
  const backdrop = h('div', { class: 'sheet-backdrop', onClick: (e) => { if (e.target === backdrop) closeSheet(); } }, panel);
  document.body.appendChild(backdrop);
  document.body.classList.add('sheet-open');
  requestAnimationFrame(() => backdrop.classList.add('is-open'));
  openSheet = { backdrop, onClose: opts.onClose };
  const focusable = panel.querySelector('input, textarea, button:not(.icon-btn)');
  if (focusable && opts.autofocus !== false) setTimeout(() => focusable.focus(), 120);
  return { close: closeSheet, panel, body };
}

export function closeSheet() {
  if (!openSheet) return;
  const { backdrop, onClose } = openSheet;
  openSheet = null;
  backdrop.classList.remove('is-open');
  document.body.classList.remove('sheet-open');
  setTimeout(() => backdrop.remove(), 180);
  if (onClose) onClose();
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeSheet();
});

/** Promise-based confirm — native dialogs are a poor fit on mobile. */
export function confirmSheet({ title, body, confirmLabel = 'Confirm', tone = 'danger' }) {
  return new Promise((resolve) => {
    let settled = false;
    const done = (value) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };
    const s = sheet(title, h('p', { class: 'sheet-text' }, body), {
      autofocus: false,
      onClose: () => done(false),
      footer: frag(
        button('Cancel', { variant: 'ghost', onClick: () => { done(false); closeSheet(); } }),
        button(confirmLabel, { variant: tone, onClick: () => { done(true); closeSheet(); } })
      ),
    });
    void s;
  });
}

// --- Toast ---------------------------------------------------------------
let toastTimer = null;

export function toast(message, tone = 'neutral') {
  let el = $('#toast');
  if (!el) {
    el = h('div', { id: 'toast', class: 'toast', role: 'status', 'aria-live': 'polite' });
    document.body.appendChild(el);
  }
  el.textContent = message;
  el.className = `toast toast-${tone} is-visible`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('is-visible'), 2600);
}

export function haptic(ms = 12) {
  if (navigator.vibrate) {
    try { navigator.vibrate(ms); } catch { /* unsupported */ }
  }
}
