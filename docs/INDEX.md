# docs/ — Knowledge Base Index

> System of record for this repository. `AGENTS.md` is the map; detailed knowledge lives here.
>
> Adding content: put it in the directory that fits and register the directory here, not the file. Handoffs are temporary: once absorbed into a spec, issue, ADR, or commit, delete them. Update a spec or issue status line in the commit that completes it.

| Path | Contents |
|---|---|
| `reference/` | Plugin-development references — `gotchas.md` (read before any plugin change), `readme-style.md` |
| `release-workflow.md` | Release and tagging on `main`: sync → compare → check bumps → merge → tag → push |
| `promotion-channels.md` | Curated platforms for promoting the plugins |
| `specs/` | Product specs / PRDs, numbered and paired with `issues/` from 011 |
| `issues/` | Implementation issues with vertical slices (`NNN-*.md`) |
| `adr/` | Architecture decision records (`NNNN-*.md`) |
| `context/` | Per-plugin domain glossaries |
| `enhancement/` | Audits and improvement notes that are not product specs |
| `research/` | Research behind a shipped design decision in this repo. General tool surveys belong in llm-wiki |
| `handoff/` | Temporary session handoffs (lifecycle above) |
| `origin/` | External articles and guides. **Local only — gitignored**; not authoritative repository state |

For marketplace schema, hooks, SKILL.md frontmatter, and environment variables, fetch the official docs — see `AGENTS.md` § Official Claude Code Docs.
