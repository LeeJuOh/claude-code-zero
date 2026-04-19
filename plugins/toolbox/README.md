# toolbox

> Developer utility skills that fill the gaps in Claude Code's built-in capabilities.

## Why

Claude Code doesn't come with everything. WebFetch gets blocked by bot detection. Handoff between sessions loses context. Secrets get hardcoded into config files. XML sitemaps need manual parsing. Reference repos drift out of date.

toolbox is a collection of small, focused skills — each solves one specific friction point.

## Features

| Skill | Description |
|-------|-------------|
| `fetch-sitemap` | Auto-discover a site's sitemap via `/sitemap.xml`, root, and `robots.txt` — a bare domain works. Extract URLs with optional regex filter |
| `gemini-fetch` | Fetch web content via Gemini CLI when WebFetch is blocked (403, Cloudflare, bot-detection). **Auto-triggers on WebFetch failures**, with a `google_web_search` fallback for JS challenges |
| `handoff` | Write or update a resumption-ordered handoff document — Goal, First Action, Context, Current Progress, What Worked, What Didn't Work, Next Steps — so the next session can pick up cold |
| `secret-setup` | Extract hardcoded secrets into a gitignored env file, auto-merge CLAUDE.md / `.mcp.json` / `settings.local.json`, install a SessionStart auto-loading hook, and add deny rules |
| `sync-references` | Pull latest changes for all git repos under a directory. Remembers the last path in `${CLAUDE_PLUGIN_DATA}/config.json` — later calls take no arguments |

Only `gemini-fetch` and `sync-references` auto-trigger from natural language. The other three have `disable-model-invocation: true` and must be invoked by name (`/fetch-sitemap`, `/handoff`, `/secret-setup`).

## Install

```shell
/plugin install toolbox@claude-code-zero
```

## Usage

```
/fetch-sitemap example.com 'docs|blog'       # bare domain works — auto-discovers
/gemini-fetch https://reddit.com/r/ClaudeAI  # or just let WebFetch fail and this fires
/handoff
/secret-setup
/sync-references                              # remembers the last path
```

## License

MIT
