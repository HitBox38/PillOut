import { useEffect, useSyncExternalStore } from 'react'
import { getAssetLoadingState, preloadAppAssets, subscribeAssetLoading } from '@/lib/preload-assets'

export function useAssetPreload() {
  const state = useSyncExternalStore(subscribeAssetLoading, getAssetLoadingState)
  useEffect(() => {
    void preloadAppAssets()
  }, [])
  return { ...state, retry: preloadAppAssets }
}
