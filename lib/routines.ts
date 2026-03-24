export type RoutineCategory = 'pre-shift' | 'post-shift' | 'rest-day' | 'sleep-prep'

export interface Exercise {
  name: string
  duration: number // seconds
  instruction: string
  rest?: number // seconds rest after
}

export interface Routine {
  id: string
  name: string
  category: RoutineCategory
  duration: number // total minutes
  description: string
  exercises: Exercise[]
}

export const ROUTINES: Routine[] = [
  // ── PRE-SHIFT ────────────────────────────────────────
  {
    id: 'pre-1',
    name: 'Scrubs Ready',
    category: 'pre-shift',
    duration: 15,
    description: 'Do this before any shift — no kit needed. Gets blood flowing and sharpens focus.',
    exercises: [
      { name: 'March on the spot', duration: 60, instruction: 'Lift knees high, swing arms. Wake your body up.', rest: 15 },
      { name: 'Arm circles', duration: 30, instruction: 'Big slow circles forward, then back. Loosen the shoulders.', rest: 10 },
      { name: 'Bodyweight squats', duration: 45, instruction: 'Feet shoulder width, chest up, slow and controlled.', rest: 15 },
      { name: 'Push ups', duration: 40, instruction: 'Any variation — knees fine. Just move.', rest: 15 },
      { name: 'Standing torso twist', duration: 30, instruction: 'Hands on hips, rotate slowly left and right.', rest: 10 },
      { name: 'Jumping jacks', duration: 45, instruction: 'Get the heart rate up. Push through.', rest: 15 },
      { name: 'High knees', duration: 45, instruction: 'Fast as you can manage. Final push.', rest: 15 },
      { name: 'Deep breathing', duration: 60, instruction: 'In for 4, hold for 4, out for 4. Calm and focused.', rest: 0 },
    ]
  },
  {
    id: 'pre-2',
    name: 'Night Shift Ignition',
    category: 'pre-shift',
    duration: 10,
    description: 'Specifically for nights. Fights the pre-shift dip and gets you mentally sharp.',
    exercises: [
      { name: 'Cold water face splash', duration: 30, instruction: 'Splash cold water on your face 5 times. Wakes you up fast.', rest: 10 },
      { name: 'Neck rolls', duration: 30, instruction: 'Slow circles, both directions. Release the tension.', rest: 10 },
      { name: 'Wall push ups', duration: 40, instruction: 'Arms wide, slow. Chest and shoulders.', rest: 10 },
      { name: 'Calf raises', duration: 40, instruction: 'Rise up on toes, hold 2 seconds, lower. Repeat.', rest: 10 },
      { name: 'Bodyweight squats', duration: 45, instruction: 'Slow and deliberate. Feel your legs wake up.', rest: 15 },
      { name: 'Power pose', duration: 60, instruction: 'Stand tall, hands on hips, chin up. You\'ve got this.', rest: 0 },
    ]
  },

  // ── POST-SHIFT ────────────────────────────────────────
  {
    id: 'post-1',
    name: 'Shift Debrief',
    category: 'post-shift',
    duration: 15,
    description: 'Helps your body transition out of work mode. Releases tension and signals it\'s time to recover.',
    exercises: [
      { name: 'Slow neck stretch', duration: 45, instruction: 'Ear to shoulder each side. Hold 15 seconds. No forcing.', rest: 10 },
      { name: 'Shoulder shrugs', duration: 30, instruction: 'Shrug up to ears, hold 3 seconds, release. Let it all go.', rest: 10 },
      { name: 'Seated forward fold', duration: 60, instruction: 'Sit on floor, legs out, reach forward. Breathe into it.', rest: 15 },
      { name: 'Hip flexor stretch', duration: 60, instruction: 'One knee down, lean forward gently. Hold each side 30s.', rest: 10 },
      { name: 'Supine twist', duration: 60, instruction: 'Lie on back, knees to chest, let them fall to one side. Switch.', rest: 10 },
      { name: 'Child\'s pose', duration: 60, instruction: 'Knees wide, arms forward, forehead down. Just breathe.', rest: 10 },
      { name: 'Legs up the wall', duration: 90, instruction: 'Lie down, legs straight up wall. Brilliant for tired legs.', rest: 0 },
    ]
  },
  {
    id: 'post-2',
    name: 'Night Shift Wind Down',
    category: 'post-shift',
    duration: 10,
    description: 'After a night shift your body is wired but exhausted. This bridges the gap before sleep.',
    exercises: [
      { name: 'Slow walk in place', duration: 60, instruction: 'Gentle pace, arms loose. Let your heart rate drop naturally.', rest: 10 },
      { name: 'Standing chest opener', duration: 45, instruction: 'Clasp hands behind back, open chest, look up gently.', rest: 10 },
      { name: 'Seated cat-cow', duration: 45, instruction: 'Sit on edge of bed, arch and round your back slowly.', rest: 10 },
      { name: 'Progressive muscle relax', duration: 90, instruction: 'Tense each muscle group for 5s then release. Feet to face.', rest: 10 },
      { name: '4-7-8 breathing', duration: 90, instruction: 'In for 4, hold for 7, out for 8. Repeat 4 times.', rest: 0 },
    ]
  },

  // ── REST DAY ────────────────────────────────────────
  {
    id: 'rest-1',
    name: 'Kettlebell 15',
    category: 'rest-day',
    duration: 15,
    description: 'The Brandi special. 15 mins, any kit optional. Gets it done without eating into your day.',
    exercises: [
      { name: 'Warm up jog', duration: 60, instruction: 'Jog on the spot, arms loose. Get warm.', rest: 15 },
      { name: 'Kettlebell swings (or squats)', duration: 45, instruction: 'Drive hips forward, not arms. Sub squats if no kettlebell.', rest: 15 },
      { name: 'Push ups', duration: 45, instruction: 'Full or modified. Control the descent.', rest: 15 },
      { name: 'Kettlebell goblet squat (or squat)', duration: 45, instruction: 'Hold weight at chest. Deep squat, chest up.', rest: 15 },
      { name: 'Mountain climbers', duration: 40, instruction: 'Core tight. Drive knees alternately to chest.', rest: 15 },
      { name: 'Kettlebell swings (or squats)', duration: 45, instruction: 'Second round. Push harder than the first.', rest: 15 },
      { name: 'Burpees', duration: 40, instruction: 'Modified fine. This is the finisher.', rest: 20 },
      { name: 'Cool down stretch', duration: 60, instruction: 'Slow full body stretch. You earned it.', rest: 0 },
    ]
  },
  {
    id: 'rest-2',
    name: 'Full Body Reset',
    category: 'rest-day',
    duration: 25,
    description: 'For when you have a bit more time. Proper session — strength, cardio, stretch.',
    exercises: [
      { name: 'Warm up', duration: 120, instruction: 'March, arm circles, leg swings. 2 full minutes.', rest: 15 },
      { name: 'Squats — 3 sets', duration: 90, instruction: '10 reps per set, 10 second rest between. Controlled.', rest: 20 },
      { name: 'Push ups — 3 sets', duration: 75, instruction: '8-10 reps. Full range of motion.', rest: 20 },
      { name: 'Reverse lunges', duration: 60, instruction: 'Step back, knee hovers floor. 8 each side.', rest: 15 },
      { name: 'Plank hold', duration: 45, instruction: 'Forearms or hands. Core tight, breathe.', rest: 15 },
      { name: 'Jumping jacks', duration: 60, instruction: 'Cardio burst. Full minute, don\'t stop.', rest: 15 },
      { name: 'High knees', duration: 45, instruction: 'Drive those knees. Last cardio effort.', rest: 20 },
      { name: 'Full body stretch', duration: 120, instruction: 'Hamstrings, hip flexors, chest, shoulders. Take your time.', rest: 0 },
    ]
  },
  {
    id: 'rest-3',
    name: 'Runner\'s Strength',
    category: 'rest-day',
    duration: 20,
    description: 'Built for runners. Targets the muscles shift work neglects — glutes, hips, core.',
    exercises: [
      { name: 'Glute bridges', duration: 45, instruction: 'Feet flat, drive hips up, squeeze at top. 12 reps.', rest: 15 },
      { name: 'Single leg glute bridge', duration: 50, instruction: 'One leg extended. 8 each side. Feel the glute work.', rest: 15 },
      { name: 'Clamshells', duration: 45, instruction: 'Side lying, knees bent, open like a clamshell. 12 each side.', rest: 15 },
      { name: 'Dead bugs', duration: 50, instruction: 'On back, opposite arm and leg extend slowly. Core stays flat.', rest: 15 },
      { name: 'Side plank', duration: 40, instruction: '20 seconds each side. Hip up, body straight.', rest: 15 },
      { name: 'Step ups', duration: 50, instruction: 'Use stairs or a sturdy chair. 10 each leg.', rest: 15 },
      { name: 'Hip flexor stretch', duration: 60, instruction: 'Kneeling lunge. Hold 30s each. Critical for runners.', rest: 10 },
      { name: 'IT band stretch', duration: 60, instruction: 'Cross one leg behind, lean to side. Hold 30s each.', rest: 0 },
    ]
  },

  // ── SLEEP PREP ────────────────────────────────────────
  {
    id: 'sleep-1',
    name: 'Pre-Sleep Wind Down',
    category: 'sleep-prep',
    duration: 10,
    description: 'Do this 20 minutes before sleep — day or night. Tells your nervous system it\'s time to switch off.',
    exercises: [
      { name: 'Slow breathing', duration: 60, instruction: 'In for 4 counts, out for 6. Longer exhale activates rest mode.', rest: 5 },
      { name: 'Neck and shoulder release', duration: 45, instruction: 'Gentle tilts and rolls. No forcing. Just release.', rest: 10 },
      { name: 'Supine knee hug', duration: 45, instruction: 'Lie down, pull both knees to chest. Rock gently.', rest: 10 },
      { name: 'Supine twist', duration: 60, instruction: 'Knees to chest then drop to one side. Switch after 30s.', rest: 10 },
      { name: 'Legs up wall', duration: 90, instruction: 'Lie near wall, legs vertical. Eyes closed. Just breathe.', rest: 10 },
      { name: 'Body scan', duration: 90, instruction: 'Eyes closed. Notice each body part from feet up. Let go of tension.', rest: 0 },
    ]
  },
  {
    id: 'sleep-2',
    name: 'Day Sleep Prep',
    category: 'sleep-prep',
    duration: 8,
    description: 'Specifically for sleeping during the day after nights. Combats the cortisol spike from morning light.',
    exercises: [
      { name: 'Blackout check', duration: 30, instruction: 'Make sure room is as dark as possible before you start.', rest: 5 },
      { name: 'Progressive relaxation', duration: 120, instruction: 'Tense and release each muscle group. Start at your feet.', rest: 10 },
      { name: 'Box breathing', duration: 60, instruction: 'In 4, hold 4, out 4, hold 4. Repeat 4 times.', rest: 10 },
      { name: 'Visualisation', duration: 90, instruction: 'Picture a calm place. Beach, forest, wherever feels safe.', rest: 10 },
      { name: 'Countdown', duration: 60, instruction: 'Count down slowly from 100. If you lose your place, start again.', rest: 0 },
    ]
  },
]

export function getRecommendedRoutine(shiftLabel: string, isOff: boolean, hour: number): Routine {
  // Post-shift — just finished work
  if (hour >= 6 && hour <= 10 && !isOff) {
    return ROUTINES.find(r => r.id === 'post-2') || ROUTINES[2]
  }

  // Pre-shift — heading into nights
  if (hour >= 18 && hour <= 22 && !isOff) {
    return ROUTINES.find(r => r.id === 'pre-2') || ROUTINES[0]
  }

  // Pre-shift — heading into days or lates
  if (hour >= 5 && hour <= 12 && !isOff) {
    return ROUTINES.find(r => r.id === 'pre-1') || ROUTINES[0]
  }

  // Rest day
  if (isOff) {
    return ROUTINES.find(r => r.id === 'rest-1') || ROUTINES[4]
  }

  // Post-shift general
  if (!isOff) {
    return ROUTINES.find(r => r.id === 'post-1') || ROUTINES[2]
  }

  return ROUTINES[0]
}

export const CATEGORY_META: Record<RoutineCategory, { label: string, icon: string, colour: string }> = {
  'pre-shift':  { label: 'Pre-shift',  icon: '⚡', colour: 'text-amber-400' },
  'post-shift': { label: 'Post-shift', icon: '🌊', colour: 'text-blue-400' },
  'rest-day':   { label: 'Rest day',   icon: '💪', colour: 'text-teal-400' },
  'sleep-prep': { label: 'Sleep prep', icon: '🌙', colour: 'text-indigo-400' },
}
