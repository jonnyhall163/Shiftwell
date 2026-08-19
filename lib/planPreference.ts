// Carries the pricing plan a visitor picked on the landing page through to
// Stripe checkout.
//
// The journey is landing → /register?plan=X → onboarding → /subscribe, and
// it can be interrupted by the email-confirmation branch (the user leaves
// for their inbox and comes back via login → dashboard paywall →
// /subscribe), so a query param alone can't survive it. Same solution as
// lib/referral.ts uses for referral codes: capture the param into
// localStorage wherever the user lands, read it on /subscribe, clear it
// once checkout actually starts.
//
// Best-effort only — same fail-safe posture as referral.ts: a blocked or
// full localStorage must never break the page that calls this.

const PLAN_STORAGE_KEY = 'shiftwell_plan_preference'

export type Plan = 'annual' | 'monthly'

function normalizePlan(value: string | null | undefined): Plan | null {
  const v = value?.trim().toLowerCase()
  if (v === 'annual' || v === 'yearly') return 'annual'
  if (v === 'monthly') return 'monthly'
  return null
}

/** Reads ?plan=annual|monthly from the current URL and stores it. Unknown values are ignored. */
export function capturePlanFromUrl(): void {
  try {
    if (typeof window === 'undefined') return
    const plan = normalizePlan(new URLSearchParams(window.location.search).get('plan'))
    if (plan) localStorage.setItem(PLAN_STORAGE_KEY, plan)
  } catch {
    // never break the page
  }
}

export function getStoredPlan(): Plan | null {
  try {
    if (typeof window === 'undefined') return null
    return normalizePlan(localStorage.getItem(PLAN_STORAGE_KEY))
  } catch {
    return null
  }
}

export function clearStoredPlan(): void {
  try {
    if (typeof window === 'undefined') return
    localStorage.removeItem(PLAN_STORAGE_KEY)
  } catch {
    // ignore
  }
}
