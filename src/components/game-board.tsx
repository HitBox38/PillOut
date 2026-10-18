import { useEffect, useRef, useState } from 'react'
import { Application, Container, Graphics } from 'pixi.js'
import { SIZE } from '@/game/engine'
import type { Kind, Pill } from '@/game/engine'
import { useGameStore } from '@/game/store'

const CELL = 64
const WIDTH = CELL * SIZE
const COLORS: Record<Kind, { main: number; light: number; dark: number }> = {
  coral: { main: 0xf47865, light: 0xffc3ac, dark: 0xbd4a45 },
  mint: { main: 0x66bda3, light: 0xb9e3bd, dark: 0x3d8a76 },
  gold: { main: 0xf1c554, light: 0xffeaa0, dark: 0xbf9130 },
  lavender: { main: 0xa390d1, light: 0xdbceef, dark: 0x7560a8 },
  blue: { main: 0x76acd4, light: 0xc4dfec, dark: 0x4c82ab },
}

function makePill(pill: Pill) {
  const view = new Container()
  const body = new Container()
  const colors = COLORS[pill.kind]
  body.rotation = -Math.PI / 4
  body.addChild(
    new Graphics().roundRect(-23, -11, 46, 26, 13).fill({ color: 0x333831, alpha: 0.12 }),
  )
  body.addChild(new Graphics().roundRect(-23, -14, 46, 27, 13.5).fill(colors.dark))
  body.addChild(new Graphics().roundRect(-23, -15, 46, 26, 13).fill(colors.main))
  // A rounded end and square seam give the capsule two distinct halves.
  body.addChild(
    new Graphics()
      .roundRect(-23, -15, 26, 26, 13)
      .fill(colors.light)
      .rect(-10, -15, 10, 26)
      .fill(colors.light),
  )
  body.addChild(
    new Graphics()
      .moveTo(0, -14)
      .lineTo(0, 10)
      .stroke({ color: colors.dark, alpha: 0.18, width: 1 }),
  )
  body.addChild(
    new Graphics().roundRect(-13, -11, 22, 3, 1.5).fill({ color: 0xffffff, alpha: 0.42 }),
  )
  const ring = new Graphics()
    .roundRect(-28, -28, 56, 56, 15)
    .stroke({ color: 0x476a52, width: 2.4 })
  ring.visible = false
  view.addChild(ring, body)
  return { view, ring }
}

export function GameBoard() {
  const host = useRef<HTMLDivElement>(null)
  const [error, setError] = useState(false)
  const board = useGameStore((state) => state.board)
  const selected = useGameStore((state) => state.selected)
  const paused = useGameStore((state) => state.paused)
  const outcome = useGameStore((state) => state.outcome)
  const phase = useGameStore((state) => state.phase)
  const hint = useGameStore((state) => state.hint)
  const pointer = useRef<{ index: number; x: number; y: number; id: number } | null>(null)
  const swiped = useRef(false)
  const [focusIndex, setFocusIndex] = useState(0)

  useEffect(() => {
    const app = new Application()
    let disposed = false
    let unsubscribe = () => {}
    const nodes = new Map<
      string,
      ReturnType<typeof makePill> & { targetX: number; targetY: number; clearing: boolean }
    >()
    async function init() {
      try {
        await app.init({
          width: WIDTH,
          height: WIDTH,
          backgroundAlpha: 0,
          antialias: true,
          resolution: Math.min(window.devicePixelRatio || 1, 2),
          autoDensity: true,
          preference: 'webgl',
        })
        if (disposed) {
          app.destroy(true, { children: true })
          return
        }
        host.current?.appendChild(app.canvas)
        const grid = new Graphics()
        for (let row = 0; row < SIZE; row++) {
          for (let col = 0; col < SIZE; col++) {
            grid
              .roundRect(col * CELL + 2, row * CELL + 2, CELL - 4, CELL - 4, 14)
              .fill({ color: (row + col) % 2 === 0 ? 0xeceee4 : 0xe4e8dc, alpha: 0.85 })
          }
        }
        app.stage.addChild(grid)
        const sync = () => {
          const state = useGameStore.getState()
          const ids = new Set(state.board.map((pill) => pill.id))
          for (const [id, node] of nodes) {
            if (!ids.has(id)) {
              node.view.destroy({ children: true })
              nodes.delete(id)
            }
          }
          state.board.forEach((pill, index) => {
            const x = (index % SIZE) * CELL + CELL / 2
            const y = Math.floor(index / SIZE) * CELL + CELL / 2
            let node = nodes.get(pill.id)
            if (!node) {
              node = { ...makePill(pill), targetX: x, targetY: y, clearing: false }
              node.view.position.set(
                x,
                state.phase === 'falling' && !state.reducedMotion ? y - WIDTH : y,
              )
              nodes.set(pill.id, node)
              app.stage.addChild(node.view)
            }
            node.targetX = x
            node.targetY = y
            node.clearing = state.clearing.includes(index)
            node.ring.visible = state.selected === index || Boolean(state.hint?.includes(index))
          })
        }
        sync()
        unsubscribe = useGameStore.subscribe(sync)
        app.ticker.add((ticker) => {
          const reduce =
            useGameStore.getState().reducedMotion ||
            window.matchMedia('(prefers-reduced-motion: reduce)').matches
          const factor = reduce ? 1 : 1 - Math.pow(0.65, ticker.deltaTime)
          for (const node of nodes.values()) {
            node.view.x += (node.targetX - node.view.x) * factor
            node.view.y += (node.targetY - node.view.y) * factor
            const targetScale = node.clearing ? 0.8 : 1
            const scale = node.view.scale.x + (targetScale - node.view.scale.x) * factor
            node.view.scale.set(scale)
            node.view.alpha += ((node.clearing ? 0 : 1) - node.view.alpha) * factor
          }
        })
      } catch (cause) {
        console.error('Unable to initialize the Pixi board', cause)
        if (!disposed) setError(true)
      }
    }
    void init()
    return () => {
      disposed = true
      unsubscribe()
      if (app.renderer) app.destroy(true, { children: true })
    }
  }, [])

  const disabled = paused || outcome !== 'playing' || phase !== 'idle'

  return (
    <div className="board-surface">
      <div ref={host} className="pixi-host" aria-hidden="true" />
      <div
        className={`board-input ${error ? 'board-fallback' : ''}`}
        role="grid"
        aria-label="Match-three pill board"
        aria-busy={phase !== 'idle'}
      >
        {Array.from({ length: SIZE }, (_, row) => (
          <div role="row" className="board-row" key={row}>
            {board.slice(row * SIZE, row * SIZE + SIZE).map((pill, col) => {
              const index = row * SIZE + col
              return (
                <div role="gridcell" key={index} aria-selected={selected === index}>
                  <button
                    type="button"
                    tabIndex={focusIndex === index ? 0 : -1}
                    aria-label={`${pill.kind} pill, row ${row + 1}, column ${col + 1}${hint?.includes(index) ? ', hint' : ''}`}
                    aria-pressed={selected === index}
                    aria-disabled={disabled}
                    data-hint={hint?.includes(index) || undefined}
                    onFocus={() => setFocusIndex(index)}
                    onClick={() => {
                      if (!swiped.current) useGameStore.getState().select(index)
                      swiped.current = false
                    }}
                    onPointerDown={(event) => {
                      if (disabled || pointer.current || !event.isPrimary) return
                      swiped.current = false
                      pointer.current = {
                        index,
                        x: event.clientX,
                        y: event.clientY,
                        id: event.pointerId,
                      }
                      event.currentTarget.setPointerCapture(event.pointerId)
                    }}
                    onPointerUp={(event) => {
                      const start = pointer.current
                      if (!start || start.id !== event.pointerId) return
                      pointer.current = null
                      const dx = event.clientX - start.x
                      const dy = event.clientY - start.y
                      if (Math.max(Math.abs(dx), Math.abs(dy)) < 15) return
                      swiped.current = true
                      const target =
                        start.index +
                        (Math.abs(dx) > Math.abs(dy) ? Math.sign(dx) : Math.sign(dy) * SIZE)
                      void useGameStore.getState().trySwap(start.index, target)
                    }}
                    onPointerCancel={() => {
                      pointer.current = null
                      swiped.current = false
                    }}
                    onKeyDown={(event) => {
                      const next = {
                        ArrowLeft: Math.max(row * SIZE, index - 1),
                        ArrowRight: Math.min(row * SIZE + SIZE - 1, index + 1),
                        ArrowUp: Math.max(col, index - SIZE),
                        ArrowDown: Math.min((SIZE - 1) * SIZE + col, index + SIZE),
                      }[event.key]
                      if (next !== undefined) {
                        event.preventDefault()
                        const buttons = event.currentTarget
                          .closest('[role="grid"]')
                          ?.querySelectorAll('button')
                        ;(buttons?.[next] as HTMLButtonElement | undefined)?.focus()
                      }
                      if (event.key === 'Escape')
                        useGameStore.setState({ selected: null, hint: null })
                    }}
                  >
                    {error && <span className={`pill pill-${pill.kind}`} />}
                  </button>
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
