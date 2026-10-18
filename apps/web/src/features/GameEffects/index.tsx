import { useGameStore, TARGET } from '@/game/store'
import GoalComets from './components/GoalComets'
import { useReducedMotion } from './hooks/useReducedMotion'

export { default as CascadeTitle } from './components/CascadeTitle'
export { default as VictoryCelebration } from './components/VictoryCelebration'
export { useReducedMotion } from './hooks/useReducedMotion'

export default function GameEffects() {
  const wave = useGameStore((state) => state.wave)
  const reduced = useReducedMotion()
  const paused = useGameStore((state) => state.paused)
  const mode = useGameStore((state) => state.mode)
  if (
    !wave ||
    paused ||
    (wave.combo < 3 &&
      !wave.activations.length &&
      !(mode === 'classic' && wave.scoreBefore < TARGET && wave.scoreAfter >= TARGET))
  )
    return null
  return <GoalComets key={wave.id} wave={wave} reducedMotion={reduced} />
}
