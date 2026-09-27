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

/**
 * Short subscription status for the dashboard menus. Trials show their real
 * end date rather than a length, since older trials were 14 days and new
 * ones are 7.
 */
export function subscriptionLabel(
  profile: (AccessProfile & { trial_ends_at?: string | null }) | null | undefined
): string {
  if (hasCompAccess(profile)) return 'Free access'
  switch (profile?.subscription_status) {
    case 'active': return 'Active'
    case 'trialing': {
      const end = profile?.trial_ends_at ? new Date(profile.trial_ends_at) : null
      if (!end || isNaN(end.getTime())) return 'Free trial'
      return `Free trial until ${end.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`
    }
    case 'past_due': return 'Payment failed'
    case 'canceled': return 'Canceled'
    default: return 'Manage'
  }
}
