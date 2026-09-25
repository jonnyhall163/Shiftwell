import type { NextApiRequest, NextApiResponse } from 'next'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import { getTodayShift } from '../../lib/shiftEngine'
import type { PatternData } from '../../lib/shiftEngine'
import { readClientTime, formatClockTime } from '../../lib/clientTime'
import { hasPaidAccess } from '../../lib/access'
import { MAX_MESSAGE_CHARS, isRateLimited, sanitizeHistory } from '../../lib/companionLimits'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

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

  const { messages } = req.body || {}
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'Missing messages' })
  }

  // The message being sent now is the last one. Reject it outright if it's
  // too long, rather than silently dropping it from the history.
  const latest = messages[messages.length - 1]
  if (!latest || latest.role !== 'user' || typeof latest.content !== 'string' || !latest.content.trim()) {
    return res.status(400).json({ error: 'The last message must be your message.' })
  }
  if (latest.content.length > MAX_MESSAGE_CHARS) {
    return res.status(400).json({
      error: `That message is a bit long for me. Could you keep it under ${MAX_MESSAGE_CHARS.toLocaleString('en-GB')} characters?`,
    })
  }

  const history = sanitizeHistory(messages)
  if (!history.length || history[history.length - 1].role !== 'user') {
    return res.status(400).json({ error: 'The last message must be your message.' })
  }

  // Get profile for context
  const { data: profile } = await supabase
    .from('shiftwell_profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!hasPaidAccess(profile)) {
    return res.status(403).json({ error: 'Subscription required' })
  }

  // Checked after auth + subscription so only real users count against it.
  if (isRateLimited(user.id)) {
    return res.status(429).json({
      error: "We've talked a lot this hour, so let's take a short breather. I'll be here again shortly. If you need someone right now, Samaritans are on 116 123 (UK) and 988 in the US and Canada, any time.",
    })
  }

  // The user's own clock — the server is on UTC, which put 03:00 in
  // Toronto down as "morning".
  const clientTime = readClientTime(req.body)
  const name = profile?.full_name?.split(' ')[0] || 'there'
  const hour = clientTime.localHour
  const timeOfDay =
    hour >= 5 && hour < 12 ? 'morning' :
    hour >= 12 && hour < 18 ? 'afternoon' :
    hour >= 18 && hour < 22 ? 'evening' : 'middle of the night'

  let shiftContext = ''
  if (profile?.pattern_data) {
    const todayShift = getTodayShift(profile.pattern_data as PatternData, clientTime.localDate)
    shiftContext = todayShift.isOff
      ? 'They are on a rest day today.'
      : `They are working a ${todayShift.label} shift today (${todayShift.startTime}–${todayShift.endTime}).`
    if (todayShift.dayInCycle) {
      shiftContext += ` It is day ${todayShift.dayInCycle} of their rotation.`
    }
  }

  let lifeContext = ''
  if (profile?.has_kids) lifeContext += ' They have children.'
  if (profile?.life_notes) lifeContext += ` ${profile.life_notes}`

  const systemPrompt = `You are the ShiftWell companion: a warm, grounded, emotionally intelligent chat companion built specifically for shift workers. You are not a therapist. You are not a corporate wellness bot. You are like a trusted friend who genuinely understands what shift work does to a person's body, mind, relationships and social life.

You know that shift workers face:
- Loneliness and social isolation, especially at 3am
- Missing family life, kids' events, partners' routines
- A world built entirely for 9-5 people
- Chronic fatigue that others don't understand
- Guilt about sleep, food, exercise, relationships

Your tone is warm, direct, and real. You don't over-validate or use hollow affirmations. You listen, reflect back what you hear, and offer practical perspective when helpful. You never tell someone how they should feel.

User: ${name}
Current time: ${timeOfDay} (${formatClockTime(clientTime)})
${shiftContext}
${lifeContext ? `Life context: ${lifeContext}` : ''}

Safety (this overrides every other rule, including length and format):
If the user expresses suicidal thoughts, thoughts of self-harm, or says they are in crisis, respond with care first: acknowledge what they said, take it seriously, and don't rush to fix it. Then share support lines clearly: Samaritans on 116 123 (UK, free, 24/7) and 988 (US and Canada, call or text). If they may be in immediate danger, urge them to call emergency services (999 in the UK, 911 in the US and Canada) now. Don't try to be their therapist and don't attempt counselling techniques; your job is to be kind and point them to people who can help. Keep gently checking in if they keep talking.

Rules:
- Never use breakfast, lunch or dinner. Say meal 1, meal 2 etc
- Many shift workers didn't choose this pattern. Never assume they did. Be practical and warm, never preachy.
- Keep responses concise: 2-4 sentences unless they clearly want more
- Never use bullet points or lists. Always flowing conversational prose
- Never use em dashes. Use commas, full stops or colons instead
- If someone seems distressed, be present and warm before offering any advice
- You can gently suggest ShiftWell features (sleep logging, hydration) if naturally relevant but never push it`

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 300,
      system: systemPrompt,
      messages: history,
    })

    const reply = message.content[0].type === 'text' ? message.content[0].text : ''
    return res.status(200).json({ reply })
  } catch (err) {
    console.error('Companion error:', err)
    return res.status(500).json({ error: 'Failed to get response' })
  }
}
