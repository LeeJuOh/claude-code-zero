---
name: claw-mux
description: "Control cmux terminal topology and terminal I/O — send commands to other panes, read their output, split layouts, run servers, monitor logs, report progress, and orchestrate multi-pane workflows. Use when automation needs to execute commands in other panes, read terminal output, organize parallel work, or report progress via sidebar. Requires cmux environment."
allowed-tools: Bash, Read
---

# cmux Core Control

Use this skill to control cmux topology, terminal I/O (send commands to other panes and read output), notifications, and sidebar metadata.

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

### Topology

```bash
# Always identify first — short refs (pane:1, surface:N) are session-scoped
cmux identify --json                                          # current caller context
cmux list-workspaces                                          # list workspaces
cmux list-panes                                               # list panes in workspace
cmux list-pane-surfaces --pane pane:1                          # list surfaces in pane
cmux new-workspace                                            # create workspace
cmux new-split right                                           # split current surface to the right
cmux move-surface --surface surface:7 --pane pane:2            # move surface between panes
cmux trigger-flash --surface surface:7                         # visual flash
```

### Terminal I/O (send commands to other panes, read output)

```bash
cmux send --surface surface:N "echo hello\n"                   # send text + Enter (\n = Enter)
cmux send --surface surface:N "npm start\n"                    # run a command in another pane
cmux send-key --surface surface:N enter                        # send Enter key separately
cmux send-key --surface surface:N ctrl+c                       # send Ctrl+C (stop a process)
cmux read-screen --surface surface:N                           # read visible terminal text
cmux read-screen --surface surface:N --scrollback              # include scrollback history
cmux read-screen --surface surface:N --scrollback --lines 200  # last 200 lines only
```

### Notifications & Sidebar

```bash
cmux notify --title "Build Complete" --body "All tests passed"
cmux set-status build "Ready" --icon checkmark --color "#34c759"
cmux set-progress 0.75 --label "Running tests"
cmux log --level info --source claude-code "Starting build..."
```

## Terminal I/O Patterns

The core workflow: split a pane, send a command, read the output.

```bash
# 1. Split to create a new surface
cmux new-split right
# output: "OK surface:9 workspace:3" — remember surface:9

# 2. Send a command (include \n for Enter)
cmux send --surface surface:9 "npm start\n"

# 3. Read the output later
cmux read-screen --surface surface:9 --scrollback --lines 50

# 4. Stop the process when done
cmux send-key --surface surface:9 ctrl+c
```

For detailed patterns (server monitoring, E2E testing, build pipelines), read the terminal-io reference.

## Sidebar Metadata

```bash
# status pill: set-status <key> <value> [--icon name] [--color #hex]
cmux set-status build "Ready" --icon checkmark --color "#34c759"
cmux set-status build "Failed" --icon xmark --color "#ff3b30"
cmux clear-status build

# progress bar (0.0 to 1.0, optional --label)
cmux set-progress 0.75 --label "Running tests"
cmux clear-progress

# log messages (leveled, optional --source)
cmux log --level info --source claude-code "Starting build..."
cmux log --level success "Build complete"
cmux log --level warning "3 deprecation warnings"
cmux log --level error "Test suite failed"
```

## Coexistence

- **In cmux**: Use `cmux new-split` for panes, `cmux send`/`cmux read-screen` for terminal I/O, `cmux notify` for notifications.
- **Outside cmux**: These features are unavailable. Use standard terminal workflows.
- **Browser automation in cmux**: Use the `cmux-browser` skill for embedded webview automation.
- **Markdown viewing in cmux**: Use `cmux markdown open <path>` directly to open a live-reloading panel.
- **With `cmux claude-teams`**: Teams uses its own tmux-shim layer for topology — do not mix direct `cmux` topology commands with Teams orchestration.

## Gotchas

- cmux commands fail silently outside cmux — always check `$CMUX_WORKSPACE_ID` before using any `cmux` command.
- Short refs (`surface:7`) are session-scoped and may change between sessions — always `cmux identify --json` at the start of automation to discover current topology.
- **`send` includes `\n` for Enter** — `cmux send "command\n"` sends the command and presses Enter in one call. No need for a separate `send-key enter` unless you want explicit timing control.
- **`send-keys` does not exist** — the command is `send` (text) and `send-key` (key event). This is different from tmux's `send-keys`.
- **`press` does not exist** — to send Ctrl+C, use `cmux send-key --surface surface:N ctrl+c`.
- **`read-screen` returns the current screen state** — if a command is still running, the output may be incomplete. Use `--scrollback --lines N` for history, or use `wait-for` signal synchronization for reliable sequencing.
- **In Claude Code, `sleep` over 2 seconds is blocked** — use Bash with `run_in_background: true` for delayed `read-screen`, or use the `cmux wait-for` synchronization pattern.
- `set-status --color` requires hex values (`"#34c759"`) — named colors like `green` are not supported.
- `set-status` requires a key (e.g., `build`) as the first argument — the key allows multiple independent status pills per workspace.
- If `cmux claude-teams` is active, it manages topology through a tmux-compat shim. Direct topology commands (`new-split`, `move-surface`) may conflict with Teams orchestration.
- Desktop alerts are suppressed when the cmux window is focused and the workspace is active — use `cmux log` for always-visible status updates.

## Deep-Dive References

| Reference | When to Use |
|-----------|-------------|
| [Terminal I/O]($SKILL_DIR/references/terminal-io.md) | Send commands, read output, server monitoring, E2E testing, build pipelines |
| [Sync and Automation]($SKILL_DIR/references/sync-and-automation.md) | wait-for synchronization, buffers, cmux.json custom workspace commands |
| [Handles and Identify]($SKILL_DIR/references/handles-and-identify.md) | Handle syntax, self-identify, caller targeting |
| [Windows and Workspaces]($SKILL_DIR/references/windows-workspaces.md) | Window/workspace lifecycle and reorder/move |
| [Panes and Surfaces]($SKILL_DIR/references/panes-surfaces.md) | Splits, surfaces, move/reorder, focus routing |
| [Trigger Flash and Health]($SKILL_DIR/references/trigger-flash-and-health.md) | Visual flash confirmation and surface health checks |
| [Notifications]($SKILL_DIR/references/notifications.md) | Notification CLI, sidebar metadata API, hook patterns |
