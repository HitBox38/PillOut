# Domain documentation

This repository uses a single shared context for the web app, API, and game.

Before investigating behavior or architecture, read root `CONTEXT.md` for terminology, scoring, lifecycle, and module boundaries. Read relevant architectural decisions under `docs/adr/` when that directory exists. Missing ADRs do not block ordinary work; do not create placeholder decisions.

Use the glossary's vocabulary in tests, issues, findings, and implementation. Preserve the engine/store/renderer boundaries. Surface conflicts with a recorded decision rather than silently overriding it.

Domain changes belong in `CONTEXT.md`. Record architectural decisions only when the task calls for them.
