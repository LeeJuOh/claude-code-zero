# claw-mux

Make Claude Code a first-class cmux citizen — auto-detecting the cmux environment and using native tools for topology control, browser automation, markdown viewing, and notifications.

## Why

cmux provides pane splitting, an embedded browser, a markdown viewer, and a notification system — all accessible via CLI. Without this plugin, Claude Code doesn't know these features exist. It suggests keyboard shortcuts instead of splitting programmatically, uses external browser tools instead of the faster embedded browser, and never updates the sidebar with progress.

With claw-mux installed, Claude Code will:
- Split panes automatically to organize parallel work
- Use the embedded browser for web automation (faster, no external extension)
- Display plans and documentation in a live-reloading markdown panel
- Report progress via sidebar status pills, progress bars, and notifications

Outside cmux, these features are unavailable — existing browser and markdown tools in your environment continue working as before.

## Quick Start

```bash
claude plugin add claw-mux@claude-code-zero
```

Run Claude Code inside a cmux terminal — it automatically uses cmux-native features.

## Skills

| Skill | Command | Description |
|-------|---------|-------------|
| `claw-mux` | (auto-trigger) | Core topology control, notifications, sidebar metadata |
| `cmux-browser` | (auto-trigger) | Browser automation with snapshot/ref workflow |
| `cmux-markdown` | `/cmux-markdown` | Markdown viewer with live reload |

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
