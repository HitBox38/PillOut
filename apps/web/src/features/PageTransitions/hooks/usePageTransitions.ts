import { useCallback, useEffect, useRef } from 'react'
import { useRouter } from '@tanstack/react-router'
import { useReducedMotion } from '@/features/GameEffects/hooks/useReducedMotion'
import {
  ENTER_DISTANCE,
  ENTER_DURATION,
  FADE_DURATION,
  PAGE_PATHS,
  REDUCED_DURATION,
  SETUP_PATHS,
} from '../constants'
import type { CaptureNavigationMotion } from '../types'

export function usePageTransitions() {
  const main = useRef<HTMLElement>(null)
  const router = useRouter()
  const reducedMotion = useReducedMotion()
  const pointerInput = useRef(false)
  const nextNavigation = useRef<boolean | undefined>(undefined)

  const captureNavigationMotion: CaptureNavigationMotion = useCallback(() => {
    const pointer = pointerInput.current
    return (navigate) => {
      nextNavigation.current = pointer
      navigate()
    }
  }, [])

  useEffect(() => {
    let animateNavigation = false
    let animation: Animation | undefined
    let heldAnimation: Animation | undefined
    let heldPointer: number | undefined
    let releaseTimer: ReturnType<typeof setTimeout> | undefined

    const resume = () => {
      clearTimeout(releaseTimer)
      heldAnimation?.play()
      heldAnimation = undefined
      heldPointer = undefined
    }

    const cancel = () => {
      clearTimeout(releaseTimer)
      heldAnimation = undefined
      heldPointer = undefined
      animation?.cancel()
      animation = undefined
    }
    const onPointerDown = (event: PointerEvent) => {
      if (!event.isPrimary || event.button !== 0) return
      pointerInput.current = true
      if (
        animation &&
        (animation.playState === 'running' || animation.playState === 'paused') &&
        event.target instanceof Node &&
        main.current?.contains(event.target)
      ) {
        // Keep hit geometry fixed until the browser has dispatched the click.
        clearTimeout(releaseTimer)
        heldAnimation = animation
        heldPointer = event.pointerId
        animation.pause()
      }
    }
    const onPointerEnd = (event: PointerEvent) => {
      if (event.pointerId !== heldPointer) return
      clearTimeout(releaseTimer)
      // A release/cancel need not produce a click (for example, after a drag).
      releaseTimer = setTimeout(resume, 0)
    }
    const onKeyDown = () => {
      pointerInput.current = false
      cancel()
    }
    const onClick = (event: MouseEvent) => {
      // Keyboard and assistive-technology clicks may have no preceding keydown.
      if (event.detail === 0) onKeyDown()
      else resume()
    }

    document.addEventListener('pointerdown', onPointerDown, true)
    document.addEventListener('pointerup', onPointerEnd, true)
    document.addEventListener('pointercancel', onPointerEnd, true)
    document.addEventListener('keydown', onKeyDown, true)
    document.addEventListener('click', onClick, true)
    window.addEventListener('blur', resume)
    const unsubscribeBeforeNavigate = router.subscribe('onBeforeNavigate', () => {
      animateNavigation = nextNavigation.current ?? pointerInput.current
      nextNavigation.current = undefined
      cancel()
    })
    const unsubscribeRendered = router.subscribe(
      'onRendered',
      ({ fromLocation, toLocation, pathChanged }) => {
        const from = fromLocation?.pathname
        const to = toLocation.pathname
        if (!animateNavigation || !pathChanged || !from || !main.current) return
        if (!PAGE_PATHS.includes(from) || !PAGE_PATHS.includes(to)) return

        // Animate the form, leaving the setup logo and back control untouched.
        const form = main.current.querySelector<HTMLElement>('.setup-form')
        const target = form ?? main.current.querySelector<HTMLElement>('.mobile-screen')
        if (!target?.animate) return

        const fromStep = SETUP_PATHS.indexOf(from)
        const toStep = SETUP_PATHS.indexOf(to)
        const directional = Boolean(form) && fromStep >= 0 && toStep >= 0 && !reducedMotion
        const distance = directional ? (toStep > fromStep ? ENTER_DISTANCE : -ENTER_DISTANCE) : 0

        cancel()
        animation = target.animate(
          directional
            ? [
                { opacity: 0.85, transform: `translateX(${distance}px)` },
                { opacity: 1, transform: 'translateX(0)' },
              ]
            : [{ opacity: 0.85 }, { opacity: 1 }],
          {
            duration: reducedMotion
              ? REDUCED_DURATION
              : directional
                ? ENTER_DURATION
                : FADE_DURATION,
            easing: getComputedStyle(main.current).getPropertyValue('--ease-out').trim(),
          },
        )
      },
    )

    return () => {
      cancel()
      unsubscribeBeforeNavigate()
      unsubscribeRendered()
      document.removeEventListener('pointerdown', onPointerDown, true)
      document.removeEventListener('pointerup', onPointerEnd, true)
      document.removeEventListener('pointercancel', onPointerEnd, true)
      document.removeEventListener('keydown', onKeyDown, true)
      document.removeEventListener('click', onClick, true)
      window.removeEventListener('blur', resume)
    }
  }, [router, reducedMotion])

  return { main, captureNavigationMotion }
}
