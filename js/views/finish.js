// === Post-workout summary ===
// Finalises the session (duration, totals, PR detection) and offers the one
// optional extra: cardio. Cardio is never required to complete a workout.

import { h, card, button, statTile, icon, pill, linkButton, emptyState } from '../ui/components.js';
import * as M from '../core/model.js';
import * as store from '../core/store.js';
import { detectForSession } from '../logic/prs.js';
import { go } from '../core/router.js';
import { cardioSheet, noteSheet } from '../ui/entry.js';
import { fmtDuration, fmtInt, fmtNum, fmtDateLong } from '../core/util.js';

export const title = 'Workout complete';
export const tab = 'workout';

export function render({ id }) {
  const session = M.getSession(id);
  if (!session) return emptyState('Workout not found', 'It may have been discarded.', button('Back to home', { variant: 'secondary', onClick: () => go('/home') }));

  const root = h('div', { class: 'stack' });

  // Finalise once; revisiting the screen just re-reads the stored result.
  if (session.status === 'active') {
    (async () => {
      const finished = await M.finishSession(session.id);
      await detectForSession(finished, M.sessionExercises(session.id), M.sessionSets(session.id));
      store.emit('change', { store: 'sessions' });
    })();
    return h('div', { class: 'stack' }, card(null, h('p', { class: 'muted' }, 'Saving workout…')));
  }

  const sets = M.sessionSets(session.id).filter((s) => s.completed);
  const prs = M.prsForSession(session.id);
  const cardio = M.cardioForSession(session.id) || M.cardioOn(session.date)[0] || null;
  const unit = M.unit();

  root.appendChild(card({ class: 'hero' },
    h('div', { class: 'stack tight' },
      h('div', { class: 'hero-eyebrow' }, icon('check', 15), 'Workout complete'),
      h('h1', { class: 'hero-title' }, session.dayName),
      h('p', { class: 'hero-sub' }, `${fmtDateLong(session.date)} · Week ${session.week}`)
    ),
    h('div', { class: 'stat-grid cols-2' },
      statTile('Duration', fmtDuration(session.durationSec)),
      statTile('Total sets', fmtInt(session.totalSets)),
      statTile('Volume', fmtInt(Math.round(session.totalVolume)), unit),
      statTile('Exercises', `${session.exercisesCompleted}/${session.exercisesPlanned}`, 'completed')
    )
  ));

  if (prs.length) {
    root.appendChild(card(null,
      h('h2', { class: 'card-title' }, prs.length === 1 ? 'New personal record' : `${prs.length} new personal records`),
      h('div', { class: 'stack tight' },
        ...prs.map((pr) =>
          h('div', { class: 'pr-item' },
            h('span', { class: 'pr-icon' }, icon('trophy', 18)),
            h('div', { class: 'grow' },
              h('div', { class: 'pr-name' }, pr.exerciseId ? M.exerciseName(pr.exerciseId) : 'Workout volume'),
              h('div', { class: 'pr-detail' }, pr.label)
            ),
            pill(prLabel(pr.type), 'warn')
          )
        )
      )
    ));
  }

  root.appendChild(card({ class: 'tight' },
    h('div', { class: 'row between' },
      h('div', { class: 'grow' },
        h('div', { class: 'list-title' }, 'Cardio'),
        h('div', { class: 'list-sub' },
          cardio ? `${cardio.type} · ${cardio.durationMin} min${cardio.incline != null ? ` · ${fmtNum(cardio.incline)}%` : ''}` : 'Optional — not logged')
      ),
      button(cardio ? 'Edit' : 'Log cardio', {
        variant: cardio ? 'secondary' : 'primary',
        onClick: () => cardioSheet({ date: session.date, sessionId: session.id, existing: cardio, onSaved: () => go(`/finish/${session.id}`) }),
      })
    )
  ));

  const topSets = bestSetPerExercise(session.id);
  if (topSets.length) {
    root.appendChild(card(null,
      h('h2', { class: 'card-title' }, 'Top set per exercise'),
      h('div', { class: 'stack tight' },
        ...topSets.map((t) =>
          h('div', { class: 'kv' },
            h('span', { class: 'k' }, t.name),
            h('span', { class: 'v' }, `${fmtNum(t.weight)} ${unit} × ${t.reps}`)
          )
        )
      )
    ));
  }

  root.appendChild(card({ class: 'tight' },
    linkButton(session.note ? 'Edit workout note' : 'Add a note about today', () => noteSheet({
      value: session.note,
      onSave: async (text) => { await M.saveSessionNote(session.id, text); go(`/finish/${session.id}`); },
    }), 'note'),
    session.note ? h('p', { class: 'small muted' }, session.note) : null
  ));

  root.appendChild(h('div', { class: 'row', style: { gap: '9px' } },
    button('Done', { variant: 'primary', class: 'grow btn-lg', onClick: () => go('/home') }),
    button('Full detail', { variant: 'secondary', onClick: () => go(`/history/${session.id}`) })
  ));

  return root;
}

const prLabel = (type) =>
  ({ weight: 'Heaviest', reps: 'Most reps', e1rm: 'Est. 1RM', volume: 'Volume' }[type] || 'PR');

function bestSetPerExercise(sessionId) {
  return M.sessionExercises(sessionId)
    .map((es) => {
      const sets = M.exerciseSessionSets(es.id).filter((s) => s.completed && s.reps > 0);
      if (!sets.length) return null;
      const best = sets.reduce((a, s) => (s.weight > a.weight || (s.weight === a.weight && s.reps > a.reps) ? s : a), sets[0]);
      return { name: M.exerciseName(es.exerciseId), weight: best.weight, reps: best.reps };
    })
    .filter(Boolean);
}
