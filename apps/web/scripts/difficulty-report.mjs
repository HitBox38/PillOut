import { parseArgs } from 'node:util'
import { createServer } from 'vite'

const { values } = parseArgs({
  options: { runs: { type: 'string', default: '100' } },
})
const runs = Number(values.runs)
if (!Number.isSafeInteger(runs) || runs < 1) throw new Error('--runs must be a positive integer')

const server = await createServer({ server: { middlewareMode: true } })
try {
  const engine = await server.ssrLoadModule('/src/game/engine.ts')
  const { KINDS, SIZE, createBoard, resolveBoard, swap, collapse, shuffleBoard, getLevelConfig } =
    engine
  const pairs = Array.from({ length: SIZE * SIZE }, (_, i) => [
    ...(i % SIZE < SIZE - 1 ? [[i, i + 1]] : []),
    ...(i < SIZE * (SIZE - 1) ? [[i, i + SIZE]] : []),
  ]).flat()
  for (let count = 3; count <= KINDS.length; count++) {
    const kinds = KINDS.slice(0, count)
    for (const policy of ['random', 'greedy']) {
      const scores = []
      const levels = [1, 3, 5, 6, 8, 9, 10, 11, 20, 110].map((number) => ({
        ...getLevelConfig(number, count),
        passed: 0,
        passedWithHelp: 0,
      }))
      for (let run = 0; run < runs; run++) {
        let seed = run + 1
        const random = () => {
          seed = (seed * 1664525 + 1013904223) >>> 0
          return seed / 2 ** 32
        }
        let board = createBoard(random, kinds)
        let score = 0
        for (let move = 1; move <= 32; move++) {
          let legal = pairs.filter(
            (pair) => resolveBoard(swap(board, ...pair), pair).clearing.length,
          )
          if (!legal.length) {
            board = shuffleBoard(board, random, kinds)
            legal = pairs.filter((pair) => resolveBoard(swap(board, ...pair), pair).clearing.length)
          }
          // Greedy sees only the first clear, never future random refills.
          const ranked = legal.map((pair) => {
            const result = resolveBoard(swap(board, ...pair), pair)
            return { pair, value: result.clearing.length + result.created.length * 4 }
          })
          const best = Math.max(...ranked.map((candidate) => candidate.value))
          const candidates =
            policy === 'greedy' ? ranked.filter((candidate) => candidate.value === best) : ranked
          const pair = candidates[Math.floor(random() * candidates.length)].pair
          let resolution = resolveBoard(swap(board, ...pair), pair)
          let combo = 0
          while (resolution.clearing.length) {
            if (++combo > 1000) throw new Error('Cascade did not settle')
            score += (resolution.clearing.length + resolution.created.length) * 50 * combo
            board = collapse(resolution.board, resolution.clearing, random, kinds)
            resolution = resolveBoard(board)
          }
          if (move === 24) scores.push(score)
          for (const level of levels) {
            if (move === level.moves && score >= level.target) level.passed++
            if (move === level.moves + 6 && score >= level.target) level.passedWithHelp++
          }
        }
      }
      scores.sort((a, b) => a - b)
      console.log(
        JSON.stringify({
          kinds: count,
          policy,
          runs,
          p10: scores[Math.floor(runs * 0.1)],
          median: scores[Math.floor(runs * 0.5)],
          p90: scores[Math.floor(runs * 0.9)],
          levels: levels.map(({ number, target, moves, passed, passedWithHelp }) => ({
            level: number,
            target,
            moves,
            passRate: passed / runs,
            passRateWithHelp: passedWithHelp / runs,
          })),
        }),
      )
    }
  }
} finally {
  await server.close()
}
