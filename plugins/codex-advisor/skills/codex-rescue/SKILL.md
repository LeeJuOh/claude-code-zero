---
name: codex-rescue
description: "Delegate an implementation task to Codex via Official plugin, then Claude reviews the result. Use when the user asks \"codex rescue\", \"codex 위임\", \"코덱스한테 시켜\", \"codex fix\", wants Codex to implement, investigate, or fix something."
argument-hint: "task description [--background] [--write] [--model MODEL] [--effort LEVEL]"
allowed-tools: ["Bash", "Read", "Grep", "Glob"]
---

# Codex Task Delegation + Double-Check

Hand off a task to Codex via the Official companion's task subcommand. When Codex finishes, Claude reviews what was done.

## Step 1: Pre-flight — Companion Check

```bash
CODEX_COMPANION=$("${CLAUDE_PLUGIN_ROOT}/scripts/resolve-companion.sh")
```

If resolve fails: direct to `/codex-setup` immediately. Do NOT proceed.

## Step 2: Snapshot Before

Record current state so we can diff after Codex runs:

```bash
git diff --stat
git stash list | head -1
```

## Step 3: Execute via Companion Script

Use the `$CODEX_COMPANION` resolved in Step 1:

```bash
node "$CODEX_COMPANION" task --write $ARGUMENTS
```

Pass through flags that companion supports: `--background`, `--write`, `--model`, `--effort`, `--resume-last`, `--fresh`.

Default to `--write` (Codex needs write access to implement fixes). If user explicitly asks for read-only investigation, omit `--write`.

Timeout: 300000ms (5 minutes) for foreground. Background tasks are tracked via `/codex:status`.

### If command fails:

| Error | Action |
|-------|--------|
| "not authenticated" in stderr | Auth required → suggest `codex login` |
| Other error | Show raw error, don't retry silently |

## Step 4: Double-Check

Read `${CLAUDE_PLUGIN_ROOT}/references/evaluation.md`.

### If Codex made code changes:

1. **Check what changed**:
```bash
git diff
git diff --stat
```

2. **Review each changed file** — read the actual code
3. **Evaluate**:
   - Are the changes correct?
   - Any bugs introduced?
   - Any files modified that shouldn't have been?
   - Does it actually solve the task?
   - Any unintended side effects?

4. **Report**:
```markdown
## Codex Implementation Review

### Changes Made
<git diff --stat>

### Evaluation
- [file]: [assessment]

### Agreement: <High|Partial|Disagreement>
### Verdict
<appropriate / has issues>
```

### If Codex returned investigation results (read-only):

Apply standard Peer AI Evaluation from evaluation.md.

## Step 5: Save

```bash
mkdir -p "${CLAUDE_PLUGIN_DATA}/reviews"
```

Save to `${CLAUDE_PLUGIN_DATA}/reviews/rescue-<YYYYMMDD-HHMMSS>.md`.

## Gotchas

- **Do not auto-accept Codex changes.** Review first, present to user.
- **Check for unintended side effects** — Codex might modify files outside scope.
- **If background**, user can check status via `/codex:status` (Official command).
