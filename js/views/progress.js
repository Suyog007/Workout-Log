// === Progress / analytics ===
// One measure per chart, on one axis. Body weight leads with its 7-day average
// so day-to-day noise never reads as a trend.

import {
  h, card, button, statTile, icon, pill, emptyState, sectionHeader, segmented, linkButton,
} from '../ui/components.js';
import { lineChart } from '../ui/charts.js';
import * as M from '../core/model.js';
import * as A from '../logic/analytics.js';
import { go } from '../core/router.js';
import { FEATURED_EXERCISES } from '../config/program.js';
import { fmtNum, fmtInt, fmtSigned, fmtDate, relativeDay } from '../core/util.js';

export const title = 'Progress';
export const tab = 'progress';

let pane = 'body';
let exerciseId = null;
let metric = 'weight';

export function render() {
  const root = h('div', { class: 'stack' });

  root.appendChild(h('div', { class: 'row between' },
    h('h1', { class: 'hero-title', style: { fontSize: '22px' } }, 'Progress'),
    pill(M.activeProgram() ? `Week ${M.currentWeek()} of ${M.activeProgram().weeks}` : 'No block', 'accent')
  ));

  root.appendChild(segmented(
    [{ value: 'body', label: 'Body' }, { value: 'strength', label: 'Strength' }, { value: 'records', label: 'Records' }],
    pane,
    (v) => { pane = v; go('/progress'); }
  ));

  if (pane === 'body') root.appendChild(bodyPane());
  else if (pane === 'strength') root.appendChild(strengthPane());
  else root.appendChild(recordsPane());

  return root;
}

/* ---------------------------------------------------------------- body */
function bodyPane() {
  const unit = M.unit();
  const waistUnit = M.settings().waistUnit;
  const wrap = h('div', { class: 'stack' });

  const bw = A.bodyWeightData();
  const bwStats = A.bodyWeightStats();

  wrap.appendChild(card(null,
    sectionHeader('Body weight', linkButton('Log', () => go('/metrics'), 'plus')),
    bwStats
      ? h('div', { class: 'stat-grid cols-2' },
          statTile('Latest', `${fmtNum(bwStats.latest, 1)} ${unit}`, relativeDay(bwStats.latestDate)),
          statTile('7-day avg', bwStats.avg7 != null ? `${fmtNum(bwStats.avg7, 1)} ${unit}` : '—',
            bwStats.prevAvg7 != null ? `prev ${fmtNum(bwStats.prevAvg7, 1)} ${unit}` : null),
          statTile('Weekly change', bwStats.weeklyChange != null ? `${fmtSigned(bwStats.weeklyChange, 2)} ${unit}` : '—', 'avg vs avg', {
            tone: bwStats.weeklyChange != null ? (bwStats.weeklyChange < 0 ? 'good' : bwStats.weeklyChange > 0 ? 'warn' : undefined) : undefined,
          }),
          statTile('Range', `${fmtNum(bwStats.lowest, 1)}–${fmtNum(bwStats.highest, 1)}`, unit)
        )
      : null,
    lineChart({
      caption: '7-day average (line) over daily entries (dots)',
      formatValue: (v) => `${fmtNum(v, 1)} ${unit}`,
      emptyText: 'Log your weight for a few days and the trend appears here.',
      series: [
        { name: '7-day average', points: bw.trend, slot: 1, style: 'line' },
        { name: 'Daily', points: bw.points, slot: 1, style: 'dots' },
      ],
    })
  ));

  const waist = A.waistData();
  const waistStats = A.waistStats();
  wrap.appendChild(card(null,
    sectionHeader('Waist', linkButton('Log', () => go('/metrics'), 'plus')),
    waistStats
      ? h('div', { class: 'stat-grid cols-2' },
          statTile('Latest', `${fmtNum(waistStats.latest)} ${waistUnit}`, relativeDay(waistStats.latestDate)),
          statTile('Since first', fmtSigned(waistStats.change, 1, waistUnit), `from ${fmtNum(waistStats.first)}`, {
            tone: waistStats.change < 0 ? 'good' : waistStats.change > 0 ? 'warn' : undefined,
          })
        )
      : null,
    lineChart({
      caption: 'Weekly waist measurement',
      formatValue: (v) => `${fmtNum(v, 1)} ${waistUnit}`,
      emptyText: 'Measure once a week to see the trend.',
      series: [{ name: 'Waist', points: waist, slot: 2, style: 'line' }],
    })
  ));

  const steps = A.stepData();
  const stepStats = A.stepStats();
  wrap.appendChild(card(null,
    sectionHeader('Steps', linkButton('Log', () => go('/metrics'), 'plus')),
    h('div', { class: 'stat-grid cols-2' },
      statTile('7-day avg', stepStats.weeklyAvg != null ? fmtInt(stepStats.weeklyAvg) : '—', `goal ${fmtInt(stepStats.goal)}`),
      statTile('At goal', `${stepStats.daysHitGoal}/${stepStats.daysLogged}`, stepStats.pctHitGoal != null ? `${stepStats.pctHitGoal}% of logged days` : null, {
        tone: stepStats.pctHitGoal >= 70 ? 'good' : undefined,
      })
    ),
    lineChart({
      caption: 'Daily steps',
      formatValue: (v) => fmtInt(v),
      emptyText: 'No steps logged yet.',
      goal: { value: stepStats.goal, label: `${fmtInt(stepStats.goal)} goal` },
      series: [{ name: 'Steps', points: steps, slot: 3, style: 'line' }],
    })
  ));

  return wrap;
}

/* ------------------------------------------------------------ strength */
function strengthPane() {
  const tracked = A.trackedExercises();
  if (!tracked.length) {
    return card(null, emptyState(
      'No strength data yet',
      'Log a workout and every exercise you train becomes selectable here.',
      button('Start a workout', { variant: 'primary', onClick: () => go('/workout') })
    ));
  }

  if (!exerciseId || !tracked.some((e) => e.id === exerciseId)) {
    const featured = FEATURED_EXERCISES.find((id) => tracked.some((e) => e.id === id));
    exerciseId = featured || tracked[0].id;
  }

  const unit = M.unit();
  const wrap = h('div', { class: 'stack' });

  // Quick chips for the lifts worth watching, then the full list.
  const featuredChips = FEATURED_EXERCISES.filter((id) => tracked.some((e) => e.id === id));
  if (featuredChips.length > 1) {
    wrap.appendChild(h('div', { class: 'scroll-x' },
      segmented(
        featuredChips.map((id) => ({ value: id, label: M.exerciseName(id) })),
        exerciseId,
        (v) => { exerciseId = v; go('/progress'); },
        { class: 'chips' }
      )
    ));
  }

  const select = h('select', { class: 'text-input', 'aria-label': 'Choose exercise' },
    ...tracked.map((e) => h('option', { value: e.id, selected: e.id === exerciseId }, e.name))
  );
  select.addEventListener('change', () => { exerciseId = select.value; go('/progress'); });
  wrap.appendChild(select);

  const stats = A.exerciseStats(exerciseId);
  if (!stats) return wrap;

  const ex = M.getExercise(exerciseId);
  const metricDefs = {
    weight: { label: 'Weight', caption: 'Working weight by session', fmt: (v) => `${fmtNum(v, 1)} ${unit}`, slot: 1 },
    e1rm: { label: 'Est. 1RM', caption: 'Estimated 1RM by session', fmt: (v) => `${fmtNum(v, 1)} ${unit}`, slot: 1 },
    volume: { label: 'Volume', caption: 'Volume per session', fmt: (v) => `${fmtInt(v)} ${unit}`, slot: 2 },
    reps: { label: 'Reps', caption: 'Total reps per session', fmt: (v) => fmtInt(v), slot: 3 },
  };
  if (!metricDefs[metric]) metric = 'weight';
  const def = metricDefs[metric];

  wrap.appendChild(card(null,
    h('div', { class: 'row between' },
      h('h2', { class: 'card-title' }, ex ? ex.name : 'Exercise'),
      ex && ex.unilateral ? pill('per side', 'neutral') : null
    ),
    segmented(
      Object.entries(metricDefs).map(([k, v]) => ({ value: k, label: v.label })),
      metric,
      (v) => { metric = v; go('/progress'); }
    ),
    lineChart({
      caption: def.caption,
      formatValue: def.fmt,
      emptyText: 'Not enough sessions yet.',
      series: [{ name: def.label, points: stats.series[metric], slot: def.slot, style: 'line' }],
    })
  ));

  wrap.appendChild(card(null,
    sectionHeader('All-time'),
    h('div', { class: 'stat-grid cols-2' },
      statTile('First logged', `${fmtNum(stats.first.weight)} ${unit}`, `× ${stats.first.reps} · ${fmtDate(stats.first.date)}`),
      statTile('Current', `${fmtNum(stats.current.weight)} ${unit}`, `× ${stats.current.reps} · ${fmtDate(stats.current.date)}`, {
        tone: stats.weightChange > 0 ? 'good' : undefined,
      }),
      statTile('Best weight', `${fmtNum(stats.bestWeight)} ${unit}`),
      statTile('Best reps', fmtInt(stats.bestReps)),
      statTile('Est. 1RM', stats.bestE1rm ? `${fmtNum(stats.bestE1rm)} ${unit}` : '—'),
      statTile('Change', fmtSigned(stats.weightChange, 1, unit), 'working weight', {
        tone: stats.weightChange > 0 ? 'good' : stats.weightChange < 0 ? 'warn' : undefined,
      }),
      statTile('Sessions', fmtInt(stats.sessions), `${fmtInt(stats.totalSets)} sets`),
      statTile('Total volume', fmtInt(Math.round(stats.totalVolume)), unit)
    )
  ));

  wrap.appendChild(card({ class: 'flush' },
    h('div', { class: 'list' },
      ...stats.perSession.slice().reverse().slice(0, 12).map((p) =>
        h('button', { class: 'list-item', type: 'button', onClick: () => go(`/history/${p.sessionId}`) },
          h('span', { class: 'grow' },
            h('span', { class: 'list-title' }, `${fmtNum(p.workingWeight)} ${unit} × ${p.totalReps} reps`),
            h('span', { class: 'list-sub' }, `${fmtDate(p.date)} · week ${p.week} · ${p.sets} sets${p.e1rm ? ` · est 1RM ${fmtNum(p.e1rm)}` : ''}`)
          ),
          icon('chevron', 16)
        )
      )
    )
  ));

  return wrap;
}

/* ------------------------------------------------------------- records */
function recordsPane() {
  const prs = M.personalRecords();
  if (!prs.length) {
    return card(null, emptyState('No records yet', 'Records are detected automatically once you have more than one session of an exercise.'));
  }
  const labels = { weight: 'Heaviest', reps: 'Most reps', e1rm: 'Est. 1RM', volume: 'Volume' };
  return card({ class: 'flush' },
    h('div', { class: 'list' },
      ...prs.map((pr) =>
        h('button', { class: 'list-item', type: 'button', onClick: () => go(`/history/${pr.sessionId}`) },
          h('span', { class: 'pr-icon' }, icon('trophy', 19)),
          h('span', { class: 'grow' },
            h('span', { class: 'list-title' }, pr.exerciseId ? M.exerciseName(pr.exerciseId) : 'Workout volume'),
            h('span', { class: 'list-sub' }, `${pr.label} · ${relativeDay(pr.date)}`)
          ),
          pill(labels[pr.type] || 'PR', 'warn')
        )
      )
    )
  );
}
