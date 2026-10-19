import type { MedicineId } from '@/game/medicines'

export type DemoRole = 'patient' | 'medical' | 'parent'
export type DemoPrize = 'book' | 'movie' | 'toy' | 'ice-cream' | 'bakery' | 'shoes'
export interface DemoRoom {
  room: string
  revision: number
  medicines: MedicineId[]
  time: string
  prizes: DemoPrize[]
  checked_in: boolean
  won: boolean
  won_on: string | null
  won_level: number
  claimed: DemoPrize | null
  received: boolean
}
export type DemoCommand =
  | { action: 'plan'; role: 'medical'; medicines: MedicineId[]; time: string }
  | { action: 'prizes'; role: 'parent'; prizes: DemoPrize[] }
  | { action: 'check-in' | 'win'; role: 'patient'; level?: number }
  | { action: 'claim'; role: 'patient'; prize: DemoPrize }
  | { action: 'receive'; role: 'parent' }
export interface Props {
  room?: string
  role?: string
  playing?: boolean
}
