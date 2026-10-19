import { useEffect, useRef, useState } from 'react'
import { searchPatients } from '../api'
import { MIN_QUERY_LENGTH, SEARCH_PAGE_SIZE } from '../constants'
import type { PatientOption, SearchResults } from '../types'

export function usePatientSearch(patients?: PatientOption[]) {
  const [query, setQuery] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [results, setResults] = useState<SearchResults | null>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const requestId = useRef(0)
  useEffect(
    () => () => {
      requestId.current += 1
    },
    [],
  )
  const run = async (nextPage = 0) => {
    const term = query.trim()
    if (term.length < MIN_QUERY_LENGTH) return
    const id = ++requestId.current
    setPending(true)
    setError(null)
    try {
      const matches = patients?.filter((patient) =>
        patient.name.toLocaleLowerCase().includes(term.toLocaleLowerCase()),
      )
      const data = matches
        ? {
            items: matches.slice(nextPage * SEARCH_PAGE_SIZE, (nextPage + 1) * SEARCH_PAGE_SIZE),
            has_more: matches.length > (nextPage + 1) * SEARCH_PAGE_SIZE,
          }
        : await searchPatients(term, nextPage)
      if (id !== requestId.current) return
      setResults(data)
      setPage(nextPage)
      setSearch(term)
    } catch (error) {
      if (id === requestId.current)
        setError(error instanceof Error ? error.message : 'Could not find patients. Please retry.')
    } finally {
      if (id === requestId.current) setPending(false)
    }
  }
  return {
    query,
    setQuery,
    page,
    results: search === query.trim() ? results : null,
    pending,
    error,
    run,
  }
}
