import type { NextApiRequest, NextApiResponse } from 'next'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { handleStripeEvent, RetryableWebhookError } from '../../../lib/stripeWebhook'

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

  try {
    await handleStripeEvent(event, {
      stripe,
      supabase,
      yearlyPriceId: process.env.NEXT_PUBLIC_STRIPE_YEARLY_PRICE_ID,
      log: console,
    })
  } catch (err: any) {
    // A failed database write used to be logged and answered with 200, so
    // Stripe thought it was delivered and never retried. A 500 makes Stripe
    // retry and shows the failure in the Stripe dashboard.
    console.error(`Webhook ${event.type} (${event.id}) failed:`, err?.message || err)
    const retryable = err instanceof RetryableWebhookError
    return res.status(500).json({ error: retryable ? 'Temporary failure, please retry' : 'Webhook handler error' })
  }

  return res.status(200).json({ received: true })
}
