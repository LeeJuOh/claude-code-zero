# claude-code-zero

> A curated marketplace of Claude Code plugins — interactive HTML reports, native git worktrees, NotebookLM queries, skill creation & optimization, cross-model review with Codex, rubber-duck comprehension checks, multi-backend routing, and everyday developer utilities.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Claude Code Plugin Marketplace](https://img.shields.io/badge/Claude_Code-Plugin_Marketplace-orange)](https://github.com/LeeJuOh/claude-code-zero)

<div align="center">

<video src="https://github.com/user-attachments/assets/abb70886-6f82-474c-a956-3c89b77c4ae5" width="600" controls></video>

</div>

## Why

Claude Code sessions evaporate when you close them. Plans live in your head. Reviews need 47 files of context. Plugin audits, diff visualizations, NotebookLM queries, worktrees, skill iteration — manual every time, forgotten by the next session.

claude-code-zero packages the workflows that survive across sessions. Each plugin solves one friction. Each installs in one command.

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

| Plugin | What it does |
|--------|--------------|
| [vision-powers](plugins/vision-powers/README.md) | Interactive HTML reports for plugin audits, diff/plan reviews, project recaps, environment health. Markdown export, multi-language, in-browser refine loop, fact-check against git. |
| [worktree-plus](plugins/worktree-plus/README.md) | Drop-in worktree upgrade — HEAD-based branches, remote tracking, gitignored-file copy/symlink, safe cleanup. Configurable via `git config`. Covers `claude -w`, `EnterWorktree`, subagent isolation. |
| [toolbox](plugins/toolbox/README.md) | Friction-fixer skills: Gemini fallback fetch when WebFetch blocks, sitemap discovery, handoff docs, secret extraction with SessionStart hook, reference repo sync. |
| [notebooklm-connector](plugins/notebooklm-connector/README.md) | Query Google NotebookLM notebooks from Claude Code via Chrome automation. Source-grounded with citations, auto-retry on partial answers. Requires Claude in Chrome. |
| [skill-creator-pro](plugins/skill-creator-pro/README.md) | Build *good* skills, not just any skills. 9-category design guide, gotchas-first templates, benchmark viewer, description-trigger optimizer, autonomous output-quality loop. |
| [codex-advisor](plugins/codex-advisor/README.md) | Wrap every Codex call with Claude's independent double-check. Findings classified Agreed / Disputed / Nuanced / False Positive / Uncited — catches hallucinated file:line citations. Reviews, rescue, plan verify, research. |
| [rubber-duck-tutor](plugins/rubber-duck-tutor/README.md) | Stay sharp while coding with AI. Duck quizzes you on plans, diffs, PRs — one question, then silence. 5 modes + rate-limited auto-prompts at plan creation, spec writes, PR/MR, git commands. |
| [vibeproxy-kit](plugins/vibeproxy-kit/README.md) | macOS alias manager for [VibeProxy](https://github.com/automazeio/vibeproxy). Discovers authenticated backends (Codex, Copilot, Antigravity, Gemini, Qwen, Z.AI GLM), writes `cc-*` aliases without clobbering manual edits. ⚠️ May violate provider ToS. |
| [claw-mo](plugins/claw-mo/README.md) | Markdown live preview via [mo](https://github.com/k1LoW/mo) — Mermaid, KaTeX, Shiki rendering. Per-project tabs, deep-link, stdin pipe, full-text search, autosync-on-write for Claude-created docs. |
| [claw-mux](plugins/claw-mux/README.md) | Terminal topology control inside [cmux](https://cmux.dev) — pane-to-pane I/O, dev-server + log tailing, spawn child Claude Code with `wait-for` completion. WKWebView browser automation, markdown panel, sidebar status. |

## Plugin Management

```shell
/plugin disable <plugin-name>@claude-code-zero    # Disable
/plugin enable <plugin-name>@claude-code-zero     # Re-enable
/plugin update <plugin-name>@claude-code-zero     # Update to latest
/plugin uninstall <plugin-name>@claude-code-zero  # Uninstall
```

## License

[MIT License](LICENSE)
