// === Workout screen ===
// The screen that matters. Previous performance and a suggestion are always on
// screen, so nothing has to be looked up. This view owns its own DOM updates
// (live = false) so typing in a set never triggers a re-render.

import {
  h, frag, card, button, icon, progressBar, sheet, closeSheet, confirmSheet,
  numberField, toast, haptic, linkButton, segmented, clear,
} from '../ui/components.js';
import * as M from '../core/model.js';
import { suggest, formatPrevious, progressionStatus } from '../logic/progression.js';
import { go } from '../core/router.js';
import * as timer from '../ui/timer.js';
import { readinessSheet, noteSheet, readinessLine } from '../ui/entry.js';
import { CORE_EXERCISE_IDS } from '../config/program.js';
import { today, fmtNum, fmtClock, fmtInt, relativeDay } from '../core/util.js';

export const title = 'Workout';
export const tab = 'workout';
export const live = false; // this view patches its own nodes

export function render() {
  const session = M.activeSession();
  return session ? activeScreen(session) : startScreen();
}

/* ========================================================================
   Start screen
   ===================================================================== */
function startScreen() {
  const date = today();
  const scheduled = M.scheduledDay(date);
  const doneToday = M.sessionForDate(date);
  let selectedKey = scheduled ? scheduled.key : suggestNextDay();

  const root = h('div', { class: 'stack' });
  const preview = h('div', { class: 'stack' });

  const dayOptions = M.workoutDays().map((d) => ({ value: d.key, label: d.name }));

  const header = card(null,
    h('div', { class: 'stack tight' },
      h('div', { class: 'hero-eyebrow' }, icon('calendar', 14), scheduled ? 'Scheduled today' : 'Rest day — pick a workout'),
      h('h1', { class: 'hero-title' }, (M.dayMeta(selectedKey) || {}).name || 'Workout')
    ),
    segmented(dayOptions, selectedKey, (v) => {
      selectedKey = v;
      header.querySelector('.hero-title').textContent = M.dayMeta(v).name;
      renderPreview();
    }, { class: 'chips' }),
    doneToday && doneToday.status === 'completed'
      ? h('div', { class: 'banner accent' }, icon('check', 18), `${doneToday.dayName} is already logged today. Starting another workout is fine.`)
      : null,
    button('Start workout', {
      variant: 'primary', class: 'btn-block btn-lg', iconName: 'play',
      onClick: () => beginWorkout(selectedKey, date),
    })
  );

  function renderPreview() {
    clear(preview);
    const slots = M.daySlots(selectedKey);
    const day = M.dayMeta(selectedKey);
    preview.appendChild(card(null,
      h('div', { class: 'stack tight' },
        h('h2', { class: 'card-title' }, 'Today’s plan'),
        h('p', { class: 'list-sub' }, day ? day.emphasis : '')
      ),
      h('div', { class: 'stack tight' },
        ...slots.map((slot, i) => {
          const ex = M.getExercise(slot.exerciseId);
          if (!ex) return null;
          const s = suggest(slot, ex, M.previousPerformance(slot.exerciseId), M.settings());
          return h('div', { class: 'row', style: { gap: '10px', minHeight: '40px' } },
            h('span', { class: 'ex-index' }, i + 1),
            h('div', { class: 'grow' },
              h('div', { class: 'list-title' }, ex.name, ex.unilateral ? h('span', { class: 'dim xs' }, ' · per side') : null),
              h('div', { class: 'list-sub' }, `${setsLabel(slot)} × ${slot.repMin}–${slot.repMax}`)
            ),
            h('span', { class: 'small num', style: { color: s.action === 'increase' ? 'var(--good)' : 'var(--text-2)' } },
              s.weight != null ? `${fmtNum(s.weight)} ${M.unit()}` : 'new')
          );
        })
      )
    ));
  }
  renderPreview();

  root.appendChild(header);
  root.appendChild(preview);
  return root;
}

function suggestNextDay() {
  const last = M.sessions({ status: 'completed', limit: 1 })[0];
  const days = M.workoutDays();
  if (!last) return days[0].key;
  const idx = days.findIndex((d) => d.key === last.dayKey);
  return days[(idx + 1) % days.length].key;
}

async function beginWorkout(dayKey, date) {
  const s = M.settings();
  const start = async (readiness) => {
    await M.startSession({ dayKey, date, readiness });
    timer.primeAudio();
    go('/workout');
  };
  if (s.readinessEnabled) readinessSheet({ date, onDone: (data) => start(data) });
  else start(null);
}

const setsLabel = (slot) => (slot.setsMin ? `${slot.setsMin}–${slot.sets}` : `${slot.sets}`);

/* ========================================================================
   Active workout
   ===================================================================== */
function activeScreen(session) {
  const root = h('div', { class: 'stack' });
  const settings = M.settings();
  const unit = M.unit();
  const ui = { openId: null, editingSetId: null };

  const bar = h('div', { class: 'workout-bar' });
  const list = h('div', { class: 'stack' });

  const exSessions = M.sessionExercises(session.id);
  const firstUnfinished = exSessions.find((es) => {
    const sets = M.exerciseSessionSets(es.id);
    return sets.some((s) => !s.completed);
  });
  ui.openId = firstUnfinished ? firstUnfinished.id : (exSessions[0] || {}).id;

  function updateBar() {
    const sets = M.sessionSets(session.id).filter((s) => s.completed);
    const all = M.sessionExercises(session.id);
    const doneEx = all.filter((es) => {
      const rows = M.exerciseSessionSets(es.id);
      return rows.length && rows.every((r) => r.completed);
    }).length;
    const current = all.find((es) => M.exerciseSessionSets(es.id).some((s) => !s.completed));
    const volume = sets.reduce((a, s) => a + (Number(s.weight) || 0) * (Number(s.reps) || 0), 0);

    clear(bar);
    bar.appendChild(h('div', { class: 'wb-top' },
      h('span', { class: 'rest-icon' }, icon('timer', 17)),
      h('span', { class: 'wb-clock', id: 'wb-clock' }, fmtClock(Math.round((Date.now() - session.startedAt) / 1000))),
      h('div', { class: 'grow' }),
      h('span', { class: 'wb-meta' }, `${sets.length} sets · ${fmtInt(Math.round(volume))} ${unit}`)
    ));
    bar.appendChild(progressBar((doneEx / Math.max(1, all.length)) * 100, { label: 'Workout progress' }));
    bar.appendChild(h('span', { class: 'wb-meta' },
      current
        ? `Now: ${M.exerciseName(current.exerciseId)} · exercise ${all.indexOf(current) + 1} of ${all.length}`
        : `All ${all.length} exercises done — finish up`
    ));
  }

  function rebuild() {
    clear(list);
    M.sessionExercises(session.id).forEach((es, i) => {
      list.appendChild(exerciseCard({ session, es, index: i, ui, settings, unit, rebuild, updateBar }));
    });
    list.appendChild(extrasCard(session, rebuild));
    list.appendChild(finishCard(session, rebuild));
    updateBar();
  }

  root.appendChild(bar);
  root.appendChild(list);
  rebuild();

  const stopTicker = timer.elapsedTicker(session.startedAt, (secs) => {
    const el = bar.querySelector('#wb-clock');
    if (el) el.textContent = fmtClock(secs);
  });
  root.unmount = stopTicker;
  return root;
}

/* ---------------------------------------------------------------------- */
function exerciseCard({ session, es, index, ui, settings, unit, rebuild, updateBar }) {
  const exercise = M.getExercise(es.exerciseId);
  const sets = M.exerciseSessionSets(es.id);
  const allDone = sets.length > 0 && sets.every((s) => s.completed);
  const isOpen = ui.openId === es.id;
  const slot = { sets: es.targetSets, setsMin: es.setsMin, repMin: es.repMin, repMax: es.repMax };

  const cardEl = h('article', {
    class: `ex-card ${isOpen ? 'is-open is-current' : ''} ${allDone ? 'is-done' : ''}`.trim(),
  });

  const doneCount = sets.filter((s) => s.completed).length;
  const head = h('button', {
    class: 'ex-head', type: 'button',
    'aria-expanded': isOpen ? 'true' : 'false',
    onClick: () => {
      ui.openId = isOpen ? null : es.id;
      ui.editingSetId = null;
      rebuild();
    },
  },
    h('span', { class: 'ex-index' }, allDone ? icon('check', 14) : index + 1),
    h('span', { class: 'grow' },
      h('span', { class: 'ex-name' }, exercise ? exercise.name : 'Exercise'),
      h('span', { class: 'ex-target' },
        `${setsLabel(slot)} × ${es.repMin}–${es.repMax}`,
        exercise && exercise.unilateral ? ' per side' : '',
        doneCount ? ` · ${doneCount}/${sets.length} done` : ''
      )
    ),
    h('span', { class: 'ex-chevron' }, icon('chevron', 18))
  );
  cardEl.appendChild(head);

  if (!isOpen) return cardEl;

  const body = h('div', { class: 'ex-body' });

  // Previous performance — never make the user look it up.
  const prev = M.previousPerformance(es.exerciseId, session.id);
  const prevFmt = formatPrevious(prev, unit);
  if (prevFmt) {
    const dl = h('dl', { class: 'prev-block' },
      h('dt', null, 'Previous'),
      h('dd', null, `${prevFmt.weightLabel}  ·  ${relativeDay(prevFmt.date)}`),
      h('dt', null, 'Reps'),
      h('dd', null, prevFmt.repsLabel)
    );
    if (settings.rirEnabled && prevFmt.rirLabel) {
      dl.appendChild(h('dt', null, 'RIR'));
      dl.appendChild(h('dd', null, prevFmt.rirLabel));
    }
    body.appendChild(dl);
  }

  // Suggestion for today.
  const s = suggest(slot, exercise, prev, settings);
  body.appendChild(h('div', {
    class: `suggestion ${s.action === 'increase' ? 'is-increase' : ''} ${s.action === 'establish' ? 'is-new' : ''}`.trim(),
  },
    icon(s.action === 'increase' ? 'arrowRight' : s.action === 'establish' ? 'note' : 'timer', 16),
    h('span', null,
      s.message,
      s.note ? h('span', { class: 'suggestion-note' }, s.note) : null,
      s.action === 'hold' && s.target ? h('span', { class: 'suggestion-note' }, s.target) : null
    )
  ));

  // Set rows.
  body.appendChild(h('div', { class: 'set-labels' },
    h('span', null, '#'), h('span', null, `Weight (${unit})`), h('span', null, 'Reps'), h('span', null, '')
  ));
  const setList = h('div', { class: 'set-list' });
  body.appendChild(setList);

  const renderRows = () => {
    clear(setList);
    const rows = M.exerciseSessionSets(es.id);
    const firstPending = rows.find((r) => !r.completed);
    rows.forEach((row) => {
      const editing = ui.editingSetId === row.id;
      const isActive = editing || (!row.completed && firstPending && row.id === firstPending.id);
      if (isActive) {
        setList.appendChild(activeSetRow({ row, exercise, es, slot, settings, unit, ui, renderRows, updateBar, rebuild }));
      } else if (row.completed) {
        setList.appendChild(doneSetRow({ row, settings, unit, ui, renderRows }));
      } else {
        setList.appendChild(pendingSetRow({ row, suggestion: s, unit, ui, renderRows }));
      }
    });
  };
  renderRows();

  // Live read-out against the progression target.
  const statusLine = h('div', { class: 'xs dim num' });
  const refreshStatus = () => {
    const st = progressionStatus(slot, M.exerciseSessionSets(es.id));
    statusLine.textContent = st
      ? `${st.setsDone} set${st.setsDone === 1 ? '' : 's'} · ${st.totalReps} total reps${st.onTrack ? ' · top of range hit — weight goes up next time' : ''}`
      : '';
  };
  refreshStatus();
  body.appendChild(statusLine);

  body.appendChild(h('div', { class: 'row wrap', style: { gap: '8px' } },
    linkButton('Add set', async () => { await M.addSetRow(es.id); renderRows(); refreshStatus(); updateBar(); }, 'plus'),
    linkButton(es.notes ? 'Edit note' : 'Note', () => noteSheet({
      title: `${exercise.name} note`,
      value: es.notes,
      placeholder: 'Form cue, pain, machine setting…',
      onSave: async (text) => { await M.saveExerciseNote(es.id, text); rebuild(); },
    }), 'note'),
    linkButton('Swap exercise', () => swapSheet(es, rebuild), 'swap'),
    es.added ? linkButton('Remove', async () => {
      if (await confirmSheet({ title: 'Remove exercise?', body: `${exercise.name} and its logged sets will be removed from this workout.`, confirmLabel: 'Remove' })) {
        await M.removeExerciseFromSession(es.id);
        rebuild();
      }
    }, 'trash') : null
  ));

  if (es.notes) body.appendChild(h('p', { class: 'small muted' }, es.notes));
  if (exercise && exercise.notes) body.appendChild(h('p', { class: 'xs dim' }, exercise.notes));

  cardEl.appendChild(body);
  return cardEl;
}

/* ---------------------------------------------------------------------- */
function activeSetRow({ row, exercise, es, slot, settings, unit, ui, renderRows, updateBar, rebuild }) {
  const step = exercise ? exercise.increment || 2.5 : 2.5;
  let rir = row.rir ?? settings.rirDefault;

  const weight = numberField({
    value: row.weight, step, min: 0, max: 999, decimals: true, label: 'Weight',
    onChange: (v) => M.updateSet(row.id, { weight: v }),
  });
  const reps = numberField({
    value: row.reps, step: 1, min: 0, max: 100, label: 'Reps',
    placeholder: String(slot.repMax),
    onChange: (v) => M.updateSet(row.id, { reps: v }),
  });

  const check = h('button', {
    class: `set-check ${row.completed ? 'is-done' : ''}`.trim(),
    type: 'button',
    'aria-label': row.completed ? 'Save changes to set' : 'Complete set',
    onClick: async () => {
      const r = reps.read();
      if (r === null || r <= 0) {
        toast('Enter the reps you hit');
        reps.input.focus();
        return;
      }
      const w = weight.read();
      await M.completeSet(row.id, { weight: w === null ? 0 : w, reps: r, rir: settings.rirEnabled ? rir : null });
      haptic(14);
      ui.editingSetId = null;
      const remaining = M.exerciseSessionSets(es.id).some((x) => !x.completed);
      if (settings.restTimerEnabled && remaining) {
        timer.start(exercise ? exercise.restSeconds || 90 : 90, exercise ? exercise.name : 'Rest');
      }
      renderRows();
      updateBar();
      if (!remaining) {
        advanceToNextExercise(es, ui);
        rebuild();
      }
    },
  }, icon('check', 20));

  const rowEl = h('div', { class: 'set-row' },
    h('span', { class: 'set-num' }, row.setNumber),
    weight,
    reps,
    check
  );

  if (!settings.rirEnabled) return rowEl;

  const chips = h('div', { class: 'rir-chips' });
  const values = [0, 1, 2, 3, 4];
  values.forEach((v) => {
    const btn = h('button', {
      type: 'button',
      class: `rir-chip ${v === rir ? 'is-active' : ''}`.trim(),
      'aria-label': `RIR ${v === 4 ? '4 or more' : v}`,
      onClick: () => {
        rir = v;
        [...chips.children].forEach((c) => c.classList.remove('is-active'));
        btn.classList.add('is-active');
        M.updateSet(row.id, { rir: v });
      },
    }, v === 4 ? '4+' : String(v));
    chips.appendChild(btn);
  });

  return frag(rowEl, h('div', { class: 'rir-row' }, h('span', { class: 'rir-label' }, 'RIR'), chips));
}

/** Move the open card on to the next exercise that still has sets left. */
function advanceToNextExercise(current, ui) {
  const all = M.sessionExercises(current.sessionId);
  const next = all.find((es) => M.exerciseSessionSets(es.id).some((s) => !s.completed));
  ui.openId = next ? next.id : null;
  ui.editingSetId = null;
}

function doneSetRow({ row, settings, unit, ui, renderRows }) {
  return h('div', {
    class: 'set-row is-done',
    role: 'button',
    tabindex: '0',
    onClick: () => { ui.editingSetId = row.id; renderRows(); },
  },
    h('span', { class: 'set-num' }, row.setNumber),
    h('span', { class: 'set-done-text' },
      `${fmtNum(row.weight)} ${unit} × ${row.reps}`,
      settings.rirEnabled && row.rir != null ? h('span', { class: 'rir-tag' }, `RIR ${row.rir === 4 ? '4+' : row.rir}`) : null
    ),
    h('span', { class: 'set-check is-done', 'aria-hidden': 'true' }, icon('check', 20))
  );
}

function pendingSetRow({ row, suggestion, unit, ui, renderRows }) {
  const target = row.weight != null ? `${fmtNum(row.weight)} ${unit}` : suggestion.weight != null ? `${fmtNum(suggestion.weight)} ${unit}` : '—';
  return h('div', {
    class: 'set-row is-pending',
    role: 'button',
    tabindex: '0',
    onClick: () => { ui.editingSetId = row.id; renderRows(); },
  },
    h('span', { class: 'set-num' }, row.setNumber),
    h('span', { class: 'set-pending-text' }, `${target} · target ${suggestion.reps ?? ''} reps`),
    h('span', { class: 'set-check', 'aria-hidden': 'true' }, icon('check', 20))
  );
}

/* ---------------------------------------------------------------------- */
function swapSheet(es, rebuild) {
  const current = M.getExercise(es.exerciseId);
  const alternatives = (es.alternatives || []).map((id) => M.getExercise(id)).filter(Boolean);
  const others = M.exercises()
    .filter((e) => e.id !== es.exerciseId)
    .sort((a, b) => a.name.localeCompare(b.name));
  let forProgram = false;

  const pick = async (id) => {
    await M.replaceExercise(es.id, id, { forProgram });
    closeSheet();
    toast(`Swapped to ${M.exerciseName(id)}`, 'good');
    rebuild();
  };

  const listFor = (items) => h('div', { class: 'list' },
    ...items.map((e) =>
      h('button', { class: 'list-item', type: 'button', onClick: () => pick(e.id) },
        h('span', { class: 'grow' },
          h('span', { class: 'list-title' }, e.name),
          h('span', { class: 'list-sub' }, `${e.muscleGroup} · ${e.equipment} · ${e.repMin}–${e.repMax} reps`)
        ),
        icon('chevron', 16)
      )
    )
  );

  const search = h('input', { class: 'text-input', type: 'search', placeholder: 'Search exercises', 'aria-label': 'Search exercises' });
  const results = h('div', null, listFor(others));
  search.addEventListener('input', () => {
    const q = search.value.trim().toLowerCase();
    clear(results);
    results.appendChild(listFor(q ? others.filter((e) => e.name.toLowerCase().includes(q) || e.muscleGroup.toLowerCase().includes(q)) : others));
  });

  sheet(`Replace ${current ? current.name : 'exercise'}`, frag(
    h('p', { class: 'sheet-text' }, 'History for the old exercise is kept — swapping only changes what you log from here.'),
    alternatives.length
      ? h('div', { class: 'stack tight' }, h('span', { class: 'section-title' }, 'Programmed alternative'), card({ class: 'flush' }, listFor(alternatives)))
      : null,
    h('label', { class: 'toggle-row' },
      h('span', { class: 'toggle-text' },
        h('span', { class: 'toggle-label' }, 'Also change it in the program'),
        h('span', { class: 'toggle-hint' }, 'Applies to every future workout in this block')
      ),
      h('span', { class: 'toggle' },
        (() => {
          const input = h('input', { type: 'checkbox', class: 'toggle-input' });
          input.addEventListener('change', () => { forProgram = input.checked; });
          return input;
        })(),
        h('span', { class: 'toggle-track' }, h('span', { class: 'toggle-knob' }))
      )
    ),
    search,
    card({ class: 'flush' }, results)
  ), { autofocus: false });
}

/* ---------------------------------------------------------------------- */
function extrasCard(session, rebuild) {
  const used = new Set(M.sessionExercises(session.id).map((e) => e.exerciseId));
  const core = CORE_EXERCISE_IDS.map((id) => M.getExercise(id)).filter((e) => e && !used.has(e.id));

  return card({ class: 'tight' },
    h('div', { class: 'row between' },
      h('span', { class: 'section-title' }, 'Add to this workout'),
      linkButton('Any exercise', () => addExerciseSheet(session, rebuild), 'plus')
    ),
    core.length
      ? h('div', { class: 'row wrap', style: { gap: '8px' } },
          ...core.map((e) =>
            button(e.name, {
              variant: 'secondary',
              onClick: async () => {
                await M.addExerciseToSession(session.id, e.id);
                toast(`${e.name} added`, 'good');
                rebuild();
              },
            })
          )
        )
      : null
  );
}

function addExerciseSheet(session, rebuild) {
  const used = new Set(M.sessionExercises(session.id).map((e) => e.exerciseId));
  const options = M.exercises().filter((e) => !used.has(e.id)).sort((a, b) => a.name.localeCompare(b.name));
  const search = h('input', { class: 'text-input', type: 'search', placeholder: 'Search exercises', 'aria-label': 'Search exercises' });
  const listHost = h('div', null);

  const draw = (items) => {
    clear(listHost);
    listHost.appendChild(card({ class: 'flush' },
      h('div', { class: 'list' },
        ...items.map((e) =>
          h('button', {
            class: 'list-item', type: 'button',
            onClick: async () => {
              await M.addExerciseToSession(session.id, e.id);
              closeSheet();
              toast(`${e.name} added`, 'good');
              rebuild();
            },
          },
            h('span', { class: 'grow' },
              h('span', { class: 'list-title' }, e.name),
              h('span', { class: 'list-sub' }, `${e.muscleGroup} · ${e.repMin}–${e.repMax} reps`)
            ),
            icon('plus', 16)
          )
        )
      )
    ));
  };
  draw(options);
  search.addEventListener('input', () => {
    const q = search.value.trim().toLowerCase();
    draw(q ? options.filter((e) => e.name.toLowerCase().includes(q) || e.muscleGroup.toLowerCase().includes(q)) : options);
  });

  sheet('Add exercise', frag(search, listHost), { autofocus: false });
}

/* ---------------------------------------------------------------------- */
function finishCard(session, rebuild) {
  const sets = M.sessionSets(session.id).filter((s) => s.completed);
  const readiness = readinessLine(session.date);

  return card(null,
    readiness ? h('p', { class: 'xs dim' }, readiness) : null,
    h('div', { class: 'row wrap', style: { gap: '8px' } },
      linkButton(session.note ? 'Edit workout note' : 'Add workout note', () => noteSheet({
        value: session.note,
        onSave: async (text) => { await M.saveSessionNote(session.id, text); rebuild(); },
      }), 'note')
    ),
    session.note ? h('p', { class: 'small muted' }, session.note) : null,
    button('Finish workout', {
      variant: sets.length ? 'success' : 'secondary',
      class: 'btn-block btn-lg',
      iconName: 'check',
      onClick: async () => {
        if (!sets.length) {
          const discard = await confirmSheet({
            title: 'Nothing logged yet',
            body: 'No sets were completed. Discard this workout?',
            confirmLabel: 'Discard workout',
          });
          if (discard) {
            await M.discardSession(session.id);
            timer.stop();
            go('/home');
          }
          return;
        }
        const ok = await confirmSheet({
          title: 'Finish workout?',
          body: `${sets.length} sets logged. You can still edit it afterwards from History.`,
          confirmLabel: 'Finish',
          tone: 'primary',
        });
        if (!ok) return;
        timer.stop();
        go(`/finish/${session.id}`);
      },
    }),
    linkButton('Discard workout', async () => {
      const ok = await confirmSheet({
        title: 'Discard workout?',
        body: 'Everything logged in this session will be deleted.',
        confirmLabel: 'Discard',
      });
      if (!ok) return;
      await M.discardSession(session.id);
      timer.stop();
      go('/home');
    }, 'trash')
  );
}
