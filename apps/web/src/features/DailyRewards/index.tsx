import RewardsCalendarPage from './components/RewardsCalendarPage'
import PrizeChoices from './components/PrizeChoices'
import type { Props } from './types'
import './rewards.css'

export default function DailyRewards({ view = 'calendar' }: Props) {
  return (
    <section
      className="mobile-screen rewards-screen"
      aria-label={view === 'choices' ? 'Choose reward prizes' : 'Daily rewards'}
    >
      {view === 'choices' ? <PrizeChoices /> : <RewardsCalendarPage />}
    </section>
  )
}
