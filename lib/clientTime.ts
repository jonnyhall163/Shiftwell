// The user's local date/time, as sent by the browser.
//
// API routes run on UTC servers, so anything computed from `new Date()` on
// the server is wrong for everyone not on UTC — 03:00 in Toronto reads as
// 07:00 ("morning"), and in UK summer time the date flips an hour early.
// The browser sends its own local date, hour and minute (see
// clientTimePayload below), and the server uses those instead.
//
// Everything is validated: a missing or garbage field falls back to the
// server clock rather than throwing, so an old cached client can't break
// the endpoint.

export type ClientTime = {
  localDate: string        // YYYY-MM-DD in the user's timezone
  localHour: number        // 0-23
  localMinute: number      // 0-59
  tzOffsetMinutes: number | null  // JS getTimezoneOffset(): minutes BEHIND UTC (Toronto EDT = 240)
  fromClient: boolean      // false if we had to fall back to the server clock
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

function isInt(n: unknown, min: number, max: number): n is number {
  return typeof n === 'number' && Number.isInteger(n) && n >= min && n <= max
}

export function readClientTime(body: any): ClientTime {
  const b = body || {}
  const valid =
    typeof b.localDate === 'string' && DATE_RE.test(b.localDate) &&
    isInt(b.localHour, 0, 23)

  if (valid) {
    return {
      localDate: b.localDate,
      localHour: b.localHour,
      localMinute: isInt(b.localMinute, 0, 59) ? b.localMinute : 0,
      tzOffsetMinutes: isInt(b.tzOffsetMinutes, -14 * 60, 14 * 60) ? b.tzOffsetMinutes : null,
      fromClient: true,
    }
  }

  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return {
    localDate: `${y}-${m}-${d}`,
    localHour: now.getHours(),
    localMinute: now.getMinutes(),
    tzOffsetMinutes: null,
    fromClient: false,
  }
}

/** "HH:MM", 24-hour. */
export function formatClockTime(t: ClientTime): string {
  return `${String(t.localHour).padStart(2, '0')}:${String(t.localMinute).padStart(2, '0')}`
}

/** "Wednesday, 24 September 2026" for the given YYYY-MM-DD, independent of server timezone. */
export function formatLongDate(dateStr: string, addDays = 0): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  // Noon UTC on that calendar day, formatted in UTC, so the server's own
  // timezone can never nudge it onto a neighbouring day.
  const date = new Date(Date.UTC(y, m - 1, d + addDays, 12))
  return date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
}

/** Weekday name for YYYY-MM-DD plus an offset. */
export function weekdayName(dateStr: string, addDays = 0): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d + addDays, 12))
  return date.toLocaleDateString('en-GB', { weekday: 'long', timeZone: 'UTC' })
}

/** Browser side: the fields to include in a request body. */
export function clientTimePayload(now: Date = new Date()) {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return {
    localDate: `${y}-${m}-${d}`,
    localHour: now.getHours(),
    localMinute: now.getMinutes(),
    tzOffsetMinutes: now.getTimezoneOffset(),
  }
}
