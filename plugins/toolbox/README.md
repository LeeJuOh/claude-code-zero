# toolbox

> Developer utility skills that fill the gaps in Claude Code's built-in capabilities.

## Why

Claude Code doesn't come with everything. WebFetch gets blocked by bot detection. Handoff between sessions loses context. Secrets get hardcoded into config files. XML sitemaps need manual parsing. Reference repos drift out of date.

toolbox is a collection of small, focused skills — each solves one specific friction point.

## Features

| Skill | Description |
|-------|-------------|
| `fetch-sitemap` | Extract URLs from XML sitemaps with optional regex filtering |
| `gemini-fetch` | Fetch web content via Gemini CLI when WebFetch is blocked (403, bot-detection) |
| `handoff` | Write or update a handoff document for the next agent session |
| `health` | Audit Claude Code config drift and collaboration issues |
| `secret-setup` | Extract hardcoded secrets into a gitignored env file with auto-loading hook |
| `sync-references` | Pull latest changes for all git repos under a directory |

## Install

```shell
/plugin install toolbox@claude-code-zero
```

## Usage

```
/fetch-sitemap https://example.com/sitemap.xml 'docs|blog'
/gemini-fetch https://reddit.com/r/ClaudeAI/top
/handoff
/health
/secret-setup
/sync-references references/
```

## License

MIT
