import { useEffect, useRef } from 'react'
import { useGameStore } from '@/game/store'
import { EFFECT_EASE } from '@/features/GameEffects/constants'
import { useReducedMotion } from '@/features/GameEffects/hooks/useReducedMotion'

export function useGoalReceipt(rescued: number, required: number) {
  const icon = useRef<HTMLImageElement>(null)
  const animation = useRef<Animation | null>(null)
  const wave = useGameStore((state) => state.wave)
  const session = useGameStore((state) => state.session)
  const paused = useGameStore((state) => state.paused)
  const reduced = useReducedMotion()
  // Mounting during a wave must not replay an old collection.
  const lastWave = useRef(wave?.id)

  useEffect(() => () => animation.current?.cancel(), [session, paused, reduced])

  useEffect(() => {
    if (lastWave.current === wave?.id) return
    lastWave.current = wave?.id
    if (!wave?.rescuedBears?.length) return
    animation.current?.cancel()
    if (
      paused ||
      wave.input !== 'pointer' ||
      rescued >= required ||
      !icon.current?.animate ||
      Date.now() - wave.startedAt > 180
    )
      return
    animation.current = icon.current.animate(
      reduced
        ? [{ opacity: 0.7 }, { opacity: 1 }]
        : [
            { transform: 'scale(0.97)', opacity: 0.7 },
            { transform: 'scale(1)', opacity: 1 },
          ],
      { duration: reduced ? 120 : 180, easing: EFFECT_EASE },
    )
  }, [wave, paused, reduced, rescued, required])

  return icon
}
