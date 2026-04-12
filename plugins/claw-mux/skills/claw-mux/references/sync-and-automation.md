# Synchronization and Automation

## wait-for — Pane Synchronization

Coordinate work across panes without polling. One pane waits, another signals.

```bash
# Wait for a named signal (blocks until signaled or timeout)
cmux wait-for <name> [--timeout <seconds>]

# Signal a named token (unblocks all waiters)
cmux wait-for -S <name>
cmux wait-for --signal <name>
```

Default timeout: 30 seconds.

**Claude Code note:** `wait-for` blocks the calling shell. Use `run_in_background: true` on the Bash tool so Claude Code can continue working while waiting. Chain `read-screen` after the wait to capture results in the same background call:

```bash
# run_in_background: true
cmux wait-for build-done --timeout 120 && cmux read-screen --surface surface:9 --scrollback --lines 50
```

### Example: Build then test

```bash
# Pane A (orchestrator): wait for build to finish
cmux send --surface surface:9 "npm run build && cmux wait-for -S build-done\n"
cmux wait-for build-done --timeout 120
# execution resumes here after build completes

# Now run tests in another pane
cmux send --surface surface:10 "npm test && cmux wait-for -S tests-done\n"
cmux wait-for tests-done --timeout 300
```

### Example: Server ready signal

```bash
# Start server, then poll for ready text
cmux send --surface surface:9 "npm run dev\n"

# Wait for server to report ready (run_in_background: true)
$SKILL_DIR/scripts/poll-screen.sh surface:9 "ready|listening on" --timeout 30

# After background notification confirms ready — open browser
cmux browser open http://localhost:3000
```

## Buffers — Cross-Pane Data Transfer

Named buffers let you pass text between panes without files.

```bash
# Set a named buffer
cmux set-buffer --name results "test output here"

# Paste buffer into a surface
cmux paste-buffer --name results --surface surface:9

# List all buffers
cmux list-buffers
```

## Custom Commands (cmux.json)

Define reusable workspace layouts and shell commands. cmux searches:
1. `./cmux.json` — project-local (takes precedence)
2. `~/.config/cmux/cmux.json` — global

Changes are detected automatically without app restart.

### Simple Command

```json
{
  "commands": [
    {
      "name": "Run Tests",
      "keywords": ["test", "check"],
      "command": "npm test",
      "confirm": true
    }
  ]
}
```

### Workspace Command (layout preset)

```json
{
  "commands": [
    {
      "name": "Dev Environment",
      "keywords": ["dev", "fullstack"],
      "restart": "confirm",
      "workspace": {
        "name": "Dev",
        "cwd": ".",
        "layout": {
          "direction": "horizontal",
          "split": 0.6,
          "children": [
            {
              "surfaces": [
                { "type": "terminal", "name": "Editor", "focus": true }
              ]
            },
            {
              "direction": "vertical",
              "split": 0.5,
              "children": [
                {
                  "surfaces": [
                    { "type": "terminal", "name": "Server", "command": "npm run dev" }
                  ]
                },
                {
                  "surfaces": [
                    { "type": "browser", "name": "Preview", "url": "http://localhost:3000" }
                  ]
                }
              ]
            }
          ]
        }
      }
    }
  ]
}
```

### Surface Properties

| Property | Type | Description |
|----------|------|-------------|
| `type` | `"terminal"` or `"browser"` | Surface type |
| `name` | string | Tab title |
| `command` | string | Auto-run shell command (terminal only) |
| `cwd` | string | Working directory |
| `env` | object | Environment variables |
| `url` | string | URL to open (browser only) |
| `focus` | boolean | Focus this surface after creation |

### Restart Behavior

| Value | Behavior |
|-------|----------|
| `"ignore"` | Switch to existing workspace (default) |
| `"recreate"` | Close and recreate without prompting |
| `"confirm"` | Ask user before recreating |

Commands appear automatically in the cmux command palette.
