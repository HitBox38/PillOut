import { Gift } from 'lucide-react'
import { Artwork } from '@/components/artwork'
import type { Prize } from '../types'

export default function PrizeArt({ prize }: { prize?: Prize | null }) {
  return prize?.crop ? (
    <Artwork source="prizes" crop={prize.crop} className="prize-art" />
  ) : (
    <span className="prize-gift" aria-hidden="true">
      <Gift />
    </span>
  )
}
