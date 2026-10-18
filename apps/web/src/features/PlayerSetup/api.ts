import { apiRequest } from '@/lib/api'
import { AVATARS, PILLS } from './constants'
import type { CatalogAvatar, CatalogPill, PlayerProfile, UserResponse } from './types'

interface CatalogResponse {
  id: number
  name: string
  catalog_key: string | null
}

export async function loadCatalogs(): Promise<{ pills: CatalogPill[]; avatars: CatalogAvatar[] }> {
  const [drugs, avatarRows] = await Promise.all([
    apiRequest<CatalogResponse[]>('/drugs', {}),
    apiRequest<CatalogResponse[]>('/avatars', {}),
  ])
  // Only render identities supported by the bundled sprite atlases and game rules.
  const pills = PILLS.flatMap((art) => {
    const row = drugs.find((item) => item.catalog_key === art.id)
    return row ? [{ ...art, name: row.name, databaseId: row.id }] : []
  })
  const avatars = AVATARS.flatMap((art) => {
    const row = avatarRows.find((item) => item.catalog_key === art.id)
    return row ? [{ ...art, name: row.name, databaseId: row.id }] : []
  })
  if (!pills.length || !avatars.length) {
    throw new Error('The player choices are unavailable. Please try loading them again.')
  }
  return { pills, avatars }
}

export function savePlayer(
  player: Omit<PlayerProfile, 'id' | 'avatar'>,
  avatarId: number,
  userId: number | null,
): Promise<UserResponse> {
  return apiRequest<UserResponse>(
    '/user',
    {
      ...(userId === null ? {} : { id: userId }),
      first_name: player.name.trim(),
      last_name: player.surname.trim(),
      nickname: player.nickname.trim(),
      avatar_id: avatarId,
    },
    userId === null ? 'POST' : 'PATCH',
  )
}

export async function loadPlayer(id: number, avatars: CatalogAvatar[]): Promise<PlayerProfile> {
  const row = await apiRequest<UserResponse>('/get_user', { id })
  const avatar = avatars.find((option) => option.databaseId === row.avatar_id)
  if (!avatar) throw new Error('The saved avatar is unavailable. Choose an avatar and try again.')
  return {
    id: row.id,
    name: row.first_name,
    surname: row.last_name,
    nickname: row.nickname ?? '',
    avatar: avatar.id,
  }
}
