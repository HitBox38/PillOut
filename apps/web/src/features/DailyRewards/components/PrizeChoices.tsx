import { Check, ChevronRight, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { usePlayerSetup } from '@/features/PlayerSetup/hooks/usePlayerSetup'
import { usePrizeChoices } from '../hooks/usePrizeChoices'
import CustomPrizeForm from './CustomPrizeForm'
import RewardsHeader from './RewardsHeader'
import PrizeArt from './PrizeArt'

export default function PrizeChoices() {
  const { selected, options, adding, setAdding, selectAll, toggle, add, save } = usePrizeChoices()
  const nickname = usePlayerSetup((s) => s.nickname.trim())
  return (
    <>
      <RewardsHeader choices />
      <p className="reward-recipient">
        {nickname ? (
          <>
            A little joy for <strong>{nickname}</strong>
          </>
        ) : (
          'Picked by you. Loved by them.'
        )}
      </p>
      <div className="prize-choices-heading">
        <h2>Available prizes</h2>
        <Button onClick={selectAll} variant="outline">
          Select all
        </Button>
      </div>
      <p className="prize-choices-intro">
        Choose prizes you’d like to offer. Each day they win a level, they can pick one.
      </p>
      <fieldset className="prize-choices-grid" aria-label="Available prizes">
        {options.map((prize) => {
          const checked = selected.some((p) => p.id === prize.id)
          return (
            <Button
              className="prize-choice"
              key={prize.id}
              aria-pressed={checked}
              onClick={() => toggle(prize)}
            >
              <span className="prize-choice-check">{checked && <Check />}</span>
              <PrizeArt prize={prize} />
              <span>{prize.name}</span>
            </Button>
          )
        })}
      </fieldset>
      {adding ? (
        <CustomPrizeForm existing={options} onAdd={add} onCancel={() => setAdding(false)} />
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
      <p className="rewards-device-note">
        Pick what works for your family. Prizes are arranged by you and saved on this device.
      </p>
    </>
  )
}
