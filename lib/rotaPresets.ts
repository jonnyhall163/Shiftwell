// Rota presets for onboarding. Every preset produces pattern_data in exactly
// the shapes the rota editor already saves (the iOS app reads the same
// rows), so nothing downstream can tell a preset rota from a hand-made one:
//   fixed:  { type, cycleLength, shifts, rotation, startDate }
//   nights: { type, shift, startTime }

import type { ShiftDefinition } from './shiftEngine'
import { toLocalDateStr } from './shiftEngine'

export type RotaPresetId =
  | 'early_late_night'
  | 'four_on_four_off_days'
  | 'four_on_four_off_nights'
  | 'nights_only'
  | 'days_only'

const OFF: ShiftDefinition = { label: 'Off', startTime: '', endTime: '', isOff: true }

export type FixedPreset = {
  id: Exclude<RotaPresetId, 'nights_only'>
  kind: 'fixed'
  shifts: ShiftDefinition[]
  rotation: number[] // index into shifts for each day of the cycle
}

export type NightsPreset = {
  id: 'nights_only'
  kind: 'nights'
  startTime: string
  endTime: string
}

export type RotaPreset = FixedPreset | NightsPreset

const run = (shiftIndex: number, days: number) => Array<number>(days).fill(shiftIndex)

export const ROTA_PRESETS: Record<RotaPresetId, RotaPreset> = {
  // 28 days: 5 earlies, 2 off, 5 lates, 2 off, 5 nights, 9 off.
  // Same shift types and times as the editor's default.
  early_late_night: {
    id: 'early_late_night',
    kind: 'fixed',
    shifts: [
      { label: 'Early', startTime: '06:00', endTime: '14:00', isOff: false },
      { label: 'Late',  startTime: '14:00', endTime: '22:00', isOff: false },
      { label: 'Night', startTime: '22:00', endTime: '06:00', isOff: false },
      OFF,
    ],
    rotation: [...run(0, 5), ...run(3, 2), ...run(1, 5), ...run(3, 2), ...run(2, 5), ...run(3, 9)],
  },
  four_on_four_off_days: {
    id: 'four_on_four_off_days',
    kind: 'fixed',
    shifts: [{ label: 'Day', startTime: '07:00', endTime: '19:00', isOff: false }, OFF],
    rotation: [...run(0, 4), ...run(1, 4)],
  },
  four_on_four_off_nights: {
    id: 'four_on_four_off_nights',
    kind: 'fixed',
    shifts: [{ label: 'Night', startTime: '19:00', endTime: '07:00', isOff: false }, OFF],
    rotation: [...run(0, 4), ...run(1, 4)],
  },
  nights_only: { id: 'nights_only', kind: 'nights', startTime: '22:00', endTime: '06:00' },
  // 5 x 08:00-16:00, then 2 off.
  days_only: {
    id: 'days_only',
    kind: 'fixed',
    shifts: [{ label: 'Day', startTime: '08:00', endTime: '16:00', isOff: false }, OFF],
    rotation: [...run(0, 5), ...run(1, 2)],
  },
}

export type RotaBlock = {
  label: string      // e.g. "Early shifts", "Days off after Late shifts"
  start: number      // first day index in the cycle (0-based)
  length: number
  isOff: boolean
}

/** Consecutive runs of the same shift, for the "where are you today?" question. */
export function rotationBlocks(shifts: ShiftDefinition[], rotation: number[]): RotaBlock[] {
  const blocks: RotaBlock[] = []
  let lastWorking: string | null = null
  for (let i = 0; i < rotation.length; ) {
    const idx = rotation[i]
    let j = i
    while (j < rotation.length && rotation[j] === idx) j++
    const shift = shifts[idx]
    const isOff = !!shift?.isOff
    const label = isOff
      ? (lastWorking ? `Days off after ${lastWorking} shifts` : 'Days off')
      : `${shift?.label || 'Shift'} shifts`
    if (!isOff) lastWorking = shift?.label || 'Shift'
    blocks.push({ label, start: i, length: j - i, isOff })
    i = j
  }
  return blocks
}

/**
 * The cycle start date that makes `today` fall on day `dayIndex` (0-based)
 * of the cycle, as the local "YYYY-MM-DD" the editor saves. Uses the local
 * calendar, never toISOString(), so it can't slip a day around midnight.
 */
export function startDateForToday(dayIndex: number, today: Date = new Date()): string {
  const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - dayIndex)
  return toLocalDateStr(d)
}
