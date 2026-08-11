#!/usr/bin/env node
// One-off cleanup: find auth.users rows from the last 30 days that have no
// matching shiftwell_profiles row (accounts stuck by the register.tsx bug
// where profile creation could silently fail), and print a report.
//
// Read-only — does not write anything. For the backfill itself, use
// scripts/find-orphaned-users.sql's INSERT statement (simpler and atomic
// as a single SQL statement).
//
// Usage:
//   SUPABASE_URL=https://xxxx.supabase.co \
//   SUPABASE_SERVICE_ROLE_KEY=eyJ... \
//   node scripts/find-orphaned-users.mjs
//
// Requires the service role key (the Admin API — auth.users isn't reachable
// via the anon key). Never commit this key; pass it via env for one-off runs.

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const DAYS = Number(process.env.LOOKBACK_DAYS || 30)

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY in the environment.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function listAllUsersSince(cutoff) {
  const users = []
  let page = 1
  const perPage = 200

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage })
    if (error) throw error
    if (!data.users.length) break

    for (const u of data.users) {
      if (new Date(u.created_at) >= cutoff) users.push(u)
    }

    // listUsers doesn't guarantee ordering, so we page through everything
    // rather than stopping early — fine at typical signup volumes.
    if (data.users.length < perPage) break
    page += 1
  }

  return users
}

async function main() {
  const cutoff = new Date(Date.now() - DAYS * 24 * 60 * 60 * 1000)
  console.log(`Checking signups since ${cutoff.toISOString()}...\n`)

  const recentUsers = await listAllUsersSince(cutoff)
  if (recentUsers.length === 0) {
    console.log('No signups in that window.')
    return
  }

  const ids = recentUsers.map(u => u.id)
  const { data: profiles, error } = await supabase
    .from('shiftwell_profiles')
    .select('id')
    .in('id', ids)
  if (error) throw error

  const hasProfile = new Set((profiles || []).map(p => p.id))
  const orphaned = recentUsers.filter(u => !hasProfile.has(u.id))

  console.log(`Signups checked: ${recentUsers.length}`)
  console.log(`Missing a profile row: ${orphaned.length}\n`)

  if (orphaned.length === 0) {
    console.log('Nobody affected in this window.')
    return
  }

  console.log('id,email,created_at,confirmed_at,full_name')
  for (const u of orphaned) {
    const fullName = u.user_metadata?.full_name || ''
    console.log(`${u.id},${u.email},${u.created_at},${u.confirmed_at || ''},"${fullName}"`)
  }
  console.log(`\n${orphaned.length} affected user(s) listed above (CSV format — redirect to a file if you want to save it).`)
  console.log('To backfill their profile rows, run the INSERT in scripts/find-orphaned-users.sql.')
}

main().catch(err => {
  console.error('Failed:', err)
  process.exit(1)
})
