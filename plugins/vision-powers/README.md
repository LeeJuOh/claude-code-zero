# vision-powers

> Analyze Claude Code plugins and visualize development artifacts as interactive HTML reports.

## Why

Claude Code works in text. Plans, diffs, project analysis — all text. When complexity grows, text becomes hard to navigate. You lose the big picture in walls of terminal output.

vision-powers generates interactive HTML reports with Mermaid diagrams, Chart.js dashboards, and a curated design system. Every report is a single self-contained file you can open in any browser, share with teammates, or archive.

## Features

| Skill | Description |
|-------|-------------|
| `agent-extension-visual` | Claude Code plugin deep analysis — 4 specialized agents, security audit, environment fit diagnosis, skill design quality, architecture diagrams. Supports local paths, installed plugins, and GitHub URLs |
| `diff-visual` | Visualize git diffs with architecture diagrams and code review cards |
| `plan-visual` | Review implementation plans with blast radius analysis and risk assessment |
| `project-recap` | Rebuild mental model — recent activity, key decisions, cognitive debt hotspots |
| `fact-check` | Verify document accuracy against the actual codebase and git history |
| `environment-health` | Diagnose Claude Code environment — context budget, description obesity (3-axis), trigger collisions, hook/MCP overhead, plugin components, CLAUDE.md & memory health. 5 graded areas + 4 observational, each threshold cited to official docs |
| `report-manager` | List, open, delete, and search generated reports |

4 specialized agents: `visual-report-writer`, `feature-architect`, `security-auditor`, `coherence-reviewer`

## Install

```shell
/plugin install vision-powers@claude-code-zero
```

## Usage

```
analyze ./plugins/my-plugin          # wiki report (HTML)
analyze ./plugins/my-plugin --format md  # same, but inline markdown
visualize diff HEAD                  # diff report (HTML)
visualize diff HEAD --format md      # inline markdown for PR/chat
review plan docs/my-plan.md          # plan review (HTML)
recap this project                   # project recap (HTML)
fact-check the last report           # verify accuracy
list reports                         # manage reports
```

**Output formats.** Every report skill accepts `--format html` (default) or `--format md`. HTML reports go to `${CLAUDE_PLUGIN_DATA}/reports/` and include zoom, pan, fullscreen, PNG export, and inline feedback. Markdown reports are delivered in the chat response — suitable for pasting into PR descriptions, Slack, or any non-browser context.

**Aesthetic rotation.** Consecutive reports automatically pick different palette and font pairings so the same skill called repeatedly doesn't produce identical-looking output. Rotation state lives at `${CLAUDE_PLUGIN_DATA}/aesthetic-history.json`.

**Visual self-audit.** After generating a report, the workflow renders the HTML to a PNG via headless Chrome and inspects the rendered image before delivery — catching broken Mermaid diagrams, blank Chart.js canvases, and layout breaks that pass static validation. Requires Google Chrome or Chromium in a standard install path, or `CHROME_BIN` set. If Chrome is not found, the audit is skipped and the report is still delivered (static validation alone).

**In-browser feedback.** Every report embeds a per-section feedback UI (✎ button). When the user invokes `/report-manager refine` after leaving notes, the skill harvests those notes — via MCP if `claude-in-chrome` is connected, otherwise by asking the user to click Copy in the feedback bar and paste.

## License

MIT
