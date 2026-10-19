import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  adjacent,
  collapse,
  createBoard,
  findMove,
  resolveBoard,
  swap,
  shuffleBoard,
  FRUIT_KINDS,
  getLevelConfig,
  createRescue,
  resolveRescue,
  goalReached,
} from './engine'
import type { Board, Kind, LevelConfig, Move, RescueState } from './engine'
import { MEDICINE_IDS } from './medicines'
import type { MedicineId } from './medicines'
import { playGameSound, stopGameSounds } from './audio'
import {
  CLEAR_DURATION,
  SHUFFLE_DURATION,
  REDUCED_SHUFFLE_DURATION,
  systemReducesMotion,
} from './effects'
import type { ClearWave, BoardRemix, GameInput } from './effects'
import { useDailyRewards } from '@/features/DailyRewards/hooks/useDailyRewards'

export type Mode = 'classic' | 'zen'
type Phase = 'idle' | 'swapping' | 'clearing' | 'falling' | 'shuffling'
type Outcome = 'playing' | 'won' | 'lost'
interface Progress {
  level: number
  losses: number
}

interface GameState {
  board: Board
  kinds: readonly Kind[]
  level: LevelConfig
  rescue: RescueState | null
  progress: Progress
  score: number
  best: number
  moves: number
  combo: number
  cleared: number
  selected: number | null
  hint: Move | null
  clearing: number[]
  phase: Phase
  outcome: Outcome
  paused: boolean
  mode: Mode
  sound: boolean
  reducedMotion: boolean
  message: string
  session: number
  wave: ClearWave | null
  remix: BoardRemix | null
  select: (index: number, input?: GameInput) => void
  trySwap: (a: number, b: number, input?: GameInput) => Promise<void>
  newGame: (mode?: Mode) => void
  nextLevel: () => void
  setMedicines: (medicines: readonly MedicineId[]) => void
  showHint: () => void
  shuffle: () => Promise<void>
  togglePause: () => void
  setSound: (value: boolean) => void
  setReducedMotion: (value: boolean) => void
}

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))
let nextEffect = 0

function roundConfig(progress: Progress, kinds: readonly Kind[], mode: Mode) {
  const level = getLevelConfig(
    progress.level,
    kinds.length,
    mode === 'classic' ? progress.losses : 0,
  )
  return {
    level,
    rescue: mode === 'classic' ? createRescue(level.goal) : null,
    moves: level.moves,
    message:
      mode === 'zen'
        ? 'No move limit. Just you and the colors.'
        : `Level ${level.number} · ${level.label}. ${level.tip}${level.bonusMoves ? ` Retry help: +${level.bonusMoves} moves.` : ''}`,
  }
}

function restoreProgress(value: unknown): Progress {
  if (!value || typeof value !== 'object') return { level: 1, losses: 0 }
  const progress = value as Partial<Progress>
  return {
    level:
      Number.isSafeInteger(progress.level) &&
      progress.level! > 0 &&
      progress.level! < Number.MAX_SAFE_INTEGER - 1
        ? progress.level!
        : 1,
    losses:
      Number.isInteger(progress.losses) && progress.losses! >= 0
        ? Math.min(6, progress.losses!)
        : 0,
  }
}

async function remixBoard(
  set: (state: Partial<GameState>) => void,
  get: () => GameState,
  message: string,
) {
  const state = get()
  set({
    board: shuffleBoard(state.board, Math.random, state.kinds),
    remix: { id: ++nextEffect, startedAt: Date.now(), previous: state.board },
    phase: 'shuffling',
    selected: null,
    hint: null,
    combo: 0,
    wave: null,
    message,
  })
  if (get().sound) playGameSound('shuffle')
  await delay(
    state.reducedMotion || systemReducesMotion() ? REDUCED_SHUFFLE_DURATION : SHUFFLE_DURATION,
  )
  if (get().session === state.session) set({ phase: 'idle', remix: null })
}

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      board: createBoard(),
      kinds: FRUIT_KINDS,
      progress: { level: 1, losses: 0 },
      ...roundConfig({ level: 1, losses: 0 }, FRUIT_KINDS, 'classic'),
      score: 0,
      best: 0,
      combo: 0,
      cleared: 0,
      selected: null,
      hint: null,
      clearing: [],
      phase: 'idle',
      outcome: 'playing',
      paused: false,
      mode: 'classic',
      sound: false,
      reducedMotion: false,
      session: 0,
      wave: null,
      remix: null,
      setMedicines: (medicines) => {
        const kinds = [...FRUIT_KINDS, ...MEDICINE_IDS.filter((id) => medicines.includes(id))]
        if (
          kinds.length === get().kinds.length &&
          kinds.every((kind, i) => get().kinds[i] === kind)
        )
          return
        set({ kinds })
        get().newGame()
      },
      newGame: (mode = get().mode) => {
        stopGameSounds()
        set({
          board: createBoard(Math.random, get().kinds),
          ...roundConfig(get().progress, get().kinds, mode),
          score: 0,
          combo: 0,
          cleared: 0,
          selected: null,
          hint: null,
          clearing: [],
          phase: 'idle',
          outcome: 'playing',
          paused: false,
          mode,
          session: get().session + 1,
          wave: null,
          remix: null,
        })
      },
      nextLevel: () => {
        if (get().mode !== 'classic' || get().outcome !== 'won') return
        get().newGame('classic')
      },
      select: (index, input = 'keyboard') => {
        const state = get()
        if (
          index < 0 ||
          index >= state.board.length ||
          state.phase !== 'idle' ||
          state.paused ||
          state.outcome !== 'playing'
        )
          return
        if (state.selected === index) set({ selected: null })
        else if (state.selected !== null && adjacent(state.selected, index))
          void get().trySwap(state.selected, index, input)
        else set({ selected: index, hint: null })
      },
      trySwap: async (a, b, input = 'keyboard') => {
        const state = get()
        if (
          state.phase !== 'idle' ||
          state.paused ||
          state.outcome !== 'playing' ||
          !adjacent(a, b)
        )
          return
        const session = state.session
        const wait = (ms: number) => delay(get().reducedMotion || systemReducesMotion() ? 0 : ms)
        let board = swap(state.board, a, b)
        set({ board, phase: 'swapping', selected: null, hint: null, combo: 0, wave: null })
        await wait(180)
        if (get().session !== session) return
        let resolution = resolveBoard(board, [a, b])
        if (!resolution.clearing.length) {
          set({ board: state.board, message: 'Almost! Try lining up three of one color.' })
          await wait(180)
          if (get().session === session) set({ phase: 'idle' })
          return
        }
        set({ moves: state.mode === 'zen' ? state.moves : state.moves - 1 })
        let combo = 0
        while (resolution.clearing.length) {
          combo++
          const points = (resolution.clearing.length + resolution.created.length) * 50 * combo
          board = resolution.board
          const scoreBefore = get().score
          const score = scoreBefore + points
          const rescue = resolveRescue(state.level.goal, get().rescue, resolution)
          const previouslyRescued = new Set(get().rescue?.rescued)
          const rescuedBears =
            rescue?.rescued.filter((origin) => !previouslyRescued.has(origin)) ?? []
          const collected = (rescue?.rescued.length ?? 0) - (get().rescue?.rescued.length ?? 0)
          set({
            board,
            phase: 'clearing',
            clearing: resolution.clearing,
            combo,
            score,
            rescue,
            best: Math.max(get().best, score),
            cleared: get().cleared + resolution.clearing.length,
            wave: {
              id: ++nextEffect,
              startedAt: Date.now(),
              combo,
              points,
              scoreBefore,
              scoreAfter: score,
              clearing: resolution.clearing,
              created: resolution.created,
              activations: resolution.activations,
              rescuedBears,
              input,
            },
            message:
              collected > 0
                ? `Bear rescued! ${rescue!.rescued.length} of ${state.level.goal.type === 'bears' ? state.level.goal.bears.length : 0} saved. +${points} points.`
                : resolution.activated.length
                  ? `${[...new Set(resolution.activated)].map((special) => special[0]!.toUpperCase() + special.slice(1)).join(' + ')}! +${points} points.`
                  : resolution.created.length
                    ? `Special tile earned! +${points} points. Swap it with a neighbor!`
                    : combo > 1
                      ? `${combo}× cascade! +${points} points. Keep that flow.`
                      : `Nice match! +${points} points.`,
          })
          if (get().sound)
            playGameSound(
              resolution.activated[0] ?? (resolution.created.length ? 'earned' : 'match'),
              combo,
            )
          await wait(CLEAR_DURATION)
          if (get().session !== session) return
          board = collapse(board, resolution.clearing, Math.random, state.kinds)
          set({ board, clearing: [], phase: 'falling' })
          await wait(260)
          if (get().session !== session) return
          resolution = resolveBoard(board)
        }
        const outcome =
          get().mode === 'zen'
            ? 'playing'
            : goalReached(state.level.goal, get().score, get().rescue)
              ? 'won'
              : get().moves <= 0
                ? 'lost'
                : 'playing'
        if (outcome === 'playing' && !findMove(board)) {
          await remixBoard(set, get, 'A fresh mix to keep you moving. No moves used.')
          return
        }
        set({
          board,
          phase: 'idle',
          outcome,
          ...(state.mode === 'classic' && state.level.number === get().progress.level
            ? outcome === 'won'
              ? { progress: { level: state.level.number + 1, losses: 0 } }
              : outcome === 'lost'
                ? {
                    progress: { ...get().progress, losses: Math.min(6, get().progress.losses + 1) },
                  }
                : {}
            : {}),
        })
        if (outcome === 'won') {
          useDailyRewards.getState().recordWin(state.level.number)
          if (get().sound) playGameSound('win')
        }
      },
      showHint: () => {
        if (get().phase !== 'idle' || get().paused || get().outcome !== 'playing') return
        set({
          hint: findMove(get().board),
          selected: null,
          message: 'A little nudge. Swap the two highlighted tiles.',
        })
      },
      shuffle: async () => {
        if (get().phase !== 'idle' || get().paused || get().outcome !== 'playing') return
        await remixBoard(set, get, 'New mix, same good energy. No moves used.')
      },
      togglePause: () => set((state) => ({ paused: !state.paused, selected: null })),
      setSound: (sound) => {
        if (!sound) stopGameSounds()
        set({ sound })
      },
      setReducedMotion: (reducedMotion) => set({ reducedMotion }),
    }),
    {
      name: 'pillout-preferences',
      partialize: ({ best, sound, reducedMotion, progress }) => ({
        best,
        sound,
        reducedMotion,
        progress,
      }),
      merge: (persisted, current) => {
        const saved = persisted as Partial<GameState> | null
        const progress = restoreProgress(saved?.progress)
        return {
          ...current,
          best:
            typeof saved?.best === 'number' && Number.isFinite(saved.best) && saved.best >= 0
              ? saved.best
              : current.best,
          sound: typeof saved?.sound === 'boolean' ? saved.sound : current.sound,
          reducedMotion:
            typeof saved?.reducedMotion === 'boolean' ? saved.reducedMotion : current.reducedMotion,
          progress,
          ...roundConfig(progress, current.kinds, current.mode),
        }
      },
    },
  ),
)
