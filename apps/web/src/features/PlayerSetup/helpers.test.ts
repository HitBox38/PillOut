import { describe, expect, it } from 'vitest'
import { isScheduleComplete } from './helpers'

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
