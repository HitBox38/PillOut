import { lazy, Suspense, useState } from 'react'
import { Link } from '@tanstack/react-router'
import {
  ArrowLeft,
  CircleHelp,
  Gift,
  Lightbulb,
  Pause,
  Play,
  RotateCcw,
  Settings,
  Shuffle,
  Trophy,
} from 'lucide-react'
import { Avatar } from '@/features/PlayerSetup/components/Avatar'
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
import type { Mode } from '@/game/store'
import { getLevelConfig } from '@/game/engine'
import { AVATARS } from '@/features/PlayerSetup/constants'
import { usePlayerSetup } from '@/features/PlayerSetup/hooks/usePlayerSetup'
import GameEffects, {
  CascadeTitle,
  ScoreCounter,
  VictoryCelebration,
  useReducedMotion,
} from '@/features/GameEffects'
import { useDailyRewards } from '@/features/DailyRewards/hooks/useDailyRewards'

const GameBoard = lazy(() =>
  import('@/components/game-board').then((module) => ({ default: module.GameBoard })),
)
const DIFFICULTY_LABELS = {
  warmup: 'WARM-UP',
  breather: 'BREATHER',
  steady: 'STEADY',
  challenge: 'CHALLENGE',
}

export function GamePage() {
  const score = useGameStore((s) => s.score)
  const best = useGameStore((s) => s.best)
  const moves = useGameStore((s) => s.moves)
  const level = useGameStore((s) => s.level)
  const progress = useGameStore((s) => s.progress)
  const kindCount = useGameStore((s) => s.kinds.length)
  const mode = useGameStore((s) => s.mode)
  const paused = useGameStore((s) => s.paused)
  const phase = useGameStore((s) => s.phase)
  const outcome = useGameStore((s) => s.outcome)
  const message = useGameStore((s) => s.message)
  const combo = useGameStore((s) => s.combo)
  const wave = useGameStore((s) => s.wave)
  const session = useGameStore((s) => s.session)
  const reducedMotion = useReducedMotion()
  const nickname = usePlayerSetup((s) => s.nickname)
  const avatarId = usePlayerSetup((s) => s.avatar)
  const avatar = AVATARS.find((option) => option.id === avatarId) ?? AVATARS[0]
  const [restart, setRestart] = useState<Mode | null>(null)
  const blocked = phase !== 'idle' || paused || outcome !== 'playing'
  const game = useGameStore.getState
  const retry = getLevelConfig(progress.level, kindCount, progress.losses)
  const pendingRewards = useDailyRewards((s) => s.days.filter((day) => !day.prize).length)

  return (
    <section
      className="mobile-screen game-screen"
      aria-label="Pill Out game"
      data-reduced={reducedMotion || undefined}
    >
      <div className="screen-topline game-topline">
        <Link to="/" className="back-link" aria-label="Back to home">
          <ArrowLeft />
        </Link>
        <span className="step-label">
          {mode === 'classic'
            ? `CHAPTER ${level.chapter} · ${DIFFICULTY_LABELS[level.difficulty]}`
            : 'ZEN ADVENTURE'}
        </span>
        <Link className="back-link" to="/how-to-play" aria-label="How to play">
          <CircleHelp />
        </Link>
      </div>
      <div className="game-dashboard">
        <div className="game-stat goal-stat" data-won={outcome === 'won' || undefined}>
          <h2>{mode === 'classic' ? 'Goal' : 'Score'}</h2>
          <div>
            <Trophy aria-hidden="true" />
            <ScoreCounter key={session} score={score} />
            <span>
              {mode === 'classic' ? `/ ${level.target.toLocaleString()}` : 'keep your flow'}
            </span>
          </div>
        </div>
        <figure className="game-buddy" aria-label={`${avatar.name} avatar`}>
          <div className="avatar-portrait">
            <Avatar avatar={avatar} />
          </div>
          <figcaption
            className="level-badge"
            aria-label={
              mode === 'classic'
                ? `Level ${level.number}, stage ${level.stage} of 10 in chapter ${level.chapter}`
                : 'Zen'
            }
          >
            {mode === 'classic' ? `Level ${level.number}` : 'Zen'}
          </figcaption>
        </figure>
        <div className="game-stat moves-stat">
          <h2>Moves</h2>
          <div>
            <strong>{mode === 'zen' ? '∞' : moves}</strong>
            <span>
              {mode === 'zen'
                ? 'take your time'
                : level.bonusMoves
                  ? `includes +${level.bonusMoves} retry help`
                  : 'make them count!'}
            </span>
          </div>
        </div>
      </div>
      <h1 className="game-banner">
        {wave && combo >= 3 ? (
          <CascadeTitle key={wave.id} wave={wave} />
        ) : combo > 1 && phase !== 'idle' ? (
          `${combo}× cascade! You’re on a roll!`
        ) : mode === 'classic' ? (
          `Match your way to ${level.target.toLocaleString()}!`
        ) : (
          'Find your flow. Take your time.'
        )}
      </h1>
      <div className="board-space">
        <div className="board-frame">
          <div className={paused ? 'board-blurred' : ''}>
            <Suspense
              fallback={
                <output className="board-surface board-loading">Mixing your colors…</output>
              }
            >
              <GameBoard />
            </Suspense>
          </div>
          {outcome === 'won' ? (
            <VictoryCelebration
              key={session}
              score={score}
              avatar={avatar}
              level={level.number}
              onContinue={() => game().nextLevel()}
            />
          ) : (
            (paused || outcome !== 'playing') && (
              <div className="board-overlay">
                {paused ? <Pause size={40} /> : <RotateCcw size={40} />}
                <h2>
                  {outcome === 'lost'
                    ? `Level ${level.number} · Try again?`
                    : 'Taking a little break'}
                </h2>
                <p>
                  {outcome !== 'playing'
                    ? `${score.toLocaleString()} of ${level.target.toLocaleString()} points. Your progress is safe.`
                    : 'Your next great match can wait.'}
                </p>
                {outcome === 'lost' && retry.bonusMoves > 0 && (
                  <p>Next try: +{retry.bonusMoves} extra moves. Same goal!</p>
                )}
                <Button
                  className="candy-button"
                  onClick={() =>
                    paused && outcome === 'playing' ? game().togglePause() : game().newGame()
                  }
                >
                  {paused && outcome === 'playing' ? 'Keep playing' : `Retry level ${level.number}`}
                  <Play />
                </Button>
              </div>
            )
          )}
        </div>
      </div>
      <div className="game-feedback">
        <h2>
          {score > 0
            ? `Nice move${nickname.trim() ? `, ${nickname.trim()}` : ''}!`
            : mode === 'classic'
              ? level.label
              : `Let’s go${nickname.trim() ? `, ${nickname.trim()}` : ''}!`}
        </h2>
        <output aria-live="polite" title={message}>
          {message}
        </output>
      </div>
      <Link to="/rewards" className="game-rewards-link">
        <Gift aria-hidden="true" />
        <span>{pendingRewards ? 'Your daily reward is ready!' : 'Daily rewards'}</span>
        <span>{pendingRewards ? `${pendingRewards} to claim` : 'A little joy each day'}</span>
      </Link>
      <p id="special-tile-help" className="sr-only">
        Swap a special with a neighbor to activate it. Bomb: 3 × 3. Hammer: row for a horizontal
        swap, column for a vertical swap. Crown: every object of its swap partner’s type.
      </p>
      <div className="game-controls">
        <Button
          className="booster"
          disabled={blocked}
          onClick={() => game().showHint()}
          aria-label="Show hint"
        >
          <span className="booster-orb">
            <Lightbulb />
          </span>
          <span>Hint</span>
          <small>FREE</small>
        </Button>
        <Button
          className="booster"
          disabled={blocked}
          onClick={() => void game().shuffle()}
          aria-label="Shuffle board"
        >
          <span className="booster-orb">
            <Shuffle />
          </span>
          <span>Shuffle</span>
          <small>FREE</small>
        </Button>
        <Button
          className="booster"
          disabled={outcome !== 'playing'}
          onClick={() => game().togglePause()}
          aria-label={paused ? 'Resume game' : 'Pause game'}
        >
          <span className="booster-orb">{paused ? <Play /> : <Pause />}</span>
          <span>{paused ? 'Resume' : 'Pause'}</span>
        </Button>
        <GameSettings onRestart={setRestart} />
      </div>
      <GameEffects />
      <Dialog
        open={restart !== null}
        onOpenChange={(open) => {
          if (!open) setRestart(null)
        }}
      >
        <DialogContent className="game-dialog">
          <DialogHeader>
            <DialogTitle>A fresh adventure?</DialogTitle>
            <DialogDescription>
              {restart === 'zen'
                ? 'Start an unlimited Zen game.'
                : `Start a fresh board at level ${progress.level}.`}{' '}
              Your level progress and best score of {best.toLocaleString()} stay with you.
            </DialogDescription>
          </DialogHeader>
          <div className="dialog-actions">
            <Button variant="outline" onClick={() => setRestart(null)}>
              Keep playing
            </Button>
            <Button
              onClick={() => {
                game().newGame(restart ?? mode)
                setRestart(null)
              }}
            >
              Start fresh
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  )
}

function GameSettings({ onRestart }: { onRestart: (mode: Mode) => void }) {
  const sound = useGameStore((s) => s.sound)
  const reducedMotion = useGameStore((s) => s.reducedMotion)
  const mode = useGameStore((s) => s.mode)
  const [open, setOpen] = useState(false)
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<Button className="booster settings-booster" aria-label="Game settings" />}
      >
        <span className="booster-orb">
          <Settings />
        </span>
        <span>Settings</span>
      </DialogTrigger>
      <DialogContent className="game-dialog">
        <DialogHeader>
          <DialogTitle>Make it your game</DialogTitle>
          <DialogDescription>
            Your level progress, preferences, and best score are saved on this device.
          </DialogDescription>
        </DialogHeader>
        <label className="setting-row" htmlFor="sound">
          <span>Sound effects</span>
          <Switch id="sound" checked={sound} onCheckedChange={useGameStore.getState().setSound} />
        </label>
        <label className="setting-row" htmlFor="motion">
          <span>Reduce motion</span>
          <Switch
            id="motion"
            checked={reducedMotion}
            onCheckedChange={useGameStore.getState().setReducedMotion}
          />
        </label>
        <div className="setting-row">
          <span>Game mode</span>
          <strong>{mode === 'classic' ? 'Classic' : 'Zen'}</strong>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            setOpen(false)
            onRestart(mode === 'classic' ? 'zen' : 'classic')
          }}
        >
          Switch to {mode === 'classic' ? 'Zen · unlimited moves' : 'Classic · level adventure'}
        </Button>
        <Button
          onClick={() => {
            setOpen(false)
            onRestart(mode)
          }}
        >
          <RotateCcw /> New game
        </Button>
        <Button nativeButton={false} render={<Link to="/pills" />} variant="link">
          Edit demo pill plan
        </Button>
      </DialogContent>
    </Dialog>
  )
}
