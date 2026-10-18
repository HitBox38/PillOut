import { useEffect, useRef } from 'react'
import { useNavigationMotion } from '@/features/PageTransitions'
import { usePlayerSetup } from './usePlayerSetup'

export function useWelcome(onNext: () => void) {
  const active = useRef(false)
  const captureNavigationMotion = useNavigationMotion()
  useEffect(() => {
    active.current = true
    return () => {
      active.current = false
    }
  }, [])

  return async () => {
    const navigate = captureNavigationMotion()
    if (await usePlayerSetup.getState().saveProfile()) {
      if (active.current) navigate(onNext)
    }
  }
}
