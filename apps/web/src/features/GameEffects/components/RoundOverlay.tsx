import { useState } from 'react'
import type { MouseEventHandler } from 'react'
import { Pause, Play, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  open: boolean
  lost: boolean
  animate: boolean
  message: string
  level: number
  bonusMoves: number
  onResume: MouseEventHandler<HTMLButtonElement>
  onRetry: MouseEventHandler<HTMLButtonElement>
}

export default function RoundOverlay({
  open,
  lost,
  animate,
  message,
  level,
  bonusMoves,
  onResume,
  onRetry,
}: Props) {
  // Keep the last visible contents through an exit, including an immediate round reset.
  const [content, setContent] = useState({ lost, message, level, bonusMoves })
  if (
    open &&
    (content.lost !== lost ||
      content.message !== message ||
      content.level !== level ||
      content.bonusMoves !== bonusMoves)
  )
    setContent({ lost, message, level, bonusMoves })

  return (
    <div
      className="board-overlay round-overlay"
      data-open={open || undefined}
      data-motion={animate ? 'pointer' : 'instant'}
      inert={!open}
      aria-hidden={!open}
    >
      {content.lost ? <RotateCcw size={40} /> : <Pause size={40} />}
      <h2>{content.lost ? `Level ${content.level} · Try again?` : 'Taking a little break'}</h2>
      <p>{content.message}</p>
      {content.lost && content.bonusMoves > 0 && (
        <p>Next try: +{content.bonusMoves} extra moves. Same goal!</p>
      )}
      <Button className="candy-button" onClick={lost ? onRetry : onResume}>
        {content.lost ? `Retry level ${content.level}` : 'Keep playing'} <Play />
      </Button>
    </div>
  )
}
