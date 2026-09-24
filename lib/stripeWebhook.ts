// Stripe webhook event handling, kept separate from the HTTP route so it can
// be exercised with a fake Stripe + Supabase (see the route in
// pages/api/stripe/webhook.ts for signature verification).
//
// Two rules drive everything here:
//
// 1. Never trust the event payload's status. Stripe doesn't guarantee
//    delivery order, so a late `customer.subscription.updated` (trialing)
//    can land after the one that made it `active`. Every event re-fetches
//    the subscription from Stripe and writes what Stripe says *now*.
//
// 2. A £0 invoice is not a payment. Stripe sends `invoice.payment_succeeded`
//    for the £0 invoice at the start of every trial. It used to mark the
//    user active and pay the referrer on day one of a trial.

import type Stripe from 'stripe'
import type { SupabaseClient } from '@supabase/supabase-js'

export type WebhookDeps = {
  stripe: Pick<Stripe, 'subscriptions' | 'customers'>
  supabase: SupabaseClient
  yearlyPriceId?: string
  // ShiftWell's own Stripe prices. The Stripe account is shared with other
  // products, whose subscription events reach this webhook too; anything
  // not on one of these prices is ignored. Empty = no filtering.
  shiftwellPriceIds?: string[]
  log?: Pick<Console, 'log' | 'error' | 'warn'>
}

export const REFERRAL_MONTHLY_CREDIT_PENCE = 799 // £7.99 — one month on the monthly plan

// trial_ends_at values after this are hand-set complimentary accounts
// (Jonny, Ashleigh), not Stripe trials. Stripe must never overwrite them.
const COMP_TRIAL_CUTOFF = new Date('2029-01-01T00:00:00Z')

// Statuses that grant access. Everything else — canceled, past_due,
// unpaid, incomplete, incomplete_expired, paused — does not.
export const ACCESS_STATUSES = ['active', 'trialing'] as const
export function statusGrantsAccess(status: string | null | undefined): boolean {
  return !!status && (ACCESS_STATUSES as readonly string[]).includes(status)
}

// Thrown for failures Stripe should retry (DB write failed, Stripe API
// unreachable). The route turns it into a 500.
export class RetryableWebhookError extends Error {}

const toIso = (unix: number | null | undefined) =>
  unix ? new Date(unix * 1000).toISOString() : null

// API 2025-03-31 (basil) moved current_period_end from the subscription to
// each subscription item. Read the item first, fall back for older payloads.
export function periodEnd(sub: Stripe.Subscription): number | null {
  const itemEnd = (sub.items?.data?.[0] as any)?.current_period_end
  return itemEnd ?? (sub as any).current_period_end ?? null
}

// Basil also moved invoice.subscription under invoice.parent.
export function invoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  const fromParent = (invoice as any).parent?.subscription_details?.subscription
  const legacy = (invoice as any).subscription
  const ref = fromParent ?? legacy
  if (!ref) return null
  return typeof ref === 'string' ? ref : ref.id
}

const customerIdOf = (obj: { customer?: string | { id: string } | null }): string | null => {
  const c = obj.customer
  if (!c) return null
  return typeof c === 'string' ? c : c.id
}

type ProfileRow = {
  id: string
  subscription_id: string | null
  trial_ends_at: string | null
  comp_access: boolean | null
}

async function findProfile(deps: WebhookDeps, customerId: string): Promise<ProfileRow | null> {
  const { supabase, stripe } = deps
  const { data, error } = await supabase
    .from('shiftwell_profiles')
    .select('id, subscription_id, trial_ends_at, comp_access')
    .eq('stripe_customer_id', customerId)
    .maybeSingle()
  if (error) throw new RetryableWebhookError(`Profile lookup failed: ${error.message}`)
  if (data) return data as ProfileRow

  // No row carries this customer id. For example, checkout.ts's write of
  // stripe_customer_id didn't stick. The customer was created with the
  // Supabase user id in its metadata, so link it up via that, but only
  // onto a row that has no customer yet.
  const customer = await stripe.customers.retrieve(customerId).catch(() => null)
  const userId = customer && !(customer as any).deleted
    ? (customer as Stripe.Customer).metadata?.supabase_user_id
    : null
  if (!userId) return null

  const { data: linked, error: linkError } = await supabase
    .from('shiftwell_profiles')
    .update({ stripe_customer_id: customerId })
    .eq('id', userId)
    .is('stripe_customer_id', null)
    .select('id, subscription_id, trial_ends_at, comp_access')
    .maybeSingle()
  if (linkError) throw new RetryableWebhookError(`Profile link failed: ${linkError.message}`)
  if (linked) {
    deps.log?.log(`Linked Stripe customer ${customerId} to profile ${userId} via metadata`)
    return linked as ProfileRow
  }

  // This customer is definitely a ShiftWell user (checkout stamped their
  // id on it), yet we can't see or link their row. The old handler
  // answered 200 here and silently dropped every event. The usual cause is
  // a key without service-role rights, where row-level security hides every
  // row. Fail loudly so Stripe retries and shows it as failing.
  const { data: exists } = await supabase
    .from('shiftwell_profiles')
    .select('id, stripe_customer_id')
    .eq('id', userId)
    .maybeSingle()
  if (!exists) {
    // Either the user deleted their account (nothing to update, don't make
    // Stripe retry for days) or this key can't see any rows at all.
    if (!(await canSeeProfiles(deps))) {
      throw new RetryableWebhookError(`Profile ${userId} (customer ${customerId}) is not visible: check SUPABASE_SERVICE_ROLE_KEY is the service-role key`)
    }
    deps.log?.warn(`Profile ${userId} for customer ${customerId} no longer exists (deleted account?); ignoring`)
    return null
  }
  deps.log?.warn(`Profile ${userId} already has customer ${exists.stripe_customer_id}; not linking ${customerId}`)
  return null
}

// True if this key can see profile rows at all. With a non-service key,
// row-level security hides every row without an error, which is how the
// old webhook failed silently from March to September 2026.
async function canSeeProfiles(deps: WebhookDeps): Promise<boolean> {
  const { data, error } = await deps.supabase.from('shiftwell_profiles').select('id').limit(1)
  if (error) throw new RetryableWebhookError(`Profile visibility check failed: ${error.message}`)
  return !!data?.length
}

function isShiftWellSubscription(sub: Stripe.Subscription, priceIds: string[] | undefined): boolean {
  const ids = (priceIds || []).filter(Boolean)
  if (!ids.length) return true
  return (sub.items?.data || []).some(item => !!item.price?.id && ids.includes(item.price.id))
}

// Re-fetches the subscription and writes Stripe's current view of it.
async function syncSubscription(deps: WebhookDeps, subscriptionId: string) {
  const { stripe, supabase, log } = deps

  let sub: Stripe.Subscription
  try {
    sub = await stripe.subscriptions.retrieve(subscriptionId)
  } catch (err: any) {
    throw new RetryableWebhookError(`Could not retrieve subscription ${subscriptionId}: ${err?.message}`)
  }

  const customerId = customerIdOf(sub as any)
  if (!customerId) return

  if (!isShiftWellSubscription(sub, deps.shiftwellPriceIds)) {
    log?.log(`Ignoring subscription ${sub.id}: not on a ShiftWell price (another product on this Stripe account)`)
    return
  }

  const profile = await findProfile(deps, customerId)
  if (!profile) {
    log?.warn(`No ShiftWell profile for customer ${customerId} (subscription ${sub.id}) — ignoring`)
    return
  }

  // Comp accounts (ambassadors) have access regardless of Stripe. Stripe
  // must never touch their billing fields, e.g. when a refunded
  // subscription is cancelled.
  if (profile.comp_access) {
    log?.log(`Skipping subscription ${sub.id} (${sub.status}) for comp_access profile ${profile.id}`)
    return
  }

  // A dead subscription that isn't the one on file (the user has since
  // started another) must not clobber the live one.
  if (profile.subscription_id && profile.subscription_id !== sub.id && !statusGrantsAccess(sub.status) && sub.status !== 'past_due') {
    log?.log(`Ignoring ${sub.status} subscription ${sub.id}; profile ${profile.id} is on ${profile.subscription_id}`)
    return
  }

  const ended = sub.status === 'canceled' || sub.status === 'incomplete_expired'
  const updates: Record<string, any> = {
    subscription_status: sub.status,
    subscription_id: ended ? null : sub.id,
    current_period_ends_at: ended ? null : toIso(periodEnd(sub)),
  }

  const isComp = profile.trial_ends_at && new Date(profile.trial_ends_at) > COMP_TRIAL_CUTOFF
  if (sub.trial_end && !isComp) {
    updates.trial_ends_at = toIso(sub.trial_end)
  }

  const { data: written, error } = await supabase
    .from('shiftwell_profiles')
    .update(updates)
    .eq('id', profile.id)
    .eq('comp_access', false) // enforced in the write too, not just the check above
    .select('id')
  if (error) throw new RetryableWebhookError(`Profile update failed: ${error.message}`)
  // 0 rows is not success. Either the row just became comp (a retry will
  // then skip it) or the write was silently blocked.
  if (!written?.length) throw new RetryableWebhookError(`Profile update for ${profile.id} matched no rows`)
}

// ── Referrals ─────────────────────────────────────────────

// Atomically flips referral_reward_granted false -> true and reports
// whether *this* call flipped it. Stripe retries and can deliver the same
// invoice event more than once, so every terminal referral outcome is gated
// behind this and can happen only once per referred user.
async function claimReferralReward(deps: WebhookDeps, referredUserId: string): Promise<boolean> {
  const { data, error } = await deps.supabase
    .from('shiftwell_profiles')
    .update({ referral_reward_granted: true })
    .eq('id', referredUserId)
    .eq('referral_reward_granted', false)
    .select('id')
    .maybeSingle()

  if (error) {
    deps.log?.error('Failed to claim referral reward (treating as not claimed):', error)
    return false
  }
  return !!data
}

async function logReferralEvent(deps: WebhookDeps, event: {
  referredUserId: string
  referrerUserId: string | null
  referralCode: string
  status: 'granted' | 'needs_manual_handling' | 'skipped_no_stripe_customer' | 'skipped_referrer_not_found'
  amountPence?: number
  note?: string
}) {
  const { error } = await deps.supabase.from('referral_events').insert({
    referred_user_id: event.referredUserId,
    referrer_user_id: event.referrerUserId,
    referral_code: event.referralCode,
    status: event.status,
    amount_pence: event.amountPence ?? null,
    note: event.note ?? null,
  })
  if (error) deps.log?.error('Failed to write referral_events row (non-fatal):', error)
}

// Grants the referrer's free-month credit on the referred user's first
// real (non-zero) paid invoice. Only ever called from a paid invoice, and
// the claim flag makes it once-only, so renewals don't pay out again.
//
// Never throws: a referral bug must not fail Stripe's delivery of the
// payment event it rides on.
async function maybeGrantReferralReward(deps: WebhookDeps, customerId: string) {
  const { supabase, stripe, log } = deps
  try {
    const { data: profile, error: profileError } = await supabase
      .from('shiftwell_profiles')
      .select('id, referred_by, referral_reward_granted')
      .eq('stripe_customer_id', customerId)
      .maybeSingle()

    if (profileError || !profile) return
    if (!profile.referred_by || profile.referral_reward_granted) return

    const { data: referrer, error: referrerError } = await supabase
      .from('shiftwell_profiles')
      .select('id, stripe_customer_id, subscription_id')
      .eq('referral_code', profile.referred_by)
      .maybeSingle()

    if (referrerError || !referrer) {
      if (!(await claimReferralReward(deps, profile.id))) return
      log?.log(`Referral reward skipped: no profile matches referral_code ${profile.referred_by}`)
      await logReferralEvent(deps, {
        referredUserId: profile.id,
        referrerUserId: null,
        referralCode: profile.referred_by,
        status: 'skipped_referrer_not_found',
      })
      return
    }

    if (!referrer.stripe_customer_id) {
      if (!(await claimReferralReward(deps, profile.id))) return
      log?.log(`Referral reward skipped: referrer ${referrer.id} has no Stripe customer yet`)
      await logReferralEvent(deps, {
        referredUserId: profile.id,
        referrerUserId: referrer.id,
        referralCode: profile.referred_by,
        status: 'skipped_no_stripe_customer',
      })
      return
    }

    // A "free month" only maps cleanly onto the monthly price. On annual,
    // flag it for a human rather than guessing a pro-rated amount.
    const referrerPriceId = referrer.subscription_id
      ? await stripe.subscriptions
          .retrieve(referrer.subscription_id)
          .then(sub => sub.items.data[0]?.price?.id)
          .catch(() => null)
      : null

    const isAnnual = !!referrerPriceId && referrerPriceId === deps.yearlyPriceId

    if (isAnnual) {
      if (!(await claimReferralReward(deps, profile.id))) return
      log?.log(`Referral reward NEEDS MANUAL HANDLING: referrer ${referrer.id} (customer ${referrer.stripe_customer_id}) is on the annual plan.`)
      await logReferralEvent(deps, {
        referredUserId: profile.id,
        referrerUserId: referrer.id,
        referralCode: profile.referred_by,
        status: 'needs_manual_handling',
        note: 'Referrer is on the annual plan; a free month does not map to a clean amount.',
      })
      return
    }

    // Claim right before moving money — only the winner may credit.
    if (!(await claimReferralReward(deps, profile.id))) return

    await stripe.customers.createBalanceTransaction(referrer.stripe_customer_id, {
      amount: -REFERRAL_MONTHLY_CREDIT_PENCE,
      currency: 'gbp',
      description: `Referral reward: 1 free month for referring ${profile.id}`,
    })
    log?.log(`Referral reward granted: £${(REFERRAL_MONTHLY_CREDIT_PENCE / 100).toFixed(2)} credit to ${referrer.stripe_customer_id} for referring ${profile.id}`)
    await logReferralEvent(deps, {
      referredUserId: profile.id,
      referrerUserId: referrer.id,
      referralCode: profile.referred_by,
      status: 'granted',
      amountPence: REFERRAL_MONTHLY_CREDIT_PENCE,
    })
  } catch (err) {
    log?.error('Referral reward logic failed (non-fatal, webhook continues):', err)
  }
}

// ── Entry point ───────────────────────────────────────────

export async function handleStripeEvent(event: Stripe.Event, deps: WebhookDeps): Promise<void> {
  const log = deps.log

  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription
      await syncSubscription(deps, sub.id)
      return
    }

    case 'invoice.payment_succeeded': {
      const invoice = event.data.object as Stripe.Invoice
      if (!invoice.amount_paid) {
        // The £0 trial-start invoice (or a fully-discounted one). Not a
        // payment: no status change, no referral reward.
        log?.log(`Ignoring £0 invoice ${invoice.id}`)
        return
      }
      const subscriptionId = invoiceSubscriptionId(invoice)
      const customerId = customerIdOf(invoice as any)
      if (!subscriptionId || !customerId) return
      await maybeGrantReferralReward(deps, customerId)
      await syncSubscription(deps, subscriptionId)
      return
    }

    case 'invoice.payment_failed': {
      // Stripe has already moved the subscription (usually to past_due);
      // write whatever it now says rather than assuming.
      const invoice = event.data.object as Stripe.Invoice
      const subscriptionId = invoiceSubscriptionId(invoice)
      if (subscriptionId) await syncSubscription(deps, subscriptionId)
      return
    }

    default:
      log?.log(`Unhandled event: ${event.type}`)
  }
}
