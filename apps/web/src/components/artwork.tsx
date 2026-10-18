import type { CSSProperties } from 'react'
import { ART_SOURCES } from '@/lib/art-assets'
import type { ArtSource, SpriteFrame } from '@/lib/art-assets'

interface ArtworkProps {
  source?: ArtSource
  crop: SpriteFrame
  className?: string
}

/** Display a region of the supplied design sheet without duplicating its artwork. */
export function Artwork({ source = 'setup', crop, className = '' }: ArtworkProps) {
  const [x, y, width, height] = crop
  const { src, width: sourceWidth } = ART_SOURCES[source]
  const style: CSSProperties = { aspectRatio: `${width} / ${height}` }
  return (
    <span className={`artwork ${className}`} style={style} aria-hidden="true">
      <img
        src={src}
        alt=""
        draggable={false}
        style={{
          width: `${(sourceWidth / width) * 100}%`,
          left: `${(-x / width) * 100}%`,
          top: `${(-y / height) * 100}%`,
        }}
      />
    </span>
  )
}

export function GameLogo({ className = '' }: { className?: string }) {
  return (
    <img
      className={`game-logo ${className}`}
      src="/art/pill-out-logo.png"
      alt="Pill Out"
      draggable={false}
    />
  )
}
