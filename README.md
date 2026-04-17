# GymLog - Workout Tracker PWA

A mobile-first Progressive Web App for tracking gym workouts, built with vanilla HTML/CSS/JS. Works fully offline with IndexedDB storage. No frameworks, no build step, just open and lift.

## Features

### Workout Logging
- **PPL Split Templates** - Pre-built Push (1/2), Pull (1/2), and Leg (1/2) day routines
- **Set Tracking** - Log weight, reps, and RPE for every set
- **Cardio Support** - Track duration, distance, and speed for cardio exercises
- **Rest Timer** - Auto-starts between sets with +15s and skip controls
- **Workout Timer** - Tracks total session duration
- **Notes** - Add form cues and notes per exercise

### Progress Tracking
- **Personal Records** - Auto-detects PRs showing both heaviest weight and best volume
- **Previous Sessions** - Shows your last 2 sessions for each exercise while logging
- **Progress Charts** - Per-exercise weight and volume charts over time (pure canvas, no libraries)
- **Dashboard Stats** - Weekly count, total workouts, total volume, PRs hit

### Exercise Library
- **58 exercises** across Chest, Back, Shoulders, Legs, Arms, Core, and Cardio
- **Muscle targeting** - Primary and secondary muscles shown for every exercise
- **Alternate exercises** - Suggested substitutes for each movement
- **Custom exercises** - Add your own with muscle group and type

### Templates & History
- **6 pre-built PPL templates** with all exercises pre-loaded
- **Save any workout as a template** for future quick-start
- **Full workout history** with search and filtering
- **Editable past workouts** - Fix weights/reps even after finishing

### Data & Privacy
- **Offline-first** - Service worker caches everything, works without internet
- **Installable PWA** - Add to home screen on any device
- **Client-side auth** - Password-protected with SHA-256 hashing
- **Export/Import** - Backup your data as JSON anytime
- **Body weight log** - Track weight over time in settings

## Tech Stack

- **Frontend**: Vanilla HTML, CSS, JavaScript (zero dependencies)
- **Storage**: IndexedDB (via raw API, no wrapper library)
- **Offline**: Service Worker with cache-first strategy
- **Charts**: Canvas 2D API (no chart libraries)
- **Deploy**: Netlify (static hosting, no build step)

## Getting Started

### Local Development
```bash
# Clone the repo
git clone https://github.com/Suyog007/Workout-Log.git
cd Workout-Log

# Serve locally (any static server works)
python3 -m http.server 8080

# Open http://localhost:8080
```

### Deploy to Netlify
1. Connect the repo to Netlify
2. Set publish directory to `.` (root)
3. No build command needed
4. Deploy!

The `netlify.toml` is already configured with SPA routing.

### First Time Setup
1. Open the app
2. Create a username and password
3. Your PPL templates are pre-loaded and ready to go
4. Tap any workout day on the dashboard to start

## Data Format

The app imports historical workout data on first load. Weight notation used in the spreadsheet logs:

| Notation | Meaning |
|----------|---------|
| `10(12)` | 10kg, 12 reps |
| `Third(15)` | Cable plate 3 = 20kg, 15 reps |
| `Free(15)` | Bodyweight, 15 reps |
| `10kg(12)` | 10kg, 12 reps |
| `Fourth(30) drop` | 25kg, 30 reps (drop set) |

Cable plate formula: `plate_number * 5 + 5` (First=10kg, Second=15kg, Third=20kg, etc.)

## Project Structure

```
.
├── index.html              # App shell with navigation
├── manifest.json           # PWA manifest
├── sw.js                   # Service worker
├── netlify.toml            # Netlify deploy config
├── css/
│   └── styles.css          # Dark theme, mobile-first styles
├── js/
│   ├── db.js               # IndexedDB layer, exercise seed data, templates
│   ├── app.js              # SPA router, all views, auth, actions
│   └── import-history.js   # Historical data parser and importer
└── icons/
    ├── icon.svg            # Source SVG
    ├── icon-192.png        # PWA icon
    └── icon-512.png        # PWA icon
```

## Screenshots

> Coming soon - add screenshots of the app in action here.

## License

MIT
