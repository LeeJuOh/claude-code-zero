# Vision Powers

Visual report generation suite for Claude Code: plugin wiki analysis, git diff visualization, implementation plan review, project recap, and fact-checking. All outputs are self-contained interactive HTML reports with responsive navigation, Mermaid diagrams, Chart.js dashboards, and a curated design system.

## Skills

### agent-extension-visual

Analyze agent extensions (plugins, skills, commands, hooks, agents, MCP servers) and generate HTML wiki reports with security audit and plugin profiles.

```
analyze ./plugins/my-plugin
analyze github.com/owner/repo
analyze ./plugins/my-plugin --format md
security audit ./plugins/my-plugin
overview ./plugins/my-plugin
```

### diff-visual

Visualize git diffs as interactive HTML reports with architecture diagrams, KPI dashboards, code review cards, and side-by-side comparisons.

```
visualize diff HEAD
review changes on feature/auth
visualize PR #123
diff review abc1234
```

### plan-visual

Review implementation plans as interactive HTML reports with architecture diagrams, blast radius analysis, risk assessment, and gap detection.

```
review plan ~/.claude/plans/my-plan.md
evaluate plan ./docs/auth-redesign.md
```

### project-recap

Generate a visual project recap — rebuild mental model of a project's current state, recent activity, key decisions, and cognitive debt hotspots.

```
recap this project
project recap 30d
project snapshot 3m --lang ko
catch me up on this project
```

### fact-check

Verify factual accuracy of a document against the actual codebase and git history. Corrects inaccuracies in place and adds a verification summary.

```
fact-check ${CLAUDE_PLUGIN_DATA}/reports/my-report.html
verify this report
validate the last report
```

### report-manager

Manage vision-powers reports: list, open in browser, delete, and search by name or content.

```
list reports
open the latest report
delete reports --type diff-visual
delete reports --before 30d
search reports auth
```

## Report Location

All reports are saved to:
```
${CLAUDE_PLUGIN_DATA}/reports/
```

## Architecture

```mermaid
graph TD
    S1["agent-extension-visual<br/>(orchestrator)"] -->|delegates| A1["feature-architect"]
    S1 -->|delegates| A2["security-auditor"]
    S1 -->|delegates<br/>HTML mode| A4["visual-report-writer"]

    S2["diff-visual<br/>(orchestrator)"] -->|delegates<br/>HTML| A4
    S3["plan-visual<br/>(orchestrator)"] -->|delegates<br/>HTML| A4
    S4["project-recap<br/>(orchestrator)"] -->|delegates<br/>HTML| A4

    S5["fact-check<br/>(standalone)"]
    S6["report-manager<br/>(standalone)"] -->|reads| R["reports/"]

    A4 -->|reads| DS["design-system/"]
    A4 -->|reads| SS1["agent-extension-visual<br/>section-structure"]
    A4 -->|reads| SS2["diff-visual<br/>section-structure"]
    A4 -->|reads| SS3["plan-visual<br/>section-structure"]
    A4 -->|reads| SS4["project-recap<br/>section-structure"]
```

### Shared Design System

All report generators share a modular design system (`references/design-system/`):

| File | Content |
|------|---------|
| `css-patterns.md` | Theme variables, depth tiers, cards, backgrounds, animations |
| `font-system.md` | 12 curated font pairings with rotation rules |
| `mermaid-patterns.md` | Mermaid theming, zoom controls, fullscreen |
| `navigation.md` | Responsive sidebar TOC + mobile horizontal bar |
| `libraries.md` | CDN references (Mermaid, Chart.js, Google Fonts) |
| `anti-slop-rules.md` | Forbidden patterns, approved aesthetics, quality checklist |

## License

MIT
