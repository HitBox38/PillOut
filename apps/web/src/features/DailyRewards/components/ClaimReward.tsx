import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Check, Heart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { useDailyRewards } from '../hooks/useDailyRewards'
import type { Prize } from '../types'
import PrizeArt from './PrizeArt'
import { useReducedMotion } from '@/features/GameEffects/hooks/useReducedMotion'

export default function ClaimReward({ date, onClose }: { date: string; onClose: () => void }) {
  const prizes = useDailyRewards((s) => s.prizes)
  const [selected, setSelected] = useState(prizes[0]?.id ?? '')
  const [claimed, setClaimed] = useState<Prize | null>(null)
  const reduced = useReducedMotion()
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent
        className="game-dialog reward-claim-dialog"
        data-reduced={reduced || undefined}
      >
        <DialogTitle>
          {claimed ? 'A little joy, just for you!' : 'You earned a little joy!'}
        </DialogTitle>
        <DialogDescription>
          {claimed
            ? 'Your prize is saved. Show your caregiver and enjoy it together.'
            : 'Choose one of the prizes your caregiver picked for you.'}
        </DialogDescription>
        {claimed ? (
          <output className="reward-claim-success">
            <PrizeArt prize={claimed} />
            <h2>{claimed.name}</h2>
            <Heart fill="currentColor" />
          </output>
        ) : (
          <fieldset className="claim-prize-options" aria-label="Choose your reward">
            {prizes.map((prize) => (
              <Button
                key={prize.id}
                className="claim-prize-option"
                aria-pressed={selected === prize.id}
                onClick={() => setSelected(prize.id)}
              >
                <PrizeArt prize={prize} />
                <span>{prize.name}</span>
                {selected === prize.id && <Check />}
              </Button>
            ))}
          </fieldset>
        )}
        {!claimed && !prizes.length && (
          <Link to="/reward-choices">Ask a caregiver to choose prizes</Link>
        )}
        <Button
          className="candy-button"
          disabled={!claimed && !selected}
          onClick={() => {
            if (claimed) {
              onClose()
              return
            }
            const prize = prizes.find((p) => p.id === selected)
            if (prize && useDailyRewards.getState().claim(date, prize.id)) setClaimed(prize)
          }}
        >
          {claimed ? 'Back to my rewards' : 'Claim my reward'}
          <Check />
        </Button>
      </DialogContent>
    </Dialog>
  )
}
