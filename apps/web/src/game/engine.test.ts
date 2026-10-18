import { describe, expect, it } from 'vitest'
import { adjacent, collapse, createBoard, findMatches, findMove, KINDS, SIZE, swap } from './engine'
import type { Board } from './engine'

function random(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0
    return seed / 2 ** 32
  }
}
function cleanBoard(): Board {
  return Array.from({ length: SIZE * SIZE }, (_, i) => ({
    id: `test-${i}`,
    kind: KINDS[(Math.floor(i / SIZE) * 2 + (i % SIZE)) % KINDS.length]!,
  }))
}

describe('match-three rules', () => {
  it('creates full, uniquely identified boards without opening matches and with legal moves', () => {
    for (let seed = 0; seed < 100; seed++) {
      const board = createBoard(random(seed))
      expect(board).toHaveLength(64)
      expect(new Set(board.map((pill) => pill.id)).size).toBe(64)
      expect(findMatches(board)).toEqual([])
      const move = findMove(board)!
      expect(move).not.toBeNull()
      expect(findMatches(swap(board, ...move)).length).toBeGreaterThanOrEqual(3)
    }
  })

  it('rejects row wrapping, diagonals, out of bounds, and self-swaps', () => {
    for (const [a, b] of [
      [7, 8],
      [0, 9],
      [-1, 0],
      [63, 64],
      [0, 0],
    ])
      expect(adjacent(a!, b!)).toBe(false)
    expect(adjacent(7, 15)).toBe(true)
    expect(adjacent(9, 10)).toBe(true)
  })

  it('matches runs longer than three and counts intersecting cells once', () => {
    const board = cleanBoard()
    for (const index of [17, 18, 19, 20, 10, 26])
      board[index] = { id: `cross-${index}`, kind: 'coral' }
    board[34] = { id: 'below-cross', kind: 'blue' }
    expect(new Set(findMatches(board))).toEqual(new Set([17, 18, 19, 20, 10, 26]))
  })

  it('never treats the end of one row and beginning of another as a match', () => {
    const board = cleanBoard()
    for (const index of [7, 8, 9]) board[index] = { id: `edge-${index}`, kind: 'coral' }
    expect(findMatches(board)).toEqual([])
  })

  it('applies stable column gravity and refills only cleared cells', () => {
    const board = cleanBoard()
    const result = collapse(board, [16, 32, 48], random(42))
    expect(result).toHaveLength(64)
    expect([result[24], result[32], result[40], result[48], result[56]]).toEqual([
      board[0],
      board[8],
      board[24],
      board[40],
      board[56],
    ])
    const unchangedIndices = Array.from({ length: 64 }, (_, i) => i).filter((i) => i % SIZE !== 0)
    for (const i of unchangedIndices) expect(result[i]).toBe(board[i])
    expect(new Set(result.map((pill) => pill.id)).size).toBe(64)
    expect(board[16]!.id).toBe('test-16')
  })

  it('swaps without mutating the source board', () => {
    const board = cleanBoard()
    const result = swap(board, 0, 1)
    expect(result[0]).toBe(board[1])
    expect(result[1]).toBe(board[0])
    expect(board[0]!.id).toBe('test-0')
  })
})
