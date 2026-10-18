---
name: feature-folder-structure
description: >-
  Scaffolds React feature folders with index, types, constants, helpers, api,
  hooks, components, and tests. Use when creating a new feature, tab, widget,
  screen, or component folder, or when the user asks for folder structure or
  how to organize feature code.
---

# Feature folder structure

When adding a new feature (tab, widget, panel, or self-contained UI area), create a **named folder** with this layout:

```
[feature-name]/
  index.tsx
  types.ts
  constants.ts
  helpers.ts
  api.ts
  __tests__/
  hooks/
  components/
```

Use **PascalCase** for the folder name (e.g. `BloodProductsTab/`).

## File responsibilities

| File / folder | Purpose |
|---------------|---------|
| `index.tsx` | Default export of the root component. Compose hooks and child components only; keep thin (~100 lines max). |
| `types.ts` | Feature types and `interface Props` for the root component. Re-export shared API types from `@/types/api` when needed. |
| `constants.ts` | Static values: labels keys, enums, column defs, default IDs, query key fragments used only by this feature. |
| `helpers.ts` | Pure functions: mapping, formatting, grouping, validation. No React, no hooks, no side effects. |
| `api.ts` | Data fetching for this feature: query functions, request builders, response normalizers. Hooks call into here. |
| `hooks/` | One hook per file (`useFeatureData.ts`). State, effects, and wiring to `api.ts` / global hooks. |
| `components/` | Presentational subcomponents and feature-local UI (skeletons, tables, accordions). Default export per file. |
| `__tests__/` | Tests for helpers, api, hooks, and components. Mirror source names (`helpers.test.ts`). |

## Conventions

- Root component props: **`interface Props`** in `types.ts`, imported in `index.tsx`.
- **`index.tsx`** imports from `./hooks`, `./components`, `./types` — not deep paths into sibling features.
- Move logic out of `index.tsx`: data → `hooks/`, HTTP → `api.ts`, transforms → `helpers.ts`.
- Subcomponents in `components/` stay focused; split before exceeding ~100 lines.
- Do not add `helpers.ts`, `api.ts`, or `__tests__/` until needed; create empty folders only when the user expects the full scaffold.

## Scaffold checklist

When creating a new feature from scratch:

1. Create the folder and `index.tsx`, `types.ts`, `constants.ts`.
2. Add `hooks/` when the feature loads or mutates data.
3. Add `components/` when the root has more than trivial markup.
4. Add `helpers.ts` when mapping/formatting grows beyond a few lines in a hook.
5. Add `api.ts` when fetch/query logic should not live in the hook.
6. Add `__tests__/` when adding tests (helpers and pure functions first).

## Minimal example

```
BloodProductsTab/
  index.tsx              # default export, uses useBloodProductsData + accordion
  types.ts               # Props, domain row/group types
  constants.ts           # product names, hasValue, normalize*
  helpers.ts             # toTableRow, buildGroups
  api.ts                 # fetchBloodProducts(medicalRecordId)
  hooks/
    useBloodProductsData.ts
  components/
    BloodProductsAccordion.tsx
    BloodProductsSkeleton.tsx
  __tests__/
    helpers.test.ts
```

## Anti-patterns

- Business logic and API calls inlined in `index.tsx`.
- Giant `types.ts` mixing unrelated domains — keep feature-scoped.
- `helpers.ts` importing React or calling APIs.
- Flat files at parent level instead of a dedicated feature folder when the UI is a distinct unit.
