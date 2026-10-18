# Pillout API

A FastAPI service managed by uv. Python dependencies, its virtual environment, and its lockfile belong to this app. The adjacent `package.json` only exposes commands to the pnpm workspace; the backend can run independently without Node.js.

Requires Python 3.12 or newer and uv 0.9.27 or newer. Local development and CI use Python 3.13, pinned in `.python-version`.

From this directory:

```sh
uv sync --locked
uv run --locked uvicorn pillout_api.main:app --reload --port 8000
```

- Health: http://localhost:8000/api/health
- Interactive API docs: http://localhost:8000/docs
- OpenAPI schema: http://localhost:8000/openapi.json

The frontend dev server proxies `/api` to this service. The game currently keeps its session in the browser and does not require the API to play.

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

Hosting, production routing, database, authentication, and shared game state will be decided separately. Keep provider-specific adapters outside the application package when they are introduced.
