/* oxlint-disable jsx-a11y/prefer-tag-over-role -- The interactive ARIA grid uses rows and gridcells for keyboard navigation, not a data table. */
import { useEffect, useRef, useState } from 'react'
import { Application, Assets, Container, Graphics, Rectangle, Sprite, Texture } from 'pixi.js'
import { SIZE } from '@/game/engine'
import type { Pill } from '@/game/engine'
import { useGameStore } from '@/game/store'
import { Artwork } from '@/components/artwork'
import BearRescue from '@/features/BearRescue'
import { ART_SOURCES, TILE_ART, SPECIAL_ART, getTileArt } from '@/lib/art-assets'
import { systemReducesMotion, BIRTH_DURATION } from '@/game/effects'
import { BoardEffects, CELL, BOARD_WIDTH as WIDTH, easeOut } from './game-board-effects'
import type { TileTextures } from './game-board-effects'

function makePill(pill: Pill, textures: TileTextures) {
  const view = new Container()
  const texture = textures[pill.special ?? pill.kind]
  const body = new Sprite(texture)
  body.anchor.set(0.5)
  body.scale.set((CELL - 10) / Math.max(texture.width, texture.height))
  const ring = new Graphics().roundRect(-30, -30, 60, 60, 10).stroke({ color: 0x00ffff, width: 3 })
  ring.visible = false
  if (pill.special)
    view.addChild(
      new Graphics()
        .roundRect(-29, -29, 58, 58, 12)
        .fill({ color: 0xffd62b, alpha: 0.18 })
        .stroke({ color: 0xffe46c, width: 1.5, alpha: 0.8 }),
    )
  view.addChild(body, ring)
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
  const rescue = useGameStore((state) => state.rescue)
  const goal = useGameStore((state) => state.level.goal)
  const wave = useGameStore((state) => state.wave)
  const pointer = useRef<{ index: number; x: number; y: number; id: number } | null>(null)
  const swiped = useRef(false)
  const [focusIndex, setFocusIndex] = useState(0)
  const rescued = new Set(rescue?.rescued)
  const revealedBearCells = new Set(
    goal.type === 'bears'
      ? goal.bears.filter((bear) => !rescued.has(bear.origin)).flatMap((bear) => bear.cells)
      : [],
  )

  useEffect(() => {
    const app = new Application()
    let disposed = false
    let unsubscribe = () => {}
    const effects = new BoardEffects()
    let session = useGameStore.getState().session
    let lastWave = -1
    let lastRemix = -1
    let lastReduced = false
    const nodes = new Map<
      string,
      ReturnType<typeof makePill> & {
        targetX: number
        targetY: number
        clearing: boolean
        index: number
        special: boolean
        revealed: boolean
        bornAt: number | null
      }
    >()
    async function init() {
      try {
        const artwork = { ...TILE_ART, ...SPECIAL_ART }
        const sources = [...new Set(Object.values(artwork).map((art) => art.source))]
        const loaded = new Map(
          await Promise.all(
            sources.map(
              async (source) =>
                [source, await Assets.load<Texture>(ART_SOURCES[source].src)] as const,
            ),
          ),
        )
        const textures = Object.fromEntries(
          Object.entries(artwork).map(([kind, art]) => {
            const [x, y, width, height] = art.crop
            return [
              kind,
              new Texture({
                source: loaded.get(art.source)!.source,
                frame: new Rectangle(x, y, width, height),
              }),
            ]
          }),
        ) as TileTextures
        if (disposed) return
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
              .fill({ color: (row + col) % 2 === 0 ? 0x9eb8ff : 0x8fa7fa, alpha: 0.85 })
          }
        }
        app.stage.addChild(grid)
        app.stage.addChild(effects.layer)
        const sync = () => {
          const state = useGameStore.getState()
          const reduce = state.reducedMotion || systemReducesMotion()
          grid.visible = !state.rescue
          if (session !== state.session) {
            effects.clear()
            session = state.session
          }
          const ids = new Set(state.board.map((pill) => pill.id))
          const clearing = new Set(state.clearing)
          const created = new Set(state.wave?.created)
          const hinted = new Set(state.hint ?? [])
          const rescued = new Set(state.rescue?.rescued)
          const collecting = new Set(state.phase === 'clearing' ? state.wave?.rescuedBears : [])
          const visibleBearCells = new Set(
            state.level.goal.type === 'bears'
              ? state.level.goal.bears
                  .filter((bear) => !rescued.has(bear.origin) || collecting.has(bear.origin))
                  .flatMap((bear) => bear.cells)
              : [],
          )
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
              node = {
                ...makePill(pill, textures),
                targetX: x,
                targetY: y,
                clearing: false,
                index,
                special: Boolean(pill.special),
                revealed: false,
                bornAt:
                  state.phase === 'clearing' && created.has(index)
                    ? (state.wave?.startedAt ?? null)
                    : null,
              }
              node.view.position.set(
                x,
                state.phase === 'falling' && !state.reducedMotion && !systemReducesMotion()
                  ? y - WIDTH
                  : y,
              )
              nodes.set(pill.id, node)
              app.stage.addChild(node.view)
            }
            node.targetX = x
            node.targetY = y
            node.index = index
            node.clearing = clearing.has(index)
            node.revealed = Boolean(
              state.rescue && !state.rescue.covered[index] && visibleBearCells.has(index),
            )
            node.ring.visible = state.selected === index || hinted.has(index)
          })
          if (state.wave && state.wave.id !== lastWave) {
            lastWave = state.wave.id
            effects.wave(state.wave, reduce)
          }
          if (state.remix && state.remix.id !== lastRemix) {
            lastRemix = state.remix.id
            effects.remix(state.remix, textures, reduce)
          }
          app.stage.setChildIndex(effects.layer, app.stage.children.length - 1)
        }
        sync()
        unsubscribe = useGameStore.subscribe(sync)
        app.ticker.add((ticker) => {
          const state = useGameStore.getState()
          const reduce = state.reducedMotion || systemReducesMotion()
          const factor = reduce ? 1 : 1 - Math.pow(0.65, ticker.deltaTime)
          if (reduce !== lastReduced) effects.clear()
          lastReduced = reduce
          effects.tick(ticker.deltaMS)
          for (const node of nodes.values()) {
            if (state.remix && !node.special) {
              const age = Date.now() - state.remix.startedAt
              const rowDelay = Math.floor(node.index / SIZE) * 5
              const u = easeOut((age - 240 - rowDelay) / 200)
              node.view.position.set(
                reduce ? node.targetX : WIDTH / 2 + (node.targetX - WIDTH / 2) * u,
                reduce ? node.targetY : WIDTH / 2 + (node.targetY - WIDTH / 2) * u,
              )
              node.view.alpha = reduce
                ? Math.max(0, Math.min(1, (age - 60) / 60))
                : Math.min(1, u * 5)
              node.view.scale.set(reduce ? 1 : 0.7 + u * 0.3)
              continue
            }
            node.view.x += (node.targetX - node.view.x) * factor
            node.view.y += (node.targetY - node.view.y) * factor
            const targetScale = node.revealed ? 0.65 : node.clearing && !reduce ? 0.8 : 1
            const scale = node.view.scale.x + (targetScale - node.view.scale.x) * factor
            node.view.scale.set(scale)
            if (node.bornAt && !reduce) {
              const u = Math.min(1, (Date.now() - node.bornAt) / BIRTH_DURATION)
              node.view.scale.set(
                u < 0.55
                  ? 0.94 + 0.14 * easeOut(u / 0.55)
                  : 1 + 0.08 * (1 - easeOut((u - 0.55) / 0.45)),
              )
              if (u >= 1) node.bornAt = null
            }
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
      {rescue && goal.type === 'bears' && (
        <BearRescue
          goal={goal}
          rescue={rescue}
          collecting={phase === 'clearing' ? (wave?.rescuedBears ?? []) : []}
        />
      )}
      <div ref={host} className="pixi-host" aria-hidden="true" />
      <div
        className={`board-input ${error ? 'board-fallback' : ''}`}
        role="grid"
        aria-label="Match-three pill board"
        aria-busy={phase !== 'idle'}
        aria-describedby={rescue ? 'bear-rescue-help' : undefined}
        data-rescue={Boolean(rescue) || undefined}
      >
        {Array.from({ length: SIZE }, (_, row) => (
          <div role="row" className="board-row" key={row}>
            {board.slice(row * SIZE, row * SIZE + SIZE).map((pill, col) => {
              const index = row * SIZE + col
              const art = getTileArt(pill)
              return (
                <div role="gridcell" key={index} aria-selected={selected === index}>
                  <button
                    type="button"
                    tabIndex={focusIndex === index ? 0 : -1}
                    aria-label={`${art.label}, row ${row + 1}, column ${col + 1}${hint?.includes(index) ? ', hint' : ''}${rescue ? (rescue.covered[index] ? ', covered' : revealedBearCells.has(index) ? ', bear revealed' : ', uncovered') : ''}`}
                    aria-pressed={selected === index}
                    aria-describedby={pill.special ? 'special-tile-help' : undefined}
                    aria-disabled={disabled}
                    data-hint={hint?.includes(index) || undefined}
                    onFocus={() => setFocusIndex(index)}
                    onClick={(event) => {
                      if (!swiped.current)
                        useGameStore
                          .getState()
                          .select(index, event.detail > 0 ? 'pointer' : 'keyboard')
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
                      void useGameStore.getState().trySwap(start.index, target, 'pointer')
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
                    {error && <Artwork source={art.source} crop={art.crop} />}
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
