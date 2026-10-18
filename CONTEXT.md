# Pillout domain context

Pillout is a mobile-first match-three capsule game with a React frontend and a Python FastAPI service in one monorepo. This file records the current domain language for contributors and engineering skills.

## Game language

- **Tile / pill:** a uniquely identified board object. Each medicine has its own match kind, named by its medicine ID. The three fruit kinds are mint (apple), gold (strawberry), and lavender (peach).
- **Tile pool:** the medicines selected in player setup plus all three fruits. Unselected medicines never appear on a generated board or in refills and shuffles. A quick game with no medicine selection uses fruits only. Changing the medicine selection starts a fresh round immediately, removing deselected medicines and cancelling any pending animation from the previous round.
- **Special:** an earned bomb, hammer, or crown. Specials do not match by their hidden base kind; swap with any neighbor to activate. Four in a straight line earns a hammer, a T/L intersection earns a bomb, and five or more in a straight line earns a crown. Each connected match group earns one special, with crown taking priority over bomb and hammer.
- **Bomb:** clears a 3-by-3 area centered on its position after the swap, clipped at the board edge.
- **Hammer:** clears a full row for a horizontal swap or column for a vertical swap. A chained hammer uses the direction of the match that created it.
- **Crown:** clears all regular tiles of its swap partner’s kind. When chained or swapped with another special, targets the most common regular kind (ties follow `KINDS`). Swapping two crowns clears the whole board.
- **Special chain:** a blast triggers specials it hits, each at most once per wave. Overlapping effects count a position once. A newly earned special survives the wave that created it and falls with gravity.
- **Board:** an 8-by-8 grid of pills, stored in row-major order.
- **Swap:** exchanging horizontally or vertically adjacent pills. Diagonal swaps and row wrapping are invalid.
- **Match:** a horizontal or vertical run of at least three pills of the same kind. Intersecting runs clear each position once.
- **Cascade:** another match produced after a clear, gravity, and refill. Each cascade increases the score multiplier within that move.
- **Move:** a successful swap that creates a match or activates a special. Invalid swaps revert without consuming a move.
- **Classic:** reach 2,000 points within 24 valid moves. Reaching the target on the last move is a win.
- **Zen:** no move limit and no terminal score.
- **Hint:** a legal regular or special swap highlighted on the board. Hints are free.
- **Shuffle:** fresh regular tiles with no opening matches and at least one legal move; earned specials stay at their positions. Shuffles are free; dead boards are also replaced automatically.
- **Session:** the active round. A session identifier prevents unfinished asynchronous work from modifying a restarted round.

## Scoring and lifecycle

Each cleared tile or tile converted into an earned special earns 50 points multiplied by the current cascade number. A special activation, including its full chain and resulting cascades, consumes exactly one Classic move. A session resolves a swap through `swapping`, `clearing`, and `falling` phases before returning to `idle`. User moves are blocked while resolving, paused, or after a Classic result.

Preferences and personal best persist on the current device. Active rounds stay in memory across route navigation; refreshing starts a new round. The API exposes health and database-backed operations for users, drugs, avatars, and their associations. The frontend setup and game are not connected to those endpoints; they keep player details, medicine selections, schedules, and active game state in memory.

## Architecture

- `apps/web/src/game/engine.ts`: pure board generation, adjacency, matching, legal moves, swaps, and gravity/refill. Generation, refill, and shuffle accept the session's tile pool; `game/medicines.ts` defines the available medicine IDs.
- `apps/web/src/game/store.ts`: Zustand session lifecycle, async resolution, score, outcome, preferences, and persistence.
- `apps/web/src/components/game-board.tsx`: Pixi application lifecycle, capsule presentation, interpolation, and the semantic HTML input grid.
- `apps/web/src/pages/game-page.tsx`: illustrated game screen, settings, stats, and result UI. Selected medicines use the same sprites as the medicine picker; fruits and earned bombs, hammers, and crowns have dedicated artwork. The goal remains 2,000 points; collecting a bear and limited toolbar boosters are not game mechanics.
- `apps/web/src/App.tsx`: app shell and typed TanStack routes: `/` (intro), `/welcome` (player), `/pills` (selection), `/plan` (times and quantities), `/play` (game), and `/how-to-play`.
- `apps/web/src/features/PlayerSetup/`: demo player, avatar, pill selection, and schedule UI. Its Zustand store holds personal details only in memory and updates the game session's medicine pool when the selection changes. This is local player setup, without authentication, medical records, reminders, or API writes.
- `apps/web/public/art/`: supplied logos, board/title artwork, design sheets, transparent avatar and pill atlases, fruits, and special-piece assets. `lib/art-assets.ts` shares pixel frames between HTML and Pixi. `components/artwork.tsx` displays atlas regions; `features/PlayerSetup/components/Avatar.tsx` renders the same avatar sprites in setup and gameplay. Pixi loads the pill atlas and individual fruit textures. Bomb, hammer, and crown rules live in the engine, and their visual metadata lives in `lib/art-assets.ts`.
- `apps/web/src/components/ui/`: owned shadcn Base UI components.
- `apps/web/src/styles/app.css` and `apps/web/src/index.css`: mobile-first layouts, theme tokens, and styling.
- `apps/api/src/pillout_api/main.py`: framework-native ASGI application, `/api/health`, and user, drug, and avatar operations. `database.py` configures the Turso/libSQL client and applies `apps/api/schema.sql` at startup.
- `apps/api/pyproject.toml` and `apps/api/uv.lock`: independent Python dependencies, packaging, and quality tools.
- Root `package.json` and `pnpm-workspace.yaml`: pnpm task orchestration for both apps. The API package wrapper calls uv; it does not manage Python dependencies.

The web dev server proxies `/api` to the local API on port 8000. The web and API can be built and run independently. Root `vercel.json` deploys both through Vercel Services on one domain: `/api/*` and the API documentation routes go to FastAPI; other paths go to the Vite SPA with a deep-link fallback. The API reads `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` supplied by the project's Vercel Turso integration. Player setup and gameplay remain local to the browser.

The engine remains independent of React, Pixi, and Zustand. Presentation consumes session state rather than implementing another rules engine. New features should respect these boundaries while following the feature-folder guidance where applicable.
