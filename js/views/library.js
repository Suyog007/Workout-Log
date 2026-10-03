// === Exercise library + program day editor ===
// The 6-week block ships with the prescribed exercises; everything here is for
// changing the program later without losing any history.

import {
  h, frag, card, button, icon, pill, sectionHeader, linkButton, segmented, emptyState,
  numberField, textInput, textArea, field, sheet, closeSheet, confirmSheet, toast, toggle, clear,
} from '../ui/components.js';
import * as M from '../core/model.js';
import * as store from '../core/store.js';
import { go } from '../core/router.js';
import { INCREMENTS } from '../config/program.js';
import { fmtNum } from '../core/util.js';

export const title = 'Exercise library';
export const tab = 'profile';

let pane = 'exercises';
let dayKey = null;

export function render() {
  const root = h('div', { class: 'stack' });
  root.appendChild(h('div', { class: 'row between' },
    h('h1', { class: 'hero-title', style: { fontSize: '22px' } }, 'Program & exercises'),
    linkButton('Back', () => go('/profile'), 'close')
  ));
  root.appendChild(segmented(
    [{ value: 'exercises', label: 'Exercises' }, { value: 'days', label: 'Workout days' }],
    pane,
    (v) => { pane = v; go('/library'); }
  ));

  root.appendChild(pane === 'exercises' ? exercisesPane() : daysPane());
  return root;
}

/* ------------------------------------------------------------- exercises */
function exercisesPane() {
  const wrap = h('div', { class: 'stack' });
  const all = M.exercises().sort((a, b) => a.muscleGroup.localeCompare(b.muscleGroup) || a.name.localeCompare(b.name));

  wrap.appendChild(button('Add exercise', {
    variant: 'primary', class: 'btn-block', iconName: 'plus',
    onClick: () => exerciseSheet(null),
  }));

  const search = h('input', { class: 'text-input', type: 'search', placeholder: 'Search exercises', 'aria-label': 'Search exercises' });
  wrap.appendChild(search);

  const listHost = h('div', { class: 'stack' });
  wrap.appendChild(listHost);

  const draw = (items) => {
    clear(listHost);
    if (!items.length) {
      listHost.appendChild(card(null, emptyState('No matches', 'Try a different search.')));
      return;
    }
    const groups = new Map();
    items.forEach((e) => {
      if (!groups.has(e.muscleGroup)) groups.set(e.muscleGroup, []);
      groups.get(e.muscleGroup).push(e);
    });
    for (const [group, list] of groups) {
      listHost.appendChild(h('div', { class: 'stack tight' },
        sectionHeader(group),
        card({ class: 'flush' },
          h('div', { class: 'list' },
            ...list.map((e) =>
              h('button', { class: 'list-item', type: 'button', onClick: () => exerciseSheet(e) },
                h('span', { class: 'grow' },
                  h('span', { class: 'list-title' }, e.name, e.unilateral ? h('span', { class: 'dim xs' }, ' · per side') : null),
                  h('span', { class: 'list-sub' },
                    `${e.equipment} · ${e.type} · ${e.repMin}–${e.repMax} reps · +${fmtNum(e.increment)} ${M.unit()}`)
                ),
                e.isCustom ? pill('custom', 'accent') : null,
                icon('edit', 16)
              )
            )
          )
        )
      ));
    }
  };
  draw(all);
  search.addEventListener('input', () => {
    const q = search.value.trim().toLowerCase();
    draw(q ? all.filter((e) => e.name.toLowerCase().includes(q) || e.muscleGroup.toLowerCase().includes(q) || e.equipment.toLowerCase().includes(q)) : all);
  });

  return wrap;
}

function exerciseSheet(existing) {
  const isNew = !existing;
  const data = existing || {
    name: '', muscleGroup: 'Chest', equipment: 'Barbell', type: 'compound',
    repMin: 8, repMax: 12, increment: INCREMENTS.barbellUpper, restSeconds: 150,
    unilateral: false, notes: '', isCustom: true,
  };
  let type = data.type;
  let unilateral = data.unilateral;

  const name = textInput({ value: data.name, placeholder: 'Exercise name', label: 'Name' });
  const muscle = h('select', { class: 'text-input', 'aria-label': 'Muscle group' },
    ...['Chest', 'Back', 'Shoulders', 'Rear Delts', 'Biceps', 'Triceps', 'Quads', 'Hamstrings', 'Glutes', 'Calves', 'Core', 'Other']
      .map((g) => h('option', { value: g, selected: g === data.muscleGroup }, g))
  );
  const equipment = h('select', { class: 'text-input', 'aria-label': 'Equipment' },
    ...['Barbell', 'Dumbbell', 'Machine', 'Cable', 'Bodyweight', 'Other']
      .map((g) => h('option', { value: g, selected: g === data.equipment }, g))
  );
  const repMin = numberField({ value: data.repMin, step: 1, min: 1, max: 50, label: 'Minimum reps' });
  const repMax = numberField({ value: data.repMax, step: 1, min: 1, max: 60, label: 'Maximum reps' });
  const increment = numberField({ value: data.increment, step: 0.25, min: 0.25, max: 25, decimals: true, label: 'Weight increment' });
  const rest = numberField({ value: data.restSeconds, step: 15, min: 15, max: 600, label: 'Rest seconds' });
  const notes = textArea({ value: data.notes, placeholder: 'Setup, cues, machine settings…', rows: 2 });

  sheet(isNew ? 'New exercise' : data.name, h('div', { class: 'stack' },
    field('Name', name),
    h('div', { class: 'stat-grid cols-2' },
      field('Muscle group', muscle),
      field('Equipment', equipment)
    ),
    field('Type', segmented(
      [{ value: 'compound', label: 'Compound' }, { value: 'isolation', label: 'Isolation' }],
      type,
      (v) => { type = v; rest.set(v === 'compound' ? 150 : 75); }
    )),
    h('div', { class: 'stat-grid cols-2' },
      field('Rep range min', repMin),
      field('Rep range max', repMax),
      field(`Increment (${M.unit()})`, increment),
      field('Rest (sec)', rest)
    ),
    toggle('Logged per side', unilateral, (v) => { unilateral = v; }, 'Unilateral work — shows “per side” everywhere'),
    field('Notes', notes)
  ), {
    footer: frag(
      !isNew && data.isCustom
        ? button('Delete', {
            variant: 'danger',
            onClick: async () => {
              const ok = await confirmSheet({
                title: 'Archive exercise?',
                body: 'It is removed from the library but every set you logged for it is kept in your history and charts.',
                confirmLabel: 'Archive',
              });
              if (!ok) return;
              await M.archiveExercise(data.id);
              closeSheet();
              toast('Exercise archived');
            },
          })
        : null,
      button('Save', {
        variant: 'primary', class: 'btn-block',
        onClick: async () => {
          if (!name.value.trim()) { toast('Give it a name first'); return; }
          const lo = repMin.read() || 8;
          const hi = Math.max(lo, repMax.read() || lo);
          await M.saveExercise({
            ...data,
            name: name.value,
            muscleGroup: muscle.value,
            equipment: equipment.value,
            type,
            repMin: lo,
            repMax: hi,
            increment: increment.read() || 2.5,
            restSeconds: rest.read() || (type === 'compound' ? 150 : 75),
            unilateral,
            notes: notes.value,
            isCustom: isNew ? true : data.isCustom,
          });
          closeSheet();
          toast(isNew ? 'Exercise added' : 'Exercise saved', 'good');
        },
      })
    ),
  });
}

/* ------------------------------------------------------------------ days */
function daysPane() {
  const days = M.workoutDays();
  if (!dayKey) dayKey = days[0].key;
  const wrap = h('div', { class: 'stack' });

  wrap.appendChild(segmented(
    days.map((d) => ({ value: d.key, label: d.name })),
    dayKey,
    (v) => { dayKey = v; go('/library'); },
    { class: 'chips' }
  ));

  const day = M.dayMeta(dayKey);
  const slots = M.daySlots(dayKey);
  const program = M.activeProgram();
  const isOverridden = !!(program && program.dayOverrides && program.dayOverrides[dayKey]);

  wrap.appendChild(card(null,
    h('div', { class: 'row between' },
      h('div', null,
        h('h2', { class: 'card-title' }, day.name),
        h('p', { class: 'list-sub' }, day.emphasis)
      ),
      isOverridden ? pill('edited', 'accent') : null
    ),
    h('p', { class: 'xs dim' }, 'Changes apply to this block from now on. Previously logged workouts keep exactly what you did.')
  ));

  wrap.appendChild(card({ class: 'flush' },
    h('div', { class: 'list' },
      ...slots.map((slot, i) => {
        const ex = M.getExercise(slot.exerciseId);
        return h('div', { class: 'list-item' },
          h('span', { class: 'ex-index' }, i + 1),
          h('span', { class: 'grow' },
            h('span', { class: 'list-title' }, ex ? ex.name : 'Missing exercise'),
            h('span', { class: 'list-sub' },
              `${slot.setsMin ? `${slot.setsMin}–${slot.sets}` : slot.sets} × ${slot.repMin}–${slot.repMax}`,
              ex && ex.unilateral ? ' per side' : '')
          ),
          h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Move up', disabled: i === 0, onClick: () => moveSlot(i, -1) }, h('span', { style: { transform: 'rotate(-90deg)', display: 'grid' } }, icon('chevron', 16))),
          h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Move down', disabled: i === slots.length - 1, onClick: () => moveSlot(i, 1) }, h('span', { style: { transform: 'rotate(90deg)', display: 'grid' } }, icon('chevron', 16))),
          h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Edit slot', onClick: () => slotSheet(i, slot) }, icon('edit', 16))
        );
      })
    )
  ));

  wrap.appendChild(h('div', { class: 'row wrap', style: { gap: '8px' } },
    button('Add exercise to day', { variant: 'secondary', iconName: 'plus', class: 'grow', onClick: () => addSlotSheet() }),
    isOverridden
      ? button('Reset day to program default', {
          variant: 'ghost',
          onClick: async () => {
            const ok = await confirmSheet({
              title: 'Reset this day?',
              body: `${day.name} goes back to the prescribed exercises, sets and rep ranges.`,
              confirmLabel: 'Reset', tone: 'primary',
            });
            if (!ok) return;
            const p = M.activeProgram();
            const overrides = { ...(p.dayOverrides || {}) };
            delete overrides[dayKey];
            await store.patch('programs', p.id, { dayOverrides: overrides });
            toast('Day reset');
          },
        })
      : null
  ));

  return wrap;

  async function moveSlot(index, dir) {
    const next = [...slots];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    await M.saveDaySlots(dayKey, next);
  }

  function slotSheet(index, slot) {
    const ex = M.getExercise(slot.exerciseId);
    const sets = numberField({ value: slot.sets, step: 1, min: 1, max: 10, label: 'Sets' });
    const repMin = numberField({ value: slot.repMin, step: 1, min: 1, max: 50, label: 'Minimum reps' });
    const repMax = numberField({ value: slot.repMax, step: 1, min: 1, max: 60, label: 'Maximum reps' });

    sheet(ex ? ex.name : 'Slot', h('div', { class: 'stack' },
      h('div', { class: 'stat-grid cols-3' },
        field('Sets', sets),
        field('Rep min', repMin),
        field('Rep max', repMax)
      )
    ), {
      footer: frag(
        button('Remove', {
          variant: 'danger',
          onClick: async () => {
            await M.saveDaySlots(dayKey, slots.filter((_, i) => i !== index));
            closeSheet();
            toast('Removed from day');
          },
        }),
        button('Save', {
          variant: 'primary', class: 'btn-block',
          onClick: async () => {
            const lo = repMin.read() || slot.repMin;
            const hi = Math.max(lo, repMax.read() || lo);
            const next = [...slots];
            next[index] = { ...slot, sets: sets.read() || slot.sets, repMin: lo, repMax: hi };
            await M.saveDaySlots(dayKey, next);
            closeSheet();
            toast('Day updated', 'good');
          },
        })
      ),
    });
  }

  function addSlotSheet() {
    const used = new Set(slots.map((s) => s.exerciseId));
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
                await M.saveDaySlots(dayKey, [...slots, { exerciseId: e.id, sets: 3, repMin: e.repMin, repMax: e.repMax, setsMin: null, alternatives: null }]);
                closeSheet();
                toast(`${e.name} added to ${day.name}`, 'good');
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
      draw(q ? options.filter((e) => e.name.toLowerCase().includes(q)) : options);
    });

    sheet(`Add to ${day.name}`, frag(search, listHost), { autofocus: false });
  }
}
