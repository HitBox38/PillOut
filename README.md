<img src="apps/web/assets/icon.svg" width="64" height="64" alt="Pillout">

# Pillout

A mobile-first match-three pill game in a monorepo with a React frontend and a Python FastAPI backend. The apps build independently and deploy together to Vercel, with Turso for the API database.

## Run locally

Requires Node.js 22.12 or newer, pnpm 10.28.1 (pinned in `package.json`), Python 3.12 or newer, and uv 0.9.27 or newer. API development and CI use Python 3.13, pinned in `apps/api/.python-version`.

```sh
pnpm install --frozen-lockfile
uv sync --project apps/api --locked
pnpm run dev
```

- Game: http://localhost:5173
- API health: http://localhost:8000/api/health
- API docs: http://localhost:8000/docs
- API health through the frontend dev proxy: http://localhost:5173/api/health

`pnpm run dev` starts both apps with reload support. Use `pnpm run dev:web` or `pnpm run dev:api` to start one app. The game remains playable without the backend.

No environment variables are required for the defaults. To change the local API proxy target, copy `apps/web/.env.example` to `apps/web/.env.local` and set `API_PROXY_TARGET`.

## Repository layout

```text
apps/
  web/                      React + TypeScript application (@pillout/web)
    src/                    Game engine, Zustand store, Pixi board, and UI
    assets/                 Application assets
    components.json         shadcn Base UI configuration
    vite.config.ts          Frontend build and local /api proxy
    tsconfig.json           App TypeScript configuration
    package.json            Frontend dependencies and commands
  api/                      Python FastAPI service (@pillout/api command wrapper)
    src/pillout_api/         Importable ASGI application
    tests/                  HTTP contract tests
    pyproject.toml          Python package, dependencies, and tool configuration
    uv.lock                 Locked Python dependencies
    package.json            pnpm command wrappers for uv
docs/                      Skill catalog and provenance
.agents/skills/             Shared personal skill snapshot
pnpm-workspace.yaml         Application workspace membership
pnpm-lock.yaml              Locked JavaScript dependencies
package.json                Shared commands and Oxc tools
```

The root orchestrates tasks with pnpm's built-in workspaces. JavaScript dependencies belong to `apps/web`; Python dependencies belong to `apps/api` and are managed by uv. The API's `package.json` is a command bridge, so the Python service can also run directly with uv without Node.js. Shared packages can be added when there is code that actually needs sharing.

## Stack and boundaries

- **Web:** React 19, TypeScript 7, Vite, PixiJS 8, Zustand 5, shadcn **Base UI**, TanStack Router, Tailwind CSS 4, and Vitest.
- **API:** FastAPI, Pydantic, and Uvicorn, with pytest/HTTPX2 for tests, Ruff for lint and formatting, and mypy for type checking.
- **Shared tooling:** pnpm, Oxlint, Oxfmt, contributor guidance, and personal skills.

The pure game engine stays independent of React, Pixi, and Zustand. The store owns session lifecycle and scoring; the renderer consumes state and handles presentation and input. Player setup loads medicine and avatar catalogs from the API and saves the player profile and selected avatar on Welcome submission. Patient details, medicine selections, schedules, game state, and scores remain local to the browser. The current player ID stays in memory, so refreshing starts new setup. Authentication and shared leaderboards are future decisions.

See [web documentation](apps/web/README.md), [API documentation](apps/api/README.md), and [CONTEXT.md](CONTEXT.md) for details.

## Checks

From the root, these commands cover both applications:

```sh
pnpm run lint
pnpm run format:check
pnpm run typecheck
pnpm test
pnpm run build
```

`pnpm run format` runs Oxfmt and Ruff formatting. `pnpm run lint:fix` applies their safe fixes. To target one application, use `pnpm --filter @pillout/web run <command>` or `pnpm --filter @pillout/api run <command>`; Oxc checks run from the root with `pnpm exec oxlint --max-warnings 0 .` and `pnpm exec oxfmt --check .`.

CI has independent web and API jobs. The web job checks Oxc, types, tests, and its static build. The API job installs from `uv.lock`, checks Ruff and mypy, runs HTTP tests, and builds the Python distribution.

## Gameplay

- **Classic:** advance through saved levels with bear-rescue and calibrated score goals, 22–26 base moves, and a ten-level wave of challenges and breathers. Retry help adds up to six moves after repeated losses. See the [difficulty research and tuning guide](docs/level-difficulty.md).
- **Zen:** play without a move limit or an ending score.
- Swap adjacent pills with two taps/clicks or a swipe. Invalid swaps revert without costing a move.
- Match at least three of one color horizontally or vertically. Each cleared pill earns 50 points, multiplied by the cascade number.
- Hints and shuffles are free. Dead boards are replaced automatically.
- Arrow keys move focus; Enter or Space selects; Escape clears the selection.
- Sound and reduced motion can be changed in settings. The renderer also respects the system reduced-motion preference.

Preferences and personal best are saved on the current device. Active rounds stay in memory across frontend route navigation; refreshing starts a fresh round.

## Contributor playbook

Read [CONTRIBUTING.md](CONTRIBUTING.md), [AGENTS.md](AGENTS.md), and [CONTEXT.md](CONTEXT.md) before making changes. The maintainer's 27 selected personal skills are included in `.agents/skills/` with their supporting files. Visual direction comes from the project's designer. The [skill catalog](docs/skills.md) explains when to use each workflow and how to keep the snapshot up to date.

## Deployment

Import this repository as **one Vercel project**, with **Root Directory set to the repository root (`.`)**. Do not select `apps/web` or `apps/api`. Leave project-wide build/install/output overrides unset; [vercel.json](vercel.json) owns each service's settings.

The configuration uses [Vercel Services](https://vercel.com/docs/services), currently in beta. It builds the Vite site from `apps/web` and the FastAPI function from `apps/api` independently, then deploys both on the same domain. The web service invokes pnpm through Corepack to use the version pinned in root `package.json`; Python dependencies install from `apps/api/uv.lock` without development tools.

Connect the Turso integration to this project in Vercel and enable it for the intended environments. Confirm that it provides both server-side variables:

- `TURSO_DATABASE_URL`
- `TURSO_AUTH_TOKEN`

Use a separate Turso database for Preview if previews should have isolated data. Keep these variables without a `VITE_` prefix so database credentials stay out of the browser bundle. After adding or changing integration variables, redeploy so the deployment receives them. The API applies the bundled `schema.sql` on startup with `CREATE TABLE IF NOT EXISTS`; this creates missing tables but is not a migration system for future schema changes.

Production routing is defined in `vercel.json`: `/api/*`, `/docs`, `/redoc`, and `/openapi.json` go to FastAPI, while other paths go to the web service. Frontend deep links such as `/play` and `/how-to-play` serve `index.html`. Unknown API routes return API errors rather than the SPA. The Vite proxy remains for local development only; no production API hostname or CORS configuration is needed.

After the first deployment, check `/api/health`, open `/docs`, and refresh a frontend deep link. A read-only `POST /api/drugs` with JSON body `{}` verifies database access. API operations currently have no authentication; the frontend does not write player details to them.

Vercel's Git integration handles branch previews and production deployments; no additional deployment workflow or GitHub secrets are required. The existing GitHub Actions checks remain independent.

### Web Analytics

The web app includes `@vercel/analytics` for page views, including client-side navigation. In the Vercel project dashboard, open **Analytics** and select **Enable**, then redeploy. No client environment variables are required. Local development uses the SDK's development mode and does not send analytics data.

After deployment, visit the app and navigate between routes, then confirm page views appear in the Analytics dashboard. See [Vercel's setup guide](https://vercel.com/docs/analytics/quickstart). Web Analytics measures traffic; it does not capture browser exceptions or stack traces. Server-side API errors remain available in Vercel runtime logs.

Created in [T3 Code](https://t3.codes).
