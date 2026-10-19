import { useEffect, useRef } from 'react'
import { Link, Navigate } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { useGameStore } from '@/game/store'
import { GamePage } from '@/pages/game-page'
import { useDemoRoom } from '../hooks/useDemoRoom'
import { useDemoStore } from '../hooks/useDemoStore'

export default function DemoGame({ code }: { code: string }) {
  const { current, pending, error, connectionError, send } = useDemoRoom(code)
  const outcome = useGameStore((state) => state.outcome)
  const session = useGameStore((state) => state.session)
  const attempted = useRef<number | null>(null)
  const prepared = useRef<string | null>(null)
  useEffect(() => {
    if (!current?.checked_in || prepared.current === code) return
    prepared.current = code
    const game = useGameStore.getState()
    game.setMedicines(current.medicines)
    game.newGame('classic')
  }, [code, current])
  useEffect(() => {
    if (
      outcome !== 'won' ||
      session !== useGameStore.getState().session ||
      !current?.checked_in ||
      current.won ||
      attempted.current === session ||
      useGameStore.getState().mode !== 'classic'
    )
      return
    attempted.current = session
    useDemoStore.getState().queueWin(code, useGameStore.getState().level.number)
  }, [code, outcome, session, current?.checked_in, current?.won])
  // The plan is copied into a round at its start. Remote edits apply when re-entering the game.
  if (!current)
    return (
      <section className="mobile-screen demo-screen">
        <h1>Connecting to your demo…</h1>
        <p>{connectionError}</p>
        <Link to="/demo/$room/$role" params={{ room: code, role: 'patient' }}>
          Back to my demo
        </Link>
      </section>
    )
  if (!current.checked_in)
    return <Navigate to="/demo/$room/$role" params={{ room: code, role: 'patient' }} />
  return (
    <>
      <GamePage
        demoRewardAction={
          <Button
            nativeButton={false}
            className="candy-button"
            render={<Link to="/demo/$room/$role" params={{ room: code, role: 'patient' }} />}
          >
            Choose my demo reward
          </Button>
        }
        demoNavigation={
          <Link
            to="/demo/$room/$role"
            params={{ room: code, role: 'patient' }}
            className="demo-return-link"
            aria-label="Back to my demo"
          >
            ‹ My demo
          </Link>
        }
      />
      {(error || connectionError || (outcome === 'won' && !current.won)) && (
        <output className="demo-game-notice">
          <span>{error || connectionError || 'Saving your shared win…'}</span>
          {outcome === 'won' && !pending && !current.won && (
            <Button
              onClick={() =>
                void send({
                  action: 'win',
                  role: 'patient',
                  level: useGameStore.getState().level.number,
                })
              }
            >
              Retry saving win
            </Button>
          )}
        </output>
      )}
    </>
  )
}
