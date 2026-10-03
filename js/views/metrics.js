// === Body metrics: weight, waist, steps ===

import { h, card, button, statTile, icon, emptyState, segmented, linkButton, toast } from '../ui/components.js';
import { lineChart } from '../ui/charts.js';
import * as M from '../core/model.js';
import * as A from '../logic/analytics.js';
import { go } from '../core/router.js';
import { bodyWeightSheet, waistSheet, stepsSheet } from '../ui/entry.js';
import { today, fmtNum, fmtInt, fmtSigned, fmtDate, relativeDay, fmtDateLong } from '../core/util.js';

export const title = 'Body metrics';
export const tab = 'home';

let pane = 'weight';

export function render() {
  const root = h('div', { class: 'stack' });
  root.appendChild(h('div', { class: 'row between' },
    h('h1', { class: 'hero-title', style: { fontSize: '22px' } }, 'Body metrics'),
    linkButton('Progress charts', () => go('/progress'), 'arrowRight')
  ));
  root.appendChild(segmented(
    [{ value: 'weight', label: 'Weight' }, { value: 'waist', label: 'Waist' }, { value: 'steps', label: 'Steps' }],
    pane,
    (v) => { pane = v; go('/metrics'); }
  ));

  if (pane === 'weight') root.appendChild(weightPane());
  else if (pane === 'waist') root.appendChild(waistPane());
  else root.appendChild(stepsPane());

  return root;
}

function weightPane() {
  const unit = M.unit();
  const stats = A.bodyWeightStats();
  const data = A.bodyWeightData();
  const entries = M.bodyWeightSeries().slice().reverse();
  const wrap = h('div', { class: 'stack' });

  wrap.appendChild(card(null,
    button(M.bodyWeightOn(today()) ? 'Update today’s weight' : 'Log today’s weight', {
      variant: 'primary', class: 'btn-block btn-lg', iconName: 'scale',
      onClick: () => bodyWeightSheet(today()),
    }),
    stats
      ? h('div', { class: 'stat-grid cols-2' },
          statTile('Today', stats.today != null ? `${fmtNum(stats.today, 1)} ${unit}` : 'not logged', stats.today == null ? `last ${relativeDay(stats.latestDate)}` : null),
          statTile('7-day avg', stats.avg7 != null ? `${fmtNum(stats.avg7, 1)} ${unit}` : '—'),
          statTile('Previous 7-day', stats.prevAvg7 != null ? `${fmtNum(stats.prevAvg7, 1)} ${unit}` : '—'),
          statTile('Weekly change', stats.weeklyChange != null ? `${fmtSigned(stats.weeklyChange, 2)} ${unit}` : '—',
            stats.weeklyChange != null ? (stats.weeklyChange < 0 ? 'trending down' : stats.weeklyChange > 0 ? 'trending up' : 'holding') : null, {
              tone: stats.weeklyChange != null ? (stats.weeklyChange < 0 ? 'good' : stats.weeklyChange > 0 ? 'warn' : undefined) : undefined,
            }),
          statTile('Lowest', `${fmtNum(stats.lowest, 1)} ${unit}`),
          statTile('Highest', `${fmtNum(stats.highest, 1)} ${unit}`)
        )
      : emptyState('No entries yet', 'Weigh yourself at the same time each day — first thing, after the bathroom, before food.')
  ));

  if (entries.length) {
    wrap.appendChild(card(null, lineChart({
      caption: '7-day average (line) over daily entries (dots)',
      formatValue: (v) => `${fmtNum(v, 1)} ${unit}`,
      series: [
        { name: '7-day average', points: data.trend, slot: 1, style: 'line' },
        { name: 'Daily', points: data.points, slot: 1, style: 'dots' },
      ],
    })));

    wrap.appendChild(card({ class: 'flush' },
      h('div', { class: 'list' },
        ...entries.slice(0, 30).map((e) =>
          h('button', { class: 'list-item', type: 'button', onClick: () => bodyWeightSheet(e.date) },
            h('span', { class: 'grow' },
              h('span', { class: 'list-title' }, `${fmtNum(e.weight)} ${unit}`),
              h('span', { class: 'list-sub' }, fmtDateLong(e.date))
            ),
            icon('edit', 16)
          )
        )
      )
    ));
  }
  return wrap;
}

function waistPane() {
  const unit = M.settings().waistUnit;
  const stats = A.waistStats();
  const data = A.waistData();
  const entries = M.waistSeries().slice().reverse();
  const wrap = h('div', { class: 'stack' });

  wrap.appendChild(card(null,
    button('Log waist measurement', {
      variant: 'primary', class: 'btn-block btn-lg', iconName: 'plus',
      onClick: () => waistSheet(today()),
    }),
    stats
      ? h('div', { class: 'stat-grid cols-2' },
          statTile('Latest', `${fmtNum(stats.latest)} ${unit}`, relativeDay(stats.latestDate)),
          statTile('First', `${fmtNum(stats.first)} ${unit}`, fmtDate(stats.firstDate)),
          statTile('Change', fmtSigned(stats.change, 1, unit), null, {
            tone: stats.change < 0 ? 'good' : stats.change > 0 ? 'warn' : undefined,
          }),
          statTile('Range', `${fmtNum(stats.lowest)}–${fmtNum(stats.highest)}`, unit)
        )
      : emptyState('No measurements yet', 'Once a week is enough. Same spot, same time, relaxed.')
  ));

  if (entries.length) {
    wrap.appendChild(card(null, lineChart({
      caption: 'Waist trend',
      formatValue: (v) => `${fmtNum(v, 1)} ${unit}`,
      series: [{ name: 'Waist', points: data, slot: 2, style: 'line' }],
    })));
    wrap.appendChild(card({ class: 'flush' },
      h('div', { class: 'list' },
        ...entries.map((e) =>
          h('button', { class: 'list-item', type: 'button', onClick: () => waistSheet(e.date) },
            h('span', { class: 'grow' },
              h('span', { class: 'list-title' }, `${fmtNum(e.value)} ${unit}`),
              h('span', { class: 'list-sub' }, fmtDateLong(e.date))
            ),
            icon('edit', 16)
          )
        )
      )
    ));
  }
  return wrap;
}

function stepsPane() {
  const stats = A.stepStats();
  const data = A.stepData();
  const entries = M.stepSeries().slice().reverse();
  const wrap = h('div', { class: 'stack' });

  wrap.appendChild(card(null,
    button(stats.hasToday ? 'Update today’s steps' : 'Log today’s steps', {
      variant: 'primary', class: 'btn-block btn-lg', iconName: 'walk',
      onClick: () => stepsSheet(today()),
    }),
    h('div', { class: 'row wrap' },
      ...[1000, 2000, 5000].map((n) =>
        button(`+${n.toLocaleString()}`, {
          variant: 'secondary', class: 'grow',
          onClick: async () => {
            await M.addSteps(today(), n);
            toast(`Steps updated — ${fmtInt(M.stepsOn(today()).count)}`, 'good');
          },
        })
      )
    ),
    h('div', { class: 'stat-grid cols-2' },
      statTile('Today', fmtInt(stats.today), `of ${fmtInt(stats.goal)}`, { tone: stats.today >= stats.goal ? 'good' : undefined }),
      statTile('7-day avg', stats.weeklyAvg != null ? fmtInt(stats.weeklyAvg) : '—'),
      statTile('Days at goal', `${stats.daysHitGoal}/${stats.daysLogged}`, 'last 7 days'),
      statTile('All-time at goal', `${stats.allTimeHit}/${stats.allTimeLogged}`,
        stats.allTimeLogged ? `${Math.round((stats.allTimeHit / stats.allTimeLogged) * 100)}% of days` : null)
    )
  ));

  if (entries.length) {
    wrap.appendChild(card(null, lineChart({
      caption: 'Daily steps',
      formatValue: (v) => fmtInt(v),
      goal: { value: stats.goal, label: `${fmtInt(stats.goal)} goal` },
      series: [{ name: 'Steps', points: data, slot: 3, style: 'line' }],
    })));
    wrap.appendChild(card({ class: 'flush' },
      h('div', { class: 'list' },
        ...entries.slice(0, 30).map((e) =>
          h('button', { class: 'list-item', type: 'button', onClick: () => stepsSheet(e.date) },
            h('span', { class: 'grow' },
              h('span', { class: 'list-title' }, fmtInt(e.count)),
              h('span', { class: 'list-sub' }, fmtDateLong(e.date))
            ),
            e.count >= stats.goal ? h('span', { style: { color: 'var(--good)' } }, icon('check', 16)) : null,
            icon('edit', 16)
          )
        )
      )
    ));
  }
  return wrap;
}
