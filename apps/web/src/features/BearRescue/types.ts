import type { LevelGoal, RescueState } from '@/game/engine'

export interface Props {
  goal: Extract<LevelGoal, { type: 'bears' }>
  rescue: RescueState
  collecting: readonly number[]
}

export interface GoalCounterProps {
  rescued: number
  required: number
}
