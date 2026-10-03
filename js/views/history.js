// === History list ===

import { h, card, button, icon, pill, emptyState, sectionHeader, linkButton } from '../ui/components.js';
import * as M from '../core/model.js';
import * as A from '../logic/analytics.js';
import { go } from '../core/router.js';
import { fmtDate, fmtDuration, fmtInt } from '../core/util.js';

export const title = 'History';
export const tab = 'history';

let compareMode = false;
let picked = [];

export function render() {
  const rows = A.historyList();
  const root = h('div', { class: 'stack' });

  if (!rows.length) {
    return h('div', { class: 'stack' }, card(null, emptyState(
      'No workouts logged yet',
      'Finish a session and it will show up here with every set you recorded.',
      button('Start a workout', { variant: 'primary', onClick: () => go('/workout') })
    )));
  }

  root.appendChild(h('div', { class: 'row between' },
    h('h1', { class: 'hero-title', style: { fontSize: '22px' } }, 'History'),
    linkButton(compareMode ? 'Cancel' : 'Compare two', () => {
      compareMode = !compareMode;
      picked = [];
      go('/history');
    }, compareMode ? 'close' : 'swap')
  ));

  if (compareMode) {
    root.appendChild(h('div', { class: 'banner accent' }, icon('swap', 18),
      `Pick two workouts to compare${picked.length ? ` — ${picked.length} selected` : ''}.`));
  }

  // Group by month for scannability.
  const groups = new Map();
  rows.forEach((r) => {
    const key = r.session.date.slice(0, 7);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(r);
  });

  for (const [month, items] of groups) {
    root.appendChild(h('div', { class: 'stack tight' },
      sectionHeader(monthLabel(month)),
      card({ class: 'flush' }, h('div', { class: 'list' }, ...items.map(historyRow)))
    ));
  }

  return root;
}

function historyRow({ session, exercises, prs, cardio }) {
  const day = M.dayMeta(session.dayKey);
  const group = day ? day.group : 'push';
  const isPicked = picked.includes(session.id);

  return h('button', {
    class: 'list-item', type: 'button',
    style: isPicked ? { background: 'var(--accent-soft)' } : null,
    onClick: () => {
      if (!compareMode) {
        go(`/history/${session.id}`);
        return;
      }
      if (isPicked) picked = picked.filter((p) => p !== session.id);
      else picked = [...picked, session.id].slice(-2);
      if (picked.length === 2) {
        const [a, b] = picked;
        compareMode = false;
        picked = [];
        go(`/compare/${a}/${b}`);
        return;
      }
      go('/history');
    },
  },
    h('span', { class: `list-badge ${group}` }, h('span', null, fmtDate(session.date).split(' ')[0]), h('strong', null, session.date.slice(8))),
    h('span', { class: 'grow' },
      h('span', { class: 'row between' },
        h('span', { class: 'list-title' }, session.dayName),
        h('span', { class: 'row', style: { gap: '6px' } },
          cardio ? h('span', { class: 'dim', title: 'Cardio logged' }, icon('walk', 14)) : null,
          prs ? pill(`${prs} PR${prs > 1 ? 's' : ''}`, 'warn') : null
        )
      ),
      h('span', { class: 'list-sub' },
        [
          fmtDuration(session.durationSec),
          `${fmtInt(session.totalSets)} sets`,
          `${fmtInt(Math.round(session.totalVolume))} ${M.unit()}`,
        ].join(' · ')
      )
    ),
    icon('chevron', 16)
  );
}

function monthLabel(key) {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(y, m - 1, 1);
  return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}
