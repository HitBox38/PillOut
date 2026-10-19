import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { DEFAULT_PRIZES, PRIZES } from '../constants'
import { useDailyRewards } from './useDailyRewards'
import type { CaregiverRewards, Prize } from '../types'

export function usePrizeChoices(caregiver?: CaregiverRewards) {
  const navigate = useNavigate()
  const [selected, setSelected] = useState(() => {
    const saved = caregiver?.prizes ?? useDailyRewards.getState().prizes
    return saved.length ? saved : DEFAULT_PRIZES
  })
  const [adding, setAdding] = useState(false)
  const [customPrizes, setCustomPrizes] = useState(() =>
    selected.filter((prize) => prize.id.startsWith('custom-')),
  )
  const options = [...PRIZES, ...customPrizes]
  return {
    selected,
    options,
    adding,
    setAdding,
    selectAll: () => setSelected(options),
    toggle: (prize: Prize) =>
      setSelected((previous) =>
        previous.some((p) => p.id === prize.id)
          ? previous.filter((p) => p.id !== prize.id)
          : [...previous, prize],
      ),
    add: (prize: Prize) => {
      setCustomPrizes((previous) => [...previous, prize])
      setSelected((previous) => [...previous, prize])
      setAdding(false)
    },
    save: async () => {
      if (caregiver) {
        if (await caregiver.onSave(selected)) caregiver.onBack()
        return
      }
      useDailyRewards.getState().savePrizes(selected)
      void navigate({ to: '/rewards' })
    },
  }
}
