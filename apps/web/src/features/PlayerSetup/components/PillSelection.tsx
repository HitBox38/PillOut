import { useState } from 'react'
import { Check, ChevronRight, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Artwork } from '@/components/artwork'
import { PILLS } from '../constants'
import { usePlayerSetup } from '../hooks/usePlayerSetup'
import { usePillPagination } from '../hooks/usePillPagination'

export default function PillSelection({ onNext }: { onNext: () => void }) {
  const [search, setSearch] = useState('')
  const { patientName, selectedPills, togglePill, update } = usePlayerSetup()
  const pills = PILLS.filter((pill) =>
    pill.name.toLowerCase().includes(search.toLowerCase().trim()),
  )
  const { viewport, page, pageSize, pageCount, goToPage, onScroll } = usePillPagination(
    pills.length,
    search,
  )
  return (
    <form
      className="setup-form pills-form"
      onSubmit={(event) => {
        event.preventDefault()
        onNext()
      }}
    >
      <header className="setup-heading pills-heading">
        <h1>Choose your pills</h1>
        <span className="demo-badge">DEMO · Staff setup</span>
      </header>
      <label className="patient-name-field">
        Patient name
        <input
          autoComplete="off"
          placeholder="Enter patient name"
          value={patientName}
          maxLength={80}
          required
          pattern=".*\S.*"
          onChange={(e) => update({ patientName: e.target.value })}
        />
      </label>
      <label className="search-field">
        <span className="sr-only">Search pills</span>
        <Search />
        <input
          type="search"
          placeholder="Search pills"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </label>
      <fieldset className="pill-picker">
        <legend className="sr-only">Pills for the patient</legend>
        <section
          ref={viewport}
          className="pill-carousel"
          aria-label="Medicine carousel"
          onScroll={onScroll}
        >
          {Array.from({ length: pageCount }, (_, index) => (
            <fieldset
              key={index}
              className="pill-grid pill-page"
              aria-label={`Medicine page ${index + 1} of ${pageCount}`}
              inert={index !== page}
            >
              {pills.slice(index * pageSize, (index + 1) * pageSize).map((pill) => (
                <Button
                  key={pill.id}
                  type="button"
                  className="selection-card pill-card"
                  aria-pressed={selectedPills.includes(pill.id)}
                  onClick={() => togglePill(pill.id)}
                  onKeyDown={(event) => {
                    const next = {
                      ArrowLeft: page - 1,
                      ArrowRight: page + 1,
                      Home: 0,
                      End: pageCount - 1,
                    }[event.key]
                    if (next === undefined || next === page || next < 0 || next >= pageCount) return
                    event.preventDefault()
                    goToPage(next, true)
                  }}
                >
                  <Artwork source="pills" crop={pill.crop} />
                  <span className="pill-name">{pill.name}</span>
                  {selectedPills.includes(pill.id) && (
                    <span className="selection-check">
                      <Check />
                    </span>
                  )}
                </Button>
              ))}
              {pills.length === 0 && (
                <output className="empty-search">No pills found. Try another name.</output>
              )}
            </fieldset>
          ))}
        </section>
        {pageCount > 1 && (
          <nav className="pill-pagination" aria-label="Medicine pages">
            <div className="pill-page-dots">
              {Array.from({ length: pageCount }, (_, index) => (
                <Button
                  key={index}
                  type="button"
                  className="pill-page-dot"
                  variant="ghost"
                  aria-label={`Go to medicine page ${index + 1} of ${pageCount}`}
                  aria-current={page === index ? 'page' : undefined}
                  onClick={() => goToPage(index)}
                >
                  <span />
                </Button>
              ))}
            </div>
          </nav>
        )}
        <output className="sr-only" aria-live="polite">
          Page {page + 1} of {pageCount}.
          {pageCount > 1 && ' Swipe left or right to browse medicines.'}
        </output>
      </fieldset>
      <output className="selection-count">
        {selectedPills.length
          ? `${selectedPills.length} pill${selectedPills.length === 1 ? '' : 's'} selected`
          : 'Select the pills in your patient’s plan'}
      </output>
      <div className="setup-footer">
        <Button type="submit" className="candy-button" disabled={selectedPills.length === 0}>
          Next: times & quantities <ChevronRight />
        </Button>
        <span className="footer-caption">Demo only · Nothing is sent or saved</span>
      </div>
    </form>
  )
}
