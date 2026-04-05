# Notifications and Sidebar Metadata

cmux provides notifications, sidebar status pills, progress bars, and log messages via CLI and socket API.

## Notifications

### CLI

```bash
# basic notification
cmux notify --title "Task Complete" --body "All 12 tests passed"

# with subtitle
cmux notify --title "Claude Code" --subtitle "Waiting" --body "Agent needs input"

# manage notifications
cmux list-notifications [--json]
cmux clear-notifications
```

### Notification Lifecycle

1. **Received** — notification arrives, desktop alert fires (if not suppressed)
2. **Unread** — badge appears on workspace tab
3. **Read** — badge clears when user views the workspace
4. **Cleared** — removed from panel (manually or via `clear-notifications`)

Desktop alerts are suppressed when: the cmux window is focused, the workspace is active, or the notification panel is open.

## Sidebar Metadata

### Status Pills

```bash
# set-status <key> <value> [--icon icon] [--color #hex] [--workspace id]
cmux set-status build "Ready" --icon checkmark --color green
cmux set-status build "Failed" --icon xmark --color red
cmux set-status build "Building" --icon gear --color blue
cmux clear-status build
cmux list-status
```

The `<key>` allows multiple independent status pills per workspace (e.g., `build`, `deploy`, `lint`).

### Progress Bar

```bash
cmux set-progress 0.0                          # empty
cmux set-progress 0.5 --label "Running tests"  # half, with label
cmux set-progress 1.0                          # full
cmux clear-progress
```

### Log Messages

```bash
cmux log --level info "Analyzing codebase..."
cmux log --level progress "Step 3/5: Running tests"
cmux log --level success "All checks passed"
cmux log --level warning "Deprecated API usage detected"
cmux log --level error --source claude-code "Build failed: missing dependency"
cmux list-log [--limit 20]
cmux clear-log
```

Log levels: `info`, `progress`, `success`, `warning`, `error`. The `--source` flag identifies the log producer.

### Read Sidebar State

```bash
cmux sidebar-state
cmux sidebar-state --workspace workspace:2
```

### Sidebar Visibility Settings

Sidebar metadata display is controlled via `settings.json` → `sidebar`:
- `showLog`: Show recent log snippets
- `showProgress`: Display progress indicators
- `showCustomMetadata`: Show custom metadata pills

## Claude Code Hook Integration

Add a `Stop` hook to `~/.claude/settings.json` for task-completion notifications:

```bash
# One-liner hook command (checks cmux env, notifies + sets status)
bash -c '[ -z "${CMUX_WORKSPACE_ID:-}" ] && exit 0; cmux notify --title "Claude Code" --body "Task complete"; cmux set-status agent "Done" --icon checkmark --color green'
```

For richer logic (e.g., branching on `stop_reason`), use a script file instead. The hook receives JSON on stdin with the event payload.

## Agent Workflow Patterns

### Progress Reporting

```bash
cmux set-progress 0.0
cmux log --level info --source claude-code "Starting implementation..."

# ... after each step ...
cmux set-progress 0.33
cmux log --level progress "Step 1/3 complete"

cmux set-progress 0.66
cmux log --level progress "Step 2/3 complete"

cmux set-progress 1.0
cmux log --level success "All steps complete"
cmux notify --title "Plan Complete" --body "3/3 tasks finished"
```

### Error Notification

```bash
cmux set-status build "Build Failed" --icon xmark --color red
cmux notify --title "Build Error" --body "Test suite failed: 2 failures"
cmux log --level error "npm test exited with code 1"
```
