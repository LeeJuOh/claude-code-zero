---
name: claw-mux
description: "Control cmux terminal topology (windows, workspaces, panes, surfaces), send notifications, and update sidebar metadata. Use when automation needs deterministic placement, progress reporting, or navigation in a multi-pane cmux layout. Requires cmux environment."
allowed-tools: Bash, Read
---

# cmux Core Control

Use this skill to control cmux topology, routing, notifications, and sidebar metadata.

## Environment Detection

cmux sets `$CMUX_WORKSPACE_ID` and `$CMUX_SURFACE_ID` in every terminal it spawns. Check before using cmux commands:

```bash
if [ -z "$CMUX_WORKSPACE_ID" ]; then
  echo "Not running inside cmux — cmux commands unavailable"
fi
```

If not in cmux, fall back to standard tools (no pane splitting, no cmux notifications).

## Core Concepts

- **Window**: Top-level macOS cmux window.
- **Workspace**: Tab-like group within a window (sidebar entry).
- **Pane**: Split container in a workspace.
- **Surface**: A tab within a pane (terminal or browser panel).

Hierarchy: Window > Workspace > Pane > Surface

Default output uses short refs: `window:N`, `workspace:N`, `pane:N`, `surface:N`. UUIDs are still accepted as inputs. Request UUID output only when needed: `--id-format uuids|both`.

## Fast Start

```bash
# identify current caller context
cmux identify --json

# list topology
cmux list-windows
cmux list-workspaces
cmux list-panes
cmux list-pane-surfaces --pane pane:1

# create / focus / move
cmux new-workspace
cmux new-split right --panel pane:1
cmux move-surface --surface surface:7 --pane pane:2 --focus true
cmux reorder-surface --surface surface:7 --before surface:3

# attention cue
cmux trigger-flash --surface surface:7
```

## Notifications

```bash
# simple notification (appears in sidebar + desktop alert)
cmux notify --title "Build Complete" --body "All tests passed"

# with subtitle
cmux notify --title "Claude Code" --subtitle "Waiting" --body "Agent needs input"
```

## Sidebar Metadata

Update the sidebar status pills and progress bar for the current workspace:

```bash
# status pill: set-status <key> <value> [--icon icon] [--color #hex]
cmux set-status build "Ready" --icon checkmark --color green
cmux set-status build "Failed" --icon xmark --color red
cmux clear-status build

# progress bar (0.0 to 1.0, optional --label)
cmux set-progress 0.75 --label "Running tests"

# log messages (leveled, optional --source)
cmux log --level info --source claude-code "Starting build..."
cmux log --level success "Build complete"
cmux log --level warning "3 deprecation warnings"
cmux log --level error "Test suite failed"
```

## Coexistence

- **In cmux**: Use `cmux new-split` for panes, `cmux notify` for notifications, `cmux set-progress` for progress.
- **Outside cmux**: These features are unavailable. Use standard terminal workflows.
- **Browser automation in cmux**: Use the `cmux-browser` skill for embedded webview automation.
- **Markdown viewing in cmux**: Use `cmux markdown open` (see Fast Start above) or invoke `/cmux-markdown` for detailed reference.
- **With `cmux claude-teams`**: Teams uses its own tmux-shim layer for topology — do not mix direct `cmux` topology commands with Teams orchestration.

## Gotchas

- cmux commands fail silently outside cmux — always check `$CMUX_WORKSPACE_ID` before using any `cmux` command.
- Short refs (`surface:7`) are session-scoped and may change between sessions — always `cmux identify --json` at the start of automation to discover current topology.
- `set-status` requires a key (e.g., `build`) as the first argument — the key allows multiple independent status pills per workspace.
- If `cmux claude-teams` is active, it manages topology through a tmux-compat shim. Direct topology commands (`new-split`, `move-surface`) may conflict with Teams orchestration.
- Desktop alerts are suppressed when the cmux window is focused and the workspace is active — use `cmux log` for always-visible status updates.

## Deep-Dive References

| Reference | When to Use |
|-----------|-------------|
| [$SKILL_DIR/references/handles-and-identify.md]($SKILL_DIR/references/handles-and-identify.md) | Handle syntax, self-identify, caller targeting |
| [$SKILL_DIR/references/windows-workspaces.md]($SKILL_DIR/references/windows-workspaces.md) | Window/workspace lifecycle and reorder/move |
| [$SKILL_DIR/references/panes-surfaces.md]($SKILL_DIR/references/panes-surfaces.md) | Splits, surfaces, move/reorder, focus routing |
| [$SKILL_DIR/references/trigger-flash-and-health.md]($SKILL_DIR/references/trigger-flash-and-health.md) | Visual flash confirmation and surface health checks |
| [$SKILL_DIR/references/notifications.md]($SKILL_DIR/references/notifications.md) | Notification CLI, sidebar metadata API, hook patterns |
