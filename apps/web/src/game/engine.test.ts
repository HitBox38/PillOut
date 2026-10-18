import { describe, expect, it } from 'vitest'
import {
  adjacent,
  collapse,
  createBoard,
  findMatches,
  findMove,
  SIZE,
  swap,
  resolveBoard,
  shuffleBoard,
} from './engine'
import type { Board } from './engine'

const FIXTURE_KINDS = ['mercaptopurine', 'mint', 'gold', 'lavender', 'methotrexate'] as const

function random(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0
    return seed / 2 ** 32
  }
}
function cleanBoard(): Board {
  return Array.from({ length: SIZE * SIZE }, (_, i) => ({
    id: `test-${i}`,
    kind: FIXTURE_KINDS[(Math.floor(i / SIZE) * 2 + (i % SIZE)) % FIXTURE_KINDS.length]!,
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
      board[index] = { id: `cross-${index}`, kind: 'mercaptopurine' }
    board[34] = { id: 'below-cross', kind: 'methotrexate' }
    expect(new Set(findMatches(board))).toEqual(new Set([17, 18, 19, 20, 10, 26]))
  })

  it('never treats the end of one row and beginning of another as a match', () => {
    const board = cleanBoard()
    for (const index of [7, 8, 9]) board[index] = { id: `edge-${index}`, kind: 'mercaptopurine' }
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

describe('special tiles', () => {
  it('keeps a three-tile match ordinary and earns a hammer from four', () => {
    const board = cleanBoard()
    for (const index of [17, 18, 19]) board[index] = { ...board[index]!, kind: 'mercaptopurine' }
    expect(resolveBoard(board).created).toEqual([])
    board[20] = { ...board[20]!, kind: 'mercaptopurine' }
    const result = resolveBoard(board, [11, 19])
    expect(result.created).toEqual([19])
    expect(result.board[19]).toMatchObject({ special: 'hammer', axis: 'row' })
    expect(result.clearing).toEqual([17, 18, 20])
    expect(board[19]!.special).toBeUndefined()
    const fallen = collapse(result.board, result.clearing, random(7))
    expect(fallen.some((tile) => tile.id === result.board[19]!.id)).toBe(true)
  })

  it('earns a column hammer from a vertical four and a crown from five', () => {
    const vertical = cleanBoard()
    for (const index of [10, 18, 26, 34])
      vertical[index] = { ...vertical[index]!, kind: 'mercaptopurine' }
    const hammer = resolveBoard(vertical)
    expect(hammer.board[hammer.created[0]!]!).toMatchObject({ special: 'hammer', axis: 'column' })
    const horizontal = cleanBoard()
    for (const index of [17, 18, 19, 20, 21])
      horizontal[index] = { ...horizontal[index]!, kind: 'mercaptopurine' }
    horizontal[22] = { ...horizontal[22]!, kind: 'methotrexate' }
    const crown = resolveBoard(horizontal)
    expect(crown.created).toHaveLength(1)
    expect(crown.board[crown.created[0]!]!.special).toBe('crown')
    expect(crown.clearing).toHaveLength(4)
  })

  it.each([
    [10, 18, 25, 26, 27],
    [10, 18, 26, 27, 28],
  ])('earns one bomb for a T or L shape: %j', (...indices) => {
    const board = cleanBoard()
    board[34] = { ...board[34]!, kind: 'methotrexate' }
    board[28] = { ...board[28]!, kind: 'mint' }
    for (const index of indices) board[index] = { ...board[index]!, kind: 'mercaptopurine' }
    const result = resolveBoard(board)
    expect(result.created).toEqual([26])
    expect(result.board[26]!.special).toBe('bomb')
    expect(result.clearing).toHaveLength(4)
  })

  it('clips a bomb at the board corner without wrapping or mutating the source', () => {
    const board = cleanBoard()
    board[1] = { ...board[1]!, special: 'bomb' }
    const result = resolveBoard(swap(board, 0, 1), [0, 1])
    expect(result.clearing).toEqual([0, 1, 8, 9])
    expect(result.activated).toEqual(['bomb'])
    expect(board[1]!.special).toBe('bomb')
  })

  it('clears a full 3 by 3 area around a swapped bomb', () => {
    const board = cleanBoard()
    board[26] = { ...board[26]!, special: 'bomb' }
    expect(resolveBoard(swap(board, 26, 27), [26, 27]).clearing).toEqual([
      18, 19, 20, 26, 27, 28, 34, 35, 36,
    ])
  })

  it.each([
    ['row', 28, [24, 25, 26, 27, 28, 29, 30, 31]],
    ['column', 35, [3, 11, 19, 27, 35, 43, 51, 59]],
  ] as const)('uses the swap direction for a hammer: %s', (_axis, target, cleared) => {
    const board = cleanBoard()
    board[27] = { ...board[27]!, special: 'hammer', axis: 'column' }
    expect(resolveBoard(swap(board, 27, target), [27, target]).clearing).toEqual(cleared)
  })

  it('clears precisely the regular type swapped with a crown', () => {
    const board = cleanBoard()
    board[27] = { ...board[27]!, special: 'crown' }
    const swapped = swap(board, 27, 28)
    const result = resolveBoard(swapped, [27, 28])
    expect(result.clearing).toEqual(
      swapped.flatMap((tile, index) =>
        index === 28 || tile.kind === 'mercaptopurine' ? [index] : [],
      ),
    )
    expect(result.activated).toEqual(['crown'])
  })

  it('chains nearby specials once each and never counts overlapping blasts twice', () => {
    const board = cleanBoard()
    board[26] = { ...board[26]!, special: 'bomb' }
    board[28] = { ...board[28]!, special: 'hammer', axis: 'column' }
    board[36] = { ...board[36]!, special: 'bomb' }
    const result = resolveBoard(swap(board, 26, 27), [26, 27])
    expect(result.activated.filter((special) => special === 'bomb')).toHaveLength(2)
    expect(result.activated.filter((special) => special === 'hammer')).toHaveLength(1)
    expect(result.clearing).toContain(60)
    expect(result.clearing).toContain(45)
    expect(result.clearing).not.toContain(0)
    expect(new Set(result.clearing).size).toBe(result.clearing.length)
  })

  it('clears the whole board when two crowns are swapped', () => {
    const board = cleanBoard()
    board[26] = { ...board[26]!, special: 'crown' }
    board[27] = { ...board[27]!, special: 'crown' }
    expect(resolveBoard(swap(board, 26, 27), [26, 27]).clearing).toHaveLength(64)
  })

  it('treats special swaps as legal hints and never matches their hidden base kind', () => {
    const board = cleanBoard()
    expect(findMove(board)).toBeNull()
    for (const index of [17, 18, 19]) board[index] = { ...board[index]!, kind: 'mercaptopurine' }
    board[18] = { ...board[18]!, special: 'bomb' }
    expect(findMatches(board)).toEqual([])
    const move = findMove(board)!
    expect(move).not.toBeNull()
    expect(resolveBoard(swap(board, ...move), move).activated).toContain('bomb')
  })
})

describe('special survival and priority', () => {
  it('awards a crown rather than a bomb when a five-tile line also intersects another run', () => {
    const board = cleanBoard()
    for (const index of [17, 18, 19, 20, 21, 11, 27])
      board[index] = { ...board[index]!, kind: 'mercaptopurine' }
    board[22] = { ...board[22]!, kind: 'methotrexate' }
    const result = resolveBoard(board)
    expect(result.created).toHaveLength(1)
    expect(result.board[result.created[0]!]!.special).toBe('crown')
  })

  it('earns separate specials for independent matches in the same cascade', () => {
    const board = cleanBoard()
    for (const index of [17, 18, 19, 20])
      board[index] = { ...board[index]!, kind: 'mercaptopurine' }
    for (const index of [49, 50, 51, 52, 53])
      board[index] = { ...board[index]!, kind: 'methotrexate' }
    const result = resolveBoard(board)
    expect(result.created.map((index) => result.board[index]!.special).sort()).toEqual([
      'crown',
      'hammer',
    ])
    expect(result.clearing).toHaveLength(7)
  })

  it('preserves earned specials through shuffling with no opening matches', () => {
    const board = cleanBoard()
    board[8] = { ...board[8]!, special: 'bomb' }
    board[27] = { ...board[27]!, special: 'hammer', axis: 'column' }
    board[63] = { ...board[63]!, special: 'crown' }
    const shuffled = shuffleBoard(board, random(5))
    for (const index of [8, 27, 63]) expect(shuffled[index]).toBe(board[index])
    expect(findMatches(shuffled)).toEqual([])
    expect(findMove(shuffled)).not.toBeNull()
    expect(new Set(shuffled.map((tile) => tile.id)).size).toBe(64)
  })
})

it('activates a chained crown against the most common regular type, with deterministic ties', () => {
  const board = cleanBoard()
  board[26] = { ...board[26]!, special: 'bomb' }
  board[28] = { ...board[28]!, special: 'crown' }
  const result = resolveBoard(swap(board, 26, 27), [26, 27])
  expect(result.activated).toEqual(['bomb', 'crown'])
  // Mint and gold are equally frequent; mint comes first in the documented kind order.
  expect(result.clearing).toContain(1)
  expect(result.clearing).toContain(6)
  expect(result.clearing).not.toContain(2)
  expect(result.clearing).not.toContain(0)
  expect(result.clearing).toHaveLength(20)
})

it('describes each chained special’s real origin, direction, and protected targets', () => {
  const board = cleanBoard()
  board[26] = { ...board[26]!, special: 'bomb' }
  board[28] = { ...board[28]!, special: 'hammer', axis: 'column' }
  const result = resolveBoard(swap(board, 26, 27), [26, 27])
  expect(result.activations[0]).toMatchObject({ index: 27, special: 'bomb' })
  expect(new Set(result.activations[0]!.targets)).toEqual(
    new Set([18, 19, 20, 26, 27, 28, 34, 35, 36]),
  )
  expect(result.activations[1]).toMatchObject({ index: 28, special: 'hammer', axis: 'column' })
  expect(new Set(result.activations[1]!.targets)).toEqual(new Set([4, 12, 20, 28, 36, 44, 52, 60]))
  expect(
    result.activations
      .flatMap((effect) => effect.targets)
      .every((index) => result.clearing.includes(index)),
  ).toBe(true)
})

it('does not include a newly earned special in a simultaneous blast’s visual targets', () => {
  const board = cleanBoard()
  for (const index of [17, 18, 19, 20]) board[index] = { ...board[index]!, kind: 'mercaptopurine' }
  board[26] = { ...board[26]!, special: 'bomb' }
  const result = resolveBoard(swap(board, 26, 27), [26, 27])
  expect(result.created).toEqual([19])
  expect(result.clearing).not.toContain(19)
  expect(result.activations[0]!.targets).not.toContain(19)
})
