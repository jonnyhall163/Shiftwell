// Saving pattern_data without wiping what the iOS app keeps in it.
//
// shiftwell_profiles.pattern_data is shared with the native app, which adds
// its own fields (time-off overrides, custom labels, break times, and more
// to come). The web editors only manage a few keys per pattern type, so a
// save must replace those keys and leave everything else exactly as stored,
// including keys this code has never heard of.

import type { SupabaseClient } from '@supabase/supabase-js'
import type { PatternData } from './shiftEngine'

type Json = Record<string, unknown>

// The keys the web editors write, per pattern type.
const WEB_KEYS: Record<PatternData['type'], readonly string[]> = {
  fixed: ['type', 'cycleLength', 'shifts', 'rotation', 'startDate'],
  nights: ['type', 'shift', 'startTime'],
  variable: ['type', 'schedule'],
}
const ALL_WEB_KEYS = new Set(Object.values(WEB_KEYS).flat())

const isObject = (v: unknown): v is Json => !!v && typeof v === 'object' && !Array.isArray(v)

// Carries fields the web doesn't know about (e.g. a break time on one shift)
// from the stored item onto the edited one. Edited values always win.
const withExtras = (stored: unknown, edited: object): Json =>
  isObject(stored) ? { ...stored, ...edited } : { ...edited }

function mergeShifts(stored: unknown, edited: object[]): Json[] {
  if (!Array.isArray(stored)) return edited.map(s => ({ ...s }))
  // Same number of shift types: nothing was added or removed, so match by
  // position (labels may have been renamed). Otherwise match by label.
  if (stored.length === edited.length) return edited.map((s, i) => withExtras(stored[i], s))
  const byLabel = new Map<string, unknown>()
  const seen = new Set<string>()
  for (const s of stored) {
    const key = isObject(s) && typeof s.label === 'string' ? s.label.trim().toLowerCase() : null
    if (!key) continue
    if (seen.has(key)) byLabel.delete(key)
    else { byLabel.set(key, s); seen.add(key) }
  }
  return edited.map(s => {
    const label = (s as { label?: unknown }).label
    return withExtras(typeof label === 'string' ? byLabel.get(label.trim().toLowerCase()) : undefined, s)
  })
}

function mergeSchedule(stored: unknown, edited: { date: string }[]): Json[] {
  if (!Array.isArray(stored)) return edited.map(d => ({ ...d }))
  const storedByDate = new Map<string, unknown>()
  for (const d of stored) if (isObject(d) && typeof d.date === 'string') storedByDate.set(d.date, d)
  const editedDates = new Set(edited.map(d => d.date))
  const merged = edited.map(d => withExtras(storedByDate.get(d.date), d))
  // Days outside the range the web editor showed (e.g. weeks the iOS app
  // added further ahead) are kept as they are, not dropped.
  for (const d of stored) {
    if (isObject(d) && typeof d.date === 'string' && !editedDates.has(d.date)) merged.push(d)
  }
  return merged.sort((a, b) => String(a.date).localeCompare(String(b.date)))
}

/**
 * The pattern_data to save: `edited` (what the web editor produced) merged
 * into `stored` (what's in the database now). Keys the web editor doesn't
 * manage are kept untouched. If the pattern type changed, the old type's
 * web-managed keys are dropped (the web replaced that pattern), but unknown
 * keys still survive. With nothing stored, `edited` is saved as it is.
 */
export function mergePatternData(stored: unknown, edited: PatternData): Json {
  const fresh: Json = { ...edited }
  if (!isObject(stored)) return fresh

  const sameType = stored.type === edited.type
  const managed = sameType ? new Set(WEB_KEYS[edited.type]) : ALL_WEB_KEYS
  const out: Json = {}
  for (const [k, v] of Object.entries(stored)) if (!managed.has(k)) out[k] = v
  Object.assign(out, fresh)

  if (sameType) {
    if (edited.type === 'fixed') out.shifts = mergeShifts(stored.shifts, edited.shifts)
    if (edited.type === 'nights') out.shift = withExtras(stored.shift, edited.shift)
    if (edited.type === 'variable') out.schedule = mergeSchedule(stored.schedule, edited.schedule)
  }
  return out
}

/**
 * Reads the user's current pattern_data from the database (not the copy
 * loaded when the page opened: the iOS app may have saved since) and
 * returns the merged value to write. Returns an error instead of a value if
 * the read fails, so a save never goes ahead blind and wipes fields.
 */
export async function mergeWithStoredPatternData(
  supabase: SupabaseClient,
  userId: string,
  edited: PatternData
): Promise<{ data: Json; error: null } | { data: null; error: string }> {
  const { data, error } = await supabase
    .from('shiftwell_profiles')
    .select('pattern_data')
    .eq('id', userId)
    .maybeSingle()
  if (error) return { data: null, error: error.message }
  return { data: mergePatternData(data?.pattern_data ?? null, edited), error: null }
}
