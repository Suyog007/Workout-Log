// === First-run setup ===
// Three optional fields, then straight into the program.

import { h, card, button, icon, numberField, textInput, field, toast, segmented } from '../ui/components.js';
import * as M from '../core/model.js';
import { go } from '../core/router.js';
import { today, startOfWeek, fmtDate } from '../core/util.js';
import { WORKOUT_DAYS } from '../config/program.js';

export const title = 'Welcome';
export const tab = 'home';

export function render() {
  let start = startOfWeek(today());
  let unit = 'kg';

  const startInput = textInput({ value: start, type: 'date', onChange: (v) => { start = v || start; } });
  const weight = numberField({ value: null, step: 0.1, min: 20, max: 400, decimals: true, label: 'Current body weight', placeholder: '82.0' });
  const waist = numberField({ value: null, step: 0.5, min: 30, max: 250, decimals: true, label: 'Current waist', placeholder: '86' });

  const root = h('div', { class: 'stack' });

  root.appendChild(card({ class: 'hero' },
    h('div', { class: 'hero-eyebrow' }, icon('dumbbell', 15), 'Workout Log'),
    h('h1', { class: 'hero-title' }, 'PPL ×2 — 6 week block'),
    h('p', { class: 'hero-sub' }, 'Push / Pull / Legs twice a week, Sunday off. Double progression on every exercise: hit the top of the rep range on all sets and the weight goes up.'),
    h('div', { class: 'stack tight' },
      ...WORKOUT_DAYS.map((d) =>
        h('div', { class: 'kv' },
          h('span', { class: 'k small' }, ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.weekday - 1]),
          h('span', { class: 'v' }, d.name)
        )
      ),
      h('div', { class: 'kv' }, h('span', { class: 'k small' }, 'Sun'), h('span', { class: 'v dim' }, 'Rest'))
    )
  ));

  root.appendChild(card(null,
    field('Block starts', startInput, `Week 1 begins Monday ${fmtDate(startOfWeek(start))}.`),
    field('Weight unit', segmented([{ value: 'kg', label: 'kg' }, { value: 'lb', label: 'lb' }], unit, (v) => { unit = v; })),
    field('Body weight today (optional)', weight),
    field('Waist today (optional)', waist)
  ));

  root.appendChild(button('Start the block', {
    variant: 'primary', class: 'btn-block btn-lg', iconName: 'play',
    onClick: async () => {
      await M.saveSettings({ unit });
      await M.createProgram({ startDate: start });
      const w = weight.read();
      const c = waist.read();
      if (w !== null) await M.saveBodyWeight(today(), w);
      if (c !== null) await M.saveWaist(today(), c);
      toast('Block started — good luck', 'good');
      go('/home');
    },
  }));

  return root;
}
