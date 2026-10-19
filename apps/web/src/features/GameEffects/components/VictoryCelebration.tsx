import type { CSSProperties } from 'react'
import { Play, Trophy } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { Avatar } from '@/features/PlayerSetup/components/Avatar'
import type { AvatarOption } from '@/features/PlayerSetup/types'
import { Button } from '@/components/ui/button'
import { ART_SOURCES } from '@/lib/art-assets'
import { CONFETTI } from '../constants'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { useDailyRewards } from '@/features/DailyRewards/hooks/useDailyRewards'

interface Props {
  score: number
  avatar: AvatarOption
  level: number
  rescuedBears?: number
  onContinue: () => void
}

export default function VictoryCelebration({
  score,
  avatar,
  level,
  rescuedBears,
  onContinue,
}: Props) {
  const reduced = useReducedMotion()
  const hasReward = useDailyRewards((s) => s.days.some((day) => !day.prize))
  return (
    <div className="board-overlay victory-overlay" data-reduced={reduced || undefined}>
      <div className="victory-rays" aria-hidden="true" />
      {!reduced && (
        <div className="victory-confetti" aria-hidden="true">
          {CONFETTI.map((piece, index) => (
            <i
              key={index}
              style={
                {
                  left: piece.left,
                  backgroundColor: piece.color,
                  animationDelay: piece.delay,
                  animationDuration: piece.duration,
                  '--drift': piece.drift,
                  '--spin': piece.rotation,
                } as CSSProperties
              }
            />
          ))}
        </div>
      )}
      <div className="victory-emblem" aria-hidden="true">
        {rescuedBears ? (
          <img className="victory-trophy victory-bear" src={ART_SOURCES.bear.src} alt="" />
        ) : (
          <Trophy className="victory-trophy" />
        )}
        <div className="victory-avatar">
          <Avatar avatar={avatar} />
        </div>
      </div>
      <h2>
        <output>{rescuedBears ? 'Bears rescued!' : 'You did it!'}</output>
      </h2>
      <p className="victory-score">{score.toLocaleString()} points</p>
      <p>Level {level} complete. Progress saved!</p>
      {hasReward && (
        <Button nativeButton={false} render={<Link to="/rewards" />} className="candy-button">
          Choose my daily reward
        </Button>
      )}
      <Button className="candy-button" onClick={onContinue}>
        Level {level + 1} <Play />
      </Button>
    </div>
  )
}
