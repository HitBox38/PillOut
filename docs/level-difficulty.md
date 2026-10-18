# Level difficulty and engagement

Classic uses a ten-level difficulty wave: learn, build confidence, meet a challenge, recover, and finish a chapter. Winning saves the next unlocked level on this device immediately; it starts when the player chooses to continue. Zen remains unlimited.

## Research and rationale

- **Vary challenge.** King describes Candy Crush’s easier and harder levels as an intentional up-and-down experience. Pillout applies this principle with visible breather levels. See [King’s interview on level design and testing, reported by AP](https://apnews.com/article/547254aaa06bf026df5b41458ac62dcc).
- **Account for tile variety.** King’s senior level designer identifies layout, design style, spawn rates, and blockers as separate difficulty drivers. The number of spawning colors is one control. Pillout’s medicine selection already changes its number of match kinds, so goals compensate for this. See [Lucien Chen, GDC 2020: Analyzing Difficulty Drivers in Candy Crush Games](https://media.gdcvault.com/gdcsummer2020/presentations/GDC2020%20Final%20PPT.pdf), slides 3–7.
- **Make actions produce visible progress.** The same talk describes positive feedback from removing blocker layers and opening space. Pillout applies that feedback principle through its existing clears, earned specials, cascades, and victory feedback, and now through lasting level progress. Bear-rescue levels now add a fixed covering beneath playable pills; the covering does not block swaps or gravity.
- **Test different play styles.** Automated match-three research uses procedural personas to approximate human strategies. The calibration tool compares random legal moves with a simple strategy favoring larger immediate clears and earned specials. See [Automated Playtesting of Matching Tile Games](https://arxiv.org/abs/1907.06570).
- **Validate with people.** Puzzle-difficulty research models difficulty from gameplay telemetry; automated difficulty and churn research explicitly models skill, persistence, and boredom. Simulated wins cannot demonstrate human enjoyment or retention. See [Statistical Modelling of Level Difficulty in Puzzle Games](https://arxiv.org/abs/2107.03305) and [Predicting Game Difficulty and Churn Without Players](https://arxiv.org/abs/2008.12937).

The engagement hypothesis is that clear goals, visible improvement, earned combinations, saved progress, and relief after challenges make another level appealing. The exact pacing below is a Pillout design choice, not a published industry benchmark or proven retention improvement.

## The level wave

| Stage | Role                    | Base moves |        Pressure |
| ----- | ----------------------- | ---------: | --------------: |
| 1     | Warm-up / fresh chapter |         24 | 0.10, then 0.32 |
| 2     | Find your flow          |         24 | 0.16, then 0.40 |
| 3     | Build momentum          |         24 | 0.24, then 0.48 |
| 4     | Steady                  |         24 |            0.36 |
| 5     | Challenge               |         22 |            0.55 |
| 6     | Breather                |         26 |            0.28 |
| 7     | Steady                  |         24 |            0.45 |
| 8     | Challenge               |         22 |            0.65 |
| 9     | Breather                |         26 |            0.40 |
| 10    | Chapter challenge       |         22 |            0.85 |

The opening stages teach matching and specials once. Later chapters begin with recovery and return to a higher baseline. Goals grow by 2% of the original baseline per chapter, reaching a 20% increase in chapter 11 and staying bounded afterward. Stages 5, 8, and 10 lead into gentler levels.

Stages 1, 4, and 8 are bear-rescue goals requiring 1, 2, and 3 bears respectively in every chapter. Other stages retain calibrated score goals. Rescue goals replace the score requirement; the goal panel shows rescued/required bears, and score remains a bonus.

Each bear has a fixed, non-overlapping 2-by-2 footprint beneath normal playable pills. Stage 1 places a bear at row 4, column 4; stage 4 uses rows/columns (3, 2) and (6, 6); stage 8 uses (2, 3), (4, 6), and (7, 2), counting from one. Layouts repeat across chapters and stay the same on retries and medicine changes.

The whole board starts with a single covering layer. Every cleared cell and every cell converted into a special permanently uncovers, including cascades and chained blasts. Adjacent matches alone do not uncover a cell. Revealing all four cells collects a bear once; other covering may remain when all bears are rescued. Pills fall and refill normally. Shuffles preserve bears and discoveries. Restarting or refreshing begins a fresh attempt with covering restored; Zen has no rescue state.

Move budgets and announced retry help stay the same. The final move can win after all its cascades settle. A high score alone cannot win a rescue level, and winning unlocks the next level through the same saved progression.

## Tile-pool calibration

Three fruits plus selected medicines produce 3–12 distinct match kinds. Each medicine remains its own kind; refill probabilities stay uniform. Level progression never adds, removes, or weights medicines.

One hundred seeded games per pool produced these median scores over 24 random legal moves:

| Match kinds | Median score |
| ----------: | -----------: |
|           3 |      117,500 |
|           4 |       32,550 |
|           5 |       13,200 |
|           6 |        9,100 |
|           7 |        6,800 |
|           8 |        5,700 |
|           9 |        5,450 |
|          10 |        4,950 |
|          11 |        4,650 |
|          12 |        4,500 |

Ordinary goals multiply this baseline by stage pressure and chapter growth. Challenge goals interpolate between the guaranteed 150 points per valid move and the estimated score for that move budget, then apply growth. This prevents large-pool challenges from becoming automatic wins through three-tile matches alone. Goals round to 50 points with a minimum of 1,000.

Compensation is approximate: score distributions, legal move density, special availability, and strategy also vary with pool size. Kind count is not a complete human-difficulty model.

## Attempts and persistence

- Goals, move budgets, and refill odds stay fixed during each attempt. Changing medicines starts a fresh attempt at the saved level with a recalibrated goal.
- Every two completed losses add two moves to the next attempt, capped at six after six losses. The result screen announces help and the move counter identifies it. The goal stays the same for the same level and pool.
- Restarting, invalid swaps, shuffling, changing modes, and abandoning an animation do not count as losses. Winning unlocks the next level once and resets losses.
- Hints, shuffles, and retries remain free. Earned specials survive shuffles.
- The next unlocked level and capped loss count persist with preferences and personal best. Active boards stay in memory; refresh starts a fresh attempt at the saved level. Older preferences start at level 1.
- Zen neither changes progression nor uses retry help. Returning to Classic resumes the saved level.

## Reproducing and tuning

```sh
pnpm --filter @pillout/web run difficulty:report --runs=100
```

The offline tool uses the actual engine and evaluates the correct score or rescue completion condition for each level. It runs seeds 1–100, all ten pool sizes, and random and greedy policies. Each policy plays 32 moves, so one score trajectory evaluates normal budgets and full six-move help. Greedy choices see only the immediate resolution, prefer earned specials, and never inspect future refills. The report includes score percentiles and selected-level pass rates. Gameplay sends no new analytics.

Before bear-rescue goals were introduced, the initial 2,000 simulated games produced these representative score-goal results:

| Kinds | Level 10 random | Level 10 greedy | Level 110 random | Level 110 random with full help |
| ----: | --------------: | --------------: | ---------------: | ------------------------------: |
|     3 |             59% |            100% |              45% |                             76% |
|     6 |             66% |             93% |              38% |                             71% |
|    12 |             47% |             69% |              22% |                             85% |

In that earlier score-only configuration, Level 1 and stage 6 passed in every run. Stage 9 passed in 99–100% of random-policy runs. These are simulation results, not human win-rate targets. Fruit-only boards are particularly generous to greedy play; score-only levels may become easy for practiced players. These results do not calibrate the new rescue goals; rescue completion now needs its own simulation and human playtesting.

A preliminary rescue run with seeds 1–20 across all ten pool sizes and both policies completed 400 simulated games. With three kinds, both policies rescued all bears on stages 1, 4, and 8 in every run. With twelve kinds, the random policy completed those stages in 55%, 40%, and 5% of runs; the greedy policy completed them in 70%, 35%, and 5%. These policies do not target bear discoveries, and twenty seeds are a small sample. Keep the agreed bear counts and existing move budgets for this first version, and playtest larger medicine pools before treating rescue difficulty as calibrated.

After changes to scoring, specials, board size, or refills, rerun the report and update `POOL_SCORE_BASELINES` and `LEVEL_WAVE` in `apps/web/src/game/engine.ts`. Check distributions and both strategies, then test representative pools on touch screens.

In human playtests, record level/pool size, completed attempts, wins, remaining moves, goal completion ratio, hint/shuffle use, and voluntary continuation after wins or repeated losses. Initial hypotheses: over 90% completion for onboarding, 55–75% first-attempt completion for chapter challenges, and noticeably easier recovery levels. Evaluate player feedback alongside these numbers. Aggregate game counters are sufficient; medicine identities and patient details are unnecessary.
