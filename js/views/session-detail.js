// === One workout, in full ===

import { h, card, button, statTile, icon, pill, emptyState, linkButton, confirmSheet, toast } from '../ui/components.js';
import * as M from '../core/model.js';
import { go } from '../core/router.js';
import { cardioSheet, noteSheet, readinessLine } from '../ui/entry.js';
import { fmtDateLong, fmtDuration, fmtInt, fmtNum } from '../core/util.js';

export const title = 'Workout';
export const tab = 'history';

export function render({ id }) {
  const session = M.getSession(id);
  if (!session) return emptyState('Workout not found', null, button('Back', { variant: 'secondary', onClick: () => go('/history') }));

  const unit = M.unit();
  const exSessions = M.sessionExercises(session.id);
  const prs = M.prsForSession(session.id);
  const cardio = M.cardioForSession(session.id);
  const readiness = readinessLine(session.date);
  const root = h('div', { class: 'stack' });

  root.appendChild(card(null,
    h('div', { class: 'row between' },
      h('div', null,
        h('h1', { class: 'hero-title', style: { fontSize: '22px' } }, session.dayName),
        h('p', { class: 'hero-sub' }, `${fmtDateLong(session.date)} · Week ${session.week}`)
      ),
      session.status === 'completed' ? pill('Completed', 'good') : pill('In progress', 'accent')
    ),
    h('div', { class: 'stat-grid cols-2' },
      statTile('Duration', fmtDuration(session.durationSec)),
      statTile('Sets', fmtInt(session.totalSets)),
      statTile('Volume', fmtInt(Math.round(session.totalVolume)), unit),
      statTile('Exercises', `${session.exercisesCompleted ?? exSessions.length}/${session.exercisesPlanned ?? exSessions.length}`)
    ),
    readiness ? h('p', { class: 'xs dim' }, readiness) : null
  ));

  if (prs.length) {
    root.appendChild(card({ class: 'tight' },
      ...prs.map((pr) =>
        h('div', { class: 'pr-item' },
          h('span', { class: 'pr-icon' }, icon('trophy', 18)),
          h('div', { class: 'grow' },
            h('div', { class: 'pr-name' }, pr.exerciseId ? M.exerciseName(pr.exerciseId) : 'Workout volume'),
            h('div', { class: 'pr-detail' }, pr.label)
          )
        )
      )
    ));
  }

  exSessions.forEach((es, i) => {
    const sets = M.exerciseSessionSets(es.id).filter((s) => s.completed);
    if (!sets.length) return;
    const ex = M.getExercise(es.exerciseId);
    root.appendChild(card({ class: 'tight' },
      h('div', { class: 'row', style: { gap: '10px' } },
        h('span', { class: 'ex-index' }, i + 1),
        h('div', { class: 'grow' },
          h('div', { class: 'list-title' }, ex ? ex.name : 'Exercise', ex && ex.unilateral ? h('span', { class: 'dim xs' }, ' · per side') : null),
          h('div', { class: 'list-sub' }, `target ${es.targetSets} × ${es.repMin}–${es.repMax}`)
        )
      ),
      h('div', { class: 'stack tight' },
        ...sets.map((s) =>
          h('div', { class: 'kv' },
            h('span', { class: 'k small' }, `Set ${s.setNumber}`),
            h('span', { class: 'v' },
              `${fmtNum(s.weight)} ${unit} × ${s.reps}`,
              s.rir != null ? h('span', { class: 'rir-tag', style: { marginLeft: '8px' } }, `RIR ${s.rir === 4 ? '4+' : s.rir}`) : null
            )
          )
        )
      ),
      h('div', { class: 'kv xs dim' },
        h('span', { class: 'k' }, 'Total'),
        h('span', { class: 'v' }, `${sets.reduce((a, s) => a + s.reps, 0)} reps · ${fmtInt(Math.round(sets.reduce((a, s) => a + s.weight * s.reps, 0)))} ${unit}`)
      ),
      es.notes ? h('p', { class: 'small muted' }, es.notes) : null
    ));
  });

  root.appendChild(card({ class: 'tight' },
    h('div', { class: 'row between' },
      h('div', { class: 'grow' },
        h('div', { class: 'list-title' }, 'Cardio'),
        h('div', { class: 'list-sub' }, cardio ? `${cardio.type} · ${cardio.durationMin} min${cardio.speed != null ? ` · ${fmtNum(cardio.speed)} km/h` : ''}${cardio.incline != null ? ` · ${fmtNum(cardio.incline)}%` : ''}` : 'Not logged')
      ),
      button(cardio ? 'Edit' : 'Add', { variant: 'secondary', onClick: () => cardioSheet({ date: session.date, sessionId: session.id, existing: cardio }) })
    )
  ));

  root.appendChild(card({ class: 'tight' },
    h('div', { class: 'row between' },
      h('span', { class: 'section-title' }, 'Workout note'),
      linkButton(session.note ? 'Edit' : 'Add', () => noteSheet({
        value: session.note,
        onSave: (text) => M.saveSessionNote(session.id, text),
      }), 'note')
    ),
    h('p', { class: 'small muted' }, session.note || 'No note for this workout.')
  ));

  root.appendChild(h('div', { class: 'row', style: { gap: '9px' } },
    button('Back to history', { variant: 'secondary', class: 'grow', onClick: () => go('/history') }),
    button('Delete', {
      variant: 'danger',
      onClick: async () => {
        const ok = await confirmSheet({
          title: 'Delete workout?',
          body: `${session.dayName} on ${fmtDateLong(session.date)} and all its sets will be removed. This also removes it from your progress charts.`,
          confirmLabel: 'Delete',
        });
        if (!ok) return;
        await M.discardSession(session.id);
        toast('Workout deleted');
        go('/history');
      },
    })
  ));

  return root;
}
