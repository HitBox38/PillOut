import type { PillSchedule } from './types'

export function isScheduleComplete(schedule: PillSchedule | undefined) {
  if (!schedule || !/^([01]\d|2[0-3]):[0-5]\d$/.test(schedule.time)) return false
  const quantity = Number(schedule.quantity)
  return Number.isFinite(quantity) && quantity >= 0.25 && Number.isInteger(quantity * 4)
}
