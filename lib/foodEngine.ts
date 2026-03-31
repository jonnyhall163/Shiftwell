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

// ── Diet-aware protein suggestion ────────────────────
function protein(restrictions: string[]): string {
  const isVegan = restrictions.includes('Vegan')
  const isVegetarian = restrictions.includes('Vegetarian')
  const isHalal = restrictions.includes('Halal')
  const noPork = restrictions.includes('No pork') || isHalal
  const isDairyFree = restrictions.includes('Dairy-free')
  const isGlutenFree = restrictions.includes('Gluten-free')

  if (isVegan) return 'tofu, tempeh, lentils, or chickpeas'
  if (isVegetarian) return 'eggs, halloumi, lentils, or chickpeas'
  if (noPork) return 'chicken, turkey, beef, fish, or eggs'
  return 'chicken, eggs, fish, or lean meat'
}

function quickSnack(restrictions: string[]): string {
  const isVegan = restrictions.includes('Vegan')
  const isVegetarian = restrictions.includes('Vegetarian')
  const isDairyFree = restrictions.includes('Dairy-free')
  const isGlutenFree = restrictions.includes('Gluten-free')

  if (isVegan) return 'fruit, nuts, rice cakes with nut butter, or a cereal bar'
  if (isDairyFree) return 'fruit, nuts, rice cakes with nut butter, or a protein bar'
  if (isGlutenFree) return 'fruit, nuts, rice cakes, or yoghurt'
  return 'yoghurt, fruit, nuts, rice cakes with peanut butter'
}

function preMeal(restrictions: string[]): string {
  const isVegan = restrictions.includes('Vegan')
  const isVegetarian = restrictions.includes('Vegetarian')
  const isGlutenFree = restrictions.includes('Gluten-free')
  const isDairyFree = restrictions.includes('Dairy-free')

  if (isVegan) {
    if (isGlutenFree) return 'overnight oats (GF oats), banana with nut butter, or a smoothie'
    return 'overnight oats, banana with peanut butter, or a smoothie'
  }
  if (isVegetarian) {
    if (isGlutenFree) return 'GF overnight oats, banana and nut butter, or a yoghurt with fruit'
    return 'overnight oats, banana and peanut butter, or yoghurt with granola'
  }
  if (isGlutenFree) return 'banana with nut butter, GF overnight oats, or eggs'
  return 'overnight oats, banana and peanut butter, or a protein bar'
}

function postShiftMeal(restrictions: string[]): string {
  const p = protein(restrictions)
  const isLowCarb = restrictions.includes('Low carb')
  const isGlutenFree = restrictions.includes('Gluten-free')

  if (isLowCarb) return `${p} with plenty of veg and salad — keep carbs minimal`
  return `${p} with veg${isGlutenFree ? ' and rice or potatoes' : ' and rice, potatoes, or wholegrain'}`
}

function mainMeal(restrictions: string[]): string {
  const p = protein(restrictions)
  const isLowCarb = restrictions.includes('Low carb')
  const isGlutenFree = restrictions.includes('Gluten-free')

  if (isLowCarb) return `${p} with roasted veg or a big salad — skip the heavy carbs`
  if (isGlutenFree) return `${p} with rice, potatoes, or quinoa and veg`
  return `${p} with wholegrain carbs and veg`
}

// ── Diet restriction note ─────────────────────────────
function dietNote(restrictions: string[]): string {
  if (!restrictions || restrictions.length === 0) return ''
  return ` (${restrictions.join(', ')})`
}

export function getFoodPlan(shift: TodayShift, dietaryRestrictions: string[] = []): FoodPlan {
  const r = dietaryRestrictions

  // ── REST DAY ───────────────────────────────────────
  if (shift.isOff) {
    return {
      prepTip: `Rest day — no shift constraints today. Use this time to batch cook for your upcoming shifts. Even 30 mins of prep saves you all week.${dietNote(r)}`,
      meals: [
        {
          label: 'Meal 1',
          time: '08:00–09:30',
          description: 'Start of day — take your time with this one.',
          suggestion: r.includes('Vegan')
            ? 'Tofu scramble or overnight oats with fruit and nuts. Proper fuel with no rush.'
            : r.includes('Vegetarian')
            ? 'Eggs any style, wholegrain toast, fruit. Proper fuel with no rush.'
            : `${protein(r)} with wholegrain toast or oats and fruit. Proper fuel with no rush.`,
          icon: '🌅'
        },
        {
          label: 'Meal 2',
          time: '13:00–14:00',
          description: 'Midday — keep it balanced.',
          suggestion: `Good day to batch cook. Make extra ${protein(r)} for shift days — saves you when you're tired and time-poor.`,
          icon: '☀️'
        },
        {
          label: 'Meal 3',
          time: '18:00–19:30',
          description: 'Evening — wind down meal.',
          suggestion: `${mainMeal(r)}. No need to eat late tonight.`,
          icon: '🌙'
        },
      ]
    }
  }

  const start = shift.startTime
  const end = shift.endTime
  const startHour = parseInt(start.split(':')[0])

  // ── EARLY SHIFT ────────────────────────────────────
  if (startHour >= 4 && startHour <= 10) {
    return {
      prepTip: `Early start at ${start} — your biggest enemy is skipping Meal 1. Even something small before you leave is better than nothing. Prep Meal 2 the night before.${dietNote(r)}`,
      meals: [
        {
          label: 'Meal 1',
          time: `${subtractMinutes(start, 45)}–${subtractMinutes(start, 15)}`,
          description: 'Before you leave — small but essential.',
          suggestion: `Quick and easy: ${preMeal(r)}. Something is always better than nothing.`,
          icon: '⚡'
        },
        {
          label: 'Meal 2',
          time: `${addMinutes(start, 180)}–${addMinutes(start, 240)}`,
          description: 'Mid-shift — energy top up.',
          suggestion: `Prepped the night before ideally. ${r.includes('Gluten-free') ? 'Rice pot or GF wrap' : 'Rice pot, wrap, or a sandwich'} with ${protein(r)}. Avoid heavy carbs here.`,
          icon: '🔋'
        },
        {
          label: 'Meal 3',
          time: `${addMinutes(end, 30)}–${addMinutes(end, 90)}`,
          description: 'Post-shift recovery meal.',
          suggestion: `${postShiftMeal(r)}. You're winding down — keep it light on carbs.`,
          icon: '🌙'
        },
      ]
    }
  }

  // ── LATE SHIFT ─────────────────────────────────────
  if (startHour >= 11 && startHour <= 17) {
    return {
      prepTip: `Late shift starting ${start} — you have time this morning. A proper Meal 1 now sets you up for the whole shift. Pack Meal 2 before you leave.${dietNote(r)}`,
      meals: [
        {
          label: 'Meal 1',
          time: `${addMinutes(start, -180)}–${addMinutes(start, -120)}`,
          description: 'Before your shift — biggest meal of the day.',
          suggestion: `You have time to cook. ${mainMeal(r)}. This carries you through the first half of the shift.`,
          icon: '🌅'
        },
        {
          label: 'Meal 2',
          time: `${addMinutes(start, 180)}–${addMinutes(start, 240)}`,
          description: "Mid-shift — you're 3 hours in, energy dips now.",
          suggestion: `Grab-and-go from your bag: ${r.includes('Gluten-free') ? 'rice pot, GF crackers with nut butter, or fruit and nuts' : 'wrap, rice pot, or fruit and nuts'}. Something prepped before you left.`,
          icon: '🔋'
        },
        {
          label: 'Meal 3',
          time: `${addMinutes(end, 30)}–${addMinutes(end, 75)}`,
          description: 'Post-shift — keep it light, sleep is coming.',
          suggestion: `Small and protein-led: ${protein(r)} with veg. Avoid anything heavy or spicy — you want to wind down, not spike your energy.`,
          icon: '🌙'
        },
      ]
    }
  }

  // ── NIGHT SHIFT ────────────────────────────────────
  if (startHour >= 18 || startHour <= 2) {
    return {
      prepTip: `Night shift starting ${start} — meal timing is fully inverted tonight. Avoid heavy meals in the 3–5am window when digestion slows right down.${dietNote(r)}`,
      meals: [
        {
          label: 'Meal 1',
          time: `${subtractMinutes(start, 120)}–${subtractMinutes(start, 60)}`,
          description: 'Pre-shift — your main meal before you go in.',
          suggestion: `Proper meal: ${mainMeal(r)}. This is your equivalent of lunch. Don't skip it.`,
          icon: '🌆'
        },
        {
          label: 'Meal 2',
          time: `${addMinutes(start, 180)}–${addMinutes(start, 240)}`,
          description: 'Mid-shift — keep it light, avoid the 3am slump.',
          suggestion: `Easy on the stomach: ${quickSnack(r)}. Avoid anything heavy or fried.`,
          icon: '🌙'
        },
        {
          label: 'Meal 3',
          time: `${addMinutes(end, 30)}–${addMinutes(end, 60)}`,
          description: 'Post-shift — small meal before sleep.',
          suggestion: `Very light: banana, handful of nuts, or a small ${r.includes('Vegan') ? 'plant-based protein shake' : 'protein shake'}. You're about to sleep — don't overload your digestion.`,
          icon: '🌅'
        },
      ]
    }
  }

  // Fallback
  return {
    prepTip: `Align your meals to your waking hours — not the clock.${dietNote(r)}`,
    meals: [
      { label: 'Meal 1', time: 'On waking', description: 'First meal of your day.', suggestion: `${protein(r)} and slow carbs to start your day well.`, icon: '🌅' },
      { label: 'Meal 2', time: '4–5 hrs later', description: 'Mid-day meal.', suggestion: `Balanced — ${mainMeal(r)}.`, icon: '☀️' },
      { label: 'Meal 3', time: 'Before sleep', description: 'Wind down meal.', suggestion: `Light and protein-led: ${protein(r)} with veg.`, icon: '🌙' },
    ]
  }
}

export function getNextMeal(shift: TodayShift, dietaryRestrictions: string[] = []): string {
  if (!shift || shift.isOff) return 'Rest day'
  const plan = getFoodPlan(shift, dietaryRestrictions)
  const now = new Date()
  const currentMins = now.getHours() * 60 + now.getMinutes()

  for (const meal of plan.meals) {
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
