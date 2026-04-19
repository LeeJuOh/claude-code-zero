# vision-powers

> Analyze Claude Code plugins and visualize development artifacts as interactive HTML reports.

## Why

Claude Code works in text. Plans, diffs, project analysis — all text. When complexity grows, text becomes hard to navigate. You lose the big picture in walls of terminal output.

vision-powers generates interactive HTML reports with Mermaid diagrams, Chart.js dashboards, and a curated design system. Every report is a single self-contained file you can open in any browser, share with teammates, or archive.

## Features

| Skill | Description |
|-------|-------------|
| `plugin-visual` | Claude Code plugin deep analysis — 4 specialized agents, security audit, environment fit diagnosis, skill design quality, architecture diagrams. Supports local paths, installed plugins, and GitHub URLs |
| `diff-visual` | Visualize git diffs as interactive HTML reports with architecture diagrams, file map, classification heatmap, dependency shift, and hot spot analysis |
| `doc-visual` | Visualize any markdown document (research, spec, RFC, ADR, design doc) as a diagram-enhanced HTML or markdown report. Auto-selects from 13 Mermaid diagram types based on section intent |
| `fact-check` | Verify document accuracy against the actual codebase and git history |
| `context-health-visual` | Diagnose Claude Code context and environment health — context budget, description obesity (3-axis), trigger collisions, hook/MCP overhead, skill security scan (prompt injection, data exfil, destructive, credentials, obfuscation, safety override), hook schema validation, plugin components, CLAUDE.md & memory health. 6 graded areas + 5 observational, each threshold cited to official docs |
| `report-manager` | List, open, delete, and search generated reports |

**Agents.** `visual-report-writer` (HTML report assembly), `feature-architect` (plugin component analysis), `security-auditor` (permission and risk audit), `coherence-reviewer` (narrative consistency check), `section-analyzer` (doc-visual section intent classification), `diagram-generator` (Mermaid diagram generation per section).

## Install

```shell
/plugin install vision-powers@claude-code-zero
```

## Usage

```
analyze ./plugins/my-plugin                               # full wiki (HTML)
analyze claude-code-zero/my-plugin                        # installed plugin by name
analyze https://github.com/org/repo/tree/main/plugins/x   # GitHub subpath URL
analyze ./plugins/my-plugin --mode security               # security-only pass
analyze ./plugins/my-plugin --mode overview               # lightweight overview
visualize diff HEAD                                       # diff report (HTML)
visualize diff HEAD --format md                           # inline markdown for PR/chat
doc-visual ./docs/research/xxx.md                         # HTML report
doc-visual ./docs/spec.md --format md                     # inline markdown
diagnose environment --paste-context                      # health report with /context paste
fact-check the last report                                # verify accuracy
list reports                                              # manage reports
refine section 3 of the last report                       # targeted re-render from feedback
analyze ./plugins/my-plugin --lang ko                     # output in Korean (ISO code)
```

**Output formats.** Every report skill accepts `--format html` (default) or `--format md`. HTML reports go to `${CLAUDE_PLUGIN_DATA}/reports/` and include zoom, pan, fullscreen, PNG export, and inline feedback. Markdown reports are delivered in the chat response — suitable for pasting into PR descriptions, Slack, or any non-browser context.

**Multi-language output.** Every visual skill accepts `--lang <ISO code>` (e.g., `ko`, `ja`, `es`). Without the flag, output language is detected from the user message.

**Scope breadth.** `plugin-visual` resolves local paths, installed plugin names (via cache lookup), GitHub repository root URLs, and GitHub `/tree/<branch>/<subpath>` URLs — a single skill covers "my local plugin", "a plugin I installed from the marketplace", and "that monorepo folder on GitHub".

**Analysis modes.** `plugin-visual` supports `--mode analyze` (default, full), `--mode security` (security-only), and `--mode overview` (lightweight). Each mode runs a short Intent Check to confirm audience and focus before generating.

**Refinement loop.** After reading a report, leave section-level notes via the in-page ✎ button, then run `/report-manager refine` to re-generate only the sections you flagged — feedback is harvested via MCP when `claude-in-chrome` is connected, otherwise by paste.

**Aesthetic rotation.** Consecutive reports automatically pick different palette and font pairings so the same skill called repeatedly doesn't produce identical-looking output. Rotation state lives at `${CLAUDE_PLUGIN_DATA}/aesthetic-history.json`.

**Visual self-audit.** After generating a report, the workflow runs a best-effort visual check: it renders the HTML to a PNG via headless Chrome and inspects the rendered image — catching broken Mermaid diagrams, blank Chart.js canvases, and layout breaks that pass static validation. Static validation is always mandatory; the visual pass is skipped (non-blocking) when Chrome or Chromium isn't on a standard install path and `CHROME_BIN` isn't set.

**In-browser feedback.** Every report embeds a per-section feedback UI (✎ button). When the user invokes `/report-manager refine` after leaving notes, the skill harvests those notes — via MCP if `claude-in-chrome` is connected, otherwise by asking the user to click Copy in the feedback bar and paste.

## License

MIT
