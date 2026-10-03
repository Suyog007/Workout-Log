// === Compare two workouts ===

import { h, card, button, emptyState, statTile } from '../ui/components.js';
import * as M from '../core/model.js';
import { go } from '../core/router.js';
import { fmtDate, fmtDuration, fmtInt, fmtNum, fmtSigned } from '../core/util.js';

export const title = 'Compare';
export const tab = 'history';

export function render({ a, b }) {
  const left = M.getSession(a);
  const right = M.getSession(b);
  if (!left || !right) {
    return emptyState('Could not load both workouts', null, button('Back', { variant: 'secondary', onClick: () => go('/history') }));
  }
  // Oldest on the left so deltas read as progress over time.
  const [first, second] = left.date <= right.date ? [left, right] : [right, left];
  const unit = M.unit();
  const root = h('div', { class: 'stack' });

  root.appendChild(card(null,
    h('h1', { class: 'hero-title', style: { fontSize: '20px' } }, `${first.dayName} vs ${second.dayName}`),
    h('p', { class: 'hero-sub' }, `${fmtDate(first.date)} → ${fmtDate(second.date)}`),
    h('div', { class: 'stat-grid cols-2' },
      statTile('Duration', fmtDuration(second.durationSec), `${fmtSigned((second.durationSec - first.durationSec) / 60, 0, 'min')} vs first`),
      statTile('Sets', fmtInt(second.totalSets), fmtSigned(second.totalSets - first.totalSets, 0)),
      statTile('Volume', fmtInt(Math.round(second.totalVolume)), `${fmtSigned(second.totalVolume - first.totalVolume, 0)} ${unit}`, {
        tone: second.totalVolume > first.totalVolume ? 'good' : undefined,
      }),
      statTile('Exercises', `${second.exercisesCompleted ?? '—'}`, `was ${first.exercisesCompleted ?? '—'}`)
    )
  ));

  const map = (session) => {
    const out = new Map();
    M.sessionExercises(session.id).forEach((es) => {
      const sets = M.exerciseSessionSets(es.id).filter((s) => s.completed);
      if (!sets.length) return;
      const top = sets.reduce((x, s) => (s.weight > x.weight || (s.weight === x.weight && s.reps > x.reps) ? s : x), sets[0]);
      out.set(es.exerciseId, {
        sets: sets.length,
        reps: sets.reduce((x, s) => x + s.reps, 0),
        volume: sets.reduce((x, s) => x + s.weight * s.reps, 0),
        top,
      });
    });
    return out;
  };

  const mapA = map(first);
  const mapB = map(second);
  const ids = [...new Set([...mapA.keys(), ...mapB.keys()])];

  const grid = h('div', { class: 'compare-grid' },
    h('span', { class: 'xs dim' }, fmtDate(first.date)),
    h('span', { class: 'mid' }, ''),
    h('span', { class: 'xs dim', style: { textAlign: 'right' } }, fmtDate(second.date))
  );

  ids.forEach((id) => {
    const x = mapA.get(id);
    const y = mapB.get(id);
    grid.appendChild(h('span', { class: 'ex' }, M.exerciseName(id)));
    grid.appendChild(h('span', null, x ? `${fmtNum(x.top.weight)} ${unit} × ${x.top.reps}` : '—'));
    grid.appendChild(h('span', { class: 'mid' }, 'top set'));
    grid.appendChild(h('span', { style: { textAlign: 'right', color: y && x && (y.top.weight > x.top.weight || (y.top.weight === x.top.weight && y.top.reps > x.top.reps)) ? 'var(--good)' : null } },
      y ? `${fmtNum(y.top.weight)} ${unit} × ${y.top.reps}` : '—'));
    grid.appendChild(h('span', null, x ? `${x.reps} reps` : '—'));
    grid.appendChild(h('span', { class: 'mid' }, 'volume'));
    grid.appendChild(h('span', { style: { textAlign: 'right' } }, y ? `${y.reps} reps` : '—'));
  });

  root.appendChild(card(null, h('h2', { class: 'card-title' }, 'Exercise by exercise'), grid));
  root.appendChild(button('Back to history', { variant: 'secondary', class: 'btn-block', onClick: () => go('/history') }));
  return root;
}
