---
name: plugin-visual
disable-model-invocation: true
description: >
  Analyze agent extensions and generate self-contained HTML wiki reports with security audit
  and architecture diagrams. Use when asked to analyze, audit, or document a plugin.
  Triggers on GitHub plugin URLs or local plugin paths.
argument-hint: "path-or-url [--format html|md] [--lang code]"
allowed-tools: Read, Glob, Grep, Agent, AskUserQuestion, Bash(gh repo clone *), Bash(rm -rf /tmp/plugin-visual-*), Bash(git branch *), Bash(git log *), Bash(git rev-parse *), Bash(open *), Bash(node *), Bash(which *), Bash(echo *)
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

Assemble the report using `${CLAUDE_PLUGIN_ROOT}/skills/plugin-visual/references/platforms/claude-code/report-template.md` format:

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

Output the report directly to the user (inline markdown).

#### Phase 5R: HTML Report Generation (analyze mode — default format)

For `analyze` mode with HTML format (the default), generate a self-contained HTML file.

1. **Determine output path**:

   Default output path: `${CLAUDE_PLUGIN_DATA}/reports/{YYYY-MM-DD}-{plugin-name}-report.html`

   Where:
   - `{YYYY-MM-DD}` is today's date (e.g., `2026-03-14`)
   - `{plugin-name}` is from plugin.json name field (or directory name if no plugin.json)

   The Write tool creates parent directories automatically — no `mkdir` needed.

   **Existing report check**: Before generating, use Glob to search for `*-{plugin-name}-report.html` in `${CLAUDE_PLUGIN_DATA}/reports/`. If any exist, use AskUserQuestion:

   > Found existing report(s) for {plugin-name}:
   > - {filename1}
   > - {filename2}
   >
   > 1. Create new report ({today's date})
   > 2. Update {most-recent-filename}

   (Translate to output language.)

   - If user chooses "create new" → use the default dated path
   - If user chooses "update" → use the existing file path as output
   - If no existing reports found → proceed with default dated path without asking

2. **Resolve paths and read references**:

   Use `${CLAUDE_PLUGIN_ROOT}` — it expands to the plugin install directory at invocation time, which is stable across local/marketplace installs and does not depend on the current working directory.

   - Template: `${CLAUDE_PLUGIN_ROOT}/templates/plugin-visual.html`
   - JSON schema: `${CLAUDE_PLUGIN_ROOT}/skills/plugin-visual/references/sections-data-schema.md`
   - Semantic tokens: `${CLAUDE_PLUGIN_ROOT}/references/design-system/semantic-tokens.md`
   - Diagram type selection: `${CLAUDE_PLUGIN_ROOT}/references/design-system/diagram-type-selection.md`
   - Diagram density rules: `${CLAUDE_PLUGIN_ROOT}/references/design-system/diagram-density-rules.md`
   - Taste gate: `${CLAUDE_PLUGIN_ROOT}/references/design-system/taste-gate.md`
   - JSON validator script: `${CLAUDE_PLUGIN_ROOT}/scripts/validate-sections-data.js`
   - Render script: `${CLAUDE_PLUGIN_ROOT}/scripts/render-sections.js`
   - Assembler script: `${CLAUDE_PLUGIN_ROOT}/scripts/assemble-report.js`
   - Rotation script: `${CLAUDE_PLUGIN_ROOT}/scripts/aesthetic-rotation.js`
   - Shared directory: `${CLAUDE_PLUGIN_ROOT}/shared/`

   **Read 5 reference files** in a single parallel Read call:
   1. JSON schema (`${CLAUDE_PLUGIN_ROOT}/skills/plugin-visual/references/sections-data-schema.md`)
   2. Semantic tokens (`${CLAUDE_PLUGIN_ROOT}/references/design-system/semantic-tokens.md`)
   3. Diagram type selection (`${CLAUDE_PLUGIN_ROOT}/references/design-system/diagram-type-selection.md`)
   4. Diagram density rules (`${CLAUDE_PLUGIN_ROOT}/references/design-system/diagram-density-rules.md`)
   5. Taste gate (`${CLAUDE_PLUGIN_ROOT}/references/design-system/taste-gate.md`)

   Also fetch recent aesthetic choices to pass as an avoid list:
   ```
   Bash(node ${CLAUDE_PLUGIN_ROOT}/scripts/aesthetic-rotation.js recent --n 3)
   ```

   Save their content for step 4. Do NOT read the template, assembler, render script, rotation script, or shared directory — those are passed as paths or executed as CLIs.

3. **Create sections temp directory**:
   The sections directory path: `/tmp/plugin-visual-{dirname}-sections/`
   (reuse the same `{dirname}` from Phase 1 if GitHub clone, or generate one for local sources)
   The JSON data file path: `/tmp/plugin-visual-{dirname}-sections/sections-data.json`
   No mkdir needed — Write auto-creates directories, and render-sections.js creates the sections dir.

4. **Delegate to visual-report-writer agent (JSON mode)**:
   ```
   Task(subagent_type: "vision-powers:visual-report-writer", prompt: {
     **Output mode: JSON**
     Write a single file: {sections-data-json-path}

     feature-architect analysis results (full text, including Plugin Summary, Raw Content Excerpts, and Skill Design Quality),
     security-auditor analysis results (full text),
     plugin metadata (name, version, author, license, keywords, description),
     output language,
     JSON schema content (full text read in step 2),
     semantic tokens content (full text read in step 2),
     taste gate content (full text read in step 2),
     report title: "Agent Extension Visual: {plugin-name}",
     aesthetic hint: "Editorial",
     source context: { source_type, source_base, github_url (if applicable) },
     environment fit diagnosis: { verdict, verdict_summary, installation_status,
       context_budget: {
         always_loaded: { skill_descriptions, rules, claude_md, total_tokens },
         deferred: { mcp_tools, zero_cost_skills, on_demand_rules, total_tokens },
         rows (backward compat — render script uses always_loaded/deferred when available),
         hook_injection },
       dependency_check, overlap_findings, trigger_collisions,
       hook_impact: { current, adding, projected, types, event_collisions, severity },
       component_deps,
       scope_impact: { installation_scope, affected_scopes, scope_conflicts, appropriateness },
       bundle_source: { type, identifier },
       recommendations } (from Phase 4.5; when RECOMMENDED with no findings, pass minimal verdict-only data),
     skill design quality: { category_distribution, design_assessment[], summary }
       (from feature-architect's Skill Design Quality output; include in Plugin Profile section)
   })
   ```
   Pass the **file contents** read in step 2, not paths. This eliminates the agent's read turn.
   The agent writes a single `sections-data.json` file (1 Write call instead of ~13 in HTML mode).

   **Do NOT background this agent.** Plugin-defined agents silently ignore `permissionMode`, so the visual-report-writer needs user approval for the Write call. Backgrounded agents cannot prompt for permissions and will fail silently. Always run in the foreground.

5. **Validate sections data** — enforce the JSON contract before rendering:
   ```
   Bash(node {json-validator-path} {sections-data-json-path} --expected-sections 11)
   ```
   `{json-validator-path}` = `{plugin-root}/scripts/validate-sections-data.js`

   This is the boundary between the LLM writer and deterministic renderer. It checks that schema array fields are arrays, not table wrappers like `{note, rows}` or `{headers, rows}`.

   If FAIL: do not write Python fixup scripts and do not continue to render. Re-run `visual-report-writer` in JSON mode with the validator errors and require a full `sections-data.json` rewrite. Retry at most twice; if validation still fails, report the schema errors to the user.

6. **Render sections** — convert validated JSON data into HTML section files + metadata.json:
   ```
   Bash(node {render-script-path} --data {sections-data-json-path} --output {sections-dir})
   ```
   This script produces `section-1.html` through `section-11.html` and `metadata.json` with correct CSS class names hardcoded. No LLM-generated class names.

7. **Assemble report** — run the assembler script to combine template + sections:
   ```
   Bash(node {assembler-path} --template {template-path} --sections {sections-dir} --metadata {sections-dir}/metadata.json --shared {shared-dir-path} --output {output-path})
   ```

8. **Report validation** — run the validation script:
   ```
   Bash(node {validator-path} {output-path} --expected-sections 11)
   ```
   `{validator-path}` = `{plugin-root}/scripts/validate-report.js`

   The script checks: unreplaced placeholders (section + metadata), section content density, Mermaid diagram-type keywords, Chart.js data arrays, and section count. It exits 0 on PASS, 1 on FAIL with a list of issues.

   If FAIL because report content or Mermaid syntax is invalid: edit `sections-data.json`, then re-run render, assemble, and report validation. The final HTML is a generated artifact; do not edit it directly for report content. Only edit the final HTML for assembler/template injection defects that cannot be represented in `sections-data.json`.

   **Optional Coherence Review** — if `--verify` flag was specified or `auto_verify` is `true` in user config:
   Run the coherence review agent (see `../../references/report-generation-workflow.md` Step 6). If HIGH severity issues are found, apply content fixes in `sections-data.json`, then re-run render, assemble, and validation.

   **Optional Chrome visual verification** — only if `--verify` flag was specified AND `mcp__claude-in-chrome__*` tools are available. Skip entirely otherwise:
   1. Start a local HTTP server to serve the report (Chrome extensions cannot access `file://` URLs):
      ```
      Bash(python3 -m http.server 0 -d "$(dirname {output-path})" 2>&1 & echo $!)
      ```
      Capture the PID and port from the output.
   2. Call `tabs_context_mcp` (with `createIfEmpty: true`) to get or create an MCP tab group.
   3. Use `navigate` to open `http://localhost:{port}/{filename}` in the MCP tab.
   4. Use `javascript_tool` to check for Mermaid render errors (`document.querySelectorAll('.mermaid svg').length`) and empty sections.
   5. Fix content issues in `sections-data.json`, then re-run data validation, render, assemble, and report validation.
   6. Kill the server: `Bash(kill {pid} 2>/dev/null)`

8. **Report completion + Feedback Loop**:

   Use `AskUserQuestion` with the `file://` URL embedded in the question text itself:
   ```
   Report generated: [Open Report](file://{output-path})

   Review the report. Each section has a ✎ button — write feedback and click **Save**.
   When done, click **"Copy to Clipboard"** at the bottom bar and paste here.
   Or just tell me what to change directly.
   ```
   (Translate to output language. `{output-path}` is the actual path determined in step 1. Always include the `file://` URL as a markdown link — this is how the user opens the report.)

   - If the user pastes exported feedback JSON → parse it and apply changes to sections with `status: "issue"`. Do NOT read the full HTML file — only Edit the specific sections that need changes. This prevents context bloat.
   - If the user describes changes in natural language → apply modifications via targeted Edit calls on the HTML file
   - After applying changes, ask again with the same URL
   - If the user confirms completion → proceed to Phase 7

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
- **Do not background visual-report-writer**: Plugin-defined agents silently ignore `permissionMode`, so backgrounding visual-report-writer prevents Write permission prompts from reaching the user, causing silent failure. Always run in foreground.
- **Plugin agent ignored frontmatter fields**: `permissionMode`, `hooks`, `mcpServers` are silently ignored on plugin agents. The fields `effort`, `model`, `tools`, `disallowedTools`, `maxTurns`, `skills`, `memory`, `background`, `isolation` work normally. Analysis agents use `effort: high` and inherit the session model.
- **Agent `effort` field**: The `effort` field (low/medium/high/max) is distinct from the `model` field. A Haiku agent with `effort: max` is different from an Opus agent with default effort. Report both when present.
- **Instruction layer analysis false positives**: Step 10 of the security-auditor analyzes SKILL.md body text for adversarial patterns (env var exfiltration, obfuscation, undeclared URLs). Setup/config skills that reference env var names as documentation, API skills with endpoint URLs, and encoding skills with base64 examples will trigger pattern matches. Context Modifiers handle common cases, but review flagged findings carefully — a MEDIUM on a config skill's env var reference is usually informational, not a real threat.
- **Mermaid node labels with special chars**: Node labels containing `:`, `/`, `<`, `>` must be double-quoted in Mermaid code (`C1["gsd:new-project"]` not `C1[gsd:new-project]`). Unquoted special chars cause Mermaid parsing errors and can produce oversized layouts. The render script auto-quotes these, but the visual-report-writer should generate quoted labels to begin with.
- **Command-based plugins and empty Skill Design Quality**: Plugins built on `commands/` instead of `skills/` will have empty skill_design_quality arrays and missing features/KPIs. The render script skips empty sections gracefully, but the visual-report-writer should adapt its analysis for command-based plugins rather than leaving fields empty.
- **security_summary as object**: The visual-report-writer sometimes passes `security_summary` as a JSON object (with `risk_level`, `findings_by_severity`, `positive_features`) instead of a plain string. The render script handles both formats, but a string summary is preferred.
- **LLM schema mismatches handled by normalize**: The `render-sections.js` normalize function auto-corrects 15 common LLM output variations. Do NOT write Python fixup scripts in Bash — the normalize layer handles these deterministically. Key patterns: `features` as `[{title, description}]` → `string[]`, `recommendations` as `[{priority, text}]` → `string[]`, `keywords` as array → comma-separated string, `installation_status` as string → `{status, detail}`, `dependency_check` missing `status`/`severity`, `philosophy` cards with empty `name`, chart labels by purpose instead of extension type, `workflow_trace` title leading numbers stripped, and `context_budget` empty budget columns filled with official doc values.
- **Architecture diagrams with large plugins**: Plugins with 15+ components cause the LLM to list all nodes individually, producing broken Mermaid layouts or "...N more" truncation. The schema now instructs showing 3-5 representatives per architectural layer with total counts, keeping under 25 nodes per diagram.
- **Overview chart must use extension types**: The chart labels must be extension types (Skills, Agents, Commands, Hooks, MCP, LSP) not purpose categories (Scaffolding, Automation, etc.). The normalize function auto-corrects this by counting from the components section, but the schema also instructs this explicitly.
- **Never Read the full HTML report for feedback**: The generated HTML report can be 10,000+ tokens. Reading it into context for feedback processing causes context bloat and slow responses. Instead, use the Export Feedback JSON (a few hundred tokens) or have the user describe changes verbally. When edits are needed, use targeted Edit calls on specific line ranges — never Read the entire file.
- **Do not edit generated report HTML for content fixes**: The final report HTML is a build artifact generated from `sections-data.json`; direct edits disappear on the next render. If report content, tables, or Mermaid diagrams need changes, edit `sections-data.json` and re-run validate-sections-data.js, render-sections.js, assemble-report.js, and validate-report.js.
- **Discovery phase must use Glob only, never Bash**: Phase 2 file discovery must use Glob calls exclusively. Bash calls like `ls` or `find` are not in `allowed-tools` and trigger a user permission prompt that blocks execution (observed: 185s wait). All file listing needs are covered by Glob patterns — there is no case where Bash is needed for discovery.
- **Rules with `paths:` frontmatter are deferred**: Rules that have a `paths:` field in frontmatter are NOT always-loaded — they only activate when matching file paths are in context. Treat them as zero always-on cost in context budget analysis. Rules WITHOUT `paths:` load their full content at session start.
- **Plugin settings.json only supports `agent` field**: A plugin's `settings.json` at the root level only supports the `agent` field for setting a default agent. It does NOT support `permissions`, `hooks`, or other settings — these are silently ignored. Don't report unsupported settings as features.
- **Bundle source detection is best-effort**: `skills-lock.json` may not exist in older installations, and cache path patterns can vary. Always fall back to plugin.json `repository` field or mark as `unknown`. Don't report missing provenance as a security issue.
- **Scope impact for marketplace plugins**: All marketplace-installed plugins operate at the global scope. Their hooks fire for every project. If the plugin is highly framework-specific (e.g., React, Django), note this as a scope appropriateness concern — the user may want to conditionally disable it for non-matching projects.
- **Context budget empirical grounding**: Context budget recommendations reference empirical estimates of ~20% structural waste in production sessions (unused tools, duplicates, stale results). Use this as motivation for context-aware recommendations, but note it's a general finding — individual plugin impact varies.

### Reference Files

- `references/platforms/claude-code/analysis-criteria.md` — Plugin Profile criteria (component inventory, docs, quality checklist, skill categories, design quality)
- `references/platforms/claude-code/security-rules.md` — Security patterns and risk classification (with context modifiers)
- `references/platforms/claude-code/report-template.md` — Report output format templates (inline markdown)
- `references/platforms/claude-code/env-fit-diagnosis.md` — Environment Fit Diagnosis detailed steps (Phase 4.5)
- `references/sections-data-schema.md` — JSON data schema for all 11 report sections. Visual-report-writer reads it to generate `sections-data.json`
- `references/section-structure.md` — HTML structure patterns for each report section (used by render-sections.js, not by the writer in JSON mode)
- `../../templates/plugin-visual.html` — HTML template with all CSS/JS baked in. The assembler script combines it with section files
- `../../scripts/validate-sections-data.js` — JSON contract validator that must pass before rendering `sections-data.json`
- `../../scripts/render-sections.js` — Render script (Node.js) that converts validated `sections-data.json` into HTML section files + metadata.json with correct CSS class names
- `../../scripts/assemble-report.js` — Assembler script (Node.js) that merges template + section files + metadata into the final HTML report
- `../../references/design-system/semantic-tokens.md` — Font pairing and color token selection guide. Read by the orchestrator in Phase 5R step 2 and passed as content to visual-report-writer
- `../../references/design-system/taste-gate.md` — Quality checklist for report writing. Read by the orchestrator in Phase 5R step 2 and passed as content to visual-report-writer
