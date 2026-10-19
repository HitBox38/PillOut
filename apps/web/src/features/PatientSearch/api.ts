import { apiRequest } from '@/lib/api'
import type { SearchResults } from './types'
export const searchPatients = (query: string, page: number) =>
  apiRequest<SearchResults>('/patients/search', { query, page })
