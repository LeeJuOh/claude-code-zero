# vision-powers

> Analyze Claude Code plugins and visualize development artifacts as interactive HTML reports.

## Why

Claude Code is strong at analysis but flat at expression. Whether terminal text or markdown, relationships, hierarchies, and proportions are described in words — never shown. You read that A depends on B depends on C, but past a handful of nodes, no amount of prose makes the shape visible.

vision-powers gives Claude visual expression. Diagrams show relationships, structured sections make output navigable, and both HTML and markdown outputs improve on Claude's bare output. HTML goes further — interactive, spatial, shareable as a single file. Markdown fits where browsers can't: PR descriptions, chat threads, headless CI.

The thesis behind this plugin echoes what Thariq Shihipar (Anthropic, Claude Code team) articulated in [The unreasonable effectiveness of HTML](https://thariqs.github.io/html-effectiveness/) — HTML preserves the spatial, structural, and interactive information that plain text flattens.

## Features

| Skill | Description |
|-------|-------------|
| `plugin-visual` | Claude Code plugin deep analysis — 4 specialized agents, security audit, environment fit diagnosis, skill design quality, architecture diagrams. Supports local paths, installed plugins, and GitHub URLs |
| `diff-visual` | Visualize git diffs as interactive HTML reports — now showing the **actual changed code** as side-by-side split-diff (syntax-highlighted, build-time grounded so it's the real lines, not a paraphrase), plus a file map with change-flags, architecture diagrams, classification heatmap, dependency shift, and hot spot analysis |
| `doc-visual` | Visualize any markdown document (research, spec, RFC, ADR, design doc) as a diagram-enhanced HTML or markdown report with Mermaid diagrams matched to section intent |
| `fact-check` | Verify document accuracy against the actual codebase and git history — corrects claims in place and, when the target is a published Artifact, republishes the fix to the same claude.ai link |
| `context-health-visual` | Diagnose Claude Code context and environment health — context budget, description obesity (3-axis), trigger collisions, hook/MCP overhead, skill security scan (prompt injection, data exfil, destructive, credentials, obfuscation, safety override), hook schema validation, plugin components, CLAUDE.md & memory health. 6 graded areas + 5 observational, each threshold cited to official docs |
| `report-manager` | List, open, delete, search, and refine generated reports — surfaces stored Artifact URLs and republishes a refined report to the same claude.ai link, even across sessions |

## Install

```shell
/plugin install vision-powers@claude-code-zero
```

## Usage

```
analyze ./plugins/my-plugin                               # full wiki → claude.ai Artifact (default)
analyze ./plugins/my-plugin --local                       # HTML → local design-system wiki + Mermaid
analyze claude-code-zero/my-plugin                        # installed plugin by name
analyze https://github.com/org/repo/tree/main/plugins/x   # GitHub subpath URL
analyze ./plugins/my-plugin --mode security               # security-only pass
analyze ./plugins/my-plugin --mode overview               # lightweight overview
visualize diff HEAD                                       # HTML → claude.ai Artifact (default)
visualize diff HEAD --local                               # HTML → local design-system dashboard + Mermaid
visualize diff HEAD --format md                           # inline markdown for PR/chat
doc-visual ./docs/research/xxx.md                         # HTML → claude.ai Artifact (default)
doc-visual ./docs/research/xxx.md --local                 # HTML → local design-system file + Mermaid
doc-visual ./docs/spec.md --format md                     # inline markdown
diagnose environment                                      # HTML → claude.ai Artifact (default; offers /context paste)
diagnose environment --local                             # HTML → local design-system dashboard + Mermaid
fact-check the last report                                # verify accuracy
list reports                                              # manage reports
refine section 3 of the last report                       # targeted re-render from feedback
analyze ./plugins/my-plugin --lang ko                     # output in Korean (ISO code)
```

**Output formats.** Every report skill accepts `--format html` (default) or `--format md`. HTML reports go to `${CLAUDE_PLUGIN_DATA}/reports/` and include zoom, pan, fullscreen, PNG export, and inline feedback. Markdown reports are delivered in the chat response — suitable for pasting into PR descriptions, Slack, or any non-browser context — and a copy is saved to the same reports directory, so `report-manager` can list, search, and refine them later.

**Artifact publishing — the default for HTML.** On a capable account, `doc-visual`, `diff-visual`, `plugin-visual` (`analyze` mode), and `context-health-visual` publish HTML reports as a claude.ai link out of the box — no flag. Add `--local` (or say "keep it local") to get a local design-system + Mermaid file instead — reach for it when you need an analytical chart type the Artifact channel degrades to a table, or Mermaid's zoom/pan/PNG export:

| Format | Channel | Rendering |
|---|---|---|
| **html** — capable account | **claude.ai Artifact** (default) | built-in Artifact design |
| **html** — `--local` / non-capable | local file | our design-system + Mermaid |
| **md** | chat/PR text + saved copy | design-system + Mermaid fences |

Design on the Artifact channel is delegated to Claude's built-in Artifact renderer, so the look differs from local reports. Markdown stays local — claude.ai's renderer can't draw Mermaid, so `--format md` is delivered in chat and saved, never published (the lone exception: `doc-visual --format md --artifact` will publish markdown as-is, with diagrams left as fenced code). A non-capable session (API-key/CI/org policy) auto-degrades to the local file with a one-line notice. Sharing a claude.ai link is limited to members of your Team/Enterprise organization; on Pro/Max the URL is private to you, and getting a report to someone outside your organization means the local `.html` file (`--local`). Want local as your standing default? Tell Claude to set `artifact` to `false` in config — a `--artifact` flag or natural-language request for one run still overrides it.

**Multi-language output.** Every visual skill accepts `--lang <ISO code>` (e.g., `ko`, `ja`, `es`). Without the flag, output language is detected from the user message.

**Scope breadth.** `plugin-visual` resolves local paths, installed plugin names (via cache lookup), GitHub repository root URLs, and GitHub `/tree/<branch>/<subpath>` URLs — a single skill covers "my local plugin", "a plugin I installed from the marketplace", and "that monorepo folder on GitHub".

**Analysis modes.** `plugin-visual` supports `--mode analyze` (default, full), `--mode security` (security-only), and `--mode overview` (lightweight). Each mode runs a short Intent Check to confirm audience and focus before generating.

**Visual self-audit.** After the content gate passes, the skill renders the HTML to a PNG, reads it back, and checks density, hierarchy, Mermaid rendering, and overflow — then fixes and re-renders (up to twice) before handing the report over. A report isn't done until it's been looked at. Skips gracefully when `claude-in-chrome` is unavailable.

**Refinement loop.** After reading a report, leave section-level notes via the in-page ✎ button, then run `/report-manager refine` to re-generate only the sections you flagged — feedback is harvested via MCP when `claude-in-chrome` is connected, otherwise by paste.

**In-browser feedback.** Every report embeds a per-section feedback UI (✎ button). When the user invokes `/report-manager refine` after leaving notes, the skill harvests those notes — via MCP if `claude-in-chrome` is connected, otherwise by asking the user to click Copy in the feedback bar and paste.

## License

MIT
