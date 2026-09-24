// The web briefing cache, stored in shiftwell_profiles.briefing_cache (text)
// and briefing_date (a real `date` column).
//
// A briefing is reused within one time block of one day. The block used to
// be appended to briefing_date ("2026-09-24-morning"), which Postgres
// rejects for a date column, so no briefing was cached from 1 April 2026
// and every dashboard load waited on a fresh Claude call. Now the date goes
// in briefing_date and the block travels inside briefing_cache as JSON.
//
// Old plain-text caches don't parse, so they simply count as a miss.

type Stored = { v: 1; block: string; text: string }

export function encodeBriefingCache(block: string, text: string): string {
  const stored: Stored = { v: 1, block, text }
  return JSON.stringify(stored)
}

/** The cached text if it's for this date and time block, otherwise null. */
export function readBriefingCache(
  cache: string | null | undefined,
  cacheDate: string | null | undefined,
  todayDate: string,
  block: string
): string | null {
  if (!cache || cacheDate !== todayDate) return null
  try {
    const stored = JSON.parse(cache) as Partial<Stored>
    if (stored?.v !== 1 || stored.block !== block || typeof stored.text !== 'string' || !stored.text) return null
    return stored.text
  } catch {
    return null
  }
}
