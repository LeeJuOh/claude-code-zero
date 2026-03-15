---
name: agent-extension-visualizing
description: >
  Analyze agent extensions and generate self-contained HTML wiki reports
  with security audit, architecture diagrams, and plugin profiles.
  Currently supports Claude Code plugins.
  Use when asked to analyze, audit, inspect, review, document, or wiki a plugin
  or extension. Default output is an interactive HTML report; use --format md
  for inline markdown. Not for plugin development, installation, or creation.
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

#### Phase 4.5: Environment Compatibility Scan (analyze mode only)

Assess whether the plugin's external requirements are satisfied in the user's environment.
Uses the structured External Requirements block from feature-architect output.

**Step 1**: Extract the `requirements` fenced code block from feature-architect output.
Parse each non-header line as pipe-delimited: `name|type|required|help`.

If no `requirements` block found or empty → set verdict to READY, skip to Phase 5/5R.

**Step 2**: Construct and run a single bash block. Build dynamically from the requirements list:

```bash
echo "=== ENV_COMPAT ==="
# Per CLI requirement:
echo -n "{name}|CLI|{required}|" ; which {name} >/dev/null 2>&1 && echo "AVAILABLE" || echo "MISSING"
# Per MCP requirement:
echo -n "{name}|MCP|{required}|" ; grep -q '"{name}"' ~/.claude/.mcp.json 2>/dev/null && echo "AVAILABLE" || echo "MISSING"
# Per ENV requirement (substitute {name} with actual variable name):
# e.g., GITHUB_TOKEN → [ -n "$GITHUB_TOKEN" ]
echo -n "{name}|ENV|{required}|" ; [ -n "${name}" ] && echo "SET" || echo "UNSET"
# Per Plugin requirement:
echo -n "{name}|Plugin|{required}|" ; ls ~/.claude/plugins/cache/ 2>/dev/null | grep -q "{name}" && echo "AVAILABLE" || echo "MISSING"
echo "=== END ==="
```

Do NOT use `$()` command substitution — triggers separate security prompt.

**Step 3**: Parse output. Each line: `name|type|required|status`.
Combine with feature-architect's help text to build the final table.

Determine verdict:

| Verdict | Condition |
|---------|-----------|
| READY | All requirements AVAILABLE/SET |
| PARTIAL | All required AVAILABLE/SET, some optional MISSING/UNSET |
| ACTION_NEEDED | Any required MISSING/UNSET |

Build requirements table: `[{name, type, required, status, help}]`

Apply criteria from `references/platforms/claude-code/analysis-criteria.md` (Environment Compatibility section).

Save verdict + table for Phase 5/5R.

#### Phase 5: Report Assembly (inline markdown)

For `security` mode, `overview` mode, or `analyze` mode with `--format md` — assemble inline markdown report:

Assemble the report using `references/platforms/claude-code/report-template.md` format:

- **`overview` mode**: Identity + Component Inventory sections only
- **`security` mode**: Security-focused report with risk summary, permission matrix, findings
- **`analyze` mode (--format md)**: Full report with analysis and Plugin Profile

For Plugin Profile, apply criteria from `references/platforms/claude-code/analysis-criteria.md`.
For risk levels, apply rules from `references/platforms/claude-code/security-rules.md`.
For Environment Compatibility, include the verdict and requirements table from Phase 4.5 (if available).

Output the report in the detected language, using `references/platforms/claude-code/report-template.md` format.
Translate all section headers, labels, and descriptions to the target language.
Keep component names, file paths, and technical terms (CRITICAL, HIGH, MEDIUM, LOW) untranslated.

Output the report directly to the user (inline markdown).

#### Phase 5R: HTML Report Generation (analyze mode — default format)

For `analyze` mode with HTML format (the default), generate a self-contained HTML file.

1. **Determine output path**:

   Default output path: `~/.claude-code-zero/vision-powers/reports/{YYYY-MM-DD}-{plugin-name}-report.html`

   Where:
   - `{YYYY-MM-DD}` is today's date (e.g., `2026-03-14`)
   - `{plugin-name}` is from plugin.json name field (or directory name if no plugin.json)

   The Write tool creates parent directories automatically — no `mkdir` needed.

   **Existing report check**: Before generating, use Glob to search for `*-{plugin-name}-report.html` in `~/.claude-code-zero/vision-powers/reports/`. If any exist, use AskUserQuestion:

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
     environment compatibility: { verdict, requirements table } (from Phase 4.5; omit if READY with no requirements)
   })
   ```
   The agent writes `section-1.html` through `section-10.html` and `metadata.json` to the sections directory.

5. **Assemble report** — run the assembler script to combine template + sections:
   ```
   Bash(node {assembler-path} --template {template-path} --sections {sections-dir} --metadata {sections-dir}/metadata.json --output {output-path})
   ```

6. **Report validation** — after assembly, Read the output HTML file and verify:
   - No unreplaced section placeholders (`<!-- SECTION_`)
   - Every `<section>` has meaningful content beyond just a heading
   - Mermaid `<pre class="mermaid">` blocks contain diagram syntax, not just placeholder comments
   - Chart.js data is populated (not empty object/array)

   If issues found, fix via Edit on the output file.

   If `mcp__claude-in-chrome__*` tools are available, validate in Chrome:
   1. Open the report via `Bash(open {output-path})` — Chrome extensions cannot navigate to `file://` URLs directly, so let the system browser open it first
   2. Call `tabs_context_mcp` to discover the newly opened tab (match by `file://` URL or report filename in the tab title)
   3. Use `javascript_tool` on the discovered tab to check for Mermaid render errors and empty sections
   4. Fix any issues found via Edit on the output file

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

### Reference Files

- `references/platforms/claude-code/analysis-criteria.md` — Plugin Profile criteria (component inventory, docs, quality checklist)
- `references/platforms/claude-code/security-rules.md` — Security patterns and risk classification
- `references/platforms/claude-code/report-template.md` — Report output format templates (inline markdown)
- `references/section-structure.md` — HTML structure patterns for each report section. Visual-report-writer reads it to generate section files
- `../../templates/agent-extension-visual.html` — HTML template with all CSS/JS baked in. The assembler script combines it with section files
- `../../scripts/assemble-report.js` — Assembler script (Node.js) that merges template + section files + metadata into the final HTML report
- `../../references/design-system/font-system.md` — Font pairing selection guide. Visual-report-writer reads it directly
- `../../references/design-system/anti-slop-rules.md` — Quality checklist for report writing. Visual-report-writer reads it directly
