import { lazy, Suspense, useState } from 'react'
import { Link } from '@tanstack/react-router'
import {
  ArrowRight,
  Check,
  ChevronRight,
  Flower2,
  Infinity as InfinityIcon,
  Lightbulb,
  MousePointer2,
  Pause,
  Play,
  RotateCcw,
  Shuffle,
  Sparkles,
  Star,
  Trophy,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { START_MOVES, TARGET, useGameStore } from '@/game/store'
import type { Mode } from '@/game/store'

const number = new Intl.NumberFormat('en-US')
const GameBoard = lazy(() =>
  import('@/components/game-board').then((module) => ({ default: module.GameBoard })),
)

export function GamePage() {
  const score = useGameStore((s) => s.score)
  const best = useGameStore((s) => s.best)
  const moves = useGameStore((s) => s.moves)
  const mode = useGameStore((s) => s.mode)
  const paused = useGameStore((s) => s.paused)
  const phase = useGameStore((s) => s.phase)
  const outcome = useGameStore((s) => s.outcome)
  const message = useGameStore((s) => s.message)
  const combo = useGameStore((s) => s.combo)
  const [restart, setRestart] = useState<Mode | null>(null)
  const blocked = phase !== 'idle' || paused || outcome !== 'playing'

  function requestGame(nextMode: Mode) {
    if (score > 0 || moves !== START_MOVES) setRestart(nextMode)
    else useGameStore.getState().newGame(nextMode)
  }

  return (
    <>
      <section className="page-intro">
        <div>
          <span className="eyebrow">
            <span /> YOUR DAILY DOSE OF PLAY
          </span>
          <h1>
            Small matches. <span>Big mood.</span>
          </h1>
          <p>Clear your board. Clear your head. Stay a little while.</p>
        </div>
        <div className="intro-flower" aria-hidden="true">
          <Flower2 size={68} strokeWidth={1} />
          <span>
            a moment
            <br />
            for you
          </span>
        </div>
      </section>
      <section className="game-layout" aria-label="Pillout game">
        <aside className="session-panel">
          <div className="session-heading">
            <span className="eyebrow">THE PLAY ROOM</span>
            <span className="live-dot" />
          </div>
          <h2>Find your flow.</h2>
          <p className="muted-copy">A fresh mix of possibilities.</p>
          <Tabs
            value={mode}
            onValueChange={(value) => requestGame(value as Mode)}
            className="mode-tabs"
          >
            <TabsList aria-label="Game mode">
              <TabsTrigger value="classic">
                <Sparkles size={14} /> Classic
              </TabsTrigger>
              <TabsTrigger value="zen">
                <InfinityIcon size={16} /> Zen
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <Button
            variant="ghost"
            size="icon"
            className="mobile-new-game"
            aria-label="New game"
            onClick={() => requestGame(mode)}
          >
            <RotateCcw size={16} />
          </Button>
          <div className="score-section">
            <span className="stat-label">
              YOUR SCORE
              <span className="mobile-goal">{mode === 'classic' ? '· GOAL 2,000' : '· ZEN'}</span>
            </span>
            <div className="score-value">
              {number.format(score)}
              <span className="score-spark">✳</span>
            </div>
            <div className="goal-line">
              <span>{mode === 'classic' ? 'Aiming for' : 'Personal best'}</span>
              <strong>{number.format(mode === 'classic' ? TARGET : best)}</strong>
            </div>
            <Progress
              value={Math.min((score / TARGET) * 100, 100)}
              aria-label="Score toward 2,000 points"
            />
          </div>
          <div className="moves-section">
            <div className="moves-icon">
              <RotateCcw size={18} />
            </div>
            <div>
              <strong>{mode === 'zen' ? <InfinityIcon size={30} /> : moves}</strong>
              <span>{mode === 'zen' ? 'room to unwind' : 'moves left'}</span>
            </div>
            <div className="moves-dots" aria-hidden="true">
              {Array.from({ length: 12 }, (_, i) => (
                <span
                  className={mode === 'zen' || i < Math.ceil(moves / 2) ? 'filled' : ''}
                  key={i}
                />
              ))}
            </div>
          </div>
          <div className="best-line">
            <Trophy size={15} />
            <span>Personal best</span>
            <strong>{number.format(best)}</strong>
          </div>
          <Button variant="outline" className="new-game-button" onClick={() => requestGame(mode)}>
            <RotateCcw size={15} /> New game
          </Button>
        </aside>

        <div className="board-column">
          <div className="board-meta">
            <span>
              <span className="tiny-pill" /> {mode === 'classic' ? 'CLASSIC MATCH' : 'ZEN MATCH'}
            </span>
            <span>
              {combo > 1 && phase !== 'idle' ? (
                <>
                  <Sparkles size={13} /> {combo}× CASCADE
                </>
              ) : (
                <>
                  <span className="small-dot" /> NO RUSH. JUST PLAY.
                </>
              )}
            </span>
          </div>
          <div className="board-frame">
            <div className={paused ? 'board-blurred' : ''}>
              <Suspense
                fallback={
                  <div className="board-surface board-loading" role="status">
                    Mixing your colors…
                  </div>
                }
              >
                <GameBoard />
              </Suspense>
            </div>
            {paused && (
              <div className="board-overlay">
                <div className="overlay-symbol">
                  <Pause size={28} />
                </div>
                <h2>A little breather.</h2>
                <p>Your colors will be right here.</p>
                <Button
                  className="primary-button"
                  onClick={() => useGameStore.getState().togglePause()}
                >
                  <Play size={15} /> Keep playing
                </Button>
              </div>
            )}
            {outcome !== 'playing' && (
              <div className="board-overlay result-overlay">
                <div className="overlay-symbol">
                  {outcome === 'won' ? <Trophy size={32} /> : <Flower2 size={32} />}
                </div>
                <span className="eyebrow">
                  {outcome === 'won' ? 'A VERY GOOD MATCH' : 'EVERY ROUND IS A FRESH START'}
                </span>
                <h2>{outcome === 'won' ? 'Look at you glow.' : 'Good things take practice.'}</h2>
                <p>
                  {number.format(score)} points.{' '}
                  {outcome === 'won'
                    ? 'A little win for your day.'
                    : 'Another lovely board awaits.'}
                </p>
                <Button
                  className="primary-button"
                  onClick={() => useGameStore.getState().newGame()}
                >
                  {outcome === 'won' ? 'One more round' : 'Try again'} <ArrowRight size={16} />
                </Button>
              </div>
            )}
          </div>
          <div className="board-toolbar">
            <Button
              variant="ghost"
              disabled={blocked}
              onClick={() => useGameStore.getState().showHint()}
            >
              <Lightbulb size={17} /> Hint
            </Button>
            <span />
            <Button
              variant="ghost"
              disabled={blocked}
              onClick={() => useGameStore.getState().shuffle()}
            >
              <Shuffle size={17} /> Shuffle
            </Button>
            <span />
            <Button
              variant="ghost"
              disabled={outcome !== 'playing'}
              onClick={() => useGameStore.getState().togglePause()}
            >
              {paused ? <Play size={16} /> : <Pause size={16} />}
              {paused ? 'Resume' : 'Pause'}
            </Button>
          </div>
          <p className="game-message" role="status" aria-live="polite">
            <Sparkles size={13} />
            {message}
          </p>
        </div>

        <aside className="tips-panel">
          <div className="how-to-heading">
            <span className="little-star">✳</span>
            <span className="eyebrow">THE SIMPLE THINGS</span>
          </div>
          <h2>
            A good match
            <br />
            starts with three.
          </h2>
          <p>Swap neighboring pills to line up 3 or more of the same color.</p>
          <div className="match-demo" aria-hidden="true">
            <span className="pill pill-coral" />
            <span className="pill pill-coral" />
            <span className="pill pill-coral" />
            <span className="demo-plus">+150</span>
          </div>
          <div className="tip-line">
            <span>
              <MousePointer2 size={15} />
            </span>
            <p>
              Click two pills.
              <br />
              Or give one a swipe.
            </p>
          </div>
          <div className="tip-line">
            <span>
              <Sparkles size={15} />
            </span>
            <p>
              Make a match.
              <br />
              Let the cascades happen.
            </p>
          </div>
          <Link to="/how-to-play" className="learn-link">
            A little more guidance <ChevronRight size={14} />
          </Link>
          <div className="gentle-note">
            <div>
              <LeafDrawing />
              <span>GOOD TO KNOW</span>
            </div>
            <p>
              No timers.
              <br />
              No pressure.
              <br />
              <strong>
                Just one good move
                <br />
                at a time.
              </strong>
            </p>
          </div>
        </aside>
      </section>
      <div className="bottom-note">
        <span className="note-line" />
        <Star size={13} />
        <p>Five colors. Endless little possibilities.</p>
        <span className="note-line" />
      </div>
      <Dialog
        open={restart !== null}
        onOpenChange={(open) => {
          if (!open) setRestart(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>A fresh start?</DialogTitle>
            <DialogDescription>
              This will start a new {restart === 'zen' ? 'Zen' : 'Classic'} game. Your personal best
              stays with you.
            </DialogDescription>
          </DialogHeader>
          <div className="dialog-actions">
            <Button variant="outline" onClick={() => setRestart(null)}>
              Keep playing
            </Button>
            <Button
              onClick={() => {
                useGameStore.getState().newGame(restart ?? mode)
                setRestart(null)
              }}
            >
              <Check size={15} /> Start fresh
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

function LeafDrawing() {
  return (
    <svg width="27" height="32" viewBox="0 0 27 32" fill="none" aria-hidden="true">
      <path
        d="M13 30C12 20 13 11 19 3M14 19C4 20 3 13 3 9C11 9 16 12 14 19ZM15 14C12 5 19 2 25 2C25 10 22 15 15 14Z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
