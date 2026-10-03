// === Aggregations for the dashboard, weekly summary and progress screens ===

import * as store from '../core/store.js';
import * as M from '../core/model.js';
import { today, addDays, avg, sum, rollingMean, e1rm, mode } from '../core/util.js';
import { bestsFor } from './prs.js';

// --- Body weight ---------------------------------------------------------

/** Daily points plus the 7-day rolling average the charts lead with. */
export function bodyWeightData() {
  const points = M.bodyWeightSeries().map((d) => ({ date: d.date, value: d.weight }));
  return { points, trend: rollingMean(points, 7) };
}

export function bodyWeightStats(ref = today()) {
  const points = M.bodyWeightSeries().map((d) => ({ date: d.date, value: d.weight }));
  if (!points.length) return null;
  const inWindow = (from, to) => points.filter((p) => p.date >= from && p.date <= to).map((p) => p.value);
  const avg7 = avg(inWindow(addDays(ref, -6), ref));
  const prevAvg7 = avg(inWindow(addDays(ref, -13), addDays(ref, -7)));
  const latest = points[points.length - 1];
  const values = points.map((p) => p.value);
  return {
    today: M.bodyWeightOn(ref) ? M.bodyWeightOn(ref).weight : null,
    latest: latest.value,
    latestDate: latest.date,
    avg7,
    prevAvg7,
    weeklyChange: avg7 != null && prevAvg7 != null ? avg7 - prevAvg7 : null,
    lowest: Math.min(...values),
    highest: Math.max(...values),
    entries: points.length,
  };
}

// --- Waist ---------------------------------------------------------------
export function waistData() {
  return M.waistSeries().map((d) => ({ date: d.date, value: d.value }));
}

export function waistStats() {
  const points = waistData();
  if (!points.length) return null;
  const values = points.map((p) => p.value);
  const first = points[0];
  const last = points[points.length - 1];
  return {
    latest: last.value,
    latestDate: last.date,
    first: first.value,
    firstDate: first.date,
    change: last.value - first.value,
    lowest: Math.min(...values),
    highest: Math.max(...values),
    entries: points.length,
  };
}

// --- Steps ---------------------------------------------------------------
export function stepData() {
  return M.stepSeries().map((d) => ({ date: d.date, value: d.count }));
}

export function stepStats(ref = today(), days = 7) {
  const goal = M.settings().stepGoal || 10000;
  const all = M.stepSeries();
  const from = addDays(ref, -(days - 1));
  const window = all.filter((d) => d.date >= from && d.date <= ref);
  const todayDoc = M.stepsOn(ref);
  const hit = window.filter((d) => d.count >= goal).length;
  return {
    goal,
    today: todayDoc ? todayDoc.count : 0,
    hasToday: !!todayDoc,
    weeklyAvg: window.length ? Math.round(avg(window.map((d) => d.count))) : null,
    daysLogged: window.length,
    daysHitGoal: hit,
    pctHitGoal: window.length ? Math.round((hit / window.length) * 100) : null,
    allTimeHit: all.filter((d) => d.count >= goal).length,
    allTimeLogged: all.length,
  };
}

// --- Exercise progression ------------------------------------------------

/**
 * Per-session roll-up for one exercise plus all-time stats, used by the
 * Progress screen. Metric series are kept separate — never two scales on one
 * chart.
 */
export function exerciseStats(exerciseId) {
  const history = M.exerciseHistory(exerciseId).slice().reverse(); // oldest first
  if (!history.length) return null;
  const perSession = history.map((h) => {
    const sets = h.sets.filter((s) => s.completed && s.reps > 0);
    const topWeight = Math.max(...sets.map((s) => Number(s.weight) || 0));
    const bestSet = sets.reduce((a, s) => (s.weight > a.weight || (s.weight === a.weight && s.reps > a.reps) ? s : a), sets[0]);
    const est = Math.max(...sets.map((s) => e1rm(Number(s.weight), Number(s.reps)) || 0));
    return {
      date: h.date,
      sessionId: h.sessionId,
      week: h.week,
      sets: sets.length,
      topWeight,
      workingWeight: mode(sets.map((s) => Number(s.weight) || 0)),
      bestSet,
      totalReps: sum(sets.map((s) => s.reps)),
      volume: sum(sets.map((s) => (Number(s.weight) || 0) * (Number(s.reps) || 0))),
      e1rm: est > 0 ? Math.round(est * 10) / 10 : null,
    };
  });
  const first = perSession[0];
  const current = perSession[perSession.length - 1];
  const bests = bestsFor(exerciseId);
  return {
    exerciseId,
    perSession,
    sessions: perSession.length,
    totalSets: sum(perSession.map((p) => p.sets)),
    totalVolume: sum(perSession.map((p) => p.volume)),
    first: { date: first.date, weight: first.workingWeight, reps: first.bestSet.reps },
    current: { date: current.date, weight: current.workingWeight, reps: current.bestSet.reps },
    bestWeight: bests ? bests.maxWeight : null,
    bestReps: bests ? bests.maxReps : null,
    bestE1rm: bests ? bests.bestE1rm : null,
    weightChange: current.workingWeight - first.workingWeight,
    series: {
      weight: perSession.map((p) => ({ date: p.date, value: p.workingWeight })),
      e1rm: perSession.filter((p) => p.e1rm).map((p) => ({ date: p.date, value: p.e1rm })),
      volume: perSession.map((p) => ({ date: p.date, value: Math.round(p.volume) })),
      reps: perSession.map((p) => ({ date: p.date, value: p.totalReps })),
    },
  };
}

/** Exercises that have at least one completed set, for the chart picker. */
export function trackedExercises() {
  const ids = new Set(store.where('setLogs', (s) => s.completed && s.reps > 0).map((s) => s.exerciseId));
  return [...ids]
    .map((id) => M.getExercise(id))
    .filter(Boolean)
    .sort((a, b) => a.name.localeCompare(b.name));
}

// --- Weeks ---------------------------------------------------------------

export function weekRange(program, week) {
  const from = M.weekStartDate(program, week);
  return { from, to: addDays(from, 6) };
}

export function weekSummary(program, week) {
  if (!program) return null;
  const { from, to } = weekRange(program, week);
  const inRange = (d) => d >= from && d <= to;

  const weekSessions = M.sessions({ programId: program.id, status: 'completed' }).filter((s) => inRange(s.date));
  const bw = M.bodyWeightSeries().filter((d) => inRange(d.date));
  const steps = M.stepSeries().filter((d) => inRange(d.date));
  const goal = M.settings().stepGoal || 10000;
  const cardio = store.all('cardio').filter((c) => inRange(c.date));
  const waist = M.waistSeries().filter((d) => inRange(d.date));
  const prs = store.all('prs').filter((p) => inRange(p.date));
  const durations = weekSessions.map((s) => s.durationSec).filter((d) => d > 0);

  return {
    week,
    from,
    to,
    isCurrent: today() >= from && today() <= to,
    isFuture: from > today(),
    adherence: { done: weekSessions.length, target: program.daysPerWeek || 6 },
    sessions: weekSessions,
    avgBodyWeight: bw.length ? avg(bw.map((d) => d.weight)) : null,
    bodyWeightChange: bw.length > 1 ? bw[bw.length - 1].weight - bw[0].weight : null,
    avgSteps: steps.length ? Math.round(avg(steps.map((d) => d.count))) : null,
    daysHitGoal: steps.filter((d) => d.count >= goal).length,
    stepDaysLogged: steps.length,
    avgDuration: durations.length ? Math.round(avg(durations)) : null,
    totalSets: sum(weekSessions.map((s) => s.totalSets || 0)),
    totalVolume: sum(weekSessions.map((s) => s.totalVolume || 0)),
    cardioSessions: cardio.length,
    cardioMinutes: sum(cardio.map((c) => c.durationMin || 0)),
    prs,
    waist: waist.length ? waist[waist.length - 1].value : null,
  };
}

/** Week summary with deltas against the week before. */
export function weekComparison(program, week) {
  const current = weekSummary(program, week);
  const previous = week > 1 ? weekSummary(program, week - 1) : null;
  if (!current) return null;
  const delta = (a, b) => (a == null || b == null ? null : a - b);
  return {
    current,
    previous,
    deltas: previous
      ? {
          adherence: current.adherence.done - previous.adherence.done,
          bodyWeight: delta(current.avgBodyWeight, previous.avgBodyWeight),
          steps: delta(current.avgSteps, previous.avgSteps),
          volume: delta(current.totalVolume, previous.totalVolume),
          sets: delta(current.totalSets, previous.totalSets),
          duration: delta(current.avgDuration, previous.avgDuration),
          cardio: current.cardioSessions - previous.cardioSessions,
          waist: delta(current.waist, previous.waist),
        }
      : null,
  };
}

// --- Whole block ---------------------------------------------------------

export function blockSummary(program) {
  if (!program) return null;
  const from = program.startDate;
  const to = addDays(from, program.weeks * 7 - 1);
  const inRange = (d) => d >= from && d <= to;

  const completed = M.sessions({ programId: program.id, status: 'completed' });
  const bw = M.bodyWeightSeries().filter((d) => inRange(d.date));
  const waist = M.waistSeries().filter((d) => inRange(d.date));
  const steps = M.stepSeries().filter((d) => inRange(d.date));
  const goal = M.settings().stepGoal || 10000;
  const prs = store.all('prs').filter((p) => inRange(p.date));
  const cardio = store.all('cardio').filter((c) => inRange(c.date));

  const strength = trackedExercises()
    .map((ex) => {
      const sets = store.where(
        'setLogs',
        (s) => s.exerciseId === ex.id && s.completed && s.reps > 0 && completed.some((c) => c.id === s.sessionId)
      );
      if (!sets.length) return null;
      const bySession = new Map();
      sets.forEach((s) => {
        if (!bySession.has(s.sessionId)) bySession.set(s.sessionId, []);
        bySession.get(s.sessionId).push(s);
      });
      const ordered = [...bySession.entries()]
        .map(([sid, rows]) => ({ date: (M.getSession(sid) || {}).date, rows }))
        .filter((x) => x.date)
        .sort((a, b) => a.date.localeCompare(b.date));
      if (ordered.length < 2) return null;
      const w = (x) => mode(x.rows.map((r) => Number(r.weight) || 0));
      const startW = w(ordered[0]);
      const endW = w(ordered[ordered.length - 1]);
      return {
        exerciseId: ex.id,
        name: ex.name,
        start: startW,
        end: endW,
        change: endW - startW,
        pct: startW ? ((endW - startW) / startW) * 100 : null,
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.change - a.change);

  return {
    program,
    from,
    to,
    weeks: program.weeks,
    totalWorkouts: completed.length,
    targetWorkouts: program.weeks * (program.daysPerWeek || 6),
    adherencePct: Math.round((completed.length / (program.weeks * (program.daysPerWeek || 6))) * 100),
    startWeight: bw.length ? bw[0].weight : null,
    endWeight: bw.length ? bw[bw.length - 1].weight : null,
    weightChange: bw.length > 1 ? bw[bw.length - 1].weight - bw[0].weight : null,
    startWaist: waist.length ? waist[0].value : null,
    endWaist: waist.length ? waist[waist.length - 1].value : null,
    waistChange: waist.length > 1 ? waist[waist.length - 1].value - waist[0].value : null,
    avgSteps: steps.length ? Math.round(avg(steps.map((d) => d.count))) : null,
    daysHitGoal: steps.filter((d) => d.count >= goal).length,
    stepDaysLogged: steps.length,
    totalVolume: sum(completed.map((s) => s.totalVolume || 0)),
    totalSets: sum(completed.map((s) => s.totalSets || 0)),
    cardioSessions: cardio.length,
    prs,
    strength,
  };
}

// --- Dashboard -----------------------------------------------------------

export function todayStatus(date = today()) {
  const program = M.activeProgram();
  const scheduled = M.scheduledDay(date);
  const session = M.sessionForDate(date);
  const planned = scheduled ? M.daySlots(scheduled.key, program).length : 0;
  let completedExercises = 0;
  if (session) {
    completedExercises = M.sessionExercises(session.id).filter((es) =>
      M.exerciseSessionSets(es.id).some((s) => s.completed)
    ).length;
  }
  return {
    date,
    program,
    week: program ? M.weekOf(program, date) : 1,
    weeks: program ? program.weeks : 6,
    blockComplete: M.isBlockComplete(date),
    scheduled,
    isRestDay: !scheduled,
    session,
    plannedExercises: session ? M.sessionExercises(session.id).length : planned,
    completedExercises,
    cardio: M.cardioOn(date),
    steps: stepStats(date),
    bodyWeight: bodyWeightStats(date),
  };
}

/** Sessions grouped by date for the History screen. */
export function historyList({ limit = 200 } = {}) {
  return M.sessions({ status: 'completed', limit }).map((s) => ({
    session: s,
    exercises: M.sessionExercises(s.id).length,
    prs: store.all('prs').filter((p) => p.sessionId === s.id).length,
    cardio: M.cardioForSession(s.id),
  }));
}
