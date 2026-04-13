import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useRouter } from 'next/router'
import { getTodayShift, formatShiftTime } from '../lib/shiftEngine'
import type { User } from '@supabase/supabase-js'
import type { PatternData, TodayShift } from '../lib/shiftEngine'
import { ROUTINES, CATEGORY_META, getRecommendedRoutine } from '../lib/routines'
import { getFoodPlan, getNextMeal } from '../lib/foodEngine'

const tabs = [
  { id: 'today',     label: 'Today',     icon: '☀️' },
  { id: 'sleep',     label: 'Sleep',     icon: '🌙' },
  { id: 'food',      label: 'Food',      icon: '🍽️' },
  { id: 'community', label: 'Community', icon: '💬' },
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

      // ── Paywall check ────────────────────────────────
      const status = profile?.subscription_status
      const trialEnd = profile?.trial_ends_at
        ? new Date(profile.trial_ends_at)
        : null

      const trialExpired = trialEnd && trialEnd < new Date()
      const isActive = status === 'active' || status === 'trialing'
      const isCanceled = status === 'canceled' || status === 'past_due'

      if (isCanceled || (trialExpired && status !== 'active')) {
        router.push('/subscribe?expired=true')
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
                {
                  label: 'Shift & profile',
                  icon: '🔄',
                  sub: profile?.pattern_type === 'fixed' ? 'Fixed rotation' :
                     profile?.pattern_type === 'nights' ? 'Nights only' :
                     profile?.pattern_type === 'variable' ? 'Variable schedule' : 'Edit',
                  onClick: () => { router.push('/edit-schedule'); setShowProfileMenu(false) }
                },
                {
                  label: 'Notifications',
                  icon: '🔔',
                  sub: 'Coming soon',
                  onClick: () => setShowProfileMenu(false)
                },
                {
                  label: 'Subscription',
                  icon: '💳',
                  sub: profile?.subscription_status === 'active' ? 'Active' :
                       profile?.subscription_status === 'trialing' ? '14-day trial' :
                       profile?.subscription_status === 'past_due' ? 'Payment failed' :
                       profile?.subscription_status === 'canceled' ? 'Canceled' : 'Manage',
                  onClick: async () => {
                    setShowProfileMenu(false)
                    const { data: { session } } = await supabase.auth.getSession()
                    if (!session) return
                    const res = await fetch('/api/stripe/portal', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${session.access_token}`
                      }
                    })
                    const data = await res.json()
                    if (data.url) window.location.href = data.url
                  }
                },
              ].map((item, i) => (
                <button
                  key={item.label}
                  onClick={item.onClick}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-700 transition border-b border-gray-700/50 last:border-0`}
                >
                  <span>{item.icon}</span>
                  <div className="flex-1">
                    <p className="text-white text-sm">{item.label}</p>
                    <p className="text-gray-500 text-xs">{item.sub}</p>
                  </div>
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
        {activeTab === 'food' && <FoodView profile={profile} />}
        {activeTab === 'community' && <CommunityView user={user} profile={profile} />}
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
  const [nextMeal, setNextMeal] = useState('—')
  const [journalEntry, setJournalEntry] = useState<any>(null)
  const [journalRefresh, setJournalRefresh] = useState(0)
  const [streak, setStreak] = useState(profile?.streak_count || 0)

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
      if (shift && !shift.isOff) {
        setNextMeal(getNextMeal(shift, profile?.dietary_restrictions || []))
      } else if (shift?.isOff) {
        setNextMeal('Rest day')
      }
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
          body: JSON.stringify({
            userId: user.id,
            localTime: new Date().toISOString(),
            localDate: new Date().toLocaleDateString('en-CA'), // gives YYYY-MM-DD in local time
          }),
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

    const fetchJournalEntry = async () => {
      const today = new Date().toISOString().split('T')[0]
      const { data } = await supabase
        .from('shiftwell_journal')
        .select('*')
        .eq('user_id', user.id)
        .eq('shift_date', today)
        .maybeSingle()
      setJournalEntry(data || null)
    }
    fetchJournalEntry()

    const maintainRestDayStreak = async () => {
      if (!profile?.pattern_data) return
      const shift = getTodayShift(profile.pattern_data as PatternData)
      if (!shift?.isOff) return

      const today = new Date().toLocaleDateString('en-CA')
      if (profile?.streak_last_date === today) return

      const yesterday = new Date(Date.now() - 86400000).toLocaleDateString('en-CA')
      const newStreak = profile?.streak_last_date === yesterday
        ? (profile?.streak_count || 0) + 1
        : (profile?.streak_count || 0) > 0 ? profile.streak_count : 1

      await supabase
        .from('shiftwell_profiles')
        .update({ streak_count: newStreak, streak_last_date: today })
        .eq('id', user.id)

      setStreak(newStreak)
    }
    maintainRestDayStreak()
    
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

      {/* Streak card */}
      <StreakCard streak={streak} />

      {/* Quick stats grid */}
      <div className="grid grid-cols-2 gap-3">
        {[
      { label: 'Sleep (24hrs)', value: sleepStat, icon: '🌙' },
      { label: 'Next meal', value: nextMeal, icon: '🍽️' },
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

      {/* Quick routines */}
      <QuickRoutinesStrip profile={profile} />
      
      {/* Shift journal */}
      <ShiftJournalCard
        user={user}
        profile={profile}
        todayShift={todayShift}
        existingEntry={journalEntry}
        onSaved={(newStreak?: number) => {
          if (newStreak !== undefined) setStreak(newStreak)
          const today = new Date().toISOString().split('T')[0]
          supabase
            .from('shiftwell_journal')
            .select('*')
            .eq('user_id', user.id)
            .eq('shift_date', today)
            .maybeSingle()
            .then(({ data }) => setJournalEntry(data || null))
        }}
      />
    </div>
  )
}

// ── SLEEP ────────────────────────────────────────────────
function SleepView({ user }: { user: User }) {
  const [logs, setLogs] = useState<any[]>([])
  const [weekLogs, setWeekLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [sleepStart, setSleepStart] = useState('')
  const [sleepEnd, setSleepEnd] = useState('')
  const [notes, setNotes] = useState('')
  const [sleepType, setSleepType] = useState<'main' | 'nap'>('main')
  const [saving, setSaving] = useState(false)

  const fetchLogs = async () => {
    const { data } = await supabase
      .from('shiftwell_sleep')
      .select('*')
      .eq('user_id', user.id)
      .order('sleep_start', { ascending: false })
      .limit(10)
    setLogs(data || [])

    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)
    sevenDaysAgo.setHours(0, 0, 0, 0)

    const { data: weekData } = await supabase
      .from('shiftwell_sleep')
      .select('*')
      .eq('user_id', user.id)
      .gte('sleep_start', sevenDaysAgo.toISOString())
      .order('sleep_start', { ascending: true })

    setWeekLogs(weekData || [])
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
        sleep_type: sleepType,
      })
    if (!error) {
      setShowForm(false)
      setSleepStart('')
      setSleepEnd('')
      setNotes('')
      setSleepType('main')
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

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })

  const totalToday = logs
    .filter(l => new Date(l.sleep_end).toDateString() === new Date().toDateString())
    .reduce((sum, l) => sum + (l.duration_minutes || 0), 0)

  // Build 7-day graph — keyed by WAKE UP day, main sleep only for bar height
  const last7Days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    const dateStr = d.toDateString()

    // Filter by wake-up day (sleep_end)
    const dayLogs = weekLogs.filter(l => new Date(l.sleep_end).toDateString() === dateStr)

    // Main sleep = longest window OR type === 'main'
    const mainLogs = dayLogs.filter(l => l.sleep_type === 'main' || !l.sleep_type)
    const napLogs = dayLogs.filter(l => l.sleep_type === 'nap')

    // Use longest main sleep for bar
    const mainMins = mainLogs.length > 0
      ? Math.max(...mainLogs.map(l => l.duration_minutes || 0))
      : 0
    const hours = mainMins / 60
    const hasNap = napLogs.length > 0
    const label = d.toLocaleDateString('en-GB', { weekday: 'short' })
    const isToday = dateStr === new Date().toDateString()
    return { label, hours, isToday, hasNap }
  })

  const maxHours = Math.max(...last7Days.map(d => d.hours), 8)

  const barColor = (hours: number) => {
    if (hours === 0) return '#1f2937'
    if (hours >= 7) return '#2dd4bf'
    if (hours >= 5) return '#fbbf24'
    return '#f87171'
  }

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

      {/* 7-day sleep graph */}
      <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
        <div className="flex items-center justify-between mb-4">
          <p className="text-white font-semibold text-sm">Last 7 days</p>
          <p className="text-gray-600 text-xs">Main sleep by wake-up day</p>
        </div>
        <div className="flex gap-2" style={{ alignItems: 'flex-end', height: 80 }}>
          {last7Days.map((day, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1" style={{ position: 'relative' }}>
              <span style={{ fontSize: 9, color: '#6b7280', height: 12 }}>
                {day.hours > 0 ? `${Math.round(day.hours * 10) / 10}h` : ''}
              </span>
              <div style={{ position: 'relative', width: '100%' }}>
                {/* Nap dot */}
                {day.hasNap && (
                  <div style={{
                    position: 'absolute', top: -5, right: 1,
                    width: 7, height: 7, borderRadius: '50%',
                    background: '#fbbf24', border: '1px solid #090c14',
                    zIndex: 2,
                  }} />
                )}
                <div style={{
                  width: '100%',
                  height: day.hours > 0 ? `${Math.max((day.hours / maxHours) * 56, 4)}px` : '4px',
                  background: barColor(day.hours),
                  borderRadius: '4px 4px 0 0',
                  opacity: day.isToday ? 1 : 0.8,
                  transition: 'height 0.3s ease',
                  border: day.isToday ? '1px solid rgba(45,212,191,0.4)' : 'none',
                }} />
              </div>
            </div>
          ))}
        </div>

        {/* Day labels */}
        <div className="flex gap-2 mt-2">
          {last7Days.map((day, i) => (
            <div key={i} className="flex-1 text-center" style={{ fontSize: 10, color: day.isToday ? '#2dd4bf' : '#6b7280' }}>
              {day.label}
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="flex gap-3 mt-3 justify-center flex-wrap">
          {[
            { color: '#2dd4bf', label: '7h+' },
            { color: '#fbbf24', label: '5–7h' },
            { color: '#f87171', label: '<5h' },
          ].map(item => (
            <div key={item.label} className="flex items-center gap-1.5">
              <div style={{ width: 8, height: 8, borderRadius: 2, background: item.color }} />
              <span style={{ fontSize: 10, color: '#6b7280' }}>{item.label}</span>
            </div>
          ))}
          <div className="flex items-center gap-1.5">
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#fbbf24' }} />
            <span style={{ fontSize: 10, color: '#6b7280' }}>+ nap</span>
          </div>
        </div>
      </div>

      {/* Log form */}
      {showForm && (
        <div className="bg-gray-900 rounded-2xl p-5 border border-teal-700/30 space-y-4">
          <p className="text-white font-semibold text-sm">Log a sleep window</p>

          {/* Sleep type toggle */}
          <div className="flex gap-2 p-1 bg-gray-800 rounded-xl">
            {(['main', 'nap'] as const).map(type => (
              <button
                key={type}
                onClick={() => setSleepType(type)}
                className="flex-1 py-2 rounded-lg text-sm font-semibold transition"
                style={{
                  background: sleepType === type ? '#2dd4bf' : 'transparent',
                  color: sleepType === type ? '#090c14' : '#9ca3af',
                }}
              >
                {type === 'main' ? '🌙 Main sleep' : '💤 Nap'}
              </button>
            ))}
          </div>

          {/* Datetime inputs — stacked to avoid overlap */}
          <div className="flex flex-col gap-3">
            <div className="bg-gray-800 rounded-lg px-3 py-2">
              <label className="block text-xs text-gray-500 mb-1">Fell asleep</label>
              <input
                type="datetime-local"
                value={sleepStart}
                onChange={e => setSleepStart(e.target.value)}
                style={{ width: '100%', background: 'transparent', color: 'white', border: 'none', outline: 'none', fontSize: 14 }}
              />
            </div>
            <div className="bg-gray-800 rounded-lg px-3 py-2">
              <label className="block text-xs text-gray-500 mb-1">Woke up</label>
              <input
                type="datetime-local"
                value={sleepEnd}
                onChange={e => setSleepEnd(e.target.value)}
                style={{ width: '100%', background: 'transparent', color: 'white', border: 'none', outline: 'none', fontSize: 14 }}
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
                  <span className="text-base">
                    {log.sleep_type === 'nap' ? '💤' : '🌙'}
                  </span>
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
function FoodView({ profile }: { profile: any }) {
  const todayShift = profile?.pattern_data
    ? getTodayShift(profile.pattern_data as PatternData)
    : null

  if (!todayShift) {
    return (
      <div className="space-y-4 max-w-lg mx-auto">
        <h2 className="text-2xl font-bold text-white">Food</h2>
        <div className="bg-gray-900 rounded-2xl p-8 text-center border border-gray-800">
          <div className="text-5xl mb-4">🍽️</div>
          <p className="text-gray-400 text-sm">Set up your shift pattern in Settings to unlock your meal timing guide.</p>
        </div>
      </div>
    )
  }

  const plan = getFoodPlan(todayShift, profile?.dietary_restrictions || [])

  return (
    <div className="space-y-5 max-w-lg mx-auto">
      <div>
        <h2 className="text-2xl font-bold text-white">Food</h2>
        <p className="text-gray-500 text-sm mt-1">
          {todayShift.isOff ? 'Rest day' : `${todayShift.label} shift · ${formatShiftTime(todayShift.startTime, todayShift.endTime)}`}
        </p>
      </div>

      {/* Prep tip */}
      <div className="bg-teal-950/60 border border-teal-700/30 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 rounded-full bg-teal-500 flex items-center justify-center text-xs">✦</div>
          <span className="text-teal-300 font-semibold text-sm">Shift tip</span>
        </div>
        <p className="text-gray-300 text-sm leading-relaxed">{plan.prepTip}</p>
      </div>

      {/* Meal windows */}
      <div className="space-y-3">
        {plan.meals.map((meal, i) => (
          <div key={i} className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
            {/* Meal header */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-800">
              <span className="text-2xl">{meal.icon}</span>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <p className="text-white font-semibold text-sm">{meal.label}</p>
                  <span className="text-teal-400 text-xs font-medium">{meal.time}</span>
                </div>
                <p className="text-gray-500 text-xs mt-0.5">{meal.description}</p>
              </div>
            </div>

            {/* Suggestion */}
            <div className="px-5 py-3">
              <p className="text-xs text-gray-600 mb-1">Suggestion</p>
              <p className="text-gray-300 text-sm leading-relaxed">{meal.suggestion}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Note */}
      <div className="bg-gray-900 rounded-2xl p-4 border border-gray-800">
        <p className="text-gray-600 text-xs leading-relaxed text-center">
          Meal times are calculated from your shift pattern. Never breakfast, lunch or dinner — just Meal 1, 2, 3 whenever your body needs them.
        </p>
      </div>
    </div>
  )
}

// ── ROUTINES ─────────────────────────────────────────────
function RoutinesView({ user, profile }: { user: User, profile: any }) {
  const [activeRoutine, setActiveRoutine] = useState<any>(null)
  const [activeExerciseIndex, setActiveExerciseIndex] = useState(0)
  const [timeLeft, setTimeLeft] = useState(0)
  const [isResting, setIsResting] = useState(false)
  const [isRunning, setIsRunning] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const todayShift = profile?.pattern_data
    ? getTodayShift(profile.pattern_data as PatternData)
    : null

  const recommended = todayShift
    ? getRecommendedRoutine(todayShift.label, todayShift.isOff, new Date().getHours())
    : ROUTINES[0]

  const filteredRoutines = selectedCategory
    ? ROUTINES.filter(r => r.category === selectedCategory)
    : ROUTINES

  useEffect(() => {
    if (!isRunning) return
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          handleTimerEnd()
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [isRunning, activeExerciseIndex, isResting])

  const handleTimerEnd = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    setIsRunning(false)

    if (!activeRoutine) return
    const exercise = activeRoutine.exercises[activeExerciseIndex]

    if (!isResting && exercise.rest && exercise.rest > 0) {
      setIsResting(true)
      setTimeLeft(exercise.rest)
      setIsRunning(true)
      return
    }

    const nextIndex = activeExerciseIndex + 1
    if (nextIndex >= activeRoutine.exercises.length) {
      setIsComplete(true)
      logRoutine()
      return
    }

    setIsResting(false)
    setActiveExerciseIndex(nextIndex)
    setTimeLeft(activeRoutine.exercises[nextIndex].duration)
    setIsRunning(true)
  }

  const logRoutine = async () => {
    const { data: { user: u } } = await supabase.auth.getUser()
    if (!u || !activeRoutine) return
    await supabase.from('shiftwell_routines_log').insert({
      user_id: u.id,
      routine_name: activeRoutine.name,
      category: activeRoutine.category,
      duration_minutes: activeRoutine.duration,
    })
  }

  const startRoutine = (routine: any) => {
    setActiveRoutine(routine)
    setActiveExerciseIndex(0)
    setTimeLeft(routine.exercises[0].duration)
    setIsResting(false)
    setIsRunning(false)
    setIsComplete(false)
  }

  const toggleTimer = () => setIsRunning(prev => !prev)

  const skipExercise = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    setIsRunning(false)
    const nextIndex = activeExerciseIndex + 1
    if (nextIndex >= activeRoutine.exercises.length) {
      setIsComplete(true)
      logRoutine()
      return
    }
    setIsResting(false)
    setActiveExerciseIndex(nextIndex)
    setTimeLeft(activeRoutine.exercises[nextIndex].duration)
  }

  const exitRoutine = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    setActiveRoutine(null)
    setIsRunning(false)
    setIsComplete(false)
  }

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

  const circumference = 2 * Math.PI * 45

  // ── Active routine view ──
  if (activeRoutine) {
    const exercise = activeRoutine.exercises[activeExerciseIndex]
    const totalDuration = isResting ? (exercise.rest || 0) : exercise.duration
    const progress = totalDuration > 0 ? (timeLeft / totalDuration) : 0

    if (isComplete) {
      return (
        <div className="max-w-lg mx-auto text-center space-y-6 pt-8">
          <div className="text-6xl">🎉</div>
          <h2 className="text-2xl font-bold text-white">Routine complete!</h2>
          <p className="text-gray-400">{activeRoutine.name} — {activeRoutine.duration} mins done.</p>
          <div className="bg-teal-950/60 border border-teal-700/30 rounded-2xl p-5">
            <p className="text-teal-300 text-sm">Logged to your history. That counts — no matter how small it felt.</p>
          </div>
          <button
            onClick={exitRoutine}
            className="w-full bg-teal-500 hover:bg-teal-400 text-gray-950 font-semibold py-3 rounded-xl transition"
          >
            Back to routines
          </button>
        </div>
      )
    }

    return (
      <div className="max-w-lg mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-white font-bold text-lg">{activeRoutine.name}</h2>
            <p className="text-gray-500 text-xs mt-0.5">
              Exercise {activeExerciseIndex + 1} of {activeRoutine.exercises.length}
            </p>
          </div>
          <button onClick={exitRoutine} className="text-gray-600 hover:text-gray-400 text-sm transition">
            Exit
          </button>
        </div>

        {/* Progress bar */}
        <div className="flex gap-1">
          {activeRoutine.exercises.map((_: any, i: number) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors ${
                i < activeExerciseIndex ? 'bg-teal-500' :
                i === activeExerciseIndex ? 'bg-teal-400' : 'bg-gray-800'
              }`}
            />
          ))}
        </div>

        {/* Timer circle */}
        <div className="flex flex-col items-center py-6">
          <div className="relative w-36 h-36">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="45" fill="none" stroke="#1f2937" strokeWidth="8" />
              <circle
                cx="50" cy="50" r="45" fill="none"
                stroke={isResting ? '#6366f1' : '#2dd4bf'}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={circumference * (1 - progress)}
                className="transition-all duration-1000"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-white text-3xl font-bold">{formatTime(timeLeft)}</span>
              <span className="text-gray-500 text-xs mt-1">{isResting ? 'Rest' : 'Go'}</span>
            </div>
          </div>
        </div>

        {/* Exercise card */}
        <div className={`rounded-2xl p-5 border ${isResting ? 'bg-indigo-950/40 border-indigo-700/30' : 'bg-gray-900 border-gray-800'}`}>
          <p className={`font-semibold text-lg mb-2 ${isResting ? 'text-indigo-300' : 'text-white'}`}>
            {isResting ? '💤 Rest' : exercise.name}
          </p>
          <p className="text-gray-400 text-sm leading-relaxed">
            {isResting ? 'Breathe. Next exercise coming up.' : exercise.instruction}
          </p>
        </div>

        {/* Next up */}
        {!isResting && activeExerciseIndex + 1 < activeRoutine.exercises.length && (
          <div className="bg-gray-900/50 rounded-xl p-3 border border-gray-800">
            <p className="text-gray-600 text-xs">Next up</p>
            <p className="text-gray-400 text-sm">{activeRoutine.exercises[activeExerciseIndex + 1].name}</p>
          </div>
        )}

        {/* Controls */}
        <div className="flex gap-3">
          <button
            onClick={toggleTimer}
            className="flex-1 bg-teal-500 hover:bg-teal-400 text-gray-950 font-bold py-4 rounded-xl transition text-lg"
          >
            {isRunning ? '⏸' : '▶'}
          </button>
          <button
            onClick={skipExercise}
            className="bg-gray-800 hover:bg-gray-700 text-gray-400 font-medium px-5 py-4 rounded-xl transition text-sm"
          >
            Skip →
          </button>
        </div>
      </div>
    )
  }

  // ── Routine browser ──
  return (
    <div className="space-y-5 max-w-lg mx-auto">
      <h2 className="text-2xl font-bold text-white">Routines</h2>

      {/* AI Recommendation */}
      <div className="bg-teal-950/60 border border-teal-700/30 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 rounded-full bg-teal-500 flex items-center justify-center text-xs">✦</div>
          <span className="text-teal-300 font-semibold text-sm">Recommended for you</span>
          <span className="ml-auto text-gray-600 text-xs">
            {todayShift?.isOff ? 'Rest day' : `${todayShift?.label} shift`}
          </span>
        </div>
        <p className="text-white font-semibold mb-1">{recommended.name}</p>
        <p className="text-gray-400 text-sm mb-4">{recommended.description}</p>
        <div className="flex items-center justify-between">
          <span className="text-gray-600 text-xs">⏱ {recommended.duration} mins · {recommended.exercises.length} exercises</span>
          <button
            onClick={() => startRoutine(recommended)}
            className="bg-teal-500 hover:bg-teal-400 text-gray-950 font-semibold px-4 py-2 rounded-lg text-sm transition"
          >
            Start →
          </button>
        </div>
      </div>

      {/* Category filter */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setSelectedCategory(null)}
          className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition ${
            !selectedCategory ? 'bg-teal-500 text-gray-950' : 'bg-gray-800 text-gray-400'
          }`}
        >
          All
        </button>
        {Object.entries(CATEGORY_META).map(([key, meta]) => (
          <button
            key={key}
            onClick={() => setSelectedCategory(selectedCategory === key ? null : key)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition ${
              selectedCategory === key ? 'bg-teal-500 text-gray-950' : 'bg-gray-800 text-gray-400'
            }`}
          >
            {meta.icon} {meta.label}
          </button>
        ))}
      </div>

      {/* Routine list */}
      <div className="space-y-3">
        {filteredRoutines.map(routine => (
          <div key={routine.id} className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">{CATEGORY_META[routine.category].icon}</span>
                  <p className="text-white font-semibold text-sm">{routine.name}</p>
                </div>
                <p className="text-gray-400 text-xs leading-relaxed">{routine.description}</p>
              </div>
            </div>
            <div className="flex items-center justify-between mt-3">
              <span className="text-gray-600 text-xs">⏱ {routine.duration} mins · {routine.exercises.length} exercises</span>
              <button
                onClick={() => startRoutine(routine)}
                className="bg-gray-800 hover:bg-gray-700 text-teal-400 font-semibold px-4 py-2 rounded-lg text-sm transition border border-gray-700"
              >
                Start →
              </button>
            </div>
          </div>
        ))}
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

// ── STREAK CARD ───────────────────────────────────────────
function StreakCard({ streak }: { streak: number }) {
  const getMessage = () => {
    if (streak === 0) return 'Log your first shift to start your streak'
    if (streak === 1) return 'Day 1 — you showed up'
    if (streak < 7) return 'Building momentum — keep going'
    if (streak < 14) return 'One week strong 💪'
    if (streak < 28) return 'Two weeks in — this is becoming a habit'
    if (streak < 60) return 'A month of showing up. Seriously impressive.'
    return "You're unstoppable 🏆"
  }

  return (
    <div style={{
      background: streak > 0
        ? 'linear-gradient(135deg, rgba(245,158,11,0.12), rgba(251,191,36,0.06))'
        : 'rgba(17,24,39,0.8)',
      border: streak > 0
        ? '1px solid rgba(245,158,11,0.3)'
        : '1px solid rgba(255,255,255,0.06)',
      borderRadius: 16,
      padding: '16px 20px',
      display: 'flex',
      alignItems: 'center',
      gap: 16,
    }}>
      <div style={{ fontSize: 36, lineHeight: 1 }}>
        {streak === 0 ? '🔥' : streak >= 30 ? '🔥' : streak >= 7 ? '🔥' : '🔥'}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span style={{
            fontFamily: 'system-ui, sans-serif',
            fontWeight: 800,
            fontSize: 32,
            color: streak > 0 ? '#fbbf24' : '#4b5563',
            lineHeight: 1,
          }}>
            {streak}
          </span>
          <span style={{
            fontSize: 13,
            fontWeight: 600,
            color: streak > 0 ? '#f59e0b' : '#4b5563',
          }}>
            {streak === 1 ? 'day streak' : 'day streak'}
          </span>
        </div>
        <p style={{
          fontSize: 11,
          color: streak > 0 ? '#d97706' : '#6b7280',
          marginTop: 3,
          fontWeight: 400,
        }}>
          {getMessage()}
        </p>
      </div>
    </div>
  )
}

// ── SHIFT JOURNAL ─────────────────────────────────────────
function ShiftJournalCard({ user, profile, todayShift, existingEntry, onSaved }: {
  user: User
  profile: any
  todayShift: TodayShift | null
  existingEntry: any
  onSaved: (newStreak?: number) => void
}){
  const [rating, setRating] = useState<number | null>(null)
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [history, setHistory] = useState<any[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  const RATINGS = [
    { value: 1, emoji: '😩', label: 'Brutal' },
    { value: 2, emoji: '😔', label: 'Rough' },
    { value: 3, emoji: '😐', label: 'Okay' },
    { value: 4, emoji: '🙂', label: 'Good' },
    { value: 5, emoji: '😄', label: 'Great' },
  ]

  const fetchHistory = async () => {
    setLoadingHistory(true)
    const { data } = await supabase
      .from('shiftwell_journal')
      .select('*')
      .eq('user_id', user.id)
      .order('shift_date', { ascending: false })
      .limit(14)
    setHistory(data || [])
    setLoadingHistory(false)
  }

  const handleToggleHistory = () => {
    if (!showHistory && history.length === 0) fetchHistory()
    setShowHistory(h => !h)
  }

  const handleSave = async () => {
    if (!rating) return
    setSaving(true)
    const today = new Date().toLocaleDateString('en-CA')
    const shiftType = todayShift?.isOff ? 'Rest day' : (todayShift?.label || 'Unknown')

    const { error } = await supabase
      .from('shiftwell_journal')
      .upsert(
        { user_id: user.id, shift_date: today, shift_type: shiftType, rating, note: note.trim() || null },
        { onConflict: 'user_id,shift_date' }
      )

    if (!error) {
      // Update streak
      const yesterday = new Date(Date.now() - 86400000).toLocaleDateString('en-CA')
      const lastDate = profile?.streak_last_date
      let newStreak = 1
      if (lastDate === today) {
        newStreak = profile?.streak_count || 1
      } else if (lastDate === yesterday) {
        newStreak = (profile?.streak_count || 0) + 1
      }

      await supabase
        .from('shiftwell_profiles')
        .update({ streak_count: newStreak, streak_last_date: today })
        .eq('id', user.id)

      onSaved(newStreak)
    }
    setSaving(false)
  }

  const formatEntryDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T12:00:00')
    return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
  }

  const HistoryList = ({ entries }: { entries: any[] }) => (
    <div className="mt-4 border-t border-gray-800 pt-4 space-y-3">
      {loadingHistory ? (
        <p className="text-gray-600 text-xs text-center py-2">Loading...</p>
      ) : entries.length === 0 ? (
        <p className="text-gray-600 text-xs text-center py-2">No previous entries yet.</p>
      ) : (
        entries.map(entry => {
          const r = RATINGS.find(r => r.value === entry.rating)
          return (
            <div key={entry.id} className="flex items-start gap-3">
              <span className="text-lg leading-none mt-0.5">{r?.emoji}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-white text-xs font-medium">{r?.label}</span>
                  <span className="text-gray-700 text-xs">·</span>
                  <span className="text-gray-500 text-xs">{entry.shift_type}</span>
                </div>
                {entry.note && (
                  <p className="text-gray-600 text-xs italic mt-0.5 truncate">"{entry.note}"</p>
                )}
              </div>
              <span className="text-gray-700 text-xs whitespace-nowrap flex-shrink-0">
                {formatEntryDate(entry.shift_date)}
              </span>
            </div>
          )
        })
      )}
    </div>
  )

  // ── Already logged today ──
  if (existingEntry) {
    const logged = RATINGS.find(r => r.value === existingEntry.rating)
    return (
      <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
        <div className="flex items-center justify-between mb-3">
          <p className="text-white font-semibold text-sm">📓 Shift journal</p>
          <button onClick={handleToggleHistory} className="text-teal-400 text-xs hover:text-teal-300 transition">
            {showHistory ? 'Hide history' : 'View history'}
          </button>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-2xl">{logged?.emoji}</span>
          <div className="flex-1">
            <p className="text-white text-sm font-medium">{logged?.label}</p>
            {existingEntry.note && (
              <p className="text-gray-400 text-xs mt-0.5 italic">"{existingEntry.note}"</p>
            )}
          </div>
          <span className="text-gray-600 text-xs">{existingEntry.shift_type}</span>
        </div>
        {showHistory && <HistoryList entries={history.filter(e => e.shift_date !== existingEntry.shift_date)} />}
      </div>
    )
  }

  // ── Not yet logged ──
  return (
    <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
      <div className="flex items-center justify-between mb-1">
        <p className="text-white font-semibold text-sm">📓 How was your shift?</p>
        <button onClick={handleToggleHistory} className="text-gray-600 text-xs hover:text-gray-400 transition">
          {showHistory ? 'Hide' : 'History'}
        </button>
      </div>
      <p className="text-gray-500 text-xs mb-4">
        {todayShift?.isOff ? 'Rest day' : `${todayShift?.label} shift`} · one tap, then you're done
      </p>

      {/* Rating row */}
      <div className="flex gap-2 mb-4">
        {RATINGS.map(r => (
          <button
            key={r.value}
            onClick={() => setRating(r.value)}
            className="flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl transition"
            style={{
              background: rating === r.value ? 'rgba(45,212,191,0.1)' : '#111827',
              border: rating === r.value ? '1px solid rgba(45,212,191,0.4)' : '1px solid #1f2937',
            }}
          >
            <span className="text-xl">{r.emoji}</span>
            <span style={{ fontSize: 9, color: rating === r.value ? '#2dd4bf' : '#4b5563', fontWeight: 600 }}>
              {r.label}
            </span>
          </button>
        ))}
      </div>

      {/* Note — only appears once rating is selected */}
      {rating !== null && (
        <div className="mb-4">
          <input
            type="text"
            value={note}
            onChange={e => setNote(e.target.value.slice(0, 280))}
            placeholder="What made it that way? (optional)"
            className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-teal-500 placeholder-gray-600"
          />
        </div>
      )}

      <button
        onClick={handleSave}
        disabled={!rating || saving}
        className="w-full bg-teal-500 hover:bg-teal-400 text-gray-950 font-semibold py-3 rounded-xl transition text-sm disabled:opacity-40"
      >
        {saving ? 'Saving...' : 'Log shift'}
      </button>

      {showHistory && <HistoryList entries={history} />}
    </div>
  )
}

// ── QUICK ROUTINES STRIP ──────────────────────────────────
function QuickRoutinesStrip({ profile }: { profile: any }) {
  const [activeRoutine, setActiveRoutine] = useState<any>(null)
  const [activeExerciseIndex, setActiveExerciseIndex] = useState(0)
  const [timeLeft, setTimeLeft] = useState(0)
  const [isResting, setIsResting] = useState(false)
  const [isRunning, setIsRunning] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const todayShift = profile?.pattern_data
    ? getTodayShift(profile.pattern_data as PatternData)
    : null

  const filteredRoutines = ROUTINES.slice(0, 6)

  useEffect(() => {
    if (!isRunning) return
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { handleTimerEnd(); return 0 }
        return prev - 1
      })
    }, 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [isRunning, activeExerciseIndex, isResting])

  const handleTimerEnd = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    setIsRunning(false)
    if (!activeRoutine) return
    const exercise = activeRoutine.exercises[activeExerciseIndex]
    if (!isResting && exercise.rest && exercise.rest > 0) {
      setIsResting(true)
      setTimeLeft(exercise.rest)
      setIsRunning(true)
      return
    }
    const nextIndex = activeExerciseIndex + 1
    if (nextIndex >= activeRoutine.exercises.length) {
      setIsComplete(true)
      logRoutine()
      return
    }
    setIsResting(false)
    setActiveExerciseIndex(nextIndex)
    setTimeLeft(activeRoutine.exercises[nextIndex].duration)
    setIsRunning(true)
  }

  const logRoutine = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !activeRoutine) return
    await supabase.from('shiftwell_routines_log').insert({
      user_id: user.id,
      routine_name: activeRoutine.name,
      category: activeRoutine.category,
      duration_minutes: activeRoutine.duration,
    })
  }

  const startRoutine = (routine: any) => {
    setActiveRoutine(routine)
    setActiveExerciseIndex(0)
    setTimeLeft(routine.exercises[0].duration)
    setIsResting(false)
    setIsRunning(false)
    setIsComplete(false)
  }

  const exitRoutine = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    setActiveRoutine(null)
    setIsRunning(false)
    setIsComplete(false)
  }

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
  const circumference = 2 * Math.PI * 45

  // ── Active routine overlay ──
  if (activeRoutine) {
    const exercise = activeRoutine.exercises[activeExerciseIndex]
    const totalDuration = isResting ? (exercise.rest || 0) : exercise.duration
    const progress = totalDuration > 0 ? (timeLeft / totalDuration) : 0

    if (isComplete) {
      return (
        <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800 text-center space-y-4">
          <div className="text-5xl">🎉</div>
          <p className="text-white font-bold text-lg">Routine complete!</p>
          <p className="text-gray-400 text-sm">{activeRoutine.name} — {activeRoutine.duration} mins done.</p>
          <button onClick={exitRoutine} className="w-full bg-teal-500 text-gray-950 font-semibold py-3 rounded-xl text-sm">
            Back to Today
          </button>
        </div>
      )
    }

    return (
      <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white font-bold text-sm">{activeRoutine.name}</p>
            <p className="text-gray-500 text-xs">Exercise {activeExerciseIndex + 1} of {activeRoutine.exercises.length}</p>
          </div>
          <button onClick={exitRoutine} className="text-gray-600 text-sm">Exit</button>
        </div>

        <div className="flex gap-1">
          {activeRoutine.exercises.map((_: any, i: number) => (
            <div key={i} className={`h-1 flex-1 rounded-full ${i < activeExerciseIndex ? 'bg-teal-500' : i === activeExerciseIndex ? 'bg-teal-400' : 'bg-gray-800'}`} />
          ))}
        </div>

        <div className="flex justify-center py-4">
          <div className="relative w-28 h-28">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="45" fill="none" stroke="#1f2937" strokeWidth="8" />
              <circle cx="50" cy="50" r="45" fill="none" stroke={isResting ? '#6366f1' : '#2dd4bf'} strokeWidth="8" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={circumference * (1 - progress)} className="transition-all duration-1000" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-white text-2xl font-bold">{formatTime(timeLeft)}</span>
              <span className="text-gray-500 text-xs">{isResting ? 'Rest' : 'Go'}</span>
            </div>
          </div>
        </div>

        <div className={`rounded-xl p-4 ${isResting ? 'bg-indigo-950/40 border border-indigo-700/30' : 'bg-gray-800'}`}>
          <p className={`font-semibold text-sm mb-1 ${isResting ? 'text-indigo-300' : 'text-white'}`}>
            {isResting ? '💤 Rest' : exercise.name}
          </p>
          <p className="text-gray-400 text-xs leading-relaxed">
            {isResting ? 'Breathe. Next up soon.' : exercise.instruction}
          </p>
        </div>

        <div className="flex gap-3">
          <button onClick={() => setIsRunning(p => !p)} className="flex-1 bg-teal-500 text-gray-950 font-bold py-3 rounded-xl text-lg">
            {isRunning ? '⏸' : '▶'}
          </button>
        </div>
      </div>
    )
  }

  // ── Strip browser ──
  return (
    <div className="bg-gray-900 rounded-2xl p-4 border border-gray-800">
      <div className="flex items-center justify-between mb-3">
        <p className="text-white font-semibold text-sm">⚡ Quick routines</p>
        <span className="text-gray-600 text-xs">Tap to start</span>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {filteredRoutines.map((routine, i) => (
          <button
            key={routine.id}
            onClick={() => startRoutine(routine)}
            className="flex-shrink-0 bg-gray-800 border border-gray-700 rounded-xl p-3 text-left transition hover:border-teal-700/40"
            style={{ minWidth: 120 }}
          >
            <div className="text-xl mb-2">{CATEGORY_META[routine.category].icon}</div>
            <p className="text-white text-xs font-semibold leading-tight mb-1">{routine.name}</p>
            <p className="text-gray-600 text-xs">{routine.duration} mins</p>
          </button>
        ))}
      </div>
    </div>
  )
}

// ── COMMUNITY ─────────────────────────────────────────────
function CommunityView({ user, profile }: { user: User, profile: any }) {
  const [posts, setPosts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [composing, setComposing] = useState(false)
  const [draft, setDraft] = useState('')
  const [role, setRole] = useState('')
  const [saving, setSaving] = useState(false)
  const [filter, setFilter] = useState<string | null>(null)
  const [hearts, setHearts] = useState<Set<string>>(new Set())
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [editingPost, setEditingPost] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState('')

  const todayShift = profile?.pattern_data
    ? getTodayShift(profile.pattern_data as PatternData)
    : null

  const shiftTag = todayShift?.isOff ? 'Rest day' : (todayShift?.label ? `${todayShift.label} shift` : 'Shift worker')
  const firstName = user?.user_metadata?.full_name?.split(' ')[0] || 'Anonymous'

  const fetchPosts = async () => {
    let query = supabase
      .from('shiftwell_community_posts')
      .select('*')
      .eq('hidden', false)
      .order('created_at', { ascending: false })
      .limit(30)

    if (filter) query = query.eq('shift_type', filter)

    const { data: postsData } = await query

    // Fetch heart counts separately
    const { data: heartCounts } = await supabase
      .from('shiftwell_community_hearts')
      .select('post_id')

    // Fetch user's own hearts
    const { data: myHearts } = await supabase
      .from('shiftwell_community_hearts')
      .select('post_id')
      .eq('user_id', user.id)

    // Count hearts per post
    const countMap: Record<string, number> = {}
    heartCounts?.forEach(h => {
      countMap[h.post_id] = (countMap[h.post_id] || 0) + 1
    })

    // Attach counts to posts
    const postsWithCounts = (postsData || []).map(p => ({
      ...p,
      heartCount: countMap[p.id] || 0
    }))

    setPosts(postsWithCounts)
    setHearts(new Set(myHearts?.map(h => h.post_id) || []))
    setLoading(false)
  }

  useEffect(() => { fetchPosts() }, [filter])

  const handlePost = async () => {
    if (!draft.trim()) return
    setSaving(true)
    const { error } = await supabase
      .from('shiftwell_community_posts')
      .insert({
        user_id: user.id,
        content: draft.trim(),
        shift_type: shiftTag,
        first_name: firstName,
        role: role.trim() || null,
      })
    if (!error) {
      setDraft('')
      setComposing(false)
      fetchPosts()
    }
    setSaving(false)
  }

  const toggleHeart = async (postId: string) => {
    const isHearted = hearts.has(postId)
    if (isHearted) {
      await supabase.from('shiftwell_community_hearts').delete()
        .eq('post_id', postId).eq('user_id', user.id)
      setHearts(prev => { const n = new Set(prev); n.delete(postId); return n })
    } else {
      await supabase.from('shiftwell_community_hearts').insert({ post_id: postId, user_id: user.id })
      setHearts(prev => new Set([...prev, postId]))
    }
    fetchPosts()
  }

  const handleFlag = async (postId: string) => {
    await supabase.from('shiftwell_community_reports').upsert(
      { post_id: postId, user_id: user.id },
      { onConflict: 'post_id,user_id' }
    )
    // Auto-hide if 3+ reports
    await supabase.rpc('increment_flag_count', { post_id: postId })
  }

  const formatTime = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    return `${Math.floor(hrs / 24)}d ago`
  }

  const SHIFT_FILTERS = ['Early shift', 'Late shift', 'Night shift', 'Rest day']

  return (
    <div className="space-y-4 max-w-lg mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Community</h2>
          <p className="text-gray-500 text-xs mt-0.5">Shift workers only 🌙</p>
        </div>
        <button
          onClick={() => setComposing(!composing)}
          className="bg-teal-500 hover:bg-teal-400 text-gray-950 font-semibold px-4 py-2 rounded-lg text-sm transition"
        >
          + Post
        </button>
      </div>

      {/* Filter pills */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setFilter(null)}
          className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition border ${
            !filter ? 'bg-teal-900/60 text-teal-400 border-teal-700/40' : 'bg-gray-800 text-gray-500 border-gray-700'
          }`}
        >All shifts</button>
        {SHIFT_FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setFilter(filter === f ? null : f)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition border ${
              filter === f ? 'bg-teal-900/60 text-teal-400 border-teal-700/40' : 'bg-gray-800 text-gray-500 border-gray-700'
            }`}
          >{f}</button>
        ))}
      </div>

      {/* Compose box */}
      {composing && (
        <div className="bg-gray-900 border border-teal-700/30 rounded-2xl p-4 space-y-3">
          <input
            type="text"
            value={role}
            onChange={e => setRole(e.target.value)}
            placeholder="Your role (e.g. ICU Nurse, Paramedic) — optional"
            className="w-full bg-gray-800 text-white rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500 placeholder-gray-600"
          />
          <textarea
            value={draft}
            onChange={e => setDraft(e.target.value.slice(0, 500))}
            placeholder="What's on your mind? Night 3 rough? Rest day win? Share it."
            rows={3}
            className="w-full bg-gray-800 text-white rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500 placeholder-gray-600 resize-none"
          />
          <div className="flex items-center justify-between">
            <div style={{
              background: 'rgba(45,212,191,0.1)',
              border: '1px solid rgba(45,212,191,0.2)',
              borderRadius: 20, padding: '3px 10px',
              fontSize: 11, color: '#2dd4bf',
            }}>
              {shiftTag}
            </div>
            <div className="flex gap-2 items-center">
              <span className="text-gray-700 text-xs">{draft.length}/500</span>
              <button
                onClick={handlePost}
                disabled={!draft.trim() || saving}
                className="bg-teal-500 text-gray-950 font-semibold px-4 py-2 rounded-lg text-sm transition disabled:opacity-40"
              >
                {saving ? 'Posting...' : 'Post'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Posts */}
      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="bg-gray-900 rounded-2xl h-24 animate-pulse border border-gray-800" />)}
        </div>
      ) : posts.length === 0 ? (
        <div className="bg-gray-900 rounded-2xl p-8 text-center border border-gray-800">
          <div className="text-4xl mb-3">💬</div>
          <p className="text-white font-semibold text-sm mb-1">Be the first to post</p>
          <p className="text-gray-500 text-xs">Share how your shift is going. Someone out there is going through the same thing.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map(post => {
          const heartCount = post.heartCount || 0
            const isHearted = hearts.has(post.id)
            const isOwn = post.user_id === user.id
            return (
              <div key={post.id} className="bg-gray-900 rounded-2xl p-4 border border-gray-800">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-white text-sm font-semibold">{post.first_name}</span>
                    {post.role && <span className="text-gray-500 text-xs">· {post.role}</span>}
                    <span style={{
                      background: 'rgba(45,212,191,0.08)',
                      border: '1px solid rgba(45,212,191,0.2)',
                      borderRadius: 20, padding: '1px 8px',
                      fontSize: 10, color: '#2dd4bf', fontWeight: 600,
                    }}>{post.shift_type}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-gray-700 text-xs">{formatTime(post.created_at)}</span>
                    {isOwn && (
                      <div className="relative">
                        <button
                          onClick={() => setOpenMenu(openMenu === post.id ? null : post.id)}
                          className="text-gray-600 hover:text-gray-400 text-sm px-1"
                        >
                          ⋯
                        </button>
                        {openMenu === post.id && (
                          <div className="absolute right-0 top-6 bg-gray-800 border border-gray-700 rounded-xl shadow-xl z-10 overflow-hidden w-28">
                            <button
                              onClick={() => {
                                setEditingPost(post.id)
                                setEditDraft(post.content)
                                setOpenMenu(null)
                              }}
                              className="w-full px-4 py-2.5 text-left text-sm text-white hover:bg-gray-700 transition"
                            >
                              ✏️ Edit
                            </button>
                            <button
                              onClick={async () => {
                                await supabase.from('shiftwell_community_posts').delete().eq('id', post.id)
                                setOpenMenu(null)
                                fetchPosts()
                              }}
                              className="w-full px-4 py-2.5 text-left text-sm text-red-400 hover:bg-gray-700 transition border-t border-gray-700"
                            >
                              🗑️ Delete
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {editingPost === post.id ? (
                  <div className="mb-3 space-y-2">
                    <textarea
                      value={editDraft}
                      onChange={e => setEditDraft(e.target.value.slice(0, 500))}
                      rows={3}
                      className="w-full bg-gray-800 text-white rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500 resize-none"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={async () => {
                          if (!editDraft.trim()) return
                          await supabase.from('shiftwell_community_posts')
                            .update({ content: editDraft.trim() })
                            .eq('id', post.id)
                          setEditingPost(null)
                          setEditDraft('')
                          fetchPosts()
                        }}
                        className="bg-teal-500 text-gray-950 font-semibold px-4 py-1.5 rounded-lg text-sm"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => { setEditingPost(null); setEditDraft('') }}
                        className="text-gray-500 text-sm px-2"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-300 text-sm leading-relaxed mb-3 font-light">{post.content}</p>
                )}

                <div className="flex items-center gap-4">
                  <button
                    onClick={() => toggleHeart(post.id)}
                    className="flex items-center gap-1.5 transition"
                  >
                    <span className="text-base">{isHearted ? '❤️' : '🤍'}</span>
                    <span className={`text-xs font-semibold ${isHearted ? 'text-red-400' : 'text-gray-600'}`}>
                      {heartCount}
                    </span>
                  </button>
                  {!isOwn && (
                    <button onClick={() => handleFlag(post.id)} className="text-gray-800 hover:text-gray-600 text-xs transition ml-auto">
                      Report
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
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
            label: 'Shift & profile',
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
