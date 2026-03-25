import { useState, useRef, useEffect } from 'react'

const TABS = [
  { id: 'today', label: 'Today', icon: '☀️' },
  { id: 'sleep', label: 'Sleep', icon: '🌙' },
  { id: 'food', label: 'Food', icon: '⚡' },
  { id: 'companion', label: 'Companion', icon: '✦' },
]

const SHIFT_OPTIONS = [
  { id: 'night3', label: 'Night 3 of 4' },
  { id: 'early1', label: 'Early 1 of 5' },
  { id: 'dayoff', label: 'Day Off' },
]

const BRIEFINGS: Record<string, { icon: string; title: string; text: string }[]> = {
  night3: [
    { icon: '🌙', title: 'Sleep window', text: 'You finish at 07:00 — aim to be in bed by 08:30. Blackout blinds on, phone on silent. Transition to days in 48 hours — this window matters.' },
    { icon: '💧', title: 'Hydration', text: '6 hours into nights. Avoid caffeine for the next 3 hours. Drink 500ml of water before you leave the building.' },
    { icon: '⚡', title: 'Focus', text: 'Night 3 is when fatigue peaks. One thing only — sleep well today. Everything else can wait.' },
    { icon: '🍽️', title: 'Meal timing', text: 'Meal 2 before your shift ends. Keep it light — eggs, oats, something easy to digest. Avoid heavy protein until you wake.' },
  ],
  early1: [
    { icon: '🌅', title: 'Sleep window', text: 'Early start tomorrow at 06:00. Wind down by 21:30 tonight. Your body needs at least 7 hours — protect this window.' },
    { icon: '💧', title: 'Hydration', text: 'First day of Earlies — start hydrating now. 2 litres before your shift ends.' },
    { icon: '⚡', title: 'Focus', text: 'Day 1 of Earlies is the adjustment day. Energy will dip around 14:00 — plan for it.' },
    { icon: '🍽️', title: 'Meal timing', text: 'Meal 1 before you leave. Something with slow-release carbs. Don\'t leave the house on empty.' },
  ],
  dayoff: [
    { icon: '🌙', title: 'Sleep', text: 'No alarm today. Let your body lead. If you\'ve come off nights, sleeping until midday is normal — not lazy.' },
    { icon: '💧', title: 'Hydration', text: 'Days off are for recovery. Ditch the caffeine today if you can. Water and real food.' },
    { icon: '⚡', title: 'Focus', text: 'One day off is not enough to fully recover from a night block. Be kind to yourself today.' },
    { icon: '🍽️', title: 'Meal timing', text: 'Eat when you\'re hungry today — no schedule. Your rhythm is resetting.' },
  ],
}

const SLEEP_LOGS = [
  { date: 'Mon', hours: 6.5, quality: 'good' },
  { date: 'Tue', hours: 4.0, quality: 'poor' },
  { date: 'Wed', hours: 7.5, quality: 'great' },
  { date: 'Thu', hours: 5.5, quality: 'ok' },
  { date: 'Fri', hours: 6.0, quality: 'good' },
]

const MEALS: Record<string, { label: string; time: string; suggestion: string; status: string }[]> = {
  night3: [
    { label: 'Meal 1', time: '21:30', suggestion: 'Light carbs before shift — oats, toast, banana', status: 'done' },
    { label: 'Meal 2', time: '02:00', suggestion: 'Mid-shift fuel — rice, chicken, easy to digest', status: 'upcoming' },
    { label: 'Meal 3', time: '06:30', suggestion: 'Post-shift recovery — eggs, avocado, protein shake', status: 'later' },
  ],
  early1: [
    { label: 'Meal 1', time: '05:30', suggestion: 'Pre-shift — porridge with banana, slow-release energy', status: 'done' },
    { label: 'Meal 2', time: '11:00', suggestion: 'Mid-shift — sandwich, fruit, low sugar', status: 'upcoming' },
    { label: 'Meal 3', time: '16:00', suggestion: 'Post-shift — full meal, good protein, veg', status: 'later' },
  ],
  dayoff: [
    { label: 'Meal 1', time: 'When hungry', suggestion: 'No rules today — eat when your body asks', status: 'upcoming' },
    { label: 'Meal 2', time: 'Afternoon', suggestion: 'Something nourishing — slow cooked, real food', status: 'later' },
    { label: 'Meal 3', time: 'Evening', suggestion: 'Light dinner if you\'re sleeping early tonight', status: 'later' },
  ],
}

const COMPANION_RESPONSES = [
  "That's completely normal on Night 3 — your cortisol is at its lowest right now. Your body isn't broken, it's just doing exactly what nights do to it. What's keeping you up?",
  "The 3am wall is real. Most shift workers hit it hard between 3 and 5am. Try getting up and moving for 5 minutes if you can — even just to the kitchen and back.",
  "You're not the only one awake right now. There are thousands of shift workers doing exactly what you're doing. The world just doesn't see it.",
  "If sleep isn't coming, stop fighting it. Get your phone off the bed, lie still, and just rest. Your body is recovering even if your brain doesn't feel like it.",
]

const qualityColor = (q: string) => ({
  great: '#2dd4bf',
  good: '#6ee7b7',
  ok: '#fbbf24',
  poor: '#f87171',
}[q] || '#6b7280')

export default function ShiftWellDemo() {
  const [activeTab, setActiveTab] = useState('today')
  const [selectedShift, setSelectedShift] = useState('night3')
  const [hydration, setHydration] = useState(3)
  const [chatInput, setChatInput] = useState('')
  const [messages, setMessages] = useState([
    { role: 'assistant', text: "Hey. It's quiet out there at this hour, isn't it. What's on your mind?" }
  ])
  const [typing, setTyping] = useState(false)
  const [loggedSleep, setLoggedSleep] = useState(false)
  const [sleepHours, setSleepHours] = useState(6)
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, typing])

  const sendMessage = () => {
    if (!chatInput.trim()) return
    const userMsg = chatInput
    setChatInput('')
    setMessages(prev => [...prev, { role: 'user', text: userMsg }])
    setTyping(true)
    setTimeout(() => {
      const response = COMPANION_RESPONSES[Math.floor(Math.random() * COMPANION_RESPONSES.length)]
      setMessages(prev => [...prev, { role: 'assistant', text: response }])
      setTyping(false)
    }, 1500)
  }

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @keyframes blink { 0%,100%{opacity:.3} 50%{opacity:1} }
        .sw-dot { animation: blink 1.2s ease-in-out infinite; }
        .sw-dot:nth-child(2) { animation-delay: 0.2s; }
        .sw-dot:nth-child(3) { animation-delay: 0.4s; }
        @keyframes swFadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        .sw-msg { animation: swFadeIn 0.3s ease both; }
        .sw-tab:hover { opacity: 0.85; }
        .sw-shift:hover { transform: translateY(-1px); }
      `}</style>

      {/* Shift selector */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, justifyContent: 'center', flexWrap: 'wrap' }}>
        {SHIFT_OPTIONS.map(s => (
          <button
            key={s.id}
            className="sw-shift"
            onClick={() => setSelectedShift(s.id)}
            style={{
              padding: '8px 16px', borderRadius: 30, fontSize: 12, fontWeight: 600,
              background: selectedShift === s.id ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.04)',
              border: selectedShift === s.id ? '1px solid rgba(245,158,11,0.4)' : '1px solid rgba(255,255,255,0.08)',
              color: selectedShift === s.id ? '#fbbf24' : '#9ca3af',
              cursor: 'pointer', transition: 'all 0.2s',
            }}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Phone shell */}
      <div style={{
        background: '#111827',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 28, overflow: 'hidden',
        boxShadow: '0 40px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(45,212,191,0.05)',
        maxWidth: 480, margin: '0 auto',
      }}>

        {/* Status bar */}
        <div style={{
          background: '#0d1117', padding: '12px 20px 8px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#2dd4bf', boxShadow: '0 0 6px #2dd4bf' }} />
            <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 13, color: '#fff' }}>ShiftWell</span>
          </div>
          <div style={{
            fontSize: 10, padding: '3px 10px', borderRadius: 20,
            background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.2)',
            color: '#fbbf24', fontWeight: 600,
          }}>
            {SHIFT_OPTIONS.find(s => s.id === selectedShift)?.label}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.06)', background: '#0d1117' }}>
          {TABS.map(tab => (
            <button
              key={tab.id}
              className="sw-tab"
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: 1, padding: '10px 4px', fontSize: 11, fontWeight: 600,
                color: activeTab === tab.id ? '#2dd4bf' : '#6b7280',
                borderTop: 'none', borderLeft: 'none', borderRight: 'none',
                borderBottom: activeTab === tab.id ? '2px solid #2dd4bf' : '2px solid transparent',
                cursor: 'pointer', background: 'none',
                transition: 'all 0.2s',
              }}
            >
              <div style={{ fontSize: 14, marginBottom: 2 }}>{tab.icon}</div>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ padding: 20, minHeight: 400, maxHeight: 520, overflowY: 'auto' }}>

          {/* TODAY */}
          {activeTab === 'today' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ fontSize: 11, color: '#6b7280', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>Today's briefing</div>
              {BRIEFINGS[selectedShift].map((item, i) => (
                <div key={i} style={{
                  background: '#1a2235', borderRadius: 14, padding: '14px 16px',
                  border: '1px solid rgba(255,255,255,0.06)',
                  display: 'flex', gap: 12,
                }}>
                  <span style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>{item.icon}</span>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#f3f4f6', marginBottom: 4 }}>{item.title}</div>
                    <div style={{ fontSize: 12, color: '#9ca3af', lineHeight: 1.6, fontWeight: 300 }}>{item.text}</div>
                  </div>
                </div>
              ))}
              {/* Hydration */}
              <div style={{ background: '#1a2235', borderRadius: 14, padding: '14px 16px', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#f3f4f6', marginBottom: 10 }}>
                  💧 Hydration — {hydration}/8 glasses
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {Array.from({ length: 8 }).map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setHydration(i < hydration ? i : i + 1)}
                      style={{
                        width: 30, height: 30, borderRadius: 8,
                        background: i < hydration ? 'rgba(45,212,191,0.2)' : 'rgba(255,255,255,0.05)',
                        border: i < hydration ? '1px solid rgba(45,212,191,0.4)' : '1px solid rgba(255,255,255,0.08)',
                        fontSize: 14, cursor: 'pointer', transition: 'all 0.15s',
                      }}
                    >
                      {i < hydration ? '💧' : '○'}
                    </button>
                  ))}
                </div>
                <div style={{ fontSize: 11, color: '#6b7280', marginTop: 8 }}>Tap to log a glass</div>
              </div>
            </div>
          )}

          {/* SLEEP */}
          {activeTab === 'sleep' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ fontSize: 11, color: '#6b7280', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>Sleep this week</div>
              <div style={{ background: '#1a2235', borderRadius: 14, padding: 16, border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 80, marginBottom: 8 }}>
                  {SLEEP_LOGS.map((log, i) => (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                      <div style={{ fontSize: 9, color: '#6b7280' }}>{log.hours}h</div>
                      <div style={{
                        width: '100%', borderRadius: '4px 4px 0 0',
                        height: `${(log.hours / 9) * 60}px`,
                        background: qualityColor(log.quality), opacity: 0.8,
                      }} />
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {SLEEP_LOGS.map((log, i) => (
                    <div key={i} style={{ flex: 1, textAlign: 'center', fontSize: 10, color: '#6b7280' }}>{log.date}</div>
                  ))}
                </div>
              </div>

              {!loggedSleep ? (
                <div style={{ background: '#1a2235', borderRadius: 14, padding: 16, border: '1px solid rgba(45,212,191,0.15)' }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#f3f4f6', marginBottom: 12 }}>Log today's sleep</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                    <button
                      onClick={() => setSleepHours(Math.max(1, sleepHours - 0.5))}
                      style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.08)', border: 'none', color: '#fff', fontSize: 18, cursor: 'pointer' }}
                    >−</button>
                    <div style={{ flex: 1, textAlign: 'center', fontSize: 28, fontFamily: "'Syne', sans-serif", fontWeight: 800, color: '#2dd4bf' }}>
                      {sleepHours}h
                    </div>
                    <button
                      onClick={() => setSleepHours(Math.min(12, sleepHours + 0.5))}
                      style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.08)', border: 'none', color: '#fff', fontSize: 18, cursor: 'pointer' }}
                    >+</button>
                  </div>
                  <div style={{ fontSize: 11, color: '#6b7280', textAlign: 'center', marginBottom: 12 }}>
                    Fragmented? That's fine — log your total
                  </div>
                  <button
                    onClick={() => setLoggedSleep(true)}
                    style={{
                      width: '100%', padding: 10, borderRadius: 10,
                      background: '#2dd4bf', color: '#090c14', border: 'none',
                      fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 13, cursor: 'pointer',
                    }}
                  >
                    Log sleep →
                  </button>
                </div>
              ) : (
                <div style={{
                  background: 'rgba(45,212,191,0.08)', borderRadius: 14, padding: 16,
                  border: '1px solid rgba(45,212,191,0.2)', textAlign: 'center',
                }}>
                  <div style={{ fontSize: 24, marginBottom: 6 }}>✓</div>
                  <div style={{ fontSize: 13, color: '#2dd4bf', fontWeight: 600 }}>Sleep logged — {sleepHours} hours</div>
                  <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>
                    {sleepHours < 5 ? 'Short session. Rest when you can today.' : sleepHours >= 7 ? 'Solid sleep. Well done.' : "Not bad. Your body's adapting."}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* FOOD */}
          {activeTab === 'food' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ fontSize: 11, color: '#6b7280', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>Meal timing today</div>
              <div style={{
                background: 'rgba(245,158,11,0.06)', borderRadius: 12, padding: '10px 14px',
                border: '1px solid rgba(245,158,11,0.15)', fontSize: 12, color: '#fbbf24',
              }}>
                ⚡ No breakfast / lunch / dinner labels here. Your body doesn't care what time it is.
              </div>
              {MEALS[selectedShift].map((meal, i) => (
                <div key={i} style={{
                  background: '#1a2235', borderRadius: 14, padding: '14px 16px',
                  border: meal.status === 'done'
                    ? '1px solid rgba(45,212,191,0.2)'
                    : meal.status === 'upcoming'
                    ? '1px solid rgba(245,158,11,0.2)'
                    : '1px solid rgba(255,255,255,0.06)',
                  opacity: meal.status === 'later' ? 0.6 : 1,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <div style={{
                      fontSize: 12, fontWeight: 700,
                      fontFamily: "'Syne', sans-serif",
                      color: meal.status === 'done' ? '#2dd4bf' : meal.status === 'upcoming' ? '#fbbf24' : '#9ca3af',
                    }}>{meal.label}</div>
                    <div style={{ fontSize: 11, color: '#6b7280' }}>{meal.time}</div>
                  </div>
                  <div style={{ fontSize: 12, color: '#d1d5db', lineHeight: 1.5, fontWeight: 300 }}>{meal.suggestion}</div>
                  {meal.status === 'done' && <div style={{ fontSize: 10, color: '#2dd4bf', marginTop: 6 }}>✓ Done</div>}
                  {meal.status === 'upcoming' && <div style={{ fontSize: 10, color: '#fbbf24', marginTop: 6 }}>↑ Up next</div>}
                </div>
              ))}
            </div>
          )}

          {/* COMPANION */}
          {activeTab === 'companion' && (
            <div style={{ display: 'flex', flexDirection: 'column', height: 460 }}>
              <div style={{ fontSize: 11, color: '#6b7280', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>Companion</div>
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, paddingBottom: 8 }}>
                {messages.map((msg, i) => (
                  <div key={i} className="sw-msg" style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                    <div style={{
                      maxWidth: '80%', padding: '10px 14px',
                      borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                      background: msg.role === 'user' ? '#2dd4bf' : '#1a2235',
                      color: msg.role === 'user' ? '#090c14' : '#d1d5db',
                      fontSize: 13, lineHeight: 1.6,
                      fontWeight: msg.role === 'user' ? 500 : 300,
                      border: msg.role === 'assistant' ? '1px solid rgba(255,255,255,0.06)' : 'none',
                    }}>
                      {msg.text}
                    </div>
                  </div>
                ))}
                {typing && (
                  <div style={{ display: 'flex', gap: 4, padding: '10px 14px', background: '#1a2235', borderRadius: '16px 16px 16px 4px', width: 60, border: '1px solid rgba(255,255,255,0.06)' }}>
                    {[0,1,2].map(i => (
                      <div key={i} className="sw-dot" style={{ width: 6, height: 6, borderRadius: '50%', background: '#6b7280' }} />
                    ))}
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <input
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && sendMessage()}
                  placeholder="Type something..."
                  style={{
                    flex: 1, background: '#1a2235', border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 12, padding: '10px 14px', color: '#fff', fontSize: 13, outline: 'none',
                  }}
                />
                <button
                  onClick={sendMessage}
                  style={{
                    width: 40, height: 40, borderRadius: 12,
                    background: '#2dd4bf', border: 'none', color: '#090c14',
                    fontSize: 16, cursor: 'pointer', flexShrink: 0,
                  }}
                >→</button>
              </div>
              <div style={{ fontSize: 11, color: '#4b5563', textAlign: 'center', marginTop: 8, lineHeight: 1.6 }}>
                Demo uses pre-written responses · The real companion knows your shift pattern, your rotation, and your life context — every response is personal to you
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
