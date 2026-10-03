// === Domain model ===
// Program / session / metric operations. Views talk to this module, never to
// IndexedDB directly.

import * as store from './store.js';
import { uid, today, addDays, daysBetween, startOfWeek, weekdayOf, clamp } from './util.js';
import {
  EXERCISE_LIBRARY, WORKOUT_DAYS, DAY_BY_KEY, DAY_BY_WEEKDAY,
  PROGRAM_TEMPLATE, DEFAULT_SETTINGS, SCHEMA_VERSION,
} from '../config/program.js';

// --- Settings ------------------------------------------------------------
export function settings() {
  return store.get('meta', 'settings') || DEFAULT_SETTINGS;
}

export async function saveSettings(changes) {
  const next = { ...settings(), ...changes, id: 'settings' };
  await store.put('meta', next);
  return next;
}

export const unit = () => settings().unit || 'kg';

// --- Boot ----------------------------------------------------------------

/** Seed settings, the exercise library and a first program block if missing. */
export async function bootstrap() {
  if (!store.get('meta', 'settings')) {
    await store.put('meta', { ...DEFAULT_SETTINGS }, { silent: true });
  }
  const existing = new Set(store.all('exercises').map((e) => e.id));
  const missing = EXERCISE_LIBRARY.filter((e) => !existing.has(e.id));
  if (missing.length) {
    await store.putMany('exercises', missing.map((e) => ({ ...e })), { silent: true });
  }
  await store.put('meta', { id: 'schema', version: SCHEMA_VERSION }, { silent: true });
}

export const isOnboarded = () => !!activeProgram();

// --- Exercises -----------------------------------------------------------
export const exercises = () => store.all('exercises').filter((e) => !e.archived);
export const allExercises = () => store.all('exercises');
export const getExercise = (id) => store.get('exercises', id);

export function exerciseName(id) {
  const ex = getExercise(id);
  return ex ? ex.name : 'Unknown exercise';
}

export async function saveExercise(data) {
  const doc = {
    id: data.id || uid('ex-'),
    name: (data.name || '').trim(),
    muscleGroup: data.muscleGroup || 'Other',
    equipment: data.equipment || 'Other',
    type: data.type === 'compound' ? 'compound' : 'isolation',
    repMin: Number(data.repMin) || 8,
    repMax: Number(data.repMax) || 12,
    increment: Number(data.increment) || 2.5,
    restSeconds: Number(data.restSeconds) || (data.type === 'compound' ? 150 : 75),
    unilateral: !!data.unilateral,
    notes: data.notes || '',
    tags: data.tags || [],
    isCustom: data.isCustom !== false,
    archived: !!data.archived,
  };
  return store.put('exercises', doc);
}

export const archiveExercise = (id) => store.patch('exercises', id, { archived: true });

// --- Program -------------------------------------------------------------
export function activeProgram() {
  const programs = store.all('programs').filter((p) => p.status === 'active');
  programs.sort((a, b) => (b.startDate || '').localeCompare(a.startDate || ''));
  return programs[0] || null;
}

export function programs() {
  return store.all('programs').sort((a, b) => (b.startDate || '').localeCompare(a.startDate || ''));
}

export async function createProgram({ startDate, name } = {}) {
  const start = startOfWeek(startDate || today());
  const index = store.all('programs').length + 1;
  const doc = {
    id: uid('pg-'),
    templateId: PROGRAM_TEMPLATE.templateId,
    name: name || `Block ${index}`,
    startDate: start,
    weeks: PROGRAM_TEMPLATE.weeks,
    status: 'active',
    dayOverrides: {},
    createdAt: Date.now(),
    completedAt: null,
  };
  return store.put('programs', doc);
}

/** Close the current block and open a fresh one. History is kept. */
export async function startNewBlock({ startDate } = {}) {
  const current = activeProgram();
  if (current) {
    await store.patch('programs', current.id, { status: 'complete', completedAt: Date.now() });
  }
  return createProgram({ startDate: startDate || today() });
}

export async function setProgramStart(programId, startDate) {
  return store.patch('programs', programId, { startDate: startOfWeek(startDate) });
}

/** 1-based training week for a date; may exceed program.weeks once finished. */
export function weekOf(program, date = today()) {
  if (!program) return 1;
  const diff = daysBetween(program.startDate, startOfWeek(date));
  return Math.floor(diff / 7) + 1;
}

export function currentWeek(date = today()) {
  const p = activeProgram();
  if (!p) return 1;
  return clamp(weekOf(p, date), 1, p.weeks);
}

export function isBlockComplete(date = today()) {
  const p = activeProgram();
  if (!p) return false;
  return weekOf(p, date) > p.weeks;
}

export function weekStartDate(program, week) {
  return addDays(program.startDate, (week - 1) * 7);
}

/** The program day scheduled on a calendar date (null on the rest day). */
export function scheduledDay(date = today()) {
  return DAY_BY_WEEKDAY[weekdayOf(date)] || null;
}

/** Exercise slots for a day, honouring per-block overrides. */
export function daySlots(dayKey, program = activeProgram()) {
  const override = program && program.dayOverrides && program.dayOverrides[dayKey];
  if (override && override.length) return override;
  const day = DAY_BY_KEY[dayKey];
  return day ? day.slots : [];
}

export async function saveDaySlots(dayKey, slots) {
  const p = activeProgram();
  if (!p) return null;
  const dayOverrides = { ...(p.dayOverrides || {}), [dayKey]: slots };
  return store.patch('programs', p.id, { dayOverrides });
}

export const dayMeta = (dayKey) => DAY_BY_KEY[dayKey] || null;
export const workoutDays = () => WORKOUT_DAYS;

// --- Sessions ------------------------------------------------------------
export function activeSession() {
  return store.all('sessions').find((s) => s.status === 'active') || null;
}

export function sessions({ programId, status, limit } = {}) {
  let list = store.all('sessions');
  if (programId) list = list.filter((s) => s.programId === programId);
  if (status) list = list.filter((s) => s.status === status);
  list.sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.startedAt || 0) - (a.startedAt || 0));
  return limit ? list.slice(0, limit) : list;
}

export const getSession = (id) => store.get('sessions', id);

export function sessionForDate(date, dayKey) {
  return store
    .all('sessions')
    .find((s) => s.date === date && (!dayKey || s.dayKey === dayKey) && s.status !== 'abandoned');
}

export function sessionExercises(sessionId) {
  return store
    .where('exerciseSessions', (e) => e.sessionId === sessionId)
    .sort((a, b) => a.order - b.order);
}

export function sessionSets(sessionId) {
  return store
    .where('setLogs', (s) => s.sessionId === sessionId)
    .sort((a, b) => a.setNumber - b.setNumber);
}

export function exerciseSessionSets(exerciseSessionId) {
  return store
    .where('setLogs', (s) => s.exerciseSessionId === exerciseSessionId)
    .sort((a, b) => a.setNumber - b.setNumber);
}

/**
 * Start a workout. Materialises one exerciseSession per program slot and one
 * placeholder set row per prescribed set, so logging is pure editing.
 */
export async function startSession({ dayKey, date = today(), readiness = null } = {}) {
  const existingActive = activeSession();
  if (existingActive) return existingActive;

  const program = activeProgram();
  const day = DAY_BY_KEY[dayKey];
  if (!day) throw new Error(`Unknown workout day: ${dayKey}`);

  const sessionId = uid('ws-');
  const now = Date.now();
  const session = await store.put('sessions', {
    id: sessionId,
    programId: program ? program.id : null,
    week: program ? weekOf(program, date) : 1,
    dayKey,
    dayName: day.name,
    date,
    startedAt: now,
    endedAt: null,
    durationSec: null,
    status: 'active',
    note: '',
    readinessDate: readiness ? date : null,
    totalSets: 0,
    totalVolume: 0,
  }, { silent: true });

  const slots = daySlots(dayKey, program);
  const exSessions = [];
  const setRows = [];
  slots.forEach((slot, i) => {
    const ex = getExercise(slot.exerciseId);
    const esId = uid('es-');
    const suggestion = suggestFor(slot, ex);
    exSessions.push({
      id: esId,
      sessionId,
      exerciseId: slot.exerciseId,
      order: i,
      targetSets: slot.sets,
      setsMin: slot.setsMin || null,
      repMin: slot.repMin,
      repMax: slot.repMax,
      alternatives: slot.alternatives || null,
      suggestedWeight: suggestion ? suggestion.weight : null,
      notes: '',
      completedAt: null,
    });
    for (let n = 1; n <= slot.sets; n++) {
      setRows.push({
        id: uid('set-'),
        sessionId,
        exerciseSessionId: esId,
        exerciseId: slot.exerciseId,
        setNumber: n,
        weight: suggestion ? suggestion.weight : null,
        reps: null,
        rir: null,
        completed: false,
        timestamp: null,
        notes: '',
      });
    }
  });
  await store.putMany('exerciseSessions', exSessions, { silent: true });
  await store.putMany('setLogs', setRows, { silent: true });
  if (readiness) await saveReadiness({ ...readiness, date });
  store.emit('change', { store: 'sessions' });
  return session;
}

/** Add an extra exercise (e.g. core work) to a running session. */
export async function addExerciseToSession(sessionId, exerciseId, opts = {}) {
  const ex = getExercise(exerciseId);
  if (!ex) throw new Error('Unknown exercise');
  const existing = sessionExercises(sessionId);
  const esId = uid('es-');
  const targetSets = opts.sets || 3;
  const slot = { exerciseId, sets: targetSets, repMin: ex.repMin, repMax: ex.repMax };
  const suggestion = suggestFor(slot, ex);
  await store.put('exerciseSessions', {
    id: esId,
    sessionId,
    exerciseId,
    order: existing.length,
    targetSets,
    setsMin: null,
    repMin: ex.repMin,
    repMax: ex.repMax,
    alternatives: null,
    suggestedWeight: suggestion ? suggestion.weight : null,
    notes: '',
    completedAt: null,
    added: true,
  }, { silent: true });
  const rows = [];
  for (let n = 1; n <= targetSets; n++) {
    rows.push({
      id: uid('set-'),
      sessionId,
      exerciseSessionId: esId,
      exerciseId,
      setNumber: n,
      weight: suggestion ? suggestion.weight : null,
      reps: null,
      rir: null,
      completed: false,
      timestamp: null,
      notes: '',
    });
  }
  await store.putMany('setLogs', rows);
  return esId;
}

export async function removeExerciseFromSession(exerciseSessionId) {
  const sets = exerciseSessionSets(exerciseSessionId);
  for (const s of sets) await store.remove('setLogs', s.id, { silent: true });
  await store.remove('exerciseSessions', exerciseSessionId);
}

/** Swap which exercise a slot uses. Old history stays attached to the old id. */
export async function replaceExercise(exerciseSessionId, newExerciseId, { forProgram = false } = {}) {
  const es = store.get('exerciseSessions', exerciseSessionId);
  if (!es) return;
  const ex = getExercise(newExerciseId);
  const slot = { exerciseId: newExerciseId, sets: es.targetSets, repMin: ex.repMin, repMax: ex.repMax };
  const suggestion = suggestFor(slot, ex);
  await store.patch('exerciseSessions', exerciseSessionId, {
    exerciseId: newExerciseId,
    repMin: ex.repMin,
    repMax: ex.repMax,
    suggestedWeight: suggestion ? suggestion.weight : null,
  }, { silent: true });
  for (const s of exerciseSessionSets(exerciseSessionId)) {
    if (s.completed) continue;
    await store.patch('setLogs', s.id, {
      exerciseId: newExerciseId,
      weight: suggestion ? suggestion.weight : s.weight,
    }, { silent: true });
  }
  if (forProgram) {
    const session = getSession(es.sessionId);
    const slots = daySlots(session.dayKey).map((sl) =>
      sl.exerciseId === es.exerciseId ? { ...sl, exerciseId: newExerciseId } : sl
    );
    await saveDaySlots(session.dayKey, slots);
  }
  store.emit('change', { store: 'exerciseSessions' });
}

export async function addSetRow(exerciseSessionId) {
  const es = store.get('exerciseSessions', exerciseSessionId);
  const rows = exerciseSessionSets(exerciseSessionId);
  const last = rows[rows.length - 1];
  await store.put('setLogs', {
    id: uid('set-'),
    sessionId: es.sessionId,
    exerciseSessionId,
    exerciseId: es.exerciseId,
    setNumber: rows.length + 1,
    weight: last ? last.weight : es.suggestedWeight,
    reps: null,
    rir: null,
    completed: false,
    timestamp: null,
    notes: '',
    extra: true,
  }, { silent: true });
  await store.patch('exerciseSessions', exerciseSessionId, { targetSets: Math.max(es.targetSets, rows.length + 1) });
}

export async function deleteSetRow(setId) {
  const row = store.get('setLogs', setId);
  if (!row) return;
  await store.remove('setLogs', setId);
}

/** Persist edits to a set row without re-rendering the whole screen. */
export async function updateSet(setId, changes) {
  return store.patch('setLogs', setId, changes, { silent: true });
}

export async function completeSet(setId, values) {
  const row = store.get('setLogs', setId);
  if (!row) return null;
  const s = settings();
  const rir = s.rirEnabled ? (values.rir ?? row.rir ?? s.rirDefault) : null;
  const next = await store.patch('setLogs', setId, {
    weight: values.weight ?? row.weight,
    reps: values.reps ?? row.reps,
    rir,
    completed: true,
    timestamp: Date.now(),
  }, { silent: true });
  await recalcSessionTotals(row.sessionId);
  return next;
}

export async function uncompleteSet(setId) {
  const row = store.get('setLogs', setId);
  if (!row) return;
  await store.patch('setLogs', setId, { completed: false, timestamp: null }, { silent: true });
  await recalcSessionTotals(row.sessionId);
}

export async function recalcSessionTotals(sessionId) {
  const sets = sessionSets(sessionId).filter((s) => s.completed);
  const totalSets = sets.length;
  const totalVolume = sets.reduce((a, s) => a + (Number(s.weight) || 0) * (Number(s.reps) || 0), 0);
  await store.patch('sessions', sessionId, { totalSets, totalVolume }, { silent: true });
}

export async function saveSessionNote(sessionId, note) {
  return store.patch('sessions', sessionId, { note }, { silent: true });
}

export async function saveExerciseNote(exerciseSessionId, notes) {
  return store.patch('exerciseSessions', exerciseSessionId, { notes }, { silent: true });
}

export async function finishSession(sessionId) {
  const session = getSession(sessionId);
  if (!session) return null;
  const endedAt = Date.now();
  await recalcSessionTotals(sessionId);
  const sets = sessionSets(sessionId).filter((s) => s.completed);
  const exDone = sessionExercises(sessionId).filter(
    (es) => exerciseSessionSets(es.id).some((s) => s.completed)
  );
  for (const es of exDone) {
    if (!es.completedAt) await store.patch('exerciseSessions', es.id, { completedAt: endedAt }, { silent: true });
  }
  const updated = await store.patch('sessions', sessionId, {
    status: 'completed',
    endedAt,
    durationSec: Math.round((endedAt - session.startedAt) / 1000),
    exercisesCompleted: exDone.length,
    exercisesPlanned: sessionExercises(sessionId).length,
    totalSets: sets.length,
  }, { silent: true });
  return updated;
}

export async function discardSession(sessionId) {
  for (const s of sessionSets(sessionId)) await store.remove('setLogs', s.id, { silent: true });
  for (const es of sessionExercises(sessionId)) await store.remove('exerciseSessions', es.id, { silent: true });
  await store.remove('sessions', sessionId);
}

// --- History lookups -----------------------------------------------------

/** Completed sessions that included an exercise, newest first. */
export function exerciseHistory(exerciseId, { excludeSessionId = null } = {}) {
  const byId = new Map();
  store.where('setLogs', (s) => s.exerciseId === exerciseId && s.completed).forEach((s) => {
    if (s.sessionId === excludeSessionId) return;
    if (!byId.has(s.sessionId)) byId.set(s.sessionId, []);
    byId.get(s.sessionId).push(s);
  });
  const out = [];
  for (const [sessionId, sets] of byId) {
    const session = getSession(sessionId);
    if (!session || session.status !== 'completed') continue;
    sets.sort((a, b) => a.setNumber - b.setNumber);
    out.push({ sessionId, date: session.date, week: session.week, dayKey: session.dayKey, sets });
  }
  out.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  return out;
}

export function previousPerformance(exerciseId, excludeSessionId = null) {
  const history = exerciseHistory(exerciseId, { excludeSessionId });
  return history[0] || null;
}

/** Progression suggestion for a slot, computed from the last completed session. */
export function suggestFor(slot, exercise = null, excludeSessionId = null) {
  const ex = exercise || getExercise(slot.exerciseId);
  if (!ex) return null;
  const prev = previousPerformance(slot.exerciseId, excludeSessionId);
  // progression.js is imported lazily to keep this module free of cycles.
  return progressionRef ? progressionRef(slot, ex, prev, settings()) : null;
}

let progressionRef = null;
export function registerProgression(fn) {
  progressionRef = fn;
}

// --- Body metrics --------------------------------------------------------
const dateDoc = (store_, date) => store.all(store_).find((d) => d.date === date) || null;

export const bodyWeightOn = (date) => dateDoc('bodyWeight', date);
export const waistOn = (date) => dateDoc('waist', date);
export const stepsOn = (date) => dateDoc('steps', date);
export const readinessOn = (date) => dateDoc('readiness', date);

export const bodyWeightSeries = () =>
  store.all('bodyWeight').filter((d) => d.weight != null).sort((a, b) => a.date.localeCompare(b.date));
export const waistSeries = () =>
  store.all('waist').filter((d) => d.value != null).sort((a, b) => a.date.localeCompare(b.date));
export const stepSeries = () =>
  store.all('steps').filter((d) => d.count != null).sort((a, b) => a.date.localeCompare(b.date));

export async function saveBodyWeight(date, weight) {
  const existing = bodyWeightOn(date);
  if (weight === null || weight === '' || Number.isNaN(Number(weight))) {
    if (existing) await store.remove('bodyWeight', existing.id);
    return null;
  }
  return store.put('bodyWeight', {
    id: existing ? existing.id : `bw-${date}`,
    date,
    weight: Number(weight),
    unit: unit(),
  });
}

export async function saveWaist(date, value) {
  const existing = waistOn(date);
  if (value === null || value === '' || Number.isNaN(Number(value))) {
    if (existing) await store.remove('waist', existing.id);
    return null;
  }
  return store.put('waist', {
    id: existing ? existing.id : `wa-${date}`,
    date,
    value: Number(value),
    unit: settings().waistUnit,
  });
}

export async function saveSteps(date, count) {
  const existing = stepsOn(date);
  if (count === null || count === '' || Number.isNaN(Number(count))) {
    if (existing) await store.remove('steps', existing.id);
    return null;
  }
  return store.put('steps', {
    id: existing ? existing.id : `st-${date}`,
    date,
    count: Math.round(Number(count)),
    goal: settings().stepGoal,
  });
}

export async function addSteps(date, delta) {
  const existing = stepsOn(date);
  const next = Math.max(0, (existing ? existing.count : 0) + delta);
  return saveSteps(date, next);
}

export async function saveReadiness({ date = today(), energy, soreness, sleepHours }) {
  const existing = readinessOn(date);
  return store.put('readiness', {
    id: existing ? existing.id : `rd-${date}`,
    date,
    energy: energy || null,
    soreness: soreness || null,
    sleepHours: sleepHours === '' || sleepHours == null ? null : Number(sleepHours),
  });
}

// --- Cardio --------------------------------------------------------------
export const cardioOn = (date) => store.all('cardio').filter((c) => c.date === date);
export const cardioForSession = (sessionId) => store.all('cardio').find((c) => c.sessionId === sessionId) || null;

export async function saveCardio({ id, date = today(), sessionId = null, type, durationMin, speed, incline, calories }) {
  const d = settings().defaultCardio;
  return store.put('cardio', {
    id: id || uid('cd-'),
    date,
    sessionId,
    type: type || d.type,
    durationMin: Number(durationMin) || d.durationMin,
    speed: speed === '' || speed == null ? null : Number(speed),
    incline: incline === '' || incline == null ? null : Number(incline),
    calories: calories === '' || calories == null ? null : Number(calories),
  });
}

export const deleteCardio = (id) => store.remove('cardio', id);

// --- PRs -----------------------------------------------------------------
export const personalRecords = () =>
  store.all('prs').sort((a, b) => (b.date || '').localeCompare(a.date || '') || b.createdAt - a.createdAt);

export const prsForSession = (sessionId) => store.all('prs').filter((p) => p.sessionId === sessionId);
