import { ALL_ART_SOURCES } from './art-assets'

const FONT_FACES = [
  '400 16px "DM Sans"',
  '500 16px "DM Sans"',
  '600 16px "DM Sans"',
  '700 16px "DM Sans"',
  '700 16px "Fredoka"',
]
const LOAD_TIMEOUT = 30_000
const images = new Map<string, Promise<HTMLImageElement>>()
const fonts = new Map<string, Promise<FontFace[]>>()
const listeners = new Set<() => void>()
let pending: Promise<void> | undefined
let state = {
  status: 'loading' as 'loading' | 'ready' | 'error',
  completed: 0,
  total: ALL_ART_SOURCES.length + FONT_FACES.length,
}

function update(next: typeof state) {
  state = next
  listeners.forEach((listener) => listener())
}

function withTimeout<T>(promise: Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Asset loading timed out')), LOAD_TIMEOUT)
    promise.then(resolve, reject).finally(() => clearTimeout(timeout))
  })
}

/** Retain decoded images so HTML and Pixi share the same download and image source. */
export function loadArtImage(src: string): Promise<HTMLImageElement> {
  const cached = images.get(src)
  if (cached) return cached
  const image = new Image()
  image.src = src
  const loading = withTimeout(image.decode())
    .then(() => image)
    .catch((cause: unknown) => {
      images.delete(src)
      image.removeAttribute('src')
      throw cause
    })
  images.set(src, loading)
  return loading
}

function loadFont(face: string) {
  const cached = fonts.get(face)
  if (cached) return cached
  const loading = withTimeout(document.fonts.load(face))
    .then((loaded) => {
      if (loaded.length === 0) throw new Error(`Font unavailable: ${face}`)
      return loaded
    })
    .catch((cause: unknown) => {
      fonts.delete(face)
      throw cause
    })
  fonts.set(face, loading)
  return loading
}

export const getAssetLoadingState = () => state
export function subscribeAssetLoading(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** One startup load, including under StrictMode. Retry only resources that failed. */
export function preloadAppAssets(): Promise<void> {
  if (pending) return pending
  update({ ...state, status: 'loading', completed: 0 })
  const tasks = [...ALL_ART_SOURCES.map(loadArtImage), ...FONT_FACES.map(loadFont)]
  pending = Promise.allSettled(
    tasks.map(async (task) => {
      await task
      update({ ...state, completed: state.completed + 1 })
    }),
  ).then((results) => {
    const failed = results.some((result) => result.status === 'rejected')
    if (failed) pending = undefined
    update({ ...state, status: failed ? 'error' : 'ready' })
  })
  return pending
}
