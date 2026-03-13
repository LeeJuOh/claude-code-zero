---
name: sync-references
description: Pull latest changes from origin for all git repos under references/. Use when asked to update, sync, or pull reference projects.
allowed-tools: Bash
---

# Sync References

Run the sync script and report results. Execute without asking the user.

```bash
bash "${CLAUDE_SKILL_DIR}/scripts/sync.sh" references
```

Output the result as-is. If any repos failed, briefly note what went wrong.
