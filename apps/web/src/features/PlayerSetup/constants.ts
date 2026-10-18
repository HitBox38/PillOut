import type { PillOption } from './types'
import { MEDICINE_ART } from '@/lib/art-assets'
import { MEDICINE_IDS } from '@/game/medicines'

export const AVATARS = [
  { id: 'dog', name: 'Dog', crop: [10, 10, 434, 433] },
  { id: 'cat', name: 'Cat', crop: [472, 8, 380, 438] },
  { id: 'bear', name: 'Bear', crop: [854, 49, 434, 401] },
  { id: 'lion', name: 'Lion', crop: [1303, 0, 463, 453] },
  { id: 'rabbit', name: 'Rabbit', crop: [108, 446, 336, 436] },
  { id: 'penguin', name: 'Penguin', crop: [480, 478, 391, 406] },
  { id: 'fox', name: 'Fox', crop: [932, 452, 376, 432] },
] as const

export const PILLS: PillOption[] = MEDICINE_IDS.map((id) => ({
  id,
  name: MEDICINE_ART[id].label,
  crop: MEDICINE_ART[id].crop,
}))
