<img src="assets/icon.svg" width="64" height="64" alt="Pillout">

# Pillout

A mobile-first match-three pill game. Swap colorful capsules, follow the cascades, and find your flow.

## Run locally

Requires Node.js 22.12 or newer and pnpm 10.28.1 (pinned in `package.json`). No environment variables or external services are required.

```sh
pnpm install --frozen-lockfile
pnpm run dev
```

Open http://localhost:5173. To check or build the project:

```sh
pnpm test
pnpm run lint
pnpm run format:check
pnpm run typecheck
pnpm run build
pnpm run preview
```

## Stack

- React 19 and TypeScript 7, built with Vite.
- PixiJS 8 renders the board and capsule animations, loaded separately from the UI.
- Zustand 5 owns the game session and persists preferences and the personal best locally.
- shadcn/ui **Base UI** components: buttons, dialogs, switches, tabs, and progress.
- TanStack Router provides typed navigation for `/` and `/how-to-play`.
- Tailwind CSS 4, locally hosted fonts, and Lucide icons.
- Oxlint checks TypeScript, React, accessibility, and test correctness. Oxfmt handles formatting.
- Vitest covers the game rules and asynchronous session behavior. GitHub Actions runs lint, formatting checks, tests, and the production build.

## Structure

```text
src/
  App.tsx                   App shell and typed route tree
  pages/game-page.tsx       Game screen, controls, and session UI
  game/
    engine.ts               Pure rules: generation, swaps, matches, gravity, legal moves
    store.ts                Session lifecycle, scoring, cascades, settings, persistence
    audio.ts                Optional Web Audio match tones
    *.test.ts               Rules and session regression tests
  components/
    game-board.tsx          Pixi lifecycle, interpolation, pointer and keyboard input
    ui/                     Owned shadcn Base UI components
  styles/app.css            Mobile layout and progressive min-width breakpoints
  index.css                 Theme tokens and Tailwind configuration
  lib/utils.ts              Class name utilities
```

The engine has no dependency on React, Pixi, or Zustand. The store resolves each move through swap, clear, and fall phases; session IDs prevent an old animation from modifying a restarted game. The renderer observes state and handles presentation only. A semantic HTML grid over the canvas supports keyboard navigation and screen readers; a CSS board remains playable if WebGL initialization fails.

## Gameplay

- **Classic:** reach 2,000 points in 24 valid moves.
- **Zen:** play without a move limit or an ending score.
- Swap adjacent pills with two taps/clicks or a swipe. Invalid swaps revert without costing a move.
- Match at least three of one color horizontally or vertically. Each cleared pill earns 50 points, multiplied by the cascade number.
- Hints and shuffles are free. Boards start without matches and always have a legal move; dead boards are automatically replaced.
- Arrow keys move focus; Enter or Space selects; Escape clears the selection.
- Sound and reduced motion can be changed in settings. The renderer also respects the system reduced-motion preference.

Scores and preferences live on the current device. Active rounds are kept in memory while navigating between routes; refreshing starts a fresh round. There is no backend or shared leaderboard yet.

## UI components

`components.json` uses shadcn's `base-nova` style, backed by `@base-ui/react`. Add more components with:

```sh
pnpm dlx shadcn@latest add <component>
```

Shared styles and class utilities are stored locally; the shadcn CLI is not a runtime dependency.

## Code quality

Run `pnpm run lint` for Oxlint or `pnpm run lint:fix` to apply safe fixes. Its configuration is in `.oxlintrc.json`.

Run `pnpm run format` to format with Oxfmt, or `pnpm run format:check` for a read-only check. `.oxfmtrc.json` keeps the project's single quotes, no semicolons, and 100-column formatting, and ignores generated output and the pnpm lockfile.

## Contributor playbook

Read [CONTRIBUTING.md](CONTRIBUTING.md), [AGENTS.md](AGENTS.md), and [CONTEXT.md](CONTEXT.md) before making changes. The maintainer's 28 personal skills are included in `.agents/skills/` with their supporting files. The [skill catalog](docs/skills.md) explains when to use each workflow and how to keep the snapshot up to date.

## Deployment

`pnpm run build` writes a static site to `dist/`. Configure your host to serve `index.html` for unknown paths so direct navigation to `/how-to-play` works. The app currently assumes deployment at the domain root.

Created in [T3 Code](https://t3.codes).
