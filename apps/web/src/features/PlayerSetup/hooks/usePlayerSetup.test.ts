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

const user = {
  id: 42,
  first_name: 'Ariel',
  last_name: 'Levi',
  nickname: 'Super Ariel',
  avatar_id: 17,
}
const json = (value: unknown) => new Response(JSON.stringify(value))
const fetchMock = vi.fn<typeof fetch>()

beforeEach(() => {
  usePlayerSetup.setState(usePlayerSetup.getInitialState(), true)
  fetchMock.mockReset()
  fetchMock.mockImplementation(async (url) => {
    if (url === '/api/drugs') {
      return json([
        { id: 9, name: 'Mercaptopurine from server', catalog_key: 'mercaptopurine' },
        { id: 10, name: 'Unknown artwork', catalog_key: 'unavailable' },
      ])
    }
    if (url === '/api/avatars') return json([{ id: 17, name: 'Fox', catalog_key: 'fox' }])
    return json(user)
  })
  vi.stubGlobal('fetch', fetchMock)
})

describe('player setup', () => {
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

  it('loads supported catalog choices once and maps database IDs to sprite IDs', async () => {
    await usePlayerSetup.getState().loadCatalogs()
    await usePlayerSetup.getState().loadCatalogs()
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(usePlayerSetup.getState()).toMatchObject({
      catalogStatus: 'ready',
      avatar: 'fox',
      pills: [{ id: 'mercaptopurine', databaseId: 9, name: 'Mercaptopurine from server' }],
      avatars: [{ id: 'fox', databaseId: 17 }],
    })
  })

  it('allows retry after catalog loading fails', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Offline'))
    await usePlayerSetup.getState().loadCatalogs()
    expect(usePlayerSetup.getState().catalogStatus).toBe('error')
    await usePlayerSetup.getState().loadCatalogs()
    expect(usePlayerSetup.getState().catalogStatus).toBe('ready')
  })

  it('saves a profile, reads it back, and updates the same user on subsequent saves', async () => {
    const setup = usePlayerSetup.getState()
    await setup.loadCatalogs()
    setup.update({ name: ' Ariel ', surname: ' Levi ', nickname: ' Super Ariel ' })
    expect(await setup.saveProfile()).toBe(true)
    expect(usePlayerSetup.getState()).toMatchObject({ ...userProfile(), saveStatus: 'idle' })
    expect(fetchMock.mock.calls[2]).toMatchObject([
      '/api/user',
      {
        method: 'POST',
        body: JSON.stringify({
          first_name: 'Ariel',
          last_name: 'Levi',
          nickname: 'Super Ariel',
          avatar_id: 17,
        }),
      },
    ])
    expect(fetchMock.mock.calls[3]?.[0]).toBe('/api/get_user')
    expect(await setup.saveProfile()).toBe(true)
    expect(fetchMock.mock.calls[4]?.[1]).toMatchObject({ method: 'PATCH' })
    expect(JSON.parse(fetchMock.mock.calls[4]?.[1]?.body as string).id).toBe(42)
  })

  it('keeps drafts on a failed save and prevents concurrent submissions', async () => {
    const setup = usePlayerSetup.getState()
    await setup.loadCatalogs()
    setup.update({ name: 'Ariel', surname: 'Levi', nickname: 'Super Ariel' })
    fetchMock.mockResolvedValueOnce(new Response('', { status: 503 }))
    const saving = setup.saveProfile()
    expect(await setup.saveProfile()).toBe(false)
    expect(await saving).toBe(false)
    expect(usePlayerSetup.getState()).toMatchObject({
      userId: null,
      name: 'Ariel',
      nickname: 'Super Ariel',
      avatar: 'fox',
      saveStatus: 'error',
    })
    expect(await setup.saveProfile()).toBe(true)
  })

  it('retains the created ID when read-back fails so retry updates instead of duplicating', async () => {
    const setup = usePlayerSetup.getState()
    await setup.loadCatalogs()
    setup.update({ name: 'Ariel', surname: 'Levi', nickname: 'Super Ariel' })
    fetchMock
      .mockResolvedValueOnce(json(user))
      .mockResolvedValueOnce(new Response('', { status: 500 }))
    expect(await setup.saveProfile()).toBe(false)
    expect(usePlayerSetup.getState().userId).toBe(42)
    expect(await setup.saveProfile()).toBe(true)
    expect(fetchMock.mock.calls[4]?.[1]).toMatchObject({ method: 'PATCH' })
  })
})

function userProfile() {
  return { userId: 42, name: 'Ariel', surname: 'Levi', nickname: 'Super Ariel', avatar: 'fox' }
}
