import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/lib/api'
import { readRoom, updateRoom } from '../api'
import type { DemoRoom } from '../types'

vi.mock('../api', () => ({
  readRoom: vi.fn<typeof readRoom>(),
  updateRoom: vi.fn<typeof updateRoom>(),
}))
let useDemoStore: typeof import('../hooks/useDemoStore').useDemoStore
const room: DemoRoom = {
  room: 'ABCDEFGH',
  revision: 1,
  medicines: ['imatinib'],
  time: '09:00',
  prizes: ['book'],
  checked_in: true,
  won: false,
  won_on: null,
  won_level: 1,
  claimed: null,
  received: false,
}

beforeAll(async () => {
  const saved = new Map<string, string>()
  vi.stubGlobal('sessionStorage', {
    getItem: (key: string) => saved.get(key) ?? null,
    setItem: (key: string, value: string) => saved.set(key, value),
    removeItem: (key: string) => saved.delete(key),
  })
  useDemoStore = (await import('../hooks/useDemoStore')).useDemoStore
})
afterAll(() => vi.unstubAllGlobals())
beforeEach(() => {
  vi.resetAllMocks()
  useDemoStore.setState({
    current: null,
    pending: false,
    pendingWins: {},
    error: null,
    connectionError: null,
  })
  useDemoStore.getState().enter(room.room)
  useDemoStore.getState().accept(room)
})

describe('shared demo session', () => {
  it('ignores stale polls and late responses from a different room', () => {
    useDemoStore.getState().accept({ ...room, revision: 3, prizes: ['toy'] })
    useDemoStore.getState().accept({ ...room, revision: 2 })
    expect(useDemoStore.getState().current?.prizes).toEqual(['toy'])
    useDemoStore.getState().enter('JKLMNPQR')
    useDemoStore.getState().accept({ ...room, revision: 4 })
    expect(useDemoStore.getState().current).toBeNull()
  })

  it('retains a failed win for retry, then clears it only when the server confirms', async () => {
    vi.mocked(updateRoom).mockRejectedValueOnce(new ApiError('Offline', 0))
    useDemoStore.getState().queueWin(room.room, 4)
    await vi.waitFor(() => expect(useDemoStore.getState().pending).toBe(false))
    expect(useDemoStore.getState().pendingWins).toEqual({ ABCDEFGH: 4 })
    expect(
      JSON.parse(sessionStorage.getItem('pillout-demo-pending-wins')!).state.pendingWins,
    ).toEqual({ ABCDEFGH: 4 })
    useDemoStore.getState().accept({ ...room, revision: 2 })
    expect(useDemoStore.getState().error).toBe('Offline')
    vi.mocked(updateRoom).mockResolvedValue({ ...room, revision: 3, won: true, won_level: 4 })
    await useDemoStore.getState().send({ action: 'win', role: 'patient', level: 4 })
    expect(useDemoStore.getState().pendingWins).toEqual({})
    expect(useDemoStore.getState().current?.won).toBe(true)
  })

  it('refreshes a conflict without overwriting the other device’s changes', async () => {
    vi.mocked(updateRoom).mockRejectedValue(new ApiError('Changed on another device', 409))
    vi.mocked(readRoom).mockResolvedValue({ ...room, revision: 2, prizes: ['toy'] })
    expect(
      await useDemoStore
        .getState()
        .send({ action: 'plan', role: 'medical', medicines: ['imatinib'], time: '10:00' }),
    ).toBe(false)
    expect(useDemoStore.getState().current?.prizes).toEqual(['toy'])
    expect(useDemoStore.getState().error).toContain('Changed')
  })
})
