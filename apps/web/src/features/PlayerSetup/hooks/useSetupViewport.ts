import { useSyncExternalStore } from 'react'

function subscribe(refresh: () => void) {
  window.addEventListener('resize', refresh)
  window.visualViewport?.addEventListener('resize', refresh)
  return () => {
    window.removeEventListener('resize', refresh)
    window.visualViewport?.removeEventListener('resize', refresh)
  }
}

export function useSetupViewport() {
  return useSyncExternalStore(
    subscribe,
    () => window.visualViewport?.height ?? window.innerHeight,
    () => 568,
  )
}
