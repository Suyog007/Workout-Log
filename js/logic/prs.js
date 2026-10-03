// === Personal record detection ===
// PRs are only claimed against real history: an exercise's first logged session
// is a baseline, not a record. Estimated-1RM records need a meaningful (>=1%)
// improvement so a rep-shuffle doesn't read as progress.

import * as store from '../core/store.js';
import { e1rm, uid, mode } from '../core/util.js';

const E1RM_MARGIN = 1.01;

/**
 * Detect PRs set during a session and persist them.
 * @returns {Array} new PR records, most meaningful first.
 */
export async function detectForSession(session, sessionExercises, setsBySession) {
  const found = [];
  const byExercise = new Map();
  setsBySession
    .filter((s) => s.completed && s.reps > 0 && s.weight != null)
    .forEach((s) => {
      if (!byExercise.has(s.exerciseId)) byExercise.set(s.exerciseId, []);
      byExercise.get(s.exerciseId).push(s);
    });

  for (const [exerciseId, sets] of byExercise) {
    const history = priorSets(exerciseId, session.id);
    const priorSessionIds = new Set(history.map((s) => s.sessionId));
    if (priorSessionIds.size < 1) continue; // first ever session — baseline only

    const best = sets.reduce((a, s) => (s.weight > a.weight || (s.weight === a.weight && s.reps > a.reps) ? s : a), sets[0]);
    const prevMaxWeight = Math.max(...history.map((s) => Number(s.weight) || 0), 0);

    // 1. Heaviest weight moved for at least one rep.
    if (best.weight > prevMaxWeight) {
      found.push(makePr(exerciseId, 'weight', session, {
        value: best.weight,
        weight: best.weight,
        reps: best.reps,
        previous: prevMaxWeight,
        label: `${best.weight} kg × ${best.reps}`,
      }));
      continue;
    }

    // 2. Most reps at a weight already trained.
    const atSame = history.filter((s) => Number(s.weight) === Number(best.weight));
    const prevBestReps = atSame.length ? Math.max(...atSame.map((s) => s.reps)) : null;
    if (prevBestReps !== null && best.reps > prevBestReps) {
      found.push(makePr(exerciseId, 'reps', session, {
        value: best.reps,
        weight: best.weight,
        reps: best.reps,
        previous: prevBestReps,
        label: `${best.weight} kg × ${best.reps} (was ×${prevBestReps})`,
      }));
      continue;
    }

    // 3. Estimated 1RM, only when the gain is real.
    const bestE = bestE1rm(sets);
    const prevE = bestE1rm(history);
    if (bestE && prevE && bestE.value > prevE.value * E1RM_MARGIN) {
      found.push(makePr(exerciseId, 'e1rm', session, {
        value: Math.round(bestE.value * 10) / 10,
        weight: bestE.set.weight,
        reps: bestE.set.reps,
        previous: Math.round(prevE.value * 10) / 10,
        label: `est. 1RM ${Math.round(bestE.value * 10) / 10} kg`,
      }));
    }
  }

  // 4. One session-level record: heaviest total volume for this workout type.
  const volume = setsBySession
    .filter((s) => s.completed)
    .reduce((a, s) => a + (Number(s.weight) || 0) * (Number(s.reps) || 0), 0);
  const priorSameDay = store
    .all('sessions')
    .filter((s) => s.id !== session.id && s.dayKey === session.dayKey && s.status === 'completed');
  if (priorSameDay.length && volume > Math.max(...priorSameDay.map((s) => s.totalVolume || 0))) {
    found.push(makePr(null, 'volume', session, {
      value: Math.round(volume),
      label: `${session.dayName} volume ${Math.round(volume).toLocaleString()} kg`,
    }));
  }

  for (const pr of found) await store.put('prs', pr, { silent: true });
  return found;
}

function priorSets(exerciseId, excludeSessionId) {
  const completedSessionIds = new Set(
    store.all('sessions').filter((s) => s.status === 'completed' && s.id !== excludeSessionId).map((s) => s.id)
  );
  return store.where(
    'setLogs',
    (s) => s.exerciseId === exerciseId && s.completed && s.reps > 0 && completedSessionIds.has(s.sessionId)
  );
}

function bestE1rm(sets) {
  let best = null;
  sets.forEach((s) => {
    const v = e1rm(Number(s.weight), Number(s.reps));
    if (v && (!best || v > best.value)) best = { value: v, set: s };
  });
  return best;
}

function makePr(exerciseId, type, session, data) {
  return {
    id: uid('pr-'),
    exerciseId,
    type, // 'weight' | 'reps' | 'e1rm' | 'volume'
    sessionId: session.id,
    date: session.date,
    createdAt: Date.now(),
    ...data,
  };
}

/** All-time bests for an exercise, used by the Progress screen. */
export function bestsFor(exerciseId) {
  const sets = store.where('setLogs', (s) => s.exerciseId === exerciseId && s.completed && s.reps > 0);
  if (!sets.length) return null;
  const maxWeight = Math.max(...sets.map((s) => Number(s.weight) || 0));
  const maxReps = Math.max(...sets.map((s) => Number(s.reps) || 0));
  const e = bestE1rm(sets);
  return {
    maxWeight,
    maxReps,
    bestE1rm: e ? Math.round(e.value * 10) / 10 : null,
    bestE1rmSet: e ? e.set : null,
    workingWeight: mode(sets.map((s) => Number(s.weight) || 0)),
  };
}
