# claude-code-zero

> Personal collection of Claude Code plugins and tools

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Claude Code Plugin Marketplace](https://img.shields.io/badge/Claude_Code-Plugin_Marketplace-orange)](https://github.com/LeeJuOh/claude-code-zero)

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
│   └── toolbox/                      # Utility commands plugin
│       └── commands/
│           ├── fetch-sitemap.md
│           └── handoff.md
├── CLAUDE.md                         # Development guidelines
└── LICENSE
```

## License

[MIT License](LICENSE)
