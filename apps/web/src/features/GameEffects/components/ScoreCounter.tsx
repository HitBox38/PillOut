import { useLayoutEffect, useRef, useState } from 'react'
import { useGameStore } from '@/game/store'
import { EFFECT_EASE } from '../constants'
import { useReducedMotion } from '../hooks/useReducedMotion'

export default function ScoreCounter({ score }: { score: number }) {
  const value = useRef<HTMLSpanElement>(null)
  const gain = useRef<HTMLSpanElement>(null)
  const [initial] = useState(() => score.toLocaleString())
  const displayed = useRef(score)
  const previous = useRef(score)
  const interruptedTransform = useRef('scale(1)')
  const paused = useGameStore((state) => state.paused)
  const reduced = useReducedMotion()

  useLayoutEffect(() => {
    const number = value.current
    const reward = gain.current
    const trophy = number?.closest('.goal-stat')?.querySelector('svg')
    const before = previous.current
    previous.current = score
    if (!number || !reward) return

    const settle = () => {
      displayed.current = score
      number.textContent = score.toLocaleString()
    }
    if (score <= before || paused) {
      settle()
      interruptedTransform.current = 'scale(1)'
      return
    }

    const from = displayed.current
    if (reduced) settle()
    const pulse = number.animate(
      reduced
        ? [{ opacity: 0.65 }, { opacity: 1 }]
        : [
            { transform: interruptedTransform.current },
            { transform: 'scale(1.06)', offset: 0.35 },
            { transform: 'scale(1)' },
          ],
      { duration: reduced ? 180 : 250, easing: EFFECT_EASE },
    )
    reward.textContent = `+${(score - before).toLocaleString()}`
    const rewardAnimation = reward.animate(
      [
        {
          opacity: 0,
          transform: reduced ? 'none' : 'translateY(20%) scale(0.97)',
          easing: EFFECT_EASE,
        },
        { opacity: 1, transform: 'none', offset: 0.2 },
        { opacity: 1, transform: 'none', offset: 0.7, easing: EFFECT_EASE },
        { opacity: 0, transform: reduced ? 'none' : 'translateY(-35%)' },
      ],
      { duration: 480 },
    )
    const trophyAnimation = trophy?.animate(
      [
        { opacity: 1, easing: EFFECT_EASE },
        { opacity: 0, offset: 0.2 },
        { opacity: 0, offset: 0.7, easing: EFFECT_EASE },
        { opacity: 1 },
      ],
      { duration: 480 },
    )

    let frame = 0
    const tick = () => {
      // Use the pulse's eased timeline so the tally and its feedback land together.
      const progress = pulse.effect?.getComputedTiming().progress ?? 0
      displayed.current = Math.round(from + (score - from) * progress)
      number.textContent = displayed.current.toLocaleString()
      if (pulse.playState !== 'finished') frame = requestAnimationFrame(tick)
      else settle()
    }
    if (!reduced) frame = requestAnimationFrame(tick)
    return () => {
      interruptedTransform.current = getComputedStyle(number).transform
      cancelAnimationFrame(frame)
      pulse.cancel()
      rewardAnimation.cancel()
      trophyAnimation?.cancel()
    }
  }, [score, paused, reduced])

  return (
    <span className="score-readout">
      <strong>
        <span className="sr-only">{score.toLocaleString()}</span>
        <span className="score-value" ref={value} aria-hidden="true">
          {initial}
        </span>
      </strong>
      <span className="score-gain" ref={gain} aria-hidden="true" />
    </span>
  )
}
