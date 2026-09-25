import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import { normalizeEmail, isWaitlistRateLimited, WAITLIST_SOURCE } from '../../lib/waitlist'

// The iPhone launch list. Two ways in:
//   landing:   { entry_point: 'landing', email }  (no login)
//   dashboard: { entry_point: 'dashboard' } + Authorization: the email comes
//              from the logged-in account, never from the request body.
// The table is server-only (RLS on, no policies), so this writes with the
// service key. Duplicates are ignored and answered like a new sign-up, so
// the form can't be used to find out who is on the list.

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function clientIp(req: NextApiRequest): string {
  const fwd = req.headers['x-forwarded-for']
  const first = (Array.isArray(fwd) ? fwd[0] : fwd)?.split(',')[0]?.trim()
  return first || (req.headers['x-real-ip'] as string) || req.socket?.remoteAddress || 'unknown'
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const body = req.body || {}
  const entryPoint = body.entry_point === 'dashboard' ? 'dashboard' : 'landing'

  // Honeypot: a hidden field real people never fill in. Pretend it worked.
  if (typeof body.website === 'string' && body.website.trim()) {
    return res.status(200).json({ ok: true })
  }

  if (isWaitlistRateLimited(`ip:${clientIp(req)}`)) {
    return res.status(429).json({ error: 'Too many tries. Please wait a minute and try again.' })
  }

  let email: string | null = null
  let userId: string | null = null

  if (entryPoint === 'dashboard') {
    const authHeader = req.headers.authorization
    if (!authHeader) return res.status(401).json({ error: 'Please log in again.' })
    const supabaseUser = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: authHeader } } }
    )
    const { data: { user }, error } = await supabaseUser.auth.getUser()
    if (error || !user) return res.status(401).json({ error: 'Please log in again.' })
    email = normalizeEmail(user.email)
    userId = user.id
  } else {
    email = normalizeEmail(body.email)
  }

  if (!email) return res.status(400).json({ error: 'Please enter a valid email address.' })

  const { error } = await supabaseAdmin.from('shiftwell_waitlist').insert({
    email,
    source: WAITLIST_SOURCE,
    entry_point: entryPoint,
    user_id: userId,
  })

  // 23505 = already on the list: fine, same answer as a new sign-up.
  if (error && error.code !== '23505') {
    console.error('Waitlist insert failed:', error)
    return res.status(500).json({ error: 'Something went wrong. Please try again.' })
  }

  return res.status(200).json({ ok: true })
}
