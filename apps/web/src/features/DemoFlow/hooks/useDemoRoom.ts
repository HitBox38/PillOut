import { useEffect } from 'react'
import { readRoom } from '../api'
import { useDemoStore } from './useDemoStore'

export function useDemoRoom(code: string) {
  const current = useDemoStore((state) => (state.current?.room === code ? state.current : null))
  const error = useDemoStore((state) => state.error)
  const connectionError = useDemoStore((state) => state.connectionError)
  const pending = useDemoStore((state) => state.pending)
  const send = useDemoStore((state) => state.send)
  useEffect(() => {
    useDemoStore.getState().enter(code)
    const controller = new AbortController()
    let inFlight = false
    const refresh = async () => {
      if (inFlight) return
      inFlight = true
      try {
        const room = await readRoom(code, controller.signal)
        if (controller.signal.aborted) return
        const store = useDemoStore.getState()
        store.accept(room)
        store.connection(code, null)
        if (!room.won && room.checked_in && store.pendingWins[code]) {
          void store.send({ action: 'win', role: 'patient', level: store.pendingWins[code] })
        }
      } catch (error) {
        if (!controller.signal.aborted)
          useDemoStore
            .getState()
            .connection(code, error instanceof Error ? error.message : 'Could not connect.')
      } finally {
        inFlight = false
      }
    }
    void refresh()
    const timer = setInterval(() => void refresh(), 2000)
    return () => {
      controller.abort()
      clearInterval(timer)
    }
  }, [code])
  return { current, pending, error, connectionError, send }
}
