import { Button } from '@/components/ui/button'
import { usePlayerSetup } from '../hooks/usePlayerSetup'

export default function CatalogStatus() {
  const status = usePlayerSetup((state) => state.catalogStatus)
  const error = usePlayerSetup((state) => state.catalogError)
  const load = usePlayerSetup((state) => state.loadCatalogs)

  if (status === 'ready') return null
  if (status !== 'error') return <output className="setup-status">Loading player choices…</output>
  return (
    <div className="setup-feedback">
      <p role="alert">{error}</p>
      <Button type="button" variant="outline" onClick={() => void load()}>
        Try loading again
      </Button>
    </div>
  )
}
