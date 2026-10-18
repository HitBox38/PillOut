# Contributing to Pillout

Use the shared [agent guidance](AGENTS.md) and [skill catalog](docs/skills.md) as the development playbook. These apply to people using the workflows directly and to coding agents working in this repository.

## Start here

Read [CONTEXT.md](CONTEXT.md) for the game vocabulary and architectural boundaries. Install the pnpm version pinned in `package.json`, Python 3.12 or newer, and uv 0.9.27 or newer, then run:

```sh
pnpm install --frozen-lockfile
uv sync --project apps/api --locked
pnpm run dev
```

The web app runs at http://localhost:5173 and the FastAPI service at http://localhost:8000. No environment variables are required for local defaults. Use `pnpm run dev:web` or `pnpm run dev:api` to start one app; the game can be played independently of the API.

## Choose a workflow

1. Find the skill that matches the task in [docs/skills.md](docs/skills.md).
2. Read its `SKILL.md` and any supporting references it requires. The files are available in the checkout; a global skill installation is optional.
3. Apply the workflow within the requested scope and Pillout's stack. Generic examples using other frameworks, package managers, or external services do not replace the repository's choices.
4. Check the changed behavior and report what changed, how it was verified, and any remaining limitations.

For example, use `diagnose` to investigate a reported bug, `animate` to add purposeful motion, `review-animations` to assess an existing transition, and `feature-folder-structure` to organize a new feature. Read-only audits produce findings or plans; implementation is a separate step when the workflow says so.

## Implementation expectations

- Design for a narrow touch screen first, then enhance the tablet and desktop layouts.
- Follow the project's designer for visual direction and implement their supplied designs.
- Keep React UI, Pixi presentation, Zustand session state, and pure rules separate inside `apps/web`.
- Keep Python runtime code in `apps/api/src/pillout_api` and Python dependencies in its `pyproject.toml` and `uv.lock`.
- Keep the two apps independently buildable. Hosting and production routing will be decided separately.
- Use shadcn Base UI primitives for shared controls and TanStack Router for navigation.
- Keep the game playable with keyboard input. Respect system and in-app reduced-motion preferences.
- Test meaningful changes to rules and session behavior. Use the browser to verify visual changes and interactions.
- Add only the feature files needed by the change; avoid empty scaffolding and unrelated refactors.

## Before submitting

```sh
pnpm run lint
pnpm run format:check
pnpm run typecheck
pnpm test
pnpm run build
```

Root checks cover both apps. Use `pnpm run lint:fix` for safe lint fixes and `pnpm run format` for Oxfmt and Ruff formatting. Imported skill files are excluded from these tools to preserve their original contents. Documentation-only changes need the formatting and link checks relevant to the edit; runtime changes need the applicable tests and build.

For UI work, check mobile and desktop layouts and exercise the changed interaction. Describe the resulting behavior and validation in your pull request. GitHub Actions has separate web and API jobs that check lint, formatting, types, tests, and their builds.

## Skill changes

Treat `.agents/skills/` as a versioned snapshot. See the [snapshot update procedure](docs/skills.md#updating-the-snapshot) before changing it. Preserve upstream attribution and update `docs/skills-manifest.json` whenever an imported file changes.
