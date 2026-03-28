# claude-code-zero

> A curated marketplace of Claude Code plugins — visual reports, git worktree enhancements, NotebookLM integration, skill creation tools, cross-model code analysis, and developer utilities.

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

| Plugin | Description |
|--------|-------------|
| [vision-powers](plugins/vision-powers/README.md) | Interactive HTML reports — diffs, plans, project recaps, and wiki analysis with Mermaid diagrams and Chart.js |
| [worktree-plus](plugins/worktree-plus/README.md) | Native git worktree behavior with gitignored file support (`.worktreeinclude` / `.worktreelink`) |
| [toolbox](plugins/toolbox/README.md) | Developer utilities — sitemap extraction, Gemini web fetch, handoff docs, config audit, secret management |
| [notebooklm-connector](plugins/notebooklm-connector/README.md) | Query Google NotebookLM notebooks from Claude Code — source-grounded answers via Chrome automation |
| [skill-creator-pro](plugins/skill-creator-pro/README.md) | Create, test, and optimize Claude Code skills with category-aware design and autonomous benchmarking |
| [rubber-duck-tutor](plugins/rubber-duck-tutor/README.md) | Protect your coding skills — interactive comprehension exercises after plans, code, and commits |
| [e2e-test-runner](plugins/e2e-test-runner/README.md) | Browser tests in plain English — natural language steps with video recording and visual regression |
| [codex-advisor](plugins/codex-advisor/README.md) | Cross-model code analysis — OpenAI Codex review and verification with Claude's critical evaluation |

## Plugin Management

```shell
/plugin disable <plugin-name>@claude-code-zero    # Disable
/plugin enable <plugin-name>@claude-code-zero     # Re-enable
/plugin update <plugin-name>@claude-code-zero     # Update to latest
/plugin uninstall <plugin-name>@claude-code-zero  # Uninstall
```

## License

[MIT License](LICENSE)
