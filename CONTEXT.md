# Pillout domain context

Pillout is a mobile-first match-three capsule game with a React frontend and a Python FastAPI service in one monorepo. This file records the current domain language for contributors and engineering skills.

## Game language

- **Pill:** a uniquely identified capsule with one of five color kinds: coral, mint, gold, lavender, or blue.
- **Board:** an 8-by-8 grid of pills, stored in row-major order.
- **Swap:** exchanging horizontally or vertically adjacent pills. Diagonal swaps and row wrapping are invalid.
- **Match:** a horizontal or vertical run of at least three pills of the same kind. Intersecting runs clear each position once.
- **Cascade:** another match produced after a clear, gravity, and refill. Each cascade increases the score multiplier within that move.
- **Move:** a successful swap that creates a match. Invalid swaps revert without consuming a move.
- **Classic:** reach 2,000 points within 24 valid moves. Reaching the target on the last move is a win.
- **Zen:** no move limit and no terminal score.
- **Hint:** a legal swap highlighted on the board. Hints are free.
- **Shuffle:** a replacement board with no opening matches and at least one legal move. Shuffles are free; dead boards are also replaced automatically.
- **Session:** the active round. A session identifier prevents unfinished asynchronous work from modifying a restarted round.

## Scoring and lifecycle

Each matched pill earns 50 points multiplied by the current cascade number. A session resolves a swap through `swapping`, `clearing`, and `falling` phases before returning to `idle`. User moves are blocked while resolving, paused, or after a Classic result.

Preferences and personal best persist on the current device. Active rounds stay in memory across route navigation; refreshing starts a new round. The API currently exposes a health endpoint. It does not yet own game state, accounts, persistence, or shared leaderboards.

## Architecture

- `apps/web/src/game/engine.ts`: pure board generation, adjacency, matching, legal moves, swaps, and gravity/refill.
- `apps/web/src/game/store.ts`: Zustand session lifecycle, async resolution, score, outcome, preferences, and persistence.
- `apps/web/src/components/game-board.tsx`: Pixi application lifecycle, capsule presentation, interpolation, and the semantic HTML input grid.
- `apps/web/src/pages/game-page.tsx`: game screen, mode controls, stats, and result UI.
- `apps/web/src/App.tsx`: app shell, settings, and typed TanStack routes for `/` and `/how-to-play`.
- `apps/web/src/components/ui/`: owned shadcn Base UI components.
- `apps/web/src/styles/app.css` and `apps/web/src/index.css`: mobile-first layouts, theme tokens, and styling.
- `apps/api/src/pillout_api/main.py`: framework-native ASGI application and `/api/health` endpoint.
- `apps/api/pyproject.toml` and `apps/api/uv.lock`: independent Python dependencies, packaging, and quality tools.
- Root `package.json` and `pnpm-workspace.yaml`: pnpm task orchestration for both apps. The API package wrapper calls uv; it does not manage Python dependencies.

The web dev server proxies `/api` to the local API on port 8000. The web and API can be built and run independently. Production hosting and routing remain undecided.

The engine remains independent of React, Pixi, and Zustand. Presentation consumes session state rather than implementing another rules engine. New features should respect these boundaries while following the feature-folder guidance where applicable.
