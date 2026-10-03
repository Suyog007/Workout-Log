// === Double progression ===
// Rule: work a fixed weight until every prescribed set reaches the TOP of the
// rep range, then add the smallest sensible jump. Nothing is ever forced — the
// engine only ever returns a recommendation.

import { mode, roundTo, fmtNum, sum } from '../core/util.js';

/**
 * @param {object} slot      { sets, repMin, repMax }
 * @param {object} exercise  library entry (increment, unilateral, …)
 * @param {object|null} prev { date, sets:[{weight,reps,rir,completed}] }
 * @param {object} settings
 * @returns {{action:'establish'|'hold'|'increase', weight:number|null,
 *            reps:number|null, message:string, previous:object|null}}
 */
export function suggest(slot, exercise, prev, settings = {}) {
  const unit = settings.unit || 'kg';
  const increment = Number(exercise.increment) || 2.5;
  const perSide = exercise.unilateral ? ' per side' : '';

  const prevSets = prev ? prev.sets.filter((s) => s.completed && s.reps > 0) : [];
  if (!prevSets.length) {
    return {
      action: 'establish',
      weight: null,
      reps: slot.repMin,
      message: `First time logged — pick a weight you can control for ${slot.repMin}–${slot.repMax} reps${perSide}.`,
      previous: null,
      totalReps: 0,
    };
  }

  const workingWeight = mode(prevSets.map((s) => Number(s.weight) || 0));
  const atWeight = prevSets.filter((s) => (Number(s.weight) || 0) >= workingWeight);
  const totalRepsAtWeight = sum(atWeight.map((s) => s.reps));
  const prevTotalReps = sum(prevSets.map((s) => s.reps));

  const requiredSets = slot.setsMin || slot.sets;
  const hitTop = atWeight.length >= requiredSets && atWeight.every((s) => s.reps >= slot.repMax);

  if (hitTop) {
    const next = roundTo(workingWeight + increment, increment);
    const easy = settings.rirEnabled && atWeight.every((s) => s.rir != null && s.rir >= 3);
    return {
      action: 'increase',
      weight: next,
      reps: slot.repMin,
      message: `Increase to ${fmtNum(next)} ${unit}${perSide} — aim for ${slot.repMin}+ reps on every set.`,
      note: easy ? 'Every set was RIR 3+ last time, so there is room to move.' : null,
      previous: { weight: workingWeight, totalReps: prevTotalReps },
      totalReps: prevTotalReps,
    };
  }

  return {
    action: 'hold',
    weight: workingWeight,
    reps: slot.repMax,
    message: `Keep ${fmtNum(workingWeight)} ${unit}${perSide} — try to beat ${totalRepsAtWeight} total reps.`,
    previous: { weight: workingWeight, totalReps: prevTotalReps },
    totalReps: totalRepsAtWeight,
    target: `${slot.repMax} reps on all ${slot.sets} sets unlocks the next jump.`,
  };
}

/** "50 kg · 8 / 8 / 7 / 6" style summary of a past session. */
export function formatPrevious(prev, unit = 'kg') {
  if (!prev) return null;
  const sets = prev.sets.filter((s) => s.completed);
  if (!sets.length) return null;
  const weights = [...new Set(sets.map((s) => Number(s.weight) || 0))];
  const weightLabel = weights.length === 1
    ? `${fmtNum(weights[0])} ${unit}`
    : weights.map((w) => fmtNum(w)).join('/') + ` ${unit}`;
  return {
    date: prev.date,
    weightLabel,
    repsLabel: sets.map((s) => s.reps ?? '–').join(' / '),
    rirLabel: sets.some((s) => s.rir != null) ? sets.map((s) => (s.rir == null ? '–' : s.rir)).join(' / ') : null,
    totalReps: sum(sets.map((s) => s.reps)),
    sets,
  };
}

/** Live read-out of how the current session is tracking against the target. */
export function progressionStatus(slot, sets) {
  const done = sets.filter((s) => s.completed && s.reps > 0);
  if (!done.length) return null;
  const workingWeight = mode(done.map((s) => Number(s.weight) || 0));
  const atWeight = done.filter((s) => (Number(s.weight) || 0) >= workingWeight);
  const required = slot.setsMin || slot.sets;
  const onTrack = atWeight.length >= required && atWeight.every((s) => s.reps >= slot.repMax);
  return {
    totalReps: sum(done.map((s) => s.reps)),
    onTrack,
    workingWeight,
    setsDone: done.length,
  };
}
