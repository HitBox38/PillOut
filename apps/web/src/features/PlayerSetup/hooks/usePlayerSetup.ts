import { create } from 'zustand'
import { useGameStore } from '@/game/store'
import { ApiError } from '@/lib/api'
import type { MedicineId } from '@/game/medicines'
import type { CatalogAvatar, CatalogPill, PillSchedule } from '../types'
import { loadCatalogs, loadPlayer, savePlayer } from '../api'
import { getSavedPlayerId, rememberPlayerId } from '../helpers'

interface PlayerState {
  userId: number | null
  pills: CatalogPill[]
  avatars: CatalogAvatar[]
  catalogStatus: 'idle' | 'loading' | 'ready' | 'error'
  catalogError: string | null
  saveStatus: 'idle' | 'saving' | 'error'
  saveError: string | null
  restoreStatus: 'idle' | 'loading' | 'ready' | 'error'
  loadCatalogs: () => Promise<void>
  restoreProfile: () => Promise<void>
  saveProfile: () => Promise<boolean>
  name: string
  surname: string
  nickname: string
  avatar: string
  patientName: string
  patientId: number | null
  selectPatient: (id: number, name: string) => void
  selectedPills: MedicineId[]
  schedules: Record<string, PillSchedule>
  update: (
    values: Partial<Pick<PlayerState, 'name' | 'surname' | 'nickname' | 'avatar' | 'patientName'>>,
  ) => void
  togglePill: (id: MedicineId) => void
  updateSchedule: (id: string, values: Partial<PillSchedule>) => void
}

let catalogRequest: Promise<void> | null = null

// Remember only the saved identity; drafts and patient plans stay in memory.
export const usePlayerSetup = create<PlayerState>((set, get) => ({
  userId: getSavedPlayerId(),
  pills: [],
  avatars: [],
  catalogStatus: 'idle',
  catalogError: null,
  saveStatus: 'idle',
  saveError: null,
  restoreStatus: 'idle',
  loadCatalogs: async () => {
    if (get().catalogStatus === 'ready') return
    if (catalogRequest) return catalogRequest
    set({ catalogStatus: 'loading', catalogError: null })
    catalogRequest = (async () => {
      try {
        const catalogs = await loadCatalogs()
        const avatar = catalogs.avatars.some((option) => option.id === get().avatar)
          ? get().avatar
          : catalogs.avatars[0]!.id
        set({ ...catalogs, avatar, catalogStatus: 'ready' })
      } catch (error) {
        set({
          catalogStatus: 'error',
          catalogError: error instanceof Error ? error.message : 'Could not load player choices.',
        })
      } finally {
        catalogRequest = null
      }
    })()
    return catalogRequest
  },
  restoreProfile: async () => {
    const { userId, restoreStatus } = get()
    if (userId === null || restoreStatus === 'loading' || restoreStatus === 'ready') return
    set({ restoreStatus: 'loading' })
    try {
      await get().loadCatalogs()
      if (get().catalogStatus !== 'ready') {
        set({ restoreStatus: 'error' })
        return
      }
      const { id, ...profile } = await loadPlayer(userId, get().avatars)
      set({ ...profile, userId: id, restoreStatus: 'ready' })
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        rememberPlayerId(null)
        set({ userId: null })
      }
      set({ restoreStatus: 'error' })
    }
  },
  saveProfile: async () => {
    const draft = get()
    if (draft.saveStatus === 'saving') return false
    const avatar = draft.avatars.find((option) => option.id === draft.avatar)
    if (!avatar || !draft.name.trim() || !draft.surname.trim() || !draft.nickname.trim()) {
      set({ saveStatus: 'error', saveError: 'Enter your player details and choose an avatar.' })
      return false
    }
    set({ saveStatus: 'saving', saveError: null })
    try {
      const saved = await savePlayer(draft, avatar.databaseId, draft.userId)
      // Retain the ID before read-back: a failed read can be retried without creating another user.
      set({ userId: saved.id })
      rememberPlayerId(saved.id)
      const { id, ...profile } = await loadPlayer(saved.id, draft.avatars)
      set({ ...profile, userId: id, saveStatus: 'idle', restoreStatus: 'ready' })
      return true
    } catch (error) {
      set({
        saveStatus: 'error',
        saveError: error instanceof Error ? error.message : 'Could not save your player.',
      })
      return false
    }
  },
  name: '',
  surname: '',
  nickname: '',
  avatar: 'dog',
  patientName: '',
  patientId: null,
  selectPatient: (id, patientName) => {
    if (get().patientId === id) {
      set({ patientName })
      return
    }
    set({ patientId: id, patientName, selectedPills: [], schedules: {} })
    useGameStore.getState().setMedicines([])
  },
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
