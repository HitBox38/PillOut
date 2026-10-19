import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PRIZES } from '../constants'
import { earnReward, getRewardPage, localDate, restoreRewards, rewardWeek } from '../helpers'
import { useDailyRewards } from '../hooks/useDailyRewards'
import type { RewardDay } from '../types'

vi.hoisted(() => {
  const memory = new Map<string, string>()
  const storage = {
    getItem: (key: string) => memory.get(key) ?? null,
    setItem: (key: string, value: string) => memory.set(key, value),
    removeItem: (key: string) => memory.delete(key),
  }
  vi.stubGlobal('localStorage', storage)
  vi.stubGlobal('window', { localStorage: storage })
})

beforeEach(() => {
  useDailyRewards.setState({ days: [], prizes: [] })
  vi.useRealTimers()
})

describe('daily reward rules', () => {
  it('keeps every prize reachable in bounded pages without duplicates', () => {
    const prizes = Array.from({ length: 19 }, (_, index) => `Prize ${index}`)
    const pages = Array.from(
      { length: getRewardPage(prizes, 6, 0).pages },
      (_, page) => getRewardPage(prizes, 6, page).items,
    )
    expect(pages.every((page) => page.length <= 6)).toBe(true)
    expect(pages.flat()).toEqual(prizes)
  })

  it('returns to the last available pocket page after a prize is received', () => {
    expect(getRewardPage(['book', 'toy'], 1, 2)).toEqual({ items: ['toy'], page: 1, pages: 2 })
  })

  it('keeps the empty pocket on a valid page', () => {
    expect(getRewardPage([], 1, 4)).toEqual({ items: [], page: 0, pages: 1 })
  })
  it('uses local midnight, rather than UTC or a 24-hour waiting period', () => {
    expect(localDate(new Date(2026, 9, 19, 23, 59))).toBe('2026-10-19')
    expect(localDate(new Date(2026, 9, 20, 0, 0))).toBe('2026-10-20')
    const days = earnReward([], 1, '2026-10-19')
    expect(earnReward(days, 2, '2026-10-20')).toHaveLength(2)
  })

  it('earns only once a day and resists moving the clock backwards', () => {
    const days = earnReward([], 1, '2026-10-19')
    expect(earnReward(days, 2, '2026-10-19')).toBe(days)
    expect(earnReward(days, 2, '2026-10-18')).toBe(days)
  })

  it('keeps earned and unclaimed progress when days are missed', () => {
    const first = earnReward([], 1, '2026-10-19')
    const later = earnReward(first, 2, '2026-10-25')
    expect(later).toHaveLength(2)
    expect(later[0]).toEqual(first[0])
    expect(rewardWeek(later, '2026-10-25')).toEqual({ start: 0, current: 0, week: 1 })
  })

  it('shows a completed week on day seven and starts a new week on the next day', () => {
    let days: RewardDay[] = []
    for (let day = 10; day < 17; day++) days = earnReward(days, day, `2026-10-${day}`)
    days = days.map((day) => ({ ...day, prize: PRIZES[0]! }))
    expect(rewardWeek(days, '2026-10-16')).toEqual({ start: 0, current: 6, week: 1 })
    expect(rewardWeek(days, '2026-10-18')).toEqual({ start: 7, current: 0, week: 2 })
  })
})

describe('reward claims and persistence', () => {
  it('requires both an earned day and a caregiver-selected prize', () => {
    const store = useDailyRewards.getState
    store().savePrizes([PRIZES[0]!])
    expect(store().claim(localDate(), PRIZES[0]!.id)).toBe(false)
    store().recordWin(1)
    expect(store().claim(localDate(), PRIZES[1]!.id)).toBe(false)
    expect(store().claim(localDate(), PRIZES[0]!.id)).toBe(true)
    expect(store().claim(localDate(), PRIZES[0]!.id)).toBe(false)
    expect(store().days[0]?.prize?.name).toBe('Bakery treat')
  })

  it('cannot accidentally claim two queued days with a double click', () => {
    const days = earnReward(earnReward([], 1, '2026-10-18'), 2, '2026-10-19')
    useDailyRewards.setState({ days, prizes: [PRIZES[1]!] })
    expect(useDailyRewards.getState().claim('2026-10-18', 'book')).toBe(true)
    expect(useDailyRewards.getState().claim('2026-10-18', 'book')).toBe(false)
    expect(useDailyRewards.getState().days[1]?.prize).toBeNull()
  })

  it('preserves claimed prize snapshots when choices change and after rehydration', async () => {
    const store = useDailyRewards.getState
    const custom = { id: 'custom-picnic', name: 'A picnic together' }
    store().savePrizes([custom])
    store().recordWin(3)
    store().claim(localDate(), custom.id)
    store().savePrizes([PRIZES[1]!])
    store().markReceived(localDate())
    const expected = store().days
    const saved = localStorage.getItem('pillout-daily-rewards')!
    useDailyRewards.setState({ days: [], prizes: [] })
    localStorage.setItem('pillout-daily-rewards', saved)
    await useDailyRewards.persist.rehydrate()
    expect(store().days).toEqual(expected)
    expect(store().days[0]).toMatchObject({ prize: custom, received: true })
    expect(store().prizes).toEqual([PRIZES[1]!])
  })

  it('ignores malformed storage, invalid dates, duplicate days, and unsafe sprite crops', () => {
    const fallback = { days: [], prizes: [] }
    expect(restoreRewards(null, fallback)).toBe(fallback)
    const restored = restoreRewards(
      {
        prizes: [{ id: 'book', name: 'Book', crop: [0, 0, 99999, 99999] }, null],
        days: [
          null,
          { date: '2026-02-30', level: 1 },
          { date: '2026-10-19', level: 1 },
          { date: '2026-10-19', level: 2 },
          { date: '2026-10-20', level: -1 },
        ],
      },
      fallback,
    )
    expect(restored.days).toHaveLength(1)
    expect(restored.prizes).toEqual([PRIZES[1]!])
  })
})
