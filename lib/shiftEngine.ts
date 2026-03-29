// ── Types ────────────────────────────────────────────────

export type ShiftType = 'fixed' | 'nights' | 'variable'

export interface ShiftDefinition {
  label: string        // e.g. "Early", "Late", "Night", "Off"
  startTime: string    // e.g. "06:00"
  endTime: string      // e.g. "14:00"
  isOff: boolean       // true = rest day
}

export interface FixedPatternData {
  type: 'fixed'
  cycleLength: number           // e.g. 28 days
  shifts: ShiftDefinition[]     // the shift types available
  rotation: number[]            // index into shifts[] for each day of cycle e.g. [0,0,1,1,2,2,3,3...]
  startDate: string             // ISO date — day 1 of the cycle e.g. "2024-01-01"
}

export interface NightsPatternData {
  type: 'nights'
  shift: ShiftDefinition        // the single night shift definition
  startTime: string             // when nights started e.g. "2024-01-01"
}

export interface VariablePatternData {
  type: 'variable'
  schedule: {
    date: string       // ISO date e.g. "2026-03-30"
    label: string      // e.g. "Early", "Night", "Off"
    startTime: string  // e.g. "06:00"
    endTime: string    // e.g. "14:00"
    isOff: boolean
  }[]
}

export type PatternData = FixedPatternData | NightsPatternData | VariablePatternData

export interface TodayShift {
  label: string
  startTime: string
  endTime: string
  isOff: boolean
  dayInCycle: number | null
}

// ── Engine ───────────────────────────────────────────────

export function getTodayShift(patternData: PatternData): TodayShift {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStr = today.toISOString().split('T')[0]

  if (patternData.type === 'variable') {
    const entry = patternData.schedule.find(s => s.date === todayStr)
    if (entry) {
      return {
        label: entry.label,
        startTime: entry.startTime,
        endTime: entry.endTime,
        isOff: entry.isOff,
        dayInCycle: null,
      }
    }
    return {
      label: 'No shift set',
      startTime: '',
      endTime: '',
      isOff: false,
      dayInCycle: null,
    }
  }

  if (patternData.type === 'nights') {
    return {
      label: 'Night Shift',
      startTime: patternData.shift.startTime,
      endTime: patternData.shift.endTime,
      isOff: false,
      dayInCycle: null,
    }
  }

  if (patternData.type === 'fixed') {
    const start = new Date(patternData.startDate)
    start.setHours(0, 0, 0, 0)

    const diffMs = today.getTime() - start.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    const dayInCycle = ((diffDays % patternData.cycleLength) + patternData.cycleLength) % patternData.cycleLength

    const shiftIndex = patternData.rotation[dayInCycle]
    const shift = patternData.shifts[shiftIndex]

    return {
      label: shift.label,
      startTime: shift.startTime,
      endTime: shift.endTime,
      isOff: shift.isOff,
      dayInCycle: dayInCycle + 1,
    }
  }

  return {
    label: 'Unknown',
    startTime: '',
    endTime: '',
    isOff: false,
    dayInCycle: null,
  }
}

export function getUpcomingShifts(patternData: PatternData, days: number = 7): TodayShift[] {
  const upcoming: TodayShift[] = []

  for (let i = 0; i < days; i++) {
    const date = new Date()
    date.setHours(0, 0, 0, 0)
    date.setDate(date.getDate() + i)
    const dateStr = date.toISOString().split('T')[0]

    if (patternData.type === 'variable') {
      const entry = patternData.schedule.find(s => s.date === dateStr)
      if (entry) {
        upcoming.push({
          label: entry.label,
          startTime: entry.startTime,
          endTime: entry.endTime,
          isOff: entry.isOff,
          dayInCycle: null,
        })
      } else {
        upcoming.push({
          label: 'No shift set',
          startTime: '',
          endTime: '',
          isOff: false,
          dayInCycle: null,
        })
      }
      continue
    }

    if (patternData.type === 'nights') {
      upcoming.push({
        label: 'Night Shift',
        startTime: patternData.shift.startTime,
        endTime: patternData.shift.endTime,
        isOff: false,
        dayInCycle: null,
      })
      continue
    }

    if (patternData.type === 'fixed') {
      const start = new Date(patternData.startDate)
      start.setHours(0, 0, 0, 0)

      const diffMs = date.getTime() - start.getTime()
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
      const dayInCycle = ((diffDays % patternData.cycleLength) + patternData.cycleLength) % patternData.cycleLength

      const shiftIndex = patternData.rotation[dayInCycle]
      const shift = patternData.shifts[shiftIndex]

      upcoming.push({
        label: shift.label,
        startTime: shift.startTime,
        endTime: shift.endTime,
        isOff: shift.isOff,
        dayInCycle: dayInCycle + 1,
      })
    }
  }

  return upcoming
}

export function formatShiftTime(startTime: string, endTime: string): string {
  if (!startTime || !endTime) return ''
  return `${startTime} – ${endTime}`
}
