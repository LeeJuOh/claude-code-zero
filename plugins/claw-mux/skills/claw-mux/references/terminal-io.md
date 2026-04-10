# Terminal I/O

Send commands to other panes and read their output. This is the foundation for server monitoring, E2E testing, build pipelines, and remote Claude Code control.

## Command Reference

### send — Send text to a surface

```bash
cmux send [--surface surface:N] [--workspace workspace:N] "text"
```

Escape sequences: `\n` and `\r` send Enter, `\t` sends Tab. If `--surface` is omitted, sends to the caller's own surface.

```bash
cmux send --surface surface:9 "echo hello\n"           # send command + Enter
cmux send --surface surface:9 "npm start\n"            # start a server
cmux send --surface surface:9 "ls -la\n"               # list files
cmux send --surface surface:9 "y\n"                    # answer a prompt
```

### send-key — Send a key event to a surface

```bash
cmux send-key [--surface surface:N] [--workspace workspace:N] <key>
```

Supported keys: `enter`, `tab`, `escape`, `backspace`, `delete`, `up`, `down`, `left`, `right`, `ctrl+c`.

```bash
cmux send-key --surface surface:9 enter                # press Enter
cmux send-key --surface surface:9 ctrl+c               # interrupt process
cmux send-key --surface surface:9 up                   # previous command
```

### read-screen — Read terminal text from a surface

```bash
cmux read-screen [--surface surface:N] [--workspace workspace:N] [--scrollback] [--lines N]
```

- Without `--scrollback`: returns visible viewport only
- With `--scrollback`: includes scrollback buffer
- With `--lines N`: limits to last N lines (implies `--scrollback`)

```bash
cmux read-screen --surface surface:9                           # visible screen
cmux read-screen --surface surface:9 --scrollback              # full history
cmux read-screen --surface surface:9 --scrollback --lines 50   # last 50 lines
```

### capture-pane — tmux-compatible alias

```bash
cmux capture-pane [--surface surface:N] [--workspace workspace:N] [--scrollback] [--lines N]
```

Same as `read-screen`. Exists for tmux compatibility.

## Patterns

### Server Start & Log Monitoring

```bash
# 1. Create a pane for the server
cmux new-split right
# → OK surface:9 workspace:3

# 2. Start the server
cmux send --surface surface:9 "npm run dev\n"

# 3. Read logs later
cmux read-screen --surface surface:9 --scrollback --lines 100

# 4. Stop when done
cmux send-key --surface surface:9 ctrl+c
```

### Build Pipeline with Progress

```bash
# Create build pane
cmux new-split down
# → OK surface:10 workspace:3

# Start build with progress tracking
cmux set-progress 0.0
cmux send --surface surface:10 "npm run build\n"

# Check output periodically
cmux read-screen --surface surface:10 --scrollback --lines 20

# Update progress as steps complete
cmux set-progress 0.5 --label "Build complete, running tests..."
cmux send --surface surface:10 "npm test\n"

# Final status
cmux set-progress 1.0 --label "All done"
cmux notify --title "Pipeline" --body "Build and tests passed"
```

### E2E Test Setup (Terminal + Browser)

```bash
# 1. Server pane
cmux new-split right
# → OK surface:9 workspace:3
cmux send --surface surface:9 "npm run dev\n"

# 2. Wait for server startup (check logs)
cmux read-screen --surface surface:9 --scrollback --lines 20
# look for "ready on http://localhost:3000"

# 3. Open browser to test
cmux browser open http://localhost:3000
# → surface:10

# 4. Run browser assertions via cmux-browser skill
cmux browser surface:10 snapshot --interactive
cmux browser surface:10 get text "h1"
```

### Remote Claude Code Control

Run a separate Claude Code instance in another pane and feed it commands:

```bash
# 1. Create pane for the second Claude Code
cmux new-split right
# → OK surface:9 workspace:3

# 2. Start Claude Code (interactive mode)
cmux send --surface surface:9 "claude\n"

# 3. Wait for it to load, then send a prompt
cmux read-screen --surface surface:9 --scrollback --lines 30
# verify Claude Code is ready

# 4. Send a task
cmux send --surface surface:9 "fix the login bug in src/auth.ts\n"

# 5. Monitor progress
cmux read-screen --surface surface:9 --scrollback --lines 50
```

## Timing Strategies

Claude Code blocks `sleep` over 2 seconds. Use these alternatives:

### Option A: Background read with delay

```bash
# Run read-screen after a delay in the background
sleep 5 && cmux read-screen --surface surface:9 --scrollback --lines 50
```

Use `run_in_background: true` in the Bash tool to avoid the sleep block.

### Option B: wait-for synchronization

If you control both panes, use `wait-for` for reliable sequencing:

```bash
# In the target pane (sent via cmux send):
cmux send --surface surface:9 "npm run build && cmux wait-for -S build-done\n"

# In the orchestrator (this pane):
cmux wait-for build-done --timeout 120
# continues only after build finishes
cmux read-screen --surface surface:9 --scrollback --lines 50
```

### Option C: Poll with read-screen

Read repeatedly and check for expected output:

```bash
cmux read-screen --surface surface:9 --scrollback --lines 10
# check if the expected output appeared, retry if not
```
