import { Outlet } from '@tanstack/react-router'
import { NavigationMotionContext } from './context'
import { usePageTransitions } from './hooks/usePageTransitions'

export { useNavigationMotion } from './hooks/useNavigationMotion'

export default function PageTransitions() {
  const { main, captureNavigationMotion } = usePageTransitions()

  return (
    <NavigationMotionContext value={captureNavigationMotion}>
      <main id="main-content" ref={main}>
        <Outlet />
      </main>
    </NavigationMotionContext>
  )
}
