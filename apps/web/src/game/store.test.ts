import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { adjacent, findMatches, findMove, swap, SIZE } from './engine'
import { getTileArt } from '../lib/art-assets'
import { MEDICINE_IDS } from './medicines'
import type { MedicineId } from './medicines'
import { FRUIT_KINDS } from './engine'
import * as engine from './engine'
import { useGameStore } from './store'
import { usePlayerSetup } from '../features/PlayerSetup/hooks/usePlayerSetup'
import { useDailyRewards } from '../features/DailyRewards/hooks/useDailyRewards'

const FIXTURE_KINDS = ['mercaptopurine', 'mint', 'gold', 'lavender', 'methotrexate'] as const

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
  vi.useFakeTimers()
  let seed = 2
  vi.spyOn(Math, 'random').mockImplementation(() => {
    seed = (seed * 1664525 + 1013904223) >>> 0
    return seed / 2 ** 32
  })
  usePlayerSetup.setState(usePlayerSetup.getInitialState(), true)
  useDailyRewards.setState({ days: [], prizes: [] })
  useGameStore.setState({ progress: { level: 1, losses: 0 }, sound: false, reducedMotion: false })
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
    expect(useDailyRewards.getState().days).toEqual([])
  })

  it('ends a Classic game when the target is reached, including on the final move', async () => {
    startScoreLevel()
    useGameStore.setState({ score: currentScoreTarget() - 50, moves: 1 })
    const pending = useGameStore.getState().trySwap(...findMove(useGameStore.getState().board)!)
    await vi.runAllTimersAsync()
    await pending
    expect(useGameStore.getState().outcome).toBe('won')
    expect(useGameStore.getState().moves).toBe(0)
    expect(useDailyRewards.getState().days).toHaveLength(1)
    expect(useDailyRewards.getState().days[0]?.level).toBe(2)
  })

  it('ends a Classic game below the target after the final move', async () => {
    startScoreLevel()
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
    expect(useDailyRewards.getState().days).toEqual([])
  })
})

describe('level progression', () => {
  it('earns a daily reward once across multiple wins and restarts on the same day', async () => {
    vi.spyOn(engine, 'collapse').mockImplementation(() => fixtureBoard())
    for (let attempt = 0; attempt < 2; attempt++) {
      const { goal } = useGameStore.getState().level
      if (goal.type === 'bears') {
        const board: engine.Board = fixtureBoard()
        board[26] = { ...board[26]!, special: 'bomb' }
        useGameStore.setState({ board, moves: 1 })
      } else {
        useGameStore.setState({ score: goal.target - 50, moves: 1 })
      }
      const move =
        goal.type === 'bears' ? ([26, 27] as const) : findMove(useGameStore.getState().board)!
      const pending = useGameStore.getState().trySwap(...move)
      await vi.runAllTimersAsync()
      await pending
      expect(useGameStore.getState().outcome).toBe('won')
      useGameStore.getState().nextLevel()
    }
    expect(useDailyRewards.getState().days).toHaveLength(1)
    expect(useDailyRewards.getState().days[0]?.level).toBe(1)
    useGameStore.getState().newGame()
    expect(useDailyRewards.getState().days).toHaveLength(1)
  })

  it('unlocks the next level once after a real win, then starts its own goal and move budget', async () => {
    useGameStore.setState({ progress: { level: 3, losses: 4 } })
    useGameStore.getState().newGame()
    useGameStore.setState({ score: currentScoreTarget() - 50, moves: 1 })
    const pending = useGameStore.getState().trySwap(...findMove(useGameStore.getState().board)!)
    await vi.runAllTimersAsync()
    await pending
    expect(useGameStore.getState()).toMatchObject({
      outcome: 'won',
      level: { number: 3 },
      progress: { level: 4, losses: 0 },
    })
    useGameStore.getState().nextLevel()
    const next = useGameStore.getState()
    expect(next).toMatchObject({
      outcome: 'playing',
      score: 0,
      moves: 24,
      level: { number: 4, goal: { type: 'bears' } },
    })
    expect(next.rescue?.covered.every(Boolean)).toBe(true)
    useGameStore.getState().nextLevel()
    expect(useGameStore.getState().board).toBe(next.board)
  })

  it('counts completed losses once and applies announced retry help only to the next attempt', async () => {
    vi.spyOn(engine, 'collapse').mockImplementation(() => fixtureBoard())
    for (let attempt = 1; attempt <= 2; attempt++) {
      const board = fixtureBoard()
      for (const index of [17, 18]) board[index] = { ...board[index]!, kind: 'mercaptopurine' }
      useGameStore.setState({ board, moves: 1 })
      const goal = useGameStore.getState().level.goal
      const pending = useGameStore.getState().trySwap(11, 19)
      await vi.runAllTimersAsync()
      await pending
      expect(useGameStore.getState()).toMatchObject({
        outcome: 'lost',
        moves: 0,
        progress: { level: 1, losses: attempt },
        level: { goal, bonusMoves: 0 },
      })
      await useGameStore.getState().trySwap(11, 19)
      useGameStore.getState().nextLevel()
      expect(useGameStore.getState().progress.losses).toBe(attempt)
      useGameStore.getState().newGame()
    }
    expect(useGameStore.getState()).toMatchObject({
      moves: 26,
      level: { number: 1, bonusMoves: 2 },
    })
    expect(useGameStore.getState().message).toContain('+2 moves')
    const goal = useGameStore.getState().level.goal
    useGameStore.getState().newGame()
    expect(useGameStore.getState()).toMatchObject({
      moves: 26,
      progress: { losses: 2 },
      level: { goal },
    })
  })

  it('preserves progression through medicine changes and Zen without leaking retry help into Zen', async () => {
    useGameStore.setState({ progress: { level: 10, losses: 6 } })
    useGameStore.getState().newGame()
    const fruitGoal = currentScoreTarget()
    useGameStore.getState().setMedicines(MEDICINE_IDS)
    expect(currentScoreTarget()).toBeLessThan(fruitGoal)
    expect(useGameStore.getState()).toMatchObject({
      moves: 28,
      level: { number: 10, bonusMoves: 6 },
    })
    useGameStore.getState().newGame('zen')
    useGameStore.setState({ score: 1000000 })
    const pending = useGameStore.getState().trySwap(...findMove(useGameStore.getState().board)!)
    await vi.runAllTimersAsync()
    await pending
    expect(useGameStore.getState()).toMatchObject({
      outcome: 'playing',
      progress: { level: 10, losses: 6 },
      level: { bonusMoves: 0 },
    })
    useGameStore.getState().nextLevel()
    expect(useGameStore.getState().mode).toBe('zen')
    useGameStore.getState().newGame('classic')
    expect(useGameStore.getState()).toMatchObject({
      moves: 28,
      level: { number: 10, bonusMoves: 6 },
    })
  })

  it('does not award progress or a loss when a resolving attempt is abandoned', async () => {
    useGameStore.setState({ score: 1000000, moves: 1 })
    const pending = useGameStore.getState().trySwap(...findMove(useGameStore.getState().board)!)
    useGameStore.getState().newGame()
    await vi.runAllTimersAsync()
    await pending
    expect(useGameStore.getState()).toMatchObject({
      outcome: 'playing',
      score: 0,
      progress: { level: 1, losses: 0 },
    })
  })

  it('saves the unlock immediately, without persisting the active board', async () => {
    startScoreLevel()
    useGameStore.setState({ score: currentScoreTarget() - 50 })
    const pending = useGameStore.getState().trySwap(...findMove(useGameStore.getState().board)!)
    await vi.runAllTimersAsync()
    await pending
    const saved = JSON.parse(localStorage.getItem('pillout-preferences')!)
    expect(saved.state.progress).toEqual({ level: 3, losses: 0 })
    expect(saved.state).not.toHaveProperty('board')
    useGameStore.setState({ progress: { level: 12, losses: 4 }, best: 123456 })
    const storage = localStorage.getItem('pillout-preferences')!
    useGameStore.setState({ progress: { level: 1, losses: 0 }, best: 0 })
    localStorage.setItem('pillout-preferences', storage)
    await useGameStore.persist.rehydrate()
    useGameStore.getState().newGame()
    expect(useGameStore.getState()).toMatchObject({
      best: 123456,
      score: 0,
      moves: 28,
      progress: { level: 12, losses: 4 },
      level: { number: 12 },
    })
  })

  it.each([
    { best: 4000, sound: true },
    { progress: { level: -2, losses: -5 } },
    { progress: { level: 1.5, losses: 'bad' }, board: [], mode: 'zen' },
  ])('restores old preferences and rejects invalid progress: %j', async (state) => {
    localStorage.setItem('pillout-preferences', JSON.stringify({ version: 0, state }))
    await useGameStore.persist.rehydrate()
    expect(useGameStore.getState()).toMatchObject({
      progress: { level: 1, losses: 0 },
      level: { number: 1 },
      mode: 'classic',
    })
    expect(useGameStore.getState().board).toHaveLength(64)
  })

  it('preserves preferences saved before levels existed', async () => {
    localStorage.setItem(
      'pillout-preferences',
      JSON.stringify({ version: 0, state: { best: 4000, sound: true, reducedMotion: true } }),
    )
    await useGameStore.persist.rehydrate()
    expect(useGameStore.getState()).toMatchObject({
      best: 4000,
      sound: true,
      reducedMotion: true,
      progress: { level: 1, losses: 0 },
    })
  })
})

function startScoreLevel() {
  useGameStore.setState({ progress: { level: 2, losses: 0 } })
  useGameStore.getState().newGame('classic')
}

function currentScoreTarget() {
  const { goal } = useGameStore.getState().level
  if (goal.type !== 'score') throw new Error('Expected score goal')
  return goal.target
}

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
    useGameStore.setState({ board, score: 0, moves: 1 })
    const pending = useGameStore.getState().trySwap(26, 27)
    await vi.runAllTimersAsync()
    await pending
    expect(useGameStore.getState()).toMatchObject({ moves: 0, outcome: 'won' })
  })
})

describe('game feel lifecycle', () => {
  it.each(['pointer', 'keyboard'] as const)(
    'keeps %s input attached to every wave of a move',
    async (input) => {
      const board = fixtureBoard()
      for (const index of [17, 18]) board[index] = { ...board[index]!, kind: 'mercaptopurine' }
      const cascade = fixtureBoard()
      for (const index of [27, 28, 29]) cascade[index] = { ...cascade[index]!, kind: 'gold' }
      vi.spyOn(engine, 'collapse')
        .mockReturnValueOnce(cascade)
        .mockImplementation(() => fixtureBoard())
      useGameStore.setState({ board })
      useGameStore.getState().select(11, input)
      useGameStore.getState().select(19, input)
      await vi.advanceTimersByTimeAsync(180)
      expect(useGameStore.getState().wave).toMatchObject({ combo: 1, input })
      await vi.advanceTimersByTimeAsync(480)
      expect(useGameStore.getState().wave).toMatchObject({ combo: 2, input })
      await vi.runAllTimersAsync()
      expect(useGameStore.getState()).toMatchObject({ phase: 'idle', moves: 23 })
    },
  )

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

describe('bear-rescue sessions', () => {
  it('ignores bonus score and loses with any bear cells still covered', async () => {
    vi.spyOn(engine, 'collapse').mockImplementation(() => fixtureBoard())
    const board = fixtureBoard()
    for (const index of [17, 18]) board[index] = { ...board[index]!, kind: 'mercaptopurine' }
    useGameStore.setState({ board, moves: 1, score: 1000000 })
    const pending = useGameStore.getState().trySwap(11, 19)
    await vi.runAllTimersAsync()
    await pending
    expect(useGameStore.getState()).toMatchObject({
      outcome: 'lost',
      rescue: { rescued: [] },
      progress: { level: 1, losses: 1 },
    })
    expect(useDailyRewards.getState().days).toEqual([])
  })

  it('uncovers a newly earned special cell without removing the special', async () => {
    const board = fixtureBoard()
    for (const index of [17, 18, 20]) board[index] = { ...board[index]!, kind: 'mercaptopurine' }
    useGameStore.setState({ board })
    const pending = useGameStore.getState().trySwap(11, 19)
    await vi.advanceTimersByTimeAsync(180)
    const state = useGameStore.getState()
    expect(state.rescue!.covered[19]).toBe(false)
    expect(state.rescue!.covered[16]).toBe(true)
    expect(state.board[19]!.special).toBe('hammer')
    useGameStore.getState().newGame()
    await vi.runAllTimersAsync()
    await pending
  })

  it('collects a bear once, wins below score thresholds on the final move, and unlocks the score level', async () => {
    vi.spyOn(engine, 'collapse').mockImplementation(() => fixtureBoard())
    const board: engine.Board = fixtureBoard()
    board[26] = { ...board[26]!, special: 'bomb' }
    useGameStore.setState({ board, moves: 1 })
    const pending = useGameStore.getState().trySwap(26, 27)
    await vi.advanceTimersByTimeAsync(180)
    expect(useGameStore.getState()).toMatchObject({
      rescue: { rescued: [27] },
      wave: { rescuedBears: [27] },
      score: 450,
    })
    await vi.runAllTimersAsync()
    await pending
    expect(useGameStore.getState()).toMatchObject({
      outcome: 'won',
      moves: 0,
      progress: { level: 2, losses: 0 },
    })
    expect(useGameStore.getState().rescue!.covered.filter(Boolean)).toHaveLength(55)
    useGameStore.getState().nextLevel()
    expect(useGameStore.getState()).toMatchObject({
      rescue: null,
      level: { goal: { type: 'score' } },
      score: 0,
    })
  })

  it('applies discoveries from cascades and preserves them through manual and automatic shuffles', async () => {
    const cascade = fixtureBoard()
    for (const index of [27, 28, 29]) cascade[index] = { ...cascade[index]!, kind: 'gold' }
    const dead = Array.from({ length: 64 }, (_, i) => ({
      id: `rescue-dead-${i}`,
      kind: FRUIT_KINDS[(Math.floor(i / 8) + (i % 8)) % 3]!,
    }))
    vi.spyOn(engine, 'collapse').mockReturnValueOnce(cascade).mockReturnValue(dead)
    const board = fixtureBoard()
    for (const index of [17, 18]) board[index] = { ...board[index]!, kind: 'mercaptopurine' }
    useGameStore.setState({ board })
    const pending = useGameStore.getState().trySwap(11, 19)
    await vi.advanceTimersByTimeAsync(1140)
    expect(useGameStore.getState().phase).toBe('shuffling')
    expect(useGameStore.getState().rescue!.covered[27]).toBe(false)
    const rescue = useGameStore.getState().rescue
    await vi.runAllTimersAsync()
    await pending
    expect(useGameStore.getState().rescue).toBe(rescue)
    const shuffle = useGameStore.getState().shuffle()
    await vi.runAllTimersAsync()
    await shuffle
    expect(useGameStore.getState().rescue).toBe(rescue)
  })

  it('resets discoveries on restart, medicine changes, and refresh without leaking rescue into Zen', async () => {
    const originalGoal = useGameStore.getState().level.goal
    const board: engine.Board = fixtureBoard()
    board[26] = { ...board[26]!, special: 'bomb' }
    useGameStore.setState({ board })
    const pending = useGameStore.getState().trySwap(26, 27)
    await vi.advanceTimersByTimeAsync(180)
    expect(useGameStore.getState().rescue!.rescued).toEqual([27])
    useGameStore.getState().setMedicines(['dasatinib'])
    const fresh = useGameStore.getState().rescue
    await vi.runAllTimersAsync()
    await pending
    expect(useGameStore.getState().rescue).toBe(fresh)
    expect(fresh!.covered.every(Boolean)).toBe(true)
    expect(useGameStore.getState().level.goal).toEqual(originalGoal)
    const saved = JSON.parse(localStorage.getItem('pillout-preferences')!)
    expect(saved.state).not.toHaveProperty('rescue')
    useGameStore.getState().newGame('zen')
    expect(useGameStore.getState().rescue).toBeNull()
    useGameStore.getState().newGame('classic')
    await useGameStore.persist.rehydrate()
    expect(useGameStore.getState().rescue!.covered.every(Boolean)).toBe(true)
    expect(useGameStore.getState().rescue!.rescued).toEqual([])
  })
})
