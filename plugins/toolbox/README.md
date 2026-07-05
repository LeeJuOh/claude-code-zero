# toolbox

> Developer utility skills that fill the gaps in Claude Code's built-in capabilities.

## Why

Claude Code doesn't come with everything. Handoff between sessions loses context. Secrets get hardcoded into config files. XML sitemaps need manual parsing. Reference repos drift out of date.

toolbox is a collection of small, focused skills — each solves one specific friction point.

## Features

| Skill | Description |
|-------|-------------|
| `fetch-sitemap` | Auto-discover a site's sitemap via `/sitemap.xml`, root, and `robots.txt` — a bare domain works. Extract URLs with optional regex filter |
| `handoff` | Distill a session into a topic-based handoff document (`YYYY-MM-DD-<topic>.md`) with per-project config, same-topic replacement, and YAML frontmatter — so the next session can resume cold |
| `secret-setup` | Extract hardcoded secrets into a gitignored env file, auto-merge CLAUDE.md / `.mcp.json` / `settings.local.json`, install a SessionStart auto-loading hook, and add deny rules |
| `sync-references` | Pull latest changes for all git repos under a directory. Remembers the last path in `${CLAUDE_PLUGIN_DATA}/config.json` — later calls take no arguments |

All four skills have `disable-model-invocation: true` and must be invoked by name (`/fetch-sitemap`, `/handoff`, `/secret-setup`, `/sync-references`).

## Prerequisites

- **jq** (recommended) — `brew install jq`

## Install

```shell
/plugin install toolbox@claude-code-zero
```

## Usage

```
/fetch-sitemap example.com 'docs|blog'       # bare domain works — auto-discovers
/handoff auth-refactor              # topic-based, per-project path config
/secret-setup
/sync-references                              # remembers the last path
```

## License

MIT
