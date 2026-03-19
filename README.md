# claude-code-zero

> Personal collection of Claude Code plugins and tools

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

## Plugin Catalog

| Plugin | Version | Description | Details |
|--------|---------|-------------|---------|
| notebooklm-connector | v1.0.2 | Manage and query NotebookLM notebooks via Chrome automation | [README](plugins/notebooklm-connector/README.md) |
| toolbox | v1.1.1 | Personal utility commands and tools | [README](plugins/toolbox/README.md) |
| vision-powers | v2.2.0 | Visual report generation suite: wiki analysis, diff review, plan review, project recap, fact-checking, and report management | [README](plugins/vision-powers/README.md) |
| worktree-plus | v2.0.0 | Enhanced git worktree: custom branch prefix, remote branch tracking, selective copy for gitignored files | [README](plugins/worktree-plus/README.md) |

## Plugins

### notebooklm-connector

Query your Google NotebookLM notebooks directly from Claude Code — source-grounded, citation-backed answers without leaving the terminal.

- **Source-grounded answers** — responses come only from your uploaded documents, not training data
- **Citation-backed** — every answer includes quoted passages and source references
- **Automatic follow-up** — coverage analysis detects gaps and sends additional queries (up to 3 rounds)
- **Smart Add** — auto-extracts notebook title, topics, and description from URL
- **Tab reuse** — follow-up queries reuse the existing Chrome tab for efficiency

**Prerequisites:** Google Chrome or Edge, [Claude in Chrome extension](https://chromewebstore.google.com/detail/claude/fcoeoabgfenejglbffodgkkbkcdhcgfn) v1.0.36+, Claude Code CLI v2.0.73+, paid Claude plan

```shell
/plugin install notebooklm-connector@claude-code-zero
```

[View full documentation](plugins/notebooklm-connector/README.md)

---

### toolbox

Personal utility commands and tools for Claude Code.

| Command | Description |
|---------|-------------|
| `/fetch-sitemap` | Extract URLs from an XML sitemap with optional regex filtering |
| `/handoff` | Write or update a handoff document for the next agent to continue work |

```shell
/plugin install toolbox@claude-code-zero
```

[View full documentation](plugins/toolbox/README.md)

### vision-powers

Visual report generation suite for Claude Code — plugin wiki analysis, git diff visualization, implementation plan review, project recap, and fact-checking. All outputs are self-contained interactive HTML reports with responsive navigation, Mermaid diagrams, Chart.js dashboards, and a curated design system.

| Skill | Description |
|-------|-------------|
| `agent-extension-visual` | Analyze agent extensions and generate HTML wiki reports with security audit |
| `diff-visual` | Visualize git diffs as interactive HTML reports with architecture diagrams and KPI dashboards |
| `plan-visual` | Review implementation plans with blast radius analysis and risk assessment |
| `project-recap` | Generate a visual project recap with recent activity, key decisions, and cognitive debt hotspots |
| `fact-check` | Verify factual accuracy of a document against the actual codebase and git history |
| `report-manager` | Manage reports: list, open in browser, delete, and search |

```shell
/plugin install vision-powers@claude-code-zero
```

[View full documentation](plugins/vision-powers/README.md)

---

### worktree-plus

Enhanced git worktree for Claude Code — adds selective copy for gitignored files, remote branch tracking via `guessRemote`, and custom branch prefix.

- **`.worktreeinclude`** — specify which gitignored files (`.env`, configs) and directories to copy into worktrees
- **Remote branch tracking** — controlled by `git config worktree.guessRemote` (default: `true`)
- **Custom branch prefix** — set `WORKTREE_BRANCH_PREFIX` env var to customize branch naming

**Prerequisites:** jq (`brew install jq`)

```shell
/plugin install worktree-plus@claude-code-zero
```

[View full documentation](plugins/worktree-plus/README.md)

---

## Plugin Management

```shell
/plugin disable <plugin-name>@claude-code-zero    # Disable
/plugin enable <plugin-name>@claude-code-zero     # Re-enable
/plugin update <plugin-name>@claude-code-zero     # Update to latest
/plugin uninstall <plugin-name>@claude-code-zero  # Uninstall
```

## Repository Structure

```
.
├── .claude-plugin/
│   └── marketplace.json              # Plugin registry
├── plugins/
│   ├── notebooklm-connector/        # NotebookLM integration plugin
│   │   ├── skills/notebooklm-manager/
│   │   ├── agents/chrome-mcp-query.md
│   │   └── hooks/hooks.json
│   ├── toolbox/                      # Utility commands plugin
│   │   └── commands/
│   │       ├── fetch-sitemap.md
│   │       └── handoff.md
│   ├── vision-powers/               # Visual report generation suite
│   │   ├── skills/
│   │   │   ├── agent-extension-visual/
│   │   │   ├── diff-visual/
│   │   │   ├── plan-visual/
│   │   │   ├── project-recap/
│   │   │   ├── fact-check/
│   │   │   └── report-manager/
│   │   ├── agents/
│   │   └── references/design-system/
│   └── worktree-plus/               # Enhanced git worktree plugin
│       └── hooks/
├── CLAUDE.md                         # Development guidelines
└── LICENSE
```

## License

[MIT License](LICENSE)
