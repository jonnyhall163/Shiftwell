// One-time "Welcome, here's your first briefing" card on the dashboard.
// Onboarding marks it pending on success; the dashboard shows it until the
// user dismisses it. Per device, like the other first-visit bits, and
// localStorage failures just mean no card.

const key = (userId: string) => `sw_welcome_pending_${userId}`

export function markWelcomePending(userId: string) {
  try { localStorage.setItem(key(userId), '1') } catch {}
}

export function isWelcomePending(userId: string | null | undefined): boolean {
  if (!userId) return false
  try { return localStorage.getItem(key(userId)) === '1' } catch { return false }
}

export function dismissWelcome(userId: string) {
  try { localStorage.removeItem(key(userId)) } catch {}
}
