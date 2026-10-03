// === Program & Exercise Configuration ===
// Everything about the training block lives here. Exercises, sets, rep ranges,
// weight increments and rest times are all data — edit this file (or the in-app
// Exercise Library / Program editor) to change the program without touching logic.

export const SCHEMA_VERSION = 2;

// Weight increment defaults by equipment class, in kg.
export const INCREMENTS = {
  barbellLower: 5,
  barbellUpper: 2.5,
  machine: 5,
  dumbbell: 2.5,
  cable: 2.5,
  small: 1.25,
};

// Rest defaults in seconds — compounds get longer rests than isolation work.
export const REST = {
  compound: 150,
  isolation: 75,
};

// --- Exercise Library seed ------------------------------------------------
// type:        'compound' | 'isolation'  → drives default rest + PR weighting
// unilateral:  true → logged weight/reps are "per side"
// increment:   smallest sensible jump for this exercise
const L = (id, name, muscleGroup, equipment, type, repMin, repMax, increment, opts = {}) => ({
  id,
  name,
  muscleGroup,
  equipment,
  type,
  repMin,
  repMax,
  increment,
  restSeconds: opts.restSeconds ?? (type === 'compound' ? REST.compound : REST.isolation),
  unilateral: !!opts.unilateral,
  notes: opts.notes || '',
  tags: opts.tags || [],
  isCustom: false,
  archived: false,
});

export const EXERCISE_LIBRARY = [
  // Push A
  L('barbell-bench-press', 'Barbell Bench Press', 'Chest', 'Barbell', 'compound', 6, 8, INCREMENTS.barbellUpper, { tags: ['key'] }),
  L('incline-dumbbell-press', 'Incline Dumbbell Press', 'Chest', 'Dumbbell', 'compound', 8, 12, INCREMENTS.dumbbell, { tags: ['key'] }),
  L('chest-fly', 'Cable/Machine Chest Fly', 'Chest', 'Cable', 'isolation', 10, 15, INCREMENTS.cable),
  L('seated-db-shoulder-press', 'Seated Dumbbell Shoulder Press', 'Shoulders', 'Dumbbell', 'compound', 8, 12, INCREMENTS.dumbbell),
  L('lateral-raise', 'Cable/Dumbbell Lateral Raise', 'Shoulders', 'Cable', 'isolation', 12, 20, INCREMENTS.small),
  L('rope-triceps-pushdown', 'Rope Triceps Pushdown', 'Triceps', 'Cable', 'isolation', 10, 15, INCREMENTS.cable),

  // Pull A
  L('lat-pulldown', 'Lat Pulldown', 'Back', 'Cable', 'compound', 8, 12, INCREMENTS.cable, { tags: ['key'] }),
  L('chest-supported-row', 'Chest-Supported Row', 'Back', 'Machine', 'compound', 8, 12, INCREMENTS.machine),
  L('seated-cable-row', 'Seated Cable Row', 'Back', 'Cable', 'compound', 8, 12, INCREMENTS.cable),
  L('reverse-pec-deck', 'Reverse Pec Deck', 'Rear Delts', 'Machine', 'isolation', 12, 20, INCREMENTS.cable),
  L('db-cable-curl', 'Dumbbell/Cable Curl', 'Biceps', 'Dumbbell', 'isolation', 10, 15, INCREMENTS.dumbbell),
  L('hammer-curl', 'Hammer Curl', 'Biceps', 'Dumbbell', 'isolation', 10, 15, INCREMENTS.dumbbell),

  // Legs A
  L('back-squat', 'Back Squat', 'Quads', 'Barbell', 'compound', 6, 8, INCREMENTS.barbellLower, { tags: ['key'] }),
  L('leg-press', 'Leg Press', 'Quads', 'Machine', 'compound', 8, 12, INCREMENTS.machine, { tags: ['key'] }),
  L('bulgarian-split-squat', 'Bulgarian Split Squat', 'Quads', 'Dumbbell', 'compound', 8, 12, INCREMENTS.dumbbell, { unilateral: true }),
  L('leg-curl', 'Leg Curl', 'Hamstrings', 'Machine', 'isolation', 10, 15, INCREMENTS.cable),
  L('leg-extension', 'Leg Extension', 'Quads', 'Machine', 'isolation', 12, 15, INCREMENTS.cable),
  L('standing-calf-raise', 'Standing Calf Raise', 'Calves', 'Machine', 'isolation', 10, 15, INCREMENTS.cable),

  // Push B
  L('incline-barbell-press', 'Incline Barbell Press', 'Chest', 'Barbell', 'compound', 6, 10, INCREMENTS.barbellUpper, { tags: ['key'] }),
  L('machine-chest-press', 'Machine Chest Press', 'Chest', 'Machine', 'compound', 8, 12, INCREMENTS.machine),
  L('cable-fly', 'Cable Fly', 'Chest', 'Cable', 'isolation', 12, 15, INCREMENTS.cable),
  L('machine-db-shoulder-press', 'Machine/Dumbbell Shoulder Press', 'Shoulders', 'Machine', 'compound', 8, 12, INCREMENTS.dumbbell),
  L('cable-lateral-raise', 'Cable Lateral Raise', 'Shoulders', 'Cable', 'isolation', 12, 20, INCREMENTS.small),
  L('overhead-cable-triceps-ext', 'Overhead Cable Triceps Extension', 'Triceps', 'Cable', 'isolation', 10, 15, INCREMENTS.cable),

  // Pull B
  L('pull-up', 'Pull-Ups', 'Back', 'Bodyweight', 'compound', 6, 12, INCREMENTS.barbellUpper, { notes: 'Log added weight only (0 = bodyweight).' }),
  L('barbell-row', 'Barbell/Machine Row', 'Back', 'Barbell', 'compound', 6, 10, INCREMENTS.barbellUpper),
  L('neutral-grip-pulldown', 'Neutral-Grip Pulldown', 'Back', 'Cable', 'compound', 8, 12, INCREMENTS.cable),
  L('single-arm-row', 'Single-Arm Dumbbell/Cable Row', 'Back', 'Dumbbell', 'compound', 8, 12, INCREMENTS.dumbbell, { unilateral: true }),
  L('incline-db-curl', 'Incline Dumbbell Curl', 'Biceps', 'Dumbbell', 'isolation', 8, 12, INCREMENTS.dumbbell),

  // Legs B
  L('romanian-deadlift', 'Romanian Deadlift', 'Hamstrings', 'Barbell', 'compound', 6, 10, INCREMENTS.barbellLower, { tags: ['key'] }),
  L('hack-squat', 'Hack Squat', 'Quads', 'Machine', 'compound', 8, 12, INCREMENTS.machine),
  L('walking-lunges', 'Walking Lunges', 'Quads', 'Dumbbell', 'compound', 10, 12, INCREMENTS.dumbbell, { unilateral: true }),
  L('seated-leg-curl', 'Seated Leg Curl', 'Hamstrings', 'Machine', 'isolation', 10, 15, INCREMENTS.cable),
  L('seated-calf-raise', 'Seated Calf Raise', 'Calves', 'Machine', 'isolation', 10, 15, INCREMENTS.cable),

  // Core — tracked as normal exercises, attachable to any workout
  L('cable-crunch', 'Cable Crunch', 'Core', 'Cable', 'isolation', 10, 15, INCREMENTS.cable, { tags: ['core'] }),
  L('hanging-leg-raise', 'Hanging Leg Raise', 'Core', 'Bodyweight', 'isolation', 8, 15, INCREMENTS.small, { tags: ['core'], notes: 'Log added weight only (0 = bodyweight).' }),
];

export const CORE_EXERCISE_IDS = ['cable-crunch', 'hanging-leg-raise'];

// --- Workout days --------------------------------------------------------
// weekday: 1 = Monday … 6 = Saturday, 0 = Sunday (rest)
// Each slot: { exerciseId, sets, repMin, repMax, setsMin?, alternatives? }
const S = (exerciseId, sets, repMin, repMax, opts = {}) => ({
  exerciseId,
  sets,
  repMin,
  repMax,
  setsMin: opts.setsMin || null,
  alternatives: opts.alternatives || null,
});

export const WORKOUT_DAYS = [
  {
    key: 'pushA',
    name: 'Push A',
    emphasis: 'Chest emphasis',
    weekday: 1,
    group: 'push',
    slots: [
      S('barbell-bench-press', 4, 6, 8),
      S('incline-dumbbell-press', 3, 8, 12),
      S('chest-fly', 3, 10, 15),
      S('seated-db-shoulder-press', 3, 8, 12),
      S('lateral-raise', 3, 12, 20),
      S('rope-triceps-pushdown', 3, 10, 15),
    ],
  },
  {
    key: 'pullA',
    name: 'Pull A',
    emphasis: 'Back emphasis',
    weekday: 2,
    group: 'pull',
    slots: [
      S('lat-pulldown', 4, 8, 12),
      S('chest-supported-row', 3, 8, 12),
      S('seated-cable-row', 3, 8, 12),
      S('reverse-pec-deck', 3, 12, 20),
      S('db-cable-curl', 3, 10, 15),
      S('hammer-curl', 2, 10, 15),
    ],
  },
  {
    key: 'legsA',
    name: 'Legs A',
    emphasis: 'Quad emphasis',
    weekday: 3,
    group: 'legs',
    slots: [
      S('back-squat', 4, 6, 8),
      S('leg-press', 3, 8, 12),
      S('bulgarian-split-squat', 3, 8, 12),
      S('leg-curl', 3, 10, 15),
      S('leg-extension', 3, 12, 15),
      S('standing-calf-raise', 3, 10, 15),
    ],
  },
  {
    key: 'pushB',
    name: 'Push B',
    emphasis: 'Upper chest / shoulder emphasis',
    weekday: 4,
    group: 'push',
    slots: [
      S('incline-barbell-press', 4, 6, 10),
      S('machine-chest-press', 3, 8, 12),
      S('cable-fly', 3, 12, 15, { setsMin: 2 }),
      S('machine-db-shoulder-press', 3, 8, 12),
      S('cable-lateral-raise', 3, 12, 20),
      S('overhead-cable-triceps-ext', 3, 10, 15),
    ],
  },
  {
    key: 'pullB',
    name: 'Pull B',
    emphasis: 'Lat / rear-delt emphasis',
    weekday: 5,
    group: 'pull',
    slots: [
      S('pull-up', 4, 6, 12, { alternatives: ['lat-pulldown'] }),
      S('barbell-row', 3, 6, 10),
      S('neutral-grip-pulldown', 3, 8, 12),
      S('single-arm-row', 3, 8, 12),
      S('reverse-pec-deck', 3, 12, 20),
      S('incline-db-curl', 3, 8, 12),
      S('hammer-curl', 2, 10, 15),
    ],
  },
  {
    key: 'legsB',
    name: 'Legs B',
    emphasis: 'Hamstring / posterior-chain emphasis',
    weekday: 6,
    group: 'legs',
    slots: [
      S('romanian-deadlift', 4, 6, 10),
      S('hack-squat', 3, 8, 12, { alternatives: ['leg-press'] }),
      S('walking-lunges', 3, 10, 12),
      S('seated-leg-curl', 4, 10, 15),
      S('leg-extension', 2, 12, 15),
      S('seated-calf-raise', 3, 10, 15),
    ],
  },
];

export const PROGRAM_TEMPLATE = {
  templateId: 'ppl-x2-6week',
  name: 'PPL ×2 — 6 Week Block',
  weeks: 6,
  daysPerWeek: 6,
  restWeekday: 0,
};

export const DEFAULT_SETTINGS = {
  id: 'settings',
  unit: 'kg',
  waistUnit: 'cm',
  rirEnabled: true,
  rirDefault: 2,
  restTimerEnabled: true,
  restAlerts: false,
  theme: 'system', // 'system' | 'dark' | 'light'
  stepGoal: 10000,
  defaultCardio: { type: 'Incline treadmill', durationMin: 20, speed: 5.5, incline: 10 },
  readinessEnabled: true,
  syncEnabled: true,
};

// Charts default to the exercises worth watching across a block.
export const FEATURED_EXERCISES = [
  'barbell-bench-press',
  'back-squat',
  'lat-pulldown',
  'incline-barbell-press',
  'leg-press',
  'romanian-deadlift',
];

export const DAY_BY_KEY = Object.fromEntries(WORKOUT_DAYS.map((d) => [d.key, d]));
export const DAY_BY_WEEKDAY = Object.fromEntries(WORKOUT_DAYS.map((d) => [d.weekday, d]));
