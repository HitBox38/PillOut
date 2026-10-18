import { create } from 'zustand'
import { useGameStore } from '@/game/store'
import type { MedicineId } from '@/game/medicines'
import type { PillSchedule } from '../types'

interface PlayerState {
  name: string
  surname: string
  nickname: string
  avatar: string
  patientName: string
  selectedPills: MedicineId[]
  schedules: Record<string, PillSchedule>
  update: (
    values: Partial<Pick<PlayerState, 'name' | 'surname' | 'nickname' | 'avatar' | 'patientName'>>,
  ) => void
  togglePill: (id: MedicineId) => void
  updateSchedule: (id: string, values: Partial<PillSchedule>) => void
}

// Personal information is kept only in memory, never written to device storage.
export const usePlayerSetup = create<PlayerState>((set, get) => ({
  name: '',
  surname: '',
  nickname: '',
  avatar: 'dog',
  patientName: '',
  selectedPills: [],
  schedules: {},
  update: (values) => set(values),
  togglePill: (id) => {
    set((state) => ({
      selectedPills: state.selectedPills.includes(id)
        ? state.selectedPills.filter((pill) => pill !== id)
        : [...state.selectedPills, id],
    }))
    useGameStore.getState().setMedicines(get().selectedPills)
  },
  updateSchedule: (id, values) =>
    set((state) => ({
      schedules: {
        ...state.schedules,
        [id]: { ...(state.schedules[id] ?? { time: '', quantity: '' }), ...values },
      },
    })),
}))
