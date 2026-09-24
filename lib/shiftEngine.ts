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

// Parses a "YYYY-MM-DD" string as a local-midnight Date, avoiding the UTC
// parsing that `new Date(dateString)` applies to date-only ISO strings.
function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}

// Whole calendar days between two dates, computed from their Y/M/D components
// so DST transitions between `from` and `to` can never shift the result by an hour.
function daysBetween(from: Date, to: Date): number {
  const utcFrom = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate())
  const utcTo = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate())
  return Math.round((utcTo - utcFrom) / (1000 * 60 * 60 * 24))
}

// "YYYY-MM-DD" from a Date's LOCAL calendar fields. toISOString() converts
// to UTC first, so local midnight becomes the previous day anywhere ahead
// of UTC (UK summer time, Europe, Australia) — which is how variable
// schedules were looking up yesterday's shift.
export function toLocalDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const DATE_STR_RE = /^\d{4}-\d{2}-\d{2}$/

// Resolves the "today" to calculate from. The server runs on UTC, so API
// routes should pass the client's own local date; anything missing or
// malformed falls back to this machine's local date.
function resolveDate(onDate?: string | null): Date {
  if (onDate && DATE_STR_RE.test(onDate)) {
    const d = parseLocalDate(onDate)
    if (!isNaN(d.getTime())) return d
  }
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

function shiftForDate(patternData: PatternData, date: Date): TodayShift {
  if (patternData.type === 'variable') {
    const dateStr = toLocalDateStr(date)
    const entry = patternData.schedule.find(s => s.date === dateStr)
    if (entry) {
      return {
        label: entry.label,
        startTime: entry.startTime,
        endTime: entry.endTime,
        isOff: entry.isOff,
        dayInCycle: null,
      }
    }
    return { label: 'No shift set', startTime: '', endTime: '', isOff: false, dayInCycle: null }
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
    const start = parseLocalDate(patternData.startDate)
    const diffDays = daysBetween(start, date)
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

  return { label: 'Unknown', startTime: '', endTime: '', isOff: false, dayInCycle: null }
}

/**
 * Today's shift. Pass `onDate` ("YYYY-MM-DD", the user's local date) from
 * server code — without it, "today" is the server's date, which is UTC.
 */
export function getTodayShift(patternData: PatternData, onDate?: string | null): TodayShift {
  return shiftForDate(patternData, resolveDate(onDate))
}

/** The next `days` shifts starting from `fromDate` (user's local date) or today. */
export function getUpcomingShifts(patternData: PatternData, days: number = 7, fromDate?: string | null): TodayShift[] {
  const base = resolveDate(fromDate)
  const upcoming: TodayShift[] = []
  for (let i = 0; i < days; i++) {
    const date = new Date(base.getFullYear(), base.getMonth(), base.getDate() + i)
    upcoming.push(shiftForDate(patternData, date))
  }
  return upcoming
}

export function formatShiftTime(startTime: string, endTime: string): string {
  if (!startTime || !endTime) return ''
  return `${startTime} – ${endTime}`
}
