# Working on Pillout

Read [CONTRIBUTING.md](CONTRIBUTING.md), [CONTEXT.md](CONTEXT.md), and the [skill catalog](docs/skills.md) before making changes. The repository includes the maintainer's personal skill collection so contributors can use the same guidance without access to their home directory.

## Project constraints

- Keep the app mobile first. Verify touch interactions and narrow layouts before expanding desktop layouts.
- Follow the project's designer for visual direction. Implement the supplied designs and preserve their intent.
- Use React, TypeScript, PixiJS, Zustand, shadcn's **Base UI** components, and TanStack Router. Preserve these choices unless the task explicitly changes them.
- Use the pnpm version pinned in `package.json`. Translate imported skill examples from `npm run` to `pnpm run`, `npx` for installed tools to `pnpm exec`, and `npx` for temporary tools to `pnpm dlx`.
- Use Oxlint and Oxfmt for JavaScript, TypeScript, and shared documentation. Use Ruff and mypy for Python. Preserve strict type checking in both applications.
- Keep app dependencies scoped: pnpm manages JavaScript; uv manages Python through `apps/api/pyproject.toml` and `apps/api/uv.lock`. The API package wrapper only bridges commands.
- Keep web and API independently buildable. Production hosting and API routing remain undecided; do not introduce provider-specific deployment configuration without a task that calls for it.
- Keep pure game rules in `apps/web/src/game/engine.ts`, session state in `apps/web/src/game/store.ts`, and rendering/input in `apps/web/src/components/game-board.tsx`. UI components observe state rather than implementing a second set of game rules.
- Follow the feature-folder skill for new self-contained features. Preserve the current engine/store/renderer boundaries; reorganizing existing code needs a task that calls for that work.

## Workspace commands

`pnpm run dev` starts both apps. Use `pnpm run dev:web` or `pnpm run dev:api` to run one. Root checks aggregate both apps; app-specific commands use `pnpm --filter @pillout/web run <command>` or `pnpm --filter @pillout/api run <command>`. Python can also run directly from `apps/api` with uv.

## Applying skills

Read the relevant `.agents/skills/<name>/SKILL.md` and its referenced supporting files before applying it. Use the task routing in [docs/skills.md](docs/skills.md); do not activate every skill at once.

- UI implementation and interaction polish: `emil-design-eng`, following the project's designer's direction.
- New motion: `animate`; existing motion review: `review-animations`; motion audits and opportunity searches: `improve-animations` or `find-animation-opportunities`.
- Bugs: `diagnose`; behavior changes with test-first work: `tdd`; React verification: `react-doctor`.
- Feature organization: `feature-folder-structure`; architectural investigation: `zoom-out` and `improve-codebase-architecture`.
- Plans, issues, reviews, prototypes, teaching, handoffs, and skill creation: use the matching catalog entry when the task calls for it.
- `caveman`, interview workflows, and external-service workflows retain their own opt-in triggers. A normal implementation task does not opt the user into all of them.

User instructions and this repository's constraints take precedence over generic skill defaults. Keep a skill's read-only audits separate from implementation when its workflow requires that. When a skill needs an unavailable tool or integration, explain that prerequisite and follow its documented fallback.

The Matt Pocock engineering skills have a setup workflow. Before their first use, follow `setup-matt-pocock-skills` to establish the issue tracker, triage vocabulary, and domain-document conventions. The existing GitHub remote and `CONTEXT.md` are evidence for that setup; they do not authorize inventing tracker labels or skipping the skill's questions.

## Validation

Run the checks appropriate to the change:

```sh
pnpm run lint
pnpm run format:check
pnpm run typecheck
pnpm test
pnpm run build
```

For UI or input changes, verify the relevant interaction in a browser at a narrow mobile width and a desktop width. Respect reduced motion, keep keyboard navigation usable, and preserve the semantic grid over the Pixi canvas.

## Maintaining the skill snapshot

`.agents/skills/` contains verbatim skill sources and supporting files; `.claude/skills` is a relative alias to that directory. The manifest records file hashes and source provenance. Put project-specific adaptations in repository guidance rather than silently editing the imported skill files. Follow the update procedure in [docs/skills.md](docs/skills.md).
