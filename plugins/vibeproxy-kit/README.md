# vibeproxy-kit

State-aware VibeProxy alias manager for Claude Code.

## Why this exists

VibeProxy lets you run Claude Code against Codex, GitHub Copilot, Antigravity, Gemini, Qwen, and Z.AI GLM models over a local HTTP proxy. Wiring that up by hand means:

- Editing `~/.cli-proxy-api/config.yaml` with the right `oauth-model-alias` entries per backend
- Keeping the `cc-*` shell aliases in `~/.zshrc` consistent across machines
- Remembering which aliases you added, which VibeProxy added, and which your coworkers added for you that one time
- Rediscovering what went wrong when a silent backend hop routes `claude-opus-4.6` through the wrong provider

`vibeproxy-kit` makes that configuration explicit, state-aware, and reversible.

## Quick Start

1. Install [VibeProxy](https://github.com/automazeio/vibeproxy) and launch it
2. Open Settings from the menu bar icon and authenticate at least one backend (Codex, GitHub Copilot, Antigravity, Gemini, Qwen, or Z.AI GLM — each requires a subscription to the respective provider)
3. Run `/setup-aliases`

The skill detects what you have installed and authenticated, walks you through any missing setup, then lets you choose which backends and models to expose as `cc-*` aliases — leaving your manual shell edits alone.

## Commands

| Command | What it does |
|---------|--------------|
| `/setup-aliases` | Discover VibeProxy state, choose backends/models, rewrite managed aliases in `~/.cli-proxy-api/config.yaml` and `~/.zshrc`, validate against `/v1/models`. Idempotent and reversible. |

## How it treats your files

The kit writes to two places:

- `~/.cli-proxy-api/config.yaml` — only the `oauth-model-alias` entries it owns (tracked via a persisted state file). Unrelated top-level keys, comments, and formatting are preserved via round-trip YAML.
- `~/.zshrc` — only the marker-delimited managed alias block. Manual `alias cc-*` lines outside the block are detected as conflicts and left untouched unless you explicitly opt in.

Both files are backed up before each write and rolled back together if validation fails.

## Requirements

- macOS with [VibeProxy.app](https://github.com/automazeio/vibeproxy) installed in `/Applications`
- A paid subscription to at least one supported provider (Codex, GitHub Copilot, Antigravity, Gemini, Qwen, or Z.AI GLM)
- Python 3 with `ruamel.yaml` (auto-installed on first run if missing)
- zsh with `~/.zshrc`
