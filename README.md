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

### Cloud backup (on by default)

The app opens with no login and works entirely offline, but cloud backup is on
out of the box because local-only history dies with the phone. It needs **one**
sign-in — Firestore has no unauthenticated write path — and after that it is
hands-off: every set writes straight to the database in the background.

The first time an account connects, the app **clears the database** (the previous
version's `exercises` / `workouts` / `sets` / `templates` / `bodyweight`
collections, plus any `v2_*` leftovers) and uploads what is on the device as the
new contents. A marker is written to the cloud as well as locally, so installing
the app on a second phone pulls the existing data down instead of wiping it.

Remote collections are namespaced `v2_*` under `users/{uid}/`. Merges are
newest-write-wins on `updatedAt`.

Point the backup at a different project by editing `js/config/firebase.js`.

#### Locking the project down

The Firebase web `apiKey` is published in the app bundle — that is by design, it
identifies the project and is not a secret. **The rules, not the client, are what
guard the data.** `firestore.rules` pins every read and write to a single uid and
denies everything else, so an account someone else creates in the project can
reach nothing.

Before it will work you must fill in your uid:

1. Sign in, then Profile → Cloud backup → tap the **User ID** to copy it.
2. Replace `PASTE_YOUR_UID_HERE` in `firestore.rules`.
3. Publish it — Firebase Console → Firestore Database → Rules, or
   `firebase deploy --only firestore:rules`. The file in this repo is **not**
   deployed automatically.

Worth also turning off account creation in Firebase Console → Authentication →
Settings → User actions. The app has no sign-up button, but the REST API behind
that public key does.

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
