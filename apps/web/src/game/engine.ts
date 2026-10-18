export const SIZE = 8
export const KINDS = ['coral', 'mint', 'gold', 'lavender', 'blue'] as const
export type Kind = (typeof KINDS)[number]
export type Pill = { id: string; kind: Kind }
export type Board = Pill[]
export type Move = readonly [number, number]
export type Random = () => number

let nextId = 0
const pill = (random: Random): Pill => ({
  id: `pill-${nextId++}`,
  kind: KINDS[Math.floor(random() * KINDS.length)]!,
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

/** Union of horizontal and vertical runs; intersections score only once. */
export function findMatches(board: Board): number[] {
  const matched = new Set<number>()
  for (let row = 0; row < SIZE; row++) {
    for (let col = 0; col < SIZE; col++) {
      const index = row * SIZE + col
      for (const step of [1, SIZE]) {
        if ((step === 1 && col > SIZE - 3) || (step === SIZE && row > SIZE - 3)) continue
        const run = [index]
        for (
          let n = index + step;
          n < board.length && (step === SIZE || Math.floor(n / SIZE) === row);
          n += step
        ) {
          if (board[n]?.kind !== board[index]?.kind) break
          run.push(n)
        }
        if (run.length >= 3) run.forEach((n) => matched.add(n))
      }
    }
  }
  return [...matched]
}

export function findMove(board: Board): Move | null {
  for (let i = 0; i < board.length; i++) {
    for (const j of [i + 1, i + SIZE]) {
      if (adjacent(i, j) && findMatches(swap(board, i, j)).length) return [i, j]
    }
  }
  return null
}

/** No free opening matches, and at least one legal move. */
export function createBoard(random: Random = Math.random): Board {
  for (let attempt = 0; attempt < 100; attempt++) {
    const board: Board = []
    for (let i = 0; i < SIZE * SIZE; i++) {
      const forbidden = new Set<Kind>()
      if (i % SIZE >= 2 && board[i - 1]?.kind === board[i - 2]?.kind)
        forbidden.add(board[i - 1]!.kind)
      if (i >= SIZE * 2 && board[i - SIZE]?.kind === board[i - SIZE * 2]?.kind)
        forbidden.add(board[i - SIZE]!.kind)
      const options = KINDS.filter((kind) => !forbidden.has(kind))
      board.push({ ...pill(random), kind: options[Math.floor(random() * options.length)]! })
    }
    if (findMove(board)) return board
  }
  throw new Error('Unable to generate a playable board')
}

/** Stable gravity keeps surviving pills in their original vertical order. */
export function collapse(board: Board, matched: number[], random: Random = Math.random): Board {
  const removed = new Set(matched)
  const result: Board = []
  for (let col = 0; col < SIZE; col++) {
    const survivors: Pill[] = []
    for (let row = 0; row < SIZE; row++) {
      const index = row * SIZE + col
      if (!removed.has(index)) survivors.push(board[index]!)
    }
    for (let row = SIZE - 1; row >= 0; row--)
      result[row * SIZE + col] = survivors.pop() ?? pill(random)
  }
  return result
}
