# Pillout web

The mobile-first React, TypeScript, PixiJS, Zustand, shadcn Base UI, and TanStack Router application.

From the repository root:

```sh
pnpm install --frozen-lockfile
pnpm run dev:web
```

Open http://localhost:5173. To run both apps, use `pnpm run dev` after installing the Python prerequisites described in [the root README](../../README.md).

## API development

The Vite dev server forwards `/api` requests to http://127.0.0.1:8000. With the API running, http://localhost:5173/api/health exercises that connection. To use another backend locally, copy `.env.example` to `.env.local` and set `API_PROXY_TARGET` there. This variable configures the dev server and is not exposed to the client bundle.

Player setup loads medicine and avatar catalogs from the API. Submitting Welcome saves the player profile and chosen avatar, reads the saved profile back, and advances only after success. Failed requests preserve the form and can be retried. Returning to Welcome and saving updates the same player during that browser session. The player ID is not stored on the device, so refreshing starts new setup; account recovery and authentication are not implemented.

Patient details, selected medicines, and schedules remain local demo data. The quick game runs independently of the API. Production API routing will be configured when hosting is chosen.

## Commands

```sh
pnpm --filter @pillout/web test
pnpm --filter @pillout/web run typecheck
pnpm --filter @pillout/web run build
pnpm --filter @pillout/web run preview
```

Build output is `apps/web/dist/`. Configure a static host to serve `index.html` for frontend routes such as `/how-to-play`.

To add a shadcn Base UI component, run from this directory:

```sh
pnpm dlx shadcn@latest add <component>
```

The app's `components.json`, TypeScript aliases, Vite configuration, and assets are scoped to this directory. Shared Oxc configuration and skills live at the repository root.
