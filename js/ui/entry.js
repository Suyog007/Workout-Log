// === Quick-entry sheets ===
// Shared by the dashboard, Body Metrics and the end-of-workout summary so
// there is exactly one way to record each kind of entry.

import {
  h, frag, sheet, closeSheet, button, numberField, field, textInput, textArea,
  segmented, toast,
} from './components.js';
import * as M from '../core/model.js';
import { today, fmtNum } from '../core/util.js';

export function bodyWeightSheet(date = today()) {
  const existing = M.bodyWeightOn(date);
  const unit = M.unit();
  let value = existing ? existing.weight : null;
  let entryDate = date;

  const weight = numberField({
    value, step: 0.1, min: 20, max: 400, decimals: true, size: 'lg',
    label: `Body weight in ${unit}`,
    onChange: (v) => { value = v; },
  });
  const dateInput = textInput({ value: entryDate, type: 'date', onChange: (v) => { entryDate = v || date; } });

  sheet('Log body weight', frag(
    field(`Weight (${unit})`, weight),
    field('Date', dateInput)
  ), {
    footer: button('Save', {
      variant: 'primary', class: 'btn-block',
      onClick: async () => {
        const v = weight.read();
        if (v === null) { toast('Enter a weight first'); return; }
        await M.saveBodyWeight(entryDate, v);
        closeSheet();
        toast(`Body weight saved — ${fmtNum(v)} ${unit}`, 'good');
      },
    }),
  });
}

export function waistSheet(date = today()) {
  const existing = M.waistOn(date);
  const unit = M.settings().waistUnit;
  let entryDate = date;
  const value = numberField({
    value: existing ? existing.value : null,
    step: 0.5, min: 30, max: 250, decimals: true, size: 'lg',
    label: `Waist in ${unit}`,
  });
  const dateInput = textInput({ value: entryDate, type: 'date', onChange: (v) => { entryDate = v || date; } });

  sheet('Log waist measurement', frag(
    field(`Waist (${unit})`, value, 'Measure at the navel, relaxed, same time of day — once a week is plenty.'),
    field('Date', dateInput)
  ), {
    footer: button('Save', {
      variant: 'primary', class: 'btn-block',
      onClick: async () => {
        const v = value.read();
        if (v === null) { toast('Enter a measurement first'); return; }
        await M.saveWaist(entryDate, v);
        closeSheet();
        toast(`Waist saved — ${fmtNum(v)} ${unit}`, 'good');
      },
    }),
  });
}

export function stepsSheet(date = today()) {
  const existing = M.stepsOn(date);
  const goal = M.settings().stepGoal;
  let entryDate = date;
  const value = numberField({
    value: existing ? existing.count : null,
    step: 500, min: 0, max: 100000, size: 'lg',
    label: 'Step count',
    placeholder: '0',
  });
  const dateInput = textInput({ value: entryDate, type: 'date', onChange: (v) => { entryDate = v || date; } });

  const quick = h('div', { class: 'row wrap' },
    ...[1000, 2000, 5000].map((n) =>
      button(`+${n.toLocaleString()}`, {
        variant: 'secondary',
        onClick: () => value.set((value.read() || 0) + n),
      })
    )
  );

  sheet('Log steps', frag(
    field(`Steps (goal ${goal.toLocaleString()})`, value, 'Enter the running total for the day — it does not need to be one session.'),
    quick,
    field('Date', dateInput)
  ), {
    footer: button('Save', {
      variant: 'primary', class: 'btn-block',
      onClick: async () => {
        const v = value.read();
        if (v === null) { toast('Enter a step count first'); return; }
        await M.saveSteps(entryDate, v);
        closeSheet();
        toast(`Steps saved — ${Math.round(v).toLocaleString()}`, 'good');
      },
    }),
  });
}

export function cardioSheet({ date = today(), sessionId = null, existing = null, onSaved } = {}) {
  const d = M.settings().defaultCardio;
  const current = existing || M.cardioForSession(sessionId) || null;
  let type = current ? current.type : d.type;

  const duration = numberField({ value: current ? current.durationMin : d.durationMin, step: 5, min: 1, max: 300, label: 'Duration in minutes' });
  const speed = numberField({ value: current ? current.speed : d.speed, step: 0.5, min: 0, max: 30, decimals: true, label: 'Speed' });
  const incline = numberField({ value: current ? current.incline : d.incline, step: 1, min: 0, max: 30, decimals: true, label: 'Incline percent' });
  const calories = numberField({ value: current ? current.calories : null, step: 10, min: 0, max: 3000, label: 'Calories', placeholder: 'optional' });

  sheet(current ? 'Edit cardio' : 'Log cardio', frag(
    field('Type', segmented(
      [
        { value: 'Incline treadmill', label: 'Incline treadmill' },
        { value: 'Treadmill', label: 'Treadmill' },
        { value: 'Bike', label: 'Bike' },
        { value: 'Stairs', label: 'Stairs' },
      ],
      type,
      (v) => { type = v; },
      { class: 'chips' }
    )),
    h('div', { class: 'stat-grid cols-2' },
      field('Minutes', duration),
      field('Speed', speed),
      field('Incline %', incline),
      field('Calories', calories)
    )
  ), {
    footer: frag(
      current
        ? button('Delete', {
            variant: 'danger',
            onClick: async () => { await M.deleteCardio(current.id); closeSheet(); toast('Cardio removed'); if (onSaved) onSaved(null); },
          })
        : null,
      button('Save', {
        variant: 'primary', class: 'btn-block',
        onClick: async () => {
          const saved = await M.saveCardio({
            id: current ? current.id : null,
            date, sessionId,
            type,
            durationMin: duration.read(),
            speed: speed.read(),
            incline: incline.read(),
            calories: calories.read(),
          });
          closeSheet();
          toast(`Cardio logged — ${saved.durationMin} min`, 'good');
          if (onSaved) onSaved(saved);
        },
      })
    ),
  });
}

/** Optional pre-workout check. Never changes the prescribed workout. */
export function readinessSheet({ date = today(), onDone } = {}) {
  const existing = M.readinessOn(date);
  let energy = existing ? existing.energy : null;
  let soreness = existing ? existing.soreness : null;
  const sleep = numberField({ value: existing ? existing.sleepHours : null, step: 0.5, min: 0, max: 16, decimals: true, label: 'Hours of sleep', placeholder: '7.5' });

  sheet('How are you feeling?', frag(
    h('p', { class: 'sheet-text' }, 'Recorded for review only — your workout stays exactly as prescribed.'),
    field('Energy', segmented(['Low', 'Normal', 'High'], energy, (v) => { energy = v; }, { class: 'chips' })),
    field('Muscle soreness', segmented(['Low', 'Moderate', 'High'], soreness, (v) => { soreness = v; }, { class: 'chips' })),
    field('Sleep (hours)', sleep)
  ), {
    footer: frag(
      button('Skip', { variant: 'ghost', onClick: () => { closeSheet(); if (onDone) onDone(null); } }),
      button('Save & continue', {
        variant: 'primary', class: 'btn-block',
        onClick: async () => {
          const data = { date, energy, soreness, sleepHours: sleep.read() };
          await M.saveReadiness(data);
          closeSheet();
          if (onDone) onDone(data);
        },
      })
    ),
  });
}

export function noteSheet({ title = 'Workout note', value = '', placeholder = 'Felt weak today. Poor sleep. Left knee uncomfortable…', onSave } = {}) {
  let text = value;
  const area = textArea({ value, placeholder, rows: 4, onChange: (v) => { text = v; } });
  sheet(title, area, {
    footer: button('Save note', {
      variant: 'primary', class: 'btn-block',
      onClick: async () => { await onSave(text.trim()); closeSheet(); },
    }),
  });
}

/** Small read-only line describing the readiness entry for a date. */
export function readinessLine(date) {
  const r = M.readinessOn(date);
  if (!r || (!r.energy && !r.soreness && r.sleepHours == null)) return null;
  const parts = [];
  if (r.energy) parts.push(`Energy ${r.energy.toLowerCase()}`);
  if (r.soreness) parts.push(`soreness ${r.soreness.toLowerCase()}`);
  if (r.sleepHours != null) parts.push(`${fmtNum(r.sleepHours)}h sleep`);
  return parts.join(' · ');
}

