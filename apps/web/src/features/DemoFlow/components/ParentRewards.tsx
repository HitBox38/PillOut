import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import DailyRewards from '@/features/DailyRewards'
import { PRIZES } from '@/features/DailyRewards/constants'
import { useRewardDate } from '@/features/DailyRewards/hooks/useRewardDate'
import { DEMO_PATIENT } from '../constants'
import { useDemoRoom } from '../hooks/useDemoRoom'
import type { DemoPrize } from '../types'
import DeviceInvite from './DeviceInvite'

export default function ParentRewards({ code }: { code: string }) {
  const { current, pending, error, connectionError, send } = useDemoRoom(code)
  const [view, setView] = useState<'calendar' | 'choices' | 'devices'>('calendar')
  const today = useRewardDate()
  if (view === 'devices')
    return (
      <section className="mobile-screen demo-screen">
        <DeviceInvite room={code} onClose={() => setView('calendar')} />
        <Link to="/demo" className="demo-leave">
          Leave demo
        </Link>
      </section>
    )
  if (!current)
    return (
      <section className="mobile-screen demo-screen">
        <h1>Connecting to daily rewards…</h1>
        <p role="alert">{connectionError}</p>
        <Link to="/demo">Back to demo setup</Link>
      </section>
    )
  const prizes = PRIZES.filter((prize) => current.prizes.includes(prize.id as DemoPrize))
  const days = current.won
    ? [
        {
          date: current.won_on ?? today,
          level: current.won_level,
          prize: PRIZES.find((prize) => prize.id === current.claimed) ?? null,
          received: current.received,
        },
      ]
    : []
  return (
    <DailyRewards
      view={view}
      caregiver={{
        days,
        prizes,
        name: DEMO_PATIENT,
        roomCode: code,
        pending: pending || !!connectionError,
        error: error || connectionError,
        onBack: () => setView(view === 'choices' ? 'calendar' : 'devices'),
        onChoose: () => setView('choices'),
        onSave: (choices) =>
          send({
            action: 'prizes',
            role: 'parent',
            prizes: choices.map((prize) => prize.id as DemoPrize),
          }),
        onReceive: () => send({ action: 'receive', role: 'parent' }),
      }}
    />
  )
}
