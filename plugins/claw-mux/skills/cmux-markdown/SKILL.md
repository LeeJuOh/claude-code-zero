---
name: cmux-markdown
description: "Open markdown files in a cmux formatted viewer panel with live reload. Use when you need to display plans, documentation, or notes alongside the terminal with rich rendering (headings, code blocks, tables, lists). Requires cmux environment ($CMUX_WORKSPACE_ID)."
disable-model-invocation: true
allowed-tools: Bash, Read, Write
---

# Markdown Viewer with cmux

Use this skill to display markdown files in a dedicated panel with rich formatting and live file watching. Requires cmux environment (`$CMUX_WORKSPACE_ID`). Outside cmux, this skill's features are unavailable.

## Core Workflow

1. Write your plan or notes to a `.md` file.
2. Open it in a markdown panel.
3. The panel auto-updates when the file changes on disk.

```bash
# Open a markdown file as a split panel next to the current terminal
cmux markdown open plan.md

# Absolute path
cmux markdown open /path/to/PLAN.md

# Target a specific workspace
cmux markdown open design.md --workspace workspace:2
```

## When to Use

- Displaying an agent plan or task list alongside the terminal
- Showing documentation, changelogs, or READMEs while working
- Reviewing notes that update in real-time (e.g., a plan file being written by another process)

## Live File Watching

The panel automatically re-renders when the file changes on disk. This works with:

- Direct writes (`echo "..." >> plan.md`)
- Editor saves (vim, nano, VS Code)
- Atomic file replacement (write to temp, rename over original)
- Agent-generated plan files that are updated progressively

If the file is deleted, the panel shows a "file unavailable" state. During atomic replace, the panel retries within a short window. If the file returns later, close and reopen the panel.

## Agent Integration

### Opening a plan file

Write your plan to a file, then open it:

```bash
cat > plan.md << 'EOF'
# Task Plan

## Steps
1. Analyze the codebase
2. Implement the feature
3. Write tests
4. Verify the build
EOF

cmux markdown open plan.md
```

### Updating a plan in real-time

The panel live-reloads, so simply overwrite the file as work progresses:

```bash
# The markdown panel updates automatically when the file changes
echo "## Step 1: Complete" >> plan.md
```

## Routing

```bash
# Open in the caller's workspace (default — uses CMUX_WORKSPACE_ID)
cmux markdown open plan.md

# Open in a specific workspace
cmux markdown open plan.md --workspace workspace:2

# Open splitting from a specific surface
cmux markdown open plan.md --surface surface:5

# Open in a specific window
cmux markdown open plan.md --window window:1
```

## Deep-Dive References

| Reference | When to Use |
|-----------|-------------|
| [Commands]($SKILL_DIR/references/commands.md) | Full command syntax and options |
| [Live Reload]($SKILL_DIR/references/live-reload.md) | File watching behavior, atomic writes, edge cases |

## Rendering Support

The markdown panel renders:

- Headings (h1-h6) with dividers on h1/h2
- Fenced code blocks with monospaced font
- Inline code with highlighted background
- Tables with alternating row colors
- Ordered and unordered lists (nested)
- Blockquotes with left border
- Bold, italic, strikethrough
- Links (clickable)
- Horizontal rules
- Images (inline)

Supports both light and dark mode.

## Gotchas

- File watcher does NOT auto-reconnect after a file is deleted and recreated — close and reopen the panel to pick up the new file.
- Large files (100KB+) may cause brief UI hitches during re-render. Keep plan files concise.
- Write the full plan file first, then open it — opening while still writing exposes a partially rendered state.
- Don't delete and recreate files rapidly — prefer overwriting in place or using atomic replacement (write to temp + rename).
