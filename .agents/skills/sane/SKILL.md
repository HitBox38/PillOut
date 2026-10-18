---
name: sane
description: Manage Sane tasks, projects, labels, comments, and members through the Sane MCP server or the sane command-line interface. Use when the user asks to inspect or change a Sane workspace.
---

# Sane

Use the Sane MCP tools for normal Sane workspace work. They provide structured
access to tasks, projects, labels, statuses, comments, notifications, and
members. Use the `sane` CLI when the user specifically asks for terminal
commands, wants local scripting, or the MCP connection is unavailable.

## Authentication

Both integrations use the same per-user `sane_mcp_…` key, generated at Sane
**Settings → MCP**. Treat the key as a password: never print it, commit it, or
place it in a command history.

The MCP connection reads `SANE_API_KEY` and sends it as a bearer token. Set
that environment variable in Codex before using the MCP server.

For the CLI, run `sane auth login` and paste the same key when prompted. The
CLI stores it in the system keychain; `SANE_API_KEY` is also accepted for
non-interactive use. Check setup with `sane auth status`.

## Working safely

- List statuses, projects, labels, and members before using their identifiers
  in a write request.
- Treat task IDs as opaque values returned by Sane; do not guess them.
- Search or retrieve a task before editing it when its title could be
  ambiguous.
- State the planned change before destructive actions such as deleting a task
  or unlinking task relations.

## CLI quick reference

```sh
sane tasks list
sane tasks list --closed
sane tasks search "authentication"
sane tasks create --title "Ship MCP integration" --status todo --priority 2
sane tasks update <task-id> --status in_progress --priority 1
sane tasks get <task-id>
sane projects list
sane labels list
sane statuses list
sane members list
sane comments add <task-id> --content "Ready for review"
```

Use `--json` when a command's output needs to feed another program. The CLI's
default endpoint is `https://sane.today/api/cli`; a configured custom endpoint
must use HTTPS.
