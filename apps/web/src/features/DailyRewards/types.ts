import type { SpriteFrame } from '@/lib/art-assets'

export interface Prize {
  id: string
  name: string
  crop?: SpriteFrame
}

export interface RewardDay {
  date: string
  level: number
  prize: Prize | null
  received: boolean
}

export interface RewardProgress {
  days: RewardDay[]
  prizes: Prize[]
}

export interface Props {
  view?: 'calendar' | 'choices'
}
