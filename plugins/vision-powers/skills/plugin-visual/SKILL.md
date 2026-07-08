---
name: plugin-visual
description: >
  Analyze agent extensions and generate self-contained HTML wiki reports with security audit
  and architecture diagrams. Use when asked to analyze, audit, or document a plugin.
  Triggers on GitHub plugin URLs or local plugin paths.
argument-hint: "path-or-url [--format html|md] [--lang code] [--artifact (native design + publish)]"
allowed-tools: Read, Glob, Grep, Agent, AskUserQuestion, Artifact, Skill(artifact-design), Bash(gh repo clone *), Bash(rm -rf /tmp/plugin-visual-*), Bash(git branch *), Bash(git log *), Bash(git rev-parse *), Bash(open *), Bash(node *), Bash(which *), Bash(echo *)
---

# Agent Extension Visual

Analyze agent extensions and generate self-contained HTML wiki reports (or inline markdown) with security audit and plugin profiles. Currently supports Claude Code plugins.

## Instructions

### Input Parsing

Determine the analysis target from the user's message:

1. Path contains `/` → **local path** (resolve relative to cwd)
2. Contains `github.com` or `https://` → **GitHub URL**
3. Other text → **installed plugin name** (search `~/.claude/plugins/cache/`)
4. Nothing specified → **current directory** (scan `.claude/`, `CLAUDE.md`, `plugins/`)

For GitHub URLs, support subpath patterns:
- `github.com/owner/repo` → clone entire repo
- `github.com/owner/repo/tree/branch/plugins/foo` → clone repo, analyze subpath only

### Language Detection

Determine the output language:

1. **Explicit language argument**: `--lang <code>` (e.g., `--lang ko`, `--lang fr`, `--lang zh`) → use that language. Any language code is valid
2. **User message text**: Detect the language of the message (excluding URL/path) and match it
   - Examples: Korean text → Korean, Japanese text → Japanese, "en español" → Spanish, "auf Deutsch" → German
3. **URL only with no other text**: Use AskUserQuestion to ask the user's preferred language

Pass the detected language to sub-agents and use it for Phase 5 report assembly.

### Analysis Mode Detection

Determine **what** to analyze:

| Mode | Trigger Keywords | Scope |
|------|-----------------|-------|
| `analyze` **(default)** | "analyze", "inspect", "report", "wiki", "document" | Full analysis and Plugin Profile |
| `security` | "security audit", "permission analysis" | Security only |
| `overview` | "overview", "summary" | Identity + inventory only |

### Output Format Detection

Determine **how** to present the result (independent of analysis mode):

| Format | Trigger | Applies to |
|--------|---------|------------|
| HTML **(default)** | Default for `analyze` mode | `analyze` only |
| Inline markdown | "--format md", "markdown", "md", "inline", "text" | `analyze` only |
| Inline markdown **(always)** | — | `security`, `overview` (too brief for HTML) |
| Artifact publish | `--artifact` switch | `analyze` + HTML only — see "Phase 5R — Artifact channel" below |

`--artifact` also triggers on natural-language equivalents — "as an artifact", "publish as a link",
"share as a URL" — without the literal flag, in whatever language the user is writing in. It's
scoped to `analyze` mode with HTML format the same way diff-visual scoped its own artifact channel:
`security` and `overview` modes stay markdown-only (too brief for a full report to begin with), and
`--format md` combined with `--artifact` has no publish path in this slice.

**Config precedence.** Before falling back to the defaults above, check stored preferences once:
`node ${CLAUDE_PLUGIN_ROOT}/scripts/config.js get` (prints the config as JSON, or `{}`). A
`default_format` value replaces the HTML default and `artifact: true` replaces off, the same as the
`--artifact` flag — but only within the `analyze`+HTML scope above; config can't force artifact
publishing onto `security`/`overview` modes any more than the flag can. Anything the user actually
says this turn — a literal flag or a natural-language equivalent — always overrides config; config
only fills in when the request is silent on format/channel.

### Intent Check

*Why: An analysis for potential users focuses on capabilities and compatibility; an analysis for security reviewers focuses on permissions and risk. The audience shapes emphasis across all report sections.*

If the user's message already conveys clear intent (e.g., "security audit", "is this plugin safe", or a specific analysis mode keyword), skip this step.

If the request is ambiguous (e.g., just a plugin path with no other context), use AskUserQuestion to ask up to 2 questions:

1. **Audience**: Who will read this? (yourself, your team, plugin marketplace reviewers)
2. **Focus**: Any specific concern? (security, architecture, compatibility, general overview)

Defaults:
- Audience: the user themselves (evaluating the plugin)
- Focus: balanced full analysis

Pass audience and focus context to the analysis and report generation phases.

### Workflow

#### Phase 1: Source Acquisition

- **Local path**: Verify directory exists, proceed directly
- **Installed plugin**: Search `~/.claude/plugins/cache/` for matching directory
- **GitHub URL**: Clone to `/tmp/plugin-visual-{dirname}`:
  1. Generate `{dirname}` — pick any 8-character hex string yourself (e.g., `a1b2c3d4`)
  2. Clone directly (no mkdir needed — git creates the target directory):
     ```
     Bash(gh repo clone {owner/repo} /tmp/plugin-visual-{dirname})
     ```
     This is the only Bash command needed for cloning. Do not add extra commands for saving state or generating random strings.
  For subpath URLs (`github.com/owner/repo/tree/branch/plugins/foo`):
  1. Extract `owner/repo` for cloning
  2. Extract the subpath after `/tree/{branch}/` (e.g., `plugins/foo`)
  3. Clone the full repo, then set the analysis target to the subpath within the clone
- **Current directory**: Use cwd

If source cannot be found, inform user and stop.

**Source context** — save for later phases (source links in report):

| Source type | `source_type` | `source_base` | `github_url` |
|-------------|--------------|---------------|-------------|
| Local path | `local` | `{absolute-path}` | — |
| Installed plugin | `local` | `{cache-path}` | — |
| GitHub URL (root) | `github` | `/tmp/plugin-visual-{dirname}` | `https://github.com/{owner}/{repo}/blob/{branch}` |
| GitHub URL (subpath) | `github` | `/tmp/plugin-visual-{dirname}/{subpath}` | `https://github.com/{owner}/{repo}/blob/{branch}/{subpath}` |

When cloning a subpath URL (e.g., `github.com/owner/repo/tree/main/plugins/foo`), include the subpath in both `source_base` and `github_url` so that relative paths from the plugin root produce correct source links.

#### Phase 2: Discovery

*Why: Accurate component inventory prevents analysis agents from missing or hallucinating plugin components.*

Scan the target directory for all plugin components.

**Step 1**: Run 3 Glob calls in parallel (single message):

| # | Pattern | Captures |
|---|---------|----------|
| 1 | `**/*.md` | SKILL.md, agent .md, command .md, CLAUDE.md, README.md, CHANGELOG.md |
| 2 | `**/*.json` | plugin.json, hooks.json, .mcp.json, .lsp.json, settings.json |
| 3 | `LICENSE*` | License files |

**Step 2**: If Glob results are sparse (< 5 files found), run additional Glob calls (never Bash):
```
Glob("*", path: {target-directory})
Glob("**/*", path: {target-directory})
```
Then run targeted Glob on discovered directories (e.g., `skills/**/*`, `agents/**/*`, `commands/**/*`).

**Step 3**: Classify results into component types:

| Component | Path pattern |
|-----------|-------------|
| Skill | `skills/*/SKILL.md` |
| Skill auxiliary | `skills/*/*` (non-SKILL.md) |
| Agent | `agents/*.md` |
| Command | `commands/*.md` |
| Rule | `rules/*.md` or root-level `RULE.md` |
| Hook config | `hooks/hooks.json` or `hooks/*.json` |
| MCP config | `.mcp.json` |
| LSP config | `.lsp.json` |
| Config | `settings.json` (plugin root) |
| Plugin manifest | `**/plugin.json` |

Build a component inventory with counts and file lists.

**Step 4**: Determine platform from Glob results (no additional Glob calls needed).

Check the file list from Step 1 for platform-unique signals:

| Platform | Unique signals (any match → detected) |
|----------|---------------------------------------|
| **Claude Code** | `.claude-plugin/plugin.json`, `CLAUDE.md`, `.claude/` directory, `agents/*.md`, `hooks/hooks.json`, `.mcp.json` |
| **Codex** *(not yet supported)* | `.codex/` directory, `AGENTS.md`, `agents/*.toml` |

If no known platform is detected, ask the user:
"Could not detect the agent platform. Currently supported: Claude Code. Is this a Claude Code plugin?"

If Codex is detected, inform the user that Codex analysis is not yet supported.

Set `{platform}` variable for subsequent phases. Currently only `claude-code` is implemented.

#### Phase 3: Metadata Collection

*Why: Reading identity files here avoids duplicate reads inside sub-agents, saving tokens.*

Read identity files in a single message with parallel Read calls:

- `plugin.json` (or `.claude-plugin/plugin.json` — whichever Phase 2 found)
- `hooks/hooks.json` (only if found in Phase 2)

Existence of LICENSE, CHANGELOG.md, tests/ is already known from Phase 2.

Do NOT read README.md, SKILL.md, agent.md, command.md, or hook script files.
Sub-agents read these files directly — the feature-architect reads README.md in its own analysis procedure. Reading them here wastes tokens through duplication.

Output for Phase 4: plugin identity + file path inventory + existence flags + language.

#### Phase 4: Parallel Analysis

*Why: Feature and security analysis are independent concerns — parallel execution halves wall-clock time.*

For `overview` mode, skip this phase — go directly to Phase 5.

For `analyze` and `security` modes, delegate to agents in parallel.

**Agent prompt**: Provide each agent with:
- Plugin identity (name, version, author, description — from plugin.json)
- Target directory path
- Component file paths grouped by type (from Phase 2 Glob)
- Output language
- Analysis mode
- Source context: `source_type`, `source_base`, `github_url` (if applicable) — so feature-architect can include relative paths that the orchestrator will later combine with source_base for links

**For `analyze` mode with large plugins (total components > 15)** — split feature-architect into batches.

Count total = skills + agents + commands. Split each type in half:

```
S = number of skills, A = number of agents, C = number of commands

Task(subagent_type: "vision-powers:feature-architect", prompt: {
  skills 1..ceil(S/2) + agents 1..ceil(A/2) + commands 1..ceil(C/2)
})
Task(subagent_type: "vision-powers:feature-architect", prompt: {
  skills ceil(S/2)+1..S + agents ceil(A/2)+1..A + commands ceil(C/2)+1..C + MCP + LSP
})
Task(subagent_type: "vision-powers:security-auditor", prompt: {all file paths})
```

MCP, LSP, hooks, and rules are lightweight — keep them in Batch 2 only.
All three tasks run in parallel. Merge feature-architect batch results before Phase 5.

**For `analyze` mode with standard plugins (total components <= 15)**:

```
Task(subagent_type: "vision-powers:feature-architect", prompt: {all file paths})
Task(subagent_type: "vision-powers:security-auditor", prompt: {all file paths})
```

**For `security` mode** — launch only security-auditor:

```
Task(subagent_type: "vision-powers:security-auditor", prompt: {all file paths})
```

#### Phase 4.5: Environment Fit Diagnosis (analyze mode only)

*Why: Even a well-built plugin can be wrong for the user's environment. This step catches conflicts, redundancies, and budget overruns before they cause confusion.*

Diagnose whether this plugin is a good fit for the user's current environment — not just "can it run?" but "should it be installed here?"

**Full procedure**: Read `${CLAUDE_PLUGIN_ROOT}/skills/plugin-visual/references/platforms/claude-code/env-fit-diagnosis.md` for the detailed 5-step process covering:
1. Extract plugin characteristics from feature-architect output (including rules, CLAUDE.md @imports, bundle source)
2. Run the environment scan script (`env-fit-scan.js`) — collects installed plugins, skills, commands, hooks, MCP servers, context metrics
3. Perform eight diagnostic analyses:
   - **Via script data** (steps 3A-3E, 3H): installation status, dependency check, context budget, functional overlap, hook impact, component dependencies
   - **Via orchestrator** (steps 3C extras, 3F, 3G): rules context cost (from feature-architect's rules analysis), CLAUDE.md @import chain, scope impact analysis, bundle source detection (from Phase 1 source context and plugin cache inspection)
4. Determine overall verdict (RECOMMENDED / CONDITIONAL / REDUNDANT / CONFLICTING)
5. Build diagnosis data structure for Phase 5/5R (includes scope_impact, bundle_source, and enhanced context_budget with always-loaded/deferred breakdown)

The environment scan script provides baseline data:
```
Bash(node {plugin-root}/scripts/env-fit-scan.js --plugin-name {plugin-name})
```

The orchestrator then supplements with:
- **Rules context cost**: Count rules from feature-architect output, classify as always-loaded (no `paths:`) or on-demand (`paths:` present), estimate tokens as `file_size / 4`
- **Scope impact**: All marketplace plugins install globally; check for framework-specific hooks/MCP that may warrant per-project activation
- **Bundle source**: Determine from Phase 1 `source_type` (local/github) or plugin cache path patterns (marketplace/symlink)

Save the combined `environment_fit` data for Phase 5/5R. Omit empty categories.

#### Phase 5: Report Assembly (inline markdown)

For `security` mode, `overview` mode, or `analyze` mode with `--format md` — assemble inline markdown report:

Assemble the report using `${CLAUDE_PLUGIN_ROOT}/skills/plugin-visual/references/platforms/claude-code/report-template.md` format. This template is an *information-structure schema* — which sections appear and what data each one carries — not an aesthetic template; it governs the inline-markdown report only and says nothing about visual design. (The HTML mode in Phase 5R is templateless by contrast: you author its design from scratch.)

- **`overview` mode**: Identity + Component Inventory sections only
- **`security` mode**: Security-focused report with risk summary, permission matrix, findings
- **`analyze` mode (--format md)**: Full report with analysis, Environment Fit Diagnosis, Skill Design Quality, and Plugin Profile

For Plugin Profile and Skill Design Quality, apply criteria from `${CLAUDE_PLUGIN_ROOT}/skills/plugin-visual/references/platforms/claude-code/analysis-criteria.md`.
For risk levels, apply rules from `${CLAUDE_PLUGIN_ROOT}/skills/plugin-visual/references/platforms/claude-code/security-rules.md`.
Environment Fit Diagnosis is a standalone section between Feature Deep Dive and Usage (not part of Plugin Profile). Include the full diagnosis from Phase 4.5: verdict, context budget (200K/1M scenarios), installation status, dependency check, overlap/trigger findings, hook impact, component dependencies, and recommendations.
Skill Design Quality includes: skill category distribution, per-skill design assessment (description quality, progressive disclosure, gotchas, scripts, hooks, data persistence, maturity level), and improvement recommendations. This data comes from the feature-architect's Skill Design Quality output.

Output the report in the detected language, using `${CLAUDE_PLUGIN_ROOT}/skills/plugin-visual/references/platforms/claude-code/report-template.md` format.
Translate all section headers, labels, and descriptions to the target language.
Keep component names, file paths, and technical terms (CRITICAL, HIGH, MEDIUM, LOW) untranslated.

**Before delivering**, give the assembled markdown a quick pass (a guideline, not a script). The md path has no artifact-gate — `artifact-gate.js` is HTML-only — so this hand-check is what catches the scaffolding the gate would otherwise flag: no leftover `{placeholder}` / `{{ }}` / `[STUB]` tokens copied from the template schema, and every link resolves — source links use the full `github_url`/`file://` base from the source context, not a bare relative path that breaks once the report leaves this directory. Fix any you find, then deliver.

Output the report directly to the user (inline markdown), and save the same content to
`${CLAUDE_PLUGIN_DATA}/reports/{YYYY-MM-DD}-{plugin-name}-report.md` (append `-security` /
`-overview` to the basename for those modes, so they never collide with an `analyze` report from
the same day) — the chat text is the delivery, the file is the record that lets report-manager
list and refine this report later.

#### Phase 5R: HTML Report Generation (analyze mode — default format)

For `analyze` mode with HTML format (the default), write a self-contained HTML file yourself — `<!DOCTYPE html>` to `</html>`. No visual template, no intermediate JSON, no agent chains: the design is yours to author from scratch. (The md mode's `report-template.md` is an information-structure schema for the inline-markdown path, not a visual template — it doesn't apply here.)

**1. Determine output path**:

Default output path: `${CLAUDE_PLUGIN_DATA}/reports/{YYYY-MM-DD}-{plugin-name}-report.html`

Where:
- `{YYYY-MM-DD}` is today's date
- `{plugin-name}` is from plugin.json name field (or directory name if no plugin.json)

**Existing report check**: Before generating, use Glob to search for `*-{plugin-name}-report.html` in `${CLAUDE_PLUGIN_DATA}/reports/`. If any exist, use AskUserQuestion to let the user choose between creating new or updating existing.

**2. Write the HTML report**:

Include all analysis data from Phase 4 (feature-architect + security-auditor) and Phase 4.5 (environment fit diagnosis). The report should contain these sections (adapt based on analysis results):

| Section | Content |
|---|---|
| **Identity & Overview** | Plugin name, version, author, description, component inventory chart |
| **Architecture** | Component map diagram — skills, agents, commands, hooks, MCP connections |
| **Feature Deep Dive** | Per-component analysis from feature-architect |
| **Security Audit** | Risk summary, permission matrix, findings from security-auditor |
| **Environment Fit** | Verdict, context budget, overlap, hook impact from Phase 4.5 |
| **Skill Design Quality** | Category distribution, per-skill assessment from feature-architect |
| **Plugin Profile** | Maturity, documentation, quality checklist |
| **Recommendations** | Grouped by priority |

Skip sections with no data (e.g., no security findings → slim security section).

**Diagrams**: Read these reference files for implementation:
- `${CLAUDE_PLUGIN_ROOT}/references/design-system/mermaid-patterns.md` — Mermaid syntax, theming, dark mode, zoom
- `${CLAUDE_PLUGIN_ROOT}/references/design-system/semantic-tokens.md` — Color/font roles, Mermaid themeVariables
- `${CLAUDE_PLUGIN_ROOT}/references/design-system/diagram-type-selection.md` — 13-type selection guide
- `${CLAUDE_PLUGIN_ROOT}/references/design-system/diagram-density-rules.md` — Complexity budgets

Key diagram rules (always apply):
1. Max 9 nodes, 12 arrows per diagram. Over budget → split
2. 1-2 focal accents only
3. No `rgba()` or `color:` in Mermaid classDef — parser breaks
4. No violet/fuchsia "AI purple" hexes (`#8b5cf6`/`#7c3aed`/`#a78bfa`/`#d946ef`) — the gate fails on these
5. Always `theme: 'base'` with themeVariables from semantic-tokens
6. Architecture diagrams with 15+ components → show 3-5 representatives per layer with total counts, keep under 25 nodes

The gate also fails on dead links, alt-less images, and leftover scaffolding: give every `<a>` a real href, every `<img>` an `alt` (`alt=""` if decorative), and leave no `{{ }}`/lorem/`[STUB]` placeholders.

**CSS essentials**: Write your own CSS inline. Must support:
- `prefers-color-scheme: dark` via CSS custom properties
- Korean font stack (CJK font in font-family)
- `transform: scale()` for Mermaid zoom (not `zoom` property)
- `min-width: 0` on flex/grid children
- `prefers-reduced-motion: reduce`
- Status indicators: colored dots via CSS, no emoji

**Source links**: When `source_type` is `github`, make file paths clickable with `{github_url}/{relative-path}` links. For local sources, use `file://` URLs.

**Content integrity**: All analysis data from sub-agents must survive intact in the report — specific numbers, finding details, risk levels, recommendations. If you're writing "the security audit found issues" instead of listing the actual findings — that's compression.

This cardinal rule (call it *summary-leak*) is one of seven authoring reflexes that pass every mechanical gate and still flatten the output. Read `${CLAUDE_PLUGIN_ROOT}/references/design-system/anti-slop-tells.md` for the full catalogue — linear dump, forced diagram, generic label, uniform density, empty decoration, accent overuse. They're named defaults to break, not design rules: layout and taste stay yours, the catalogue just flags the habits worth resisting (e.g. a forced flowchart on a flat permission list, or every section — security, architecture, dependency map — rendered at the same weight).

**3. Validate**: Run artifact-gate after writing:
```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/artifact-gate.js <output-path>
```
If violations found: fix inline, max 2 retries.

**4. Visual self-audit (HTML only)**:

The gate reads the HTML as *text* — it never sees the rendered picture. An architecture or dependency-map diagram can pass the density check and still render as an unreadable tangle; a long permission-matrix label can clip at the container edge; the security/architecture/profile hierarchy that reads fine in source can collapse into a flat wall once styled. After the gate passes, **render the report and look at it** before delivering:

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/render-report.js <output-path>
```

On success it prints a PNG path. **Read that PNG** (you read images multimodally) and scan it for what the text gate can't judge:

- **Density** — is any section a uniform grey wall, or is the architecture/dependency diagram past its budget and unreadable?
- **Hierarchy** — does anything draw the eye first, or are the security, architecture, and component-map sections all the same weight? (see *uniform density* / *accent overuse* in anti-slop-tells.md)
- **Mermaid integrity** — did the component map or security diagram render as raw `<pre>` text or as crossing/overlapping edges?
- **Overflow** — does a diagram, permission matrix, or label run past its container or off the page?

Fix what you see and re-render. **Cap at 2 audit passes** — if something still looks off after the second, ship with a one-line note to the user rather than looping. This catches gross breakage, not pixel-perfection.

**If Chrome is absent**, `render-report.js` exits `1` (non-zero). Skip the audit and tell the user it was skipped (e.g. "rendered-image check skipped: Chrome not found — set `CHROME_BIN` or install Chrome"). The report already passed the gate; the visual pass is an enhancement and **never blocks delivery**.

Full procedure, limits (fixed-height clipping, downscaling, render cost), and the rationale for *not* mechanizing this with a measurement script live in `${CLAUDE_PLUGIN_ROOT}/references/design-system/visual-self-audit.md`.

**5. Open and present**:
Run `open <output-path>`. Tell the user the report is ready and ask if they want changes.

#### Phase 5R — Artifact channel (`--artifact`)

Same content decisions as Phase 5R above (section set, per-component analysis, source links,
anti-slop-tells) — only the page's shape and delivery mechanism change, because it ships inside
Claude Code's official Artifacts feature instead of as a local file.

**Before writing anything**, load the built-in `artifact-design` skill (Skill tool, skill name
`artifact-design`). This is a tool contract MUST, not a suggestion — it conditions you for the CSP
sandbox this page runs in, and skipping it is how a page ends up broken on publish.

Then write the page as a **fragment**, not a full document:
- No `<!DOCTYPE>`, `<html>`, `<head>`, or `<body>` tags — content only, starting from your first
  real element. The Artifact tool wraps the file in that skeleton at publish time.
- Set a concise `<title>` directly in the content — it names the artifact in the browser tab. Keep
  it stable across every republish of the same plugin in this session.
- **Zero external requests** — the Artifact viewer's CSP blocks all of them. No Mermaid CDN
  `<script>`, no hotlinked images or fonts. The Architecture, Feature Deep Dive, and Environment Fit
  diagrams become inline SVG or HTML+CSS layouts instead (follow the artifact-design skill's
  guidance) — same diagram-type decision from `diagram-type-selection.md`, different rendering
  technique. `mermaid-patterns.md`'s CDN setup and `classDef` rules don't apply here. Source links
  (`github_url` or `file://`) stay as plain `<a href>` navigation — that's a top-level link click,
  not a fetched resource, so CSP doesn't touch it.
- Support both themes: `@media (prefers-color-scheme: dark)` as the default signal, plus
  `:root[data-theme="dark"]` / `:root[data-theme="light"]` overrides — the artifact viewer's theme
  toggle stamps `data-theme` on the root and it must win in both directions.

**Watch density here more than on doc-visual or diff-visual's artifact pages.** This report packs
more concurrent sections — security permission matrix, architecture/component map, feature deep
dive, environment fit, skill design quality, plugin profile — into the same fragment width. A wide
permission table or a 15+-component architecture diagram that reads fine in the local channel's
layout is the most likely place a fragment overflows or wraps awkwardly; this is exactly what the
S4 local-vs-artifact comparison run is for (see the issue's acceptance criteria), not something to
assume away here.

Save the fragment to
`${CLAUDE_PLUGIN_DATA}/reports/{YYYY-MM-DD}-{plugin-name}-report.artifact.html` — a distinct
filename from the default channel's `...-report.html`, so the two never collide or overwrite each
other for the same plugin.

Re-running this skill on the same plugin within the same conversation reuses that same path.
Publishing to the same `file_path` again redeploys to the same URL instead of minting a new one, so
keep the `<title>` and `favicon` identical across those republishes (the tool reads a changed
favicon as a different page). If `${output-path}.artifact.json` already exists from an earlier
publish this session, read it first and reuse its `title`/`favicon` verbatim.

**Validation**: run the gate in content-only mode instead of the full check:
```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/artifact-gate.js <output-path> --content-only
```
This checks only missing images, raw markdown leakage, anchor hrefs, image alt, and placeholders —
the facts that must survive regardless of who designed the page. Density/classDef/palette checks
don't apply: the built-in artifact-design skill owns the design layer on this channel (ADR 0007).

**Skip the visual self-audit (`render-report.js`) entirely on this channel.** The rendered picture
is the built-in artifact-design skill's responsibility here, not this skill's — there's no local
Chrome render loop to run before publishing.

**Publish**, once the gate passes:
1. Publish with the `Artifact` tool: `file_path` = the fragment you saved, `favicon` = one or two
   emoji fitting the plugin's purpose (reused unchanged if a sidecar from this session already set
   one — see above), `description` = one sentence on the plugin and what the report covers.
2. Record the publish so a later refine (even across sessions, once that lands) can find this URL:
   ```bash
   node ${CLAUDE_PLUGIN_ROOT}/scripts/write-artifact-sidecar.js --report <output-path> --url <artifact-url> --title <title> --favicon <favicon>
   ```
3. Report the URL to the user with one line noting the design delegation — e.g. "Design delegated
   to Claude's built-in Artifact renderer — this differs from the local report's look." (phrase it
   in whatever language you're already replying in).

**Fallback** — if the `Artifact` tool is unavailable or the publish call fails: keep the local
fragment you already saved, `open` it as the default HTML channel does, and state the fallback in
one generic line (e.g. "Artifact publish unavailable — opened the local file instead."). Don't
guess at the specific cause, and don't ask before falling back.

Continue to Phase 7 (cleanup) as normal once publish (or fallback) completes.

#### Phase 7: Cleanup

Clean up temporary files:
```
Bash(rm -rf /tmp/plugin-visual-{dirname}-sections)
```

If the source was also cloned from GitHub:
```
Bash(rm -rf /tmp/plugin-visual-{dirname})
```

After cleanup, suggest optional next steps:
- `/fact-check` — verify the report's factual accuracy against the actual codebase
- `/report-manager refine` — refine specific sections based on feedback
- `--verify` — if not used this time, mention that coherence review is available for future runs

This is informational — just a brief suggestion, not an automatic invocation.

### Gotchas

- **GitHub URL analysis requires `gh` CLI**: `gh repo clone` is used for source acquisition from GitHub URLs. If `gh` is not installed or not authenticated, GitHub URL analysis will fail. Local path and installed plugin analysis work without `gh`.
- **`$()` command substitution triggers security prompt**: The `Bash(echo $(date))` pattern causes Claude Code to show a separate permission dialog regardless of `allowed-tools`. Use literal values or `Bash(date)` with separate processing instead.
- **GitHub rate limiting**: `gh repo clone` and `gh api` calls can fail silently with HTTP 403 when the user's token is rate-limited. If clone fails, check `gh auth status` before retrying.
- **Plugin cache has multiple versions**: `~/.claude/plugins/cache/` stores every installed version (e.g., `2.6.0/`, `2.7.1/`). Phase 4.5 uses the session context directly (not cache scanning), but if you ever need to inspect the cache manually, always pick the latest version per plugin to avoid counting stale entries.
- **Large plugin batching threshold**: The 15-component threshold for splitting feature-architect is approximate. Plugins with many small commands but few skills may not need splitting, while plugins with 10 dense skills might. Use judgment — the goal is keeping each agent under context limits.
- **Existing report overwrite prompt**: The "create new or update" prompt uses AskUserQuestion. If the user is running non-interactively or in a pipeline, this blocks. Default to "create new" if no user response is available.
- **Temp directory collision**: The 8-char hex `{dirname}` has a negligible collision risk, but if a previous run crashed without cleanup, `/tmp/plugin-visual-*` directories may linger. The cleanup phase handles the current run only — it does not garbage-collect stale dirs.
- **Skill category misclassification**: Skills that span multiple categories (e.g., a deploy skill with review features) should be classified by primary purpose — what the user invokes it for. Don't try to assign multiple categories; pick the best fit and note the overlap in the description.
- **Design quality false negatives**: A skill with no `scripts/` directory isn't necessarily "Basic" — some skills genuinely don't need scripts (pure knowledge/reference skills). Apply the N/A classification for criteria that don't apply to the skill type.
- **New hook events**: The security-auditor knows about 22 hook events as of 2026-03. If new events are added to Claude Code, the event list in `security-rules.md` and `security-auditor.md` may need updating.
- **Plugin agent ignored frontmatter fields**: `permissionMode`, `hooks`, `mcpServers` are silently ignored on plugin agents. The fields `effort`, `model`, `tools`, `disallowedTools`, `maxTurns`, `skills`, `memory`, `background`, `isolation` work normally. Analysis agents use `effort: high` and inherit the session model.
- **Agent `effort` field**: The `effort` field (low/medium/high/max) is distinct from the `model` field. A Haiku agent with `effort: max` is different from an Opus agent with default effort. Report both when present.
- **Instruction layer analysis false positives**: Step 10 of the security-auditor analyzes SKILL.md body text for adversarial patterns (env var exfiltration, obfuscation, undeclared URLs). Setup/config skills that reference env var names as documentation, API skills with endpoint URLs, and encoding skills with base64 examples will trigger pattern matches. Context Modifiers handle common cases, but review flagged findings carefully — a MEDIUM on a config skill's env var reference is usually informational, not a real threat.
- **Mermaid node labels with special chars**: Node labels containing `:`, `/`, `<`, `>` must be double-quoted in Mermaid code (`C1["gsd:new-project"]` not `C1[gsd:new-project]`). Unquoted special chars cause Mermaid parsing errors.
- **Command-based plugins and empty Skill Design Quality**: Plugins built on `commands/` instead of `skills/` will have empty skill_design_quality data. Adapt analysis for command-based plugins rather than leaving sections empty.
- **Architecture diagrams with large plugins**: Plugins with 15+ components → show 3-5 representatives per architectural layer with total counts, keep under 25 nodes per diagram.
- **Discovery phase must use Glob only, never Bash**: Phase 2 file discovery must use Glob calls exclusively. Bash calls like `ls` or `find` are not in `allowed-tools` and trigger a user permission prompt that blocks execution (observed: 185s wait). All file listing needs are covered by Glob patterns — there is no case where Bash is needed for discovery.
- **Rules with `paths:` frontmatter are deferred**: Rules that have a `paths:` field in frontmatter are NOT always-loaded — they only activate when matching file paths are in context. Treat them as zero always-on cost in context budget analysis. Rules WITHOUT `paths:` load their full content at session start.
- **Plugin settings.json only supports `agent` field**: A plugin's `settings.json` at the root level only supports the `agent` field for setting a default agent. It does NOT support `permissions`, `hooks`, or other settings — these are silently ignored. Don't report unsupported settings as features.
- **Bundle source detection is best-effort**: `skills-lock.json` may not exist in older installations, and cache path patterns can vary. Always fall back to plugin.json `repository` field or mark as `unknown`. Don't report missing provenance as a security issue.
- **Scope impact for marketplace plugins**: All marketplace-installed plugins operate at the global scope. Their hooks fire for every project. If the plugin is highly framework-specific (e.g., React, Django), note this as a scope appropriateness concern — the user may want to conditionally disable it for non-matching projects.
- **Context budget empirical grounding**: Context budget recommendations reference empirical estimates of ~20% structural waste in production sessions (unused tools, duplicates, stale results). Use this as motivation for context-aware recommendations, but note it's a general finding — individual plugin impact varies.

### Reference Files

Read these during report generation (not upfront — read the relevant one when you need it):

| File | When to read |
|---|---|
| `references/platforms/claude-code/analysis-criteria.md` | Plugin Profile criteria — component inventory, docs, quality checklist, skill categories, design quality |
| `references/platforms/claude-code/security-rules.md` | Security patterns and risk classification (with context modifiers) |
| `references/platforms/claude-code/report-template.md` | Information-structure schema for the inline-markdown report — section layout and data, not visual design (Phase 5) |
| `references/platforms/claude-code/env-fit-diagnosis.md` | Environment Fit Diagnosis detailed steps (Phase 4.5) |
| `${CLAUDE_PLUGIN_ROOT}/references/design-system/mermaid-patterns.md` | Before writing any Mermaid diagram (Phase 5R) |
| `${CLAUDE_PLUGIN_ROOT}/references/design-system/semantic-tokens.md` | When setting up CSS custom properties and Mermaid theme (Phase 5R) |
| `${CLAUDE_PLUGIN_ROOT}/references/design-system/diagram-type-selection.md` | When deciding diagram type for a section (Phase 5R) |
| `${CLAUDE_PLUGIN_ROOT}/references/design-system/diagram-density-rules.md` | When a diagram feels complex (Phase 5R) |
| `${CLAUDE_PLUGIN_ROOT}/references/design-system/anti-slop-tells.md` | While shaping content — to check you're not falling into a behavioral-slop reflex (Phase 5R) |
| `${CLAUDE_PLUGIN_ROOT}/references/design-system/visual-self-audit.md` | After the gate passes — the render-and-look loop, full procedure (Phase 5R) |
