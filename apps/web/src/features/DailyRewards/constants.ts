import type { Prize } from './types'

export const PRIZES: readonly Prize[] = [
  { id: 'bakery', name: 'Bakery treat', crop: [33, 742, 193, 124] },
  { id: 'book', name: 'Book', crop: [275, 742, 193, 124] },
  { id: 'movie', name: 'Movie', crop: [512, 742, 193, 124] },
  { id: 'toy', name: 'Toy', crop: [33, 993, 193, 125] },
  { id: 'shoes', name: 'Shoes', crop: [275, 993, 193, 125] },
  { id: 'ice-cream', name: 'Ice cream', crop: [512, 993, 193, 125] },
]

export const MILESTONES = [8, 15, 22, 30] as const
export const REWARD_STORAGE_KEY = 'pillout-daily-rewards'
export const DEFAULT_PRIZES = PRIZES.filter((prize) =>
  ['book', 'toy', 'ice-cream'].includes(prize.id),
)
