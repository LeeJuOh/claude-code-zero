# toolbox

Personal utility commands and tools for Claude Code.

## Commands

### `/fetch-sitemap`

Extract URLs from an XML sitemap with optional regex filtering.

**Usage:**

```
/fetch-sitemap <sitemap-url> [pattern]
```

**Examples:**

```
/fetch-sitemap https://example.com/sitemap.xml
/fetch-sitemap https://example.com/sitemap.xml en
/fetch-sitemap https://example.com/sitemap.xml 'skills|hooks'
```

### `/handoff`

Write or update a handoff document so the next agent with fresh context can continue this work.

**Usage:**

```
/handoff [path]
```

**Examples:**

```
/handoff                          # defaults to HANDOFF.md
/handoff handoffs/auth-refactor.md
/handoff handoffs/api-migration.md
```

## License

MIT
