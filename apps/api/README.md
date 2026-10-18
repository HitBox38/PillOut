# Pillout API

A FastAPI service managed by uv. Python dependencies, its virtual environment, and its lockfile belong to this app. The adjacent `package.json` only exposes commands to the pnpm workspace; the backend can run independently without Node.js.

Requires Python 3.12 or newer and uv 0.9.27 or newer. Local development and CI use Python 3.13, pinned in `.python-version`.

## Database (Turso)

The API uses [Turso](https://turso.tech/) via `libsql-client`. Set:

- `TURSO_DATABASE_URL` — libSQL URL from the Turso dashboard (optional; defaults to the shared Pillout Turso database when unset)
- `TURSO_AUTH_TOKEN` — database auth token (required for remote URLs; may be empty for local `file:` URLs)

On startup the app applies `schema.sql`, adds missing catalog-key and selected-avatar columns to older databases, and inserts missing built-in medicines and avatars. Unique `catalog_key` values identify web sprite frames independently of numeric database IDs; existing rows and catalog edits are preserved. Custom catalog rows without a supported key remain available through the API but do not appear in the web pickers.

Copy `.env.example` to `.env`, set `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN`, then run `pnpm run dev` (uvicorn loads `.env` via `--env-file`). For local SQLite without Turso:

```sh
export TURSO_DATABASE_URL="file:./data/pillout.db"
export TURSO_AUTH_TOKEN=""
```

On Vercel, add the same variables in the project environment settings.

From this directory:

```sh
uv sync --locked
uv run --locked uvicorn pillout_api.main:app --reload --port 8000
```

- Health: http://localhost:8000/api/health
- Interactive API docs: http://localhost:8000/docs
- OpenAPI schema: http://localhost:8000/openapi.json

The frontend dev server proxies `/api` to this service. Setup loads catalogs through `POST /api/drugs` and `POST /api/avatars` with `{}` bodies. Welcome creates or updates a player through `POST /api/user` or `PATCH /api/user`, including the selected `avatar_id`, and reads it back through `POST /api/get_user`. A selected avatar is a single profile choice; `user_avatars` associations remain separate. Legacy filename-based user requests still work.

Patient details, medicine selections, and schedules are not saved by the frontend yet. The current player ID stays in browser memory; refreshing starts new setup rather than recovering an account. These endpoints do not implement authentication. The quick game keeps its session in the browser and does not require the API to play.

## Checks

```sh
uv run --locked ruff check .
uv run --locked ruff format --check .
uv run --locked mypy src
uv run --locked pytest
uv build
```

`uv build` produces a wheel and source archive under `dist/`. Runtime dependencies are in `[project.dependencies]`; check tools are in the development dependency group. Use `uv add <package>` or `uv add --dev <package>` to update the corresponding dependency and lockfile together.

## Deployment boundary

The ASGI entry point is `pillout_api.main:app`. A host that supports ASGI can install the package and serve it with Uvicorn, for example:

```sh
uv sync --locked --no-dev
uv run --locked --no-dev uvicorn pillout_api.main:app --host 0.0.0.0 --port 8000
```

The database client is configured in `pillout_api.database` from `TURSO_*` environment variables. Hosting, production routing, authentication, and shared game state remain deployment concerns outside this package.
