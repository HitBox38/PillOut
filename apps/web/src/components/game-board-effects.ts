import { Container, Graphics, Sprite } from 'pixi.js'
import type { Texture } from 'pixi.js'
import { SIZE } from '@/game/engine'
import type { Kind, Special } from '@/game/engine'
import type { BoardRemix, ClearWave } from '@/game/effects'

export const CELL = 64
export const BOARD_WIDTH = CELL * SIZE
export type TileTextures = Record<Kind | Special, Texture>
const GOLD = 0xffe46c
const COLORS = [GOLD, 0x64ffff, 0xff95dc, 0xa7ff67]
const clamp = (value: number) => Math.max(0, Math.min(1, value))
export const easeOut = (value: number) => 1 - (1 - clamp(value)) ** 3
export const tilePoint = (index: number) => ({
  x: (index % SIZE) * CELL + CELL / 2,
  y: Math.floor(index / SIZE) * CELL + CELL / 2,
})

interface Effect {
  view: Container
  age: number
  duration: number
  update: (age: number) => void
}

/** Presentation only: all effect targets and earned tiles come from the resolved wave. */
export class BoardEffects {
  readonly layer = new Container()
  private effects: Effect[] = []

  private add(view: Container, duration: number, update: Effect['update'], age = 0) {
    if (this.effects.length >= 180) return view.destroy({ children: true })
    this.layer.addChild(view)
    this.effects.push({ view, duration, update, age })
    update(age)
  }

  tick(delta: number) {
    this.effects = this.effects.filter((effect) => {
      effect.age += delta
      if (effect.age >= effect.duration) {
        effect.view.destroy({ children: true })
        return false
      }
      effect.update(effect.age)
      return true
    })
  }

  clear() {
    for (const { view } of this.effects) view.destroy({ children: true })
    this.effects = []
  }

  private burst(index: number, count = 12, delay = 0) {
    const origin = tilePoint(index)
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2
      const distance = 30 + (i % 4) * 12
      const dot = new Graphics().roundRect(-3, -6, 6, 12, 3).fill(COLORS[i % COLORS.length]!)
      this.add(dot, 440 + delay, (age) => {
        const u = clamp((age - delay) / 440)
        dot.visible = age >= delay
        dot.position.set(
          origin.x + Math.cos(angle) * distance * easeOut(u),
          origin.y + Math.sin(angle) * distance * easeOut(u) + 20 * u * u,
        )
        dot.rotation = angle + u * 3
        dot.alpha = 1 - u
      })
    }
  }

  wave(wave: ClearWave, reduce: boolean) {
    const elapsed = Date.now() - wave.startedAt
    if (elapsed > 300) return
    for (const activation of wave.activations) {
      const origin = tilePoint(activation.index)
      if (reduce || activation.special === 'crown') {
        for (const index of activation.targets) {
          const point = tilePoint(index)
          const outline = new Graphics()
            .roundRect(-28, -28, 56, 56, 10)
            .stroke({ color: GOLD, width: 3 })
          outline.position.set(point.x, point.y)
          this.add(
            outline,
            220,
            (age) => {
              outline.alpha = Math.sin(clamp(age / 220) * Math.PI)
            },
            elapsed,
          )
        }
      } else if (activation.special === 'bomb') {
        const ring = new Graphics().circle(0, 0, CELL * 1.45).stroke({ color: GOLD, width: 5 })
        ring.position.set(origin.x, origin.y)
        this.add(
          ring,
          220,
          (age) => {
            const u = clamp(age / 220)
            ring.scale.set(0.3 + easeOut(u) * 0.7)
            ring.alpha = 0.9 * (1 - u)
          },
          elapsed,
        )
        this.burst(activation.index, 20)
      } else {
        const row = activation.axis === 'row'
        const beam = new Graphics()
          .roundRect(0, -12, BOARD_WIDTH, 24, 12)
          .fill({ color: 0xfff6bd, alpha: 0.9 })
        beam.position.set(row ? 0 : origin.x, row ? origin.y : 0)
        beam.rotation = row ? 0 : Math.PI / 2
        this.add(
          beam,
          180,
          (age) => {
            const u = clamp(age / 180)
            beam.scale.x = Math.max(0.02, easeOut(u))
            beam.alpha = 1 - u
          },
          elapsed,
        )
        activation.targets.filter((_, i) => i % 2 === 0).forEach((index) => this.burst(index, 4))
      }
    }
    for (const index of wave.created) {
      const point = tilePoint(index)
      const halo = new Graphics().circle(0, 0, 34).stroke({ color: GOLD, width: 3 })
      halo.position.set(point.x, point.y)
      this.add(
        halo,
        180,
        (age) => {
          const u = clamp(age / 180)
          halo.scale.set(reduce ? 1 : 0.7 + easeOut(u) * 0.5)
          halo.alpha = 0.8 * (1 - u)
        },
        elapsed,
      )
      if (!reduce) this.burst(index, 5)
    }
    if (!reduce && wave.combo >= 3) {
      for (const index of wave.clearing.slice(0, 10)) this.burst(index, wave.combo >= 5 ? 10 : 6)
    }
  }

  remix(remix: BoardRemix, textures: TileTextures, reduce: boolean) {
    const elapsed = Date.now() - remix.startedAt
    if (elapsed > (reduce ? 120 : 480)) return
    remix.previous.forEach((pill, index) => {
      if (pill.special) return
      const texture = textures[pill.kind]
      const sprite = new Sprite(texture)
      sprite.anchor.set(0.5)
      const base = (CELL - 10) / Math.max(texture.width, texture.height)
      const origin = tilePoint(index)
      const dx = origin.x - BOARD_WIDTH / 2
      const dy = origin.y - BOARD_WIDTH / 2
      const radius = Math.hypot(dx, dy)
      this.add(
        sprite,
        reduce ? 60 : 240,
        (age) => {
          if (reduce) {
            sprite.position.set(origin.x, origin.y)
            sprite.scale.set(base)
            sprite.alpha = 1 - clamp(age / 60)
            return
          }
          const u = clamp((age - 70) / 170)
          const angle = Math.atan2(dy, dx) + u * Math.PI * 2 * (0.65 + radius / 800)
          const r = radius * (1 - u * u * (3 - 2 * u))
          sprite.position.set(
            BOARD_WIDTH / 2 + Math.cos(angle) * r,
            BOARD_WIDTH / 2 + Math.sin(angle) * r,
          )
          sprite.scale.set(base * (1 - u * 0.55))
          sprite.rotation = age < 70 ? (-0.1 * age) / 70 : u * 3
          sprite.alpha = 1 - clamp((u - 0.8) / 0.2)
        },
        elapsed,
      )
    })
    remix.previous.forEach((pill, index) => {
      if (!pill.special) return
      const point = tilePoint(index)
      // Draw the protected piece above the vortex without moving the semantic tile.
      const texture = textures[pill.special]
      const pin = new Container()
      pin.position.set(point.x, point.y)
      const ring = new Graphics()
        .circle(0, 0, 31)
        .fill({ color: 0x443794, alpha: 0.8 })
        .stroke({ color: GOLD, width: 3 })
      const sprite = new Sprite(texture)
      sprite.anchor.set(0.5)
      sprite.scale.set((CELL - 10) / Math.max(texture.width, texture.height))
      pin.addChild(ring, sprite)
      this.add(pin, reduce ? 120 : 480, () => {}, elapsed)
    })
  }
}
