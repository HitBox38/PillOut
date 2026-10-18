import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

let usePlayerSetup: typeof import('./usePlayerSetup').usePlayerSetup

beforeAll(async () => {
  const memory = new Map<string, string>()
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => memory.get(key) ?? null,
    setItem: (key: string, value: string) => memory.set(key, value),
    removeItem: (key: string) => memory.delete(key),
  })
  ;({ usePlayerSetup } = await import('./usePlayerSetup'))
})

beforeEach(() => usePlayerSetup.setState(usePlayerSetup.getInitialState(), true))

describe('demo player setup', () => {
  it('keeps each pill schedule intact while changing the selection', () => {
    const setup = usePlayerSetup.getState()
    setup.togglePill('mercaptopurine')
    setup.updateSchedule('mercaptopurine', { time: '08:30', quantity: '1' })
    setup.togglePill('methotrexate')
    setup.updateSchedule('methotrexate', { time: '18:00', quantity: '2' })
    setup.togglePill('mercaptopurine')
    expect(usePlayerSetup.getState().selectedPills).toEqual(['methotrexate'])
    setup.togglePill('mercaptopurine')
    setup.updateSchedule('mercaptopurine', { quantity: '0.5' })
    expect(usePlayerSetup.getState().schedules).toEqual({
      mercaptopurine: { time: '08:30', quantity: '0.5' },
      methotrexate: { time: '18:00', quantity: '2' },
    })
  })

  it('keeps player details and pill selections independent', () => {
    const setup = usePlayerSetup.getState()
    setup.update({ name: 'Ariel', surname: 'Levi', nickname: 'Super Ariel', avatar: 'fox' })
    setup.togglePill('mercaptopurine')
    setup.update({ patientName: 'Another patient' })
    expect(usePlayerSetup.getState()).toMatchObject({
      name: 'Ariel',
      nickname: 'Super Ariel',
      avatar: 'fox',
      patientName: 'Another patient',
      selectedPills: ['mercaptopurine'],
    })
  })
})
