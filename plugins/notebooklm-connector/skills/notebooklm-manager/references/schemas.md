# JSON Schemas

Storage: `${SKILL_ROOT}/data/`

## library.json

Active notebooks index (minimal for fast loading).

```json
{
  "notebooks": {
    "claude-docs": {
      "id": "claude-docs",
      "name": "Claude Code Documentation",
      "url": "https://notebooklm.google.com/notebook/abc123",
      "topics": ["Claude Code", "CLI", "Plugins"]
    }
  },
  "schema_version": "3.0",
  "updated_at": "2026-01-25T14:30:00Z"
}
```

## archive.json

Same structure as library.json, for disabled notebooks.

## notebooks/{id}.json

Full metadata, loaded on-demand.

```json
{
  "id": "claude-docs",
  "name": "Claude Code Documentation",
  "url": "https://notebooklm.google.com/notebook/abc123",
  "description": "Official Claude Code documentation",
  "topics": ["Claude Code", "CLI", "Plugins", "MCP", "Hooks"],
  "tags": ["documentation", "reference"],
  "use_cases": ["Feature lookup", "API reference"],
  "content_types": ["web", "pdf"],
  "created_at": "2026-01-20T08:00:00Z",
  "updated_at": "2026-01-24T11:30:00Z",
  "enabled": true
}
```

## Empty States

```json
{"notebooks": {}, "schema_version": "3.0", "updated_at": "..."}
```
