import RewardsCalendarPage from './components/RewardsCalendarPage'
import PrizeChoices from './components/PrizeChoices'
import type { Props } from './types'
import './rewards.css'
import type { CSSProperties } from 'react'
import { useRewardViewport } from './hooks/useRewardViewport'

export default function DailyRewards({ view = 'calendar', caregiver }: Props) {
  const height = useRewardViewport()
  return (
    <section
      className="mobile-screen rewards-screen"
      data-view={view}
      style={{ '--reward-height': `${height}px` } as CSSProperties}
      aria-label={view === 'choices' ? 'Choose reward prizes' : 'Daily rewards'}
    >
      {view === 'choices' ? (
        <PrizeChoices caregiver={caregiver} />
      ) : (
        <RewardsCalendarPage caregiver={caregiver} />
      )}
      {caregiver?.error && (
        <p className="shared-rewards-error" role="alert">
          {caregiver.error}
        </p>
      )}
    </section>
  )
}
