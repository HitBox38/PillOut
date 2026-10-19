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
import type { CaregiverRewards } from '../types'

export default function RewardsCalendarPage({ caregiver }: { caregiver?: CaregiverRewards }) {
  const localDays = useDailyRewards((s) => s.days)
  const localHasPrizes = useDailyRewards((s) => s.prizes.length > 0)
  const days = caregiver?.days ?? localDays
  const hasPrizes = caregiver ? caregiver.prizes.length > 0 : localHasPrizes
  const today = useRewardDate()
  const [claimDate, setClaimDate] = useState<string | null>(null)
  const [pocketOpen, setPocketOpen] = useState(false)
  const pocketCount = days.filter((day) => day.prize && !day.received).length
  const pending = days.find((day) => !day.prize)
  const wonToday = days.some((day) => day.date >= today)
  return (
    <>
      <RewardsHeader onBack={caregiver?.onBack} />
      <div className="reward-today-message">
        <Heart fill="currentColor" />
        <p>
          <strong>
            {caregiver
              ? `${caregiver.name}’s daily rewards`
              : pending
                ? 'You did it! Your reward is ready.'
                : wonToday
                  ? 'Today’s little win is in the bag!'
                  : 'Your next smile starts with a level.'}
          </strong>
          <span>
            {caregiver
              ? pending
                ? 'A game won! They can choose a reward on their device.'
                : wonToday
                  ? 'A little win, shared with you.'
                  : 'Their next reward starts with a Classic win.'
              : pending
                ? 'Pick a prize, you’ve earned it.'
                : wonToday
                  ? 'Come back tomorrow for another reward.'
                  : 'Win one Classic level to choose a daily prize.'}
          </span>
        </p>
      </div>
      <RewardCalendar days={days} today={today} />
      <div className="reward-primary-action">
        {caregiver ? (
          <Button
            className="candy-button"
            onClick={caregiver.onChoose}
            disabled={caregiver.pending}
          >
            Choose reward prizes <ChevronRight />
          </Button>
        ) : pending && !hasPrizes ? (
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
        {caregiver ? (
          <Button className="reward-choices-link" onClick={caregiver.onBack}>
            Room {caregiver.roomCode} · Devices <ChevronRight />
          </Button>
        ) : (
          <Link to="/reward-choices" className="reward-choices-link">
            <Settings2 />
            <span>
              <strong>Choose prizes</strong>
            </span>
            <ChevronRight />
          </Link>
        )}
      </div>
      <p className="rewards-device-note">
        {caregiver
          ? 'Live demo · Shared with the patient and medical team.'
          : 'Prizes arranged with your caregiver. Saved on this device.'}
      </p>
      {claimDate && <ClaimReward date={claimDate} onClose={() => setClaimDate(null)} />}
      {pocketOpen && (
        <EarnedPrizes
          onClose={() => setPocketOpen(false)}
          sharedDays={caregiver?.days}
          onReceive={caregiver?.onReceive}
          pending={caregiver?.pending}
        />
      )}
    </>
  )
}
