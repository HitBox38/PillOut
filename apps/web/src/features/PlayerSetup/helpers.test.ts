import { afterEach, describe, expect, it, vi } from 'vitest'
import { getSavedPlayerId, isScheduleComplete, rememberPlayerId } from './helpers'

afterEach(() => vi.unstubAllGlobals())

describe('remembered player identity', () => {
  it.each([null, '', 'invalid', '0', '-1', '1.5', 'Infinity', '9007199254740992'])(
    'ignores an invalid saved ID: %s',
    (value) => {
      vi.stubGlobal('localStorage', { getItem: () => value })
      expect(getSavedPlayerId()).toBeNull()
    },
  )

  it('remembers only the generated ID', () => {
    const memory = new Map<string, string>()
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => memory.get(key) ?? null,
      setItem: (key: string, value: string) => memory.set(key, value),
      removeItem: (key: string) => memory.delete(key),
    })
    rememberPlayerId(42)
    expect(getSavedPlayerId()).toBe(42)
    expect([...memory.entries()]).toEqual([['pillout-player-id', '42']])
    rememberPlayerId(null)
    expect(getSavedPlayerId()).toBeNull()
  })

  it('keeps the app usable when browser storage is blocked', () => {
    const blocked = () => {
      throw new Error('Storage is blocked')
    }
    vi.stubGlobal('localStorage', { getItem: blocked, setItem: blocked, removeItem: blocked })
    expect(getSavedPlayerId()).toBeNull()
    expect(() => rememberPlayerId(42)).not.toThrow()
    expect(() => rememberPlayerId(null)).not.toThrow()
  })
})

describe('plan completion across medicine pages', () => {
  it('requires a time and a positive quarter-pill quantity on every page', () => {
    expect(isScheduleComplete(undefined)).toBe(false)
    expect(isScheduleComplete({ time: '', quantity: '1' })).toBe(false)
    for (const quantity of ['', '0', '-1', '0.3', 'Infinity', 'NaN']) {
      expect(isScheduleComplete({ time: '08:00', quantity })).toBe(false)
    }
    for (const time of ['24:00', '12:60', '8:00']) {
      expect(isScheduleComplete({ time, quantity: '1' })).toBe(false)
    }
  })

  it('accepts exact times, midnight, and fractional quantities', () => {
    for (const time of ['00:00', '08:07', '23:59']) {
      for (const quantity of ['0.25', '0.5', '1', '2.75']) {
        expect(isScheduleComplete({ time, quantity })).toBe(true)
      }
    }
  })
})
