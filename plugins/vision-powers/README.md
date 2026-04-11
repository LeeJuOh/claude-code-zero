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
| `environment-health` | Diagnose Claude Code environment — context budget, description obesity, trigger collisions, hook/MCP overhead, CLAUDE.md & memory health, with actionable levers |
| `report-manager` | List, open, delete, and search generated reports |

4 specialized agents: `visual-report-writer`, `feature-architect`, `security-auditor`, `coherence-reviewer`

## Install

```shell
/plugin install vision-powers@claude-code-zero
```

## Usage

```
analyze ./plugins/my-plugin          # wiki report
visualize diff HEAD                  # diff report
review plan docs/my-plan.md          # plan review
recap this project                   # project recap
fact-check the last report           # verify accuracy
list reports                         # manage reports
```

Reports are saved to `${CLAUDE_PLUGIN_DATA}/reports/` and include zoom, pan, fullscreen, PNG export, and inline feedback.

## License

MIT
