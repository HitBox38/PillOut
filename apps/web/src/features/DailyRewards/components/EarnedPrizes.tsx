import { Check, Ticket } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { useDailyRewards } from '../hooks/useDailyRewards'
import { useRewardPagination } from '../hooks/useRewardPagination'
import { useRewardViewport } from '../hooks/useRewardViewport'
import RewardPager from './RewardPager'
import PrizeArt from './PrizeArt'

export default function EarnedPrizes({ onClose }: { onClose: () => void }) {
  const days = useDailyRewards((s) => s.days)
  const waiting = days.filter((day) => day.prize && !day.received)
  const pager = useRewardPagination(waiting, 1)
  const height = useRewardViewport()
  const day = pager.items[0]
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent
        className="game-dialog reward-pocket-dialog"
        style={{ height: `min(620px, ${height - 24}px)` }}
      >
        <DialogTitle>
          <Ticket /> My prize pocket <span>{waiting.length}</span>
        </DialogTitle>
        <DialogDescription>
          {day
            ? 'Show your caregiver when you’re ready.'
            : 'Your claimed prizes will be waiting here.'}
        </DialogDescription>
        {day ? (
          <article className="earned-prize">
            <PrizeArt prize={day.prize} />
            <h2>{day.prize!.name}</h2>
            <p>
              Level {day.level} ·{' '}
              {new Date(`${day.date}T12:00:00`).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
              })}
            </p>
            <Button
              className="candy-button"
              aria-label={`Mark ${day.prize!.name} from ${day.date} as received`}
              onClick={() => useDailyRewards.getState().markReceived(day.date)}
            >
              <Check />
              Received
            </Button>
          </article>
        ) : (
          <div className="reward-pocket-empty">
            <Ticket />
            <p>A little play today, a little joy to keep.</p>
          </div>
        )}
        <RewardPager {...pager} label="saved prizes" />
        <Button onClick={onClose}>Back to rewards</Button>
      </DialogContent>
    </Dialog>
  )
}
