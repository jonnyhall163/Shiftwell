import type { NextApiRequest, NextApiResponse } from 'next'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export const config = {
  api: { bodyParser: false },
}

async function getRawBody(req: NextApiRequest): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk) => chunks.push(chunk))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

const REFERRAL_MONTHLY_CREDIT_PENCE = 799 // £7.99 — one month on the monthly plan

// Atomically flips referral_reward_granted false -> true and reports whether
// *this* call was the one that flipped it. Stripe commonly sends both
// customer.subscription.updated and invoice.payment_succeeded for the same
// trial-to-paid conversion, sometimes overlapping in flight, so every
// terminal action below (granting a credit, or logging a skip/manual-review
// outcome) is gated behind this so it can only ever happen once per
// referred user, however many events arrive for that conversion.
async function claimReferralReward(referredUserId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('shiftwell_profiles')
    .update({ referral_reward_granted: true })
    .eq('id', referredUserId)
    .eq('referral_reward_granted', false)
    .select('id')
    .maybeSingle()

  if (error) {
    console.error('Failed to claim referral reward (treating as not claimed):', error)
    return false
  }
  return !!data
}

async function logReferralEvent(event: {
  referredUserId: string
  referrerUserId: string | null
  referralCode: string
  status: 'granted' | 'needs_manual_handling' | 'skipped_no_stripe_customer' | 'skipped_referrer_not_found'
  amountPence?: number
  note?: string
}) {
  const { error } = await supabase.from('referral_events').insert({
    referred_user_id: event.referredUserId,
    referrer_user_id: event.referrerUserId,
    referral_code: event.referralCode,
    status: event.status,
    amount_pence: event.amountPence ?? null,
    note: event.note ?? null,
  })
  if (error) console.error('Failed to write referral_events row (non-fatal):', error)
}

// Grants the referrer's free-month credit the moment a referred user's trial
// converts to a paying subscription. Called from both the subscription and
// invoice webhook branches (either can be the one that flips status to
// 'active') — must be called with the customer's subscription_status as it
// stood *before* this event's own update, since that's what "is this a
// fresh conversion" is judged against.
//
// This must never throw and never delay/break the webhook response it's
// attached to — every failure mode here is caught and logged, not
// propagated. A referral bug is not a reason to fail Stripe's webhook
// delivery (which would make Stripe retry, and could be mistaken for a real
// subscription-sync failure).
async function maybeGrantReferralReward(customerId: string, newStatus: string) {
  try {
    if (newStatus !== 'active') return

    const { data: profile, error: profileError } = await supabase
      .from('shiftwell_profiles')
      .select('id, subscription_status, referred_by, referral_reward_granted')
      .eq('stripe_customer_id', customerId)
      .maybeSingle()

    if (profileError || !profile) return
    // Only a fresh trial->paid transition counts as "converting" — if
    // status was already 'active', this is a renewal or unrelated update.
    if (profile.subscription_status === 'active') return
    if (!profile.referred_by || profile.referral_reward_granted) return

    const { data: referrer, error: referrerError } = await supabase
      .from('shiftwell_profiles')
      .select('id, stripe_customer_id, subscription_id')
      .eq('referral_code', profile.referred_by)
      .maybeSingle()

    if (referrerError || !referrer) {
      // Referrer's profile is gone (e.g. they deleted their account) or the
      // code no longer resolves — nothing to grant, ever. Claim so we don't
      // keep re-checking this on every future event for this user.
      if (!(await claimReferralReward(profile.id))) return
      console.log(`Referral reward skipped: no profile matches referral_code ${profile.referred_by} (referrer account may have been deleted)`)
      await logReferralEvent({
        referredUserId: profile.id,
        referrerUserId: null,
        referralCode: profile.referred_by,
        status: 'skipped_referrer_not_found',
      })
      return
    }

    if (!referrer.stripe_customer_id) {
      if (!(await claimReferralReward(profile.id))) return
      console.log(`Referral reward skipped: referrer ${referrer.id} has no Stripe customer yet`)
      await logReferralEvent({
        referredUserId: profile.id,
        referrerUserId: referrer.id,
        referralCode: profile.referred_by,
        status: 'skipped_no_stripe_customer',
      })
      return
    }

    // A "free month" only maps cleanly onto the monthly plan's price. On
    // annual, flag it for a human to apply manually rather than guessing at
    // a pro-rated amount.
    const referrerPriceId = referrer.subscription_id
      ? await stripe.subscriptions
          .retrieve(referrer.subscription_id)
          .then(sub => sub.items.data[0]?.price?.id)
          .catch(() => null)
      : null

    const isAnnual = !!referrerPriceId && referrerPriceId === process.env.NEXT_PUBLIC_STRIPE_YEARLY_PRICE_ID

    if (isAnnual) {
      if (!(await claimReferralReward(profile.id))) return
      console.log(`Referral reward NEEDS MANUAL HANDLING: referrer ${referrer.id} (customer ${referrer.stripe_customer_id}) is on the annual plan — apply a £7.99-equivalent credit manually.`)
      await logReferralEvent({
        referredUserId: profile.id,
        referrerUserId: referrer.id,
        referralCode: profile.referred_by,
        status: 'needs_manual_handling',
        note: 'Referrer is on the annual plan; a free month does not map to a clean amount.',
      })
      return
    }

    // Claim right before the money-moving step — this is the one race that
    // actually matters: only the winner may call createBalanceTransaction.
    if (!(await claimReferralReward(profile.id))) return

    await stripe.customers.createBalanceTransaction(referrer.stripe_customer_id, {
      amount: -REFERRAL_MONTHLY_CREDIT_PENCE,
      currency: 'gbp',
      description: `Referral reward: 1 free month for referring ${profile.id}`,
    })
    console.log(`Referral reward granted: £${(REFERRAL_MONTHLY_CREDIT_PENCE / 100).toFixed(2)} credit to customer ${referrer.stripe_customer_id} (referrer ${referrer.id}) for referring ${profile.id}`)
    await logReferralEvent({
      referredUserId: profile.id,
      referrerUserId: referrer.id,
      referralCode: profile.referred_by,
      status: 'granted',
      amountPence: REFERRAL_MONTHLY_CREDIT_PENCE,
    })
  } catch (err) {
    console.error('Referral reward logic failed (non-fatal, webhook continues):', err)
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const rawBody = await getRawBody(req)
  const sig = req.headers['stripe-signature']

  if (!sig) return res.status(400).json({ error: 'No signature' })

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err: any) {
    console.error('Webhook signature failed:', err.message)
    return res.status(400).json({ error: `Webhook error: ${err.message}` })
  }

  const getCustomerId = (obj: any): string | null => obj?.customer || null

  const updateByCustomer = async (customerId: string, updates: Record<string, any>) => {
    const { error } = await supabase
      .from('shiftwell_profiles')
      .update(updates)
      .eq('stripe_customer_id', customerId)

    if (error) console.error('Supabase update error:', error)
  }

  switch (event.type) {

    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription
      const customerId = sub.customer as string
      // Must run before updateByCustomer below — it decides "is this a
      // fresh conversion" by reading the profile's status as it stood
      // *before* this event's update, so it has to look before we write.
      await maybeGrantReferralReward(customerId, sub.status)
      await updateByCustomer(customerId, {
        subscription_status: sub.status,
        subscription_id: sub.id,
        current_period_ends_at: (sub as any).current_period_end
          ? new Date((sub as any).current_period_end * 1000).toISOString()
          : null

      })
      break
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription
      const customerId = sub.customer as string
      await updateByCustomer(customerId, {
        subscription_status: 'canceled',
        subscription_id: null,
        current_period_ends_at: null,
      })
      break
    }

    case 'invoice.payment_succeeded': {
      const invoice = event.data.object as Stripe.Invoice
      const customerId = getCustomerId(invoice)
      if (customerId) {
        // Same ordering requirement as above — read old status first.
        await maybeGrantReferralReward(customerId, 'active')
        await updateByCustomer(customerId, {
          subscription_status: 'active',
        })
      }
      break
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice
      const customerId = getCustomerId(invoice)
      if (customerId) {
        await updateByCustomer(customerId, {
          subscription_status: 'past_due',
        })
      }
      break
    }

    default:
      console.log(`Unhandled event: ${event.type}`)
  }

  return res.status(200).json({ received: true })
}
