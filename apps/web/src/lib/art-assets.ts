import type { Kind, Pill, Special } from '@/game/engine'
import type { MedicineId } from '@/game/medicines'

export type SpriteFrame = readonly [x: number, y: number, width: number, height: number]

export const ART_SOURCES = {
  avatars: { src: '/art/avatars.png', width: 1774 },
  setup: { src: '/art/setup-reference.jpg', width: 1905 },
  game: { src: '/art/game-reference.jpg', width: 739 },
  pills: { src: '/art/pills-3.png', width: 1983 },
  strawberry: { src: '/art/strawberry.png', width: 1254 },
  apple: { src: '/art/apple.png', width: 1254 },
  peach: { src: '/art/peach.png', width: 1317 },
  bomb: { src: '/art/bomb.png', width: 1254 },
  hammer: { src: '/art/hammer.png', width: 1254 },
  crown: { src: '/art/crown.png', width: 1355 },
  bear: { src: '/art/bear.png', width: 1230 },
} as const

export type ArtSource = keyof typeof ART_SOURCES

// Pixel frames reference the original transparent 5 × 2 atlas; no image copies per pill.
export const PILL_FRAMES = {
  pinkCapsule: [38, 50, 375, 337],
  blueTablet: [440, 55, 365, 332],
  goldTablet: [815, 65, 375, 322],
  greenTablet: [1210, 55, 365, 332],
  tealCapsule: [1580, 50, 375, 337],
  orangeTablet: [25, 410, 395, 337],
  purpleTablet: [440, 410, 365, 360],
  whiteTablet: [820, 410, 365, 350],
  pinkTablet: [1195, 405, 380, 355],
  blueCapsule: [1580, 390, 390, 380],
} as const satisfies Record<string, SpriteFrame>

export interface TileArt {
  source: ArtSource
  crop: SpriteFrame
  label: string
}

export const MEDICINE_ART: Record<MedicineId, TileArt> = {
  mercaptopurine: { source: 'pills', crop: PILL_FRAMES.pinkCapsule, label: 'Mercaptopurine' },
  methotrexate: { source: 'pills', crop: PILL_FRAMES.blueTablet, label: 'Methotrexate' },
  thioguanine: { source: 'pills', crop: PILL_FRAMES.goldTablet, label: 'Thioguanine' },
  imatinib: { source: 'pills', crop: PILL_FRAMES.orangeTablet, label: 'Imatinib' },
  dasatinib: { source: 'pills', crop: PILL_FRAMES.purpleTablet, label: 'Dasatinib' },
  temozolomide: { source: 'pills', crop: PILL_FRAMES.whiteTablet, label: 'Temozolomide' },
  cyclophosphamide: { source: 'pills', crop: PILL_FRAMES.greenTablet, label: 'Cyclophosphamide' },
  etoposide: { source: 'pills', crop: PILL_FRAMES.blueCapsule, label: 'Etoposide' },
  isotretinoin: { source: 'pills', crop: PILL_FRAMES.pinkTablet, label: 'Isotretinoin' },
}

// Each selected medicine is a distinct match kind; fruits and specials stay available.
export const TILE_ART: Record<Kind, TileArt> = {
  ...MEDICINE_ART,
  mint: { source: 'apple', crop: [138, 113, 980, 1032], label: 'Green apple' },
  gold: { source: 'strawberry', crop: [129, 103, 1032, 1066], label: 'Strawberry' },
  lavender: { source: 'peach', crop: [147, 106, 1030, 1004], label: 'Peach' },
}

export const SPECIAL_ART: Record<Special, TileArt> = {
  bomb: { source: 'bomb', crop: [198, 132, 927, 1012], label: 'Bomb' },
  hammer: { source: 'hammer', crop: [104, 102, 1042, 1046], label: 'Hammer' },
  crown: { source: 'crown', crop: [68, 105, 1219, 978], label: 'Crown' },
}

export function getTileArt(tile: Pill): TileArt {
  return tile.special ? SPECIAL_ART[tile.special] : TILE_ART[tile.kind]
}
