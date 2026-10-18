import { PRIZES } from './constants'
import type { Prize, RewardDay, RewardProgress } from './types'

/** Local calendar dates: a new day follows the player's device, not UTC. */
export function localDate(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function earnReward(days: RewardDay[], level: number, date = localDate()): RewardDay[] {
  // Also prevents gaining duplicate days by turning the device clock backwards.
  if (days.some((day) => day.date >= date)) return days
  return [...days, { date, level, prize: null, received: false }]
}

export function rewardWeek(days: RewardDay[], today: string) {
  const pending = days.findIndex((day) => !day.prize)
  const cursor =
    pending >= 0 ? pending : days.at(-1)?.date === today ? days.length - 1 : days.length
  const start = Math.floor(Math.max(0, cursor) / 7) * 7
  return { start, current: cursor - start, week: Math.floor(start / 7) + 1 }
}

function restorePrize(value: unknown): Prize | null {
  if (!value || typeof value !== 'object') return null
  const { id, name } = value as Partial<Prize>
  if (typeof id !== 'string' || typeof name !== 'string' || !name.trim()) return null
  const preset = PRIZES.find((prize) => prize.id === id)
  if (preset) return preset
  return id.startsWith('custom-') ? { id, name: name.trim().slice(0, 60) } : null
}

export function restoreRewards(value: unknown, fallback: RewardProgress): RewardProgress {
  if (!value || typeof value !== 'object') return fallback
  const saved = value as Partial<RewardProgress>
  const prizes = Array.isArray(saved.prizes)
    ? saved.prizes.map(restorePrize).filter((prize): prize is Prize => Boolean(prize))
    : fallback.prizes
  const days: RewardDay[] = []
  if (Array.isArray(saved.days)) {
    for (const day of saved.days) {
      if (!day || typeof day !== 'object') continue
      if (typeof day.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(day.date)) continue
      const parsed = new Date(`${day.date}T12:00:00`)
      if (!Number.isFinite(parsed.getTime()) || localDate(parsed) !== day.date) continue
      if (days.at(-1) && days.at(-1)!.date >= day.date) continue
      if (!Number.isSafeInteger(day.level) || day.level < 1) continue
      const prize = restorePrize(day.prize)
      days.push({
        date: day.date,
        level: day.level,
        prize,
        received: Boolean(prize && day.received === true),
      })
    }
  }
  return {
    days,
    prizes: prizes.filter((prize, i) => prizes.findIndex((p) => p.id === prize.id) === i),
  }
}
