import { useEffect, useRef } from 'react'
import { usePlayerSetup } from './usePlayerSetup'

export function useWelcome(onNext: () => void) {
  const active = useRef(false)
  useEffect(() => {
    active.current = true
    return () => {
      active.current = false
    }
  }, [])

  return async () => {
    if (await usePlayerSetup.getState().saveProfile()) {
      if (active.current) onNext()
    }
  }
}
