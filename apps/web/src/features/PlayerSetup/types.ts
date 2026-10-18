export type SetupStep = 'welcome' | 'pills' | 'schedule'
export interface Props {
  step: SetupStep
}
export interface PillOption {
  id: MedicineId
  name: string
  crop: readonly [number, number, number, number]
}
export interface AvatarOption {
  id: string
  name: string
  crop: readonly [number, number, number, number]
}
export interface CatalogPill extends PillOption {
  databaseId: number
}
export interface CatalogAvatar extends AvatarOption {
  databaseId: number
}
export interface PlayerProfile {
  id: number
  name: string
  surname: string
  nickname: string
  avatar: string
}
export interface UserResponse {
  id: number
  first_name: string
  last_name: string
  nickname: string | null
  avatar_id: number | null
}
export interface PillSchedule {
  time: string
  quantity: string
}
import type { MedicineId } from '@/game/medicines'
