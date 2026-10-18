import { useEffect } from 'react'
import { usePlayerSetup } from './usePlayerSetup'

export function useSetupCatalogs() {
  const loadCatalogs = usePlayerSetup((state) => state.loadCatalogs)
  useEffect(() => {
    void loadCatalogs()
  }, [loadCatalogs])
}
