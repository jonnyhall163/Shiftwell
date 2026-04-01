import type { NextApiRequest, NextApiResponse } from 'next'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import { getTodayShift, getUpcomingShifts } from '../../lib/shiftEngine'
import type { PatternData } from '../../lib/shiftEngine'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

function getTimeBlock(hour: number): string {
  if (hour >= 5 && hour < 12) return 'morning'
  if (hour >= 12 && hour < 18) return 'afternoon'
  if (hour >= 18 && hour < 23) return 'evening'
  return 'night'
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const authHeader = req.headers.authorization
  if (!authHeader) return res.status(401).json({ error: 'No auth header' })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: authHeader } } }
  )

  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) return res.status(401).json({ error: 'Invalid user' })

  const { data: profile, error } = await supabase
    .from('shiftwell_profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (error || !profile) return res.status(404).json({ error: 'Profile not found' })

  // ── Time block cache key ─────────────────────────────
  const now = req.body.localTime ? new Date(req.body.localTime) : new Date()
  const hour = now.getHours()
  const todayDate = (req.body.localDate as string) || new Date().toISOString().split('T')[0]
  const timeBlock = getTimeBlock(hour)
  const cacheKey = `${todayDate}-${timeBlock}`

  if (profile.briefing_cache && profile.briefing_date === cacheKey) {
    return res.status(200).json({ briefing: profile.briefing_cache, cached: true })
  }

  // ── Generate fresh briefing ──────────────────────────
  const patternData = profile.pattern_data as PatternData
  if (!patternData) return res.status(400).json({ error: 'No shift pattern set' })

  const todayShift = getTodayShift(patternData)
  const upcoming = getUpcomingShifts(patternData, 7)
  const name = profile.full_name?.split(' ')[0] || 'there'

  const timeOfDay =
    hour >= 5 && hour < 12 ? 'morning' :
    hour >= 12 && hour < 18 ? 'afternoon' :
    hour >= 18 && hour < 23 ? 'evening' : 'middle of the night'

  const currentDate = now.toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  })

  const upcomingText = upcoming
    .map((s, i) => {
      const date = new Date(now)
      date.setDate(date.getDate() + i)
      const dayName = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : date.toLocaleDateString('en-GB', { weekday: 'long' })
      return `${dayName}: ${s.label}${s.isOff ? ' (rest day)' : ` (${s.startTime}–${s.endTime})`}`
    })
    .join('\n')

  const lifeContext = buildLifeContext(profile)

  const prompt = `You are ShiftWell AI — a warm, practical wellness companion for shift workers. You understand the physical and emotional reality of shift work deeply. You never use toxic positivity. You speak like a knowledgeable friend, not a corporate wellness bot.

User: ${name}
Current date: ${currentDate}
Current time: ${timeOfDay} (${now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })})
Today's shift: ${todayShift.label}${todayShift.isOff ? ' (rest day)' : ` — ${todayShift.startTime} to ${todayShift.endTime}`}
${todayShift.dayInCycle ? `Day ${todayShift.dayInCycle} of their rotation` : ''}
${lifeContext ? `\nLife context:\n${lifeContext}` : ''}

Upcoming 7 days:
${upcomingText}

Write a personalised daily briefing for ${name}. Keep it to 3 short paragraphs. Cover:
1. A brief acknowledgement of where they are in their rotation and what today holds
2. One specific, practical wellness tip timed to their current shift phase (sleep, hydration, food timing, or energy management) — be specific to the time of day and shift type, never generic. IMPORTANT: respect any life context constraints — never suggest sleep times that clash with school runs or other commitments
3. A short forward look at the next 2-3 days and what to be aware of

Rules:
- Never use breakfast, lunch or dinner — use "meal 1", "meal 2" etc
- Never frame shift work negatively — they chose this life, help them thrive in it
- Be warm but concise — no bullet points, just flowing prose
- Max 120 words total
- Only reference the actual current season and weather conditions for the real current date — do not assume or invent seasonal details
- NEVER suggest sleep times that would prevent the user meeting their hard constraints
- Never use markdown formatting like **bold** — plain text only`

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }],
    })

    const briefing = message.content[0].type === 'text' ? message.content[0].text : ''

    await supabase
      .from('shiftwell_profiles')
      .update({
        briefing_cache: briefing,
        briefing_date: cacheKey,
      })
      .eq('id', user.id)

    return res.status(200).json({ briefing })
  } catch (err) {
    console.error('Anthropic error:', err)
    return res.status(500).json({ error: 'Failed to generate briefing' })
  }
}

function buildLifeContext(profile: any): string {
  const lines: string[] = []

  if (profile.has_kids && profile.school_run_time) {
    lines.push(`HARD CONSTRAINT: User has children with a school run at ${profile.school_run_time}. They MUST be awake and functional by ${profile.school_run_time} on school days. Never suggest sleeping past ${profile.school_run_time}. Never suggest staying up so late that waking at ${profile.school_run_time} would mean less than 6 hours sleep.`)
  } else if (profile.has_kids) {
    lines.push(`User has children — factor in family commitments when suggesting sleep or activity timing.`)
  }

  if (profile.wake_constraint) {
    lines.push(`HARD CONSTRAINT: User must be up by ${profile.wake_constraint}. Never suggest sleep that would prevent this.`)
  }

  if (profile.life_notes) {
    lines.push(`Additional context: ${profile.life_notes}`)
  }

  if (profile.dietary_restrictions?.length > 0) {
    lines.push(`Dietary requirements: ${profile.dietary_restrictions.join(', ')}. Never suggest foods that conflict with these requirements.`)
  }

  return lines.join('\n')
}
