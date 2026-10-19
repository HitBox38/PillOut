# Pillout API

A FastAPI service managed by uv. Python dependencies, its virtual environment, and its lockfile belong to this app. The adjacent `package.json` only exposes commands to the pnpm workspace; the backend can run independently without Node.js.

Requires Python 3.12 or newer and uv 0.9.27 or newer. Local development and CI use Python 3.13, pinned in `.python-version`.

## Database (Turso)

The API uses [Turso](https://turso.tech/) via the maintained `libsql` SDK. Remote connections use HTTP; the deprecated `libsql-client` SDK selects WebSockets for `libsql://` URLs, which Turso's AWS endpoints no longer support. Set:

- `TURSO_DATABASE_URL` — libSQL URL from the Turso dashboard (optional; defaults to the shared Pillout Turso database when unset)
- `TURSO_AUTH_TOKEN` — database auth token (required for remote URLs; may be empty for local `file:` URLs)

On startup the app applies `schema.sql`, adds missing catalog-key and selected-avatar columns to older databases, and inserts missing built-in medicines and avatars. Unique `catalog_key` values identify web sprite frames independently of numeric database IDs; existing rows and catalog edits are preserved. Custom catalog rows without a supported key remain available through the API but do not appear in the web pickers.

A single database worker owns the SDK connection and serializes queries, with autocommit enabled so writes persist between requests. The async API handlers use the same query interface for remote Turso and local `file:` databases.

Copy `.env.example` to `.env`, set `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN`, then run `pnpm run dev` (uvicorn loads `.env` via `--env-file`). For local SQLite without Turso:

```sh
export TURSO_DATABASE_URL="file:./data/pillout.db"
export TURSO_AUTH_TOKEN=""
```

On Vercel, connect the Turso integration and confirm it supplies both variables for the intended deployment environments. See the root [deployment setup](../../README.md#deployment). Redeploy after connecting the integration or changing its variables.

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

The database client is configured in `pillout_api.database` from `TURSO_*` environment variables. Root `vercel.json` selects `src.pillout_api.main:app` relative to this directory, installs runtime dependencies with `uv sync --locked --no-dev --no-install-project`, and includes `schema.sql` in the Python function. The app loads directly from the bundled source; package-relative imports keep it independent of editable-install paths from the build machine. The build command checks that this entry point imports without connecting to Turso. Routing sends `/api/*`, `/docs`, `/redoc`, and `/openapi.json` to this service without stripping their paths. The pnpm `build` wrapper still builds the independent Python distribution; Vercel packages the ASGI function directly.

Authentication and shared game state remain outside this deployment setup. The frontend saves player profiles and selected avatars; patient plans and gameplay remain in the browser.

## Cross-origin frontends (itch.io)

Set `CORS_ALLOWED_ORIGINS` in the API deployment environment to a comma-separated list of exact frontend origins, then deploy code containing the CORS middleware. Adding the variable to a deployment without the middleware has no effect. An unset or empty value keeps cross-origin access disabled.

For itch.io, use the origin serving the uploaded game files (typically `https://html-classic.itch.zone`), rather than the project page's `username.itch.io` origin. Confirm the request's `Origin` in browser developer tools. Include only the scheme, hostname, and optional port, without a trailing slash or path.

Configured origins can make JSON `POST` and `PATCH` requests and health `GET` requests. The middleware answers their `OPTIONS` preflight requests. Cookies and cross-origin credentials are not enabled. Same-origin requests keep working without this setting.
