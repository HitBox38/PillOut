import { MEDICINE_IDS } from './medicines'

export const SIZE = 8
export const FRUIT_KINDS = ['mint', 'gold', 'lavender'] as const
export const KINDS = [...FRUIT_KINDS, ...MEDICINE_IDS] as const
export type Kind = (typeof KINDS)[number]
export type Special = 'bomb' | 'hammer' | 'crown'
export type Axis = 'row' | 'column'
export type Pill = { id: string; kind: Kind; special?: Special; axis?: Axis }
export type Board = Pill[]
export type Move = readonly [number, number]
export type Random = () => number

let nextId = 0
const pill = (random: Random, kinds: readonly Kind[]): Pill => ({
  id: `pill-${nextId++}`,
  kind: kinds[Math.floor(random() * kinds.length)]!,
})

export function adjacent(a: number, b: number): boolean {
  return (
    a >= 0 &&
    b >= 0 &&
    a < SIZE * SIZE &&
    b < SIZE * SIZE &&
    Math.abs(Math.floor(a / SIZE) - Math.floor(b / SIZE)) + Math.abs((a % SIZE) - (b % SIZE)) === 1
  )
}

export function swap(board: Board, a: number, b: number): Board {
  const result = [...board]
  ;[result[a], result[b]] = [result[b]!, result[a]!]
  return result
}

interface Run {
  indices: number[]
  axis: Axis
}

/** Specials activate by swapping; their hidden base kind never participates in matches. */
function findRuns(board: Board): Run[] {
  const runs: Run[] = []
  for (let index = 0; index < board.length; index++) {
    const tile = board[index]!
    if (tile.special) continue
    for (const step of [1, SIZE]) {
      const previous = index - step
      if (
        previous >= 0 &&
        (step === SIZE || index % SIZE !== 0) &&
        !board[previous]!.special &&
        board[previous]!.kind === tile.kind
      )
        continue
      const indices = [index]
      for (
        let next = index + step;
        next < board.length &&
        (step === SIZE || Math.floor(next / SIZE) === Math.floor(index / SIZE));
        next += step
      ) {
        if (board[next]!.special || board[next]!.kind !== tile.kind) break
        indices.push(next)
      }
      if (indices.length >= 3) runs.push({ indices, axis: step === 1 ? 'row' : 'column' })
    }
  }
  return runs
}

/** Union of horizontal or vertical runs; each position appears once. */
export function findMatches(board: Board): number[] {
  return [...new Set(findRuns(board).flatMap((run) => run.indices))]
}

export function findMove(board: Board): Move | null {
  for (let i = 0; i < board.length; i++) {
    for (const j of [i + 1, i + SIZE]) {
      if (
        adjacent(i, j) &&
        (board[i]!.special || board[j]!.special || findMatches(swap(board, i, j)).length)
      )
        return [i, j]
    }
  }
  return null
}

export interface SpecialActivation {
  index: number
  special: Special
  axis?: Axis
  targets: number[]
}

export interface Resolution {
  board: Board
  clearing: number[]
  created: number[]
  activated: Special[]
  activations: SpecialActivation[]
}

/** Resolve one wave on an already-swapped board, without gravity or random refills. */
export function resolveBoard(board: Board, move?: Move): Resolution {
  const result: Resolution = {
    board: [...board],
    clearing: [],
    created: [],
    activated: [],
    activations: [],
  }
  if (move && !adjacent(...move)) return result
  const runs = findRuns(board)
  const clearing = new Set(runs.flatMap((run) => run.indices))
  const remaining = new Set(runs)
  const protectedTiles = new Set<number>()
  // Intersecting runs form one match and earn at most one special: crown, bomb, hammer.
  while (remaining.size) {
    const group: Run[] = [remaining.values().next().value!]
    remaining.delete(group[0]!)
    const cells = new Set(group[0]!.indices)
    for (let i = 0; i < group.length; i++) {
      for (const run of remaining) {
        if (!run.indices.some((index) => cells.has(index))) continue
        group.push(run)
        run.indices.forEach((index) => cells.add(index))
        remaining.delete(run)
      }
    }
    const longest = group.reduce((best, run) =>
      run.indices.length > best.indices.length ? run : best,
    )
    const special: Special | undefined =
      longest.indices.length >= 5
        ? 'crown'
        : group.some((run) => run.axis !== longest.axis)
          ? 'bomb'
          : longest.indices.length === 4
            ? 'hammer'
            : undefined
    if (!special) continue
    const intersection = longest.indices.find((index) =>
      group.some((run) => run !== longest && run.indices.includes(index)),
    )
    const index =
      move && cells.has(move[1])
        ? move[1]
        : move && cells.has(move[0])
          ? move[0]
          : (intersection ?? longest.indices[Math.floor(longest.indices.length / 2)]!)
    result.board[index] = {
      ...board[index]!,
      id: `special-${nextId++}`,
      special,
      ...(special === 'hammer' ? { axis: longest.axis } : {}),
    }
    result.created.push(index)
    clearing.delete(index)
    protectedTiles.add(index)
  }

  const activated = new Set<number>()
  const queue: { index: number; axis?: Axis; target?: Kind; wholeBoard?: boolean }[] = []
  const add = (index: number) => {
    if (protectedTiles.has(index)) return
    clearing.add(index)
    if (result.board[index]!.special && !activated.has(index)) queue.push({ index })
  }
  if (move) {
    const axis: Axis = Math.abs(move[0] - move[1]) === 1 ? 'row' : 'column'
    for (const index of move) {
      if (!board[index]!.special) continue
      const other = board[index === move[0] ? move[1] : move[0]]!
      queue.push({
        index,
        axis,
        target: other.special ? undefined : other.kind,
        wholeBoard: board[index]!.special === 'crown' && other.special === 'crown',
      })
    }
  }
  for (let cursor = 0; cursor < queue.length; cursor++) {
    const activation = queue[cursor]!
    const { index } = activation
    if (activated.has(index)) continue
    activated.add(index)
    clearing.add(index)
    const tile = result.board[index]!
    const special = tile.special!
    result.activated.push(special)
    const effect: SpecialActivation = {
      index,
      special,
      axis: activation.axis ?? tile.axis,
      targets: [index],
    }
    result.activations.push(effect)
    const affect = (target: number) => {
      if (protectedTiles.has(target)) return
      if (!effect.targets.includes(target)) effect.targets.push(target)
      add(target)
    }
    const row = Math.floor(index / SIZE)
    const col = index % SIZE
    if (activation.wholeBoard) {
      for (let cell = 0; cell < board.length; cell++) affect(cell)
    } else if (special === 'bomb') {
      for (let r = Math.max(0, row - 1); r <= Math.min(SIZE - 1, row + 1); r++)
        for (let c = Math.max(0, col - 1); c <= Math.min(SIZE - 1, col + 1); c++)
          affect(r * SIZE + c)
    } else if (special === 'hammer') {
      const axis = activation.axis ?? tile.axis ?? 'row'
      for (let offset = 0; offset < SIZE; offset++)
        affect(axis === 'row' ? row * SIZE + offset : offset * SIZE + col)
    } else {
      // A crown hit by another effect targets the most common regular type; ties use KINDS order.
      const counts = KINDS.map((kind) => ({
        kind,
        count: board.filter((cell) => !cell.special && cell.kind === kind).length,
      }))
      const target =
        activation.target ??
        counts.reduce((best, entry) => (entry.count > best.count ? entry : best)).kind
      result.board.forEach((cell, i) => {
        if (!cell.special && cell.kind === target) affect(i)
      })
    }
  }
  result.clearing = [...clearing].sort((a, b) => a - b)
  return result
}

/** No free opening matches, and at least one legal move. */
export function createBoard(
  random: Random = Math.random,
  kinds: readonly Kind[] = FRUIT_KINDS,
): Board {
  if (new Set(kinds).size < 3) throw new RangeError('A board needs at least three tile kinds')
  for (let attempt = 0; attempt < 100; attempt++) {
    const board: Board = []
    for (let i = 0; i < SIZE * SIZE; i++) {
      const forbidden = new Set<Kind>()
      if (i % SIZE >= 2 && board[i - 1]?.kind === board[i - 2]?.kind)
        forbidden.add(board[i - 1]!.kind)
      if (i >= SIZE * 2 && board[i - SIZE]?.kind === board[i - SIZE * 2]?.kind)
        forbidden.add(board[i - SIZE]!.kind)
      const options = kinds.filter((kind) => !forbidden.has(kind))
      board.push({ ...pill(random, kinds), kind: options[Math.floor(random() * options.length)]! })
    }
    if (findMove(board)) return board
  }
  throw new Error('Unable to generate a playable board')
}

/** Stable gravity keeps surviving pills in their original vertical order. */
export function collapse(
  board: Board,
  matched: number[],
  random: Random = Math.random,
  kinds: readonly Kind[] = FRUIT_KINDS,
): Board {
  const removed = new Set(matched)
  const result: Board = []
  for (let col = 0; col < SIZE; col++) {
    const survivors: Pill[] = []
    for (let row = 0; row < SIZE; row++) {
      const index = row * SIZE + col
      if (!removed.has(index)) survivors.push(board[index]!)
    }
    for (let row = SIZE - 1; row >= 0; row--)
      result[row * SIZE + col] = survivors.pop() ?? pill(random, kinds)
  }
  return result
}

/** Shuffle regular tiles while preserving earned specials at their current positions. */
export function shuffleBoard(
  board: Board,
  random: Random = Math.random,
  kinds: readonly Kind[] = FRUIT_KINDS,
): Board {
  return createBoard(random, kinds).map((tile, index) =>
    board[index]!.special ? board[index]! : tile,
  )
}
