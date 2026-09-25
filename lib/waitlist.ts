// Launch-list helpers shared by /api/waitlist and its tests.

export const WAITLIST_SOURCE = 'ios_waitlist'
export type WaitlistEntryPoint = 'landing' | 'dashboard'

// Same rule as the table's check constraint, so anything we accept the
// database accepts too.
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

/** Trimmed, lower-cased email, or null if it isn't a plausible address. */
export function normalizeEmail(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const email = raw.trim().toLowerCase()
  if (!email || email.length > 254 || !EMAIL_RE.test(email)) return null
  return email
}

// In-memory rate limit, per server instance (same trade-off as the
// companion's): enough to stop a script hammering the form, without a table.
const hits = new Map<string, number[]>()
const LIMITS = [
  { windowMs: 60 * 1000, max: 5 },
  { windowMs: 60 * 60 * 1000, max: 20 },
]

export function isWaitlistRateLimited(key: string, now = Date.now()): boolean {
  const longest = Math.max(...LIMITS.map(l => l.windowMs))
  const recent = (hits.get(key) || []).filter(t => now - t < longest)
  const limited = LIMITS.some(l => recent.filter(t => now - t < l.windowMs).length >= l.max)
  if (!limited) recent.push(now)
  hits.set(key, recent)
  if (hits.size > 5000) {
    hits.forEach((times, k) => { if (!times.some(t => now - t < longest)) hits.delete(k) })
  }
  return limited
}
