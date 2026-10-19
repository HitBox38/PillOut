import { useEffect, useRef } from 'react'
import { SIZE } from '@/game/engine'
import type { ClearWave } from '@/game/effects'
import { EFFECT_EASE } from '../constants'

interface Props {
  wave: ClearWave
  reducedMotion: boolean
}

export default function GoalComets({ wave, reducedMotion }: Props) {
  const host = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const layer = host.current
    const screen = layer?.closest('.game-screen')
    const board = screen?.querySelector('.board-surface')
    const goal = screen?.querySelector('.goal-stat')
    if (!layer || !board || !goal || Date.now() - wave.startedAt > 1000) return
    const animations: Animation[] = []
    const elapsed = Date.now() - wave.startedAt
    if (!reducedMotion) {
      const bounds = layer.getBoundingClientRect()
      const source = board.getBoundingClientRect()
      const target = goal.getBoundingClientRect()
      const tx = target.x + target.width / 2 - bounds.x
      const ty = target.y + target.height / 2 - bounds.y
      const origins = wave.rescuedBears?.length ? wave.rescuedBears : wave.clearing
      const center = wave.rescuedBears?.length ? 1 : 0.5
      origins.slice(0, 9).forEach((index, i) => {
        const x = source.x + (((index % SIZE) + center) * source.width) / SIZE - bounds.x
        const y = source.y + ((Math.floor(index / SIZE) + center) * source.height) / SIZE - bounds.y
        const comet = document.createElement('span')
        comet.className = 'goal-comet'
        layer.append(comet)
        const animation = comet.animate(
          [
            { transform: `translate(${x}px, ${y}px) scale(0.9)`, opacity: 0 },
            {
              transform: `translate(${x + 15}px, ${y - 25}px) scale(1.2)`,
              opacity: 1,
              offset: 0.2,
            },
            { transform: `translate(${tx}px, ${ty}px) scale(0.9)`, opacity: 0 },
          ],
          { duration: 480, delay: 80 + i * 20 - elapsed, easing: EFFECT_EASE, fill: 'both' },
        )
        animation.onfinish = () => comet.remove()
        animations.push(animation)
      })
    }
    return () => {
      animations.forEach((animation) => animation.cancel())
      layer.replaceChildren()
    }
  }, [wave, reducedMotion])
  return <div className="game-effects-layer" ref={host} aria-hidden="true" />
}
