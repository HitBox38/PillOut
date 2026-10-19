import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Radio, Share2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MEDICINE_ART } from '@/lib/art-assets'
import { DEMO_PATIENT, DEMO_ROLES } from '../constants'
import { useDemoRoom } from '../hooks/useDemoRoom'
import type { DemoRole } from '../types'
import MedicalPanel from './MedicalPanel'
import PatientPanel from './PatientPanel'
import DeviceInvite from './DeviceInvite'

export default function RoomDashboard({
  code,
  demoRole: role,
}: {
  code: string
  demoRole: DemoRole
}) {
  const { current, pending, error, connectionError, send } = useDemoRoom(code)
  const [inviting, setInviting] = useState(false)
  const roleName = DEMO_ROLES.find((option) => option.id === role)?.name ?? 'Patient'
  return (
    <section className="mobile-screen demo-screen" aria-label={`${roleName} demo`}>
      <header className="demo-topline">
        <Link to="/demo" className="back-link" aria-label="Leave demo">
          ‹
        </Link>
        <span className="demo-eyebrow">{roleName.toUpperCase()}</span>
        <Button
          aria-label="Invite other devices"
          className="demo-icon-button"
          onClick={() => setInviting(!inviting)}
        >
          <Share2 size={20} />
        </Button>
      </header>
      <div className="demo-heading">
        <span className="demo-live">
          <Radio size={13} />{' '}
          {connectionError ? 'Reconnecting…' : current ? 'Live shared demo' : 'Connecting…'}
        </span>
        <h1>{role === 'patient' ? `Hi, ${DEMO_PATIENT}!` : `${DEMO_PATIENT}’s care circle`}</h1>
        <p className="demo-code-line">
          Room <strong>{code}</strong>
          <span>Sample patient · age 8</span>
        </p>
      </div>
      {inviting ? (
        <DeviceInvite room={code} onClose={() => setInviting(false)} />
      ) : current ? (
        <>
          <div className="demo-status-card">
            <div>
              <strong>
                Sample plan · {current.medicines.length ? current.time : 'Waiting for care team'}
              </strong>
              <span>
                {current.medicines.map((id) => MEDICINE_ART[id].label).join(' · ') ||
                  'The medical team publishes the plan here.'}
              </span>
            </div>
            <p>
              {current.checked_in ? 'Checked in ✓' : 'Not checked in'} <span>·</span>{' '}
              {current.won ? 'Game won ✓' : 'Game to play'}
            </p>
          </div>
          {role === 'medical' ? (
            <MedicalPanel
              key={`${current.medicines.join(',')}:${current.time}`}
              room={current}
              pending={pending || !!connectionError}
              send={send}
            />
          ) : (
            <PatientPanel room={current} pending={pending || !!connectionError} send={send} />
          )}
        </>
      ) : (
        <div className="demo-panel demo-waiting">
          <h2>Joining your care circle…</h2>
          <p>The demo will appear when connected.</p>
          <Link to="/demo">Check the code or start a new room</Link>
        </div>
      )}
      {(error || connectionError) && (
        <p role="alert" className="demo-error">
          {error || connectionError}
        </p>
      )}
      <footer className="demo-footnote">
        Demo only · No medication reminders or medical records.
        <br />
        Updates appear on connected devices within a few seconds.
      </footer>
    </section>
  )
}
