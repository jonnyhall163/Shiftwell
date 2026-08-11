import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

// Uses the service role client for the aggregate counts, deliberately —
// they require reading other users' rows (everyone this user referred),
// and this route has no visibility into what RLS policies exist on
// shiftwell_profiles. Only aggregate counts are ever returned, never any
// other referred user's details.
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const authHeader = req.headers.authorization
  if (!authHeader) return res.status(401).json({ error: 'No auth header' })

  const supabaseAuth = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: authHeader } } }
  )

  const { data: { user }, error: userError } = await supabaseAuth.auth.getUser()
  if (userError || !user) return res.status(401).json({ error: 'Invalid user' })

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('shiftwell_profiles')
    .select('referral_code')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError || !profile?.referral_code) {
    return res.status(404).json({ error: 'No referral code on this account' })
  }

  const { count: signups, error: signupsError } = await supabaseAdmin
    .from('shiftwell_profiles')
    .select('id', { count: 'exact', head: true })
    .eq('referred_by', profile.referral_code)

  const { count: conversions, error: conversionsError } = await supabaseAdmin
    .from('shiftwell_profiles')
    .select('id', { count: 'exact', head: true })
    .eq('referred_by', profile.referral_code)
    .eq('subscription_status', 'active')

  if (signupsError || conversionsError) {
    return res.status(500).json({ error: 'Failed to load referral stats' })
  }

  return res.status(200).json({
    referralCode: profile.referral_code,
    signups: signups || 0,
    conversions: conversions || 0,
  })
}
