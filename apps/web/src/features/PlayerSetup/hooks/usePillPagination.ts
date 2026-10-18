import { useEffect, useRef, useState } from 'react'

const PAGE_SIZE = 9

export function usePillPagination(itemCount: number, search: string) {
  const pageSize = PAGE_SIZE
  const pageCount = Math.max(1, Math.ceil(itemCount / pageSize))
  const [position, setPosition] = useState({ search, index: 0 })
  const page = position.search === search ? Math.min(position.index, pageCount - 1) : 0
  const viewport = useRef<HTMLElement>(null)

  useEffect(() => {
    viewport.current?.scrollTo({ left: 0, behavior: 'instant' })
  }, [search])

  function goToPage(index: number, focusPill = false) {
    const next = Math.max(0, Math.min(index, pageCount - 1))
    setPosition({ search, index: next })
    viewport.current?.scrollTo({ left: next * viewport.current.clientWidth, behavior: 'instant' })
    if (focusPill)
      requestAnimationFrame(() => {
        viewport.current
          ?.querySelectorAll<HTMLFieldSetElement>('.pill-page')
          [next]?.querySelector('button')
          ?.focus({ preventScroll: true })
      })
  }

  function onScroll() {
    const element = viewport.current
    if (!element?.clientWidth) return
    const index = Math.max(
      0,
      Math.min(Math.round(element.scrollLeft / element.clientWidth), pageCount - 1),
    )
    if (index !== page) setPosition({ search, index })
  }

  return { viewport, page, pageSize, pageCount, goToPage, onScroll }
}
