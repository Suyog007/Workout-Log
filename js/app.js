// === GymLog App ===

// Auth state
let isAuthenticated = false;

// State
let currentView = 'dashboard';
let activeWorkout = null;
let restTimer = null;
let restSeconds = 0;
let workoutTimer = null;
let workoutSeconds = 0;

const MUSCLE_GROUPS = ['All', 'Chest', 'Back', 'Shoulders', 'Legs', 'Arms', 'Core', 'Cardio'];
const RPE_COLORS = {
  6: '#00b894', 7: '#00cec9', 8: '#fdcb6e', 9: '#e17055', 10: '#d63031'
};

// Protected views that require login
const PROTECTED_VIEWS = ['dashboard', 'workout', 'history', 'stats', 'templates', 'settings', 'workout-detail'];

// === Router ===
function navigate(view, params = {}) {
  // Auth gate: redirect to login for protected views
  if (PROTECTED_VIEWS.includes(view) && !isAuthenticated) {
    currentView = 'login';
    render({ redirect: view, redirectParams: params });
    return;
  }

  const app = document.getElementById('app');
  app.classList.add('fade');
  setTimeout(() => {
    currentView = view;
    render(params);
    app.classList.remove('fade');
    window.scrollTo(0, 0);
  }, 150);
}

// === Render ===
function render(params = {}) {
  const app = document.getElementById('app');
  updateNav();

  switch (currentView) {
    case 'login': renderLogin(app, params); break;
    case 'dashboard': renderDashboard(app); break;
    case 'workout': renderActiveWorkout(app); break;
    case 'history': renderHistory(app); break;
    case 'exercises': renderExercises(app); break;
    case 'stats': renderStats(app, params); break;
    case 'templates': renderTemplates(app); break;
    case 'settings': renderSettings(app); break;
    case 'workout-detail': renderWorkoutDetail(app, params); break;
  }
}

function updateNav() {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.view === currentView);
    // Dim protected nav items when not logged in
    if (!isAuthenticated && PROTECTED_VIEWS.includes(item.dataset.view)) {
      item.style.opacity = '0.35';
    } else {
      item.style.opacity = '';
    }
  });
}

// === SVG Icons ===
const icons = {
  home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
  dumbbell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6.5 6.5h11M6 12H4a1 1 0 01-1-1V9a1 1 0 011-1h2M6 12H4a1 1 0 00-1 1v2a1 1 0 001 1h2M6 12V8m0 4v4m12-4h2a1 1 0 001-1V9a1 1 0 00-1-1h-2m0 4h2a1 1 0 011 1v2a1 1 0 01-1 1h-2m0-4V8m0 4v4M6 8h12M6 16h12"/></svg>',
  clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
  chart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>',
  list: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>',
  trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>',
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
  settings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>',
  x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
  copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>',
  trophy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9H4.5a2.5 2.5 0 010-5H6"/><path d="M18 9h1.5a2.5 2.5 0 000-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20 17 22"/><path d="M18 2H6v7a6 6 0 0012 0V2z"/></svg>',
  play: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>',
  save: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>',
  arrowLeft: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>',
  notes: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',
};

// === AUTH ===
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + 'gymlog-salt-2026');
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function isSetup() {
  return !!localStorage.getItem('gymlog_user');
}

function isLoggedIn() {
  return localStorage.getItem('gymlog_session') === 'active';
}

function renderLogin(app, params = {}) {
  const setup = isSetup();

  if (!setup) {
    // First time setup
    app.innerHTML = `
      <div class="container" style="padding-top:60px">
        <div style="text-align:center;margin-bottom:32px">
          <h1 style="font-size:2rem;margin-bottom:4px"><span style="color:var(--primary-light)">Gym</span>Log</h1>
          <p class="text-dim">Set up your account</p>
        </div>
        <div class="card">
          <div class="input-group">
            <label>Username</label>
            <input type="text" id="setup-user" placeholder="Enter username" autocomplete="username">
          </div>
          <div class="input-group">
            <label>Password</label>
            <input type="password" id="setup-pass" placeholder="Enter password" autocomplete="new-password">
          </div>
          <div class="input-group">
            <label>Confirm Password</label>
            <input type="password" id="setup-pass2" placeholder="Confirm password" autocomplete="new-password"
              onkeydown="if(event.key==='Enter')doSetup()">
          </div>
          <div id="setup-error" class="text-danger text-sm mb-8" style="display:none"></div>
          <button class="btn btn-primary btn-block" onclick="doSetup()">Create Account</button>
        </div>
      </div>`;
  } else {
    // Login
    const savedUser = localStorage.getItem('gymlog_user');
    app.innerHTML = `
      <div class="container" style="padding-top:60px">
        <div style="text-align:center;margin-bottom:32px">
          <h1 style="font-size:2rem;margin-bottom:4px"><span style="color:var(--primary-light)">Gym</span>Log</h1>
          <p class="text-dim">Welcome back, <strong>${savedUser}</strong></p>
        </div>
        <div class="card">
          <div class="input-group">
            <label>Password</label>
            <input type="password" id="login-pass" placeholder="Enter password" autocomplete="current-password"
              onkeydown="if(event.key==='Enter')doLogin()">
          </div>
          <div id="login-error" class="text-danger text-sm mb-8" style="display:none"></div>
          <button class="btn btn-primary btn-block" onclick="doLogin()">Log In</button>
        </div>
        <div style="text-align:center;margin-top:20px">
          <button class="btn btn-ghost btn-sm" onclick="navigate('exercises')">Browse Exercises</button>
        </div>
      </div>`;

    // Auto focus password
    setTimeout(() => document.getElementById('login-pass')?.focus(), 200);
  }
}

async function doSetup() {
  const user = document.getElementById('setup-user').value.trim();
  const pass = document.getElementById('setup-pass').value;
  const pass2 = document.getElementById('setup-pass2').value;
  const errEl = document.getElementById('setup-error');

  if (!user) { errEl.textContent = 'Username is required'; errEl.style.display = ''; return; }
  if (pass.length < 4) { errEl.textContent = 'Password must be at least 4 characters'; errEl.style.display = ''; return; }
  if (pass !== pass2) { errEl.textContent = 'Passwords do not match'; errEl.style.display = ''; return; }

  const hashed = await hashPassword(pass);
  localStorage.setItem('gymlog_user', user);
  localStorage.setItem('gymlog_pass', hashed);
  localStorage.setItem('gymlog_session', 'active');
  isAuthenticated = true;
  navigate('dashboard');
}

async function doLogin() {
  const pass = document.getElementById('login-pass').value;
  const errEl = document.getElementById('login-error');

  const hashed = await hashPassword(pass);
  const stored = localStorage.getItem('gymlog_pass');

  if (hashed !== stored) {
    errEl.textContent = 'Incorrect password';
    errEl.style.display = '';
    document.getElementById('login-pass').value = '';
    return;
  }

  localStorage.setItem('gymlog_session', 'active');
  isAuthenticated = true;
  navigate('dashboard');
}

function doLogout() {
  localStorage.removeItem('gymlog_session');
  isAuthenticated = false;
  navigate('login');
}

function showChangePasswordModal() {
  showModal(`
    <div class="modal-header">
      <h2>Change Password</h2>
      <button class="modal-close" onclick="closeModal()">${icons.x}</button>
    </div>
    <div class="input-group">
      <label>Current Password</label>
      <input type="password" id="cp-old" placeholder="Current password">
    </div>
    <div class="input-group">
      <label>New Password</label>
      <input type="password" id="cp-new" placeholder="New password">
    </div>
    <div class="input-group">
      <label>Confirm New Password</label>
      <input type="password" id="cp-new2" placeholder="Confirm new password">
    </div>
    <div id="cp-error" class="text-danger text-sm mb-8" style="display:none"></div>
    <button class="btn btn-primary btn-block" onclick="doChangePassword()">Update Password</button>
  `);
}

async function doChangePassword() {
  const oldPass = document.getElementById('cp-old').value;
  const newPass = document.getElementById('cp-new').value;
  const newPass2 = document.getElementById('cp-new2').value;
  const errEl = document.getElementById('cp-error');

  const oldHash = await hashPassword(oldPass);
  if (oldHash !== localStorage.getItem('gymlog_pass')) {
    errEl.textContent = 'Current password is incorrect';
    errEl.style.display = '';
    return;
  }
  if (newPass.length < 4) {
    errEl.textContent = 'New password must be at least 4 characters';
    errEl.style.display = '';
    return;
  }
  if (newPass !== newPass2) {
    errEl.textContent = 'New passwords do not match';
    errEl.style.display = '';
    return;
  }

  const newHash = await hashPassword(newPass);
  localStorage.setItem('gymlog_pass', newHash);
  closeModal();
  alert('Password updated!');
}

// Day color/icon map
const DAY_STYLES = {
  'Push Day 1': { color: '#e17055', icon: '🔥', label: 'PUSH 1' },
  'Push Day 2': { color: '#fdcb6e', icon: '💪', label: 'PUSH 2' },
  'Pull Day 1': { color: '#6c5ce7', icon: '🏋️', label: 'PULL 1' },
  'Pull Day 2': { color: '#a29bfe', icon: '💥', label: 'PULL 2' },
  'Leg Day 1':  { color: '#00cec9', icon: '🦵', label: 'LEGS 1' },
  'Leg Day 2':  { color: '#00b894', icon: '⚡', label: 'LEGS 2' },
};

// === DASHBOARD ===
async function renderDashboard(app) {
  const workouts = await dbGetAll('workouts');
  const completedWorkouts = workouts.filter(w => w.status === 'completed');
  const allSets = await dbGetAll('sets');
  const activeWo = workouts.find(w => w.status === 'active');
  const exercises = await dbGetAll('exercises');
  const exerciseMap = {};
  exercises.forEach(e => exerciseMap[e.id] = e);

  // Stats
  const thisWeek = getWeekWorkouts(completedWorkouts);
  const totalVolume = allSets.reduce((sum, s) => sum + (s.weight || 0) * (s.reps || 0), 0);
  const prCount = allSets.filter(s => s.isPR).length;

  let html = `<div class="container" style="padding-top:16px">`;

  // Active workout banner
  if (activeWo) {
    html += `
      <div class="card" style="border-color: var(--primary); cursor:pointer" onclick="navigate('workout')">
        <div class="flex-between">
          <div>
            <div class="text-sm text-primary" style="font-weight:600">ACTIVE WORKOUT</div>
            <h3 style="margin-top:4px">${activeWo.name}</h3>
          </div>
          <div class="btn btn-primary btn-sm">Continue</div>
        </div>
      </div>`;
  }

  // Stats row
  html += `
    <div class="stat-grid">
      <div class="stat-card">
        <div class="value">${thisWeek.length}</div>
        <div class="label">This Week</div>
      </div>
      <div class="stat-card">
        <div class="value">${completedWorkouts.length}</div>
        <div class="label">Total Workouts</div>
      </div>
      <div class="stat-card">
        <div class="value">${formatVolume(totalVolume)}</div>
        <div class="label">Total Volume</div>
      </div>
      <div class="stat-card">
        <div class="value">${prCount}</div>
        <div class="label">PRs Hit</div>
      </div>
    </div>`;

  // === WORKOUT DAYS (main feature) ===
  const templates = await dbGetAll('templates');
  html += `<h2 class="mb-12" style="font-size:1.1rem">Start Workout</h2>
    <div class="day-grid">`;

  templates.forEach(t => {
    const style = DAY_STYLES[t.name] || { color: '#6c5ce7', icon: '🏋️', label: t.name };
    html += `
      <button class="day-btn" onclick="toggleDayExpand(this, ${t.id})" style="--day-color: ${style.color}">
        <div class="day-icon">${style.icon}</div>
        <div class="day-label">${style.label}</div>
      </button>`;
  });

  html += `</div>`;

  // Expandable exercise list area
  html += `<div id="day-expand-area"></div>`;

  // Custom workout button
  if (!activeWo) {
    html += `
      <button class="btn btn-ghost btn-block mt-12" onclick="startNewWorkout()">
        ${icons.plus} Start Custom Workout
      </button>`;
  }

  // Recent workouts
  const recent = completedWorkouts.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);
  if (recent.length > 0) {
    html += `<h2 class="mt-16 mb-8">Recent</h2>`;
    for (const w of recent) {
      const sets = await dbGetByIndex('sets', 'workoutId', w.id);
      const exerciseIds = [...new Set(sets.map(s => s.exerciseId))];
      html += `
        <div class="workout-card" onclick="navigate('workout-detail', {id:${w.id}})">
          <div class="date">${formatDate(w.date)}</div>
          <div class="name">${w.name}</div>
          <div class="summary">${exerciseIds.length} exercises, ${sets.length} sets</div>
        </div>`;
    }
  }

  html += `</div>`;
  app.innerHTML = html;
}

// Toggle day expand - show exercises for a template
let expandedDayId = null;
async function toggleDayExpand(btn, templateId) {
  const area = document.getElementById('day-expand-area');

  // Deselect all buttons
  document.querySelectorAll('.day-btn').forEach(b => b.classList.remove('selected'));

  if (expandedDayId === templateId) {
    expandedDayId = null;
    area.innerHTML = '';
    return;
  }

  expandedDayId = templateId;
  btn.classList.add('selected');

  const template = await dbGet('templates', templateId);
  const exercises = await dbGetAll('exercises');
  const exerciseMap = {};
  exercises.forEach(e => exerciseMap[e.id] = e);

  const style = DAY_STYLES[template.name] || { color: '#6c5ce7' };

  let html = `<div class="day-detail" style="--day-color: ${style.color}">
    <div class="day-detail-header">
      <h3>${template.name}</h3>
      <span class="text-xs text-dim">${template.exerciseIds.length} exercises</span>
    </div>
    <div class="day-exercise-list">`;

  template.exerciseIds.forEach((id, idx) => {
    const ex = exerciseMap[id];
    if (!ex) return;
    html += `
      <div class="day-exercise-item">
        <div class="day-exercise-num">${idx + 1}</div>
        <div class="day-exercise-info">
          <div class="day-exercise-name">${ex.name}</div>
          <div class="muscle-targets" style="margin-top:2px">
            <span class="muscle-tag primary">${(ex.primary || [ex.muscleGroup]).join(', ')}</span>
            ${ex.secondary && ex.secondary.length ? `<span class="muscle-tag secondary">${ex.secondary.join(', ')}</span>` : ''}
          </div>
        </div>
      </div>`;
  });

  html += `</div>
    <button class="btn btn-primary btn-block mt-12" onclick="startFromTemplate(${templateId})" style="background: var(--day-color)">
      Start ${template.name}
    </button>
  </div>`;

  area.innerHTML = html;
}

// === ACTIVE WORKOUT ===
async function renderActiveWorkout(app) {
  if (!activeWorkout) {
    const workouts = await dbGetAll('workouts');
    activeWorkout = workouts.find(w => w.status === 'active');
  }

  if (!activeWorkout) {
    navigate('dashboard');
    return;
  }

  const sets = await dbGetByIndex('sets', 'workoutId', activeWorkout.id);
  const exercises = await dbGetAll('exercises');
  const exerciseMap = {};
  exercises.forEach(e => exerciseMap[e.id] = e);

  // Group sets by exercise
  const exerciseGroups = {};
  const exerciseOrder = [];
  sets.forEach(s => {
    if (!exerciseGroups[s.exerciseId]) {
      exerciseGroups[s.exerciseId] = [];
      exerciseOrder.push(s.exerciseId);
    }
    exerciseGroups[s.exerciseId].push(s);
  });

  let html = `<div class="container">
    <div class="workout-header">
      <div>
        <input type="text" value="${activeWorkout.name}" id="workout-name"
          onchange="updateWorkoutName(this.value)"
          style="background:none;border:none;font-size:1.2rem;font-weight:700;color:var(--text);padding:0;width:auto">
      </div>
      <div class="workout-timer" id="workout-timer">${formatTime(workoutSeconds)}</div>
    </div>`;

  // Exercise blocks
  for (const exId of exerciseOrder) {
    const ex = exerciseMap[exId];
    if (!ex) continue;
    const exSets = exerciseGroups[exId].sort((a, b) => a.setNumber - b.setNumber);

    // Get last 2 sessions
    const recentSessions = await getRecentSessionsForExercise(exId, 2, activeWorkout.id);

    html += `
      <div class="exercise-block" id="exercise-${exId}">
        <div class="exercise-block-header">
          <div>
            <h3>${ex.name}</h3>
            <div class="muscle-targets">
              <span class="muscle-tag primary">${(ex.primary || [ex.muscleGroup]).join(', ')}</span>
              ${ex.secondary && ex.secondary.length ? `<span class="muscle-tag secondary">${ex.secondary.join(', ')}</span>` : ''}
            </div>
          </div>
          <button class="btn-icon" onclick="removeExerciseFromWorkout(${exId})" title="Remove">${icons.x}</button>
        </div>
        <div class="exercise-block-body">`;

    // Show last 2 sessions
    if (recentSessions.length > 0) {
      html += `<div class="prev-sessions">`;
      recentSessions.forEach((session, i) => {
        const label = i === 0 ? 'Last' : 'Prev';
        const setsStr = session.sets
          .sort((a, b) => a.setNumber - b.setNumber)
          .map(s => {
            if (ex.type === 'cardio') return `${s.weight || 0}min${s.reps ? ', ' + s.reps + 'km' : ''}`;
            return `${s.weight || 0}x${s.reps || 0}`;
          })
          .join(', ');
        html += `<div class="last-time"><strong>${label} (${formatDateShort(session.date)}):</strong> ${setsStr}</div>`;
      });
      html += `</div>`;
    }

    // Set labels - different for cardio vs weight vs timed
    const isCardio = ex.type === 'cardio';
    const isTimed = ex.type === 'timed';
    html += `
      <div class="set-labels">
        <span>SET</span>
        <span>${isCardio ? 'MIN' : isTimed ? 'SEC' : 'KG'}</span>
        <span>${isCardio ? 'DIST' : isTimed ? '' : 'REPS'}</span>
        ${isCardio ? '<span>SPEED</span>' : '<span>RPE</span>'}
        <span></span>
        <span></span>
      </div>`;

    // Set rows
    exSets.forEach(s => {
      const rpeClass = s.rpe ? 'filled' : '';
      if (isCardio) {
        html += `
          <div class="set-row" data-set-id="${s.id}">
            <div class="set-num">${s.setNumber}</div>
            <input type="number" inputmode="decimal" placeholder="0"
              value="${s.weight || ''}" onchange="updateSet(${s.id}, 'weight', this.value)" step="any"
              title="Duration in minutes">
            <input type="number" inputmode="decimal" placeholder="0"
              value="${s.reps || ''}" onchange="updateSet(${s.id}, 'reps', this.value)" step="any"
              title="Distance in km">
            <input type="number" inputmode="decimal" placeholder="0"
              value="${s.rpe || ''}" onchange="updateSet(${s.id}, 'rpe', this.value)" step="any"
              style="max-width:50px" title="Speed/Incline">
            <button class="check-btn ${s.completed ? 'done' : ''}" onclick="completeSet(${s.id}, ${exId})">
              ${icons.check}
            </button>
            <button class="delete-set" onclick="deleteSet(${s.id})">${icons.x}</button>
          </div>`;
      } else {
        html += `
          <div class="set-row" data-set-id="${s.id}">
            <div class="set-num">${s.setNumber}</div>
            <input type="number" inputmode="decimal" placeholder="0"
              value="${s.weight || ''}" onchange="updateSet(${s.id}, 'weight', this.value)" step="any">
            ${!isTimed ? `<input type="number" inputmode="numeric" placeholder="0"
              value="${s.reps || ''}" onchange="updateSet(${s.id}, 'reps', this.value)">` : ''}
            <div class="rpe-badge ${rpeClass}" onclick="showRPEPicker(${s.id})">${s.rpe || '-'}</div>
            <button class="check-btn ${s.completed ? 'done' : ''}" onclick="completeSet(${s.id}, ${exId})">
              ${icons.check}
            </button>
            <button class="delete-set" onclick="deleteSet(${s.id})">${icons.x}</button>
          </div>`;
      }
    });

    html += `
          <button class="btn btn-ghost btn-sm btn-block mt-8" onclick="addSet(${exId})">
            ${icons.plus} Add Set
          </button>
          <button class="btn btn-ghost btn-sm btn-block mt-8" onclick="showExerciseNotes(${exId})"
            style="border:none;color:var(--text-dim)">
            ${icons.notes} Notes
          </button>
        </div>
      </div>`;
  }

  // Action buttons
  html += `
    <button class="btn btn-ghost btn-block mt-12" onclick="showAddExerciseModal()">
      ${icons.plus} Add Exercise
    </button>
    <div class="flex gap-8 mt-12 mb-16">
      <button class="btn btn-success btn-block" onclick="finishWorkout()">
        ${icons.check} Finish Workout
      </button>
      <button class="btn btn-danger btn-sm" onclick="cancelWorkout()" style="flex-shrink:0">
        ${icons.trash}
      </button>
    </div>
  </div>`;

  app.innerHTML = html;
  startWorkoutTimer();
}

// === HISTORY ===
async function renderHistory(app) {
  const workouts = (await dbGetAll('workouts'))
    .filter(w => w.status === 'completed')
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  let html = `<div class="container" style="padding-top:16px">
    <h1 class="mb-12">History</h1>`;

  if (!workouts.length) {
    html += `
      <div class="empty-state">
        ${icons.clock}
        <h3>No workouts yet</h3>
        <p>Complete your first workout to see it here</p>
      </div>`;
  } else {
    for (const w of workouts) {
      const sets = await dbGetByIndex('sets', 'workoutId', w.id);
      const exerciseIds = [...new Set(sets.map(s => s.exerciseId))];
      const totalVol = sets.reduce((sum, s) => sum + (s.weight || 0) * (s.reps || 0), 0);
      const prs = sets.filter(s => s.isPR).length;

      html += `
        <div class="workout-card" onclick="navigate('workout-detail', {id:${w.id}})">
          <div class="flex-between">
            <div class="date">${formatDate(w.date)}</div>
            ${prs > 0 ? `<span class="pr-badge">${icons.trophy} ${prs} PR${prs > 1 ? 's' : ''}</span>` : ''}
          </div>
          <div class="name">${w.name}</div>
          <div class="summary">${exerciseIds.length} exercises, ${sets.length} sets${totalVol > 0 ? ` | ${formatVolume(totalVol)} vol` : ''}</div>
          ${w.duration ? `<div class="summary">${formatTime(w.duration)}</div>` : ''}
        </div>`;
    }
  }

  html += `</div>`;
  app.innerHTML = html;
}

// === WORKOUT DETAIL (editable) ===
async function renderWorkoutDetail(app, params) {
  const workout = await dbGet('workouts', params.id);
  if (!workout) { navigate('history'); return; }

  const sets = await dbGetByIndex('sets', 'workoutId', workout.id);
  const exercises = await dbGetAll('exercises');
  const exerciseMap = {};
  exercises.forEach(e => exerciseMap[e.id] = e);

  const exerciseGroups = {};
  const exerciseOrder = [];
  sets.forEach(s => {
    if (!exerciseGroups[s.exerciseId]) {
      exerciseGroups[s.exerciseId] = [];
      exerciseOrder.push(s.exerciseId);
    }
    exerciseGroups[s.exerciseId].push(s);
  });

  // Store the workout id so edit helpers know which detail we're viewing
  _detailWorkoutId = workout.id;

  let html = `<div class="container" style="padding-top:16px">
    <div class="flex-between mb-12">
      <button class="btn btn-ghost btn-sm" onclick="navigate('history')">${icons.arrowLeft} Back</button>
      <div class="flex gap-8">
        <button class="btn btn-ghost btn-sm" onclick="saveAsTemplate(${workout.id})">${icons.save}</button>
        <button class="btn btn-ghost btn-sm" onclick="deleteWorkout(${workout.id})">${icons.trash}</button>
      </div>
    </div>
    <input type="text" value="${workout.name}" id="detail-workout-name"
      onchange="updateDetailWorkoutName(${workout.id}, this.value)"
      style="background:none;border:none;font-size:1.4rem;font-weight:700;color:var(--text);padding:0;width:100%;margin-bottom:4px">
    <div class="text-dim text-sm mb-16">${formatDate(workout.date)}${workout.duration ? ` | ${formatTime(workout.duration)}` : ''}</div>`;

  for (const exId of exerciseOrder) {
    const ex = exerciseMap[exId];
    if (!ex) continue;
    const exSets = exerciseGroups[exId].sort((a, b) => a.setNumber - b.setNumber);

    html += `
      <div class="exercise-block">
        <div class="exercise-block-header">
          <div onclick="navigate('stats', {exerciseId: ${exId}})" style="cursor:pointer;flex:1">
            <h3>${ex.name}</h3>
            <div class="muscle-targets">
              <span class="muscle-tag primary">${(ex.primary || [ex.muscleGroup]).join(', ')}</span>
              ${ex.secondary && ex.secondary.length ? `<span class="muscle-tag secondary">${ex.secondary.join(', ')}</span>` : ''}
            </div>
          </div>
          <button class="btn-icon" onclick="removeExerciseFromDetail(${workout.id}, ${exId})" title="Remove">${icons.x}</button>
        </div>
        <div class="exercise-block-body">`;

    const dIsCardio = ex.type === 'cardio';
    const dIsTimed = ex.type === 'timed';
    html += `
          <div class="set-labels">
            <span>SET</span>
            <span>${dIsCardio ? 'MIN' : dIsTimed ? 'SEC' : 'KG'}</span>
            <span>${dIsCardio ? 'DIST' : dIsTimed ? '' : 'REPS'}</span>
            ${dIsCardio ? '<span>SPEED</span>' : '<span>RPE</span>'}
            <span></span>
            <span></span>
          </div>`;

    exSets.forEach(s => {
      const rpeClass = s.rpe ? 'filled' : '';
      if (dIsCardio) {
        html += `
          <div class="set-row">
            <div class="set-num">${s.setNumber}</div>
            <input type="number" inputmode="decimal" placeholder="0"
              value="${s.weight || ''}" onchange="updateSet(${s.id}, 'weight', this.value)" step="any"
              title="Duration in minutes">
            <input type="number" inputmode="decimal" placeholder="0"
              value="${s.reps || ''}" onchange="updateSet(${s.id}, 'reps', this.value)" step="any"
              title="Distance in km">
            <input type="number" inputmode="decimal" placeholder="0"
              value="${s.rpe || ''}" onchange="updateSet(${s.id}, 'rpe', this.value)" step="any"
              style="max-width:50px" title="Speed/Incline">
            <div style="width:32px"></div>
            <button class="delete-set" onclick="deleteSetDetail(${s.id}, ${workout.id})">${icons.x}</button>
          </div>`;
      } else {
        html += `
          <div class="set-row">
            <div class="set-num">${s.setNumber}</div>
            <input type="number" inputmode="decimal" placeholder="0"
              value="${s.weight || ''}" onchange="updateSet(${s.id}, 'weight', this.value)" step="any">
            ${!dIsTimed ? `<input type="number" inputmode="numeric" placeholder="0"
              value="${s.reps || ''}" onchange="updateSet(${s.id}, 'reps', this.value)">` : ''}
            <div class="rpe-badge ${rpeClass}" onclick="showRPEPickerDetail(${s.id}, ${workout.id})">${s.rpe || '-'}</div>
            <div style="width:32px;text-align:center">${s.isPR ? '<span class="pr-badge">PR</span>' : ''}</div>
            <button class="delete-set" onclick="deleteSetDetail(${s.id}, ${workout.id})">${icons.x}</button>
          </div>`;
      }
    });

    if (exSets[0]?.notes) {
      html += `<div class="text-xs text-dim" style="padding:4px 0">${exSets[0].notes}</div>`;
    }

    html += `
          <button class="btn btn-ghost btn-sm btn-block mt-8" onclick="addSetDetail(${exId}, ${workout.id})">
            ${icons.plus} Add Set
          </button>
          <button class="btn btn-ghost btn-sm btn-block mt-8" onclick="showDetailExerciseNotes(${exId}, ${workout.id})"
            style="border:none;color:var(--text-dim)">
            ${icons.notes} Notes
          </button>
        </div>
      </div>`;
  }

  // Add exercise + save as template
  html += `
    <button class="btn btn-ghost btn-block mt-12" onclick="showAddExerciseModalDetail(${workout.id})">
      ${icons.plus} Add Exercise
    </button>
    <button class="btn btn-ghost btn-block mt-8 mb-16" onclick="saveAsTemplate(${workout.id})" style="border:none;color:var(--text-dim)">
      ${icons.save} Save as Template
    </button>
  </div>`;

  app.innerHTML = html;
}

// === EXERCISES LIBRARY ===
async function renderExercises(app) {
  const exercises = await dbGetAll('exercises');
  let selectedGroup = 'All';
  const loggedIn = isAuthenticated;

  let html = `<div class="container" style="padding-top:16px">
    <div class="flex-between mb-12">
      <h1>Exercises</h1>
      ${loggedIn ? `<button class="btn btn-primary btn-sm" onclick="showCreateExerciseModal()">${icons.plus} New</button>` : ''}
    </div>
    ${!loggedIn ? '<div class="text-sm text-dim mb-12">Log in to view your progress and workout data</div>' : ''}
    <div class="search-input">
      ${icons.search}
      <input type="text" placeholder="Search exercises..." id="exercise-search" oninput="filterExerciseList()">
    </div>
    <div class="filter-chips" id="muscle-filter">
      ${MUSCLE_GROUPS.map(g => `<button class="chip ${g === 'All' ? 'active' : ''}" onclick="filterByMuscle('${g}')">${g}</button>`).join('')}
    </div>
    <div id="exercise-list">`;

  exercises.sort((a, b) => a.name.localeCompare(b.name)).forEach(ex => {
    const primaryStr = (ex.primary || [ex.muscleGroup]).join(', ');
    const secondaryStr = ex.secondary && ex.secondary.length ? ex.secondary.join(', ') : '';
    const altStr = ex.alternates && ex.alternates.length ? ex.alternates.join(', ') : '';
    html += `
      <div class="exercise-list-item" data-name="${ex.name.toLowerCase()}" data-group="${ex.muscleGroup}">
        <div style="flex:1" ${loggedIn ? `onclick="navigate('stats', {exerciseId: ${ex.id}})"` : ''}>
          <div class="name">${ex.name}</div>
          <div class="muscle-targets" style="margin-top:2px">
            <span class="muscle-tag primary">${primaryStr}</span>
            ${secondaryStr ? `<span class="muscle-tag secondary">${secondaryStr}</span>` : ''}
          </div>
          ${altStr ? `<div class="meta" style="margin-top:3px">Alt: ${altStr}</div>` : ''}
        </div>
        ${loggedIn ? `<div class="flex gap-8" style="align-items:center">
          <span class="text-dim" onclick="navigate('stats', {exerciseId: ${ex.id}})">${icons.chart}</span>
          <button class="delete-set" onclick="deleteExercise(${ex.id})" title="Delete">${icons.trash}</button>
        </div>` : ''}
      </div>`;
  });

  html += `</div></div>`;
  app.innerHTML = html;
}

// === STATS / PROGRESS ===
async function renderStats(app, params) {
  const exercises = await dbGetAll('exercises');

  if (!params.exerciseId) {
    // Show exercise picker
    let html = `<div class="container" style="padding-top:16px">
      <h1 class="mb-12">Progress</h1>
      <div class="search-input">
        ${icons.search}
        <input type="text" placeholder="Search exercises..." id="stats-search" oninput="filterStatsList()">
      </div>
      <div id="stats-exercise-list">`;

    for (const ex of exercises.sort((a, b) => a.name.localeCompare(b.name))) {
      const history = await getExerciseHistory(ex.id);
      if (history.length === 0) continue;
      const pr = await getExercisePR(ex.id);
      html += `
        <div class="exercise-list-item" data-name="${ex.name.toLowerCase()}" onclick="navigate('stats', {exerciseId: ${ex.id}})">
          <div>
            <div class="name">${ex.name}</div>
            <div class="meta">${ex.muscleGroup} | ${history.length} sets logged</div>
          </div>
          <div style="text-align:right">
            ${pr ? `<div class="text-sm" style="font-weight:600">${pr.heaviestWeight.weight}kg x ${pr.heaviestWeight.reps}</div>
            <div class="text-xs text-dim">Heaviest</div>` : ''}
          </div>
        </div>`;
    }

    html += `</div></div>`;
    app.innerHTML = html;
    return;
  }

  // Specific exercise stats
  const ex = await dbGet('exercises', params.exerciseId);
  if (!ex) { navigate('stats'); return; }

  const history = await getExerciseHistory(params.exerciseId);
  const pr = await getExercisePR(params.exerciseId);

  // Group by workout date
  const byDate = {};
  history.forEach(s => {
    const date = s.workout.date;
    if (!byDate[date]) byDate[date] = [];
    byDate[date].push(s);
  });
  const dates = Object.keys(byDate).sort();

  let html = `<div class="container" style="padding-top:16px">
    <button class="btn btn-ghost btn-sm mb-12" onclick="navigate('stats')">${icons.arrowLeft} Back</button>
    <h1>${ex.name}</h1>
    <div class="muscle-targets mb-8">
      <span class="muscle-tag primary">${(ex.primary || [ex.muscleGroup]).join(', ')}</span>
      ${ex.secondary && ex.secondary.length ? `<span class="muscle-tag secondary">${ex.secondary.join(', ')}</span>` : ''}
    </div>
    ${ex.alternates && ex.alternates.length ? `<div class="text-xs text-dim mb-16">Alternates: ${ex.alternates.join(', ')}</div>` : '<div class="mb-16"></div>'}`;

  // PR card
  if (pr) {
    const bv = pr.bestVolume;
    const hw = pr.heaviestWeight;
    html += `
      <div class="card" style="border-color: var(--warning)">
        <div class="flex-between" style="align-items:flex-start">
          <div style="flex:1">
            <div class="text-xs text-warning" style="font-weight:600">PERSONAL RECORD</div>
            <div class="pr-stats">
              <div class="pr-stat">
                <div class="pr-stat-label">Heaviest</div>
                <div class="pr-stat-value">${hw.weight}kg <span class="pr-stat-reps">x ${hw.reps}</span></div>
              </div>
              <div class="pr-stat">
                <div class="pr-stat-label">Best Volume</div>
                <div class="pr-stat-value">${bv.weight}kg <span class="pr-stat-reps">x ${bv.reps}</span></div>
                <div class="pr-stat-sub">${(bv.weight * bv.reps).toLocaleString()}kg total</div>
              </div>
            </div>
          </div>
          <div style="font-size:2rem">${icons.trophy}</div>
        </div>
      </div>`;
  }

  // Chart data (max weight per session)
  if (dates.length >= 2) {
    const chartData = dates.map(d => {
      const maxWeight = Math.max(...byDate[d].map(s => s.weight || 0));
      const maxVol = Math.max(...byDate[d].map(s => (s.weight || 0) * (s.reps || 0)));
      return { date: d, maxWeight, maxVol };
    });

    html += `
      <div class="chart-container">
        <h3 class="mb-8">Weight Progress</h3>
        <canvas id="progress-chart"></canvas>
      </div>
      <div class="chart-container">
        <h3 class="mb-8">Volume Progress</h3>
        <canvas id="volume-chart"></canvas>
      </div>`;
  }

  // History table
  html += `<h2 class="mt-16 mb-8">History</h2>`;
  for (const date of dates.reverse()) {
    const daySets = byDate[date].sort((a, b) => a.setNumber - b.setNumber);
    html += `
      <div class="card">
        <div class="text-xs text-dim mb-8">${formatDate(date)}</div>
        ${daySets.map(s => `
          <div class="flex-between" style="padding:2px 0">
            <span class="text-sm">Set ${s.setNumber}: ${s.weight}kg x ${s.reps}${s.rpe ? ` @${s.rpe}` : ''}</span>
            ${s.isPR ? '<span class="pr-badge">PR</span>' : ''}
          </div>
        `).join('')}
      </div>`;
  }

  html += `</div>`;
  app.innerHTML = html;

  // Draw charts
  if (dates.length >= 2) {
    const chartDates = Object.keys(byDate).sort();
    const chartData = chartDates.map(d => ({
      date: d,
      maxWeight: Math.max(...byDate[d].map(s => s.weight || 0)),
      maxVol: Math.max(...byDate[d].map(s => (s.weight || 0) * (s.reps || 0)))
    }));
    drawChart('progress-chart', chartData.map(d => formatDateShort(d.date)), chartData.map(d => d.maxWeight), 'kg', '#6c5ce7');
    drawChart('volume-chart', chartData.map(d => formatDateShort(d.date)), chartData.map(d => d.maxVol), 'vol', '#00cec9');
  }
}

// === TEMPLATES ===
async function renderTemplates(app) {
  const templates = await dbGetAll('templates');
  const exercises = await dbGetAll('exercises');
  const exerciseMap = {};
  exercises.forEach(e => exerciseMap[e.id] = e);

  let html = `<div class="container" style="padding-top:16px">
    <div class="flex-between mb-12">
      <h1>Templates</h1>
    </div>`;

  if (!templates.length) {
    html += `
      <div class="empty-state">
        ${icons.copy}
        <h3>No templates yet</h3>
        <p>Finish a workout and save it as a template for quick access</p>
      </div>`;
  } else {
    templates.forEach(t => {
      const exNames = t.exerciseIds.map(id => exerciseMap[id]?.name).filter(Boolean);
      html += `
        <div class="template-card">
          <div class="flex-between">
            <div>
              <strong>${t.name}</strong>
              <div class="exercises-preview">${exNames.join(', ')}</div>
            </div>
            <div class="flex gap-8">
              <button class="btn btn-primary btn-sm" onclick="startFromTemplate(${t.id})">${icons.play}</button>
              <button class="btn-icon" onclick="deleteTemplate(${t.id})" style="width:32px;height:32px">${icons.trash}</button>
            </div>
          </div>
        </div>`;
    });
  }

  html += `</div>`;
  app.innerHTML = html;
}

// === SETTINGS ===
async function renderSettings(app) {
  let html = `<div class="container" style="padding-top:16px">
    <h1 class="mb-16">Settings</h1>
    <div class="card">
      <h3 class="mb-12">Rest Timer Default</h3>
      <div class="flex gap-8">
        ${[60, 90, 120, 180].map(s =>
          `<button class="chip ${getRestDefault() === s ? 'active' : ''}" onclick="setRestDefault(${s})">${s}s</button>`
        ).join('')}
      </div>
    </div>
    <div class="card">
      <h3 class="mb-12">Data</h3>
      <div class="settings-row">
        <span>Export Data (JSON)</span>
        <button class="btn btn-ghost btn-sm" onclick="doExport()">Export</button>
      </div>
      <div class="settings-row">
        <span>Import Data</span>
        <button class="btn btn-ghost btn-sm" onclick="document.getElementById('import-file').click()">Import</button>
        <input type="file" id="import-file" accept=".json" class="hidden" onchange="doImport(event)">
      </div>
      <div class="settings-row" style="border-bottom:none">
        <span class="text-danger">Clear All Data</span>
        <button class="btn btn-danger btn-sm" onclick="clearAllData()">Clear</button>
      </div>
    </div>
    <div class="card">
      <h3 class="mb-12">Account</h3>
      <div class="settings-row">
        <div>
          <span>Logged in as </span>
          <strong>${localStorage.getItem('gymlog_user') || 'User'}</strong>
        </div>
        <button class="btn btn-ghost btn-sm" onclick="doLogout()">Logout</button>
      </div>
      <div class="settings-row" style="border-bottom:none">
        <span>Change Password</span>
        <button class="btn btn-ghost btn-sm" onclick="showChangePasswordModal()">Change</button>
      </div>
    </div>
    <div class="card">
      <h3 class="mb-12">Body Weight</h3>
      <div class="input-row">
        <div class="input-group">
          <label>Weight (kg)</label>
          <input type="number" id="bw-input" inputmode="decimal" placeholder="70" step="0.1">
        </div>
        <button class="btn btn-primary" onclick="logBodyWeight()">Log</button>
      </div>
      <div id="bw-history" class="mt-12"></div>
    </div>
  </div>`;

  app.innerHTML = html;

  // Load body weight history
  const bwLogs = (await dbGetAll('bodyweight')).sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 10);
  const bwHtml = bwLogs.map(bw =>
    `<div class="flex-between" style="padding:4px 0"><span class="text-sm">${formatDate(bw.date)}</span><span class="text-sm" style="font-weight:600">${bw.weight}kg</span></div>`
  ).join('');
  document.getElementById('bw-history').innerHTML = bwHtml;
}

// === ACTIONS ===

async function startNewWorkout() {
  if (activeWorkout) {
    if (!confirm('You have an active workout. Finish it first or discard?')) return;
    await cancelWorkout();
  }
  const workout = {
    name: getDefaultWorkoutName(),
    date: new Date().toISOString().split('T')[0],
    startTime: Date.now(),
    status: 'active',
    notes: ''
  };
  const id = await dbAdd('workouts', workout);
  workout.id = id;
  activeWorkout = workout;
  workoutSeconds = 0;
  navigate('workout');
}

async function startFromTemplate(templateId) {
  if (activeWorkout) {
    if (!confirm('You have an active workout. Finish it first or discard?')) return;
    await cancelWorkout();
  }
  const template = await dbGet('templates', templateId);
  if (!template) return;

  const workout = {
    name: template.name,
    date: new Date().toISOString().split('T')[0],
    startTime: Date.now(),
    status: 'active',
    notes: ''
  };
  const id = await dbAdd('workouts', workout);
  workout.id = id;
  activeWorkout = workout;

  // Add sets for each exercise (1 set for cardio, 3 for others)
  for (const exId of template.exerciseIds) {
    const ex = await dbGet('exercises', exId);
    const setCount = (ex && ex.type === 'cardio') ? 1 : 3;
    for (let i = 1; i <= setCount; i++) {
      await dbAdd('sets', {
        workoutId: id,
        exerciseId: exId,
        setNumber: i,
        weight: null,
        reps: null,
        rpe: null,
        completed: false,
        isPR: false,
        notes: ''
      });
    }
  }

  workoutSeconds = 0;
  navigate('workout');
}

async function addExerciseToWorkout(exerciseId) {
  if (!activeWorkout) return;
  const existingSets = await dbGetByIndex('sets', 'workoutExercise', [activeWorkout.id, exerciseId]);
  const startSet = existingSets.length + 1;

  for (let i = 0; i < 3; i++) {
    await dbAdd('sets', {
      workoutId: activeWorkout.id,
      exerciseId: exerciseId,
      setNumber: startSet + i,
      weight: null,
      reps: null,
      rpe: null,
      completed: false,
      isPR: false,
      notes: ''
    });
  }

  closeModal();
  navigate('workout');
}

async function addSet(exerciseId) {
  if (!activeWorkout) return;
  const existingSets = await dbGetByIndex('sets', 'workoutExercise', [activeWorkout.id, exerciseId]);
  await dbAdd('sets', {
    workoutId: activeWorkout.id,
    exerciseId: exerciseId,
    setNumber: existingSets.length + 1,
    weight: null,
    reps: null,
    rpe: null,
    completed: false,
    isPR: false,
    notes: ''
  });
  navigate('workout');
}

async function updateSet(setId, field, value) {
  const set = await dbGet('sets', setId);
  if (!set) return;
  set[field] = field === 'weight' || field === 'reps' ? parseFloat(value) || null : value;
  await dbPut('sets', set);
}

async function completeSet(setId, exerciseId) {
  const set = await dbGet('sets', setId);
  if (!set) return;

  set.completed = !set.completed;

  if (set.completed && set.weight && set.reps) {
    set.isPR = await checkPR(exerciseId, set.weight, set.reps);
  }

  await dbPut('sets', set);

  // Start rest timer on completion
  if (set.completed) {
    startRestTimer(getRestDefault());
  }

  navigate('workout');
}

async function deleteSet(setId) {
  await dbDelete('sets', setId);
  navigate('workout');
}

async function removeExerciseFromWorkout(exerciseId) {
  if (!activeWorkout) return;
  const sets = await dbGetByIndex('sets', 'workoutExercise', [activeWorkout.id, exerciseId]);
  for (const s of sets) {
    await dbDelete('sets', s.id);
  }
  navigate('workout');
}

async function finishWorkout() {
  if (!activeWorkout) return;
  const finishedId = activeWorkout.id;
  activeWorkout.status = 'completed';
  activeWorkout.duration = workoutSeconds;
  activeWorkout.endTime = Date.now();
  await dbPut('workouts', activeWorkout);
  stopWorkoutTimer();
  stopRestTimer();
  activeWorkout = null;
  // Go to editable detail view so user can review/edit
  navigate('workout-detail', { id: finishedId });
}

async function cancelWorkout() {
  if (!activeWorkout) return;
  if (!confirm('Discard this workout?')) return;
  const sets = await dbGetByIndex('sets', 'workoutId', activeWorkout.id);
  for (const s of sets) await dbDelete('sets', s.id);
  await dbDelete('workouts', activeWorkout.id);
  stopWorkoutTimer();
  stopRestTimer();
  activeWorkout = null;
  navigate('dashboard');
}

async function updateWorkoutName(name) {
  if (!activeWorkout) return;
  activeWorkout.name = name;
  await dbPut('workouts', activeWorkout);
}

async function deleteWorkout(id) {
  if (!confirm('Delete this workout?')) return;
  const sets = await dbGetByIndex('sets', 'workoutId', id);
  for (const s of sets) await dbDelete('sets', s.id);
  await dbDelete('workouts', id);
  navigate('history');
}

async function saveAsTemplate(workoutId) {
  const sets = await dbGetByIndex('sets', 'workoutId', workoutId);
  const workout = await dbGet('workouts', workoutId);
  const exerciseIds = [...new Set(sets.map(s => s.exerciseId))];

  const name = prompt('Template name:', workout.name);
  if (!name) return;

  await dbAdd('templates', { name, exerciseIds });
  alert('Template saved!');
}

async function deleteTemplate(id) {
  if (!confirm('Delete this template?')) return;
  await dbDelete('templates', id);
  navigate('templates');
}

async function deleteExercise(id) {
  if (!confirm('Delete this exercise? All history for it will also be removed.')) return;
  const sets = await dbGetByIndex('sets', 'exerciseId', id);
  for (const s of sets) await dbDelete('sets', s.id);
  await dbDelete('exercises', id);
  navigate('exercises');
}

// === Workout Detail Edit Helpers ===
let _detailWorkoutId = null;

async function updateDetailWorkoutName(workoutId, name) {
  const w = await dbGet('workouts', workoutId);
  if (!w) return;
  w.name = name;
  await dbPut('workouts', w);
}

async function addSetDetail(exerciseId, workoutId) {
  const existingSets = await dbGetByIndex('sets', 'workoutExercise', [workoutId, exerciseId]);
  await dbAdd('sets', {
    workoutId: workoutId,
    exerciseId: exerciseId,
    setNumber: existingSets.length + 1,
    weight: null,
    reps: null,
    rpe: null,
    completed: true,
    isPR: false,
    notes: ''
  });
  navigate('workout-detail', { id: workoutId });
}

async function deleteSetDetail(setId, workoutId) {
  await dbDelete('sets', setId);
  navigate('workout-detail', { id: workoutId });
}

async function removeExerciseFromDetail(workoutId, exerciseId) {
  const sets = await dbGetByIndex('sets', 'workoutExercise', [workoutId, exerciseId]);
  for (const s of sets) await dbDelete('sets', s.id);
  navigate('workout-detail', { id: workoutId });
}

function showRPEPickerDetail(setId, workoutId) {
  showModal(`
    <div class="modal-header">
      <h2>Rate of Perceived Exertion</h2>
      <button class="modal-close" onclick="closeModal()">${icons.x}</button>
    </div>
    <div class="text-sm text-dim mb-12">How hard was that set?</div>
    <div class="rpe-picker">
      ${[6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10].map(v => `
        <button class="rpe-option" onclick="setRPEDetail(${setId}, ${v}, ${workoutId})">${v}</button>
      `).join('')}
    </div>
    <div class="mt-12 text-xs text-dim">
      <div><strong>6</strong> - Could do 4+ more reps</div>
      <div><strong>7</strong> - Could do 3 more reps</div>
      <div><strong>8</strong> - Could do 2 more reps</div>
      <div><strong>9</strong> - Could do 1 more rep</div>
      <div><strong>10</strong> - Max effort</div>
    </div>
  `);
}

async function setRPEDetail(setId, value, workoutId) {
  const set = await dbGet('sets', setId);
  if (!set) return;
  set.rpe = value;
  await dbPut('sets', set);
  closeModal();
  navigate('workout-detail', { id: workoutId });
}

function showDetailExerciseNotes(exerciseId, workoutId) {
  showModal(`
    <div class="modal-header">
      <h2>Notes</h2>
      <button class="modal-close" onclick="closeModal()">${icons.x}</button>
    </div>
    <textarea id="detail-exercise-notes" rows="4" placeholder="Form cues, how it felt, etc."></textarea>
    <button class="btn btn-primary btn-block mt-12" onclick="saveDetailExerciseNotes(${exerciseId}, ${workoutId})">Save Notes</button>
  `);
  dbGetByIndex('sets', 'workoutExercise', [workoutId, exerciseId]).then(sets => {
    if (sets.length > 0 && sets[0].notes) {
      document.getElementById('detail-exercise-notes').value = sets[0].notes;
    }
  });
}

async function saveDetailExerciseNotes(exerciseId, workoutId) {
  const notes = document.getElementById('detail-exercise-notes').value;
  const sets = await dbGetByIndex('sets', 'workoutExercise', [workoutId, exerciseId]);
  for (const s of sets) {
    s.notes = notes;
    await dbPut('sets', s);
  }
  closeModal();
  navigate('workout-detail', { id: workoutId });
}

async function showAddExerciseModalDetail(workoutId) {
  const exercises = await dbGetAll('exercises');
  let listHtml = '';
  exercises.sort((a, b) => a.name.localeCompare(b.name)).forEach(ex => {
    const primaryStr = (ex.primary || [ex.muscleGroup]).join(', ');
    listHtml += `
      <div class="exercise-list-item" data-name="${ex.name.toLowerCase()}" data-group="${ex.muscleGroup}" onclick="addExerciseToDetail(${ex.id}, ${workoutId})">
        <div>
          <div class="name">${ex.name}</div>
          <div class="muscle-targets" style="margin-top:2px">
            <span class="muscle-tag primary">${primaryStr}</span>
          </div>
        </div>
      </div>`;
  });

  showModal(`
    <div class="modal-header">
      <h2>Add Exercise</h2>
      <button class="modal-close" onclick="closeModal()">${icons.x}</button>
    </div>
    <div class="search-input">
      ${icons.search}
      <input type="text" placeholder="Search..." id="modal-search" oninput="filterModalExercises()">
    </div>
    <div class="filter-chips">
      ${MUSCLE_GROUPS.map(g => `<button class="chip ${g === 'All' ? 'active' : ''}" onclick="filterModalByMuscle('${g}', this)">${g}</button>`).join('')}
    </div>
    <div id="modal-exercise-list">${listHtml}</div>
  `);
}

async function addExerciseToDetail(exerciseId, workoutId) {
  const existingSets = await dbGetByIndex('sets', 'workoutExercise', [workoutId, exerciseId]);
  const startSet = existingSets.length + 1;
  for (let i = 0; i < 3; i++) {
    await dbAdd('sets', {
      workoutId: workoutId,
      exerciseId: exerciseId,
      setNumber: startSet + i,
      weight: null,
      reps: null,
      rpe: null,
      completed: true,
      isPR: false,
      notes: ''
    });
  }
  closeModal();
  navigate('workout-detail', { id: workoutId });
}

// === Exercise Notes ===
function showExerciseNotes(exerciseId) {
  showModal(`
    <div class="modal-header">
      <h2>Notes</h2>
      <button class="modal-close" onclick="closeModal()">${icons.x}</button>
    </div>
    <textarea id="exercise-notes" rows="4" placeholder="Form cues, how it felt, etc."></textarea>
    <button class="btn btn-primary btn-block mt-12" onclick="saveExerciseNotes(${exerciseId})">Save Notes</button>
  `);

  // Load existing notes
  dbGetByIndex('sets', 'workoutExercise', [activeWorkout.id, exerciseId]).then(sets => {
    if (sets.length > 0 && sets[0].notes) {
      document.getElementById('exercise-notes').value = sets[0].notes;
    }
  });
}

async function saveExerciseNotes(exerciseId) {
  const notes = document.getElementById('exercise-notes').value;
  const sets = await dbGetByIndex('sets', 'workoutExercise', [activeWorkout.id, exerciseId]);
  for (const s of sets) {
    s.notes = notes;
    await dbPut('sets', s);
  }
  closeModal();
}

// === RPE Picker ===
function showRPEPicker(setId) {
  showModal(`
    <div class="modal-header">
      <h2>Rate of Perceived Exertion</h2>
      <button class="modal-close" onclick="closeModal()">${icons.x}</button>
    </div>
    <div class="text-sm text-dim mb-12">How hard was that set?</div>
    <div class="rpe-picker">
      ${[6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10].map(v => `
        <button class="rpe-option" onclick="setRPE(${setId}, ${v})">${v}</button>
      `).join('')}
    </div>
    <div class="mt-12 text-xs text-dim">
      <div><strong>6</strong> - Could do 4+ more reps</div>
      <div><strong>7</strong> - Could do 3 more reps</div>
      <div><strong>8</strong> - Could do 2 more reps</div>
      <div><strong>9</strong> - Could do 1 more rep</div>
      <div><strong>10</strong> - Max effort</div>
    </div>
  `);
}

async function setRPE(setId, value) {
  const set = await dbGet('sets', setId);
  if (!set) return;
  set.rpe = value;
  await dbPut('sets', set);
  closeModal();
  navigate('workout');
}

// === Add Exercise Modal ===
async function showAddExerciseModal() {
  const exercises = await dbGetAll('exercises');

  let listHtml = '';
  exercises.sort((a, b) => a.name.localeCompare(b.name)).forEach(ex => {
    const primaryStr = (ex.primary || [ex.muscleGroup]).join(', ');
    listHtml += `
      <div class="exercise-list-item" data-name="${ex.name.toLowerCase()}" data-group="${ex.muscleGroup}" onclick="addExerciseToWorkout(${ex.id})">
        <div>
          <div class="name">${ex.name}</div>
          <div class="muscle-targets" style="margin-top:2px">
            <span class="muscle-tag primary">${primaryStr}</span>
          </div>
        </div>
      </div>`;
  });

  showModal(`
    <div class="modal-header">
      <h2>Add Exercise</h2>
      <button class="modal-close" onclick="closeModal()">${icons.x}</button>
    </div>
    <div class="search-input">
      ${icons.search}
      <input type="text" placeholder="Search..." id="modal-search" oninput="filterModalExercises()">
    </div>
    <div class="filter-chips">
      ${MUSCLE_GROUPS.map(g => `<button class="chip ${g === 'All' ? 'active' : ''}" onclick="filterModalByMuscle('${g}', this)">${g}</button>`).join('')}
    </div>
    <div id="modal-exercise-list">${listHtml}</div>
    <button class="btn btn-ghost btn-block mt-12" onclick="closeModal();showCreateExerciseModal()">
      ${icons.plus} Create New Exercise
    </button>
  `);
}

function showCreateExerciseModal() {
  showModal(`
    <div class="modal-header">
      <h2>New Exercise</h2>
      <button class="modal-close" onclick="closeModal()">${icons.x}</button>
    </div>
    <div class="input-group">
      <label>Name</label>
      <input type="text" id="new-ex-name" placeholder="Exercise name">
    </div>
    <div class="input-group">
      <label>Muscle Group</label>
      <select id="new-ex-group">
        ${MUSCLE_GROUPS.filter(g => g !== 'All').map(g => `<option value="${g}">${g}</option>`).join('')}
      </select>
    </div>
    <div class="input-group">
      <label>Type</label>
      <select id="new-ex-type">
        <option value="weight">Weight</option>
        <option value="bodyweight">Bodyweight</option>
        <option value="timed">Timed</option>
      </select>
    </div>
    <div class="input-group">
      <label>Primary Muscles (comma-separated)</label>
      <input type="text" id="new-ex-primary" placeholder="e.g. Chest, Front Delts">
    </div>
    <div class="input-group">
      <label>Secondary Muscles (comma-separated)</label>
      <input type="text" id="new-ex-secondary" placeholder="e.g. Triceps">
    </div>
    <button class="btn btn-primary btn-block mt-12" onclick="createExercise()">Create</button>
  `);
}

async function createExercise() {
  const name = document.getElementById('new-ex-name').value.trim();
  const muscleGroup = document.getElementById('new-ex-group').value;
  const type = document.getElementById('new-ex-type').value;
  const primaryRaw = document.getElementById('new-ex-primary').value.trim();
  const secondaryRaw = document.getElementById('new-ex-secondary').value.trim();
  const primary = primaryRaw ? primaryRaw.split(',').map(s => s.trim()).filter(Boolean) : [muscleGroup];
  const secondary = secondaryRaw ? secondaryRaw.split(',').map(s => s.trim()).filter(Boolean) : [];

  if (!name) return;

  await dbAdd('exercises', { name, muscleGroup, type, primary, secondary, alternates: [] });
  closeModal();

  if (currentView === 'exercises') navigate('exercises');
  else if (currentView === 'workout') showAddExerciseModal();
}

// === Filter Functions ===
function filterExerciseList() {
  const q = document.getElementById('exercise-search').value.toLowerCase();
  document.querySelectorAll('#exercise-list .exercise-list-item').forEach(el => {
    el.style.display = el.dataset.name.includes(q) ? '' : 'none';
  });
}

function filterByMuscle(group) {
  document.querySelectorAll('#muscle-filter .chip').forEach(c => c.classList.toggle('active', c.textContent === group));
  document.querySelectorAll('#exercise-list .exercise-list-item').forEach(el => {
    el.style.display = (group === 'All' || el.dataset.group === group) ? '' : 'none';
  });
}

function filterModalExercises() {
  const q = document.getElementById('modal-search').value.toLowerCase();
  document.querySelectorAll('#modal-exercise-list .exercise-list-item').forEach(el => {
    el.style.display = el.dataset.name.includes(q) ? '' : 'none';
  });
}

function filterModalByMuscle(group, btn) {
  btn.closest('.filter-chips').querySelectorAll('.chip').forEach(c => c.classList.toggle('active', c.textContent === group));
  document.querySelectorAll('#modal-exercise-list .exercise-list-item').forEach(el => {
    el.style.display = (group === 'All' || el.dataset.group === group) ? '' : 'none';
  });
}

function filterStatsList() {
  const q = document.getElementById('stats-search').value.toLowerCase();
  document.querySelectorAll('#stats-exercise-list .exercise-list-item').forEach(el => {
    el.style.display = el.dataset.name.includes(q) ? '' : 'none';
  });
}

// === Modal ===
function showModal(content) {
  const existing = document.getElementById('modal-backdrop');
  if (existing) existing.remove();

  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.id = 'modal-backdrop';
  backdrop.onclick = e => { if (e.target === backdrop) closeModal(); };
  backdrop.innerHTML = `<div class="modal">${content}</div>`;
  document.body.appendChild(backdrop);
}

function closeModal() {
  const el = document.getElementById('modal-backdrop');
  if (el) el.remove();
}

// === Rest Timer ===
function startRestTimer(seconds) {
  stopRestTimer();
  restSeconds = seconds;
  updateRestTimerUI();
  document.getElementById('rest-timer').classList.remove('hidden');

  restTimer = setInterval(() => {
    restSeconds--;
    updateRestTimerUI();
    if (restSeconds <= 0) {
      stopRestTimer();
      if ('vibrate' in navigator) navigator.vibrate([200, 100, 200]);
    }
  }, 1000);
}

function stopRestTimer() {
  if (restTimer) clearInterval(restTimer);
  restTimer = null;
  const el = document.getElementById('rest-timer');
  if (el) el.classList.add('hidden');
}

function addRestTime(seconds) {
  restSeconds += seconds;
  updateRestTimerUI();
}

function updateRestTimerUI() {
  const el = document.getElementById('rest-timer-display');
  if (el) el.textContent = formatTime(restSeconds);
}

// === Workout Timer ===
function startWorkoutTimer() {
  stopWorkoutTimer();
  if (activeWorkout && activeWorkout.startTime) {
    workoutSeconds = Math.floor((Date.now() - activeWorkout.startTime) / 1000);
  }
  workoutTimer = setInterval(() => {
    workoutSeconds++;
    const el = document.getElementById('workout-timer');
    if (el) el.textContent = formatTime(workoutSeconds);
  }, 1000);
}

function stopWorkoutTimer() {
  if (workoutTimer) clearInterval(workoutTimer);
  workoutTimer = null;
}

// === Settings helpers ===
function getRestDefault() {
  return parseInt(localStorage.getItem('restDefault') || '90');
}

function setRestDefault(s) {
  localStorage.setItem('restDefault', s);
  navigate('settings');
}

async function logBodyWeight() {
  const input = document.getElementById('bw-input');
  const weight = parseFloat(input.value);
  if (!weight) return;
  await dbAdd('bodyweight', { date: new Date().toISOString().split('T')[0], weight });
  input.value = '';
  navigate('settings');
}

async function doExport() {
  const data = await exportAllData();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `gymlog-export-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

async function doImport(event) {
  const file = event.target.files[0];
  if (!file) return;
  const text = await file.text();
  const data = JSON.parse(text);
  await importData(data);
  alert('Data imported successfully!');
  navigate('dashboard');
}

async function clearAllData() {
  if (!confirm('This will delete ALL your workout data. Are you sure?')) return;
  if (!confirm('Really? This cannot be undone.')) return;
  const d = await openDB();
  const stores = ['exercises', 'workouts', 'sets', 'templates', 'bodyweight'];
  const tx = d.transaction(stores, 'readwrite');
  stores.forEach(s => tx.objectStore(s).clear());
  await seedExercises();
  navigate('dashboard');
}

// === Chart Drawing (Canvas, no library) ===
function drawChart(canvasId, labels, data, unit, color) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = 200 * dpr;
  ctx.scale(dpr, dpr);

  const w = rect.width;
  const h = 200;
  const padding = { top: 20, right: 20, bottom: 30, left: 45 };
  const chartW = w - padding.left - padding.right;
  const chartH = h - padding.top - padding.bottom;

  const maxVal = Math.max(...data) * 1.1;
  const minVal = Math.min(...data) * 0.9;
  const range = maxVal - minVal || 1;

  // Grid lines
  ctx.strokeStyle = 'rgba(42, 42, 64, 0.5)';
  ctx.lineWidth = 0.5;
  for (let i = 0; i <= 4; i++) {
    const y = padding.top + (chartH / 4) * i;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(w - padding.right, y);
    ctx.stroke();

    const val = maxVal - (range / 4) * i;
    ctx.fillStyle = '#55556a';
    ctx.font = '10px -apple-system, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(Math.round(val), padding.left - 8, y + 3);
  }

  // Line
  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';

  const points = data.map((v, i) => ({
    x: padding.left + (chartW / (data.length - 1)) * i,
    y: padding.top + chartH - ((v - minVal) / range) * chartH
  }));

  points.forEach((p, i) => {
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  });
  ctx.stroke();

  // Fill area
  ctx.lineTo(points[points.length - 1].x, padding.top + chartH);
  ctx.lineTo(points[0].x, padding.top + chartH);
  ctx.closePath();
  ctx.fillStyle = color + '15';
  ctx.fill();

  // Dots
  points.forEach(p => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  });

  // X labels
  ctx.fillStyle = '#55556a';
  ctx.font = '9px -apple-system, sans-serif';
  ctx.textAlign = 'center';
  const step = Math.ceil(labels.length / 6);
  labels.forEach((l, i) => {
    if (i % step === 0 || i === labels.length - 1) {
      ctx.fillText(l, points[i].x, h - 5);
    }
  });
}

// === Utility Functions ===
function formatTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now - d) / 86400000);

  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff < 7) return d.toLocaleDateString('en-US', { weekday: 'long' });
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
}

function formatDateShort(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatVolume(vol) {
  if (vol >= 1000000) return (vol / 1000000).toFixed(1) + 'M';
  if (vol >= 1000) return (vol / 1000).toFixed(1) + 'k';
  return vol.toString();
}

function getDefaultWorkoutName() {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return `${days[new Date().getDay()]} Workout`;
}

function getWeekWorkouts(workouts) {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);
  return workouts.filter(w => new Date(w.date) >= weekStart);
}

// === INIT ===
async function init() {
  // Register service worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }

  // Seed exercises and historical data
  await seedExercises();
  await seedHistoricalData();

  // Check auth state (persists within browser tab session)
  isAuthenticated = isLoggedIn();

  // Check for active workout
  const workouts = await dbGetAll('workouts');
  activeWorkout = workouts.find(w => w.status === 'active') || null;

  // Setup nav
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => navigate(item.dataset.view));
  });

  // Initial render
  if (!isAuthenticated) {
    navigate('login');
  } else if (activeWorkout) {
    navigate('workout');
  } else {
    navigate('dashboard');
  }
}

// Start
init();
