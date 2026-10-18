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
} from './engine'
import type { Board, Kind, Move } from './engine'
import { MEDICINE_IDS } from './medicines'
import type { MedicineId } from './medicines'
import { playTone } from './audio'

export const TARGET = 2000
export const START_MOVES = 24
export type Mode = 'classic' | 'zen'
type Phase = 'idle' | 'swapping' | 'clearing' | 'falling'
type Outcome = 'playing' | 'won' | 'lost'

interface GameState {
  board: Board
  kinds: readonly Kind[]
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
  select: (index: number) => void
  trySwap: (a: number, b: number) => Promise<void>
  newGame: (mode?: Mode) => void
  setMedicines: (medicines: readonly MedicineId[]) => void
  showHint: () => void
  shuffle: () => void
  togglePause: () => void
  setSound: (value: boolean) => void
  setReducedMotion: (value: boolean) => void
}

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      board: createBoard(),
      kinds: FRUIT_KINDS,
      score: 0,
      best: 0,
      moves: START_MOVES,
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
      message: 'A fresh board. A fresh start.',
      session: 0,
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
      newGame: (mode = get().mode) =>
        set({
          board: createBoard(Math.random, get().kinds),
          score: 0,
          moves: START_MOVES,
          combo: 0,
          cleared: 0,
          selected: null,
          hint: null,
          clearing: [],
          phase: 'idle',
          outcome: 'playing',
          paused: false,
          mode,
          message:
            mode === 'zen'
              ? 'No move limit. Just you and the colors.'
              : 'A fresh board. A fresh start.',
          session: get().session + 1,
        }),
      select: (index) => {
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
          void get().trySwap(state.selected, index)
        else set({ selected: index, hint: null })
      },
      trySwap: async (a, b) => {
        const state = get()
        if (
          state.phase !== 'idle' ||
          state.paused ||
          state.outcome !== 'playing' ||
          !adjacent(a, b)
        )
          return
        const session = state.session
        const wait = (ms: number) => delay(get().reducedMotion ? 0 : ms)
        let board = swap(state.board, a, b)
        set({ board, phase: 'swapping', selected: null, hint: null, combo: 0 })
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
          const score = get().score + points
          set({
            board,
            phase: 'clearing',
            clearing: resolution.clearing,
            combo,
            score,
            best: Math.max(get().best, score),
            cleared: get().cleared + resolution.clearing.length,
            message: resolution.activated.length
              ? `${[...new Set(resolution.activated)].map((special) => special[0]!.toUpperCase() + special.slice(1)).join(' + ')}! +${points} points.`
              : resolution.created.length
                ? `Special tile earned! +${points} points. Swap it with a neighbor!`
                : combo > 1
                  ? `${combo}× cascade! +${points} points. Keep that flow.`
                  : `Nice match! +${points} points.`,
          })
          if (get().sound) playTone(combo)
          await wait(220)
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
            : get().score >= TARGET
              ? 'won'
              : get().moves <= 0
                ? 'lost'
                : 'playing'
        if (outcome === 'playing' && !findMove(board)) {
          board = shuffleBoard(board, Math.random, state.kinds)
          set({ message: 'A fresh mix to keep you moving. No moves used.' })
        }
        set({ board, phase: 'idle', outcome })
      },
      showHint: () => {
        if (get().phase !== 'idle' || get().paused || get().outcome !== 'playing') return
        set({
          hint: findMove(get().board),
          selected: null,
          message: 'A little nudge. Swap the two highlighted tiles.',
        })
      },
      shuffle: () => {
        if (get().phase !== 'idle' || get().paused || get().outcome !== 'playing') return
        set({
          board: shuffleBoard(get().board, Math.random, get().kinds),
          hint: null,
          selected: null,
          combo: 0,
          message: 'New mix, same good energy. No moves used.',
        })
      },
      togglePause: () => set((state) => ({ paused: !state.paused, selected: null })),
      setSound: (sound) => set({ sound }),
      setReducedMotion: (reducedMotion) => set({ reducedMotion }),
    }),
    {
      name: 'pillout-preferences',
      partialize: ({ best, sound, reducedMotion }) => ({ best, sound, reducedMotion }),
    },
  ),
)
