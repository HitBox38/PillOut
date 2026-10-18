<img src="apps/web/assets/icon.svg" width="64" height="64" alt="Pillout">

# Pillout

A mobile-first match-three pill game in a monorepo with a React frontend and a Python FastAPI backend. The apps can be built and deployed independently; hosting will be chosen later.

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

The pure game engine stays independent of React, Pixi, and Zustand. The store owns session lifecycle and scoring; the renderer consumes state and handles presentation and input. The API currently exposes a health endpoint; game state and scores remain local to the browser. Accounts, persistence, shared leaderboards, and production deployment are future decisions.

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

- **Classic:** reach 2,000 points in 24 valid moves.
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

The web build is a static site under `apps/web/dist/`. Its host must serve `index.html` for frontend routes such as `/how-to-play`.

The API builds a wheel and source archive under `apps/api/dist/` and exposes the ASGI entry point `pillout_api.main:app`. It can be served by an ASGI-capable host independently of the frontend. Production API routing and hosting adapters will be added when the deployment platform is selected. The Vite `/api` proxy is for local development.

Created in [T3 Code](https://t3.codes).
