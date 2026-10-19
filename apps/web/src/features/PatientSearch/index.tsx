import { ChevronLeft, ChevronRight, Search, UserRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MIN_QUERY_LENGTH } from './constants'
import { usePatientSearch } from './hooks/usePatientSearch'
import type { Props } from './types'
import './search.css'

export default function PatientSearch({ onSelect, onCancel, patients }: Props) {
  const { query, setQuery, page, results, pending, error, run } = usePatientSearch(patients)
  return (
    <div className="patient-search-panel">
      <header>
        <h2>Find a patient</h2>
        <p>
          {patients
            ? 'Search the sample patient in this demo room.'
            : 'Search saved patient profiles by first or last name.'}
        </p>
      </header>
      <form
        onSubmit={(event) => {
          event.preventDefault()
          void run()
          ;(document.activeElement as HTMLElement | null)?.blur()
        }}
      >
        <label htmlFor="patient-query">Patient name</label>
        <div className="patient-search-input">
          <input
            id="patient-query"
            type="search"
            autoComplete="off"
            placeholder="Enter a patient’s name"
            maxLength={100}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <Button
            type="submit"
            aria-label="Search patients"
            disabled={pending || query.trim().length < MIN_QUERY_LENGTH}
          >
            <Search />
          </Button>
        </div>
      </form>
      <div className="patient-search-results" aria-busy={pending}>
        {pending ? (
          <output>Searching patients…</output>
        ) : results ? (
          results.items.length ? (
            results.items.map((patient) => (
              <Button
                className="patient-search-result"
                key={patient.id}
                onClick={() => onSelect(patient)}
              >
                <UserRound />
                <span>
                  <strong>{patient.name}</strong>
                  <small>{patient.detail ?? `Profile #${patient.id}`}</small>
                </span>
                <ChevronRight />
              </Button>
            ))
          ) : (
            <output>No patients found. Try another name.</output>
          )
        ) : (
          <p>Enter at least two letters, then tap search.</p>
        )}
      </div>
      {error && <p role="alert">{error}</p>}
      {results && (
        <nav aria-label="Patient search pages">
          <Button
            disabled={pending || page === 0}
            aria-label="Previous patients"
            onClick={() => void run(page - 1)}
          >
            <ChevronLeft />
          </Button>
          <span>Page {page + 1}</span>
          <Button
            disabled={pending || !results.has_more}
            aria-label="Next patients"
            onClick={() => void run(page + 1)}
          >
            <ChevronRight />
          </Button>
        </nav>
      )}
      <Button className="patient-search-cancel" onClick={onCancel}>
        Back to pill choices
      </Button>
    </div>
  )
}
