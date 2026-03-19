---
name: agent-extension-visualizing
description: >
  Analyze agent extensions and generate self-contained HTML wiki reports
  with security audit, architecture diagrams, and plugin profiles.
  Currently supports Claude Code plugins.
  Use when asked to analyze, audit, inspect, review, document, or wiki a plugin
  or extension — including phrases like "이 플러그인 뭐야", "what does this plugin do",
  "tell me about this extension", "break down this plugin", or "generate a report
  for this plugin". Also triggers on GitHub plugin URLs or local plugin paths.
  Default output is an interactive HTML report; use --format md for inline markdown.
argument-hint: "<path-or-url> [--format html|md] [--lang <code>]"
compatibility: "Requires gh CLI for GitHub URL analysis"
allowed-tools: Read, Glob, Grep, Agent, AskUserQuestion, Bash(gh repo clone *), Bash(rm -rf /tmp/agent-extension-visual-*), Bash(git branch *), Bash(git log *), Bash(git rev-parse *), Bash(open *), Bash(node *), Bash(which *), Bash(echo *)
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
   - Examples: 한글 → Korean, 日本語 → Japanese, "en español" → Spanish, "auf Deutsch" → German
3. **URL only with no other text**: Use AskUserQuestion to ask the user's preferred language

Pass the detected language to sub-agents and use it for Phase 5 report assembly.

### Analysis Mode Detection

Determine **what** to analyze:

| Mode | Trigger Keywords | Scope |
|------|-----------------|-------|
| `analyze` **(default)** | "analyze", "분석", "inspect", "report", "wiki", "document", "리포트", "문서화" | Full analysis and Plugin Profile |
| `security` | "security audit", "보안 감사", "권한 분석", "permission" | Security only |
| `overview` | "overview", "개요", "요약", "summary" | Identity + inventory only |

### Output Format Detection

Determine **how** to present the result (independent of analysis mode):

| Format | Trigger | Applies to |
|--------|---------|------------|
| HTML **(default)** | Default for `analyze` mode | `analyze` only |
| Inline markdown | "--format md", "markdown", "md", "인라인", "텍스트" | `analyze` only |
| Inline markdown **(always)** | — | `security`, `overview` (too brief for HTML) |

### Workflow

#### Phase 1: Source Acquisition

- **Local path**: Verify directory exists, proceed directly
- **Installed plugin**: Search `~/.claude/plugins/cache/` for matching directory
- **GitHub URL**: Clone to `/tmp/agent-extension-visual-{dirname}`:
  1. Generate `{dirname}` — pick any 8-character hex string yourself (e.g., `a1b2c3d4`)
  2. Clone directly (no mkdir needed — git creates the target directory):
     ```
     Bash(gh repo clone {owner/repo} /tmp/agent-extension-visual-{dirname})
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
| GitHub URL | `github` | `/tmp/agent-extension-visual-{dirname}` | `https://github.com/{owner}/{repo}/blob/{branch}` |

#### Phase 2: Discovery

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
| Hook config | `hooks/hooks.json` or `hooks/*.json` |
| MCP config | `.mcp.json` |
| LSP config | `.lsp.json` |
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

Read identity files in a single message with parallel Read calls:

- `plugin.json` (or `.claude-plugin/plugin.json` — whichever Phase 2 found)
- `hooks/hooks.json` (only if found in Phase 2)

Existence of LICENSE, CHANGELOG.md, tests/ is already known from Phase 2.

Do NOT read README.md, SKILL.md, agent.md, command.md, or hook script files.
Sub-agents read these files directly — the feature-architect reads README.md in its own analysis procedure. Reading them here wastes tokens through duplication.

Output for Phase 4: plugin identity + file path inventory + existence flags + language.

#### Phase 4: Parallel Analysis

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

Diagnose whether this plugin is a good fit for the user's current environment — not just "can it run?" but "should it be installed here?" Like a doctor assessing whether a new medication is appropriate given the patient's existing prescriptions, evaluate installation status, context budget impact, functional overlap with existing plugins, trigger collisions, hook impact, and component dependencies.

**Step 1**: Extract analyzed plugin characteristics from feature-architect output:
- Plugin name and at-a-glance description (from Plugin Summary)
- Skill names and trigger descriptions (from Functionality Analysis → Skills table)
- Skill description character counts (sum of all description text)
- Skills with `disable-model-invocation: true` (zero always-on context cost)
- Hook events, count, and **types** (command / prompt / agent) (from Hooks table; 0 if no hooks)
- Hooks that return `additionalContext` (if identifiable from hook scripts)
- External requirements (`requirements` code block; empty if none)
- MCP server count (from `.mcp.json` if present)
- Component interaction patterns:
  - Skills with `allowed-tools` containing `Skill(...)` → Skill→Skill dependency
  - Skills with `context: fork` + `agent` referencing non-plugin agents → Skill→External Agent
  - Agent `skills:` field entries not in this plugin → Agent→External Skill
  - Agent `mcpServers:` string references (not inline) → Agent→External MCP
  - Skills with `allowed-tools` containing `mcp__*` patterns → Skill→MCP dependency

**Step 2**: Run the environment scan script:

```
Bash(node {plugin-root}/scripts/env-fit-scan.js --plugin-name {plugin-name})
```

Where `{plugin-root}` is this plugin's root directory and `{plugin-name}` is from Phase 3. The script outputs JSON with: `install_status`, `installed_plugins`, `installed_skills` (with `total_desc_chars`, `disabled_count`), `local_skills`, `hook_inventory` (with `total`, `type_counts`), and `context_metrics` (with `mcp_servers`).

If the plugin has external requirements (from Step 1), also check them with simple commands:

| Type | Check pattern | Status values |
|------|--------------|---------------|
| CLI | `which {name} >/dev/null 2>&1` | AVAILABLE / MISSING |
| MCP | `grep -q '"{name}"' ~/.claude/.mcp.json 2>/dev/null` | AVAILABLE / MISSING |
| ENV | `[ -n "${name}" ]` | SET / UNSET |

**Step 3**: Parse the JSON output and perform six diagnostic analyses.

**3A: Installation Status** (from `install_status` field)

- `INSTALLED` → `ALREADY_INSTALLED`
- `NOT_INSTALLED` → `NEW`

**3B: Dependency Check** (from Step 2 requirement checks, if any)

Build requirements table: `[{name, type, required, status, help}]`.
Determine: READY / PARTIAL / ACTION_NEEDED.
If no requirements block existed → READY.

**3C: Context Budget Analysis** (from `installed_skills`, `local_skills`, `context_metrics` fields + Step 1 data)

Calculate the plugin's context footprint using dual scenarios.

1. **Skill description chars**: Sum description chars for skills in this plugin that do NOT have `disable-model-invocation: true`. Add to current environment total from `installed_skills.total_desc_chars` + `local_skills.total_desc_chars`.
   - 200K scenario: compare against 16,000 char fallback budget
   - 1M scenario: compare against ~80,000 char budget (2% of 1M)

2. **MCP tool surface**: Count MCP servers this plugin adds (from `.mcp.json`). Estimate tokens using heuristic: servers × 25 tools × 200 tokens/tool.
   - Current MCP token estimate: `context_metrics.mcp_servers × 25 × 200`
   - Adding: `new_servers × 25 × 200`
   - 200K scenario: compare projected total against ~20,000 token cap (10% of 200K)
   - 1M scenario: compare projected total against ~100,000 token cap (10% of 1M)

3. **Hook context injection**: Check if any hooks in this plugin return `additionalContext` or use `type: prompt`/`type: agent`. Note but don't score heavily — these are per-event, not always-on.

4. **Zero-cost skills**: Note how many skills use `disable-model-invocation: true` — these have no always-on context cost and should be highlighted as a positive design choice.

Severity determination: present both 200K and 1M scenarios in the report. For the overall severity, use the scenario matching the **user's current session model** (e.g., Opus 4.6[1M] → 1M scenario, Sonnet/Haiku → 200K scenario). If the model context cannot be determined, default to 200K as fallback.

**3D: Functional Overlap & Trigger Analysis** (compare Step 1 skills vs `installed_skills` + `local_skills` output)

Compare the analyzed plugin's skills against all installed/local skill descriptions. For each skill, scan for semantic overlap — considering purpose, trigger phrases, and approach.

Classify each meaningful overlap:

| Classification | Condition | Example |
|----------------|-----------|---------|
| DUPLICATE | Same purpose AND same triggers | Two "commit message generator" skills |
| OVERLAP | Similar purpose, partial trigger overlap | Both handle "code review" but different scope |
| COMPLEMENT | Related domain, different purpose | One analyzes PRs, other generates changelogs |
| UPGRADE | Same purpose but analyzed plugin is superior | More features, better design, broader coverage |

For DUPLICATE/OVERLAP findings, assess trigger collision severity:
- **HIGH**: Near-identical descriptions → Claude unpredictably chooses
- **MEDIUM**: Shared keywords but distinguishable intent/scope
- **LOW**: Thematically related but clearly different triggers

**3E: Hook Impact** (from `hook_inventory` field)

- Current hook count (`hook_inventory.total`) + adding → projected total
- Distinguish hook types from `hook_inventory.type_counts`: command/http (lightweight, zero context) vs prompt/agent (LLM call per event)
- Flag: projected hooks > 15 (HIGH), 10-15 (MEDIUM)
- Same-event collisions with existing plugins (informational)

**3F: Component Dependency Analysis** (from Step 1 interaction patterns + `installed_skills`/`local_skills`/`context_metrics` output)

For each cross-plugin reference found in Step 1:
1. Check if the referenced component exists in the user's environment (installed plugins, local skills, MCP servers)
2. Classify as AVAILABLE or MISSING
3. Internal references (within the same plugin) → INTERNAL, skip

Types to check:
- Skill → Skill: `allowed-tools: Skill(plugin:name)` or instruction-based invocation
- Agent → Skill: `skills:` field with non-plugin skill names
- Skill/Agent → MCP: `mcp__server__*` in allowed-tools, or `mcpServers:` string references
- Skill → Agent: `context: fork` + `agent` field referencing external agent

MISSING dependencies → at least CONDITIONAL verdict.

**Step 4**: Determine overall verdict using `references/platforms/claude-code/analysis-criteria.md` (Environment Fit section).

Verdict priority (highest severity wins):

1. Required dependency MISSING/UNSET → at least CONDITIONAL
2. Required dependency MISSING + DUPLICATE overlap → CONFLICTING
3. DUPLICATE skill with HIGH trigger collision → at least REDUNDANT
4. Multiple OVERLAP findings covering > 50% of plugin's skills → at least REDUNDANT
5. Skill description budget exceeded in the user's context scenario → at least CONDITIONAL; exceeded in both 200K and 1M → CONFLICTING
6. MCP tool surface would exceed 10% cap in the user's context scenario → at least CONDITIONAL; exceeded in both → CONFLICTING
7. Cross-plugin component dependency MISSING → at least CONDITIONAL
8. Projected hooks > 15 or hook context injection HIGH → at least CONDITIONAL
9. All clear → RECOMMENDED

**Step 5**: Build diagnosis data for Phase 5/5R:

```
environment_fit: {
  verdict: RECOMMENDED | CONDITIONAL | REDUNDANT | CONFLICTING,
  verdict_summary: "1-2 sentence diagnosis in output language",
  installation_status: NEW | ALREADY_INSTALLED,
  context_budget: {
    skill_desc: { current_chars, adding_chars, budget_200k, budget_1m, severity },
    mcp_tools: { current_servers, adding_servers, est_tokens, budget_200k, budget_1m, severity },
    hook_injection: [{ hook_name, type, impact_note }],
    zero_cost_skills: N
  },
  dependency_check: { verdict, requirements[] },
  overlap_findings: [{ analyzed_skill, existing_skill, classification, detail }],
  trigger_collisions: [{ skills, severity, collision_phrases }],
  hook_impact: { current, adding, projected, types: {command, prompt, agent}, event_collisions[], severity },
  component_deps: [{ source, target, dep_type, status }],
  recommendations: ["actionable 1-line recommendation"]
}
```

Omit empty categories. Save for Phase 5/5R.

#### Phase 5: Report Assembly (inline markdown)

For `security` mode, `overview` mode, or `analyze` mode with `--format md` — assemble inline markdown report:

Assemble the report using `references/platforms/claude-code/report-template.md` format:

- **`overview` mode**: Identity + Component Inventory sections only
- **`security` mode**: Security-focused report with risk summary, permission matrix, findings
- **`analyze` mode (--format md)**: Full report with analysis, Environment Fit Diagnosis, and Plugin Profile

For Plugin Profile, apply criteria from `references/platforms/claude-code/analysis-criteria.md`.
For risk levels, apply rules from `references/platforms/claude-code/security-rules.md`.
Environment Fit Diagnosis is a standalone section between Feature Deep Dive and Usage (not part of Plugin Profile). Include the full diagnosis from Phase 4.5: verdict, context budget (200K/1M scenarios), installation status, dependency check, overlap/trigger findings, hook impact, component dependencies, and recommendations.

Output the report in the detected language, using `references/platforms/claude-code/report-template.md` format.
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

2. **Resolve reference paths**:
   - Template: resolve `../../templates/agent-extension-visual.html` to absolute path
   - Section structure: resolve `references/section-structure.md` to absolute path
   - Font system: resolve `../../references/design-system/font-system.md` to absolute path
   - Anti-slop rules: resolve `../../references/design-system/anti-slop-rules.md` to absolute path
   - Assembler script: resolve `../../scripts/assemble-report.js` to absolute path
   - Shared directory: resolve `../../shared/` to absolute path
   Do NOT read these files — they are passed as paths to the agent and assembler.

3. **Create sections temp directory**:
   The sections directory path: `/tmp/agent-extension-visual-{dirname}-sections/`
   (reuse the same `{dirname}` from Phase 1 if GitHub clone, or generate one for local sources)
   No mkdir needed — the visual-report-writer creates files via Write, which auto-creates directories.

4. **Delegate to visual-report-writer agent**:
   ```
   Task(subagent_type: "vision-powers:visual-report-writer", prompt: {
     feature-architect analysis results (full text, including Plugin Summary and Raw Content Excerpts),
     security-auditor analysis results (full text),
     plugin metadata (name, version, author, license, keywords, description),
     sections output directory (absolute path from step 3),
     output language,
     section structure path (absolute path from step 2),
     font system path (absolute path from step 2),
     anti-slop rules path (absolute path from step 2),
     report title: "Agent Extension Visual: {plugin-name}",
     aesthetic hint: "Editorial",
     source context: { source_type, source_base, github_url (if applicable) },
     environment fit diagnosis: { verdict, verdict_summary, installation_status,
       context_budget: { skill_desc, mcp_tools, hook_injection, zero_cost_skills },
       dependency_check, overlap_findings, trigger_collisions,
       hook_impact: { current, adding, projected, types, event_collisions, severity },
       component_deps,
       recommendations } (from Phase 4.5; when RECOMMENDED with no findings, pass minimal verdict-only data)
   })
   ```
   The agent writes `section-1.html` through `section-11.html` and `metadata.json` to the sections directory.

5. **Assemble report** — run the assembler script to combine template + sections:
   ```
   Bash(node {assembler-path} --template {template-path} --sections {sections-dir} --metadata {sections-dir}/metadata.json --shared {shared-dir-path} --output {output-path})
   ```

6. **Report validation** — run the validation script:
   ```
   Bash(node {validator-path} {output-path} --expected-sections 11)
   ```
   `{validator-path}` = `{plugin-root}/scripts/validate-report.js`

   The script checks: unreplaced placeholders (section + metadata), section content density, Mermaid diagram-type keywords, Chart.js data arrays, and section count. It exits 0 on PASS, 1 on FAIL with a list of issues.

   If FAIL: fix the reported issues via Edit on the output file, then re-run the script until PASS.

   **Optional Chrome visual verification** — only if `mcp__claude-in-chrome__*` tools are available:
   1. Start a local HTTP server to serve the report (Chrome extensions cannot access `file://` URLs):
      ```
      Bash(python3 -m http.server 0 -d "$(dirname {output-path})" 2>&1 & echo $!)
      ```
      Capture the PID and port from the output.
   2. Call `tabs_context_mcp` (with `createIfEmpty: true`) to get or create an MCP tab group.
   3. Use `navigate` to open `http://localhost:{port}/{filename}` in the MCP tab.
   4. Use `javascript_tool` to check for Mermaid render errors (`document.querySelectorAll('.mermaid svg').length`) and empty sections.
   5. Fix any issues found via Edit on the output file.
   6. Kill the server: `Bash(kill {pid} 2>/dev/null)`

7. **Report completion + Feedback Loop**:

   Use `AskUserQuestion` with the `file://` URL embedded in the question text itself:
   ```
   Report generated: file://{output-path}

   Please review the report. Any changes needed, or should I clean up temporary files?
   ```
   (Translate to output language. `{output-path}` is the actual path determined in step 1. The `file://` URL must always be included — it is how the user opens the report.)

   - If the user requests changes → apply modifications to the HTML file, then ask again with the same URL
   - If the user confirms completion → proceed to Phase 7

#### Phase 7: Cleanup

Clean up temporary files:
```
Bash(rm -rf /tmp/agent-extension-visual-{dirname}-sections)
```

If the source was also cloned from GitHub:
```
Bash(rm -rf /tmp/agent-extension-visual-{dirname})
```

After cleanup, suggest that the user can run `/fact-check` to verify the report's accuracy. This is optional — just a one-line suggestion, not an automatic invocation.

### Gotchas

- **`$()` command substitution triggers security prompt**: The `Bash(echo $(date))` pattern causes Claude Code to show a separate permission dialog regardless of `allowed-tools`. Use literal values or `Bash(date)` with separate processing instead.
- **GitHub rate limiting**: `gh repo clone` and `gh api` calls can fail silently with HTTP 403 when the user's token is rate-limited. If clone fails, check `gh auth status` before retrying.
- **Plugin cache has multiple versions**: `~/.claude/plugins/cache/` stores every installed version (e.g., `2.6.0/`, `2.7.1/`). The Phase 4.5 environment scan deduplicates by mtime, but if you manually scan the cache, always pick the latest version per plugin to avoid counting stale entries.
- **Large plugin batching threshold**: The 15-component threshold for splitting feature-architect is approximate. Plugins with many small commands but few skills may not need splitting, while plugins with 10 dense skills might. Use judgment — the goal is keeping each agent under context limits.
- **Existing report overwrite prompt**: The "create new or update" prompt uses AskUserQuestion. If the user is running non-interactively or in a pipeline, this blocks. Default to "create new" if no user response is available.
- **Temp directory collision**: The 8-char hex `{dirname}` has a negligible collision risk, but if a previous run crashed without cleanup, `/tmp/agent-extension-visual-*` directories may linger. The cleanup phase handles the current run only — it does not garbage-collect stale dirs.

### Reference Files

- `references/platforms/claude-code/analysis-criteria.md` — Plugin Profile criteria (component inventory, docs, quality checklist)
- `references/platforms/claude-code/security-rules.md` — Security patterns and risk classification
- `references/platforms/claude-code/report-template.md` — Report output format templates (inline markdown)
- `references/section-structure.md` — HTML structure patterns for each report section. Visual-report-writer reads it to generate section files
- `../../templates/agent-extension-visual.html` — HTML template with all CSS/JS baked in. The assembler script combines it with section files
- `../../scripts/assemble-report.js` — Assembler script (Node.js) that merges template + section files + metadata into the final HTML report
- `../../references/design-system/font-system.md` — Font pairing selection guide. Visual-report-writer reads it directly
- `../../references/design-system/anti-slop-rules.md` — Quality checklist for report writing. Visual-report-writer reads it directly
