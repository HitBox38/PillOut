import { Check, ChevronRight, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { usePlayerSetup } from '@/features/PlayerSetup/hooks/usePlayerSetup'
import { usePrizeChoices } from '../hooks/usePrizeChoices'
import CustomPrizeForm from './CustomPrizeForm'
import RewardsHeader from './RewardsHeader'
import PrizeArt from './PrizeArt'
import { useRewardPagination } from '../hooks/useRewardPagination'
import RewardPager from './RewardPager'

export default function PrizeChoices() {
  const { selected, options, adding, setAdding, selectAll, toggle, add, save } = usePrizeChoices()
  const nickname = usePlayerSetup((s) => s.nickname.trim())
  const pager = useRewardPagination(options, 6)
  return (
    <div className="reward-choices-content" data-editing={adding || undefined}>
      <RewardsHeader choices />
      {nickname && (
        <p className="reward-recipient">
          A little joy for <strong>{nickname}</strong>
        </p>
      )}
      {!adding && (
        <>
          <div className="prize-choices-heading">
            <h2>Available prizes</h2>
            <Button onClick={selectAll} variant="outline">
              Select all
            </Button>
          </div>
          <p className="prize-choices-intro">Pick prizes they can choose after a daily win.</p>
          <fieldset className="prize-choices-grid" aria-label="Available prizes">
            {pager.items.map((prize) => {
              const checked = selected.some((p) => p.id === prize.id)
              return (
                <Button
                  className="prize-choice"
                  key={prize.id}
                  aria-pressed={checked}
                  title={prize.name}
                  onClick={() => toggle(prize)}
                >
                  <span className="prize-choice-check">{checked && <Check />}</span>
                  <PrizeArt prize={prize} />
                  <span>{prize.name}</span>
                </Button>
              )
            })}
          </fieldset>
          <RewardPager {...pager} label="prize choices" />
        </>
      )}
      {adding ? (
        <CustomPrizeForm
          existing={options}
          onAdd={(prize) => {
            add(prize)
            pager.setPage(Math.floor(options.length / 6))
          }}
          onCancel={() => setAdding(false)}
        />
      ) : (
        <Button className="add-custom-prize" onClick={() => setAdding(true)}>
          <span>
            <Plus />
          </span>
          <span>
            <strong>Add a custom prize</strong>
            <small>Something they love</small>
          </span>
        </Button>
      )}
      {!adding && (
        <>
          <div className="prize-selection-status" aria-live="polite">
            <strong>
              {selected.length} {selected.length === 1 ? 'prize' : 'prizes'} selected
            </strong>
            <p>
              {selected.length
                ? 'You can change these anytime.'
                : 'Choose at least one prize to continue.'}
            </p>
          </div>
          <Button className="candy-button" disabled={!selected.length} onClick={save}>
            Save reward choices
            <ChevronRight />
          </Button>
          <p className="rewards-device-note">Arranged by you. Saved on this device.</p>
        </>
      )}
    </div>
  )
}
