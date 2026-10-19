import { Link } from '@tanstack/react-router'
import { useRewardViewport } from '@/features/DailyRewards/hooks/useRewardViewport'
import { DEMO_ROLES, ROOM_PATTERN } from './constants'
import DemoLobby from './components/DemoLobby'
import RoomDashboard from './components/RoomDashboard'
import DemoGame from './components/DemoGame'
import ParentRewards from './components/ParentRewards'
import type { Props } from './types'
import './demo.css'

export default function DemoFlow({ room, role, playing }: Props) {
  const height = useRewardViewport()
  const selected = DEMO_ROLES.find((option) => option.id === role)
  return (
    <div className="demo-viewport" data-compact={height < 460 || undefined} style={{ height }}>
      {!room ? (
        <DemoLobby />
      ) : !ROOM_PATTERN.test(room) || !selected ? (
        <section className="mobile-screen demo-screen">
          <h1>Let’s find your demo</h1>
          <p>Choose a role and enter your room code.</p>
          <Link to="/demo">Back to demo setup</Link>
        </section>
      ) : playing && selected.id === 'patient' ? (
        <DemoGame code={room} />
      ) : selected.id === 'parent' ? (
        <ParentRewards code={room} />
      ) : (
        <RoomDashboard code={room} demoRole={selected.id} />
      )}
    </div>
  )
}
