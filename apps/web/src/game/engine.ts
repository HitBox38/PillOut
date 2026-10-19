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

export type Difficulty = 'warmup' | 'breather' | 'steady' | 'challenge'
export interface Bear {
  origin: number
  cells: readonly number[]
}
export type LevelGoal =
  | { type: 'score'; target: number }
  | { type: 'bears'; bears: readonly Bear[] }
export interface RescueState {
  covered: readonly boolean[]
  rescued: readonly number[]
}
export interface LevelConfig {
  number: number
  chapter: number
  stage: number
  difficulty: Difficulty
  label: string
  tip: string
  goal: LevelGoal
  moves: number
  bonusMoves: number
}

// Median score over 24 random legal moves, including specials and cascades.
// Recalibrate with `pnpm --filter @pillout/web run difficulty:report` after rule changes.
const POOL_SCORE_BASELINES = [117500, 32550, 13200, 9100, 6800, 5700, 5450, 4950, 4650, 4500]
const LEVEL_WAVE = [
  {
    difficulty: 'warmup',
    label: 'Warm-up',
    pressure: 0.1,
    moves: 24,
    tip: 'Start with three of a kind. There’s no rush.',
  },
  {
    difficulty: 'warmup',
    label: 'Find your flow',
    pressure: 0.16,
    moves: 24,
    tip: 'Look for a match of four to earn a hammer.',
  },
  {
    difficulty: 'steady',
    label: 'Build momentum',
    pressure: 0.24,
    moves: 24,
    tip: 'Try a T or L match to earn a bomb.',
  },
  {
    difficulty: 'steady',
    label: 'Keep it going',
    pressure: 0.36,
    moves: 24,
    tip: 'Matches near the bottom can set up cascades.',
  },
  {
    difficulty: 'challenge',
    label: 'A little challenge',
    pressure: 0.55,
    moves: 22,
    tip: 'Save a special for a chance to start a chain.',
  },
  {
    difficulty: 'breather',
    label: 'Take a breather',
    pressure: 0.28,
    moves: 26,
    tip: 'A gentler goal and a little more room to play.',
  },
  {
    difficulty: 'steady',
    label: 'Back in the flow',
    pressure: 0.45,
    moves: 24,
    tip: 'Scan the whole board before choosing your match.',
  },
  {
    difficulty: 'challenge',
    label: 'Make it special',
    pressure: 0.65,
    moves: 22,
    tip: 'Five in a line earns a crown. Special chains go a long way.',
  },
  {
    difficulty: 'breather',
    label: 'Room to breathe',
    pressure: 0.4,
    moves: 26,
    tip: 'Enjoy the extra space. Hints and shuffles are always free.',
  },
  {
    difficulty: 'challenge',
    label: 'Chapter challenge',
    pressure: 0.85,
    moves: 22,
    tip: 'Put it all together: specials, chains, and cascades.',
  },
] as const

export function getLevelConfig(number: number, kindCount: number, losses = 0): LevelConfig {
  if (!Number.isSafeInteger(number) || number < 1 || number >= Number.MAX_SAFE_INTEGER)
    throw new RangeError('Level must be a positive safe integer with room to advance')
  if (!Number.isInteger(kindCount) || kindCount < 3 || kindCount > KINDS.length)
    throw new RangeError('Unsupported tile pool size')
  if (!Number.isSafeInteger(losses) || losses < 0)
    throw new RangeError('Losses must be a nonnegative safe integer')
  const chapter = Math.floor((number - 1) / LEVEL_WAVE.length)
  const stage = (number - 1) % LEVEL_WAVE.length
  const template = LEVEL_WAVE[stage]!
  const growth = 1 + Math.min(chapter, 10) * 0.02
  // Onboarding happens once; subsequent chapters start with a modest recovery level.
  const pressure = chapter > 0 && stage < 3 ? [0.32, 0.4, 0.48][stage]! : template.pressure
  const bonusMoves = Math.min(6, Math.floor(Math.max(0, losses) / 2) * 2)
  const baseline = POOL_SCORE_BASELINES[kindCount - 3]!
  // Challenge goals exceed the guaranteed 150 points per successful move,
  // including with large pools where cascades are less frequent.
  const minimumScore = template.moves * 150
  const target =
    template.difficulty === 'challenge'
      ? minimumScore + ((baseline * template.moves) / 24 - minimumScore) * pressure
      : baseline * pressure
  const goal = getLevelGoal(stage + 1, Math.max(1000, Math.round((target * growth) / 50) * 50))
  return {
    number,
    chapter: chapter + 1,
    stage: stage + 1,
    difficulty:
      chapter > 0 && stage < 3 ? (stage === 0 ? 'breather' : 'steady') : template.difficulty,
    label:
      goal.type === 'bears'
        ? goal.bears.length === 1
          ? 'Find the bear'
          : 'Find the bears'
        : chapter > 0 && stage < 3
          ? ['A fresh chapter', 'Find your rhythm', 'Build momentum'][stage]!
          : template.label,
    tip:
      goal.type === 'bears' ? 'Match over the covering to reveal every hidden bear.' : template.tip,
    goal,
    moves: template.moves + bonusMoves,
    bonusMoves,
  }
}

function getLevelGoal(stage: number, target: number): LevelGoal {
  const origins = stage === 1 ? [27] : stage === 4 ? [17, 45] : stage === 8 ? [10, 29, 49] : null
  return origins
    ? {
        type: 'bears',
        bears: origins.map((origin) => ({
          origin,
          cells: [origin, origin + 1, origin + SIZE, origin + SIZE + 1],
        })),
      }
    : { type: 'score', target }
}

export function createRescue(goal: LevelGoal): RescueState | null {
  return goal.type === 'bears'
    ? { covered: Array<boolean>(SIZE * SIZE).fill(true), rescued: [] }
    : null
}

/** Covering belongs to board positions, including the positions earning a special. */
export function resolveRescue(
  goal: LevelGoal,
  rescue: RescueState | null,
  resolution: Pick<Resolution, 'clearing' | 'created'>,
): RescueState | null {
  if (goal.type !== 'bears' || !rescue) return null
  const covered = [...rescue.covered]
  for (const index of [...resolution.clearing, ...resolution.created]) covered[index] = false
  return {
    covered,
    rescued: goal.bears
      .filter((bear) => bear.cells.every((index) => !covered[index]))
      .map((bear) => bear.origin),
  }
}

export function goalReached(goal: LevelGoal, score: number, rescue: RescueState | null): boolean {
  return goal.type === 'score' ? score >= goal.target : rescue?.rescued.length === goal.bears.length
}

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
