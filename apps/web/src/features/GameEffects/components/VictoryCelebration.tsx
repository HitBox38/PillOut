import { useState } from 'react'
import type { CSSProperties } from 'react'
import { Play, Trophy } from 'lucide-react'
import { Avatar } from '@/features/PlayerSetup/components/Avatar'
import type { AvatarOption } from '@/features/PlayerSetup/types'
import { Button } from '@/components/ui/button'
import { CONFETTI } from '../constants'
import { useReducedMotion } from '../hooks/useReducedMotion'

interface Props {
  score: number
  avatar: AvatarOption
  onReplay: () => void
}

export default function VictoryCelebration({ score, avatar, onReplay }: Props) {
  const reduced = useReducedMotion()
  const [skipped, setSkipped] = useState(false)
  return (
    <div
      className="board-overlay victory-overlay"
      data-reduced={reduced || undefined}
      data-skipped={skipped || undefined}
    >
      <div className="victory-rays" aria-hidden="true" />
      {!reduced && !skipped && (
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
      <Button
        variant="ghost"
        className="victory-skip"
        onClick={() => setSkipped(true)}
        aria-label="Finish celebration"
      >
        Skip
      </Button>
      <div className="victory-emblem" aria-hidden="true">
        <Trophy className="victory-trophy" />
        <div className="victory-avatar">
          <Avatar avatar={avatar} />
        </div>
      </div>
      <h2>
        <output>You did it!</output>
      </h2>
      <p className="victory-score">{score.toLocaleString()} points</p>
      <p>Goal complete. Every match mattered!</p>
      <Button className="candy-button" onClick={onReplay}>
        Play again <Play />
      </Button>
    </div>
  )
}
