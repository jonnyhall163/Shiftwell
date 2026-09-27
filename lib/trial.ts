// Free trial length for new web signups.
//
// Stripe sets the real trial: checkout passes TRIAL_DAYS and the webhook
// copies Stripe's trial_end into shiftwell_profiles.trial_ends_at.
//
// The column's database default is still now() + 14 days (the database is
// shared with the iOS app, so it isn't changed from here). That default
// only decides access for someone who opens checkout and then leaves
// without subscribing: they have a Stripe customer, so the paywall lets
// them in until trial_ends_at. For accounts created from
// SEVEN_DAY_TRIAL_FROM onwards, checkout brings that date in to
// signup + TRIAL_DAYS. Older accounts keep the trial they signed up with.

export const TRIAL_DAYS = 7

// Set just before this shipped; no account had been created after it then.
export const SEVEN_DAY_TRIAL_FROM = new Date('2026-09-27T23:00:00Z')

export type TrialProfile = {
  created_at?: string | null
  trial_ends_at?: string | null
  subscription_status?: string | null
  subscription_id?: string | null
  comp_access?: boolean | null
}

/**
 * The trial_ends_at to write for a new signup who hasn't subscribed yet, or
 * null if the stored value should be left alone (older account, already
 * subscribed or subscribing, comp account, or already within 7 days).
 */
export function newSignupTrialEnd(profile: TrialProfile | null | undefined): string | null {
  if (!profile?.created_at || !profile.trial_ends_at) return null
  if (profile.subscription_status !== 'trialing' || profile.subscription_id || profile.comp_access) return null
  const created = new Date(profile.created_at)
  const current = new Date(profile.trial_ends_at)
  if (isNaN(created.getTime()) || isNaN(current.getTime())) return null
  if (created < SEVEN_DAY_TRIAL_FROM) return null
  const end = new Date(created.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000)
  return current > end ? end.toISOString() : null
}
