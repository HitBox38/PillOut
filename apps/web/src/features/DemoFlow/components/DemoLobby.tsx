import { useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { ChevronRight, Plus, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { GameLogo } from '@/components/artwork'
import { createRoom } from '../api'
import { DEMO_ROLES, ROOM_PATTERN } from '../constants'
import type { DemoRole } from '../types'

export default function DemoLobby() {
  const navigate = useNavigate()
  const [role, setRole] = useState<DemoRole>('patient')
  const [code, setCode] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const create = async () => {
    setPending(true)
    setError(null)
    try {
      const room = await createRoom()
      void navigate({ to: '/demo/$room/$role', params: { room: room.room, role } })
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Could not create a demo.')
    } finally {
      setPending(false)
    }
  }
  return (
    <section className="mobile-screen demo-screen demo-lobby" aria-label="Demo setup">
      <header className="demo-topline">
        <Link to="/" className="back-link" aria-label="Back to home">
          ‹
        </Link>
        <span className="demo-eyebrow">ONE PATIENT · THREE DEVICES</span>
        <Users size={20} />
      </header>
      <GameLogo />
      <div className="demo-heading">
        <h1>Care, connected.</h1>
        <p>Choose who you are on this device.</p>
      </div>
      <fieldset className="demo-role-list">
        <legend className="sr-only">Your demo role</legend>
        {DEMO_ROLES.map((option) => (
          <label key={option.id} className="demo-role" data-selected={role === option.id}>
            <input
              type="radio"
              name="role"
              value={option.id}
              checked={role === option.id}
              onChange={() => setRole(option.id)}
            />
            {option.icon === 'patient' ? (
              <span className="demo-role-emoji" aria-hidden="true">
                ✦
              </span>
            ) : (
              <img src={`/art/options/${option.icon}.png`} alt="" />
            )}
            <span>
              <strong>{option.name}</strong>
              <small>{option.detail}</small>
            </span>
          </label>
        ))}
      </fieldset>
      <div className="demo-lobby-actions">
        <Button className="candy-button" disabled={pending} onClick={() => void create()}>
          <Plus /> {pending ? 'Creating…' : 'Create a shared demo'}
        </Button>
        <form
          className="demo-join"
          onSubmit={(event) => {
            event.preventDefault()
            if (ROOM_PATTERN.test(code))
              void navigate({ to: '/demo/$room/$role', params: { room: code, role } })
          }}
        >
          <label htmlFor="room-code">Already have a room?</label>
          <div>
            <input
              id="room-code"
              aria-label="Room code"
              placeholder="8-character code"
              autoComplete="off"
              autoCapitalize="characters"
              maxLength={8}
              pattern="[A-Z2-9]{8}"
              required
              value={code}
              onChange={(event) =>
                setCode(event.target.value.toUpperCase().replace(/[^A-Z2-9]/g, ''))
              }
            />
            <Button
              type="submit"
              disabled={pending || !ROOM_PATTERN.test(code)}
              aria-label="Join room"
            >
              <ChevronRight />
            </Button>
          </div>
        </form>
      </div>
      {error && (
        <p role="alert" className="demo-error">
          {error}
        </p>
      )}
      <p className="demo-footnote">
        Sample patient only. Share the room code with the other devices. Rooms last 7 days.
      </p>
    </section>
  )
}
