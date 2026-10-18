import type { Board, SpecialActivation } from './engine'

export const SHUFFLE_DURATION = 480
export const REDUCED_SHUFFLE_DURATION = 120
export const CLEAR_DURATION = 220
export const BIRTH_DURATION = 180

export interface ClearWave {
  id: number
  startedAt: number
  combo: number
  points: number
  scoreBefore: number
  scoreAfter: number
  clearing: number[]
  created: number[]
  activations: SpecialActivation[]
}

export interface BoardRemix {
  id: number
  startedAt: number
  previous: Board
}

export function systemReducesMotion() {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}
