import { readdir } from 'node:fs/promises'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ALL_ART_SOURCES } from './art-assets'

class TestImage {
  src = ''
  resolve!: () => void
  reject!: (cause: Error) => void
  private ready = new Promise<void>((resolve, reject) => {
    this.resolve = resolve
    this.reject = reject
  })

  decode() {
    return this.ready
  }
  removeAttribute() {
    this.src = ''
  }
}

let requested: TestImage[]
let resolveFonts: (faces: FontFace[]) => void
let loadFonts: ReturnType<typeof vi.fn<(face: string) => Promise<FontFace[]>>>

beforeEach(() => {
  vi.resetModules()
  requested = []
  vi.stubGlobal(
    'Image',
    class extends TestImage {
      constructor() {
        super()
        requested.push(this)
      }
    },
  )
  const fonts = new Promise<FontFace[]>((resolve) => {
    resolveFonts = resolve
  })
  loadFonts = vi.fn<(face: string) => Promise<FontFace[]>>(() => fonts)
  vi.stubGlobal('document', { fonts: { load: loadFonts } })
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('startup assets', () => {
  it('includes every supplied artwork file', async () => {
    const files = await readdir(new URL('../../public/art/', import.meta.url))
    expect([...ALL_ART_SOURCES].sort()).toEqual(files.map((file) => `/art/${file}`).sort())
  })

  it('waits for decoded artwork and every font, and shares concurrent startup loads', async () => {
    const assets = await import('./preload-assets')
    const listener = vi.fn<() => void>()
    const unsubscribe = assets.subscribeAssetLoading(listener)
    const loading = assets.preloadAppAssets()
    expect(assets.preloadAppAssets()).toBe(loading)
    expect(requested.map((image) => image.src)).toEqual(ALL_ART_SOURCES)
    expect(loadFonts).toHaveBeenCalledTimes(5)

    requested.forEach((image) => image.resolve())
    const shared = await assets.loadArtImage(ALL_ART_SOURCES[0])
    expect(shared).toBe(requested[0])
    expect(assets.getAssetLoadingState().status).toBe('loading')
    resolveFonts([{} as FontFace])
    await loading
    expect(assets.getAssetLoadingState()).toEqual({
      status: 'ready',
      completed: ALL_ART_SOURCES.length + 5,
      total: ALL_ART_SOURCES.length + 5,
    })
    expect(listener).toHaveBeenCalled()
    unsubscribe()
    await assets.preloadAppAssets()
    expect(requested).toHaveLength(ALL_ART_SOURCES.length)
    expect(loadFonts).toHaveBeenCalledTimes(5)
  })

  it('retries failed images without downloading successful images or fonts again', async () => {
    const assets = await import('./preload-assets')
    const loading = assets.preloadAppAssets()
    requested[0].reject(new Error('Offline'))
    requested.slice(1).forEach((image) => image.resolve())
    resolveFonts([{} as FontFace])
    await loading
    expect(assets.getAssetLoadingState().status).toBe('error')

    const retry = assets.preloadAppAssets()
    expect(requested).toHaveLength(ALL_ART_SOURCES.length + 1)
    expect(requested.at(-1)?.src).toBe(ALL_ART_SOURCES[0])
    requested.at(-1)!.resolve()
    await retry
    expect(assets.getAssetLoadingState().status).toBe('ready')
    expect(loadFonts).toHaveBeenCalledTimes(5)
  })

  it('offers retry when a request stalls instead of leaving startup stuck', async () => {
    vi.useFakeTimers()
    const assets = await import('./preload-assets')
    const loading = assets.preloadAppAssets()
    requested.slice(1).forEach((image) => image.resolve())
    resolveFonts([{} as FontFace])
    await vi.advanceTimersByTimeAsync(30_000)
    await loading
    expect(assets.getAssetLoadingState().status).toBe('error')
    expect(requested[0].src).toBe('')
  })

  it('does not report ready if a declared font is unavailable', async () => {
    const assets = await import('./preload-assets')
    const loading = assets.preloadAppAssets()
    requested.forEach((image) => image.resolve())
    resolveFonts([])
    await loading
    expect(assets.getAssetLoadingState().status).toBe('error')

    loadFonts.mockResolvedValue([{} as FontFace])
    await assets.preloadAppAssets()
    expect(assets.getAssetLoadingState().status).toBe('ready')
    expect(requested).toHaveLength(ALL_ART_SOURCES.length)
  })
})
