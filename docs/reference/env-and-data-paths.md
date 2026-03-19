# Environment Variables & Data Paths

## Environment Variables

| Variable | Description |
|----------|-------------|
| `${CLAUDE_PLUGIN_ROOT}` | Plugin install directory (changes on update — do not store data here) |
| `${CLAUDE_PLUGIN_DATA}` | Persistent per-plugin data directory (survives updates) |

## Path Resolution

`${CLAUDE_PLUGIN_DATA}` resolves to `~/.claude/plugins/data/{id}/` where `{id}` is the plugin identifier with non-alphanumeric chars replaced by `-`.

## Data Persistence

| Purpose | Path |
|---------|------|
| Persistent data (reports, config) | `${CLAUDE_PLUGIN_DATA}` (preferred) or `~/.claude-code-zero/<plugin-name>/` (legacy) |
| Temporary data (clone tmp) | `/tmp/<plugin-name>/` |

**Critical rule:** Data stored in the skill/plugin directory (`${CLAUDE_PLUGIN_ROOT}`) is deleted on upgrade — always use `${CLAUDE_PLUGIN_DATA}` for persistent storage.
