// === Home / Today ===
// Everything needed to walk into the gym and start: what today is, where the
// block is up to, and one prominent action.

import { h, card, button, statTile, progressBar, pill, icon, sectionHeader, linkButton } from '../ui/components.js';
import * as M from '../core/model.js';
import * as A from '../logic/analytics.js';
import { go } from '../core/router.js';
import { bodyWeightSheet, stepsSheet, cardioSheet, waistSheet } from '../ui/entry.js';
import { today, fmtDateLong, fmtNum, fmtSigned, fmtInt, fmtDuration, relativeDay } from '../core/util.js';

export const title = 'Today';
export const tab = 'home';

export function render() {
  const date = today();
  const status = A.todayStatus(date);
  const unit = M.unit();
  const root = h('div', { class: 'stack' });

  root.appendChild(heroCard(status, date));

  if (status.blockComplete) root.appendChild(blockCompleteCard(status));

  root.appendChild(metricsCard(status, unit, date));
  root.appendChild(cardioCard(status, date));

  const prs = M.personalRecords().slice(0, 3);
  if (prs.length) root.appendChild(prCard(prs));

  root.appendChild(weekCard(status));

  return root;
}

// --- Today hero ----------------------------------------------------------
function heroCard(status, date) {
  const { scheduled, session, program } = status;
  const week = Math.min(status.week, status.weeks);

  const head = h('div', { class: 'stack tight' },
    h('div', { class: 'hero-eyebrow' },
      icon('calendar', 14),
      fmtDateLong(date),
      program ? pill(`Week ${week} of ${status.weeks}`, 'accent') : null
    ),
    h('h1', { class: 'hero-title' }, scheduled ? scheduled.name : 'Rest day'),
    h('p', { class: 'hero-sub' },
      scheduled ? scheduled.emphasis : 'No lifting scheduled — walk, eat, sleep.')
  );

  const body = h('div', { class: 'stack' }, head);

  if (program) body.appendChild(weekStrip(program, status.week));

  // Progress through today's workout.
  if (session && status.plannedExercises) {
    const pct = (status.completedExercises / status.plannedExercises) * 100;
    body.appendChild(h('div', { class: 'stack tight' },
      h('div', { class: 'row between' },
        h('span', { class: 'small muted' }, session.status === 'completed' ? 'Workout complete' : 'Workout in progress'),
        h('span', { class: 'small num' }, `${status.completedExercises} / ${status.plannedExercises} exercises`)
      ),
      progressBar(pct, { label: 'Exercises completed', class: session.status === 'completed' ? 'good' : '' })
    ));
  }

  body.appendChild(primaryAction(status));
  return card({ class: 'hero' }, body);
}

function weekStrip(program, week) {
  const strip = h('div', { class: 'week-dots', 'aria-label': `Week ${week} of ${program.weeks}` });
  for (let i = 1; i <= program.weeks; i++) {
    strip.appendChild(h('span', {
      class: `week-dot ${i < week ? 'is-done' : ''} ${i === week ? 'is-current' : ''}`.trim(),
    }));
  }
  return strip;
}

function primaryAction(status) {
  const active = M.activeSession();

  if (active) {
    return button(active.dayKey === (status.scheduled && status.scheduled.key) ? 'Continue workout' : `Continue ${active.dayName}`, {
      variant: 'primary', class: 'btn-block btn-lg', iconName: 'play',
      onClick: () => go('/workout'),
    });
  }
  if (status.session && status.session.status === 'completed') {
    return h('div', { class: 'row', style: { gap: '9px' } },
      button('View workout', { variant: 'secondary', class: 'grow', onClick: () => go(`/history/${status.session.id}`) }),
      button('Train again', { variant: 'ghost', onClick: () => go('/workout') })
    );
  }
  if (!status.scheduled) {
    return button('Start a workout anyway', { variant: 'secondary', class: 'btn-block', onClick: () => go('/workout') });
  }
  return button('Start workout', {
    variant: 'primary', class: 'btn-block btn-lg', iconName: 'play',
    onClick: () => go('/workout'),
  });
}

// --- Block complete ------------------------------------------------------
function blockCompleteCard(status) {
  return card({ class: 'tight' },
    h('div', { class: 'banner' },
      icon('trophy', 18),
      h('div', null,
        h('strong', null, '6-week block complete'),
        h('div', { class: 'small muted' }, 'Review how it went, then open a fresh block — all history carries over.')
      )
    ),
    button('See block summary', { variant: 'primary', class: 'btn-block', onClick: () => go('/block') })
  );
}

// --- Daily metrics -------------------------------------------------------
function metricsCard(status, unit, date) {
  const steps = status.steps;
  const bw = status.bodyWeight;
  const stepPct = steps.goal ? (steps.today / steps.goal) * 100 : 0;

  const grid = h('div', { class: 'stat-grid cols-2' },
    statTile('Today’s steps', fmtInt(steps.today), `of ${fmtInt(steps.goal)}`, {
      tone: steps.today >= steps.goal ? 'good' : undefined,
    }),
    statTile('Body weight', bw && bw.today != null ? `${fmtNum(bw.today, 1)} ${unit}` : bw && bw.latest != null ? `${fmtNum(bw.latest, 1)} ${unit}` : '—',
      bw && bw.today == null && bw.latestDate ? `last ${relativeDay(bw.latestDate)}` : 'logged today'),
    statTile('7-day average', bw && bw.avg7 != null ? `${fmtNum(bw.avg7, 1)} ${unit}` : '—',
      bw && bw.weeklyChange != null ? `${fmtSigned(bw.weeklyChange, 2)} ${unit} vs prev week` : 'needs more entries'),
    statTile('Steps this week', steps.weeklyAvg != null ? fmtInt(steps.weeklyAvg) : '—',
      `${steps.daysHitGoal}/${steps.daysLogged || 0} days at goal`)
  );

  return card(null,
    sectionHeader('Daily', linkButton('Body metrics', () => go('/metrics'), 'arrowRight')),
    h('div', { class: 'stack tight' },
      progressBar(stepPct, { label: 'Steps toward goal', class: steps.today >= steps.goal ? 'good' : '' }),
      h('span', { class: 'xs dim num' }, `${fmtInt(steps.today)} / ${fmtInt(steps.goal)} steps`)
    ),
    grid,
    h('div', { class: 'row wrap' },
      button('Log weight', { variant: 'secondary', iconName: 'scale', class: 'grow', onClick: () => bodyWeightSheet(date) }),
      button('Log steps', { variant: 'secondary', iconName: 'walk', class: 'grow', onClick: () => stepsSheet(date) })
    ),
    M.waistOn(date) ? null : linkButton('Log waist measurement', () => waistSheet(date), 'plus')
  );
}

// --- Cardio --------------------------------------------------------------
function cardioCard(status, date) {
  const entries = status.cardio;
  const d = M.settings().defaultCardio;
  if (!entries.length) {
    return card({ class: 'tight' },
      h('div', { class: 'row between' },
        h('div', { class: 'grow' },
          h('div', { class: 'list-title' }, 'Cardio'),
          h('div', { class: 'list-sub' }, `Not completed — default ${d.durationMin} min ${d.type.toLowerCase()}`)
        ),
        button('Log', { variant: 'secondary', onClick: () => cardioSheet({ date }) })
      )
    );
  }
  const total = entries.reduce((a, c) => a + (c.durationMin || 0), 0);
  return card({ class: 'tight' },
    h('div', { class: 'row between' },
      h('div', { class: 'grow' },
        h('div', { class: 'row', style: { gap: '7px' } },
          h('div', { class: 'list-title' }, 'Cardio'),
          pill('Completed', 'good')
        ),
        h('div', { class: 'list-sub' },
          entries.map((c) => `${c.type} ${c.durationMin} min${c.incline != null ? ` · ${fmtNum(c.incline)}% incline` : ''}`).join(' · ')
        )
      ),
      total ? h('span', { class: 'stat-value' }, `${total}′`) : null
    )
  );
}

// --- PRs -----------------------------------------------------------------
function prCard(prs) {
  return card(null,
    sectionHeader('Recent records', linkButton('All', () => go('/progress'), 'arrowRight')),
    h('div', { class: 'stack tight' },
      ...prs.map((pr) =>
        h('div', { class: 'pr-item' },
          h('span', { class: 'pr-icon' }, icon('trophy', 18)),
          h('div', { class: 'grow' },
            h('div', { class: 'pr-name' }, pr.exerciseId ? M.exerciseName(pr.exerciseId) : 'Workout volume'),
            h('div', { class: 'pr-detail' }, `${pr.label} · ${relativeDay(pr.date)}`)
          )
        )
      )
    )
  );
}

// --- This week -----------------------------------------------------------
function weekCard(status) {
  const program = status.program;
  if (!program) return h('div');
  const week = Math.min(status.week, status.weeks);
  const summary = A.weekSummary(program, week);
  const days = M.workoutDays();
  const doneKeys = new Set(summary.sessions.map((s) => s.dayKey));

  return card(null,
    sectionHeader(`Week ${week}`, linkButton('Full summary', () => go(`/week/${week}`), 'arrowRight')),
    h('div', { class: 'row wrap', style: { gap: '6px' } },
      ...days.map((d) => pill(d.name, doneKeys.has(d.key) ? 'good' : 'neutral'))
    ),
    h('div', { class: 'stat-grid cols-2' },
      statTile('Adherence', `${summary.adherence.done}/${summary.adherence.target}`, 'workouts'),
      statTile('Total sets', fmtInt(summary.totalSets), summary.avgDuration ? `avg ${fmtDuration(summary.avgDuration)}` : null),
      statTile('Volume', `${fmtInt(Math.round(summary.totalVolume))}`, M.unit()),
      statTile('Cardio', `${summary.cardioSessions}`, `${summary.cardioMinutes} min`)
    )
  );
}
