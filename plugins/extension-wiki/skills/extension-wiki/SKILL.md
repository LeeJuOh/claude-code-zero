---
name: extension-wiki
description: >
  Analyze Claude Code extensions to generate visual reports with security audit,
  architecture review, and quality scores. Use when asked to analyze, audit,
  inspect, review, document, or generate a wiki for a plugin or extension.
  Supports inline markdown reports and self-contained HTML wiki reports.
  Not for plugin development, installation, validation, or creation — use
  plugin-dev skills for those.
argument-hint: "<path-or-url> [--lang ko|en|ja] [--output <path>]"
allowed-tools:
  - Read
  - Glob
  - Grep
  - Write
  - Task
  - AskUserQuestion
  - Bash(gh repo clone *)
  - Bash(ls *)
  - Bash(rm -rf /tmp/extension-wiki-*)
---

# Extension Wiki

Analyze Claude Code extensions and generate visual reports (inline markdown or self-contained HTML) with security audit and quality scores.

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

1. **Explicit language argument**: `--lang ko`, `--lang en`, `--lang ja` etc. → use that language
2. **User message text**: If the message (excluding URL/path) contains non-English text, use that language
   - Korean: 한글 텍스트, "한국어", "한글로", "플러그인 분석", "보안 감사"
   - Japanese: 日本語テキスト, "日本語で"
   - English: English text, "in English"
3. **URL only with no other text**: Use AskUserQuestion to ask the user's preferred language:
   "Which language should the report be in?" → Korean / English / Other

Pass the detected language to sub-agents and use it for Phase 5 report assembly.

### Analysis Mode Detection

| Mode | Trigger Keywords | Output |
|------|-----------------|--------|
| `analyze` (default) | "analyze", "분석", "inspect", "report" | Inline markdown (full 7-category) |
| `security` | "security audit", "보안 감사", "권한 분석", "permission" | Inline markdown (security only) |
| `overview` | "overview", "개요", "요약", "summary" | Inline markdown (identity + inventory) |
| `report` | "wiki", "document", "docs", "html", "문서화", "위키", "리포트 생성" | Self-contained HTML file |

### Workflow

#### Phase 1: Source Acquisition

- **Local path**: Verify directory exists, proceed directly
- **Installed plugin**: Search `~/.claude/plugins/cache/` for matching directory
- **GitHub URL**: Clone to `/tmp/extension-wiki-{random}`:
  ```
  Bash(gh repo clone {owner/repo} /tmp/extension-wiki-{random})
  ```
  For subpath URLs (`github.com/owner/repo/tree/branch/plugins/foo`):
  1. Extract `owner/repo` for cloning
  2. Extract the subpath after `/tree/{branch}/` (e.g., `plugins/foo`)
  3. Clone the full repo, then set the analysis target to the subpath within the clone
- **Current directory**: Use cwd

If source cannot be found, inform user and stop.

#### Phase 2: Discovery

Scan the target directory for all plugin components.

**Step 1**: Run 3 Glob calls in parallel (single message):

| # | Pattern | Captures |
|---|---------|----------|
| 1 | `**/*.md` | SKILL.md, agent .md, command .md, CLAUDE.md, README.md, CHANGELOG.md |
| 2 | `**/*.json` | plugin.json, hooks.json, .mcp.json, .lsp.json, settings.json |
| 3 | `LICENSE*` | License files |

**Step 2**: If Glob results are sparse (< 5 files found), verify with `Bash(ls)`:
```
Bash(ls {target-directory}/)
```
Then run targeted Glob on discovered directories (e.g., `skills/**/*`, `agents/**/*`).

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

#### Phase 3: Metadata Collection

Read identity files in a single message with parallel Read calls:

- `plugin.json` (or `.claude-plugin/plugin.json` — whichever Phase 2 found)
- `README.md` (only if found in Phase 2)
- `hooks/hooks.json` (only if found in Phase 2)

Existence of LICENSE, CHANGELOG.md, tests/ is already known from Phase 2.

Do NOT read SKILL.md, agent.md, command.md, or hook script files.
Sub-agents read component files directly — avoids duplicate reads.

Output for Phase 4: plugin identity + file path inventory + existence flags + language.

#### Phase 4: Parallel Analysis

For `overview` mode, skip this phase — go directly to Phase 5.

For `analyze`, `security`, and `report` modes, delegate to agents in parallel.

**Agent prompt**: Provide each agent with:
- Plugin identity (name, version, author, description — from plugin.json)
- Target directory path
- Component file paths grouped by type (from Phase 2 Glob)
- Output language
- Analysis mode

**For `report` mode** — same dispatch as `analyze` mode (both agents always needed for HTML report).

**For `analyze` mode with large plugins (total components > 15)** — split feature-architect into batches.

Count total = skills + agents + commands. Split each type in half:

```
S = number of skills, A = number of agents, C = number of commands

Task(subagent_type: "extension-wiki:feature-architect", prompt: {
  skills 1..ceil(S/2) + agents 1..ceil(A/2) + commands 1..ceil(C/2)
})
Task(subagent_type: "extension-wiki:feature-architect", prompt: {
  skills ceil(S/2)+1..S + agents ceil(A/2)+1..A + commands ceil(C/2)+1..C + MCP + LSP
})
Task(subagent_type: "extension-wiki:security-auditor", prompt: {all file paths})
```

MCP, LSP, hooks, and rules are lightweight — keep them in Batch 2 only.
All three tasks run in parallel. Merge feature-architect batch results before Phase 5.

**For `analyze` mode with standard plugins (total components <= 15)**:

```
Task(subagent_type: "extension-wiki:feature-architect", prompt: {all file paths})
Task(subagent_type: "extension-wiki:security-auditor", prompt: {all file paths})
```

**For `security` mode** — launch only security-auditor:

```
Task(subagent_type: "extension-wiki:security-auditor", prompt: {all file paths})
```

#### Phase 5: Report Assembly

For `analyze`, `security`, and `overview` modes — assemble inline markdown report:

Assemble the report using `references/report-template.md` format:

- **`overview` mode**: Identity + Component Inventory sections only
- **`security` mode**: Security-focused report with risk summary, permission matrix, findings
- **`analyze` mode**: Full report with all 7 categories, scores, and visual bars

For scoring, apply criteria from `references/analysis-criteria.md`.
For risk levels, apply rules from `references/security-rules.md`.

Output the report in the detected language, using `references/report-template.md` format.
Translate all section headers, labels, and descriptions to the target language.
Keep component names, file paths, and technical terms (CRITICAL, HIGH, MEDIUM, LOW) untranslated.

Output the report directly to the user (inline markdown).

#### Phase 5R: HTML Report Generation (report mode only)

For `report` mode, generate a self-contained HTML file instead of inline markdown.

1. **Determine output path**:
   - If `--output <path>` is specified → use that path
   - Otherwise → `{target-directory}/extension-wiki-report.html`

2. **Delegate to report-writer agent**:
   ```
   Task(subagent_type: "extension-wiki:report-writer", prompt: {
     feature-architect analysis results (full text, including Plugin Summary and Raw Content Excerpts),
     security-auditor analysis results (full text),
     plugin metadata (name, version, author, license, keywords, description),
     output file path,
     output language
   })
   ```

3. **Report completion**: After the agent writes the HTML file, output the `file:///` URL to the user:
   ```
   Report generated: file:///{absolute-path}/extension-wiki-report.html
   ```

#### Phase 6: Cleanup

If the source was cloned from GitHub:
```
Bash(rm -rf /tmp/extension-wiki-{directory})
```

### Reference Files

- `references/analysis-criteria.md` — 7-category evaluation criteria and weights
- `references/security-rules.md` — Security patterns and risk classification
- `references/report-template.md` — Report output format templates (inline markdown)
- `references/html-report-template.md` — HTML report structure and style guide (report mode)
