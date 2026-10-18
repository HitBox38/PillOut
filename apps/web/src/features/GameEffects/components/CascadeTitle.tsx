import type { CSSProperties } from 'react'
import { useEffect, useRef } from 'react'
import type { ClearWave } from '@/game/effects'
import { useReducedMotion } from '../hooks/useReducedMotion'

export default function CascadeTitle({ wave }: { wave: ClearWave }) {
  const reduced = useReducedMotion()
  const host = useRef<HTMLSpanElement>(null)
  const label = `${wave.combo}× ${wave.combo >= 5 ? 'AMAZING!' : 'CASCADE!'}`
  useEffect(() => {
    const elapsed = Date.now() - wave.startedAt
    host.current?.getAnimations({ subtree: true }).forEach((animation) => {
      animation.currentTime = elapsed
    })
  }, [wave])
  return (
    <span
      className="cascade-title"
      ref={host}
      data-reduced={reduced || undefined}
      data-epic={wave.combo >= 5 || undefined}
    >
      <span className="sr-only">{label}</span>
      <span aria-hidden="true">
        {[...label].map((letter, index) => (
          <span key={index} style={{ animationDelay: `${index * 14}ms` } as CSSProperties}>
            {letter === ' ' ? '\u00a0' : letter}
          </span>
        ))}
      </span>
    </span>
  )
}
