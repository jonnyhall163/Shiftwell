import type { NextApiRequest, NextApiResponse } from 'next'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import { getTodayShift, getUpcomingShifts } from '../../lib/shiftEngine'
import type { PatternData } from '../../lib/shiftEngine'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { userId } = req.body
  if (!userId) return res.status(400).json({ error: 'Missing userId' })

  // Get profile
  const { data: profile, error } = await supabase
    .from('shiftwell_profiles')
    .select('*')
    .eq('id', userId)
    .single()

  console.log('userId received:', userId)
  console.log('profile:', profile)
  console.log('error:', error)

  if (error || !profile) return res.status(404).json({ error: 'Profile not found', userId, supabaseError: error?.message })

  const patternData = profile.pattern_data as PatternData
  if (!patternData) return res.status(400).json({ error: 'No shift pattern set' })

  const todayShift = getTodayShift(patternData)
  const upcoming = getUpcomingShifts(patternData, 7)
  const name = profile.full_name?.split(' ')[0] || 'there'

  const now = new Date()
  const hour = now.getHours()
  const timeOfDay =
    hour >= 5 && hour < 12 ? 'morning' :
    hour >= 12 && hour < 18 ? 'afternoon' :
    hour >= 18 && hour < 22 ? 'evening' : 'middle of the night'

  const upcomingText = upcoming
    .map((s, i) => {
      const date = new Date()
      date.setDate(date.getDate() + i)
      const dayName = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : date.toLocaleDateString('en-GB', { weekday: 'long' })
      return `${dayName}: ${s.label}${s.isOff ? ' (rest day)' : ` (${s.startTime}–${s.endTime})`}`
    })
    .join('\n')

  const prompt = `You are ShiftWell AI — a warm, practical wellness companion for shift workers. You understand the physical and emotional reality of shift work deeply. You never use toxic positivity. You speak like a knowledgeable friend, not a corporate wellness bot.

User: ${name}
Current time: ${timeOfDay} (${now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })})
Today's shift: ${todayShift.label}${todayShift.isOff ? ' (rest day)' : ` — ${todayShift.startTime} to ${todayShift.endTime}`}
${todayShift.dayInCycle ? `Day ${todayShift.dayInCycle} of their rotation` : ''}

Upcoming 7 days:
${upcomingText}

Write a personalised daily briefing for ${name}. Keep it to 3 short paragraphs. Cover:
1. A brief acknowledgement of where they are in their rotation and what today holds
2. One specific, practical wellness tip timed to their current shift phase (sleep, hydration, food timing, or energy management) — be specific to the time of day and shift type, never generic
3. A short forward look at the next 2-3 days and what to be aware of

Rules:
- Never use breakfast, lunch or dinner — use "meal 1", "meal 2" etc
- Never frame shift work negatively — they chose this life, help them thrive in it
- Be warm but concise — no bullet points, just flowing prose
- Max 120 words total`

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }],
    })

    const briefing = message.content[0].type === 'text' ? message.content[0].text : ''
    return res.status(200).json({ briefing })
  } catch (err) {
    console.error('Anthropic error:', err)
    return res.status(500).json({ error: 'Failed to generate briefing' })
  }
}
