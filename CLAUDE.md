# Pillout repository guidance

Read and follow [AGENTS.md](AGENTS.md) and [CONTRIBUTING.md](CONTRIBUTING.md).

The personal skill collection is checked into `.agents/skills/` and exposed to Claude through the repository-relative `.claude/skills` alias. See [docs/skills.md](docs/skills.md) for task routing, prerequisites, and provenance.

## Agent skills

### Issue tracker

Issues and PRDs live in GitHub Issues for `HitBox38/PillOut`. See `docs/agents/issue-tracker.md`.

### Triage labels

Use the standard five triage role names; four labels await creation. See `docs/agents/triage-labels.md`.

### Domain docs

Single shared context: root `CONTEXT.md`, with future decisions in `docs/adr/`. See `docs/agents/domain.md`.
