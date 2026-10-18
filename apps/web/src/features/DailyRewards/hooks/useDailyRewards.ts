import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { REWARD_STORAGE_KEY } from '../constants'
import { earnReward, restoreRewards } from '../helpers'
import type { Prize, RewardProgress } from '../types'

interface RewardsState extends RewardProgress {
  recordWin: (level: number) => void
  claim: (date: string, prizeId: string) => boolean
  savePrizes: (prizes: Prize[]) => void
  markReceived: (date: string) => void
}

export const useDailyRewards = create<RewardsState>()(
  persist(
    (set, get) => ({
      days: [],
      prizes: [],
      recordWin: (level) => {
        const days = earnReward(get().days, level)
        if (days !== get().days) set({ days })
      },
      claim: (date, prizeId) => {
        const state = get()
        const index = state.days.findIndex((day) => !day.prize)
        const prize = state.prizes.find((option) => option.id === prizeId)
        if (index < 0 || state.days[index]?.date !== date || !prize) return false
        set({
          days: state.days.map((day, i) => (i === index ? { ...day, prize: { ...prize } } : day)),
        })
        return true
      },
      savePrizes: (prizes) => {
        const restored = restoreRewards({ prizes }, get()).prizes
        if (restored.length > 0) set({ prizes: restored })
      },
      markReceived: (date) =>
        set((state) => ({
          days: state.days.map((day) =>
            day.date === date && day.prize ? { ...day, received: true } : day,
          ),
        })),
    }),
    {
      name: REWARD_STORAGE_KEY,
      version: 1,
      partialize: ({ days, prizes }) => ({ days, prizes }),
      merge: (saved, current) => ({ ...current, ...restoreRewards(saved, current) }),
    },
  ),
)
