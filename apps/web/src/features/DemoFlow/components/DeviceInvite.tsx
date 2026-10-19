import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { DEMO_ROLES } from '../constants'

export default function DeviceInvite({ room, onClose }: { room: string; onClose: () => void }) {
  const [notice, setNotice] = useState('')
  const copy = async (role: string) => {
    const link = `${window.location.origin}/demo/${room}/${role}`
    try {
      await navigator.clipboard.writeText(link)
      setNotice('Link copied. Open it on the other device.')
    } catch {
      setNotice('Open /demo on the other device, choose a role, and enter the room code above.')
    }
  }
  return (
    <div className="demo-panel demo-invite">
      <h2>Bring everyone together</h2>
      <p>On each device, open Pill Out → Shared demo, choose a role, and enter:</p>
      <strong className="demo-room-code">{room}</strong>
      <p>Or copy a direct link for each device.</p>
      {DEMO_ROLES.map((role) => (
        <Button key={role.id} onClick={() => void copy(role.id)}>
          Copy {role.name.toLowerCase()} link
        </Button>
      ))}
      <output>{notice || 'Anyone with the code can join this sample patient.'}</output>
      <Button className="candy-button" onClick={onClose}>
        Back to my demo
      </Button>
    </div>
  )
}
