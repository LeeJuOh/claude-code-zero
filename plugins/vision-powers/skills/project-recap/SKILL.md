---
name: project-recap
description: >
  Generate a visual project recap — rebuild mental model of a project's
  current state, recent activity, key decisions, and cognitive debt hotspots.
  Use when asked to recap, summarize, snapshot, or catch up on a project's
  status, progress, or recent activity. Accepts a time window (2w, 30d, 3m).
  Not for generating changelogs, release notes, or commit-level diffs.
argument-hint: "[time-window: 2w|30d|3m] [--lang ko|en|ja]"
allowed-tools: Read, Glob, Grep, Agent, AskUserQuestion, Bash(git log *), Bash(git shortlog *), Bash(git status *), Bash(git branch *), Bash(git rev-parse *), Bash(git diff *), Bash(wc -l *)
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

1. **Explicit argument**: `--lang ko`, `--lang en`, `--lang ja` → use that language
2. **User message text**: If the message (excluding ref/path) contains non-English text, use that language
   - Korean: 한글 텍스트, "한국어", "한글로", "프로젝트 요약"
   - Japanese: 日本語テキスト, "日本語で"
   - English: English text, "in English"
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

Delegate HTML report generation to the visual-report-writer agent.

1. **Determine output path**:
   ```
   ~/.claude-code-zero/vision-powers/reports/{project-name}-project-recap.html
   ```
   Where `{project-name}` is the project directory name (e.g., `my-app`, `claude-code-zero`).

2. **Resolve reference paths**:
   - Section structure: resolve `./references/section-structure.md` to absolute path
   - Design system: resolve `../../references/design-system/` to absolute path

3. **Delegate to visual-report-writer**:
   ```
   Agent(subagent_type: "vision-powers:visual-report-writer", prompt: {
     Analysis data: {all gathered data — identity, activity, state, decisions, architecture, cognitive debt},
     Section structure reference path: {absolute path to section-structure.md},
     Design system directory path: {absolute path to design-system/},
     Output file path: {absolute output path},
     Output language: {detected language},
     Report title: "Project Recap: {project-name} ({time-window})",
     Aesthetic hint: "Paper-ink"
   })
   ```

4. **Report completion**: Output the `file:///` URL to the user:
   ```
   Report generated: file://{absolute-path-to-report}
   ```

### Reference Files

- `./references/section-structure.md` — 8-section structure with HTML pattern snippets for project recap visualization
- `../../references/design-system/` — Shared design system (CSS patterns, fonts, Mermaid, navigation, libraries, anti-slop rules). Passed as path to visual-report-writer; the agent reads files directly
