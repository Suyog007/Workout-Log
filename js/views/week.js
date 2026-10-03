// === Weekly summary, with a plain comparison against the week before ===

import { h, card, button, statTile, icon, pill, emptyState, sectionHeader, segmented } from '../ui/components.js';
import * as M from '../core/model.js';
import * as A from '../logic/analytics.js';
import { go } from '../core/router.js';
import { fmtNum, fmtInt, fmtSigned, fmtDate, fmtDuration } from '../core/util.js';

export const title = 'Week summary';
export const tab = 'progress';

export function render({ n }) {
  const program = M.activeProgram();
  if (!program) return emptyState('No active block', null, button('Go to profile', { variant: 'secondary', onClick: () => go('/profile') }));

  const week = Math.max(1, Math.min(program.weeks, Number(n) || M.currentWeek()));
  const cmp = A.weekComparison(program, week);
  const s = cmp.current;
  const d = cmp.deltas;
  const unit = M.unit();
  const waistUnit = M.settings().waistUnit;
  const root = h('div', { class: 'stack' });

  root.appendChild(card(null,
    h('div', { class: 'row between' },
      h('div', null,
        h('h1', { class: 'hero-title', style: { fontSize: '22px' } }, `Week ${week} summary`),
        h('p', { class: 'hero-sub' }, `${fmtDate(s.from)} – ${fmtDate(s.to)}`)
      ),
      s.isCurrent ? pill('In progress', 'accent') : s.isFuture ? pill('Upcoming', 'neutral') : pill('Complete', 'good')
    ),
    segmented(
      Array.from({ length: program.weeks }, (_, i) => ({ value: String(i + 1), label: `W${i + 1}` })),
      String(week),
      (v) => go(`/week/${v}`),
      { class: 'chips' }
    )
  ));

  // `direction` says which way counts as progress; 'none' means the change is
  // worth showing but not worth judging (a longer workout is not a better one).
  const delta = (value, dp = 0, suffix = '', direction = 'up') => {
    if (value == null) return null;
    if (value === 0) return { text: `same as W${week - 1}` };
    const tone = direction === 'none' ? undefined : (direction === 'down' ? value < 0 : value > 0) ? 'good' : 'warn';
    return { text: `${fmtSigned(value, dp, suffix)} vs W${week - 1}`, tone };
  };

  const tile = (label, value, sub, deltaInfo) =>
    statTile(label, value, deltaInfo ? deltaInfo.text : sub, { subTone: deltaInfo ? deltaInfo.tone : undefined });

  root.appendChild(card(null,
    sectionHeader('Training'),
    h('div', { class: 'stat-grid cols-2' },
      tile('Adherence', `${s.adherence.done}/${s.adherence.target}`, 'workouts', d ? delta(d.adherence) : null),
      tile('Total sets', fmtInt(s.totalSets), null, d ? delta(d.sets) : null),
      tile('Volume', fmtInt(Math.round(s.totalVolume)), unit, d ? delta(Math.round(d.volume), 0, unit) : null),
      tile('Avg duration', s.avgDuration ? fmtDuration(s.avgDuration) : '—', null,
        d && d.duration != null ? delta(Math.round(d.duration / 60), 0, 'min', 'none') : null),
      tile('Cardio', `${s.cardioSessions}`, `${s.cardioMinutes} min`, d ? delta(d.cardio) : null),
      tile('Records', `${s.prs.length}`, s.prs.length ? 'new PRs' : 'none')
    )
  ));

  root.appendChild(card(null,
    sectionHeader('Body & activity'),
    h('div', { class: 'stat-grid cols-2' },
      tile('Avg body weight', s.avgBodyWeight != null ? `${fmtNum(s.avgBodyWeight, 1)} ${unit}` : '—', null,
        d && d.bodyWeight != null ? delta(d.bodyWeight, 2, unit, 'down') : null),
      tile('Weight change', s.bodyWeightChange != null ? fmtSigned(s.bodyWeightChange, 1, unit) : '—', 'within the week'),
      tile('Avg steps', s.avgSteps != null ? fmtInt(s.avgSteps) : '—', null, d && d.steps != null ? delta(Math.round(d.steps)) : null),
      tile('Days at 10k', `${s.daysHitGoal}/${s.stepDaysLogged || 0}`, 'logged days'),
      tile('Waist', s.waist != null ? `${fmtNum(s.waist, 1)} ${waistUnit}` : '—', null,
        d && d.waist != null ? delta(d.waist, 1, waistUnit, 'down') : null)
    )
  ));

  if (s.sessions.length) {
    root.appendChild(card({ class: 'flush' },
      h('div', { class: 'list' },
        ...s.sessions.slice().sort((a, b) => a.date.localeCompare(b.date)).map((session) =>
          h('button', { class: 'list-item', type: 'button', onClick: () => go(`/history/${session.id}`) },
            h('span', { class: `list-badge ${(M.dayMeta(session.dayKey) || {}).group || 'push'}` }, session.date.slice(8)),
            h('span', { class: 'grow' },
              h('span', { class: 'list-title' }, session.dayName),
              h('span', { class: 'list-sub' }, `${fmtDuration(session.durationSec)} · ${session.totalSets} sets · ${fmtInt(Math.round(session.totalVolume))} ${unit}`)
            ),
            icon('chevron', 16)
          )
        )
      )
    ));
  } else {
    root.appendChild(card(null, emptyState(
      s.isFuture ? 'Week not started' : 'No workouts logged this week',
      s.isFuture ? null : 'Missed weeks stay visible — the block does not shift.'
    )));
  }

  if (s.prs.length) {
    root.appendChild(card({ class: 'tight' },
      sectionHeader('Records this week'),
      ...s.prs.map((pr) =>
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

  return root;
}
