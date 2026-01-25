---
name: notebook-registry
description: Manage NotebookLM notebooks. Use when user mentions "notebook", "notebooklm", "registry", "list notebooks", "add notebook", "search notebook", or needs to manage their NotebookLM library.
allowed-tools:
  - Read
  - Write
  - Glob
  - Grep
  - Task
---

# NotebookLM Notebook Registry

Manage NotebookLM notebooks (metadata only). Querying NotebookLM content is delegated to the `notebooklm-chrome-researcher` agent.

## When to Use This Skill

Trigger when user:
- Mentions NotebookLM notebooks or registry management
- Wants to list, add, update, enable/disable, remove, or search notebooks
- Needs to locate a notebook by topic or name

## Tool Boundaries (Strict)

- ✅ Use only Read/Write/Glob/Grep/Task
- ❌ Do NOT use Chrome tools directly (`mcp__claude-in-chrome__*`)

When a question requires NotebookLM content:
```javascript
Task({
  subagent_type: "notebooklm-chrome-researcher",
  prompt: "Query this notebook..."
});
```

## Storage Model

Three-tier storage for token efficiency:
- `library.json` = active notebooks (minimal metadata)
- `archive.json` = inactive notebooks (minimal metadata)
- `notebooks/*.json` = full metadata per notebook
- `logs/` = optional Q&A history (delete when removing notebook)

```
${CLAUDE_PLUGIN_ROOT}/skills/notebook-registry/
├── library.json
├── archive.json
├── notebooks/
│   └── {id}.json
├── logs/
│   └── {id}-{timestamp}.json
└── references/
    ├── schemas.md
    ├── operations.md
    ├── examples.md
    └── implementation-notes.md
```

## Core Commands (Summary)

### list
- `list` (active only)
- `list --all` (active + archived)
- `list-inactive` (archived only)

### show
- `show <id>` (full metadata)

### add
- `add <url>` (smart add; uses Task agent)
- `add <url> --name "" --topics "" --description ""` (manual add)

Rules:
- Validate URL starts with `https://notebooklm.google.com/notebook/`
- Check duplicates in `library.json` then `archive.json`
- If found in archive, ask to enable

### search
- `search <query>` (search name/topics/description/tags/use_cases)

### enable / disable
- `enable <id>` moves from archive to library
- `disable <id>` moves from library to archive

### update
- `update <id> [--name ""] [--topics ""] [--description ""] [--tags ""] [--use-cases ""]`

### remove
- `remove <id>` with confirmation
- Delete library/archive entry, `notebooks/{id}.json`, and related logs

## Data Rules

- **ID**: kebab-case, max 50 chars, ensure uniqueness
- **Topics**: store top 3 topics in `library.json`/`archive.json`
- **Timestamps**: maintain `updated_at` on registry files and `last_used` when queried
- **Schema**: preserve `schema_version` fields

## References (Progressive Disclosure)

Read these only when needed:
- `references/operations.md` - full algorithms and prompts
- `references/schemas.md` - JSON schemas and examples
- `references/examples.md` - usage scenarios
- `references/implementation-notes.md` - parsing heuristics, error templates, success messages
