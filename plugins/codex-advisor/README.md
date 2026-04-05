# codex-advisor

> Every Codex result gets a second opinion — Claude independently evaluates each finding before you act on it.

## Why

Codex reviews your code and returns findings. But findings include false positives, hallucinated file paths, and missed context. Accepting them uncritically defeats the purpose of a second opinion.

codex-advisor wraps the Official Codex plugin — same review, adversarial, and rescue commands, but every result passes through Claude's independent evaluation. Each finding gets classified as Agreed, Disputed, or Nuanced, backed by evidence from the actual code.

## Quick Start

```shell
# 1. Add Official Codex marketplace + install plugin
/plugin marketplace add openai/codex-plugin-cc
/plugin install codex@openai-codex
/reload-plugins

# 2. Install codex-advisor
/plugin install codex-advisor@claude-code-zero

# 3. Verify setup
/codex-setup

# 4. Configure defaults (optional)
/codex-setup --model gpt-5.4-mini --effort high

# 5. Use
/codex-review                          # review + double-check
/codex-verify docs/plan.md            # verify + PASS/FAIL
```

## Commands

| Command | Wraps | Description |
|---------|-------|-------------|
| `/codex-setup` | `/codex:setup` | Preflight check + model/effort config via config.toml |
| `/codex-review` | `/codex:review` | Code review + double-check |
| `/codex-adversarial` | `/codex:adversarial-review` | Adversarial review + skeptical evaluation |
| `/codex-rescue` | `/codex:rescue` | Task delegation + implementation review |
| `/codex-verify` | — | Document/plan verification, PASS/FAIL verdict |
| `/codex-research` | — | Deep-dive research, cross-model synthesis |

## How It Works

```
You ── /codex-review ──→ resolve-companion.sh ──→ codex-companion.mjs review --wait
                                                          │
                                                    Codex result (verbatim)
                                                          │
                                                  Claude double-check
                                                   (Agree / Dispute / Nuance)
                                                          │
                                                  Evaluated result ──→ You
```

| Skill | Companion subcommand | Codex interaction |
|-------|---------------------|-------------------|
| review, adversarial | `review` / `adversarial-review` | Code diff analysis |
| rescue | `task --write` | Implementation + code changes |
| verify, research | `task --prompt-file` | Document/topic analysis |

## Prerequisites

- [Official Codex plugin](https://github.com/openai/codex-plugin-cc) (`codex@openai-codex`) — **required**
- [OpenAI Codex CLI](https://github.com/openai/codex) — installed and authenticated

## Breaking Changes from v3

- **Official Codex plugin is now required.** v3 called `codex` CLI directly; v4 calls the Official companion script (`codex-companion.mjs`) directly for job lifecycle, tracking, and resume.
- **Hooks removed.** Post-commit review suggestion, task-completed verification, stop-review-gate — all removed. Official plugin provides its own review gate (`/codex:setup --enable-review-gate`).
- **Config system changed.** v3 used `${CLAUDE_PLUGIN_DATA}/config.json`; v4 manages `~/.codex/config.toml` via `/codex-setup`.
- **New commands.** `/codex-adversarial` and `/codex-rescue` are new. v3's adversarial mode was part of `/codex-review`.

## License

MIT
