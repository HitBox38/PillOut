import { ART_SOURCES } from '@/lib/art-assets'
import type { GoalCounterProps } from '../types'
import { useGoalReceipt } from '../hooks/useGoalReceipt'

export default function GoalCounter({ rescued, required }: GoalCounterProps) {
  const icon = useGoalReceipt(rescued, required)
  return (
    <div className="bear-goal">
      <img ref={icon} src={ART_SOURCES.bear.src} alt="" className="bear-goal-art" />
      <strong>
        <output aria-label={`${rescued} of ${required} bears rescued`} aria-live="polite">
          {rescued}/{required}
        </output>
      </strong>
    </div>
  )
}
