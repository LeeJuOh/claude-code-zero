---
name: project-recap
description: >
  Generate a visual project recap — rebuild mental model of a project's
  current state, recent activity, key decisions, and cognitive debt hotspots.
  Use when asked to recap, summarize, snapshot, or catch up on a project's
  status, progress, or recent activity — including phrases like "what happened
  recently", "요즘 프로젝트 어떻게 됐어", "catch me up", "status update",
  "what's been going on", or "give me the big picture". Accepts a time window
  (2w, 30d, 3m).
argument-hint: "[time-window: 2w|30d|3m] [--lang <code>]"
allowed-tools: Read, Glob, Grep, Agent, AskUserQuestion, Bash(git log *), Bash(git shortlog *), Bash(git status *), Bash(git branch *), Bash(git rev-parse *), Bash(git diff *), Bash(wc -l *), Bash(node *), Bash(open *), Bash(rm -rf /tmp/project-recap-*)
---

# Project Recap

Generate a visual project recap as a self-contained interactive HTML report. Rebuilds mental model of a project's current state, recent activity, architecture, decisions, and cognitive debt hotspots.

## Instructions

### Input Parsing

Parse the time window from `$1`:

| Input | `--since` value | Notes |
|-------|----------------|-------|
| `2w` | `"2 weeks ago"` | Default if no argument |
| `30d` | `"30 days ago"` | |
| `3m` | `"3 months ago"` | |
| `1w`, `5d`, etc. | Parse `<N><unit>` → `"<N> <unit> ago"` | `w`=weeks, `d`=days, `m`=months |
| Non-time text | Use as context, default to `2w` | |

### Language Detection

Determine the output language:

1. **Explicit argument**: `--lang <code>` (e.g., `--lang ko`, `--lang fr`, `--lang zh`) → use that language. Any language code is valid
2. **User message text**: Detect the language of the message (excluding ref/path) and match it
   - Examples: 한글 → Korean, 日本語 → Japanese, "en español" → Spanish, "auf Deutsch" → German
3. **No other text**: Default to English

### Data Gathering

Collect comprehensive data about the project. Run git commands in parallel where possible.

**Step 1 — Project identity** (parallel):
- Read `README.md`, `CHANGELOG.md`, `package.json` / `Cargo.toml` / `pyproject.toml` / `go.mod` for name, description, version, dependencies
- Read top-level file structure (Glob `*` at root)
- Determine project stage: early dev, stable, actively shipping features

**Step 2 — Recent activity** (parallel):
```
git log --oneline --since=<window>
git log --stat --since=<window>
git shortlog -sn --since=<window>
git log --format="%h|%an|%s|%ai" --since=<window>
```
- Identify which areas of the codebase were most active
- Group commits by theme: feature work, bug fixes, refactors, infrastructure

**Step 3 — Current state** (parallel):
```
git status
git branch --no-merged
```
- Grep for `TODO|FIXME` in recently changed files
- Read progress docs if they exist (plan files, RFC/ADR documents)

**Step 4 — Decision context**:
- Extract rationale from recent commit messages (look for "why" not just "what")
- Read any plan docs, RFCs, or ADRs in the project (Glob for `**/RFC*`, `**/ADR*`, `**/plan*`)
- Read `CLAUDE.md` or similar project conventions

**Step 5 — Architecture scan**:
- Read key source files to understand module structure and dependencies
- Focus on entry points, public API surface, and files most frequently changed in the time window
- Identify the most-changed files: `git log --since=<window> --pretty=format: --name-only | sort | uniq -c | sort -rn | head -20`

**CRITICAL**: Read actual source files — do not infer architecture from file names alone. Understanding module relationships requires reading imports and exports.

### Verification Checkpoint

Before generating the report, produce a structured fact sheet:

1. **Quantitative check**: Commit counts, file counts, line counts, branch counts — all must match git output exactly
2. **Name check**: Every module, function, type, and file path mentioned must exist in the actual codebase
3. **Behavior check**: Every behavioral or architectural description must be traceable to specific source files
4. **Source citation**: For each claim, identify the source (git command output, file:line)

If any claim cannot be sourced, mark it as uncertain rather than stating it as fact.

### Report Generation

Use extended thinking for the analysis above. The depth of analysis directly determines report quality.

Follow `../../references/report-generation-workflow.md` with these parameters:

| Parameter | Value |
|-----------|-------|
| `{output-path}` | `${CLAUDE_PLUGIN_DATA}/reports/{project-name}-project-recap.html` — where `{project-name}` is the project directory name |
| `{template-name}` | `project-recap.html` |
| `{skill-prefix}` | `project-recap` |
| `{expected-sections}` | `8` |
| `{report-title}` | `"Project Recap: {project-name} ({time-window})"` |
| `{aesthetic-hint}` | `"Paper-ink"` |
| `{agent-prompt-data}` | All gathered data: identity, activity, state, decisions, architecture, cognitive debt |

### Gotchas

- **Short time windows in new repos**: `git log --since="2 weeks ago"` in a repo less than 2 weeks old returns the entire history. This is fine, but the report should note the actual project age rather than implying it's a 2-week window.
- **Large repos with high commit volume**: A 30-day window in an active monorepo can return thousands of commits. Use `git shortlog` and `--stat` summaries rather than reading every individual commit. Focus on the top 20 most-changed files.
- **Multiple contributors vs solo project**: Adjust the report tone — a solo project doesn't need contributor breakdown charts. Detect contributor count early and skip the "team activity" framing if it's a single person.
- **No meaningful git history**: Some projects have only an initial commit or use squash merges that hide development history. The recap should acknowledge the limited signal rather than speculating about development patterns.
- **TODO/FIXME noise**: Grepping for `TODO|FIXME` in large codebases can return hundreds of results, many ancient. Filter to only recently changed files (within the time window) and cap at 20 results.
- **Missing README or package manifest**: Not all projects have `README.md` or `package.json`. Don't treat this as an error — infer project identity from directory name and top-level file structure instead.

### Reference Files

- `../../references/report-generation-workflow.md` — Shared report generation steps (resolve paths, delegate, assemble, validate, cleanup)
- `references/section-structure.md` — HTML structure patterns for each report section
