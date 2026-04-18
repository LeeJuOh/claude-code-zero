# claude-code-zero

> A curated marketplace of Claude Code plugins — interactive HTML reports, native git worktrees, NotebookLM queries, skill creation & optimization, cross-model review with Codex, rubber-duck comprehension checks, multi-backend routing, and everyday developer utilities.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Claude Code Plugin Marketplace](https://img.shields.io/badge/Claude_Code-Plugin_Marketplace-orange)](https://github.com/LeeJuOh/claude-code-zero)

<div align="center">

<video src="https://github.com/user-attachments/assets/abb70886-6f82-474c-a956-3c89b77c4ae5" width="600" controls></video>

</div>

## Quick Start

### 1. Add the marketplace

```shell
/plugin marketplace add LeeJuOh/claude-code-zero
```

### 2. Install a plugin

```shell
/plugin install <plugin-name>@claude-code-zero
```

### 3. Verify

Run `/plugin` and check the **Installed** tab.

## Plugins

### Release-ready

| Plugin | Description |
|--------|-------------|
| [vision-powers](plugins/vision-powers/README.md) | Turn Claude Code sessions into interactive HTML dashboards — plugin audits (local paths, installed plugins, or GitHub subpath URLs), diff and plan reviews, project recaps, environment-health diagnostics, and fact-checking against git history. Every report ships `--format md` for PR & chat contexts, multi-language output via `--lang`, headless-Chrome visual self-audit, aesthetic rotation, and in-browser per-section feedback that feeds a `refine` loop |
| [worktree-plus](plugins/worktree-plus/README.md) | Drop-in upgrade for Claude Code worktrees — branches from HEAD, auto-tracks matching remote branches, path/prefix configurable via `git config`. Copies or symlinks gitignored files (`.env`, `node_modules/`) via `.worktreeinclude` / `.worktreelink`, blocks cleanup when work is uncommitted or unpushed, reuses existing worktrees on re-entry, and ships a `/worktree-config` skill for conversational setup. Covers `claude -w`, `EnterWorktree`, and subagent `isolation: worktree` |
| [toolbox](plugins/toolbox/README.md) | Six small skills that patch Claude Code's friction points — Gemini-powered fetch that auto-fires when WebFetch is blocked, XML sitemap auto-discovery with regex filter, resumption-ready handoff docs, tiered six-layer config & skill-security audit, one-shot secret extraction into gitignored env + SessionStart hook, and pull-all-repos reference sync |
| [notebooklm-connector](plugins/notebooklm-connector/README.md) | Query your Google NotebookLM notebooks from Claude Code via Chrome automation. Answers stay source-grounded with citations; the skill auto-detects partial answers and re-queries (configurable, default 3 rounds) to fill gaps. Add, list, search, enable/disable, archive notebooks by name. Requires Claude in Chrome extension |
| [skill-creator-pro](plugins/skill-creator-pro/README.md) | The official skill-creator shows *how* to build skills — this one helps you build **good** ones. Ships a 9-category design guide, gotchas-first templates, a parallel baseline/with-skill benchmark viewer, a description-trigger optimizer, and an autonomous output-quality loop so a 70%-working skill can be measured, diagnosed, and pushed higher |
| [codex-advisor](plugins/codex-advisor/README.md) | Wrap every Codex call with Claude's independent double-check. Reviews, rescue, plan verification, and research run in the background and return findings classified as Agreed / Disputed / Nuanced / False Positive / Uncited — so hallucinated file:line citations get caught before you act. Documents stay out of Claude's context until after Codex returns. 9 skills; works even with the Official Codex plugin hidden |
| [rubber-duck-tutor](plugins/rubber-duck-tutor/README.md) | Stay sharp while coding with AI. The duck quizzes you on plans, diffs, and PRs — one question, then silence. Five modes (design, plan, verify, review, orient) plus rate-limited auto-prompts at plan creation, spec writes, PR/MR, and git commands. If you can't explain it to a duck, you don't understand it |
| [vibeproxy-kit](plugins/vibeproxy-kit/README.md) | macOS alias manager for [VibeProxy](https://github.com/automazeio/vibeproxy) — discovers which backends you've authenticated (Codex, Copilot, Antigravity, Gemini, Qwen, Z.AI GLM), lets you pick models and reasoning-effort levels, writes `cc-*` aliases to `~/.zshrc` and `config.yaml` without touching your manual edits, and rolls both files back together if validation fails. ⚠️ Third-party routing may violate provider ToS |

### Lab (experimental)

| Plugin | Description |
|--------|-------------|
| [claw-mo](plugins/claw-mo/README.md) | Markdown live preview via [mo](https://github.com/k1LoW/mo) — Mermaid, KaTeX, and Shiki rendering that `cmux markdown open` can't do. One command per project: tabs grouped by directory, deep-link to any file, pipe generated markdown in (`some-tool \| /claw-mo-open -`), or open a file with zero setup. Full-text search across watched docs, a cross-project status dashboard, and restart-by-default so `fsnotify` drops never silently hide new files |
| [claw-mux](plugins/claw-mux/README.md) | Full terminal topology control inside [cmux](https://cmux.dev) — send commands to other panes and read their output, run a dev server while tailing logs next door, or spawn a second Claude Code instance and feed it tasks with `wait-for` / content-poll completion detection. Snapshot/ref browser automation in cmux's embedded WKWebView (no Chrome extension), a live-reload markdown panel, and sidebar status pills, progress bars, and leveled logs |

## Plugin Management

```shell
/plugin disable <plugin-name>@claude-code-zero    # Disable
/plugin enable <plugin-name>@claude-code-zero     # Re-enable
/plugin update <plugin-name>@claude-code-zero     # Update to latest
/plugin uninstall <plugin-name>@claude-code-zero  # Uninstall
```

## License

[MIT License](LICENSE)
