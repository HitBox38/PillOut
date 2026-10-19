import { useGameStore } from '@/game/store'
import GoalComets from './components/GoalComets'
import { useReducedMotion } from './hooks/useReducedMotion'

export { default as CascadeTitle } from './components/CascadeTitle'
export { default as ScoreCounter } from './components/ScoreCounter'
export { default as VictoryCelebration } from './components/VictoryCelebration'
export { default as RoundOverlay } from './components/RoundOverlay'
export { useReducedMotion } from './hooks/useReducedMotion'

export default function GameEffects() {
  const wave = useGameStore((state) => state.wave)
  const reduced = useReducedMotion()
  const paused = useGameStore((state) => state.paused)
  const mode = useGameStore((state) => state.mode)
  const goal = useGameStore((state) => state.level.goal)
  if (mode === 'classic' && goal.type === 'bears')
    return wave?.rescuedBears?.length && wave.input === 'pointer' && !paused ? (
      <GoalComets key={wave.id} wave={wave} reducedMotion={reduced} />
    ) : null
  if (
    !wave ||
    paused ||
    (wave.combo < 3 &&
      !wave.activations.length &&
      !(
        mode === 'classic' &&
        goal.type === 'score' &&
        wave.scoreBefore < goal.target &&
        wave.scoreAfter >= goal.target
      ))
  )
    return null
  return <GoalComets key={wave.id} wave={wave} reducedMotion={reduced} />
}
