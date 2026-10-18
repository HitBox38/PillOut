# Personal skill catalog

This is a portable snapshot of the maintainer's selected personal skills for this repository, captured on 2026-10-18: **27 unique skills, 57 source and supporting files**. The collection includes upstream skills installed by the maintainer as well as locally added guidance. Original frontmatter, attribution, templates, scripts, and reference assets are preserved. Visual direction comes from the project's designer.

Read [AGENTS.md](../AGENTS.md), [CONTRIBUTING.md](../CONTRIBUTING.md), and [CONTEXT.md](../CONTEXT.md) for how these workflows apply to Pillout.

## How to use the collection

Pick the skill that matches the current task and read its `SKILL.md` before applying it. Follow links to the supporting references it requires. Skills are task-specific workflows, not a checklist to run in full for every change. A request to export or maintain the collection does not invoke every workflow it contains.

The canonical files live under `.agents/skills/`. `.claude/skills` is a repository-relative symlink to that same collection. Other agents can read the files through this catalog or their repository-skill discovery support. If your checkout does not support symlinks, use the canonical `.agents/skills/` paths directly.

Examples for a contributor or coding agent:

- "Use `.agents/skills/diagnose/SKILL.md` to investigate this invalid swap."
- "Use `.agents/skills/animate/SKILL.md` to improve feedback when pills clear."
- "Use `.agents/skills/review/SKILL.md` to review the current change against the requested behavior."

Project instructions and the user's request override generic examples in a skill. For Pillout, keep pnpm, Oxc, the established React/Pixi/Zustand boundaries, shadcn Base UI, TanStack Router, and the mobile-first approach.

## Design and motion

- **[emil-design-eng](../.agents/skills/emil-design-eng/SKILL.md):** Build and polish UI interactions, components, accessibility, and motion with the existing design language.
- **[animate](../.agents/skills/animate/SKILL.md):** Implement a new animation or transition with a clear purpose and interruption behavior.
- **[animation-vocabulary](../.agents/skills/animation-vocabulary/SKILL.md):** Find the precise name for a motion effect described in everyday language.
- **[find-animation-opportunities](../.agents/skills/find-animation-opportunities/SKILL.md):** Identify worthwhile new motion opportunities; produces proposals without source edits.
- **[improve-animations](../.agents/skills/improve-animations/SKILL.md):** Audit motion across the codebase and produce prioritized implementation plans.
- **[review-animations](../.agents/skills/review-animations/SKILL.md):** Review existing animation code against the bundled motion standards.

## Engineering and architecture

- **[diagnose](../.agents/skills/diagnose/SKILL.md):** Reproduce, minimize, investigate, fix, and regression-test a bug or performance regression.
- **[feature-folder-structure](../.agents/skills/feature-folder-structure/SKILL.md):** Organize a new self-contained React feature into focused components, hooks, types, and helpers.
- **[improve-codebase-architecture](../.agents/skills/improve-codebase-architecture/SKILL.md):** Find architectural improvements using the project domain language and documented decisions.
- **[prototype](../.agents/skills/prototype/SKILL.md):** Build a throwaway prototype to explore logic or alternative UI directions.
- **[react-doctor](../.agents/skills/react-doctor/SKILL.md):** Run the React code-quality CLI after relevant React changes and assess its findings.
- **[request-refactor-plan](../.agents/skills/request-refactor-plan/SKILL.md):** Interview for a refactor plan and publish the resulting implementation issue when requested.
- **[review](../.agents/skills/review/SKILL.md):** Review a branch or change against repository standards and the originating specification.
- **[tdd](../.agents/skills/tdd/SKILL.md):** Use the red-green-refactor workflow for test-first behavior changes.
- **[zoom-out](../.agents/skills/zoom-out/SKILL.md):** Explain the broader context and architectural role of unfamiliar code.

## Planning and issue workflows

- **[grill-me](../.agents/skills/grill-me/SKILL.md):** Interview and challenge a plan until its decisions and tradeoffs are understood.
- **[grill-with-docs](../.agents/skills/grill-with-docs/SKILL.md):** Challenge a plan against domain documentation and record decisions as they settle.
- **[to-issues](../.agents/skills/to-issues/SKILL.md):** Turn a plan or specification into independently actionable implementation issues.
- **[to-prd](../.agents/skills/to-prd/SKILL.md):** Turn the conversation into a PRD and publish it to the configured tracker when requested.
- **[triage](../.agents/skills/triage/SKILL.md):** Process issues through the configured triage roles and readiness states.
- **[sane](../.agents/skills/sane/SKILL.md):** Inspect or manage a Sane workspace when that external integration is explicitly part of the task.

## Collaboration and skill maintenance

- **[caveman](../.agents/skills/caveman/SKILL.md):** Use compressed communication when the user explicitly asks for that mode.
- **[find-skills](../.agents/skills/find-skills/SKILL.md):** Find or install additional agent capabilities when the task calls for discovery.
- **[handoff](../.agents/skills/handoff/SKILL.md):** Write a handoff that preserves context for another agent.
- **[setup-matt-pocock-skills](../.agents/skills/setup-matt-pocock-skills/SKILL.md):** Configure issue-tracker, triage, and domain-document conventions before dependent engineering workflows.
- **[teach](../.agents/skills/teach/SKILL.md):** Teach a concept or skill using the project as the working context.
- **[write-a-skill](../.agents/skills/write-a-skill/SKILL.md):** Create an agent skill with scoped instructions and supporting resources.

## Prerequisites and examples

- Matt Pocock's engineering workflows require their setup step. Follow `setup-matt-pocock-skills` before the dependent workflows; it establishes `docs/agents/` and confirms tracker and domain conventions. `CONTEXT.md` provides the current Pillout vocabulary.
- Imported `npm run` examples translate to `pnpm run`; installed command-line tools use `pnpm exec`; temporary tools use `pnpm dlx`. For example, the React Doctor command is `pnpm dlx react-doctor@latest . --verbose --diff` when that verification workflow is relevant.
- Sane requires the developer's own Sane MCP or CLI connection. It is an optional task-management workflow, not a dependency of the game.
- Communication modes, interviews, prototypes, publishing to trackers, and integration-specific workflows retain the triggers and interaction requirements documented in their skills.

## Provenance and verification

[skills-manifest.json](skills-manifest.json) records every imported skill's description, original installation locations, known upstream source metadata, and each copied file's SHA-256, size, and executable flag. Original locations use home-relative paths so the snapshot has no dependency on a particular username or machine.

The inventory covered personal skill folders for Agents, Codex, Claude, Gemini, Cursor, and OpenCode, plus the Sane skill from the personal plugin cache. Identical copies shared between these tools were deduplicated. The snapshot consists of skill directories and their supporting resources; individual developers configure their tools and integrations locally.

Oxfmt and Oxlint exclude `.agents/skills/` and its Claude alias. Git whitespace checks also exempt imported skill sources through `.gitattributes`. This preserves upstream formatting and keeps bundled utility code separate from the game code's lint rules. The rest of the repository continues to use the normal checks.

## Updating the snapshot

1. Review the updated source skill and all of its supporting files. Resolve differing copies explicitly; do not pick a version based only on its folder name.
2. Copy the full skill directory into `.agents/skills/<name>/`, preserving file contents and executable bits. Keep project-specific adaptations in repository guidance.
3. Update this catalog and `docs/skills-manifest.json`, including capture date, origins, upstream metadata when known, and file hashes, sizes, and executable flags. Remove entries for source files removed by the update.
4. Verify that every manifest file exists and matches its recorded digest, that relative support links resolve, and that `.claude/skills` still points inside the repository. Review new or changed launcher requirements.
5. Run `pnpm run format:check` and `pnpm run lint` for the repository-owned files. Exercise any changed utility that the update actually depends on before submitting it.
