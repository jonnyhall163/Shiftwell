import type { NextApiRequest, NextApiResponse } from 'next'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import { getTodayShift } from '../../lib/shiftEngine'
import type { PatternData } from '../../lib/shiftEngine'

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

  const { messages } = req.body
  if (!messages || !Array.isArray(messages)) return res.status(400).json({ error: 'Missing messages' })

  // Get profile for context
  const { data: profile } = await supabase
    .from('shiftwell_profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const name = profile?.full_name?.split(' ')[0] || 'there'
  const now = new Date()
  const hour = now.getHours()
  const timeOfDay =
    hour >= 5 && hour < 12 ? 'morning' :
    hour >= 12 && hour < 18 ? 'afternoon' :
    hour >= 18 && hour < 22 ? 'evening' : 'middle of the night'

  let shiftContext = ''
  if (profile?.pattern_data) {
    const todayShift = getTodayShift(profile.pattern_data as PatternData)
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

  const systemPrompt = `You are the ShiftWell companion — a warm, grounded, emotionally intelligent chat companion built specifically for shift workers. You are not a therapist. You are not a corporate wellness bot. You are like a trusted friend who genuinely understands what shift work does to a person's body, mind, relationships and social life.

You know that shift workers face:
- Loneliness and social isolation, especially at 3am
- Missing family life, kids' events, partners' routines
- A world built entirely for 9-5 people
- Chronic fatigue that others don't understand
- Guilt about sleep, food, exercise, relationships

Your tone is warm, direct, and real. You don't over-validate or use hollow affirmations. You listen, reflect back what you hear, and offer practical perspective when helpful. You never tell someone how they should feel.

User: ${name}
Current time: ${timeOfDay} (${now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })})
${shiftContext}
${lifeContext ? `Life context: ${lifeContext}` : ''}

Rules:
- Never use breakfast, lunch or dinner — say meal 1, meal 2 etc
- Never frame shift work negatively — they chose this, help them thrive
- Keep responses concise — 2-4 sentences unless they clearly want more
- Never use bullet points or lists — always flowing conversational prose
- If someone seems distressed, be present and warm before offering any advice
- You can gently suggest ShiftWell features (sleep logging, hydration) if naturally relevant but never push it`

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 300,
      system: systemPrompt,
      messages: messages,
    })

    const reply = message.content[0].type === 'text' ? message.content[0].text : ''
    return res.status(200).json({ reply })
  } catch (err) {
    console.error('Companion error:', err)
    return res.status(500).json({ error: 'Failed to get response' })
  }
}
