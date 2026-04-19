# claw-mux

Give Claude Code full control of the terminal environment through cmux — execute commands in other panes, read their output, split layouts, automate browsers, and report progress.

## Why

Claude Code can only control the terminal it's running in. It can't start a server in one pane and read its logs from another. It can't run E2E tests while monitoring a dev server. It can't spin up a second Claude Code instance and feed it tasks.

cmux exposes all of this through a CLI: `send` commands to any pane, `read-screen` to get output back, `new-split` to create layouts, `browser open` for embedded web automation. Without this plugin, Claude Code doesn't know any of it exists.

With claw-mux installed, Claude Code will:
- Send commands to other panes and read their output (`send`, `read-screen`)
- Synchronize completion with `cmux wait-for` signals or the bundled `poll-screen.sh` helper — no more fixed sleeps
- Start servers, monitor logs, run builds across split panes
- Automate the embedded WKWebView with a snapshot/ref workflow (no Chrome extension) using ready-to-use templates (`form-automation`, `authenticated-session`, `capture-workflow`)
- Display plans and documentation in a live-reloading markdown panel
- Report progress via three sidebar primitives: status pills (`set-status`), progress bars (`set-progress`), and leveled logs (`log`)

The human watches from cmux, seeing every pane Claude Code is orchestrating. Outside cmux, these features are unavailable — existing tools continue working as before.

> **WKWebView limits.** cmux's embedded browser cannot set a custom viewport, run offline/throttled, capture traces, or mock the network. For those cases use Chrome MCP instead.

## Quick Start

```bash
claude plugin add claw-mux@claude-code-zero
```

Run Claude Code inside a cmux terminal — it automatically uses cmux-native features.

## Skills

| Skill | Invocation | Description |
|-------|------------|-------------|
| `claw-mux` | auto-trigger | Topology control (`send`, `read-screen`, `new-split`, `wait-for`), completion-detection patterns, sidebar primitives (status pills / progress bars / leveled logs), notifications |
| `cmux-browser` | auto-trigger | WKWebView browser automation with snapshot/ref workflow; ships `form-automation`, `authenticated-session`, and `capture-workflow` templates |
| `cmux-markdown` | on request | Markdown viewer with live reload. Model-invocation disabled — ask Claude to open a file or invoke the skill by name |

## Coexistence

| Feature | In cmux | Outside cmux |
|---------|---------|--------------|
| Browser automation | cmux embedded browser | N/A (use other tools) |
| Markdown viewing | cmux native panel | N/A (use other tools) |
| Pane management | cmux CLI | N/A |
| Notifications | cmux notify | N/A |

## Requirements

- cmux (macOS terminal) — [download](https://github.com/manaflow-ai/cmux/releases/latest)
- cmux CLI in PATH (`/usr/local/bin/cmux`)
