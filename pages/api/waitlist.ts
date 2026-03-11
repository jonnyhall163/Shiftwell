import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const { email } = req.body
  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Invalid email' })
  }

  const { error } = await supabase
    .from('shiftwell_waitlist')
    .insert([{ email, created_at: new Date().toISOString() }])

  if (error && error.code !== '23505') {
    return res.status(500).json({ error: 'Failed to save' })
  }

  return res.status(200).json({ success: true })
}
