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
