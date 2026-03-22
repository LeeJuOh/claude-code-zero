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

## Plugin Catalog

| Plugin | Version | Description | Details |
|--------|---------|-------------|---------|
| vision-powers | v2.12.0 | Visual report generation suite with interactive HTML reports | [README](plugins/vision-powers/README.md) |
| worktree-plus | v2.4.3 | Enhanced git worktree with selective copy/symlink for gitignored files | [README](plugins/worktree-plus/README.md) |
| toolbox | v1.9.0 | Developer utility skills — sitemap extraction, web fetching, handoff, health audit, secret management | [README](plugins/toolbox/README.md) |
| notebooklm-connector | v1.3.1 | Query NotebookLM notebooks directly from Claude Code via Chrome automation | [README](plugins/notebooklm-connector/README.md) |
| skill-creator-pro | v1.2.0 | Create, test, benchmark, and optimize Claude Code skills | [README](plugins/skill-creator-pro/README.md) |
| codex-advisor | v0.1.0 | OpenAI Codex CLI integration for cross-model code analysis | — |

**6 plugins, 20 skills, 5 agents**

## Plugins

### vision-powers

Visual report generation suite for Claude Code — self-contained interactive HTML reports with Mermaid diagrams, Chart.js dashboards, and a curated design system.

| Skill | Description |
|-------|-------------|
| `agent-extension-visualizing` | Analyze plugins/skills/hooks and generate HTML wiki reports with security audit |
| `diff-visual` | Visualize git diffs as interactive reports with architecture diagrams and code review cards |
| `plan-visual` | Review implementation plans with blast radius analysis and risk assessment |
| `project-recap` | Rebuild mental model of a project — recent activity, key decisions, cognitive debt hotspots |
| `fact-check` | Verify document accuracy against the actual codebase and git history |
| `report-manager` | List, open, delete, and search generated reports |

4 specialized agents: `visual-report-writer`, `feature-architect`, `security-auditor`, `coherence-reviewer`

```shell
/plugin install vision-powers@claude-code-zero
```

[View full documentation](plugins/vision-powers/README.md)

---

### worktree-plus

Enhanced git worktree for Claude Code — native `git worktree` behavior with custom branch prefix, remote branch tracking, and selective copy/symlink for gitignored files.

| Feature | Default `claude -w` | worktree-plus |
|---------|---------------------|---------------|
| Branch base | Default remote branch | HEAD (current commit) |
| Remote tracking | None | `--guess-remote` support |
| Branch prefix | `worktree-` (fixed) | Configurable via env var |
| Gitignored files | Not copied | `.worktreeinclude` copy / `.worktreelink` symlink |

**Prerequisites:** jq (`brew install jq`)

```shell
/plugin install worktree-plus@claude-code-zero
```

[View full documentation](plugins/worktree-plus/README.md)

---

### toolbox

Developer utility skills for Claude Code.

| Skill | Description |
|-------|-------------|
| `fetch-sitemap` | Extract URLs from XML sitemaps with optional regex filtering |
| `gemini-fetch` | Fetch web content via Gemini CLI when WebFetch is blocked (403, bot-blocked sites) |
| `handoff` | Write or update a handoff document for the next agent session |
| `health` | Audit Claude Code config drift and collaboration issues |
| `secret-setup` | Extract hardcoded secrets into a gitignored env file with auto-loading hook |

```shell
/plugin install toolbox@claude-code-zero
```

[View full documentation](plugins/toolbox/README.md)

---

### notebooklm-connector

Query Google NotebookLM notebooks directly from Claude Code — source-grounded answers without leaving the terminal.

- **Source-grounded answers** — responses come only from your uploaded documents, not training data
- **Automatic follow-up** — coverage analysis detects gaps and sends additional queries (up to 3 rounds)
- **Smart Add** — auto-extracts notebook title, topics, and description from URL

**Prerequisites:** Chrome or Edge, [Claude in Chrome extension](https://chromewebstore.google.com/detail/claude/fcoeoabgfenejglbffodgkkbkcdhcgfn) v1.0.36+, Claude Code CLI v2.0.73+, paid Claude plan

```shell
/plugin install notebooklm-connector@claude-code-zero
```

[View full documentation](plugins/notebooklm-connector/README.md)

---

### skill-creator-pro

Create, test, measure, and iteratively improve Claude Code skills with category-aware design and automated benchmarking.

| Skill | Description |
|-------|-------------|
| `skill-creator-pro` | Full skill creation workflow: Understand, Design, Test, Improve, Polish |
| `auto-optimize` | Autonomous optimization — runs a skill dozens of times, scores with binary evals, mutates the prompt, keeps only improvements |

Built on Anthropic's official [skill-creator](https://github.com/anthropics/claude-code-plugins/tree/main/plugins/skill-creator) with added 9-category system, gotchas-driven design, eval writing guide, and quality gate checklist.

```shell
/plugin install skill-creator-pro@claude-code-zero
```

[View full documentation](plugins/skill-creator-pro/README.md)

---

### codex-advisor

Invoke OpenAI Codex CLI for code analysis with Claude's critical evaluation — get a second opinion from a different AI model.

| Skill | Description |
|-------|-------------|
| `codex` | Run Codex with any custom prompt |
| `codex-review` | Code review |
| `codex-security` | Security audit |
| `codex-perf` | Performance analysis |
| `codex-arch` | Architecture review |

**Prerequisites:** [OpenAI Codex CLI](https://github.com/openai/codex) installed and configured

```shell
/plugin install codex-advisor@claude-code-zero
```

---

## Plugin Management

```shell
/plugin disable <plugin-name>@claude-code-zero    # Disable
/plugin enable <plugin-name>@claude-code-zero     # Re-enable
/plugin update <plugin-name>@claude-code-zero     # Update to latest
/plugin uninstall <plugin-name>@claude-code-zero  # Uninstall
```

## License

[MIT License](LICENSE)
