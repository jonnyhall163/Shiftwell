import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useRouter } from 'next/router'
import type { ShiftDefinition, FixedPatternData, NightsPatternData } from '../lib/shiftEngine'

type Step = 'type' | 'configure' | 'rotation' | 'life' | 'done'

const DEFAULT_SHIFTS: ShiftDefinition[] = [
  { label: 'Early', startTime: '06:00', endTime: '14:00', isOff: false },
  { label: 'Late',  startTime: '14:00', endTime: '22:00', isOff: false },
  { label: 'Night', startTime: '22:00', endTime: '06:00', isOff: false },
  { label: 'Off',   startTime: '',      endTime: '',      isOff: true  },
]

export default function Onboarding() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('type')
  const [patternType, setPatternType] = useState<'fixed' | 'nights' | null>(null)
  const [saving, setSaving] = useState(false)

  // Fixed pattern state
  const [shifts, setShifts] = useState<ShiftDefinition[]>(DEFAULT_SHIFTS)
  const [cycleLength, setCycleLength] = useState(28)
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0])
  const [rotation, setRotation] = useState<number[]>([])

  // Nights state
  const [nightStart, setNightStart] = useState('22:00')
  const [nightEnd, setNightEnd] = useState('06:00')

  // Life context state
  const [hasKids, setHasKids] = useState(false)
  const [schoolRunTime, setSchoolRunTime] = useState('08:00')
  const [wakeConstraint, setWakeConstraint] = useState('')
  const [lifeNotes, setLifeNotes] = useState('')

  useEffect(() => {
    setRotation(Array(cycleLength).fill(0))
  }, [cycleLength])

  const updateShift = (index: number, field: keyof ShiftDefinition, value: string | boolean) => {
    const updated = [...shifts]
    updated[index] = { ...updated[index], [field]: value }
    setShifts(updated)
  }

  const addShift = () => {
    setShifts([...shifts, { label: 'New', startTime: '08:00', endTime: '16:00', isOff: false }])
  }

  const removeShift = (index: number) => {
    if (shifts.length <= 1) return
    const updated = shifts.filter((_, i) => i !== index)
    setShifts(updated)
    setRotation(rotation.map(r => r >= updated.length ? 0 : r))
  }

  const handleSave = async () => {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    let patternData: FixedPatternData | NightsPatternData

    if (patternType === 'fixed') {
      patternData = { type: 'fixed', cycleLength, shifts, rotation, startDate }
    } else {
      patternData = {
        type: 'nights',
        shift: { label: 'Night', startTime: nightStart, endTime: nightEnd, isOff: false },
        startTime: nightStart,
      }
    }

    const { error } = await supabase
      .from('shiftwell_profiles')
      .update({
        pattern_type: patternType,
        pattern_data: patternData,
        onboarding_complete: true,
        has_kids: hasKids,
        school_run_time: hasKids ? schoolRunTime : null,
        wake_constraint: wakeConstraint || null,
        life_notes: lifeNotes || null,
        briefing_cache: null,
        briefing_date: null,
      })
      .eq('id', user.id)

    if (!error) {
      const { data: updatedProfile } = await supabase
        .from('shiftwell_profiles')
        .select('stripe_customer_id')
        .eq('id', user.id)
        .single()

      if (updatedProfile?.stripe_customer_id) {
        router.push('/dashboard')
      } else {
        router.push('/subscribe')
      }
    } else {
      alert('Something went wrong. Please try again.')
      setSaving(false)
    }
  }

  const progressSteps: Step[] = ['type', 'configure', 'rotation', 'life']

  return (
    <div className="min-h-screen bg-gray-950 px-4 py-10">
      <div className="max-w-lg mx-auto">

        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-2xl font-bold text-white">Set up ShiftWell</h1>
          <p className="text-gray-400 text-sm mt-2">Takes about 2 minutes</p>
        </div>

        {/* Progress */}
        <div className="flex gap-2 mb-10">
          {progressSteps.map((s, i) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full transition-colors ${
                step === s ? 'bg-teal-500' :
                progressSteps.indexOf(step) > i ? 'bg-teal-800' : 'bg-gray-800'
              }`}
            />
          ))}
        </div>

        {/* ── STEP 1: Type ── */}
        {step === 'type' && (
          <div className="space-y-4">
            <h2 className="text-white font-semibold text-lg mb-6">What best describes your shift pattern?</h2>
            {[
              { type: 'fixed' as const, title: 'Fixed rotation', desc: 'A repeating cycle — e.g. 4 weeks of Early / Late / Night / Off', icon: '🔄' },
              { type: 'nights' as const, title: 'Nights only', desc: 'You work permanent night shifts', icon: '🌙' },
            ].map(option => (
              <button
                key={option.type}
                onClick={() => { setPatternType(option.type); setStep('configure') }}
                className="w-full bg-gray-900 border border-gray-800 hover:border-teal-500 rounded-2xl p-5 text-left transition-colors"
              >
                <div className="flex items-center gap-4">
                  <span className="text-3xl">{option.icon}</span>
                  <div>
                    <p className="text-white font-semibold">{option.title}</p>
                    <p className="text-gray-400 text-sm mt-1">{option.desc}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* ── STEP 2: Configure Fixed ── */}
        {step === 'configure' && patternType === 'fixed' && (
          <div className="space-y-6">
            <h2 className="text-white font-semibold text-lg">Define your shift types</h2>

            <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
              <label className="block text-sm text-gray-400 mb-3">Cycle length (days)</label>
              <div className="flex gap-3 flex-wrap">
                {[7, 14, 21, 28, 35, 42].map(len => (
                  <button
                    key={len}
                    onClick={() => setCycleLength(len)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      cycleLength === len ? 'bg-teal-500 text-gray-950' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    {len}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-sm text-gray-400">Your shift types</p>
              {shifts.map((shift, i) => (
                <div key={i} className="bg-gray-900 border border-gray-800 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <input
                      type="text"
                      value={shift.label}
                      onChange={e => updateShift(i, 'label', e.target.value)}
                      className="bg-gray-800 text-white rounded-lg px-3 py-2 text-sm w-32 outline-none focus:ring-2 focus:ring-teal-500"
                      placeholder="Label"
                    />
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-2 text-sm text-gray-400">
                        <input
                          type="checkbox"
                          checked={shift.isOff}
                          onChange={e => updateShift(i, 'isOff', e.target.checked)}
                          className="accent-teal-500"
                        />
                        Day off
                      </label>
                      {shifts.length > 1 && (
                        <button onClick={() => removeShift(i)} className="text-red-400 text-sm hover:text-red-300">
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                  {!shift.isOff && (
                    <div className="flex gap-3 items-center">
                      <div className="flex-1">
                        <label className="block text-xs text-gray-500 mb-1">Start</label>
                        <input
                          type="time"
                          value={shift.startTime}
                          onChange={e => updateShift(i, 'startTime', e.target.value)}
                          className="bg-gray-800 text-white rounded-lg px-3 py-2 text-sm w-full outline-none focus:ring-2 focus:ring-teal-500"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block text-xs text-gray-500 mb-1">End</label>
                        <input
                          type="time"
                          value={shift.endTime}
                          onChange={e => updateShift(i, 'endTime', e.target.value)}
                          className="bg-gray-800 text-white rounded-lg px-3 py-2 text-sm w-full outline-none focus:ring-2 focus:ring-teal-500"
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
              <button
                onClick={addShift}
                className="w-full border border-dashed border-gray-700 text-gray-400 hover:text-teal-400 hover:border-teal-700 rounded-2xl py-3 text-sm transition-colors"
              >
                + Add shift type
              </button>
            </div>

            <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
              <label className="block text-sm text-gray-400 mb-3">When did your current cycle start?</label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="bg-gray-800 text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500"
              />
              <p className="text-xs text-gray-600 mt-2">
                This is day 1 of your rotation. If unsure, pick the Monday your current cycle started.
              </p>
            </div>

            <button
              onClick={() => setStep('rotation')}
              className="w-full bg-teal-500 hover:bg-teal-400 text-gray-950 font-semibold py-3 rounded-lg transition"
            >
              Next — Map your rotation →
            </button>
          </div>
        )}

        {/* ── STEP 2: Configure Nights ── */}
        {step === 'configure' && patternType === 'nights' && (
          <div className="space-y-6">
            <h2 className="text-white font-semibold text-lg">Your night shift times</h2>
            <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800 space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Shift starts</label>
                <input
                  type="time"
                  value={nightStart}
                  onChange={e => setNightStart(e.target.value)}
                  className="bg-gray-800 text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Shift ends</label>
                <input
                  type="time"
                  value={nightEnd}
                  onChange={e => setNightEnd(e.target.value)}
                  className="bg-gray-800 text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>
            <button
              onClick={() => setStep('life')}
              className="w-full bg-teal-500 hover:bg-teal-400 text-gray-950 font-semibold py-3 rounded-lg transition"
            >
              Next →
            </button>
          </div>
        )}

        {/* ── STEP 3: Rotation mapper ── */}
        {step === 'rotation' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-white font-semibold text-lg">Map your {cycleLength}-day rotation</h2>
              <p className="text-gray-400 text-sm mt-1">Tap each day to set what shift you work</p>
            </div>

            <div className="flex flex-wrap gap-2">
              {shifts.map((shift, i) => (
                <div key={i} className="flex items-center gap-1.5 bg-gray-900 rounded-full px-3 py-1 border border-gray-800">
                  <div className={`w-2 h-2 rounded-full ${SHIFT_COLOURS[i % SHIFT_COLOURS.length]}`} />
                  <span className="text-xs text-gray-300">{shift.label}</span>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1.5">
              {Array.from({ length: cycleLength }).map((_, day) => {
                const shiftIndex = rotation[day] ?? 0
                const shift = shifts[shiftIndex]
                return (
                  <button
                    key={day}
                    onClick={() => {
                      const next = (shiftIndex + 1) % shifts.length
                      const updated = [...rotation]
                      updated[day] = next
                      setRotation(updated)
                    }}
                    className={`aspect-square rounded-lg flex flex-col items-center justify-center text-xs font-medium transition-colors border ${SHIFT_BG_COLOURS[shiftIndex % SHIFT_BG_COLOURS.length]}`}
                  >
                    <span className="text-gray-500 text-[9px]">{day + 1}</span>
                    <span className="text-white text-[10px] leading-tight">{shift?.label?.slice(0, 3)}</span>
                  </button>
                )
              })}
            </div>

            <p className="text-xs text-gray-600 text-center">Tap a day to cycle through your shift types</p>

            <button
              onClick={() => setStep('life')}
              className="w-full bg-teal-500 hover:bg-teal-400 text-gray-950 font-semibold py-3 rounded-lg transition"
            >
              Next — A bit about your life →
            </button>
          </div>
        )}

        {/* ── STEP 4: Life context ── */}
        {step === 'life' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-white font-semibold text-lg">A bit about your life</h2>
              <p className="text-gray-400 text-sm mt-1">
                This helps ShiftWell give you advice that actually fits your life — not just your shifts.
              </p>
            </div>

            {/* Kids */}
            <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium text-sm">Do you have children?</p>
                  <p className="text-gray-500 text-xs mt-0.5">Affects sleep and routine suggestions</p>
                </div>
                <button
                  onClick={() => setHasKids(!hasKids)}
                  className={`w-12 h-6 rounded-full transition-colors relative ${hasKids ? 'bg-teal-500' : 'bg-gray-700'}`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all ${hasKids ? 'left-6' : 'left-0.5'}`} />
                </button>
              </div>

              {hasKids && (
                <div>
                  <label className="block text-sm text-gray-400 mb-2">School run / earliest you need to be up</label>
                  <input
                    type="time"
                    value={schoolRunTime}
                    onChange={e => setSchoolRunTime(e.target.value)}
                    className="bg-gray-800 text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              )}
            </div>

            {/* Wake constraint */}
            <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
              <label className="block text-sm text-gray-400 mb-1">
                Earliest you can sleep in until (on days off)
              </label>
              <p className="text-gray-600 text-xs mb-3">Leave blank if no constraint</p>
              <input
                type="time"
                value={wakeConstraint}
                onChange={e => setWakeConstraint(e.target.value)}
                className="bg-gray-800 text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            {/* Life notes */}
            <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
              <label className="block text-sm text-gray-400 mb-1">Anything else we should know?</label>
              <p className="text-gray-600 text-xs mb-3">e.g. "I care for an elderly parent", "I train for marathons"</p>
              <textarea
                value={lifeNotes}
                onChange={e => setLifeNotes(e.target.value)}
                rows={3}
                className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500 resize-none"
                placeholder="Optional..."
              />
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full bg-teal-500 hover:bg-teal-400 text-gray-950 font-semibold py-3 rounded-lg transition disabled:opacity-50"
            >
              {saving ? 'Saving...' : "Let's go →"}
            </button>
          </div>
        )}

        {/* Back button */}
        {step !== 'type' && (
          <button
            onClick={() => {
              if (step === 'configure') setStep('type')
              if (step === 'rotation') setStep('configure')
              if (step === 'life') setStep(patternType === 'fixed' ? 'rotation' : 'configure')
            }}
            className="w-full mt-4 text-gray-500 hover:text-gray-300 text-sm py-2 transition-colors"
          >
            ← Back
          </button>
        )}

      </div>
    </div>
  )
}

const SHIFT_COLOURS = ['bg-teal-400', 'bg-amber-400', 'bg-indigo-400', 'bg-gray-400', 'bg-pink-400', 'bg-green-400']
const SHIFT_BG_COLOURS = [
  'bg-teal-900/60 border-teal-700/30',
  'bg-amber-900/60 border-amber-700/30',
  'bg-indigo-900/60 border-indigo-700/30',
  'bg-gray-800/60 border-gray-700/30',
  'bg-pink-900/60 border-pink-700/30',
  'bg-green-900/60 border-green-700/30',
]
}
