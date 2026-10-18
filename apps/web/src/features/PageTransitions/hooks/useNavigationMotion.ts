import { useContext } from 'react'
import { NavigationMotionContext } from '../context'

// Call before asynchronous work; use the returned wrapper for its navigation.
export function useNavigationMotion() {
  return useContext(NavigationMotionContext)
}
