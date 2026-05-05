---
name: sync-references
disable-model-invocation: true
description: Pull latest changes from origin for all git repos under a directory. Use when asked to update, sync, or pull reference projects.
allowed-tools: Bash, AskUserQuestion
argument-hint: "[path]"
---

# Sync References

Pull latest from origin for all git repos under a target directory.

## Setup

Config: `${CLAUDE_PLUGIN_DATA}/config.json`

```bash
# Read config
cat "${CLAUDE_PLUGIN_DATA}/config.json" 2>/dev/null

# Write/update config
mkdir -p "${CLAUDE_PLUGIN_DATA}"
echo '{"default_path": "<path>"}' > "${CLAUDE_PLUGIN_DATA}/config.json"
```

On first run, if no config exists and no `$ARGUMENTS` path is given, ask the user which directory to sync and save it to config.

## Execution

Resolve the target path in this order:
1. `$ARGUMENTS` if provided
2. `default_path` from config.json
3. If neither exists, ask the user and save to config

Then run:

```bash
bash "${CLAUDE_SKILL_DIR}/scripts/sync.sh" <resolved-path>
```

Output the result as-is. If any repos failed, briefly note what went wrong.
