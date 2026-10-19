import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { ApiError } from '@/lib/api'
import { readRoom, updateRoom } from '../api'
import type { DemoCommand, DemoRoom } from '../types'

interface State {
  activeCode: string | null
  enter: (code: string) => void
  pendingWins: Record<string, number>
  queueWin: (code: string, level: number) => void
  current: DemoRoom | null
  error: string | null
  pending: boolean
  connectionError: string | null
  connection: (code: string, error: string | null) => void
  accept: (room: DemoRoom) => void
  send: (command: DemoCommand) => Promise<boolean>
}
export const useDemoStore = create<State>()(
  persist(
    (set, get) => ({
      activeCode: null,
      connectionError: null,
      connection: (code, connectionError) => {
        if (get().activeCode === code) set({ connectionError })
      },
      enter: (code) =>
        set((state) => ({
          activeCode: code,
          current: state.current?.room === code ? state.current : null,
          error: null,
          connectionError: null,
        })),
      pendingWins: {},
      queueWin: (code, level) => {
        set((state) => ({ pendingWins: { ...state.pendingWins, [code]: level } }))
        if (get().current?.room === code) void get().send({ action: 'win', role: 'patient', level })
      },
      current: null,
      error: null,
      pending: false,
      accept: (room) =>
        set((state) =>
          state.activeCode !== room.room
            ? state
            : {
                current:
                  !state.current ||
                  state.current.room !== room.room ||
                  room.revision > state.current.revision
                    ? room
                    : state.current,
                pendingWins: room.won
                  ? Object.fromEntries(
                      Object.entries(state.pendingWins).filter(([code]) => code !== room.room),
                    )
                  : state.pendingWins,
              },
        ),
      send: async (command) => {
        const { current, pending } = get()
        if (!current || pending) return false
        set({ pending: true, error: null })
        try {
          get().accept(await updateRoom(current, command))
          return true
        } catch (error) {
          if (error instanceof ApiError && error.status === 409) {
            try {
              get().accept(await readRoom(current.room))
            } catch {
              /* Keep the actionable save error. */
            }
          }
          if (get().activeCode === current.room)
            set({ error: error instanceof Error ? error.message : 'Could not save. Please retry.' })
          return false
        } finally {
          set({ pending: false })
        }
      },
    }),
    {
      name: 'pillout-demo-pending-wins',
      storage: createJSONStorage(() => sessionStorage),
      partialize: ({ pendingWins }) => ({ pendingWins }),
    },
  ),
)
