---
name: extension-analyzer
description: |
  Claude Code extension analyzer that scans plugins, skills, commands, hooks,
  agents, MCP servers, and rules to generate visual reports with risk assessment
  and quality scores.

  Trigger phrases: "analyze plugin", "audit plugin", "inspect plugin",
  "analyze extension", "security audit", "plugin report",
  "what does this plugin do", "analyze <path>", "inspect <path>",
  "plugin analysis", "plugin security", "plugin overview",
  "extension analysis", "extension audit",
  "플러그인 분석", "보안 감사", "확장 분석", "플러그인 검사".

  Do NOT use for: plugin development, plugin installation, plugin validation,
  or plugin creation. Use plugin-dev skills for those tasks.
argument-hint: "<path-or-url> [--lang ko|en|ja]"
allowed-tools:
  - Read
  - Glob
  - Grep
  - Write
  - Task
  - AskUserQuestion
  - Bash(gh repo clone *)
  - Bash(rm -rf /tmp/extension-analyzer-*)
  - Bash(ls *)
---

# Extension Analyzer

Analyze Claude Code extensions and generate visual reports with security audit and quality scores.

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

| Mode | Trigger Keywords | Output Scope |
|------|-----------------|--------------|
| `analyze` (default) | "analyze", "분석", "inspect", "report" | Full 7-category report |
| `security` | "security audit", "보안 감사", "권한 분석", "permission" | Security & permissions only |
| `overview` | "overview", "개요", "요약", "summary" | Identity + component inventory only |

### Workflow

#### Phase 1: Source Acquisition

- **Local path**: Verify directory exists, proceed directly
- **Installed plugin**: Search `~/.claude/plugins/cache/` for matching directory
- **GitHub URL**: Clone to `/tmp/extension-analyzer-{random}`:
  ```
  Bash(gh repo clone {owner/repo} /tmp/extension-analyzer-{random})
  ```
- **Current directory**: Use cwd

If source cannot be found, inform user and stop.

#### Phase 2: Discovery

Scan the target directory for all plugin components using Glob:

**Core components:**
```
.claude-plugin/plugin.json
plugin.json
skills/*/SKILL.md
skills/**/*              (auxiliary files: templates, examples, scripts within skill dirs)
commands/*.md
agents/*.md
hooks/hooks.json
hooks/*.json
.mcp.json
.lsp.json
settings.json
CLAUDE.md
README.md
LICENSE*
```

**Supplementary structure:**
```
scripts/                 (hook/utility scripts)
tests/                   (test infrastructure)
lib/                     (shared libraries)
docs/                    (additional documentation)
CHANGELOG.md             (version history)
```

Build a component inventory: count and list of each type found, including `[LSP]` for `.lsp.json`.

#### Phase 3: Metadata Collection

Read only essential identity files:

1. **`plugin.json` / `.claude-plugin/plugin.json`** → name, version, author, license, keywords, description, homepage, repository, outputStyles, lspServers
2. **`README.md`** → exists/absent
3. **`LICENSE`** → exists/absent, type
4. **`CHANGELOG.md`** → exists/absent
5. **`tests/`** → exists/absent (from Phase 2 Glob)

Do NOT read individual SKILL.md, agent.md, command.md, or hook files here.
Sub-agents will read component files directly — this avoids duplicate reads
and reduces orchestrator context usage.

Output for Phase 4: plugin identity + file path inventory + existence flags + language.

#### Phase 4: Parallel Analysis

For `overview` mode, skip this phase — go directly to Phase 5.

For `analyze` and `security` modes, delegate to agents in parallel.

**Agent prompt**: Provide each agent with:
- Plugin identity (name, version, author — from plugin.json)
- Target directory path
- Component file paths grouped by type (from Phase 2 Glob)
- Output language
- Analysis mode

**For `analyze` mode with large plugins (skills > 8)** — split feature-architect into batches:

```
Task(subagent_type: "extension-analyzer:feature-architect", prompt: {skills 1..ceil(N/2) + agents + hooks})
Task(subagent_type: "extension-analyzer:feature-architect", prompt: {skills ceil(N/2)+1..N + commands + MCP + LSP})
Task(subagent_type: "extension-analyzer:security-auditor", prompt: {all file paths})
```

All three run in parallel. Merge feature-architect batch results before Phase 5.

**For `analyze` mode with standard plugins (skills <= 8)**:

```
Task(subagent_type: "extension-analyzer:feature-architect", prompt: {all file paths})
Task(subagent_type: "extension-analyzer:security-auditor", prompt: {all file paths})
```

**For `security` mode** — launch only security-auditor:

```
Task(subagent_type: "extension-analyzer:security-auditor", prompt: {all file paths})
```

#### Phase 5: Report Assembly

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

#### Phase 6: Cleanup

If the source was cloned from GitHub:
```
Bash(rm -rf /tmp/extension-analyzer-{directory})
```

### Reference Files

- `references/analysis-criteria.md` — 7-category evaluation criteria and weights
- `references/security-rules.md` — Security patterns and risk classification
- `references/report-template.md` — Report output format templates
