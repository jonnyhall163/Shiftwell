// Who gets into the paid parts of ShiftWell.
//
// comp_access is a hand-set flag (ambassadors, the founders) that grants
// access regardless of Stripe. It's only settable with the service role:
// a database trigger ignores any attempt by a user to change their own.

export type AccessProfile = {
  comp_access?: boolean | null
  subscription_status?: string | null
} | null | undefined

export function hasCompAccess(profile: AccessProfile): boolean {
  return profile?.comp_access === true
}

/** Server-side gate for the AI endpoints. */
export function hasPaidAccess(profile: AccessProfile): boolean {
  if (!profile) return false
  if (hasCompAccess(profile)) return true
  return profile.subscription_status === 'active' || profile.subscription_status === 'trialing'
}
