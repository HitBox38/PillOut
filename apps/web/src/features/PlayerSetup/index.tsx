import { Link, useNavigate } from '@tanstack/react-router'
import { GameLogo } from '@/components/artwork'
import { useGameStore } from '@/game/store'
import Welcome from './components/Welcome'
import PillSelection from './components/PillSelection'
import Schedule from './components/Schedule'
import { usePlayerSetup } from './hooks/usePlayerSetup'
import { useSetupCatalogs } from './hooks/useSetupCatalogs'
import { useSetupViewport } from './hooks/useSetupViewport'
import type { Props } from './types'

export default function PlayerSetup({ step }: Props) {
  useSetupCatalogs()
  const navigate = useNavigate()
  const player = usePlayerSetup()
  const viewportHeight = useSetupViewport()
  const actualStep = step === 'schedule' && !player.selectedPills.length ? 'pills' : step
  return (
    <section
      className={`mobile-screen setup-screen${actualStep === 'pills' ? ' pills-screen' : actualStep === 'welcome' ? ' welcome-screen' : ' plan-screen'}`}
      style={
        actualStep === 'schedule'
          ? { height: `calc(${viewportHeight}px - var(--plan-inset, 0px))` }
          : { height: viewportHeight, minHeight: 0 }
      }
      aria-label="Player setup"
      data-compact={viewportHeight < (actualStep === 'schedule' ? 470 : 460) || undefined}
    >
      <div className="screen-topline">
        <Link
          to={actualStep === 'welcome' ? '/' : actualStep === 'pills' ? '/welcome' : '/pills'}
          className="art-button"
          aria-label="Go back"
        >
          <img src="/art/back.png" alt="" draggable={false} />
        </Link>
        <span className="step-label">
          {actualStep === 'welcome' ? 'YOUR ADVENTURE STARTS HERE' : 'LET’S MAKE IT YOURS'}
        </span>
        <span className="topline-spacer" />
      </div>
      <GameLogo />
      {actualStep === 'welcome' && (
        <Welcome
          onNext={() => {
            if (player.userId !== null)
              player.selectPatient(player.userId, `${player.name.trim()} ${player.surname.trim()}`)
            player.update({
              patientName: player.patientName || `${player.name.trim()} ${player.surname.trim()}`,
            })
            void navigate({ to: '/pills' })
          }}
        />
      )}
      {actualStep === 'pills' && <PillSelection onNext={() => void navigate({ to: '/plan' })} />}
      {actualStep === 'schedule' && (
        <Schedule
          onNext={() => {
            useGameStore.getState().newGame('classic')
            void navigate({ to: '/play' })
          }}
        />
      )}
    </section>
  )
}
