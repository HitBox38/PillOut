import { Artwork } from '@/components/artwork'
import type { AvatarOption } from '../types'

export function Avatar({ avatar }: { avatar: AvatarOption }) {
  const [, , width, height] = avatar.crop

  return (
    <span className="avatar-artwork" aria-hidden="true">
      <span style={{ width: `${Math.min(1, width / height) * 100}%` }}>
        <Artwork source="avatars" crop={avatar.crop} />
      </span>
    </span>
  )
}
