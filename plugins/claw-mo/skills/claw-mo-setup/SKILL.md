---
name: claw-mo-setup
description: "Configure mo markdown viewer for current project. Use when user wants to set up doc watching, configure mo patterns, or initialize claw-mo for a project."
allowed-tools: Bash, AskUserQuestion, Read, Write
---

# claw-mo-setup

Configure mo markdown viewer watch patterns and port for the current project.

For config schema and port logic: read `${PLUGIN_DIR}/references/shared.md`

## Steps

1. Check prerequisites: `command -v mo >/dev/null 2>&1`
2. Get project root: `git rev-parse --show-toplevel` (fallback: `$PWD`)
3. Show file count: `find "$PROJECT_ROOT" -name '*.md' 2>/dev/null | wc -l` (warn if 500+)
4. List top-level directories with .md files:
   ```bash
   find "$PROJECT_ROOT" -name '*.md' -not -path '*/node_modules/*' -not -path '*/.git/*' | sed "s|$PROJECT_ROOT/||" | cut -d/ -f1 | sort -u
   ```
5. AskUserQuestion: which directories/patterns to watch
6. AskUserQuestion: custom port? (show auto-assigned default)
7. Save to `${PLUGIN_DATA_DIR}/config.json` (create file if needed, merge if exists)
8. Offer to start the server now

## Gotchas

- **`**/*.md` can explode**: Projects with vendored code may contain thousands of .md files. Always show the count before accepting `**/*.md`. Guide users toward specific include patterns.
