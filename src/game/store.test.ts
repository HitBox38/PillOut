import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { adjacent, findMatches, findMove, swap } from './engine'

let useGameStore: typeof import('./store').useGameStore

beforeAll(async () => {
  const memory = new Map<string, string>()
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => memory.get(key) ?? null,
    setItem: (key: string, value: string) => memory.set(key, value),
    removeItem: (key: string) => memory.delete(key),
  })
  ;({ useGameStore } = await import('./store'))
})
beforeEach(() => {
  vi.useFakeTimers()
  let seed = 2
  vi.spyOn(Math, 'random').mockImplementation(() => {
    seed = (seed * 1664525 + 1013904223) >>> 0
    return seed / 2 ** 32
  })
  useGameStore.getState().newGame('classic')
})
afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('game session', () => {
  it('reverts invalid swaps without charging a move', async () => {
    const board = useGameStore.getState().board
    let invalid: [number, number] | undefined
    for (let i = 0; i < 63 && !invalid; i++)
      if (adjacent(i, i + 1) && !findMatches(swap(board, i, i + 1)).length) invalid = [i, i + 1]
    const pending = useGameStore.getState().trySwap(...invalid!)
    await vi.runAllTimersAsync()
    await pending
    expect(useGameStore.getState().board).toBe(board)
    expect(useGameStore.getState().moves).toBe(24)
    expect(useGameStore.getState().phase).toBe('idle')
  })

  it('resolves matches, scores cascades, and charges exactly one move', async () => {
    const move = findMove(useGameStore.getState().board)!
    const pending = useGameStore.getState().trySwap(...move)
    await vi.runAllTimersAsync()
    await pending
    const state = useGameStore.getState()
    expect(state.moves).toBe(23)
    expect(state.score).toBeGreaterThanOrEqual(150)
    expect(state.best).toBeGreaterThanOrEqual(state.score)
    expect(state.cleared).toBeGreaterThanOrEqual(3)
    expect(state.phase).toBe('idle')
    expect(findMatches(state.board)).toEqual([])
  })

  it('prevents an older animation from overwriting a restarted session', async () => {
    const pending = useGameStore.getState().trySwap(...findMove(useGameStore.getState().board)!)
    useGameStore.getState().newGame()
    const board = useGameStore.getState().board
    await vi.runAllTimersAsync()
    await pending
    expect(useGameStore.getState().board).toBe(board)
    expect(useGameStore.getState().score).toBe(0)
    expect(useGameStore.getState().moves).toBe(24)
  })

  it('blocks overlapping moves and paused input', async () => {
    const [a, b] = findMove(useGameStore.getState().board)!
    const pending = useGameStore.getState().trySwap(a, b)
    await useGameStore.getState().trySwap(a, b)
    await vi.runAllTimersAsync()
    await pending
    expect(useGameStore.getState().moves).toBe(23)
    useGameStore.getState().togglePause()
    const board = useGameStore.getState().board
    await useGameStore.getState().trySwap(...findMove(board)!)
    useGameStore.getState().shuffle()
    expect(useGameStore.getState().board).toBe(board)
  })

  it('keeps Zen mode unlimited', async () => {
    useGameStore.getState().newGame('zen')
    const pending = useGameStore.getState().trySwap(...findMove(useGameStore.getState().board)!)
    await vi.runAllTimersAsync()
    await pending
    expect(useGameStore.getState().moves).toBe(24)
    expect(useGameStore.getState().outcome).toBe('playing')
  })

  it('ends a Classic game when the target is reached, including on the final move', async () => {
    useGameStore.setState({ score: 1950, moves: 1 })
    const pending = useGameStore.getState().trySwap(...findMove(useGameStore.getState().board)!)
    await vi.runAllTimersAsync()
    await pending
    expect(useGameStore.getState().outcome).toBe('won')
    expect(useGameStore.getState().moves).toBe(0)
  })

  it('ends a Classic game below the target after the final move', async () => {
    useGameStore.setState({ score: 0, moves: 1 })
    const pending = useGameStore.getState().trySwap(...findMove(useGameStore.getState().board)!)
    await vi.runAllTimersAsync()
    await pending
    expect(useGameStore.getState().outcome).toBe('lost')
    expect(useGameStore.getState().moves).toBe(0)
  })
})
