import { Check, Ticket } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useDailyRewards } from '../hooks/useDailyRewards'
import PrizeArt from './PrizeArt'

export default function EarnedPrizes() {
  const days = useDailyRewards((s) => s.days)
  const waiting = days.filter((day) => day.prize && !day.received)
  return (
    <section className="earned-prizes" aria-label="Saved prizes">
      <h2>
        <Ticket /> My prize pocket <span>{waiting.length}</span>
      </h2>
      <p>
        {waiting.length
          ? 'Show your caregiver when you’re ready.'
          : 'Your claimed prizes will be waiting right here.'}
      </p>
      {waiting.map((day) => (
        <article className="earned-prize" key={day.date}>
          <PrizeArt prize={day.prize} />
          <div>
            <h3>{day.prize!.name}</h3>
            <small>
              Level {day.level} ·{' '}
              {new Date(`${day.date}T12:00:00`).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
              })}
            </small>
          </div>
          <Button
            aria-label={`Mark ${day.prize!.name} from ${day.date} as received`}
            onClick={() => useDailyRewards.getState().markReceived(day.date)}
          >
            <Check />
            Received
          </Button>
        </article>
      ))}
    </section>
  )
}
