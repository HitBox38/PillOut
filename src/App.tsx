import {
  createRootRoute,
  createRoute,
  createRouter,
  Link,
  Outlet,
  RouterProvider,
} from '@tanstack/react-router'
import {
  ArrowLeft,
  ArrowRight,
  AudioLines,
  CircleHelp,
  Leaf,
  Settings2,
  Volume2,
  VolumeX,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { useGameStore } from '@/game/store'
import { GamePage } from '@/pages/game-page'

function Settings() {
  const sound = useGameStore((s) => s.sound)
  const reducedMotion = useGameStore((s) => s.reducedMotion)
  return (
    <Dialog>
      <DialogTrigger render={<Button variant="ghost" size="icon" aria-label="Settings" />}>
        <Settings2 size={19} />
      </DialogTrigger>
      <DialogContent className="settings-dialog">
        <DialogHeader>
          <DialogTitle>Make yourself comfortable.</DialogTitle>
          <DialogDescription>A few little things to make Pillout yours.</DialogDescription>
        </DialogHeader>
        <label className="setting-row">
          <span>
            <strong>Sound effects</strong>
            <small>Soft notes for every match.</small>
          </span>
          <Switch
            checked={sound}
            onCheckedChange={useGameStore.getState().setSound}
            aria-label="Sound effects"
          />
        </label>
        <label className="setting-row">
          <span>
            <strong>Reduce motion</strong>
            <small>Keep things a little more still.</small>
          </span>
          <Switch
            checked={reducedMotion}
            onCheckedChange={useGameStore.getState().setReducedMotion}
            aria-label="Reduce motion"
          />
        </label>
        <p className="settings-note">Your preferences and best score are saved on this device.</p>
      </DialogContent>
    </Dialog>
  )
}

function Layout() {
  const sound = useGameStore((s) => s.sound)
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to game
      </a>
      <header className="site-header">
        <Link to="/" className="brand" aria-label="Pillout home">
          <span className="brand-symbol">
            <span />
          </span>
          pillout
        </Link>
        <nav aria-label="Main navigation">
          <Link to="/" activeOptions={{ exact: true }} activeProps={{ className: 'nav-active' }}>
            Play
          </Link>
          <Link to="/how-to-play" activeProps={{ className: 'nav-active' }}>
            How to play <CircleHelp size={14} />
          </Link>
        </nav>
        <div className="header-actions">
          <Button
            variant="ghost"
            size="icon"
            aria-label={sound ? 'Mute sound' : 'Enable sound'}
            onClick={() => useGameStore.getState().setSound(!sound)}
          >
            {sound ? <Volume2 size={19} /> : <VolumeX size={19} />}
          </Button>
          <span className="header-divider" />
          <Settings />
        </div>
      </header>
      <main id="main-content">
        <Outlet />
      </main>
      <footer className="site-footer">
        <span>A little play goes a long way.</span>
        <span>
          <span className="footer-dot" /> MADE FOR YOUR DOWNTIME
        </span>
        <span>
          Take it easy. <Leaf size={14} />
        </span>
      </footer>
    </div>
  )
}

function HowToPlay() {
  return (
    <div className="instructions-page">
      <Link to="/" className="back-link">
        <ArrowLeft size={16} /> Back to the good stuff
      </Link>
      <span className="eyebrow">A MOMENT TO GET THE HANG OF IT</span>
      <h1>
        Little rules.
        <br />
        <span>Lovely results.</span>
      </h1>
      <p className="intro-copy">
        A colorful little puzzle with a simple goal: make matches, find your rhythm, and enjoy the
        moment.
      </p>
      <div className="instruction-grid">
        <article>
          <span className="step-number">01</span>
          <div className="demo-match">
            <span className="pill pill-coral" />
            <span className="pill pill-coral" />
            <span className="pill pill-coral" />
          </div>
          <h2>Meet your match.</h2>
          <p>
            Click a pill, then an adjacent pill to swap them. You can also swipe. Line up three or
            more of the same color horizontally or vertically.
          </p>
        </article>
        <article>
          <span className="step-number">02</span>
          <div className="demo-icon">
            <AudioLines size={46} strokeWidth={1.3} />
          </div>
          <h2>Let it flow.</h2>
          <p>
            Matched pills clear and new ones fall into place. Chain reactions multiply your points:
            50 per pill, times the cascade number.
          </p>
        </article>
        <article>
          <span className="step-number">03</span>
          <div className="demo-icon">
            <Leaf size={46} strokeWidth={1.3} />
          </div>
          <h2>Find your own pace.</h2>
          <p>
            Reach 2,000 points in 24 moves in Classic, or settle into Zen with no move limit. Hints
            and shuffles are always free.
          </p>
        </article>
      </div>
      <div className="keyboard-note">
        <strong>More of a keyboard person?</strong>
        <p>
          Use arrow keys to explore the board, Enter or Space to select a pill, and Escape to clear
          your selection.
        </p>
      </div>
      <Button render={<Link to="/" />} className="primary-button">
        Let’s play <ArrowRight size={16} />
      </Button>
    </div>
  )
}

const rootRoute = createRootRoute({
  component: Layout,
  notFoundComponent: () => (
    <div className="instructions-page">
      <h1>A little off track.</h1>
      <Link to="/" className="back-link">
        Back to the game <ArrowRight size={16} />
      </Link>
    </div>
  ),
})
const gameRoute = createRoute({ getParentRoute: () => rootRoute, path: '/', component: GamePage })
const instructionsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/how-to-play',
  component: HowToPlay,
})
const router = createRouter({
  routeTree: rootRoute.addChildren([gameRoute, instructionsRoute]),
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
