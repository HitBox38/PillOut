import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { ChevronRight, Heart, Settings2, ShieldCheck, Ticket } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useDailyRewards } from '../hooks/useDailyRewards'
import { useRewardDate } from '../hooks/useRewardDate'
import RewardsHeader from './RewardsHeader'
import RewardCalendar from './RewardCalendar'
import ClaimReward from './ClaimReward'
import EarnedPrizes from './EarnedPrizes'

export default function RewardsCalendarPage() {
  const days = useDailyRewards((s) => s.days)
  const hasPrizes = useDailyRewards((s) => s.prizes.length > 0)
  const today = useRewardDate()
  const [claimDate, setClaimDate] = useState<string | null>(null)
  const [pocketOpen, setPocketOpen] = useState(false)
  const pocketCount = days.filter((day) => day.prize && !day.received).length
  const pending = days.find((day) => !day.prize)
  const wonToday = days.some((day) => day.date >= today)
  return (
    <>
      <RewardsHeader />
      <div className="reward-today-message">
        <Heart fill="currentColor" />
        <p>
          <strong>
            {pending
              ? 'You did it! Your reward is ready.'
              : wonToday
                ? 'Today’s little win is in the bag!'
                : 'Your next smile starts with a level.'}
          </strong>
          <span>
            {pending
              ? 'Pick a prize, you’ve earned it.'
              : wonToday
                ? 'Come back tomorrow for another reward.'
                : 'Win one Classic level to choose a daily prize.'}
          </span>
        </p>
      </div>
      <RewardCalendar days={days} today={today} />
      <div className="reward-primary-action">
        {pending && !hasPrizes ? (
          <Button
            nativeButton={false}
            render={<Link to="/reward-choices" />}
            className="candy-button"
          >
            Choose reward prizes <ChevronRight />
          </Button>
        ) : pending ? (
          <Button className="candy-button" onClick={() => setClaimDate(pending.date)}>
            Choose my reward <ChevronRight />
          </Button>
        ) : (
          <Button nativeButton={false} render={<Link to="/play" />} className="candy-button">
            {wonToday ? 'Keep playing' : 'Play a level'}
            <ChevronRight />
          </Button>
        )}
        <p>
          <ShieldCheck /> Miss a day? Your progress stays yours.
        </p>
      </div>
      <div className="reward-secondary-actions">
        <Button className="reward-pocket-trigger" onClick={() => setPocketOpen(true)}>
          <Ticket />
          Prize pocket <span>{pocketCount}</span>
        </Button>
        <Link to="/reward-choices" className="reward-choices-link">
          <Settings2 />
          <span>
            <strong>Choose prizes</strong>
          </span>
          <ChevronRight />
        </Link>
      </div>
      <p className="rewards-device-note">
        Prizes arranged with your caregiver. Saved on this device.
      </p>
      {claimDate && <ClaimReward date={claimDate} onClose={() => setClaimDate(null)} />}
      {pocketOpen && <EarnedPrizes onClose={() => setPocketOpen(false)} />}
    </>
  )
}
