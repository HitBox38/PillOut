import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { PRIZES } from '@/features/DailyRewards/constants'
import PrizeArt from '@/features/DailyRewards/components/PrizeArt'
import type { DemoCommand, DemoRoom } from '../types'

interface Props {
  room: DemoRoom
  pending: boolean
  send: (command: DemoCommand) => Promise<boolean>
}
export default function PatientPanel({ room, pending, send }: Props) {
  const claimed = PRIZES.find((prize) => prize.id === room.claimed)
  return (
    <div className="demo-panel demo-patient-panel">
      <div className="demo-patient-star" aria-hidden="true">
        ✦
      </div>
      <div>
        <h2>
          {claimed
            ? 'You did it, Ariel!'
            : room.won
              ? 'Pick your little reward!'
              : 'Ready for a little adventure?'}
        </h2>
        <p>
          {!room.medicines.length
            ? 'Your care team is getting your sample plan ready.'
            : !room.checked_in
              ? 'Your sample plan is ready. Say hello to your care team!'
              : room.won
                ? 'Your game is complete. Your parent can see your progress.'
                : 'Match, rescue bears, and make yourself smile.'}
        </p>
      </div>
      {claimed ? (
        <div className="demo-claimed">
          <PrizeArt prize={claimed} />
          <strong>{claimed.name}</strong>
          <p>
            {room.received
              ? 'Your parent marked this reward as given. Enjoy!'
              : 'Your parent can see your choice. A little joy is on the way!'}
          </p>
        </div>
      ) : room.won ? (
        room.prizes.length ? (
          <div className="demo-prizes">
            {PRIZES.filter((prize) =>
              room.prizes.includes(prize.id as (typeof room.prizes)[number]),
            ).map((prize) => (
              <Button
                key={prize.id}
                className="demo-prize"
                disabled={pending}
                onClick={() =>
                  void send({
                    action: 'claim',
                    role: 'patient',
                    prize: prize.id as (typeof room.prizes)[number],
                  })
                }
              >
                <PrizeArt prize={prize} />
                <span>{prize.name}</span>
              </Button>
            ))}
          </div>
        ) : (
          <p className="demo-waiting">Waiting for your parent to choose rewards…</p>
        )
      ) : !room.checked_in ? (
        <Button
          className="candy-button"
          disabled={pending || !room.medicines.length}
          onClick={() => void send({ action: 'check-in', role: 'patient' })}
        >
          {pending ? 'Checking in…' : 'I’m here! Check in'}
        </Button>
      ) : (
        <Button
          nativeButton={false}
          className="candy-button"
          render={
            <Link to="/demo/$room/$role/play" params={{ room: room.room, role: 'patient' }} />
          }
        >
          Let’s play!
        </Button>
      )}
    </div>
  )
}
