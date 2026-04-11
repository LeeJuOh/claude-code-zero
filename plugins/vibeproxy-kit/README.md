# vibeproxy-kit

State-aware VibeProxy alias manager for Claude Code.

## Why this exists

VibeProxy lets you run Claude Code against Codex, GitHub Copilot, Antigravity, and Gemini models over a local HTTP proxy. Wiring that up by hand means:

- Editing `~/.cli-proxy-api/config.yaml` with the right `oauth-model-alias` entries per backend
- Keeping the `cc-*` shell aliases in `~/.zshrc` consistent across machines
- Remembering which aliases you added, which VibeProxy added, and which your coworkers added for you that one time
- Rediscovering what went wrong when a silent backend hop routes `claude-opus-4.6` through the wrong provider

`vibeproxy-kit` makes that configuration explicit, state-aware, and reversible.

## Quick Start

```bash
/setup-aliases
```

The skill discovers current VibeProxy state, lets you choose which backends and models to expose as `cc-*` aliases, and writes only the entries it manages — leaving your manual shell edits alone.

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

- macOS with VibeProxy.app installed in `/Applications`
- Python 3 with `ruamel.yaml` (auto-installed on first run via `pip install --user`)
- zsh with `~/.zshrc`
