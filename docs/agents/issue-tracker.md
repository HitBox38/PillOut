# Issue tracker: GitHub

Issues and PRDs live in GitHub Issues for `HitBox38/PillOut`, matching the repository's `origin` remote. Use the `gh` CLI from this checkout.

- Read a ticket with `gh issue view <number> --comments`.
- List tickets with `gh issue list --state open --json number,title,body,labels`, adding filters appropriate to the task.
- When an invoked workflow calls for publishing a ticket, use `gh issue create`. For multiline text, write the exact body to a temporary file and pass `--body-file`.
- Apply labels using the vocabulary and availability rules in `triage-labels.md`.
- Creating this configuration does not authorize publishing issues, comments, or other external messages.
