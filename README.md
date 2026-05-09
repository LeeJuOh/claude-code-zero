# claude-code-zero

> 10 plugins I built. One marketplace to install them.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Claude Code Plugin Marketplace](https://img.shields.io/badge/Claude_Code-Plugin_Marketplace-orange)](https://github.com/LeeJuOh/claude-code-zero)

<div align="center">

<video src="https://github.com/user-attachments/assets/abb70886-6f82-474c-a956-3c89b77c4ae5" width="600" controls></video>

</div>

## Why

Claude Code plugins I built. Marketplace so you can install them in one command.

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
| [codex-advisor](plugins/codex-advisor/README.md) | Claude independently verifies Codex output. Cross-model double-check catches hallucinated citations. |
| [vision-powers](plugins/vision-powers/README.md) | Interactive HTML reports instead of terminal text walls. |
| [skill-creator-pro](plugins/skill-creator-pro/README.md) | Build skills that actually work — design guide, auto-quality loop, benchmarks. |
| [worktree-plus](plugins/worktree-plus/README.md) | Safe parallel branch work with worktrees. Auto-copies config, tracks, cleans up. |
| [notebooklm-connector](plugins/notebooklm-connector/README.md) | Query your NotebookLM notebooks without leaving Claude Code. |
| [claw-mo](plugins/claw-mo/README.md) | Live-rendered markdown preview as Claude writes it. |
| [claw-mux](plugins/claw-mux/README.md) | Claude Code controls multiple terminal panes inside cmux. |
| [toolbox](plugins/toolbox/README.md) | Session handoff docs, WebFetch fallback, secret management — small tools for common gaps. |
| [rubber-duck-tutor](plugins/rubber-duck-tutor/README.md) | Quizzes you on AI-written code to make sure you actually understand it. |
| [vibeproxy-kit](plugins/vibeproxy-kit/README.md) | Route Claude Code requests through Codex, Gemini, and other backends. |

## Plugin Management

```shell
/plugin disable <plugin-name>@claude-code-zero    # Disable
/plugin enable <plugin-name>@claude-code-zero     # Re-enable
/plugin update <plugin-name>@claude-code-zero     # Update to latest
/plugin uninstall <plugin-name>@claude-code-zero  # Uninstall
```

## License

[MIT License](LICENSE)
