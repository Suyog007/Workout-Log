const DB_NAME = 'GymLogDB';
const DB_VERSION = 4;

let db = null;

function openDB() {
  return new Promise((resolve, reject) => {
    if (db) return resolve(db);
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = e => {
      const d = e.target.result;

      // Exercises library
      if (!d.objectStoreNames.contains('exercises')) {
        const ex = d.createObjectStore('exercises', { keyPath: 'id', autoIncrement: true });
        ex.createIndex('name', 'name', { unique: false });
        ex.createIndex('muscleGroup', 'muscleGroup', { unique: false });
      }

      // Workouts
      if (!d.objectStoreNames.contains('workouts')) {
        const wo = d.createObjectStore('workouts', { keyPath: 'id', autoIncrement: true });
        wo.createIndex('date', 'date', { unique: false });
        wo.createIndex('status', 'status', { unique: false });
      }

      // Sets (the core logging data)
      if (!d.objectStoreNames.contains('sets')) {
        const st = d.createObjectStore('sets', { keyPath: 'id', autoIncrement: true });
        st.createIndex('workoutId', 'workoutId', { unique: false });
        st.createIndex('exerciseId', 'exerciseId', { unique: false });
        st.createIndex('workoutExercise', ['workoutId', 'exerciseId'], { unique: false });
      }

      // Templates (saved routines)
      if (!d.objectStoreNames.contains('templates')) {
        d.createObjectStore('templates', { keyPath: 'id', autoIncrement: true });
      }

      // Body weight log
      if (!d.objectStoreNames.contains('bodyweight')) {
        const bw = d.createObjectStore('bodyweight', { keyPath: 'id', autoIncrement: true });
        bw.createIndex('date', 'date', { unique: false });
      }
    };

    req.onsuccess = e => { db = e.target.result; resolve(db); };
    req.onerror = e => reject(e.target.error);
  });
}

// Generic CRUD helpers
async function dbAdd(store, data) {
  const d = await openDB();
  return new Promise((resolve, reject) => {
    const tx = d.transaction(store, 'readwrite');
    const req = tx.objectStore(store).add(data);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function dbPut(store, data) {
  const d = await openDB();
  return new Promise((resolve, reject) => {
    const tx = d.transaction(store, 'readwrite');
    const req = tx.objectStore(store).put(data);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function dbGet(store, id) {
  const d = await openDB();
  return new Promise((resolve, reject) => {
    const tx = d.transaction(store, 'readonly');
    const req = tx.objectStore(store).get(id);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function dbGetAll(store) {
  const d = await openDB();
  return new Promise((resolve, reject) => {
    const tx = d.transaction(store, 'readonly');
    const req = tx.objectStore(store).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function dbDelete(store, id) {
  const d = await openDB();
  return new Promise((resolve, reject) => {
    const tx = d.transaction(store, 'readwrite');
    const req = tx.objectStore(store).delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function dbGetByIndex(store, indexName, value) {
  const d = await openDB();
  return new Promise((resolve, reject) => {
    const tx = d.transaction(store, 'readonly');
    const idx = tx.objectStore(store).index(indexName);
    const req = idx.getAll(value);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// Seed default exercises
async function seedExercises() {
  const existing = await dbGetAll('exercises');
  if (existing.length > 0) return;

  const defaults = [
    // === CHEST ===
    { name: 'Barbell Bench Press', muscleGroup: 'Chest', type: 'weight',
      primary: ['Chest'], secondary: ['Triceps', 'Front Delts'],
      alternates: ['Dumbbell Bench Press', 'Machine Chest Press'] },
    { name: 'Incline Dumbbell Press', muscleGroup: 'Chest', type: 'weight',
      primary: ['Upper Chest'], secondary: ['Triceps', 'Front Delts'],
      alternates: ['Incline Barbell Press', 'Incline Machine Press'] },
    { name: 'Dumbbell Bench Press', muscleGroup: 'Chest', type: 'weight',
      primary: ['Chest'], secondary: ['Triceps', 'Front Delts'],
      alternates: ['Barbell Bench Press', 'Machine Chest Press'] },
    { name: 'Incline Cable Fly', muscleGroup: 'Chest', type: 'weight',
      primary: ['Upper Chest', 'Inner Chest'], secondary: ['Front Delts'],
      alternates: ['Incline Dumbbell Fly', 'Pec Deck Machine'] },
    { name: 'Dumbbell Fly', muscleGroup: 'Chest', type: 'weight',
      primary: ['Chest', 'Inner Chest'], secondary: ['Front Delts'],
      alternates: ['Cable Crossover', 'Pec Deck Machine'] },
    { name: 'Cable Crossover', muscleGroup: 'Chest', type: 'weight',
      primary: ['Chest', 'Inner Chest'], secondary: ['Front Delts'],
      alternates: ['Dumbbell Fly', 'Pec Deck Machine'] },
    { name: 'Push-Up', muscleGroup: 'Chest', type: 'bodyweight',
      primary: ['Chest'], secondary: ['Triceps', 'Front Delts', 'Core'],
      alternates: ['Diamond Push-Up', 'Decline Push-Up'] },
    { name: 'Machine Chest Press', muscleGroup: 'Chest', type: 'weight',
      primary: ['Chest'], secondary: ['Triceps', 'Front Delts'],
      alternates: ['Barbell Bench Press', 'Dumbbell Bench Press'] },

    // === BACK ===
    { name: 'Conventional Deadlift', muscleGroup: 'Back', type: 'weight',
      primary: ['Lower Back', 'Hamstrings', 'Glutes'], secondary: ['Traps', 'Forearms', 'Core'],
      alternates: ['Sumo Deadlift', 'Trap Bar Deadlift'] },
    { name: 'Pull-Up', muscleGroup: 'Back', type: 'bodyweight',
      primary: ['Lats', 'Upper Back'], secondary: ['Biceps', 'Rear Delts', 'Forearms'],
      alternates: ['Lat Pulldown', 'Assisted Pull-Up'] },
    { name: 'Barbell Bent-Over Row', muscleGroup: 'Back', type: 'weight',
      primary: ['Lats', 'Mid Back', 'Rhomboids'], secondary: ['Biceps', 'Rear Delts', 'Forearms'],
      alternates: ['Pendlay Row', 'T-Bar Row'] },
    { name: 'Seated Cable Row', muscleGroup: 'Back', type: 'weight',
      primary: ['Mid Back', 'Lats', 'Rhomboids'], secondary: ['Biceps', 'Rear Delts'],
      alternates: ['Chest-Supported Row', 'Machine Row'] },
    { name: 'Lat Pulldown', muscleGroup: 'Back', type: 'weight',
      primary: ['Lats', 'Upper Back'], secondary: ['Biceps', 'Rear Delts'],
      alternates: ['Pull-Up', 'Close-Grip Pulldown'] },
    { name: 'Single-Arm Dumbbell Row', muscleGroup: 'Back', type: 'weight',
      primary: ['Lats', 'Mid Back'], secondary: ['Biceps', 'Rear Delts', 'Core'],
      alternates: ['Chest-Supported Dumbbell Row', 'Meadows Row'] },
    { name: 'T-Bar Row', muscleGroup: 'Back', type: 'weight',
      primary: ['Mid Back', 'Lats', 'Rhomboids'], secondary: ['Biceps', 'Rear Delts', 'Lower Back'],
      alternates: ['Barbell Bent-Over Row', 'Landmine Row'] },
    { name: 'Face Pull', muscleGroup: 'Back', type: 'weight',
      primary: ['Rear Delts', 'Rotator Cuff'], secondary: ['Traps', 'Rhomboids'],
      alternates: ['Band Pull-Apart', 'Reverse Pec Deck'] },
    { name: 'Rear Delt Fly', muscleGroup: 'Back', type: 'weight',
      primary: ['Rear Delts'], secondary: ['Traps', 'Rhomboids'],
      alternates: ['Face Pull', 'Reverse Pec Deck', 'Band Pull-Apart'] },
    { name: 'Chest-Supported Dumbbell Row', muscleGroup: 'Back', type: 'weight',
      primary: ['Mid Back', 'Lats'], secondary: ['Biceps', 'Rear Delts'],
      alternates: ['Single-Arm Dumbbell Row', 'Machine Row'] },

    // === SHOULDERS ===
    { name: 'Seated Dumbbell Shoulder Press', muscleGroup: 'Shoulders', type: 'weight',
      primary: ['Front Delts', 'Side Delts'], secondary: ['Triceps', 'Traps'],
      alternates: ['Standing Overhead Press', 'Arnold Press'] },
    { name: 'Arnold Press', muscleGroup: 'Shoulders', type: 'weight',
      primary: ['Front Delts', 'Side Delts'], secondary: ['Triceps', 'Traps'],
      alternates: ['Seated Dumbbell Shoulder Press', 'Standing Overhead Press'] },
    { name: 'Dumbbell Lateral Raise', muscleGroup: 'Shoulders', type: 'weight',
      primary: ['Side Delts'], secondary: ['Traps'],
      alternates: ['Cable Lateral Raise', 'Machine Lateral Raise'] },
    { name: 'Cable Lateral Raise', muscleGroup: 'Shoulders', type: 'weight',
      primary: ['Side Delts'], secondary: ['Traps'],
      alternates: ['Dumbbell Lateral Raise', 'Machine Lateral Raise'] },
    { name: 'Standing Overhead Press', muscleGroup: 'Shoulders', type: 'weight',
      primary: ['Front Delts', 'Side Delts'], secondary: ['Triceps', 'Core', 'Traps'],
      alternates: ['Seated Dumbbell Shoulder Press', 'Landmine Press'] },
    { name: 'Front Raise', muscleGroup: 'Shoulders', type: 'weight',
      primary: ['Front Delts'], secondary: ['Side Delts'],
      alternates: ['Cable Front Raise', 'Plate Front Raise'] },

    // === LEGS ===
    { name: 'Barbell Back Squat', muscleGroup: 'Legs', type: 'weight',
      primary: ['Quads', 'Glutes'], secondary: ['Hamstrings', 'Core', 'Lower Back'],
      alternates: ['Front Squat', 'Hack Squat', 'Leg Press'] },
    { name: 'Romanian Deadlift', muscleGroup: 'Legs', type: 'weight',
      primary: ['Hamstrings', 'Glutes'], secondary: ['Lower Back', 'Core'],
      alternates: ['Stiff-Leg Deadlift', 'Good Morning'] },
    { name: 'Leg Press', muscleGroup: 'Legs', type: 'weight',
      primary: ['Quads', 'Glutes'], secondary: ['Hamstrings'],
      alternates: ['Hack Squat', 'Barbell Back Squat'] },
    { name: 'Lying Leg Curl', muscleGroup: 'Legs', type: 'weight',
      primary: ['Hamstrings'], secondary: ['Calves'],
      alternates: ['Seated Leg Curl', 'Nordic Curl'] },
    { name: 'Hip Abduction Machine', muscleGroup: 'Legs', type: 'weight',
      primary: ['Glute Medius', 'Hip Abductors'], secondary: ['Glutes'],
      alternates: ['Banded Side Walk', 'Cable Hip Abduction'] },
    { name: 'Standing Calf Raise', muscleGroup: 'Legs', type: 'weight',
      primary: ['Gastrocnemius (Calves)'], secondary: ['Soleus'],
      alternates: ['Seated Calf Raise', 'Donkey Calf Raise'] },
    { name: 'Front Squat', muscleGroup: 'Legs', type: 'weight',
      primary: ['Quads', 'Core'], secondary: ['Glutes', 'Upper Back'],
      alternates: ['Goblet Squat', 'Hack Squat'] },
    { name: 'Goblet Squat', muscleGroup: 'Legs', type: 'weight',
      primary: ['Quads', 'Glutes'], secondary: ['Core'],
      alternates: ['Front Squat', 'Dumbbell Squat'] },
    { name: 'Walking Lunge', muscleGroup: 'Legs', type: 'weight',
      primary: ['Quads', 'Glutes'], secondary: ['Hamstrings', 'Core'],
      alternates: ['Reverse Lunge', 'Bulgarian Split Squat'] },
    { name: 'Barbell Hip Thrust', muscleGroup: 'Legs', type: 'weight',
      primary: ['Glutes'], secondary: ['Hamstrings', 'Core'],
      alternates: ['Glute Bridge', 'Cable Pull-Through'] },
    { name: 'Leg Extension', muscleGroup: 'Legs', type: 'weight',
      primary: ['Quads'], secondary: [],
      alternates: ['Sissy Squat', 'Spanish Squat'] },
    { name: 'Seated Calf Raise', muscleGroup: 'Legs', type: 'weight',
      primary: ['Soleus (Calves)'], secondary: ['Gastrocnemius'],
      alternates: ['Standing Calf Raise', 'Smith Machine Calf Raise'] },
    { name: 'Bulgarian Split Squat', muscleGroup: 'Legs', type: 'weight',
      primary: ['Quads', 'Glutes'], secondary: ['Hamstrings', 'Core'],
      alternates: ['Walking Lunge', 'Step-Up'] },
    { name: 'Hack Squat', muscleGroup: 'Legs', type: 'weight',
      primary: ['Quads'], secondary: ['Glutes'],
      alternates: ['Barbell Back Squat', 'Leg Press'] },

    // === ARMS - BICEPS ===
    { name: 'Barbell Bicep Curl', muscleGroup: 'Arms', type: 'weight',
      primary: ['Biceps'], secondary: ['Forearms', 'Brachialis'],
      alternates: ['EZ-Bar Curl', 'Dumbbell Curl'] },
    { name: 'Bayesian Cable Curl', muscleGroup: 'Arms', type: 'weight',
      primary: ['Biceps (Long Head)'], secondary: ['Forearms'],
      alternates: ['Incline Dumbbell Curl', 'Overhead Cable Curl'] },
    { name: 'Hammer Curl', muscleGroup: 'Arms', type: 'weight',
      primary: ['Brachialis', 'Biceps'], secondary: ['Forearms (Brachioradialis)'],
      alternates: ['Cross-Body Hammer Curl', 'Rope Cable Curl'] },
    { name: 'Dumbbell Curl', muscleGroup: 'Arms', type: 'weight',
      primary: ['Biceps'], secondary: ['Forearms'],
      alternates: ['Barbell Bicep Curl', 'Concentration Curl'] },
    { name: 'Incline Dumbbell Curl', muscleGroup: 'Arms', type: 'weight',
      primary: ['Biceps (Long Head)'], secondary: ['Forearms'],
      alternates: ['Bayesian Cable Curl', 'Preacher Curl'] },
    { name: 'EZ-Bar Curl', muscleGroup: 'Arms', type: 'weight',
      primary: ['Biceps'], secondary: ['Forearms', 'Brachialis'],
      alternates: ['Barbell Bicep Curl', 'Dumbbell Curl'] },
    { name: 'Preacher Curl', muscleGroup: 'Arms', type: 'weight',
      primary: ['Biceps (Short Head)'], secondary: ['Forearms'],
      alternates: ['Spider Curl', 'Concentration Curl'] },

    // === ARMS - TRICEPS ===
    { name: 'Cable Triceps Pushdown', muscleGroup: 'Arms', type: 'weight',
      primary: ['Triceps (Lateral Head)'], secondary: ['Triceps (Medial Head)'],
      alternates: ['Rope Triceps Pushdown', 'V-Bar Pushdown'] },
    { name: 'Overhead Dumbbell Triceps Extension', muscleGroup: 'Arms', type: 'weight',
      primary: ['Triceps (Long Head)'], secondary: ['Triceps (Medial Head)'],
      alternates: ['Overhead Cable Extension', 'French Press'] },
    { name: 'Skull Crusher', muscleGroup: 'Arms', type: 'weight',
      primary: ['Triceps'], secondary: ['Triceps (Long Head)'],
      alternates: ['Close-Grip Bench Press', 'Overhead Triceps Extension'] },
    { name: 'Rope Triceps Pushdown', muscleGroup: 'Arms', type: 'weight',
      primary: ['Triceps (Lateral Head)', 'Triceps (Long Head)'], secondary: [],
      alternates: ['Cable Triceps Pushdown', 'V-Bar Pushdown'] },
    { name: 'Close-Grip Bench Press', muscleGroup: 'Arms', type: 'weight',
      primary: ['Triceps'], secondary: ['Chest', 'Front Delts'],
      alternates: ['Skull Crusher', 'Dip'] },
    { name: 'Triceps Dip', muscleGroup: 'Arms', type: 'bodyweight',
      primary: ['Triceps'], secondary: ['Chest', 'Front Delts'],
      alternates: ['Bench Dip', 'Close-Grip Bench Press'] },

    // === ARMS - FOREARMS ===
    { name: 'Wrist Curl', muscleGroup: 'Arms', type: 'weight',
      primary: ['Forearm Flexors'], secondary: [],
      alternates: ['Behind-the-Back Wrist Curl'] },
    { name: 'Reverse Wrist Curl', muscleGroup: 'Arms', type: 'weight',
      primary: ['Forearm Extensors'], secondary: ['Brachioradialis'],
      alternates: ['Reverse Curl'] },

    // === CORE ===
    { name: 'Hanging Leg Raise', muscleGroup: 'Core', type: 'bodyweight',
      primary: ['Lower Abs', 'Hip Flexors'], secondary: ['Obliques', 'Forearms'],
      alternates: ['Lying Leg Raise', 'Captain\'s Chair Leg Raise'] },
    { name: 'Plank', muscleGroup: 'Core', type: 'timed',
      primary: ['Core', 'Transverse Abdominis'], secondary: ['Shoulders', 'Glutes'],
      alternates: ['Dead Bug', 'Ab Wheel Rollout'] },
    { name: 'Cable Woodchop', muscleGroup: 'Core', type: 'weight',
      primary: ['Obliques', 'Core'], secondary: ['Shoulders'],
      alternates: ['Russian Twist', 'Landmine Rotation'] },
    { name: 'Ab Wheel Rollout', muscleGroup: 'Core', type: 'bodyweight',
      primary: ['Core', 'Rectus Abdominis'], secondary: ['Lats', 'Shoulders'],
      alternates: ['Plank', 'Barbell Rollout'] },
    { name: 'Crunch', muscleGroup: 'Core', type: 'bodyweight',
      primary: ['Rectus Abdominis'], secondary: ['Obliques'],
      alternates: ['Cable Crunch', 'Sit-Up'] },

    // === CARDIO ===
    { name: 'Treadmill', muscleGroup: 'Cardio', type: 'cardio',
      primary: ['Heart', 'Quads', 'Calves'], secondary: ['Hamstrings', 'Glutes'],
      alternates: ['Outdoor Run', 'Elliptical'] },
    { name: 'Incline Treadmill Walk', muscleGroup: 'Cardio', type: 'cardio',
      primary: ['Heart', 'Glutes', 'Calves'], secondary: ['Hamstrings', 'Core'],
      alternates: ['StairMaster', 'Outdoor Hike'] },
    { name: 'Stationary Bike', muscleGroup: 'Cardio', type: 'cardio',
      primary: ['Heart', 'Quads'], secondary: ['Hamstrings', 'Calves'],
      alternates: ['Assault Bike', 'Outdoor Cycling'] },
    { name: 'Elliptical', muscleGroup: 'Cardio', type: 'cardio',
      primary: ['Heart', 'Quads', 'Glutes'], secondary: ['Arms', 'Core'],
      alternates: ['Treadmill', 'Stationary Bike'] },
    { name: 'StairMaster', muscleGroup: 'Cardio', type: 'cardio',
      primary: ['Heart', 'Glutes', 'Quads'], secondary: ['Calves', 'Core'],
      alternates: ['Incline Treadmill Walk', 'Step-Up'] },
    { name: 'Rowing Machine', muscleGroup: 'Cardio', type: 'cardio',
      primary: ['Heart', 'Back', 'Legs'], secondary: ['Arms', 'Core'],
      alternates: ['Elliptical', 'Assault Bike'] },
    { name: 'Jump Rope', muscleGroup: 'Cardio', type: 'cardio',
      primary: ['Heart', 'Calves'], secondary: ['Shoulders', 'Core'],
      alternates: ['Jumping Jacks', 'High Knees'] },
    { name: 'Assault Bike', muscleGroup: 'Cardio', type: 'cardio',
      primary: ['Heart', 'Quads', 'Arms'], secondary: ['Core', 'Shoulders'],
      alternates: ['Stationary Bike', 'Rowing Machine'] },
  ];

  const exerciseIds = {};
  for (const ex of defaults) {
    const id = await dbAdd('exercises', ex);
    exerciseIds[ex.name] = id;
  }

  // Seed default templates (PPL split)
  const templateDefs = [
    {
      name: 'Push Day 1',
      exercises: ['Barbell Bench Press', 'Incline Dumbbell Press', 'Seated Dumbbell Shoulder Press',
                  'Dumbbell Lateral Raise', 'Cable Triceps Pushdown', 'Overhead Dumbbell Triceps Extension', 'Push-Up',
                  'Treadmill']
    },
    {
      name: 'Push Day 2',
      exercises: ['Dumbbell Bench Press', 'Incline Cable Fly', 'Arnold Press',
                  'Cable Lateral Raise', 'Skull Crusher', 'Rope Triceps Pushdown',
                  'Treadmill']
    },
    {
      name: 'Pull Day 1',
      exercises: ['Conventional Deadlift', 'Pull-Up', 'Barbell Bent-Over Row',
                  'Seated Cable Row', 'Barbell Bicep Curl', 'Face Pull',
                  'Treadmill']
    },
    {
      name: 'Pull Day 2',
      exercises: ['Lat Pulldown', 'Single-Arm Dumbbell Row', 'T-Bar Row',
                  'Rear Delt Fly', 'Bayesian Cable Curl', 'Hammer Curl', 'Wrist Curl',
                  'Treadmill']
    },
    {
      name: 'Leg Day 1',
      exercises: ['Barbell Back Squat', 'Romanian Deadlift', 'Leg Press',
                  'Lying Leg Curl', 'Hip Abduction Machine', 'Standing Calf Raise',
                  'Treadmill']
    },
    {
      name: 'Leg Day 2',
      exercises: ['Front Squat', 'Walking Lunge', 'Barbell Hip Thrust',
                  'Leg Extension', 'Seated Calf Raise',
                  'Treadmill']
    },
  ];

  for (const t of templateDefs) {
    await dbAdd('templates', {
      name: t.name,
      exerciseIds: t.exercises.map(name => exerciseIds[name]).filter(Boolean)
    });
  }
}

// Get exercise history (all sets for a given exercise, sorted by date)
async function getExerciseHistory(exerciseId) {
  const sets = await dbGetByIndex('sets', 'exerciseId', exerciseId);
  const workouts = await dbGetAll('workouts');
  const workoutMap = {};
  workouts.forEach(w => workoutMap[w.id] = w);

  return sets
    .map(s => ({ ...s, workout: workoutMap[s.workoutId] }))
    .filter(s => s.workout)
    .sort((a, b) => new Date(b.workout.date) - new Date(a.workout.date));
}

// Get personal record for an exercise (highest weight x reps combination)
async function getExercisePR(exerciseId) {
  const sets = await dbGetByIndex('sets', 'exerciseId', exerciseId);
  if (!sets.length) return null;

  const bestVolume = sets.reduce((best, s) => {
    const vol = (s.weight || 0) * (s.reps || 0);
    const bestVol = (best.weight || 0) * (best.reps || 0);
    return vol > bestVol ? s : best;
  }, sets[0]);

  const heaviestWeight = sets.reduce((best, s) => {
    return (s.weight || 0) > (best.weight || 0) ? s : best;
  }, sets[0]);

  return { bestVolume, heaviestWeight };
}

// Check if a set is a new PR
async function checkPR(exerciseId, weight, reps) {
  const pr = await getExercisePR(exerciseId);
  if (!pr) return true;
  const bv = pr.bestVolume;
  return (weight * reps) > ((bv.weight || 0) * (bv.reps || 0));
}

// Get last workout data for an exercise (for "beat last time" feature)
async function getLastWorkoutForExercise(exerciseId) {
  const history = await getExerciseHistory(exerciseId);
  if (!history.length) return null;

  const lastWorkoutId = history[0].workoutId;
  return history.filter(s => s.workoutId === lastWorkoutId);
}

// Get last N sessions for an exercise (grouped by workout), excluding a specific workout
async function getRecentSessionsForExercise(exerciseId, count = 2, excludeWorkoutId = null) {
  const history = await getExerciseHistory(exerciseId);
  if (!history.length) return [];

  // Group by workoutId, preserving order (most recent first), skip excluded workout
  const sessions = [];
  const seen = new Set();
  for (const s of history) {
    if (excludeWorkoutId && s.workoutId === excludeWorkoutId) continue;
    if (!seen.has(s.workoutId)) {
      seen.add(s.workoutId);
      sessions.push({
        workoutId: s.workoutId,
        date: s.workout.date,
        sets: []
      });
    }
    sessions.find(sess => sess.workoutId === s.workoutId).sets.push(s);
  }

  return sessions.slice(0, count);
}

// Export all data as JSON (for backup)
async function exportAllData() {
  const [exercises, workouts, sets, templates, bodyweight] = await Promise.all([
    dbGetAll('exercises'),
    dbGetAll('workouts'),
    dbGetAll('sets'),
    dbGetAll('templates'),
    dbGetAll('bodyweight'),
  ]);
  return { exercises, workouts, sets, templates, bodyweight, exportDate: new Date().toISOString() };
}

// Import data from JSON
async function importData(data) {
  const stores = ['exercises', 'workouts', 'sets', 'templates', 'bodyweight'];
  for (const store of stores) {
    if (data[store]) {
      for (const item of data[store]) {
        await dbPut(store, item);
      }
    }
  }
}
