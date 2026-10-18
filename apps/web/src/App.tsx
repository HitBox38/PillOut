import {
  createRootRoute,
  createRoute,
  createRouter,
  Link,
  Outlet,
  RouterProvider,
} from '@tanstack/react-router'
import { ArrowLeft, ChevronRight, Heart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Artwork, GameLogo } from '@/components/artwork'
import { SPECIAL_ART } from '@/lib/art-assets'
import PlayerSetup from '@/features/PlayerSetup'
import { GamePage } from '@/pages/game-page'

function Layout() {
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <main id="main-content">
        <Outlet />
      </main>
    </div>
  )
}

function Intro() {
  return (
    <section className="mobile-screen intro-screen" aria-label="Welcome to Pill Out">
      <div className="intro-brand">
        <GameLogo />
        <p>Small matches. Big smiles.</p>
      </div>
      <div className="intro-bottom">
        <Button nativeButton={false} render={<Link to="/welcome" />} className="candy-button">
          Let’s play <ChevronRight />
        </Button>
        <Button
          nativeButton={false}
          render={<Link to="/play" />}
          variant="link"
          className="demo-link"
        >
          Try a quick game
        </Button>
        <img className="hospital-logo" src="/art/sheba-logo.png" alt="Sheba Tel HaShomer" />
        <span className="made-with">
          <Heart size={12} fill="currentColor" /> A little play goes a long way
        </span>
      </div>
    </section>
  )
}

function HowToPlay() {
  return (
    <section className="mobile-screen help-screen">
      <Link to="/play" className="back-link">
        <ArrowLeft /> Back to game
      </Link>
      <GameLogo />
      <h1>Ready, set, match!</h1>
      <ol>
        <li>
          <h2>Swap two neighbors</h2>
          <p>
            Tap two neighboring tiles, or swipe a tile. Match three or more of the same kind in a
            row or column.
          </p>
        </li>
        <li>
          <h2>Keep the matches coming</h2>
          <p>
            Every cleared or converted tile earns 50 points. Cascades multiply the points for that
            move.
          </p>
        </li>
        <li>
          <h2>Go for the goal</h2>
          <p>
            Reach 2,000 points in 24 moves in Classic. Switch to Zen in settings for unlimited
            moves. Hints and shuffles are free.
          </p>
        </li>
      </ol>
      <section className="special-instructions" aria-label="Special tiles">
        <h2>Make an extra-special match</h2>
        {Object.entries(SPECIAL_ART).map(([special, art]) => (
          <article key={special}>
            <Artwork source={art.source} crop={art.crop} />
            <div>
              <h3>{art.label}</h3>
              <p>
                {special === 'bomb'
                  ? 'Match a T or L shape to earn a bomb. Swap it with a neighbor to clear a 3 × 3 area.'
                  : special === 'hammer'
                    ? 'Match four in a line to earn a hammer. Swap horizontally to clear a row, or vertically to clear a column.'
                    : 'Match five in a line to earn a crown. Swap it with a regular object to clear every object of that type.'}
              </p>
            </div>
          </article>
        ))}
        <p>
          Activating specials uses one move and can trigger others. Chained hammers use their
          original match direction; chained crowns target the most common regular type. Swap two
          crowns to clear the whole board. Shuffling keeps earned specials.
        </p>
      </section>
      <p className="plan-note">
        Using a keyboard? Explore with arrow keys, select with Enter or Space, and clear your
        selection with Escape.
      </p>
      <Button nativeButton={false} render={<Link to="/play" />} className="candy-button">
        Let’s play <ChevronRight />
      </Button>
    </section>
  )
}

const rootRoute = createRootRoute({
  component: Layout,
  notFoundComponent: () => (
    <section className="mobile-screen help-screen">
      <h1>Let’s get you back!</h1>
      <Link to="/">Return to Pill Out</Link>
    </section>
  ),
})
const introRoute = createRoute({ getParentRoute: () => rootRoute, path: '/', component: Intro })
const welcomeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/welcome',
  component: () => <PlayerSetup step="welcome" />,
})
const pillsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/pills',
  component: () => <PlayerSetup step="pills" />,
})
const planRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/plan',
  component: () => <PlayerSetup step="schedule" />,
})
const gameRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/play',
  component: GamePage,
})
const instructionsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/how-to-play',
  component: HowToPlay,
})
const router = createRouter({
  routeTree: rootRoute.addChildren([
    introRoute,
    welcomeRoute,
    pillsRoute,
    planRoute,
    gameRoute,
    instructionsRoute,
  ]),
  defaultPreload: 'intent',
  scrollRestoration: true,
})
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
export default function App() {
  return <RouterProvider router={router} />
}
