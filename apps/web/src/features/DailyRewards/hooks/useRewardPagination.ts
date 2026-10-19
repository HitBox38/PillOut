import { useState } from 'react'
import { getRewardPage } from '../helpers'

export function useRewardPagination<T>(items: readonly T[], size: number) {
  const [requestedPage, setPage] = useState(0)
  const result = getRewardPage(items, size, requestedPage)
  const { page, pages } = result
  return {
    ...result,
    setPage,
    previous: () => setPage(Math.max(0, page - 1)),
    next: () => setPage(Math.min(pages - 1, page + 1)),
  }
}
