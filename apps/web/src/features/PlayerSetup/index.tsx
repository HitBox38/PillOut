import { Link, useNavigate } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { GameLogo } from '@/components/artwork'
import { useGameStore } from '@/game/store'
import Welcome from './components/Welcome'
import PillSelection from './components/PillSelection'
import Schedule from './components/Schedule'
import { usePlayerSetup } from './hooks/usePlayerSetup'
import type { Props } from './types'

export default function PlayerSetup({ step }: Props) {
  const navigate = useNavigate()
  const player = usePlayerSetup()
  const actualStep = step === 'schedule' && !player.selectedPills.length ? 'pills' : step
  return (
    <section
      className={`mobile-screen setup-screen${actualStep === 'pills' ? ' pills-screen' : actualStep === 'welcome' ? ' welcome-screen' : ''}`}
      aria-label="Player setup"
    >
      <div className="screen-topline">
        <Link
          to={actualStep === 'welcome' ? '/' : actualStep === 'pills' ? '/welcome' : '/pills'}
          className="back-link"
          aria-label="Go back"
        >
          <ArrowLeft />
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
