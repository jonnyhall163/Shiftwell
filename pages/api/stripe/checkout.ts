import type { NextApiRequest, NextApiResponse } from 'next'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { TRIAL_DAYS, newSignupTrialEnd } from '../../../lib/trial'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

// Server key: billing columns (stripe_customer_id etc.) are being locked
// so users can't edit them with their own login. Only ever used after the
// caller's identity has been checked below.
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const authHeader = req.headers.authorization
  if (!authHeader) return res.status(401).json({ error: 'No auth header' })

  const supabaseAuth = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: authHeader } } }
  )

  const { data: { user }, error: userError } = await supabaseAuth.auth.getUser()
  if (userError || !user) return res.status(401).json({ error: 'Invalid user' })

  const { priceId } = req.body
  if (!priceId) return res.status(400).json({ error: 'Missing priceId' })

  const { data: profile } = await supabaseAuth
    .from('shiftwell_profiles')
    .select('stripe_customer_id, full_name, created_at, trial_ends_at, subscription_status, subscription_id, comp_access')
    .eq('id', user.id)
    .single()

  let customerId = profile?.stripe_customer_id

  // Create Stripe customer if doesn't exist
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: profile?.full_name || undefined,
      metadata: { supabase_user_id: user.id },
    })
    customerId = customer.id

    // Only fill it if still empty, so a double-clicked checkout can't
    // replace the customer another request already saved.
    const { data: saved, error: saveError } = await supabaseAdmin
      .from('shiftwell_profiles')
      .update({ stripe_customer_id: customerId })
      .eq('id', user.id)
      .is('stripe_customer_id', null)
      .select('stripe_customer_id')
      .maybeSingle()

    if (saveError) {
      // Without the saved customer id the webhook can't find this user, so
      // don't take them to a checkout we can't record.
      console.error('Checkout: failed to save stripe_customer_id:', saveError)
      return res.status(500).json({ error: 'Could not start checkout, please try again.' })
    }

    if (!saved) {
      // Another request saved a customer first: use that one.
      const { data: current } = await supabaseAdmin
        .from('shiftwell_profiles')
        .select('stripe_customer_id')
        .eq('id', user.id)
        .maybeSingle()
      if (!current?.stripe_customer_id) {
        console.error(`Checkout: profile ${user.id} not found when saving stripe_customer_id`)
        return res.status(500).json({ error: 'Could not start checkout, please try again.' })
      }
      customerId = current.stripe_customer_id
    }
  }

  // New signups: bring the stored trial end in to signup + 7 days, so
  // leaving checkout without subscribing doesn't keep the database default
  // of 14 days of access. Stripe's own trial_end replaces it via the webhook
  // if they do subscribe. See lib/trial.ts.
  const trialEnd = newSignupTrialEnd(profile)
  if (trialEnd) {
    const { error: trialError } = await supabaseAdmin
      .from('shiftwell_profiles')
      .update({ trial_ends_at: trialEnd })
      .eq('id', user.id)
      .eq('subscription_status', 'trialing')
      .is('subscription_id', null)
      .eq('comp_access', false)
      .gt('trial_ends_at', trialEnd)
    // Not worth blocking checkout over: if they subscribe, the webhook
    // writes Stripe's trial end anyway.
    if (trialError) console.error('Checkout: failed to set trial_ends_at:', trialError)
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: {
      trial_period_days: TRIAL_DAYS,
    },
    success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard?subscribed=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/subscribe`,
    allow_promotion_codes: true,
  })

  return res.status(200).json({ url: session.url })
}
