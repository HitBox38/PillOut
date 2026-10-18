import { Artwork } from '@/components/artwork'
import type { AVATARS } from '../constants'

export function Avatar({ avatar }: { avatar: (typeof AVATARS)[number] }) {
  const [, , width, height] = avatar.crop

  return (
    <span className="avatar-artwork" aria-hidden="true">
      <span style={{ width: `${Math.min(1, width / height) * 100}%` }}>
        <Artwork source="avatars" crop={avatar.crop} />
      </span>
    </span>
  )
}
