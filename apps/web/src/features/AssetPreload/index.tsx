import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { useAssetPreload } from './hooks/useAssetPreload'
import type { Props } from './types'

export default function AssetPreload({ children }: Props) {
  const { status, completed, total, retry } = useAssetPreload()
  if (status === 'ready') return children

  return (
    <div className="app-shell asset-loading-shell">
      <main className="mobile-screen asset-loading-screen" aria-labelledby="loading-title">
        <div className="asset-loading-content">
          <h1 id="loading-title">Pill Out</h1>
          <output>
            {status === 'error'
              ? 'Some things couldn’t load. Check your connection and try again.'
              : 'Getting everything ready to play…'}
          </output>
          <Progress
            className="asset-loading-progress"
            value={Math.round((completed / total) * 100)}
            aria-label="Preparing to play"
          />
          {status === 'error' && (
            <Button className="candy-button" onClick={() => void retry()}>
              Try again
            </Button>
          )}
        </div>
      </main>
    </div>
  )
}
