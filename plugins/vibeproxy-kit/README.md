# vibeproxy-kit

State-aware VibeProxy alias manager for Claude Code.

## Why this exists

VibeProxy lets you run Claude Code against Codex, GitHub Copilot, Antigravity, Gemini, Qwen, and Z.AI GLM models over a local HTTP proxy. Wiring that up by hand means:

- Editing `~/.cli-proxy-api/config.yaml` with the right `oauth-model-alias` entries per backend
- Keeping the `cc-*` shell aliases in `~/.zshrc` consistent across machines
- Remembering which aliases you added, which VibeProxy added, and which your coworkers added for you that one time
- Rediscovering what went wrong when a silent backend hop routes `claude-opus-4.6` through the wrong provider

`vibeproxy-kit` makes that configuration explicit, state-aware, and reversible.

> [!WARNING]
> This plugin automates local alias and config management for routing Claude Code through VibeProxy/CLIProxyAPIPlus-backed providers.
> Depending on the provider and account type, this usage pattern may violate Terms of Service and may lead to account restrictions, suspension, or permanent bans.
> You are solely responsible for how you use this setup. Review the upstream provider and proxy documentation before enabling it.
> This plugin does not make unofficial provider routing safe, compliant, or supported.
> For upstream warnings and public reports involving Antigravity/Gemini routing, see [VibeProxy's warning](https://github.com/automazeio/vibeproxy/blob/main/FACTORY_SETUP.md), [Antigravity Account Banned](https://github.com/1rgs/claude-code-proxy/issues/95), and [Accounts getting banned due to TOS violation](https://github.com/badrisnarayanan/antigravity-claude-proxy/issues/277).

## Quick Start

1. Install [VibeProxy](https://github.com/automazeio/vibeproxy) and launch it
2. Open Settings from the menu bar icon and authenticate **all backends you subscribe to** (Codex, GitHub Copilot, Antigravity, Gemini, Qwen, or Z.AI GLM). **Gemini note:** GUI OAuth is broken — use the CLI instead: `/Applications/VibeProxy.app/Contents/Resources/cli-proxy-api-plus -login --config /Applications/VibeProxy.app/Contents/Resources/config.yaml` ([details](https://github.com/automazeio/vibeproxy/issues/286))
3. Run `/setup-aliases`

The skill detects what you have installed and authenticated, walks you through any missing setup, then lets you choose which backends and models to expose as `cc-*` aliases — leaving your manual shell edits alone.

## Commands

| Command | What it does |
|---------|--------------|
| `/setup-aliases` | Discover VibeProxy state, choose backends/models, rewrite managed aliases in `~/.cli-proxy-api/config.yaml` and `~/.zshrc`, validate against `/v1/models`. Idempotent and reversible. |
| `cc-list` | Show all configured aliases grouped by backend, with model info and shortcut names. Added to `~/.zshrc` by `/setup-aliases`. |

## How it works

### Why one backend at a time?

VibeProxy merges all active backends into a single `/v1/models` listing. When Codex and Copilot are both on, `gpt-5.4` appears once — but you can't tell which provider will actually handle the request. The probe cycle disables all backends except one so each model can be attributed to its source.

### Effort levels (reasoning effort)

Models like `gpt-5.4` and `claude-opus-4.6` support effort suffixes: `gpt-5.4(high)`, `claude-opus-4.6(low)`. These are **not separate models** — VibeProxy parses the parenthesized suffix at request time and passes the effort level to the upstream provider. The setup skill detects which models support this via probe metadata and presents effort level selection automatically.

### Shortcut aliases

Every canonical alias gets an auto-generated shortcut following a fixed convention: `cc-{2char-backend}-{model}-{effort}`. Backend tokens: `cx` (Codex), `cp` (Copilot), `ag` (Antigravity), `gm` (Gemini), `qw` (Qwen), `za` (Z.AI). Model tokens are version-free (e.g., `opus`, `gpt`, `gemini-pro`).

Examples: `cc-cx-med` → `cc-codex-gpt54-med`, `cc-cp-opus-high` → `cc-copilot-opus46-high`.

### fork: false and default alias suppression

All aliases are created with `fork: false` (default). This removes the original upstream model name from VibeProxy's registry — only the `cc-*` alias is routable. This prevents ambiguous routing when the same model appears in multiple backends.

A side effect: VibeProxy auto-injects default Claude aliases for GitHub Copilot (e.g., `claude-opus-4.6`, `claude-haiku-4.5`) when no explicit config exists. Because this plugin writes explicit `oauth-model-alias` entries, the auto-injection is suppressed — only your chosen aliases appear in the registry.

### Port 8318 (not 8317)

VibeProxy documentation (Factory/Amp setup guides) references port **8317**. That's the ThinkingProxy layer — it parses `-thinking-NUMBER` model suffixes before forwarding to the actual proxy engine on port **8318** (CLIProxyAPIPlus). Claude Code has its own thinking parameter support, so this plugin connects directly to **8318**, bypassing the ThinkingProxy.

### config.yaml vs merged-config.yaml

- `~/.cli-proxy-api/config.yaml` — your overlay configuration. The skill writes `oauth-model-alias` entries here so VibeProxy knows alias → model mappings.
- `~/.cli-proxy-api/merged-config.yaml` — generated by VibeProxy at launch. Combines your overlay with VibeProxy's built-in defaults. **Not updated until VibeProxy restarts**, which is why the setup skill requires a restart before validation.

### Validation

Each alias is validated by sending a real chat-completions request with the same model name the shell alias sends (the `request_model` value). With `fork: false` (default), this is always alias-based: `cc-gravity-opus46` for base models, `cc-codex-gpt54-med(medium)` for effort models. Original upstream model names are never used — they no longer exist in VibeProxy's registry after alias resolution.

## How it treats your files

The kit writes to two places:

- `~/.cli-proxy-api/config.yaml` — only the `oauth-model-alias` entries it owns (tracked via a persisted state file). Unrelated top-level keys, comments, and formatting are preserved via round-trip YAML.
- `~/.zshrc` — only the marker-delimited managed alias block. Manual `alias cc-*` lines outside the block are detected as conflicts and offered for migration on first run, or left untouched.

Both files are backed up before each write and rolled back together if validation fails.

## Requirements

- macOS with [VibeProxy.app](https://github.com/automazeio/vibeproxy) installed in `/Applications`
- A paid subscription to one or more supported providers (Codex, GitHub Copilot, Antigravity, Gemini, Qwen, or Z.AI GLM) — authenticate all of them before running `/setup-aliases`
- Python 3 with `ruamel.yaml` (auto-installed on first run if missing)
- zsh with `~/.zshrc`
