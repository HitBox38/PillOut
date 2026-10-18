import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { adjacent, findMatches, findMove, swap, SIZE } from './engine'
import { getTileArt } from '../lib/art-assets'
import { MEDICINE_IDS } from './medicines'
import type { MedicineId } from './medicines'
import { FRUIT_KINDS } from './engine'
import * as engine from './engine'

let useGameStore: typeof import('./store').useGameStore
let usePlayerSetup: typeof import('../features/PlayerSetup/hooks/usePlayerSetup').usePlayerSetup
const FIXTURE_KINDS = ['mercaptopurine', 'mint', 'gold', 'lavender', 'methotrexate'] as const

beforeAll(async () => {
  const memory = new Map<string, string>()
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => memory.get(key) ?? null,
    setItem: (key: string, value: string) => memory.set(key, value),
    removeItem: (key: string) => memory.delete(key),
  })
  ;({ useGameStore } = await import('./store'))
  ;({ usePlayerSetup } = await import('../features/PlayerSetup/hooks/usePlayerSetup'))
})
beforeEach(() => {
  vi.useFakeTimers()
  let seed = 2
  vi.spyOn(Math, 'random').mockImplementation(() => {
    seed = (seed * 1664525 + 1013904223) >>> 0
    return seed / 2 ** 32
  })
  usePlayerSetup.setState(usePlayerSetup.getInitialState(), true)
  useGameStore.getState().setMedicines([])
  useGameStore.getState().newGame('classic')
})
afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('game session', () => {
  it('uses the selected medicine artwork when starting a game', () => {
    usePlayerSetup.getState().togglePill('dasatinib')
    useGameStore.getState().newGame()
    const medicines = useGameStore
      .getState()
      .board.map(getTileArt)
      .filter((art) => art.source === 'pills')
    expect(medicines.length).toBeGreaterThan(0)
    expect(new Set(medicines.map((art) => art.label))).toEqual(new Set(['Dasatinib']))
  })

  it.each([
    { name: 'no medicines', selection: [] },
    { name: 'one medicine', selection: ['dasatinib'] },
    { name: 'two medicines', selection: ['thioguanine', 'etoposide'] },
    { name: 'all medicines', selection: MEDICINE_IDS },
  ] satisfies { name: string; selection: readonly MedicineId[] }[])(
    'keeps the selected pool through refills, shuffles, and restarts: $name',
    async ({ selection }) => {
      for (const id of selection) usePlayerSetup.getState().togglePill(id)
      useGameStore.getState().newGame('zen')
      const allowed = new Set<string>([...FRUIT_KINDS, ...selection])
      const expectAllowedBoard = () => {
        const board = useGameStore.getState().board
        expect(board.every((tile) => tile.special || allowed.has(tile.kind))).toBe(true)
        expect(findMatches(board)).toEqual([])
        expect(findMove(board)).not.toBeNull()
      }
      expectAllowedBoard()
      const originalIds = new Set(useGameStore.getState().board.map((tile) => tile.id))
      const pending = useGameStore.getState().trySwap(...findMove(useGameStore.getState().board)!)
      await vi.runAllTimersAsync()
      await pending
      expect(useGameStore.getState().board.some((tile) => !originalIds.has(tile.id))).toBe(true)
      expectAllowedBoard()
      useGameStore.getState().shuffle()
      expectAllowedBoard()
      useGameStore.getState().newGame('classic')
      expectAllowedBoard()
    },
  )

  it('removes deselected medicines immediately and cancels an old round mid-animation', async () => {
    const setup = usePlayerSetup.getState()
    setup.togglePill('mercaptopurine')
    const pending = useGameStore.getState().trySwap(...findMove(useGameStore.getState().board)!)
    setup.togglePill('mercaptopurine')
    setup.togglePill('temozolomide')
    const freshBoard = useGameStore.getState().board
    await vi.runAllTimersAsync()
    await pending
    expect(useGameStore.getState().board).toBe(freshBoard)
    expect(useGameStore.getState()).toMatchObject({ moves: 24, score: 0, phase: 'idle' })
    expect(freshBoard.some((tile) => tile.kind === 'temozolomide')).toBe(true)
    expect(freshBoard.some((tile) => tile.kind === 'mercaptopurine')).toBe(false)
  })

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
    const board = fixtureBoard()
    for (const index of [17, 18]) board[index] = { ...board[index]!, kind: 'mercaptopurine' }
    let next = 0
    vi.mocked(Math.random).mockImplementation(() => ((next++ % 3) + 0.1) / 3)
    useGameStore.setState({ board, score: 0, moves: 1 })
    const pending = useGameStore.getState().trySwap(11, 19)
    await vi.runAllTimersAsync()
    await pending
    expect(useGameStore.getState().outcome).toBe('lost')
    expect(useGameStore.getState().moves).toBe(0)
    expect(useGameStore.getState().score).toBe(150)
  })
})

function fixtureBoard() {
  return Array.from({ length: SIZE * SIZE }, (_, i) => ({
    id: `session-fixture-${i}`,
    kind: FIXTURE_KINDS[(Math.floor(i / SIZE) * 2 + (i % SIZE)) % FIXTURE_KINDS.length]!,
  }))
}

describe('special tile sessions', () => {
  it('earns a hammer from a real swap and retains it after gravity', async () => {
    const board = fixtureBoard()
    for (const index of [17, 18, 20]) board[index] = { ...board[index]!, kind: 'mercaptopurine' }
    useGameStore.setState({ board })
    const pending = useGameStore.getState().trySwap(11, 19)
    await vi.advanceTimersByTimeAsync(180)
    expect(useGameStore.getState().score).toBe(200)
    expect(useGameStore.getState().board[19]!.special).toBe('hammer')
    await vi.runAllTimersAsync()
    await pending
    expect(useGameStore.getState().moves).toBe(23)
    expect(useGameStore.getState().board.some((tile) => tile.special === 'hammer')).toBe(true)
    expect(findMatches(useGameStore.getState().board)).toEqual([])
  })

  it('charges one move and scores overlapping chained effects once per tile', async () => {
    const board: import('./engine').Board = fixtureBoard()
    board[26] = { ...board[26]!, special: 'bomb' }
    board[28] = { ...board[28]!, special: 'hammer', axis: 'column' }
    board[36] = { ...board[36]!, special: 'bomb' }
    useGameStore.setState({ board })
    const pending = useGameStore.getState().trySwap(26, 27)
    await vi.advanceTimersByTimeAsync(180)
    expect(useGameStore.getState()).toMatchObject({
      moves: 23,
      score: 900,
      cleared: 18,
      phase: 'clearing',
    })
    await vi.runAllTimersAsync()
    await pending
    expect(useGameStore.getState().phase).toBe('idle')
    expect(useGameStore.getState().moves).toBe(23)
    expect(findMatches(useGameStore.getState().board)).toEqual([])
  })

  it('keeps special activation unlimited in Zen and honors restart cancellation mid-blast', async () => {
    useGameStore.getState().newGame('zen')
    const board: import('./engine').Board = fixtureBoard()
    board[26] = { ...board[26]!, special: 'bomb' }
    useGameStore.setState({ board })
    const pending = useGameStore.getState().trySwap(26, 27)
    await vi.advanceTimersByTimeAsync(180)
    expect(useGameStore.getState().moves).toBe(24)
    expect(useGameStore.getState().score).toBe(450)
    useGameStore.getState().newGame('classic')
    const fresh = useGameStore.getState().board
    await vi.runAllTimersAsync()
    await pending
    expect(useGameStore.getState().board).toBe(fresh)
    expect(useGameStore.getState()).toMatchObject({ moves: 24, score: 0, phase: 'idle' })
  })

  it('lets a special activation win on the final Classic move', async () => {
    const board: import('./engine').Board = fixtureBoard()
    board[26] = { ...board[26]!, special: 'bomb' }
    useGameStore.setState({ board, score: 1900, moves: 1 })
    const pending = useGameStore.getState().trySwap(26, 27)
    await vi.runAllTimersAsync()
    await pending
    expect(useGameStore.getState()).toMatchObject({ moves: 0, outcome: 'won' })
  })
})

describe('game feel lifecycle', () => {
  it('animates an automatic dead-board remix through the same input lock', async () => {
    const dead = Array.from({ length: 64 }, (_, i) => ({
      id: `dead-${i}`,
      kind: FRUIT_KINDS[(Math.floor(i / 8) + (i % 8)) % 3]!,
    }))
    expect(findMove(dead)).toBeNull()
    vi.spyOn(engine, 'collapse').mockReturnValue(dead)
    const board = fixtureBoard()
    for (const index of [17, 18]) board[index] = { ...board[index]!, kind: 'mercaptopurine' }
    useGameStore.setState({ board, reducedMotion: false })
    const pending = useGameStore.getState().trySwap(11, 19)
    await vi.advanceTimersByTimeAsync(660)
    expect(useGameStore.getState()).toMatchObject({ phase: 'shuffling', moves: 23 })
    expect(useGameStore.getState().remix?.previous).toBe(dead)
    await vi.advanceTimersByTimeAsync(480)
    await pending
    expect(useGameStore.getState()).toMatchObject({ phase: 'idle', remix: null, moves: 23 })
    expect(findMove(useGameStore.getState().board)).not.toBeNull()
  })

  it('respects the system reduced-motion preference without an in-app override', async () => {
    const previous = globalThis.window
    vi.stubGlobal('window', { matchMedia: () => ({ matches: true }) })
    try {
      useGameStore.getState().setReducedMotion(false)
      const pending = useGameStore.getState().shuffle()
      await vi.advanceTimersByTimeAsync(120)
      await pending
      expect(useGameStore.getState().phase).toBe('idle')
    } finally {
      vi.stubGlobal('window', previous)
    }
  })

  it('pins specials, blocks overlapping input, and returns control exactly at 480ms', async () => {
    const board: import('./engine').Board = fixtureBoard()
    board[27] = { ...board[27]!, special: 'crown' }
    useGameStore.setState({ board, reducedMotion: false })
    const pending = useGameStore.getState().shuffle()
    const mixed = useGameStore.getState().board
    expect(mixed[27]).toBe(board[27])
    expect(useGameStore.getState()).toMatchObject({ phase: 'shuffling', moves: 24, score: 0 })
    expect(useGameStore.getState().remix?.previous).toBe(board)
    await useGameStore.getState().shuffle()
    await useGameStore.getState().trySwap(...findMove(mixed)!)
    useGameStore.getState().select(0)
    expect(useGameStore.getState().board).toBe(mixed)
    expect(useGameStore.getState().selected).toBeNull()
    await vi.advanceTimersByTimeAsync(479)
    expect(useGameStore.getState().phase).toBe('shuffling')
    await vi.advanceTimersByTimeAsync(1)
    await pending
    expect(useGameStore.getState()).toMatchObject({ phase: 'idle', remix: null, moves: 24 })
    useGameStore.getState().select(0)
    expect(useGameStore.getState().selected).toBe(0)
  })

  it('cancels an old shuffle when the medicine pool starts a fresh session', async () => {
    const pending = useGameStore.getState().shuffle()
    useGameStore.getState().setMedicines(['dasatinib'])
    const fresh = useGameStore.getState().board
    const move = findMove(fresh)!
    const swapPending = useGameStore.getState().trySwap(...move)
    await vi.advanceTimersByTimeAsync(480)
    expect(useGameStore.getState().phase).not.toBe('idle')
    await vi.runAllTimersAsync()
    await Promise.all([pending, swapPending])
    expect(useGameStore.getState().moves).toBe(23)
    expect(useGameStore.getState().remix).toBeNull()
  })

  it('uses a short stationary shuffle for reduced motion', async () => {
    useGameStore.getState().setReducedMotion(true)
    const pending = useGameStore.getState().shuffle()
    await vi.advanceTimersByTimeAsync(119)
    expect(useGameStore.getState().phase).toBe('shuffling')
    await vi.advanceTimersByTimeAsync(1)
    await pending
    expect(useGameStore.getState().phase).toBe('idle')
    useGameStore.getState().setReducedMotion(false)
  })

  it('publishes the actual earned tile and clear origins without changing scoring', async () => {
    const board = fixtureBoard()
    for (const index of [17, 18, 20]) board[index] = { ...board[index]!, kind: 'mercaptopurine' }
    useGameStore.setState({ board })
    const pending = useGameStore.getState().trySwap(11, 19)
    await vi.advanceTimersByTimeAsync(180)
    expect(useGameStore.getState().wave).toMatchObject({
      combo: 1,
      points: 200,
      scoreBefore: 0,
      scoreAfter: 200,
      clearing: [17, 18, 20],
      created: [19],
      activations: [],
    })
    useGameStore.getState().newGame()
    await vi.runAllTimersAsync()
    await pending
    expect(useGameStore.getState()).toMatchObject({ wave: null, remix: null, score: 0 })
  })
})
