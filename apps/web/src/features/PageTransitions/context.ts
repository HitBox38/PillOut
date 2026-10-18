import { createContext } from 'react'
import type { CaptureNavigationMotion } from './types'

export const NavigationMotionContext = createContext<CaptureNavigationMotion>(
  () => (navigate) => navigate(),
)
