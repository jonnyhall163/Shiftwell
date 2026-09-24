// Server-side guards for /api/companion, kept separate so they can be
// tested without Supabase or the Anthropic API.

// ── Limits ───────────────────────────────────────────────
export const MAX_MESSAGE_CHARS = 2000
export const MAX_HISTORY_MESSAGES = 20
export const RATE_LIMIT_MAX = 30
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000 // 30 messages per rolling hour

// In-memory, per server instance. A durable limit would need a Supabase
// table, and the database is shared with the iOS app, so that's a schema
// change to agree first — this caps runaway use within an instance in the
// meantime. Cold starts and multiple instances each get their own counter.
const recentSends = new Map<string, number[]>()

export function isRateLimited(userId: string): boolean {
  const now = Date.now()
  const windowStart = now - RATE_LIMIT_WINDOW_MS
  const sends = (recentSends.get(userId) || []).filter(t => t > windowStart)
  if (sends.length >= RATE_LIMIT_MAX) {
    recentSends.set(userId, sends)
    return true
  }
  sends.push(now)
  recentSends.set(userId, sends)

  // Keep the map from growing without bound on a long-lived instance.
  if (recentSends.size > 5000) {
    recentSends.forEach((ts, id) => {
      if (!ts.some(t => t > windowStart)) recentSends.delete(id)
    })
  }
  return false
}

export type ChatMessage = { role: 'user' | 'assistant'; content: string }

// The history comes from the browser, so none of it is trusted: only
// user/assistant roles, only non-empty strings within the length cap
// (our own replies are capped at 300 tokens, so an "assistant" turn longer
// than that is not one of ours), last 20 only, starting on a user turn as
// the API requires.
export function sanitizeHistory(raw: unknown): ChatMessage[] {
  if (!Array.isArray(raw)) return []
  const clean: ChatMessage[] = raw
    .filter((m: any) =>
      m && (m.role === 'user' || m.role === 'assistant') &&
      typeof m.content === 'string' &&
      m.content.trim().length > 0 &&
      m.content.length <= MAX_MESSAGE_CHARS
    )
    .map((m: any) => ({ role: m.role, content: m.content }))

  const recent = clean.slice(-MAX_HISTORY_MESSAGES)
  while (recent.length && recent[0].role !== 'user') recent.shift()
  return recent
}
