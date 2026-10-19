import { Link } from '@tanstack/react-router'
import { X } from 'lucide-react'
import { Artwork } from '@/components/artwork'

export default function RewardsHeader({ choices = false }: { choices?: boolean }) {
  return (
    <header className="rewards-header">
      <Link to="/play" className="rewards-wordmark" aria-label="Pill Out game">
        PILL<span>OUT</span>
      </Link>
      <Link
        to={choices ? '/rewards' : '/play'}
        className="rewards-close"
        aria-label={choices ? 'Back to daily rewards' : 'Back to game'}
      >
        <X />
      </Link>
      <Artwork source="prizes" crop={[38, 0, 664, 249]} className="rewards-buddies" />
      <div className="rewards-title-plaque">
        <h1>
          {choices ? (
            <>
              Choose their <em>rewards</em>
            </>
          ) : (
            <>
              Daily <em>rewards</em>
            </>
          )}
        </h1>
        <p>
          {choices
            ? 'Little prizes. A whole lot of happy.'
            : 'A little play. A little joy. Every day.'}
        </p>
      </div>
    </header>
  )
}
