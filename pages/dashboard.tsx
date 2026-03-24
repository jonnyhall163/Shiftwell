import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useRouter } from 'next/router'
import { getTodayShift, formatShiftTime } from '../lib/shiftEngine'
import type { User } from '@supabase/supabase-js'
import type { PatternData, TodayShift } from '../lib/shiftEngine'

const tabs = [
  { id: 'today',     label: 'Today',     icon: '☀️' },
  { id: 'sleep',     label: 'Sleep',     icon: '🌙' },
  { id: 'food',      label: 'Food',      icon: '🍽️' },
  { id: 'routines',  label: 'Routines',  icon: '⚡' },
  { id: 'companion', label: 'Companion', icon: '✦' },
]

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('today')
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<any>(null)
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUser(user)

      const { data: profile } = await supabase
        .from('shiftwell_profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (!profile?.onboarding_complete) {
        router.push('/onboarding')
        return
      }

      setProfile(profile)
    }
    init()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) router.push('/login')
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (!user || !profile) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-gray-400 text-sm">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 px-4 py-4 flex items-center justify-between sticky top-0 z-10">
        <h1 className="text-white font-bold text-lg tracking-tight">ShiftWell</h1>
        <div className="relative">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="w-8 h-8 rounded-full bg-teal-600 flex items-center justify-center text-white text-sm font-bold"
          >
            {user?.user_metadata?.full_name?.[0] || user.email?.[0].toUpperCase()}
          </button>
          {showProfileMenu && (
            <div className="absolute right-0 top-10 bg-gray-800 border border-gray-700 rounded-xl shadow-xl w-48 z-20 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-700">
                <p className="text-white text-sm font-medium truncate">
                  {user?.user_metadata?.full_name || 'ShiftWell user'}
                </p>
                <p className="text-gray-400 text-xs truncate">{user.email}</p>
              </div>
              {[
                { label: 'Shift pattern', icon: '🔄', onClick: () => { router.push('/onboarding'); setShowProfileMenu(false) } },
                { label: 'Notifications', icon: '🔔', onClick: () => setShowProfileMenu(false) },
                { label: 'Subscription',  icon: '💳', onClick: () => setShowProfileMenu(false) },
              ].map(item => (
                <button
                  key={item.label}
                  onClick={item.onClick}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-700 transition border-b border-gray-700/50 last:border-0"
                >
                  <span>{item.icon}</span>
                  <span className="text-white text-sm">{item.label}</span>
                </button>
              ))}
              <button
                onClick={() => { handleSignOut(); setShowProfileMenu(false) }}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-700 transition"
              >
                <span>🚪</span>
                <span className="text-red-400 text-sm">Sign out</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto pb-24 px-4 pt-6">
        {activeTab === 'today'    && <TodayView user={user} profile={profile} />}
        {activeTab === 'sleep'    && <SleepView user={user} />}
        {activeTab === 'food'     && <FoodView />}
        {activeTab === 'routines' && <RoutinesView />}
        {activeTab === 'companion' && <CompanionView user={user} profile={profile} />}
      </main>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 flex z-10">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex flex-col items-center py-3 gap-0.5 text-xs font-medium transition-colors ${
              activeTab === tab.id ? 'text-teal-400' : 'text-gray-600 hover:text-gray-400'
            }`}
          >
            <span className="text-xl leading-none">{tab.icon}</span>
            <span className="mt-1">{tab.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}

// ── TODAY ────────────────────────────────────────────────
function TodayView({ user, profile }: { user: User, profile: any }) {
  const [briefing, setBriefing] = useState<string>('')
  const [loadingBriefing, setLoadingBriefing] = useState(true)
  const [todayShift, setTodayShift] = useState<TodayShift | null>(null)
  const [hydrationCount, setHydrationCount] = useState(0)
  const [sleepStat, setSleepStat] = useState('—')

  const hour = new Date().getHours()
  const greeting =
    hour >= 5 && hour < 12 ? 'Good morning' :
    hour >= 12 && hour < 18 ? 'Good afternoon' :
    hour >= 18 && hour < 22 ? 'Good evening' : 'Still going strong'

  const name = user?.user_metadata?.full_name?.split(' ')[0] || 'there'

  useEffect(() => {
    if (profile?.pattern_data) {
      const shift = getTodayShift(profile.pattern_data as PatternData)
      setTodayShift(shift)
    }

    // ── Fetch last 24hrs sleep ────────────────────────
    const fetchSleep = async () => {
      const since = new Date()
      since.setHours(since.getHours() - 24)

      const { data } = await supabase
        .from('shiftwell_sleep')
        .select('duration_minutes')
        .eq('user_id', user.id)
        .gte('sleep_start', since.toISOString())

      if (data && data.length > 0) {
        const total = data.reduce((sum, l) => sum + (l.duration_minutes || 0), 0)
        const h = Math.floor(total / 60)
        const m = total % 60
        setSleepStat(m > 0 ? `${h}h ${m}m` : `${h}h`)
      }
    }
    fetchSleep()

    const fetchBriefing = async () => {
     try {
        const { data: { session } } = await supabase.auth.getSession()
        const res = await fetch('/api/briefing', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`
          },
          body: JSON.stringify({ userId: user.id }),
        })
        const data = await res.json()
        setBriefing(data.briefing || '')
      } catch {
        setBriefing('Unable to load briefing right now. Check back shortly.')
      } finally {
        setLoadingBriefing(false)
      }
    }

    fetchBriefing()
  }, [])

  return (
    <div className="space-y-5 max-w-lg mx-auto">
      <div>
        <h2 className="text-2xl font-bold text-white">{greeting}, {name} 👋</h2>
        <p className="text-gray-500 text-sm mt-1">
          {todayShift
            ? todayShift.isOff
              ? 'Rest day — make it count'
              : `${todayShift.label} shift · ${formatShiftTime(todayShift.startTime, todayShift.endTime)}`
            : "Here's your shift wellness briefing"
          }
        </p>
      </div>

      {/* AI Briefing card */}
      <div className="bg-teal-950/60 border border-teal-700/30 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 rounded-full bg-teal-500 flex items-center justify-center text-xs">✦</div>
          <span className="text-teal-300 font-semibold text-sm">ShiftWell AI</span>
        </div>
        {loadingBriefing ? (
          <div className="space-y-2">
            <div className="h-3 bg-teal-900/60 rounded animate-pulse w-full" />
            <div className="h-3 bg-teal-900/60 rounded animate-pulse w-5/6" />
            <div className="h-3 bg-teal-900/60 rounded animate-pulse w-4/6" />
          </div>
        ) : (
          <p className="text-gray-300 text-sm leading-relaxed">{briefing}</p>
        )}
      </div>

      {/* Quick stats grid */}
      <div className="grid grid-cols-2 gap-3">
        {[
      { label: 'Sleep (24hrs)', value: sleepStat, icon: '🌙' },
          { label: 'Next meal',     value: 'Not set', icon: '🍽️' },
          {
            label: 'Today',
            value: todayShift?.label || 'Not set',
            icon: '🔄'
          },
          {
            label: 'Hydration',
            value: `${hydrationCount} / 8`,
            icon: '💧'
          },
        ].map(card => (
          <div key={card.label} className="bg-gray-900 rounded-xl p-4">
            <div className="text-2xl mb-2">{card.icon}</div>
            <div className="text-white font-semibold">{card.value}</div>
            <div className="text-gray-500 text-xs mt-1">{card.label}</div>
          </div>
        ))}
      </div>

      {/* Hydration tracker */}
      <HydrationCard
        user={user}
        profile={profile}
        onUpdate={(count) => setHydrationCount(count)}
      />

      {/* Rotation position */}
      {todayShift?.dayInCycle && (
        <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
          <p className="text-white font-semibold text-sm mb-1">
            📅 Day {todayShift.dayInCycle} of your rotation
          </p>
          <p className="text-gray-400 text-sm">
            {todayShift.isOff
              ? 'Rest day. Recovery is part of the job.'
              : `${todayShift.label} shift today — ${formatShiftTime(todayShift.startTime, todayShift.endTime)}`
            }
          </p>
        </div>
      )}
    </div>
  )
}

// ── SLEEP ────────────────────────────────────────────────
function SleepView({ user }: { user: User }) {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [sleepStart, setSleepStart] = useState('')
  const [sleepEnd, setSleepEnd] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const fetchLogs = async () => {
    const { data } = await supabase
      .from('shiftwell_sleep')
      .select('*')
      .eq('user_id', user.id)
      .order('sleep_start', { ascending: false })
      .limit(10)
    setLogs(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchLogs() }, [])

  const handleSave = async () => {
    if (!sleepStart || !sleepEnd) return
    setSaving(true)

    const { error } = await supabase
      .from('shiftwell_sleep')
      .insert({
        user_id: user.id,
        sleep_start: new Date(sleepStart).toISOString(),
        sleep_end: new Date(sleepEnd).toISOString(),
        notes: notes || null,
      })

    if (!error) {
      setShowForm(false)
      setSleepStart('')
      setSleepEnd('')
      setNotes('')
      fetchLogs()
    }
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    await supabase.from('shiftwell_sleep').delete().eq('id', id)
    fetchLogs()
  }

  const formatDuration = (minutes: number) => {
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    return m > 0 ? `${h}h ${m}m` : `${h}h`
  }

  const formatTime = (iso: string) => {
    return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  }

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
  }

  const totalToday = logs
    .filter(l => new Date(l.sleep_start).toDateString() === new Date().toDateString())
    .reduce((sum, l) => sum + (l.duration_minutes || 0), 0)

  return (
    <div className="space-y-4 max-w-lg mx-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Sleep</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-teal-500 hover:bg-teal-400 text-gray-950 font-semibold px-4 py-2 rounded-lg text-sm transition"
        >
          + Log sleep
        </button>
      </div>

      {/* Today summary */}
      <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
        <p className="text-gray-500 text-xs mb-1">Total sleep logged today</p>
        <p className="text-white text-3xl font-bold">
          {totalToday > 0 ? formatDuration(totalToday) : '—'}
        </p>
        <p className="text-gray-600 text-xs mt-1">Log any sleep window — naps count too</p>
      </div>

      {/* Log form */}
      {showForm && (
        <div className="bg-gray-900 rounded-2xl p-5 border border-teal-700/30 space-y-4">
          <p className="text-white font-semibold text-sm">Log a sleep window</p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Fell asleep</label>
              <input
                type="datetime-local"
                value={sleepStart}
                onChange={e => setSleepStart(e.target.value)}
                className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Woke up</label>
              <input
                type="datetime-local"
                value={sleepEnd}
                onChange={e => setSleepEnd(e.target.value)}
                className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Notes (optional)</label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500"
              placeholder="e.g. woke up twice, felt rested..."
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleSave}
              disabled={saving || !sleepStart || !sleepEnd}
              className="flex-1 bg-teal-500 hover:bg-teal-400 text-gray-950 font-semibold py-2 rounded-lg text-sm transition disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2 text-gray-400 hover:text-gray-200 text-sm transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Sleep log list */}
      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => (
            <div key={i} className="bg-gray-900 rounded-2xl p-4 border border-gray-800 animate-pulse h-16" />
          ))}
        </div>
      ) : logs.length === 0 ? (
        <div className="bg-gray-900 rounded-2xl p-8 text-center border border-gray-800">
          <div className="text-4xl mb-3">🌙</div>
          <p className="text-gray-400 text-sm">No sleep logged yet. Log any window — even a nap counts.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {logs.map(log => (
            <div key={log.id} className="bg-gray-900 rounded-2xl p-4 border border-gray-800 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-white font-semibold text-sm">
                    {formatDuration(log.duration_minutes)}
                  </span>
                  <span className="text-gray-600 text-xs">
                    {formatTime(log.sleep_start)} – {formatTime(log.sleep_end)}
                  </span>
                </div>
                <p className="text-gray-500 text-xs mt-0.5">{formatDate(log.sleep_start)}</p>
                {log.notes && <p className="text-gray-600 text-xs mt-0.5 italic">{log.notes}</p>}
              </div>
              <button
                onClick={() => handleDelete(log.id)}
                className="text-gray-700 hover:text-red-400 text-lg transition ml-4"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── HYDRATION ────────────────────────────────────────────
function HydrationCard({ user, profile, onUpdate }: { user: User, profile: any, onUpdate: (count: number) => void }) {
  const [count, setCount] = useState(0)
  const [saving, setSaving] = useState(false)
  const goal = 8

  useEffect(() => {
    const todayDate = new Date().toISOString().split('T')[0]
    if (profile?.hydration_date === todayDate) {
      setCount(profile?.hydration_count || 0)
    } else {
      setCount(0)
    }
  }, [profile])

  const updateCount = async (newCount: number) => {
    if (newCount < 0 || newCount > 20) return
    setSaving(true)
    const todayDate = new Date().toISOString().split('T')[0]

    await supabase
      .from('shiftwell_profiles')
      .update({
        hydration_count: newCount,
        hydration_date: todayDate,
      })
      .eq('id', user.id)

    setCount(newCount)
    onUpdate(newCount)
    setSaving(false)
  }

  const percentage = Math.min((count / goal) * 100, 100)

  return (
    <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-white font-semibold">💧 Hydration</p>
          <p className="text-gray-500 text-xs mt-0.5">
            {count >= goal
              ? 'Goal reached! Keep it up 💪'
              : `${goal - count} more to hit your goal`}
          </p>
        </div>
        <div className="text-right">
          <span className="text-2xl font-bold text-white">{count}</span>
          <span className="text-gray-500 text-sm"> / {goal}</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-gray-800 rounded-full mb-4 overflow-hidden">
        <div
          className="h-full bg-teal-500 rounded-full transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Glass indicators */}
      <div className="grid grid-cols-8 gap-1.5 mb-4">
        {Array.from({ length: goal }).map((_, i) => (
          <button
            key={i}
            onClick={() => updateCount(i < count ? i : i + 1)}
            disabled={saving}
            className={`aspect-square rounded-lg flex items-center justify-center text-lg transition-colors ${
              i < count
                ? 'bg-teal-500/30 border border-teal-500/50'
                : 'bg-gray-800 border border-gray-700'
            }`}
          >
            <span className={i < count ? 'opacity-100' : 'opacity-30'}>💧</span>
          </button>
        ))}
      </div>

      {/* Controls */}
      <div className="flex gap-3">
        <button
          onClick={() => updateCount(count - 1)}
          disabled={count === 0 || saving}
          className="flex-1 bg-gray-800 hover:bg-gray-700 text-white font-bold py-2 rounded-lg transition disabled:opacity-30 text-lg"
        >
          −
        </button>
        <button
          onClick={() => updateCount(count + 1)}
          disabled={count >= 20 || saving}
          className="flex-2 bg-teal-500 hover:bg-teal-400 text-gray-950 font-bold py-2 px-8 rounded-lg transition disabled:opacity-50 text-sm font-semibold"
        >
          + Add glass
        </button>
        <button
          onClick={() => updateCount(count - 1)}
          disabled={count === 0 || saving}
          className="flex-1 bg-gray-800 hover:bg-gray-700 text-white font-bold py-2 rounded-lg transition disabled:opacity-30 text-lg"
        >
          −
        </button>
      </div>
    </div>
  )
}

// ── FOOD ─────────────────────────────────────────────────
function FoodView() {
  return (
    <div className="space-y-4 max-w-lg mx-auto">
      <h2 className="text-2xl font-bold text-white">Food</h2>
      <div className="bg-gray-900 rounded-2xl p-8 text-center border border-gray-800">
        <div className="text-5xl mb-4">🍽️</div>
        <h3 className="text-white font-semibold mb-2">Meal planner</h3>
        <p className="text-gray-400 text-sm leading-relaxed">
          No breakfast, lunch, or dinner here. Just Meal 1, 2, 3 —
          whenever your shift says it is time to eat.
        </p>
        <div className="mt-4 inline-block bg-teal-900/40 text-teal-300 text-xs px-3 py-1 rounded-full">
          Coming in Sprint 4
        </div>
      </div>
    </div>
  )
}

// ── ROUTINES ─────────────────────────────────────────────
function RoutinesView() {
  return (
    <div className="space-y-4 max-w-lg mx-auto">
      <h2 className="text-2xl font-bold text-white">Routines</h2>
      <div className="bg-gray-900 rounded-2xl p-8 text-center border border-gray-800">
        <div className="text-5xl mb-4">⚡</div>
        <h3 className="text-white font-semibold mb-2">Shift-friendly workouts</h3>
        <p className="text-gray-400 text-sm leading-relaxed">
          15 minutes in your scrubs counts. Short, home-based routines
          that work before or after any shift.
        </p>
        <div className="mt-4 inline-block bg-teal-900/40 text-teal-300 text-xs px-3 py-1 rounded-full">
          Coming in Sprint 3
        </div>
      </div>
    </div>
  )
}

// ── COMPANION ─────────────────────────────────────────────
function CompanionView({ user, profile }: { user: User, profile: any }) {
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant', content: string }[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [opening, setOpening] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const hour = new Date().getHours()
  const name = user?.user_metadata?.full_name?.split(' ')[0] || 'there'

  const getOpeningMessage = () => {
    const shift = profile?.pattern_data
      ? getTodayShift(profile.pattern_data as PatternData)
      : null

    if (hour >= 0 && hour < 5) {
      return `Hey ${name} — still going at ${new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}. ${shift && !shift.isOff ? `Night ${shift.dayInCycle} of your rotation.` : ''} How are you holding up?`
    }
    if (hour >= 5 && hour < 12) {
      return `Morning ${name}. ${shift?.isOff ? 'Rest day today — how are you feeling?' : `${shift?.label} shift today. How did the night treat you?`}`
    }
    if (hour >= 12 && hour < 18) {
      return `Hey ${name}. ${shift?.isOff ? 'Hope you\'re making the most of your day off.' : `${shift?.label} shift ahead — how are you feeling going into it?`}`
    }
    return `Evening ${name}. ${shift?.isOff ? 'Rest day winding down — how was it?' : `How\'s the ${shift?.label} shift going?`}`
  }

  useEffect(() => {
    const openingMsg = getOpeningMessage()
    setMessages([{ role: 'assistant', content: openingMsg }])
    setOpening(false)
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async () => {
    if (!input.trim() || loading) return

    const userMessage = { role: 'user' as const, content: input.trim() }
    const updatedMessages = [...messages, userMessage]
    setMessages(updatedMessages)
    setInput('')
    setLoading(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/companion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          messages: updatedMessages.map(m => ({
            role: m.role,
            content: m.content
          }))
        }),
      })

      const data = await res.json()
      if (data.reply) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.reply }])
      }
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I lost connection for a moment. Try again?'
      }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full max-w-lg mx-auto" style={{ height: 'calc(100vh - 140px)' }}>

      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-teal-950 border border-teal-700/40 flex items-center justify-center text-lg">
          ✦
        </div>
        <div>
          <p className="text-white font-semibold text-sm">ShiftWell Companion</p>
          <p className="text-teal-400 text-xs">Here whenever you need it</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 pb-4">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-teal-600 text-white rounded-br-sm'
                  : 'bg-gray-900 text-gray-200 border border-gray-800 rounded-bl-sm'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-900 border border-gray-800 rounded-2xl rounded-bl-sm px-4 py-3">
              <div className="flex gap-1 items-center">
                <div className="w-1.5 h-1.5 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1.5 h-1.5 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-1.5 h-1.5 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex gap-2 pt-2 border-t border-gray-800">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') sendMessage() }}
          placeholder="Type something..."
          className="flex-1 bg-gray-900 border border-gray-800 text-white rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-teal-500 placeholder-gray-600"
        />
        <button
          onClick={sendMessage}
          disabled={loading || !input.trim()}
          className="bg-teal-500 hover:bg-teal-400 text-gray-950 font-bold px-4 rounded-xl transition disabled:opacity-40"
        >
          ↑
        </button>
      </div>
    </div>
  )
}

// ── SETTINGS ─────────────────────────────────────────────
function SettingsView({ user, profile, onSignOut }: { user: User, profile: any, onSignOut: () => void }) {
  const router = useRouter()

  return (
    <div className="space-y-4 max-w-lg mx-auto">
      <h2 className="text-2xl font-bold text-white">Settings</h2>

      {/* Profile */}
      <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-teal-600 flex items-center justify-center text-white text-lg font-bold">
            {user?.user_metadata?.full_name?.[0] || user.email?.[0].toUpperCase()}
          </div>
          <div>
            <p className="text-white font-semibold">
              {user?.user_metadata?.full_name || 'ShiftWell user'}
            </p>
            <p className="text-gray-400 text-sm">{user.email}</p>
          </div>
        </div>
      </div>

      {/* Settings items */}
      <div className="bg-gray-900 rounded-2xl overflow-hidden border border-gray-800">
        {[
          {
            label: 'Shift pattern',
            sub: profile?.pattern_type === 'fixed' ? 'Fixed rotation' : profile?.pattern_type === 'nights' ? 'Nights only' : 'Not set',
            icon: '🔄',
            onClick: () => router.push('/onboarding')
          },
          {
            label: 'Notifications',
            sub: 'Alerts and reminders',
            icon: '🔔',
            onClick: () => {}
          },
          {
            label: 'Subscription',
            sub: '14-day trial active',
            icon: '💳',
            onClick: () => {}
          },
        ].map((item, i) => (
          <div
            key={item.label}
            onClick={item.onClick}
            className={`flex items-center gap-4 p-4 cursor-pointer hover:bg-gray-800 transition ${
              i > 0 ? 'border-t border-gray-800' : ''
            }`}
          >
            <span className="text-2xl">{item.icon}</span>
            <div className="flex-1">
              <p className="text-white text-sm font-medium">{item.label}</p>
              <p className="text-gray-500 text-xs">{item.sub}</p>
            </div>
            <span className="text-gray-600 text-lg">›</span>
          </div>
        ))}
      </div>

      <button
        onClick={onSignOut}
        className="w-full bg-gray-900 border border-gray-800 text-red-400 font-semibold py-4 rounded-2xl hover:bg-gray-800 transition"
      >
        Sign out
      </button>

      <p className="text-center text-gray-700 text-xs pb-4">ShiftWell v0.2 — Sprint 2</p>
    </div>
  )
}
