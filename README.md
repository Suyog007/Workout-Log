# Workout Log

A single-user, mobile-first PWA for running a **6-week PPL ×2 block** with double
progression. Open it at the gym and it already knows what you lifted last time
and what to do today.

No build step, no `package.json`, no framework — plain ES modules served
statically. Push to `main` and Vercel deploys it as-is.

---

## The program

| Day | Workout | Emphasis |
|-----|---------|----------|
| Mon | Push A  | Chest |
| Tue | Pull A  | Back |
| Wed | Legs A  | Quads |
| Thu | Push B  | Upper chest / shoulders |
| Fri | Pull B  | Lats / rear delts |
| Sat | Legs B  | Hamstrings / posterior chain |
| Sun | Rest    | — |

Plus ~10,000 steps a day and ~20 min of incline treadmill after lifting.

The block runs for 6 weeks and **never resets itself**. At the end of week 6 the
app shows a block report and offers to start a new block; exercise history,
records and body metrics all carry over.

## Progression

Double progression, applied per exercise:

- Hit the **top of the rep range on every prescribed set** → *"Increase to 52.5 kg
  next session."*
- Anything less → *"Keep 50 kg — try to beat 29 total reps."*

Nothing is ever forced; the app only recommends. The jump size is per exercise
(`increment` in the library — 5 kg for barbell lower body, 2.5 kg for most upper
body, 1.25 kg for lateral raises, and so on).

RIR (0–4+) is recorded alongside each set and can be switched off globally in
Profile. It is advisory: it annotates a recommendation, it never blocks one.

## What it tracks

Workouts and sets · rest and workout timers · body weight (with a 7-day average
that leads the chart) · weekly waist · daily steps vs a 10k goal · cardio ·
personal records · pre-workout readiness (energy / soreness / sleep) ·
workout- and exercise-level notes.

---

## Data

Everything is local-first in **IndexedDB** (`workoutlog`), held in memory for
instant rendering. Every document carries `id`, `updatedAt`, `dirty` and an
optional `deleted` tombstone, which is what makes sync possible without the rest
of the app knowing about it.

```
meta  programs  exercises  sessions  exerciseSessions  setLogs
bodyWeight  waist  steps  cardio  prs  readiness
```

### Cloud backup (optional, off by default)

The app needs no account. In **Profile → Cloud backup** you can sign in to
Firebase, after which local writes are pushed in the background and remote
changes are merged newest-write-wins on `updatedAt`. This exists so your history
survives a lost or wiped phone — an anonymous account could not be recovered on a
new device, which is why it uses a real email sign-in.

Remote collections are namespaced `v2_*` under `users/{uid}/`, so they can never
collide with data from the previous version of this app. Once signed in, Profile
offers a one-tap **"Clean up old app data in the cloud"** that deletes the old
`exercises` / `workouts` / `sets` / `templates` / `bodyweight` collections.

Point the backup at a different project by editing `js/config/firebase.js`.
`firestore.rules` restricts every user to documents under their own `uid`.

**Export / Import** in Profile writes and reads a plain JSON backup — worth doing
occasionally whether or not cloud backup is on.

---

## Changing the program

`js/config/program.js` is the single source of truth: the exercise library,
each day's slots, sets, rep ranges, weight increments and rest times. Edit it and
redeploy, or change things in the app:

- **Profile → Exercise library** — add, edit or archive exercises. Archiving keeps
  every set ever logged against that exercise.
- **Profile → Edit program days** — reorder, add, remove or retarget a day's
  exercises for the current block.
- **Swap exercise** inside a running workout — for this session, or for the whole
  block. Old history stays attached to the old exercise.

---

## Project layout

```
index.html            app shell
sw.js                 service worker (precache + stale-while-revalidate)
manifest.json         PWA manifest
vercel.json           cache headers (sw.js / index.html must not be cached)
css/styles.css        design tokens + all styling
js/
  config/program.js   the program: exercises, days, sets, rep ranges
  config/firebase.js  optional backup target
  core/store.js       IndexedDB + in-memory cache + change events
  core/model.js       domain operations (programs, sessions, metrics)
  core/sync.js        optional Firestore push/pull
  core/router.js      hash router
  core/util.js        dates, numbers, formatting
  logic/progression.js  double progression
  logic/prs.js          personal-record detection
  logic/analytics.js    dashboard / weekly / block aggregations
  ui/                 DOM toolkit, charts, timers, entry sheets
  views/              one module per screen
```

## Running locally

```sh
python3 -m http.server 8731     # any static server; ES modules need http://
open http://localhost:8731
```

## Deploying

Static root deploy — no build command, no install step. Push to `main`.

Two things keep a new deploy from being masked by the old one:

1. `vercel.json` marks `sw.js`, `index.html` and `manifest.json` as
   `must-revalidate`.
2. The service worker serves same-origin assets **stale-while-revalidate**, so a
   deploy lands on the next launch without anything needing to be bumped.
   Bumping `BUILD` in `sw.js` additionally purges every older cache on activate —
   worth doing when asset names or the shell list change.

If you add a file under `js/`, add it to `SHELL` in `sw.js` so a fresh install is
usable offline immediately.
