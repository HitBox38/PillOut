import { useSyncExternalStore } from 'react'
import { useGameStore } from '@/game/store'
import { systemReducesMotion } from '@/game/effects'

function subscribe(listener: () => void) {
  const query = window.matchMedia('(prefers-reduced-motion: reduce)')
  query.addEventListener('change', listener)
  return () => query.removeEventListener('change', listener)
}

export function useReducedMotion() {
  const preference = useGameStore((state) => state.reducedMotion)
  const system = useSyncExternalStore(subscribe, systemReducesMotion, () => true)
  return preference || system
}
