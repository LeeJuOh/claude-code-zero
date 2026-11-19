# toolbox

> Hand off a session, move secrets out of configuration files, read a sitemap, or update reference repositories.

## Why

When work moves to a new session, the next agent needs to know what you decided, what is still open, and where to look. A transcript leaves it to the reader to find those details. `handoff` writes them to a file you can open in the next session. Matt Pocock describes the same problem in [his guide to session handoffs](https://www.aihero.dev/skills-handoff).

Call the other three tools independently when you need to load a secret from an environment file, find URLs in a sitemap, or pull changes into local reference repositories.

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
