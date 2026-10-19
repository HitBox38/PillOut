import { Gift } from 'lucide-react'
import { Artwork } from '@/components/artwork'
import type { Prize } from '../types'
import type { CSSProperties } from 'react'

export default function PrizeArt({ prize }: { prize?: Prize | null }) {
  return prize?.crop ? (
    <span
      className="prize-art-space"
      aria-hidden="true"
      style={{ '--prize-ratio': prize.crop[2] / prize.crop[3] } as CSSProperties}
    >
      <Artwork source="prizes" crop={prize.crop} className="prize-art" />
    </span>
  ) : (
    <span className="prize-gift" aria-hidden="true">
      <Gift />
    </span>
  )
}
