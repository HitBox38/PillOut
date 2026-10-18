import { useGameStore } from '@/game/store'
import GoalComets from './components/GoalComets'
import { useReducedMotion } from './hooks/useReducedMotion'

export { default as CascadeTitle } from './components/CascadeTitle'
export { default as ScoreCounter } from './components/ScoreCounter'
export { default as VictoryCelebration } from './components/VictoryCelebration'
export { useReducedMotion } from './hooks/useReducedMotion'

export default function GameEffects() {
  const wave = useGameStore((state) => state.wave)
  const reduced = useReducedMotion()
  const paused = useGameStore((state) => state.paused)
  const mode = useGameStore((state) => state.mode)
  const target = useGameStore((state) => state.level.target)
  if (
    !wave ||
    paused ||
    (wave.combo < 3 &&
      !wave.activations.length &&
      !(mode === 'classic' && wave.scoreBefore < target && wave.scoreAfter >= target))
  )
    return null
  return <GoalComets key={wave.id} wave={wave} reducedMotion={reduced} />
}
