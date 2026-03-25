import type { TodayShift } from './shiftEngine'

export interface MealWindow {
  label: string
  time: string
  description: string
  suggestion: string
  icon: string
}

export interface FoodPlan {
  prepTip: string
  meals: MealWindow[]
}

function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number)
  const total = h * 60 + m + minutes
  const newH = Math.floor(total / 60) % 24
  const newM = total % 60
  return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`
}

function subtractMinutes(time: string, minutes: number): string {
  return addMinutes(time, -minutes)
}

export function getFoodPlan(shift: TodayShift): FoodPlan {

  // ── REST DAY ─────────────────────────────────────────
  if (shift.isOff) {
    return {
      prepTip: "Rest day — no shift constraints today. Use this time to prep meals for your upcoming shifts. Even 30 mins of batch cooking saves you all week.",
      meals: [
        {
          label: 'Meal 1',
          time: '08:00–09:30',
          description: 'Start of day — take your time with this one.',
          suggestion: 'Eggs any style, wholegrain toast, fruit. Proper fuel with no rush.',
          icon: '🌅'
        },
        {
          label: 'Meal 2',
          time: '13:00–14:00',
          description: 'Midday — keep it balanced.',
          suggestion: 'Whatever you fancy. Good day to try batch cooking — make extra for shift days.',
          icon: '☀️'
        },
        {
          label: 'Meal 3',
          time: '18:00–19:30',
          description: 'Evening — wind down meal.',
          suggestion: 'Lean protein, veg, moderate carbs. No need to eat late tonight.',
          icon: '🌙'
        },
      ]
    }
  }

  const start = shift.startTime
  const end = shift.endTime

  const startHour = parseInt(start.split(':')[0])
  const endHour = parseInt(end.split(':')[0])

  // ── EARLY SHIFT (starts before 10am) ─────────────────
  if (startHour >= 4 && startHour <= 10) {
    return {
      prepTip: `Early start at ${start} — your biggest enemy is skipping Meal 1. Even something small before you leave is better than nothing. Prep Meal 2 the night before.`,
      meals: [
        {
          label: 'Meal 1',
          time: `${subtractMinutes(start, 45)}–${subtractMinutes(start, 15)}`,
          description: 'Before you leave — small but essential.',
          suggestion: 'Quick and easy: overnight oats, banana and peanut butter, or a protein bar. Something is always better than nothing.',
          icon: '⚡'
        },
        {
          label: 'Meal 2',
          time: `${addMinutes(start, 180)}–${addMinutes(start, 240)}`,
          description: 'Mid-shift — energy top up.',
          suggestion: 'Prepped the night before ideally. Rice pot, wrap, or a sandwich with protein. Avoid heavy carbs here.',
          icon: '🔋'
        },
        {
          label: 'Meal 3',
          time: `${addMinutes(end, 30)}–${addMinutes(end, 90)}`,
          description: 'Post-shift recovery meal.',
          suggestion: 'Protein-led to support recovery — chicken, eggs, fish with veg. Keep carbs moderate, you\'re winding down.',
          icon: '🌙'
        },
      ]
    }
  }

  // ── LATE SHIFT (starts 11am–5pm) ─────────────────────
  if (startHour >= 11 && startHour <= 17) {
    return {
      prepTip: `Late shift starting ${start} — you have time this morning. Make the most of it. A proper Meal 1 now sets you up for the whole shift. Pack Meal 2 before you leave.`,
      meals: [
        {
          label: 'Meal 1',
          time: `${addMinutes(start, -180)}–${addMinutes(start, -120)}`,
          description: 'Before your shift — biggest meal of the day.',
          suggestion: 'You have time to cook. Protein, slow carbs, veg. This carries you through the first half of the shift.',
          icon: '🌅'
        },
        {
          label: 'Meal 2',
          time: `${addMinutes(start, 180)}–${addMinutes(start, 240)}`,
          description: 'Mid-shift — you\'re 3 hours in, energy dips now.',
          suggestion: 'Grab-and-go from your bag: wrap, rice pot, fruit and nuts. Something prepped before you left.',
          icon: '🔋'
        },
        {
          label: 'Meal 3',
          time: `${addMinutes(end, 30)}–${addMinutes(end, 75)}`,
          description: 'Post-shift — keep it light, sleep is coming.',
          suggestion: 'Small and protein-led. Avoid heavy carbs or anything spicy — you want to wind down, not spike your energy.',
          icon: '🌙'
        },
      ]
    }
  }

  // ── NIGHT SHIFT (starts 6pm–midnight) ────────────────
  if (startHour >= 18 || startHour <= 2) {
    return {
      prepTip: `Night shift starting ${start} — meal timing is fully inverted tonight. Your body will want to eat at normal times but try to align meals to your waking hours. Avoid heavy meals in the 3–5am window when digestion slows right down.`,
      meals: [
        {
          label: 'Meal 1',
          time: `${subtractMinutes(start, 120)}–${subtractMinutes(start, 60)}`,
          description: 'Pre-shift — your main meal before you go in.',
          suggestion: 'Proper meal: protein, complex carbs, veg. This is your equivalent of lunch. Don\'t skip it.',
          icon: '🌆'
        },
        {
          label: 'Meal 2',
          time: `${addMinutes(start, 180)}–${addMinutes(start, 240)}`,
          description: 'Mid-shift — keep it light, avoid the 3am slump.',
          suggestion: 'Easy on the stomach: yoghurt, fruit, nuts, rice cakes with peanut butter. Avoid anything heavy or fried.',
          icon: '🌙'
        },
        {
          label: 'Meal 3',
          time: `${addMinutes(end, 30)}–${addMinutes(end, 60)}`,
          description: 'Post-shift — small meal before sleep.',
          suggestion: 'Very light: banana, handful of nuts, or a small protein shake. You\'re about to sleep — don\'t overload your digestion.',
          icon: '🌅'
        },
      ]
    }
  }

  // Fallback
  return {
    prepTip: "Align your meals to your waking hours — not the clock. Meal 1 when you wake, Meal 2 mid-way through your day, Meal 3 before sleep.",
    meals: [
      { label: 'Meal 1', time: 'On waking', description: 'First meal of your day.', suggestion: 'Protein and slow carbs to start your day well.', icon: '🌅' },
      { label: 'Meal 2', time: '4–5 hrs later', description: 'Mid-day meal.', suggestion: 'Balanced — protein, carbs, veg.', icon: '☀️' },
      { label: 'Meal 3', time: 'Before sleep', description: 'Wind down meal.', suggestion: 'Light and protein-led.', icon: '🌙' },
    ]
  }
}
export function getNextMeal(shift: TodayShift): string {
  if (!shift || shift.isOff) return 'Rest day'
  const plan = getFoodPlan(shift)
  const now = new Date()
  const currentMins = now.getHours() * 60 + now.getMinutes()

  for (const meal of plan.meals) {
    // Take the start time from the range e.g. "14:00–15:00" → "14:00"
    const startStr = meal.time.split('–')[0].trim()
    if (!startStr.includes(':')) continue
    const [h, m] = startStr.split(':').map(Number)
    const mealMins = h * 60 + m
    if (mealMins > currentMins) {
      return `${meal.label} · ${startStr}`
    }
  }

  return 'Done for today'
}
