// === End-of-block report ===

import {
  h, card, button, statTile, icon, pill, emptyState, sectionHeader, toast, textInput,
  field, sheet, closeSheet,
} from '../ui/components.js';
import * as M from '../core/model.js';
import * as A from '../logic/analytics.js';
import { go } from '../core/router.js';
import { fmtNum, fmtInt, fmtSigned, fmtDate, today, startOfWeek } from '../core/util.js';

export const title = 'Block summary';
export const tab = 'progress';

export function render() {
  const program = M.activeProgram() || M.programs()[0];
  if (!program) return emptyState('No block yet', null, button('Set up', { variant: 'secondary', onClick: () => go('/profile') }));

  const s = A.blockSummary(program);
  const unit = M.unit();
  const waistUnit = M.settings().waistUnit;
  const complete = M.isBlockComplete();
  const root = h('div', { class: 'stack' });

  root.appendChild(card({ class: complete ? 'hero' : '' },
    h('div', { class: 'row between' },
      h('div', null,
        h('h1', { class: 'hero-title', style: { fontSize: '22px' } }, complete ? '6-week block complete' : program.name),
        h('p', { class: 'hero-sub' }, `${fmtDate(s.from)} – ${fmtDate(s.to)} · ${s.weeks} weeks`)
      ),
      complete ? h('span', { style: { color: 'var(--warn)' } }, icon('trophy', 26)) : pill(`Week ${M.currentWeek()}`, 'accent')
    )
  ));

  root.appendChild(card(null,
    sectionHeader('Body'),
    h('div', { class: 'stat-grid cols-2' },
      statTile('Starting weight', s.startWeight != null ? `${fmtNum(s.startWeight)} ${unit}` : '—', s.startWeight != null ? fmtDate(s.from) : null),
      statTile('Ending weight', s.endWeight != null ? `${fmtNum(s.endWeight)} ${unit}` : '—'),
      statTile('Weight change', s.weightChange != null ? fmtSigned(s.weightChange, 1, unit) : '—', null, {
        tone: s.weightChange != null ? (s.weightChange < 0 ? 'good' : s.weightChange > 0 ? 'warn' : undefined) : undefined,
      }),
      statTile('Waist change', s.waistChange != null ? fmtSigned(s.waistChange, 1, waistUnit) : '—',
        s.startWaist != null ? `${fmtNum(s.startWaist)} → ${fmtNum(s.endWaist)}` : null, {
          tone: s.waistChange != null ? (s.waistChange < 0 ? 'good' : s.waistChange > 0 ? 'warn' : undefined) : undefined,
        })
    )
  ));

  root.appendChild(card(null,
    sectionHeader('Training'),
    h('div', { class: 'stat-grid cols-2' },
      statTile('Workouts', `${s.totalWorkouts}/${s.targetWorkouts}`, `${s.adherencePct}% adherence`, {
        tone: s.adherencePct >= 85 ? 'good' : s.adherencePct < 60 ? 'warn' : undefined,
      }),
      statTile('Total sets', fmtInt(s.totalSets)),
      statTile('Total volume', fmtInt(Math.round(s.totalVolume)), unit),
      statTile('Cardio sessions', fmtInt(s.cardioSessions)),
      statTile('Avg steps', s.avgSteps != null ? fmtInt(s.avgSteps) : '—', `${s.daysHitGoal}/${s.stepDaysLogged} days at goal`),
      statTile('Records', fmtInt(s.prs.length), 'PRs set')
    )
  ));

  if (s.strength.length) {
    root.appendChild(card(null,
      sectionHeader('Strength change'),
      h('div', { class: 'stack tight' },
        ...s.strength.map((x) =>
          h('div', { class: 'kv' },
            h('span', { class: 'k' }, x.name),
            h('span', { class: 'v', style: { color: x.change > 0 ? 'var(--good)' : x.change < 0 ? 'var(--warn)' : null } },
              `${fmtNum(x.start)} → ${fmtNum(x.end)} ${unit}`,
              h('span', { class: 'xs dim', style: { marginLeft: '8px' } }, fmtSigned(x.change, 1))
            )
          )
        )
      )
    ));
  }

  if (s.prs.length) {
    root.appendChild(card({ class: 'tight' },
      sectionHeader('Records this block'),
      ...s.prs.slice(0, 12).map((pr) =>
        h('div', { class: 'pr-item' },
          h('span', { class: 'pr-icon' }, icon('trophy', 18)),
          h('div', { class: 'grow' },
            h('div', { class: 'pr-name' }, pr.exerciseId ? M.exerciseName(pr.exerciseId) : 'Workout volume'),
            h('div', { class: 'pr-detail' }, `${pr.label} · ${fmtDate(pr.date)}`)
          )
        )
      )
    ));
  }

  root.appendChild(card(null,
    h('p', { class: 'small muted' }, complete
      ? 'The block does not reset on its own. Start a new one when you are ready — every exercise history and record carries over.'
      : 'You can start a new block early; the current one is archived as-is.'),
    button('Start new 6-week block', {
      variant: complete ? 'primary' : 'secondary',
      class: 'btn-block',
      iconName: 'calendar',
      onClick: () => newBlockSheet(),
    })
  ));

  return root;
}

function newBlockSheet() {
  let start = startOfWeek(today());
  const dateInput = textInput({ value: start, type: 'date', onChange: (v) => { start = v || start; } });
  sheet('Start a new block', h('div', { class: 'stack' },
    h('p', { class: 'sheet-text' }, 'The current block is archived. Exercise history, records and body metrics all carry over — only the 6-week counter restarts.'),
    field('Block start (week 1 Monday)', dateInput, 'Any date works; it snaps to that week’s Monday.')
  ), {
    footer: button('Start block', {
      variant: 'primary', class: 'btn-block',
      onClick: async () => {
        await M.startNewBlock({ startDate: start });
        closeSheet();
        toast('New 6-week block started', 'good');
        go('/home');
      },
    }),
  });
}
