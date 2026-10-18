import { SIZE } from '@/game/engine'
import { ART_SOURCES } from '@/lib/art-assets'
import type { Props } from './types'
import './styles.css'

export { default as BearGoalCounter } from './components/GoalCounter'

/** Fixed board artwork beneath Pixi's moving pills, with no input targets of its own. */
export default function BearRescue({ goal, rescue, collecting }: Props) {
  return (
    <div className="rescue-backdrop" aria-hidden="true">
      {goal.bears.map((bear) => (
        <img
          key={bear.origin}
          className="rescue-bear"
          src={ART_SOURCES.bear.src}
          alt=""
          data-collected={
            (rescue.rescued.includes(bear.origin) && !collecting.includes(bear.origin)) || undefined
          }
          style={{
            left: `${((bear.origin % SIZE) / SIZE) * 100}%`,
            top: `${(Math.floor(bear.origin / SIZE) / SIZE) * 100}%`,
          }}
        />
      ))}
      <div className="rescue-covering">
        {rescue.covered.map((covered, index) => (
          <div key={index} className="rescue-ice" data-uncovered={!covered || undefined} />
        ))}
      </div>
    </div>
  )
}
