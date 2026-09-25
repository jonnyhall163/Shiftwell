import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useRouter } from 'next/router'
import type { ShiftDefinition, FixedPatternData, NightsPatternData, VariablePatternData } from '../lib/shiftEngine'
import { getTodayShift, toLocalDateStr } from '../lib/shiftEngine'
import { trackOnboardingStepCompleted, trackOnboardingCompleted, trackRotaPresetChosen } from '../lib/analytics'
import { ROTA_PRESETS, rotationBlocks, startDateForToday, type RotaPresetId } from '../lib/rotaPresets'
import { markWelcomePending } from '../lib/welcome'

// preset -> position -> review -> life is the quick path. "Mine's
// different" leads to 'type' and the original hand-built editors.
type Step = 'preset' | 'position' | 'review' | 'type' | 'configure' | 'rotation' | 'variable' | 'life'

const PRESET_CARDS: { id: RotaPresetId | 'four_on_four_off'; icon: string; title: string; desc: string }[] = [
  { id: 'early_late_night', icon: '🔄', title: 'Early / Late / Night rotation', desc: '5 earlies, 2 off, 5 lates, 2 off, 5 nights, 9 off' },
  { id: 'four_on_four_off', icon: '4️⃣', title: '4 on, 4 off', desc: '12-hour shifts, days or nights' },
  { id: 'nights_only', icon: '🌙', title: 'Nights only', desc: 'Permanent nights, 22:00–06:00' },
  { id: 'days_only', icon: '☀️', title: 'Days only', desc: '5 days 08:00–16:00, then 2 off' },
]

const PRESET_SHIFTS: ShiftDefinition[] = [
  { label: 'Early', startTime: '06:00', endTime: '14:00', isOff: false },
  { label: 'Late',  startTime: '14:00', endTime: '22:00', isOff: false },
  { label: 'Night', startTime: '22:00', endTime: '06:00', isOff: false },
  { label: 'Off',   startTime: '',      endTime: '',      isOff: true  },
]

const SHIFT_COLOURS = ['bg-teal-400','bg-amber-400','bg-indigo-400','bg-gray-400','bg-pink-400','bg-green-400']
const SHIFT_BG_COLOURS = [
  'bg-teal-900/60 border-teal-700/30',
  'bg-amber-900/60 border-amber-700/30',
  'bg-indigo-900/60 border-indigo-700/30',
  'bg-gray-800/60 border-gray-700/30',
  'bg-pink-900/60 border-pink-700/30',
  'bg-green-900/60 border-green-700/30',
]

const VARIABLE_SHIFT_OPTIONS = [
  { label: 'Early',  startTime: '06:00', endTime: '14:00', isOff: false, color: 'text-amber-400',  bg: 'bg-amber-900/40',  border: 'border-amber-700/40' },
  { label: 'Late',   startTime: '14:00', endTime: '22:00', isOff: false, color: 'text-blue-400',   bg: 'bg-blue-900/40',   border: 'border-blue-700/40' },
  { label: 'Night',  startTime: '22:00', endTime: '06:00', isOff: false, color: 'text-indigo-400', bg: 'bg-indigo-900/40', border: 'border-indigo-700/40' },
  { label: 'Off',    startTime: '',      endTime: '',      isOff: true,  color: 'text-gray-400',   bg: 'bg-gray-800/40',   border: 'border-gray-700/40' },
]

type VariableDay = {
  date: string
  label: string
  startTime: string
  endTime: string
  isOff: boolean
}

function generateDates(startDate: string, weeks: number): string[] {
  const dates: string[] = []
  const start = new Date(startDate + 'T12:00:00')
  for (let i = 0; i < weeks * 7; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    dates.push(d.toISOString().split('T')[0])
  }
  return dates
}

function formatDisplayDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}

function getWeekLabel(dates: string[], weekIndex: number): string {
  const start = dates[weekIndex * 7]
  const end = dates[weekIndex * 7 + 6]
  const s = new Date(start + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  const e = new Date(end + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  return `${s} – ${e}`
}

export default function Onboarding() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('preset')
  const [patternType, setPatternType] = useState<'fixed' | 'nights' | 'variable' | null>(null)
  const [saving, setSaving] = useState(false)

  // Fixed pattern state
  const [shifts, setShifts] = useState<ShiftDefinition[]>(PRESET_SHIFTS)
  const [cycleLength, setCycleLength] = useState(28)
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0])
  const [rotation, setRotation] = useState<number[]>(Array(28).fill(0))

  // Preset path
  const [preset, setPreset] = useState<RotaPresetId | 'custom' | null>(null)
  const [showFourOnOptions, setShowFourOnOptions] = useState(false)
  const [positionBlock, setPositionBlock] = useState(0)
  const [positionDay, setPositionDay] = useState(0)
  const [showShiftEditor, setShowShiftEditor] = useState(false)

  // Nights state
  const [nightStart, setNightStart] = useState('22:00')
  const [nightEnd, setNightEnd] = useState('06:00')

  // Variable schedule state
  const [variableWeeks, setVariableWeeks] = useState(2)
  const [variableStartDate, setVariableStartDate] = useState(() => new Date().toISOString().split('T')[0])
  const [variableSchedule, setVariableSchedule] = useState<Record<string, VariableDay>>({})
  const [activeWeek, setActiveWeek] = useState(0)
  const [editingDate, setEditingDate] = useState<string | null>(null)

  // Life context
  const [hasKids, setHasKids] = useState(false)
  const [schoolRunTime, setSchoolRunTime] = useState('08:00')
  const [wakeConstraint, setWakeConstraint] = useState('')
  const [lifeNotes, setLifeNotes] = useState('')
  const [dietaryRestrictions, setDietaryRestrictions] = useState<string[]>([])

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
    setRotation(rotation.map(r => (r >= updated.length ? 0 : r)))
  }

  const setVariableDay = (dateStr: string, option: typeof VARIABLE_SHIFT_OPTIONS[0]) => {
    setVariableSchedule(prev => ({
      ...prev,
      [dateStr]: {
        date: dateStr,
        label: option.label,
        startTime: option.startTime,
        endTime: option.endTime,
        isOff: option.isOff,
      }
    }))
    if (option.isOff) setEditingDate(null)
  }

  const updateVariableTimes = (dateStr: string, start: string, end: string) => {
    setVariableSchedule(prev => ({
      ...prev,
      [dateStr]: { ...prev[dateStr], startTime: start, endTime: end }
    }))
  }

  const variableDates = generateDates(variableStartDate, variableWeeks)
  const filledDays = variableDates.filter(d => variableSchedule[d]).length
  const totalDays = variableDates.length

  // Forward moves only — the Back button still calls setStep directly, so
  // going back and forth doesn't count as completing a step.
  const advanceTo = (next: Step) => {
    trackOnboardingStepCompleted(step)
    setStep(next)
  }

  const choosePreset = (id: RotaPresetId) => {
    trackRotaPresetChosen(id)
    setPreset(id)
    const p = ROTA_PRESETS[id]
    if (p.kind === 'nights') {
      // Nothing to place in a cycle: straight to the (pre-filled) times.
      setPatternType('nights')
      setNightStart(p.startTime)
      setNightEnd(p.endTime)
      advanceTo('configure')
      return
    }
    setPatternType('fixed')
    setShifts(p.shifts.map(s => ({ ...s })))
    setCycleLength(p.rotation.length)
    setRotation([...p.rotation])
    setPositionBlock(0)
    setPositionDay(0)
    setShowShiftEditor(false)
    advanceTo('position')
  }

  const chooseCustom = () => {
    trackRotaPresetChosen('custom')
    setPreset('custom')
    advanceTo('type')
  }

  const startAgain = () => {
    setPreset(null)
    setShowFourOnOptions(false)
    setShowShiftEditor(false)
    setStep('preset')
  }

  const positionBlocks = rotationBlocks(shifts, rotation)

  const confirmPosition = () => {
    const block = positionBlocks[positionBlock] || positionBlocks[0]
    const dayIndex = block ? block.start + Math.min(positionDay, block.length - 1) : 0
    setStartDate(startDateForToday(dayIndex))
    advanceTo('review')
  }

  // Day of the cycle that is today (0-based), for the "Today" marker.
  const todayIndex = (() => {
    if (patternType !== 'fixed' || !rotation.length) return -1
    const t = getTodayShift({ type: 'fixed', cycleLength, shifts, rotation, startDate }, toLocalDateStr(new Date()))
    return t.dayInCycle ? t.dayInCycle - 1 : -1
  })()

  const handleSave = async () => {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    let patternData: FixedPatternData | NightsPatternData | VariablePatternData

    if (patternType === 'fixed') {
      patternData = { type: 'fixed', cycleLength, shifts, rotation, startDate }
    } else if (patternType === 'nights') {
      patternData = {
        type: 'nights',
        shift: { label: 'Night', startTime: nightStart, endTime: nightEnd, isOff: false },
        startTime: nightStart,
      }
    } else {
      patternData = {
        type: 'variable',
        schedule: variableDates.map(d => variableSchedule[d] || {
          date: d, label: 'Off', startTime: '', endTime: '', isOff: true
        })
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
        dietary_restrictions: dietaryRestrictions,
        briefing_cache: null,
        briefing_date: null,
      })
      .eq('id', user.id)

    if (!error) {
      trackOnboardingStepCompleted('life')
      trackOnboardingCompleted(patternType)
      markWelcomePending(user.id)
      const { data: updatedProfile } = await supabase
        .from('shiftwell_profiles')
        .select('stripe_customer_id')
        .eq('id', user.id)
        .single()
      router.push(updatedProfile?.stripe_customer_id ? '/dashboard' : '/subscribe')
    } else {
      alert('Something went wrong. Please try again.')
      setSaving(false)
    }
  }

  // Shared by the hand-built editor and the preset review screen.
  const shiftTypesEditor = (
    <div>
      {shifts.map((shift, i) => (
        <div key={i} className="bg-gray-900 border border-gray-800 rounded-2xl p-4 mb-3">
          <div className="flex items-center justify-between mb-4">
            <input
              type="text"
              value={shift.label}
              onChange={e => updateShift(i, 'label', e.target.value)}
              className="bg-gray-800 text-white rounded-lg px-3 py-2 text-sm w-28 outline-none focus:ring-2 focus:ring-teal-500"
              placeholder="Label"
            />
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
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
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-800 rounded-xl p-3">
                <label className="block text-xs text-gray-500 mb-2">Start</label>
                <input
                  type="time"
                  value={shift.startTime}
                  onChange={e => updateShift(i, 'startTime', e.target.value)}
                  className="bg-transparent text-white text-sm w-full outline-none"
                />
              </div>
              <div className="bg-gray-800 rounded-xl p-3">
                <label className="block text-xs text-gray-500 mb-2">End</label>
                <input
                  type="time"
                  value={shift.endTime}
                  onChange={e => updateShift(i, 'endTime', e.target.value)}
                  className="bg-transparent text-white text-sm w-full outline-none"
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
  )

  const rotationGrid = (showToday: boolean) => (
    <>
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
              className={`aspect-square rounded-lg flex flex-col items-center justify-center transition-colors border ${SHIFT_BG_COLOURS[shiftIndex % SHIFT_BG_COLOURS.length]} ${showToday && day === todayIndex ? 'ring-2 ring-teal-400' : ''}`}
            >
              <span className={`text-[9px] ${showToday && day === todayIndex ? 'text-teal-300 font-semibold' : 'text-gray-500'}`}>{showToday && day === todayIndex ? 'Today' : day + 1}</span>
              <span className="text-white text-[10px] leading-tight font-medium">{shift?.label?.slice(0, 3)}</span>
            </button>
          )
        })}
      </div>
    </>
  )

  // Four segments whichever path is taken.
  const PROGRESS_INDEX: Record<Step, number> = {
    preset: 0, type: 0,
    position: 1, configure: 1, variable: 1,
    review: 2, rotation: 2,
    life: 3,
  }
  const progressSteps = [0, 1, 2, 3]
  const currentStepIndex = PROGRESS_INDEX[step]

  return (
    <div className="min-h-screen bg-gray-950 px-4 py-10">
      <div className="max-w-lg mx-auto">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-2 h-2 rounded-full bg-teal-400" style={{ boxShadow: '0 0 6px #2dd4bf' }} />
            <span className="text-white font-bold text-lg">ShiftWell</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Let's set you up</h1>
          <p className="text-gray-400 text-sm mt-1">Takes about 2 minutes</p>
        </div>

        {/* Progress */}
        <div className="flex gap-2 mb-10">
          {progressSteps.map((s, i) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                i < currentStepIndex ? 'bg-teal-600' :
                i === currentStepIndex ? 'bg-teal-400' : 'bg-gray-800'
              }`}
            />
          ))}
        </div>

        {/* ── STEP 1: Rota preset ── */}
        {step === 'preset' && (
          <div className="space-y-3">
            <h2 className="text-white font-semibold text-lg mb-1">What's your rota?</h2>
            <p className="text-gray-400 text-sm mb-5">Pick the closest one. You can change any day on the next screens.</p>
            {PRESET_CARDS.map(card => {
              const isFourOn = card.id === 'four_on_four_off'
              return (
                <div key={card.id}>
                  <button
                    onClick={() => {
                      if (isFourOn) setShowFourOnOptions(v => !v)
                      else choosePreset(card.id as RotaPresetId)
                    }}
                    className={`w-full bg-gray-900 border rounded-2xl p-4 text-left transition-all ${
                      isFourOn && showFourOnOptions ? 'border-teal-500' : 'border-gray-800 hover:border-teal-500'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-2xl">{card.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-semibold">{card.title}</p>
                        <p className="text-gray-400 text-sm mt-0.5">{card.desc}</p>
                      </div>
                      <span className="text-gray-600 text-lg">{isFourOn && showFourOnOptions ? '⌄' : '›'}</span>
                    </div>
                  </button>
                  {isFourOn && showFourOnOptions && (
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <button
                        onClick={() => choosePreset('four_on_four_off_days')}
                        className="bg-gray-900 border border-gray-800 hover:border-teal-500 rounded-xl p-3 text-left transition-all"
                      >
                        <p className="text-white text-sm font-semibold">Days</p>
                        <p className="text-gray-500 text-xs">07:00–19:00</p>
                      </button>
                      <button
                        onClick={() => choosePreset('four_on_four_off_nights')}
                        className="bg-gray-900 border border-gray-800 hover:border-teal-500 rounded-xl p-3 text-left transition-all"
                      >
                        <p className="text-white text-sm font-semibold">Nights</p>
                        <p className="text-gray-500 text-xs">19:00–07:00</p>
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
            <button
              onClick={chooseCustom}
              className="w-full border border-dashed border-gray-700 hover:border-teal-700 rounded-2xl p-4 text-left transition-all"
            >
              <p className="text-gray-300 font-semibold">Mine's different</p>
              <p className="text-gray-500 text-sm mt-0.5">Build your own rotation, or add shifts week by week</p>
            </button>
          </div>
        )}

        {/* ── STEP 2 (preset): where are you in it today? ── */}
        {step === 'position' && (
          <div className="space-y-5">
            <div>
              <h2 className="text-white font-semibold text-lg">Where are you in it today?</h2>
              <p className="text-gray-400 text-sm mt-1">So we know which shift is today, and which come next.</p>
            </div>
            <div className="space-y-2">
              {positionBlocks.map((block, bi) => (
                <button
                  key={bi}
                  onClick={() => { setPositionBlock(bi); setPositionDay(0) }}
                  className={`w-full rounded-xl p-3 text-left border transition-all ${
                    positionBlock === bi ? 'bg-teal-900/40 border-teal-500' : 'bg-gray-900 border-gray-800 hover:border-gray-700'
                  }`}
                >
                  <p className="text-white text-sm font-medium">{block.label}</p>
                  <p className="text-gray-500 text-xs">{block.length} {block.length === 1 ? 'day' : 'days'}</p>
                </button>
              ))}
            </div>
            {(positionBlocks[positionBlock]?.length ?? 0) > 1 && (
              <div className="bg-gray-900 rounded-2xl p-4 border border-gray-800">
                <p className="text-sm text-gray-400 mb-3">Which day of it is today?</p>
                <div className="flex flex-wrap gap-2">
                  {Array.from({ length: positionBlocks[positionBlock].length }).map((_, d) => (
                    <button
                      key={d}
                      onClick={() => setPositionDay(d)}
                      className={`w-11 h-11 rounded-lg text-sm font-semibold transition-colors ${
                        positionDay === d ? 'bg-teal-500 text-gray-950' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                      }`}
                    >
                      {d + 1}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <button
              onClick={confirmPosition}
              className="w-full bg-teal-500 hover:bg-teal-400 text-gray-950 font-semibold py-3 rounded-xl transition"
            >
              Next: See your rota →
            </button>
          </div>
        )}

        {/* ── STEP 3 (preset): pre-filled grid ── */}
        {step === 'review' && (
          <div className="space-y-5">
            <div>
              <h2 className="text-white font-semibold text-lg">Here's your rota</h2>
              <p className="text-gray-400 text-sm mt-1">Tap any day to change it.</p>
            </div>
            {rotationGrid(true)}
            <button
              onClick={() => setShowShiftEditor(v => !v)}
              className="text-teal-400 text-sm font-medium"
            >
              {showShiftEditor ? 'Hide shift times' : 'Edit shift times'}
            </button>
            {showShiftEditor && shiftTypesEditor}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={startAgain}
                className="w-full bg-gray-800 hover:bg-gray-700 text-gray-200 font-semibold py-3 rounded-xl transition"
              >
                Start again
              </button>
              <button
                onClick={() => advanceTo('life')}
                className="w-full bg-teal-500 hover:bg-teal-400 text-gray-950 font-semibold py-3 rounded-xl transition"
              >
                Looks right →
              </button>
            </div>
          </div>
        )}

        {/* ── "Mine's different": pattern type ── */}
        {step === 'type' && (
          <div className="space-y-4">
            <h2 className="text-white font-semibold text-lg mb-2">Let's build your rota</h2>
            <p className="text-gray-400 text-sm mb-6">Pick the closest fit, then set it up day by day.</p>
            {[
              {
                id: 'rotating',
                patternType: 'fixed' as const,
                icon: '🔄',
                title: 'Rotating shifts',
                desc: 'Early, Late, Night and Days off in a repeating cycle',
                popular: true,
              },
              {
                id: 'nights',
                patternType: 'nights' as const,
                icon: '🌙',
                title: 'Nights only',
                desc: 'You work permanent night shifts',
                popular: false,
              },
              {
                id: 'variable',
                patternType: 'variable' as const,
                icon: '🗓️',
                title: 'Variable schedule',
                desc: 'Your shifts change week to week. Add them as they drop',
                popular: false,
              },
            ].map(option => (
              <button
                key={option.id}
                onClick={() => {
                  setPatternType(option.patternType)
                  if (option.id === 'variable') advanceTo('variable')
                  else if (option.id === 'nights') advanceTo('configure')
                  else {
                    setShifts(PRESET_SHIFTS)
                    setCycleLength(28)
                    setRotation(Array(28).fill(0))
                    setStartDate(new Date().toISOString().split('T')[0])
                    advanceTo('configure')
                  }
                }}
                className="w-full bg-gray-900 border border-gray-800 hover:border-teal-500 rounded-2xl p-5 text-left transition-all"
              >
                <div className="flex items-center gap-4">
                  <span className="text-3xl">{option.icon}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-white font-semibold">{option.title}</p>
                      {option.popular && (
                        <span className="text-[10px] bg-teal-900/60 text-teal-400 border border-teal-700/40 px-2 py-0.5 rounded-full font-medium">
                          Most common
                        </span>
                      )}
                    </div>
                    <p className="text-gray-400 text-sm mt-0.5">{option.desc}</p>
                  </div>
                  <span className="text-gray-600 text-lg">›</span>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* ── STEP 2: Variable schedule ── */}
        {step === 'variable' && (
          <div className="space-y-5">
            <div>
              <h2 className="text-white font-semibold text-lg">Your schedule</h2>
              <p className="text-gray-400 text-sm mt-1">Tap each day to set your shift. Update this whenever your rota changes.</p>
            </div>

            {/* Start date */}
            <div className="bg-gray-900 rounded-2xl p-4 border border-gray-800">
              <label className="block text-sm text-gray-400 mb-1">Schedule starts</label>
              <p className="text-xs text-gray-600 mb-3">Pick the first day of your published schedule</p>
              <input
                type="date"
                value={variableStartDate}
                onChange={e => { setVariableStartDate(e.target.value); setVariableSchedule({}) }}
                className="bg-gray-800 text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            {/* How many weeks */}
            <div className="bg-gray-900 rounded-2xl p-4 border border-gray-800">
              <label className="block text-sm text-gray-400 mb-3">How many weeks to fill in?</label>
              <div className="flex gap-2">
                {[2, 3, 4, 6].map(w => (
                  <button
                    key={w}
                    onClick={() => { setVariableWeeks(w); setVariableSchedule({}) }}
                    className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
                      variableWeeks === w ? 'bg-teal-500 text-gray-950' : 'bg-gray-800 text-gray-400'
                    }`}
                  >
                    {w}w
                  </button>
                ))}
              </div>
            </div>

            {/* Progress */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">{filledDays} of {totalDays} days set</span>
              <span className="text-teal-400 font-medium">{Math.round((filledDays / totalDays) * 100)}%</span>
            </div>
            <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-teal-500 rounded-full transition-all duration-300"
                style={{ width: `${(filledDays / totalDays) * 100}%` }}
              />
            </div>

            {/* Week tabs */}
            <div className="flex gap-2 overflow-x-auto pb-1">
              {Array.from({ length: variableWeeks }).map((_, wi) => (
                <button
                  key={wi}
                  onClick={() => setActiveWeek(wi)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    activeWeek === wi
                      ? 'bg-teal-900/60 text-teal-400 border border-teal-700/40'
                      : 'bg-gray-800 text-gray-500'
                  }`}
                >
                  Week {wi + 1} · {getWeekLabel(variableDates, wi)}
                </button>
              ))}
            </div>

            {/* Day list */}
            <div className="space-y-2">
              {variableDates.slice(activeWeek * 7, activeWeek * 7 + 7).map(dateStr => {
                const entry = variableSchedule[dateStr]
                const isEditing = editingDate === dateStr
                const isToday = dateStr === new Date().toISOString().split('T')[0]
                const shiftOption = entry ? VARIABLE_SHIFT_OPTIONS.find(o => o.label === entry.label) : null

                return (
                  <div key={dateStr}>
                    <button
                      onClick={() => setEditingDate(isEditing ? null : dateStr)}
                      className={`w-full p-4 rounded-2xl border text-left transition-all ${
                        entry
                          ? `${shiftOption?.bg || 'bg-gray-800/40'} ${shiftOption?.border || 'border-gray-700'}`
                          : 'bg-gray-900 border-gray-800'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-semibold ${isToday ? 'text-teal-400' : 'text-white'}`}>
                              {formatDisplayDate(dateStr)}
                            </span>
                            {isToday && (
                              <span className="text-[9px] bg-teal-900/60 text-teal-400 border border-teal-700/40 px-1.5 py-0.5 rounded-full font-medium">
                                TODAY
                              </span>
                            )}
                          </div>
                          {entry ? (
                            <span className={`text-xs font-medium ${shiftOption?.color || 'text-gray-400'}`}>
                              {entry.label}{!entry.isOff ? ` · ${entry.startTime}–${entry.endTime}` : ''}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-600">Tap to set shift</span>
                          )}
                        </div>
                        <span className="text-gray-600">{isEditing ? '↑' : '↓'}</span>
                      </div>
                    </button>

                    {/* Shift picker */}
                    {isEditing && (
                      <div className="bg-gray-900 border border-teal-700/20 border-t-0 rounded-b-2xl p-3 space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                          {VARIABLE_SHIFT_OPTIONS.map(option => (
                            <button
                              key={option.label}
                              onClick={() => setVariableDay(dateStr, option)}
                              className={`p-3 rounded-xl border text-left transition-all ${
                                entry?.label === option.label
                                  ? `${option.bg} ${option.border}`
                                  : 'bg-gray-800 border-gray-700'
                              }`}
                            >
                              <div className={`text-sm font-semibold ${option.color}`}>{option.label}</div>
                              <div className="text-xs text-gray-500 mt-0.5">
                                {option.isOff ? 'Rest day' : `${option.startTime}–${option.endTime}`}
                              </div>
                            </button>
                          ))}
                        </div>

                        {/* Custom times */}
                        {entry && !entry.isOff && (
                          <div>
                            <p className="text-xs text-gray-500 mb-2">Adjust times for this day</p>
                            <div className="grid grid-cols-2 gap-2">
                              <div className="bg-gray-800 rounded-xl p-3">
                                <label className="block text-xs text-gray-500 mb-1">Start</label>
                                <input
                                  type="time"
                                  value={entry.startTime}
                                  onChange={e => updateVariableTimes(dateStr, e.target.value, entry.endTime)}
                                  style={{ background: 'transparent', color: 'white', border: 'none', outline: 'none', fontSize: 14, width: '100%' }}
                                />
                              </div>
                              <div className="bg-gray-800 rounded-xl p-3">
                                <label className="block text-xs text-gray-500 mb-1">End</label>
                                <input
                                  type="time"
                                  value={entry.endTime}
                                  onChange={e => updateVariableTimes(dateStr, entry.startTime, e.target.value)}
                                  style={{ background: 'transparent', color: 'white', border: 'none', outline: 'none', fontSize: 14, width: '100%' }}
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            <button
              onClick={() => advanceTo('life')}
              className="w-full bg-teal-500 hover:bg-teal-400 text-gray-950 font-semibold py-3 rounded-xl transition"
            >
              Next: A bit about your life →
            </button>
          </div>
        )}

        {/* ── STEP 2: Configure Fixed ── */}
        {step === 'configure' && patternType === 'fixed' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-white font-semibold text-lg">Your shift types</h2>
              <p className="text-gray-400 text-sm mt-1">Check the times look right, and edit if needed</p>
            </div>
            {shiftTypesEditor}

            <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
              <label className="block text-sm text-gray-400 mb-3">How long is your cycle? (days)</label>
              <div className="flex gap-2 flex-wrap">
                {[7, 14, 21, 28, 35, 42].map(len => (
                  <button
                    key={len}
                    onClick={() => { setCycleLength(len); setRotation(Array(len).fill(0)) }}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      cycleLength === len ? 'bg-teal-500 text-gray-950' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    {len}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
              <label className="block text-sm text-gray-400 mb-1">When did your current cycle start?</label>
              <p className="text-xs text-gray-600 mb-3">Not sure? Pick the Monday your current block started</p>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="bg-gray-800 text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <button
              onClick={() => advanceTo('rotation')}
              className="w-full bg-teal-500 hover:bg-teal-400 text-gray-950 font-semibold py-3 rounded-xl transition"
            >
              Next: Map your rotation →
            </button>
          </div>
        )}

        {/* ── STEP 2: Configure Nights ── */}
        {step === 'configure' && patternType === 'nights' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-white font-semibold text-lg">Your night shift times</h2>
              <p className="text-gray-400 text-sm mt-1">When does your shift typically run?</p>
            </div>
            <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800 space-y-5">
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
              onClick={() => advanceTo('life')}
              className="w-full bg-teal-500 hover:bg-teal-400 text-gray-950 font-semibold py-3 rounded-xl transition"
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
              <p className="text-gray-400 text-sm mt-1">Tap each day to cycle through your shift types</p>
            </div>
            {rotationGrid(false)}
            <button
              onClick={() => advanceTo('life')}
              className="w-full bg-teal-500 hover:bg-teal-400 text-gray-950 font-semibold py-3 rounded-xl transition"
            >
              Next: A bit about your life →
            </button>
          </div>
        )}

        {/* ── STEP 4: Life context ── */}
        {step === 'life' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-white font-semibold text-lg">A bit about your life</h2>
              <p className="text-gray-400 text-sm mt-1">
                Helps ShiftWell give advice that fits your real life, not just your rota.
              </p>
            </div>
            <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium text-sm">Do you have children?</p>
                  <p className="text-gray-500 text-xs mt-0.5">Affects sleep and routine suggestions</p>
                </div>
                <button
                  onClick={() => setHasKids(!hasKids)}
                  className={`w-12 h-6 rounded-full transition-colors relative flex-shrink-0 ${hasKids ? 'bg-teal-500' : 'bg-gray-700'}`}
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
            <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
              <label className="block text-sm text-gray-400 mb-1">Latest you can sleep in on days off</label>
              <p className="text-gray-600 text-xs mb-3">Leave blank if no constraint</p>
              <input
                type="time"
                value={wakeConstraint}
                onChange={e => setWakeConstraint(e.target.value)}
                className="bg-gray-800 text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
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
            <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
              <label className="block text-sm text-gray-400 mb-1">Dietary requirements</label>
              <p className="text-gray-600 text-xs mb-3">Select all that apply. This affects food suggestions</p>
              <div className="flex flex-wrap gap-2">
                {[
                  'Vegetarian', 'Vegan', 'Gluten-free', 'Dairy-free',
                  'Halal', 'Kosher', 'No pork', 'No shellfish', 'Low carb'
                ].map(diet => (
                  <button
                    key={diet}
                    onClick={() => {
                      setDietaryRestrictions(prev =>
                        prev.includes(diet) ? prev.filter(d => d !== diet) : [...prev, diet]
                      )
                    }}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                      dietaryRestrictions.includes(diet)
                        ? 'bg-teal-900/60 text-teal-400 border-teal-700/40'
                        : 'bg-gray-800 text-gray-400 border-gray-700'
                    }`}
                  >
                    {diet}
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full bg-teal-500 hover:bg-teal-400 text-gray-950 font-semibold py-3 rounded-xl transition disabled:opacity-50"
            >
              {saving ? 'Saving...' : "Let's go →"}
            </button>
          </div>
        )}

        {/* Back */}
        {step !== 'preset' && (
          <button
            onClick={() => {
              const viaPreset = !!preset && preset !== 'custom'
              if (step === 'position' || step === 'type') setStep('preset')
              else if (step === 'review') setStep('position')
              else if (step === 'configure') setStep(viaPreset ? 'preset' : 'type')
              else if (step === 'variable') setStep('type')
              else if (step === 'rotation') setStep('configure')
              else if (step === 'life') {
                if (patternType === 'variable') setStep('variable')
                else if (patternType === 'fixed') setStep(viaPreset ? 'review' : 'rotation')
                else setStep('configure')
              }
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
