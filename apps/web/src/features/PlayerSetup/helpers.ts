import type { PillSchedule } from './types'

const PLAYER_ID_STORAGE_KEY = 'pillout-player-id'

export function getSavedPlayerId(): number | null {
  try {
    const value = localStorage.getItem(PLAYER_ID_STORAGE_KEY)
    const id = value === null ? NaN : Number(value)
    return Number.isSafeInteger(id) && id > 0 ? id : null
  } catch {
    return null
  }
}

export function rememberPlayerId(id: number | null) {
  try {
    if (id === null) localStorage.removeItem(PLAYER_ID_STORAGE_KEY)
    else localStorage.setItem(PLAYER_ID_STORAGE_KEY, String(id))
  } catch {
    // A browser that blocks storage can still play for the current session.
  }
}

export function isScheduleComplete(schedule: PillSchedule | undefined) {
  if (!schedule || !/^([01]\d|2[0-3]):[0-5]\d$/.test(schedule.time)) return false
  const quantity = Number(schedule.quantity)
  return Number.isFinite(quantity) && quantity >= 0.25 && Number.isInteger(quantity * 4)
}
