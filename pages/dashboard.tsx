import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useRouter } from 'next/router'
import { getTodayShift, formatShiftTime } from '../lib/shiftEngine'
import type { User } from '@supabase/supabase-js'
import type { PatternData, TodayShift } from '../lib/shiftEngine'

const tabs = [
  { id: 'today',    label: 'Today',    icon: '☀️' },
  { id: 'sleep',    label: 'Sleep',    icon: '🌙' },
  { id: 'food',     label: 'Food',     icon: '🍽️' },
  { id: 'routines', label: 'Routines', icon: '⚡' },
  { id: 'settings', label: 'Settings', icon: '⚙️' },
]

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('today')
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<any>(null)
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
        <div className="w-8 h-8 rounded-full bg-teal-600 flex items-center justify-center text-white text-sm font-bold">
          {user?.user_metadata?.full_name?.[0] || user.email?.[0].toUpperCase()}
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto pb-24 px-4 pt-6">
        {activeTab === 'today'    && <TodayView user={user} profile={profile} />}
        {activeTab === 'sleep'    && <SleepView />}
        {activeTab === 'food'     && <FoodView />}
        {activeTab === 'routines' && <RoutinesView />}
        {activeTab === 'settings' && <SettingsView user={user} profile={profile} onSignOut={handleSignOut} />}
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
          { label: 'Sleep logged',  value: '—',       icon: '🌙' },
          { label: 'Hydration',     value: '0 / 8',   icon: '💧' },
          { label: 'Next meal',     value: 'Not set', icon: '🍽️' },
          {
            label: 'Today',
            value: todayShift?.label || 'Not set',
            icon: '🔄'
          },
        ].map(card => (
          <div key={card.label} className="bg-gray-900 rounded-xl p-4">
            <div className="text-2xl mb-2">{card.icon}</div>
            <div className="text-white font-semibold">{card.value}</div>
            <div className="text-gray-500 text-xs mt-1">{card.label}</div>
          </div>
        ))}
      </div>

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
function SleepView() {
  return (
    <div className="space-y-4 max-w-lg mx-auto">
      <h2 className="text-2xl font-bold text-white">Sleep</h2>
      <div className="bg-gray-900 rounded-2xl p-8 text-center border border-gray-800">
        <div className="text-5xl mb-4">🌙</div>
        <h3 className="text-white font-semibold mb-2">Sleep tracker</h3>
        <p className="text-gray-400 text-sm leading-relaxed">
          Built for fragmented and split sleep — not just 8-hour blocks.
          Log any sleep window, any time.
        </p>
        <div className="mt-4 inline-block bg-teal-900/40 text-teal-300 text-xs px-3 py-1 rounded-full">
          Coming in Sprint 3
        </div>
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
          Coming in Sprint 3
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
