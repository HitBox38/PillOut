import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  page: number
  pages: number
  previous: () => void
  next: () => void
  label: string
}

export default function RewardPager({ page, pages, previous, next, label }: Props) {
  if (pages <= 1) return null
  return (
    <nav className="reward-pager" aria-label={label}>
      <Button onClick={previous} disabled={page === 0} aria-label={`Previous ${label}`}>
        <ChevronLeft />
      </Button>
      <output aria-live="polite">
        {page + 1} / {pages}
      </output>
      <Button onClick={next} disabled={page === pages - 1} aria-label={`Next ${label}`}>
        <ChevronRight />
      </Button>
    </nav>
  )
}
