// === Historical Data Import ===
// Parses CSV data from user's Google Sheets workout logs

// Plate notation: First=10, Second=15, Third=20, Fourth=25, Fifth=30, Sixth=35, Seventh=40, Eight=45
const PLATE_MAP = {
  'free': 0, 'first': 10, 'second': 15, 'third': 20, 'fourth': 25,
  'fifth': 30, 'sixth': 35, 'seventh': 40, 'eight': 45, 'eighth': 45
};

function parseSet(raw) {
  if (!raw) return null;
  raw = raw.trim();
  if (!raw || raw === '') return null;

  // Skip notes/non-data entries
  if (raw.includes('vanda') || raw.includes('dekhina') || raw.includes('parxa') || raw.includes('hole')) return null;

  // Handle drop set notation: "Fourth(30) drop" -> 25kg, 30 reps
  const dropMatch = raw.match(/^(.+?)\s*drop$/i);
  if (dropMatch) raw = dropMatch[1].trim();

  // Handle compound sets like "35(6) + 30(4)" -> take first part
  if (raw.includes('+')) raw = raw.split('+')[0].trim();

  // Handle "7/2.5kg" or "7/2.5" style (EZ bar notation: bar/plate)
  const barMatch = raw.match(/^(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)\s*(?:kg)?$/i);
  if (barMatch) {
    const bar = parseFloat(barMatch[1]);
    const plates = parseFloat(barMatch[2]);
    return { weight: bar + plates * 2, reps: null }; // no reps in this notation, skip
  }

  // "Free(15)" = bodyweight
  const freeMatch = raw.match(/^free\s*\((\d+)\)$/i);
  if (freeMatch) return { weight: 0, reps: parseInt(freeMatch[1]) };

  // "Xkg(Y)" = weight with kg suffix
  const kgMatch = raw.match(/^(\d+(?:\.\d+)?)\s*kg\s*\((\d+)\)$/i);
  if (kgMatch) return { weight: parseFloat(kgMatch[1]), reps: parseInt(kgMatch[2]) };

  // Plate notation: "Third(15)", "Fourth (30)", "Fifth(30)" etc
  const plateMatch = raw.match(/^(free|first|second|third|fourth|fifth|sixth|seventh|eight|eighth)\s*\((\d+)\)$/i);
  if (plateMatch) {
    const plateKey = plateMatch[1].toLowerCase();
    const weight = PLATE_MAP[plateKey];
    if (weight !== undefined) return { weight, reps: parseInt(plateMatch[2]) };
  }

  // Standard "X(Y)" = weight(reps)
  const stdMatch = raw.match(/^(\d+(?:\.\d+)?)\s*\((\d+)\)$/i);
  if (stdMatch) return { weight: parseFloat(stdMatch[1]), reps: parseInt(stdMatch[2]) };

  // "X(form)" = form practice
  const formMatch = raw.match(/^(\d+(?:\.\d+)?)\s*\(form\)$/i);
  if (formMatch) return { weight: parseFloat(formMatch[1]), reps: 0 };

  return null; // unparseable
}

function parseDate(dateStr, defaultYear) {
  if (!dateStr) return null;
  dateStr = dateStr.trim();
  if (!dateStr) return null;

  // Handle various formats
  const monthMap = {
    'jan': '01', 'january': '01', 'feb': '02', 'february': '02',
    'mar': '03', 'march': '03', 'apr': '04', 'april': '04',
    'may': '05', 'jun': '06', 'jul': '07', 'aug': '08',
    'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12', 'december': '12'
  };

  // "15 April", "April 13", "Dec 7", "Jan28", "January 6", "Feb 15"
  // Day first: "15 April"
  let match = dateStr.match(/^(\d{1,2})\s+([\w]+)$/i);
  if (match) {
    const day = match[1].padStart(2, '0');
    const month = monthMap[match[2].toLowerCase()];
    if (month) {
      const year = parseInt(month) >= 10 ? defaultYear - 1 : defaultYear;
      return `${year}-${month}-${day}`;
    }
  }

  // Month first with optional space: "Dec 7", "Jan28", "January 6"
  match = dateStr.match(/^([a-z]+)\s*(\d{1,2})$/i);
  if (match) {
    const month = monthMap[match[1].toLowerCase()];
    const day = match[2].padStart(2, '0');
    if (month) {
      const year = parseInt(month) >= 10 ? defaultYear - 1 : defaultYear;
      return `${year}-${month}-${day}`;
    }
  }

  return null;
}

// All historical workout data
const HISTORY_DATA = [
  // =================== PUSH DAY 1 ===================
  {
    template: 'Push Day 1',
    dates: ['Dec 7', 'Dec 14', 'Dec 28', 'Jan 4', 'Jan 11', 'Jan 18', 'Jan 25', 'Feb 2', 'Feb 15', 'April 13', 'April 17'],
    exercises: [
      {
        name: 'Barbell Bench Press',
        sets: [
          ['7.5(15)','10(14)','7.5(15)','7.5(15)','10(15)','10(15)','10(15)','10(12)','7.5(14)','5(15)','5(14)'],
          ['10(12)','10(12)','10(14)','10(14)','12.5(12)','12.5(11)','12.5(10)','12.5(10)','10(12)','7.5(12)','7.5(12)'],
          ['12.5(10)','12.5(9)','12.5(10)','12.5(8)','15(8)','15(8)','15(8)','15(8)','12.5(8)','10(10)','10(10)'],
          ['','','15(6)','15(6)','','17.5(4)','17.5(5)','17.5(5)','','','12.5(6)'],
        ]
      },
      {
        name: 'Incline Dumbbell Press',
        sets: [
          ['10(15)','10(15)','10(15)','10(15)','10(15)','10(15)','10(15)','10(15)','7.5(15)','5(15)','7.5(15)'],
          ['12.5(12)','12.5(12)','12.5(12)','12.5(14)','12.5(12)','12.5(12)','12.5(12)','12.5(10)','10(12)','7.5(12)','10(12)'],
          ['12.5(12)','12.5(12)','15(10)','15(10)','15(10)','15(9)','15(8)','15(8)','12.5(10)','10(10)','12.5(10)'],
          ['','15(6)','','17.5(5)','17.5(4)','','','','','',''],
        ]
      },
      {
        name: 'Seated Dumbbell Shoulder Press',
        sets: [
          ['5(20)','5(18)','7.5(15)','7.5(15)','7.5(15)','7.5(18)','7.5(15)','10(15)','5(10)','5(15)','7.5(15)'],
          ['7.5(15)','7.5(18)','10(15)','10(15)','10(15)','10(15)','10(15)','10(12)','5(10)','10(12)','10(12)'],
          ['10(10)','10(12)','12.5(9)','12.5(9)','12.5(10)','12.5(10)','12.5(10)','12.5(10)','7.5(6)','10(12)','12.5(10)'],
        ]
      },
      {
        name: 'Dumbbell Lateral Raise',
        sets: [
          ['5(18)','5(18)','7.5(15)','7.5(15)','7.5(15)','7.5(15)','7.5(15)','7.5(12)','5(15)','5(15)','5(15)'],
          ['7.5(15)','7.5(15)','10(11)','10(12)','7.5(15)','7.5(15)','10(12)','10(12)','7.5(12)','5(12)','7.5(12)'],
          ['10(12)','10(12)','10(10)','10(9)','10(10)','10(10)','12.5(7)','12.5(7)','10(10)','7.5(10)','10(11)'],
        ]
      },
      {
        name: 'Cable Triceps Pushdown',
        sets: [
          ['','','Third(20)','Third(20)','Fourth(20)','Fourth(30)','Fourth(30)','Fourth(30)','Fourth(30)','Fourth(30)','Fourth(30)'],
          ['','','Fourth(15)','Fifth(15)','Fifth(15)','Fifth(30)','Fifth(30)','Fifth(30)','Fifth(30)','Fifth(30)','Fifth(30)'],
          ['','','Fifth(15)','Sixth(12)','Sixth(15)','Sixth(30)','Sixth(30)','Sixth(24)','','Fifth(23)','Sixth(30)'],
        ]
      },
      {
        name: 'Overhead Dumbbell Triceps Extension',
        sets: [
          ['7.5(15)','7.5(18)','7.5(15)','7.5(17)','7.5(15)','7.5(15)','10(15)','10(12)','','7.5(12)','7.5(12)'],
          ['7.5(15)','10(15)','10(15)','10(17)','10(15)','10(15)','12.5(15)','12.5(12)','','7.5(12)','10(12)'],
          ['10(15)','12.5(12)','12.5(15)','12.5(12)','12.5(15)','12.5(15)','15(15)','15(12)','','7.5(12)','10(12)'],
        ]
      },
      {
        name: 'Push-Up',
        sets: [
          ['Free(15)','Free(15)','Free(15)','Free(18)','Free(18)','Free(18)','Free(20)','Free(20)','Free(15)','','Free(15)'],
          ['Free(15)','Free(15)','Free(15)','Free(18)','Free(18)','Free(18)','Free(20)','Free(15)','Free(15)','','Free(15)'],
        ]
      },
    ]
  },

  // =================== PUSH DAY 2 ===================
  {
    template: 'Push Day 2',
    dates: ['Dec 16', 'Dec 24', 'Dec 31', 'Jan 7', 'Jan 14', 'Jan 21', 'Jan 28', 'Feb 5'],
    exercises: [
      {
        name: 'Dumbbell Bench Press',
        sets: [
          ['7.5(15)','7.5(15)','7.5(15)','10(15)','10(15)','10(15)','12.5(12)','12.5(12)'],
          ['10(15)','10(12)','10(15)','12.5(12)','12.5(12)','12.5(12)','15(10)','15(10)'],
          ['12.5(12)','12.5(12)','12.5(12)','15(8)','15(8)','15(8)','17.5(6)','17.5(8)'],
          ['','','15(7)','','','','',''],
        ]
      },
      {
        name: 'Incline Cable Fly',
        sets: [
          ['Free(15)','First(12)','First(12)','First(12)','First(13)','First(10)','First(12)','First(12)'],
          ['First(12)','First(12)','First(12)','First(12)','First(12)','First(10)','First(12)','First(10)'],
          ['Second(5)','Second(6)','Second(6)','Second(7)','Second(10)','Second(10)','Second(8)','Second(6)'],
        ]
      },
      {
        name: 'Arnold Press',
        sets: [
          ['2.5(12)','2.5(12)','2.5(15)','2.5(15)','2.5(15)','2.5(15)','5(12)','5(12)'],
          ['2.5(12)','2.5(10)','2.5(12)','5(12)','5(13)','5(10)','7.5(8)','7.5(8)'],
          ['5(10)','2.5(10)','5(12)','7.5(8)','7.5(8)','7.5(5)','7.5(6)','10(5)'],
        ]
      },
      {
        name: 'Cable Lateral Raise',
        sets: [
          ['','','Free(13)','Free(15)','Free(15)','Free(12)','Free(12)','Free(12)'],
          ['','','First(5)','Free(12)','Free(15)','Free(12)','Free(12)','Free(12)'],
          ['','','Free(12)','First(7)','First(7)','First(7)','First(8)','First(6)'],
        ]
      },
      {
        name: 'Skull Crusher',
        sets: [
          ['2.5(15)','2.5(15)','2.5(20)','5(15)','5(13)','','5(15)','5(12)'],
          ['5(12)','5(12)','5(15)','5(10)','5(10)','','5(13)','5(12)'],
          ['5(12)','5(12)','5(10)','5(10)','5(10)','','','5(12)'],
        ]
      },
      {
        name: 'Rope Triceps Pushdown',
        sets: [
          ['Third(15)','Third(15)','Third(15)','Third(18)','Third(18)','Third(10)','Third(15)','Third(10)'],
          ['Third(12)','Fourth(13)','Fourth(12)','Fourth(15)','Fourth(14)','Fourth(10)','','Third(12)'],
          ['Fourth(10)','Fifth(9)','Fifth(10)','Fifth(9)','Fifth(8)','','','Fourth(8)'],
        ]
      },
    ]
  },

  // =================== PULL DAY 1 ===================
  {
    template: 'Pull Day 1',
    dates: ['Dec 8', 'Dec 15', 'Dec 29', 'Jan 5', 'Jan 12', 'Jan 19', 'Jan 26', 'Feb 3', 'April 15'],
    exercises: [
      {
        name: 'Conventional Deadlift',
        sets: [
          ['10(8)','5(8)','5(10)','10(8)','10(8)','10(8)','10(8)','10(8)','5(7)'],
          ['10(6)','15(5)','10(6)','12.5(6)','12.5(7)','12.5(7)','12.5(6)','15(6)','5(7)'],
          ['12.5(6)','15(6)','15(5)','15(5)','15(5)','15(5)','15(5)','15(6)','10(6)'],
          ['','','','','','17.5(4)','','',''],
        ]
      },
      {
        name: 'Pull-Up',
        sets: [
          ['60(8)','50(8)','60(9)','55(5)','55(6)','50(8)','50(8)','50(8)','65(8)'],
          ['50(6)','50(6)','50(6)','55(5)','45(5)','45(5)','45(6)','45(6)','50(5)'],
          ['0(3)','0(3)','0(2)','0(3)','0(2)','45(5)','45(5)','45(5)','50(5)'],
          ['','','','','35(2)','','0(3)','0(3)','0(3)'],
        ]
      },
      {
        name: 'Barbell Bent-Over Row',
        sets: [
          ['2.5(18)','5(15)','5(15)','7.5(15)','7.5(15)','7.5(15)','7.5(15)','7.5(12)','5(15)'],
          ['5(15)','7.5(12)','10(12)','10(12)','10(12)','10(12)','10(12)','10(10)','5(12)'],
          ['7.5(12)','10(10)','12.5(8)','12.5(8)','12.5(8)','12.5(9)','12.5(8)','12.5(8)','10(6)'],
        ]
      },
      {
        name: 'Seated Cable Row',
        sets: [
          ['Fifth(15)','Fifth(15)','Fifth(15)','Fifth(15)','Fifth(15)','Fifth(15)','Fifth(15)','Fifth(12)','Third(12)'],
          ['Sixth(12)','Sixth(12)','Sixth(13)','Sixth(15)','Sixth(12)','Sixth(13)','Sixth(12)','Sixth(12)','Third(12)'],
          ['Seventh(10)','Sixth(10)','Seventh(10)','Seventh(12)','Seventh(10)','Seventh(10)','Seventh(9)','Seventh(8)','Fifth(8)'],
        ]
      },
      {
        name: 'Barbell Bicep Curl',
        sets: [
          ['2.5(12)','','2.5(15)','','5(12)','','5(10)','','2.5(15)'],
          ['5(12)','','5(12)','','5(12)','','5(6)','','2.5(12)'],
          ['7.5(6)','','7.5(6)','','7.5(6)','','','','2.5(10)'],
        ]
      },
      {
        name: 'Face Pull',
        sets: [
          ['20(15)','20(15)','20(15)','25(17)','25(15)','25(15)','25(15)','25(13)','20(12)'],
          ['25(15)','25(15)','30(15)','30(15)','30(12)','30(13)','30(13)','30(12)','25(12)'],
          ['30(12)','30(12)','35(6)','30(15)','35(10)','35(10)','35(10)','35(12)','25(8)'],
        ]
      },
    ]
  },

  // =================== PULL DAY 2 ===================
  {
    template: 'Pull Day 2',
    dates: ['Dec 10', 'Dec 17', 'Jan 1', 'Jan 9', 'Jan 16', 'Jan 22', 'Jan 29'],
    exercises: [
      {
        name: 'Lat Pulldown',
        sets: [
          ['Fifth(15)','Fifth(15)','Fifth(15)','Fifth(15)','Fifth(15)','Fifth(15)','Sixth(12)'],
          ['Fifth(12)','Fifth(15)','Sixth(13)','Sixth(12)','Seventh(12)','Seventh(10)','Seventh(10)'],
          ['Sixth(8)','Sixth(12)','Sixth(10)','Seventh(10)','Eight(8)','Eight(10)','Eight(10)'],
        ]
      },
      {
        name: 'Single-Arm Dumbbell Row',
        sets: [
          ['10(15)','10(15)','10(15)','12.5(15)','15(15)','15(15)','20(12)'],
          ['15(12)','15(12)','15(15)','20(12)','20(12)','20(12)','20(10)'],
          ['20(10)','15(12)','20(12)','25(10)','25(10)','25(10)','25(10)'],
        ]
      },
      {
        name: 'T-Bar Row',
        sets: [
          ['15(15)','15(12)','15(12)','15(12)','15(12)','15(15)','20(12)'],
          ['15(12)','15(10)','17.5(12)','20(12)','20(12)','20(12)','20(10)'],
          ['20(10)','17.5(10)','20(12)','25(10)','25(10)','25(12)','25(10)'],
        ]
      },
      {
        name: 'Rear Delt Fly',
        sets: [
          ['Third(15)','Third(15)','Third(15)','Third(15)','Third(15)','Third(15)','Third(15)'],
          ['Fourth(15)','Fourth(15)','Fourth(15)','Fourth(15)','Fourth(15)','Fourth(12)','Fourth(12)'],
          ['Fifth(10)','Fifth(10)','Fifth(12)','Fifth(11)','Fifth(11)','Fifth(11)','Fifth(10)'],
        ]
      },
      {
        name: 'Bayesian Cable Curl',
        sets: [
          ['','','','','First(13)','First(13)','First(12)'],
          ['','','','','First(13)','First(13)','First(10)'],
          ['','','','','First(10)','First(10)','First(10)'],
        ]
      },
      {
        name: 'Hammer Curl',
        sets: [
          ['7.5(15)','10(12)','10(12)','10(12)','10(12)','10(12)','10(12)'],
          ['7.5(14)','10(10)','10(10)','12.5(9)','10(10)','10(10)','10(12)'],
          ['10(12)','12.5(8)','12.5(10)','12.5(7)','12.5(8)','12.5(8)','12.5(10)'],
        ]
      },
      {
        name: 'Wrist Curl',
        sets: [
          ['','','','','5(12)','5(12)',''],
          ['','','','','5(12)','',''],
        ]
      },
    ]
  },

  // =================== LEG DAY 1 ===================
  {
    template: 'Leg Day 1',
    dates: ['Dec 11', 'Dec 18', 'Dec 30', 'Jan 6', 'Jan 13', 'Jan 20', 'Jan 27', 'April 16'],
    exercises: [
      {
        name: 'Barbell Back Squat',
        sets: [
          ['','','','5(10)','5(8)','5(10)','Free(13)',''],
          ['','','','7.5(8)','10(8)','10(8)','5(8)','5(8)'],
          ['','','','10(7)','10(6)','12.5(5)','10(8)','5(6)'],
          ['','','','','','','12.5(6)','7.5(5)'],
        ]
      },
      {
        name: 'Romanian Deadlift',
        sets: [
          ['','','2.5(5)','2.5(6)','','','',''],
          ['','','2.5(5)','2.5(9)','','','',''],
          ['','','2.5(5)','2.5(7)','','','',''],
        ]
      },
      {
        name: 'Leg Press',
        sets: [
          ['20(12)','15(12)','15(15)','20(15)','20(25)','20(10)','20(12)','15(10)'],
          ['20(10)','15(9)','20(13)','20(8)','20(12)','20(10)','20(10)','15(10)'],
          ['20(12)','','20(12)','20(9)','25(12)','25(10)','30(5)','15(6)'],
          ['','','','','30(10)','','',''],
        ]
      },
      {
        name: 'Lying Leg Curl',
        sets: [
          ['20(20)','20(20)','20(20)','25(12)','25(15)','30(15)','30(12)','20(12)'],
          ['30(20)','30(15)','30(15)','30(12)','30(15)','35(12)','35(12)','25(12)'],
          ['35(12)','35(12)','35(15)','35(12)','35(15)','40(12)','40(12)','25(12)'],
          ['','','35(12)','','','','',''],
        ]
      },
      {
        name: 'Hip Abduction Machine',
        sets: [
          ['Second(20)','Second(20)','Second(20)','Second(20)','Third(15)','Fourth(15)','Fourth(15)',''],
          ['Third(18)','Third(18)','Third(18)','Third(18)','Fourth(15)','Fifth(15)','Fifth(15)',''],
          ['Fourth(15)','Fourth(15)','Fourth(15)','Fourth(15)','Fifth(15)','Sixth(10)','Sixth(10)',''],
        ]
      },
      {
        name: 'Standing Calf Raise',
        sets: [
          ['','','','','10(15)','15(15)','20(12)','20(15)'],
          ['','','','','15(15)','20(12)','20(10)','20(15)'],
          ['','','','','20(12)','20(12)','25(8)','20(15)'],
        ]
      },
    ]
  },

  // =================== LEG DAY 2 ===================
  {
    template: 'Leg Day 2',
    dates: ['Dec 13', 'Dec 20', 'Jan 17'],
    exercises: [
      {
        name: 'Front Squat',
        sets: [
          ['2.5(10)','2.5(10)','3(9)'],
          ['5(10)','5(10)','6(9)'],
          ['7.5(10)','7.5(10)','6(9)'],
        ]
      },
      {
        name: 'Walking Lunge',
        sets: [
          ['5(15)','5(20)',''],
          ['7.5(12)','5(12)',''],
          ['7.5(12)','7.5(10)',''],
        ]
      },
      {
        name: 'Leg Extension',
        sets: [
          ['Third(15)','Third(15)',''],
          ['Fourth(15)','Fourth(10)',''],
          ['Fifth(15)','Fourth(8)',''],
        ]
      },
      {
        name: 'Seated Calf Raise',
        sets: [
          ['10(15)','10(15)',''],
          ['15(15)','15(15)',''],
          ['15(15)','15(15)',''],
        ]
      },
    ]
  },
];

async function seedHistoricalData() {
  // Check if already imported
  const existingWorkouts = await dbGetAll('workouts');
  if (existingWorkouts.length > 0) return;

  const exercises = await dbGetAll('exercises');
  const exerciseByName = {};
  exercises.forEach(e => exerciseByName[e.name] = e.id);

  const currentYear = 2026; // Dec dates = 2025, Jan-Apr = 2026

  let imported = 0;
  let skipped = 0;

  for (const template of HISTORY_DATA) {
    for (let dateIdx = 0; dateIdx < template.dates.length; dateIdx++) {
      const dateStr = template.dates[dateIdx];
      const isoDate = parseDate(dateStr, currentYear);
      if (!isoDate) continue;

      // Create workout
      const workoutId = await dbAdd('workouts', {
        name: template.template,
        date: isoDate,
        startTime: new Date(isoDate).getTime(),
        status: 'completed',
        duration: 3600,
        notes: ''
      });

      // Collect all sets for this workout, then batch insert
      const setsToAdd = [];
      for (const exercise of template.exercises) {
        const exerciseId = exerciseByName[exercise.name];
        if (!exerciseId) {
          console.warn('Exercise not found:', exercise.name);
          continue;
        }

        let setNumber = 1;
        for (const setRow of exercise.sets) {
          const raw = setRow[dateIdx];
          const parsed = parseSet(raw);
          if (!parsed || parsed.reps === null) {
            skipped++;
            continue;
          }

          setsToAdd.push({
            workoutId: workoutId,
            exerciseId: exerciseId,
            setNumber: setNumber,
            weight: parsed.weight,
            reps: parsed.reps,
            rpe: null,
            completed: true,
            isPR: false,
            notes: ''
          });
          setNumber++;
          imported++;
        }
      }

      // Batch write all sets for this workout
      if (setsToAdd.length > 0) {
        await dbBatchAdd('sets', setsToAdd);
      }
    }
  }

  console.log(`Import complete: ${imported} sets imported, ${skipped} skipped`);

  // Now mark PRs
  await recalculatePRs();
}

// Recalculate PRs across all history
async function recalculatePRs() {
  const allSets = await dbGetAll('sets');
  const exercises = await dbGetAll('exercises');
  const workouts = await dbGetAll('workouts');
  const workoutMap = {};
  workouts.forEach(w => workoutMap[w.id] = w);

  // Group by exercise
  const byExercise = {};
  allSets.forEach(s => {
    if (!byExercise[s.exerciseId]) byExercise[s.exerciseId] = [];
    byExercise[s.exerciseId].push(s);
  });

  for (const exId of Object.keys(byExercise)) {
    const sets = byExercise[exId];
    // Sort by date
    sets.sort((a, b) => {
      const dA = workoutMap[a.workoutId]?.date || '';
      const dB = workoutMap[b.workoutId]?.date || '';
      return dA.localeCompare(dB) || a.setNumber - b.setNumber;
    });

    let bestVolume = 0;
    const updatedSets = [];
    for (const s of sets) {
      const vol = (s.weight || 0) * (s.reps || 0);
      if (vol > bestVolume && vol > 0) {
        bestVolume = vol;
        s.isPR = true;
      } else {
        s.isPR = false;
      }
      updatedSets.push(s);
    }
    // Batch update PR flags
    for (const s of updatedSets) {
      await dbPut('sets', s);
    }
  }
}
