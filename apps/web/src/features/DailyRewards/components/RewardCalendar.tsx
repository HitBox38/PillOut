import { Check, LockKeyhole, Star } from 'lucide-react'
import { Artwork } from '@/components/artwork'
import { MILESTONES } from '../constants'
import { rewardWeek } from '../helpers'
import type { RewardDay } from '../types'
import PrizeArt from './PrizeArt'
import type { CSSProperties } from 'react'

export default function RewardCalendar({ days, today }: { days: RewardDay[]; today: string }) {
  const { start, current, week } = rewardWeek(days, today)
  return (
    <>
      <section
        className="rewards-milestones"
        aria-label={`${days.length} reward days completed. Celebration milestones`}
      >
        <div className="reward-day-count">
          <Star fill="currentColor" />
          <strong>{days.length}</strong>
          <span>days played</span>
        </div>
        <ol>
          {MILESTONES.map((milestone) => (
            <li
              key={milestone}
              data-earned={days.length >= milestone || undefined}
              aria-label={`${milestone} days${days.length >= milestone ? ', reached' : ''}`}
            >
              {days.length >= milestone ? <Check /> : <Star />}
              <span>{milestone}</span>
            </li>
          ))}
        </ol>
      </section>
      <section className="reward-calendar" aria-label={`Reward week ${week}`}>
        <div className="reward-calendar-heading">
          <span>YOUR WEEK OF LITTLE WINS</span>
          <span>Week {week}</span>
        </div>
        <ol className="reward-days">
          {Array.from({ length: 7 }, (_, index) => {
            const day = days[start + index]
            const claimed = Boolean(day?.prize)
            const ready = Boolean(day && !claimed)
            return (
              <li
                key={index}
                className={`reward-day ${index === 6 ? 'reward-day-special' : ''}`}
                data-current={index === current || undefined}
                aria-current={index === current ? 'step' : undefined}
                data-ready={ready || undefined}
              >
                <h2>
                  Day {index + 1}
                  {claimed && <Check aria-label="Claimed" />}
                </h2>
                <div className="reward-day-art">
                  {index === 6 && !claimed ? (
                    <span
                      className="prize-art-space"
                      style={{ '--prize-ratio': 581 / 146 } as CSSProperties}
                    >
                      <Artwork source="rewards" crop={[75, 1230, 581, 146]} className="prize-art" />
                    </span>
                  ) : (
                    <PrizeArt prize={day?.prize} />
                  )}
                </div>
                <span className="reward-day-status">
                  {claimed ? (
                    day!.prize!.name
                  ) : ready ? (
                    'Pick your prize!'
                  ) : (
                    <>
                      <LockKeyhole />
                      {index === 6 ? 'An extra-special smile' : 'A little surprise'}
                    </>
                  )}
                </span>
              </li>
            )
          })}
        </ol>
      </section>
    </>
  )
}
