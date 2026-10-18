export type SetupStep = 'welcome' | 'pills' | 'schedule'
export interface Props {
  step: SetupStep
}
export interface PillOption {
  id: MedicineId
  name: string
  crop: readonly [number, number, number, number]
}
export interface PillSchedule {
  time: string
  quantity: string
}
import type { MedicineId } from '@/game/medicines'
