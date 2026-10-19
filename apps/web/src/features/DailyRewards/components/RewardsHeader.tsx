import { Link } from '@tanstack/react-router'
import { Artwork } from '@/components/artwork'

export default function RewardsHeader({
  choices = false,
  onBack,
}: {
  choices?: boolean
  onBack?: () => void
}) {
  return (
    <header className="rewards-header">
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          className="rewards-wordmark"
          aria-label="Back to demo"
        >
          PILL<span>OUT</span>
        </button>
      ) : (
        <Link to="/play" className="rewards-wordmark" aria-label="Pill Out game">
          PILL<span>OUT</span>
        </Link>
      )}
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          className="rewards-close art-button"
          aria-label={choices ? 'Back to daily rewards' : 'Demo room and devices'}
        >
          <img src="/art/back.png" alt="" draggable={false} />
        </button>
      ) : (
        <Link
          to={choices ? '/rewards' : '/play'}
          className="rewards-close art-button"
          aria-label={choices ? 'Back to daily rewards' : 'Back to game'}
        >
          <img src="/art/back.png" alt="" draggable={false} />
        </Link>
      )}
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
