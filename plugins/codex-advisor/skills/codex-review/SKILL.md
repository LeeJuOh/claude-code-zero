---
name: codex-review
description: "Run Codex code review with Claude's independent double-check. Use when the user asks \"codex review\", \"codex 리뷰\", \"코드 리뷰\", wants Codex to review code changes, diff, branch, or commit. For adversarial review use /codex-adversarial."
argument-hint: "[--uncommitted | --base BRANCH | --commit SHA | FOCUS_TEXT]"
allowed-tools: ["Bash", "Read", "Grep", "Glob"]
---

# Codex Code Review + Double-Check

Invoke the Official Codex companion's review, then apply Claude's independent evaluation to every finding.

## Step 1: Execute via Companion Script

```bash
CODEX_COMPANION=$("${CLAUDE_PLUGIN_ROOT}/scripts/resolve-companion.sh")
```

If resolve fails: direct to `/codex-setup`.

```bash
node "$CODEX_COMPANION" review --wait $ARGUMENTS
```

If $ARGUMENTS is empty, pass no args — companion auto-detects scope (uncommitted or branch).

Timeout: 300000ms (5 minutes).

### If command fails:

| Error | Action |
|-------|--------|
| resolve-companion.sh exits 1 | Official plugin not installed → direct to `/codex-setup` |
| "not authenticated" in stderr | Auth required → suggest `codex login` |
| Other error | Show raw error, don't retry silently |

## Step 2: Double-Check

Read `${CLAUDE_PLUGIN_ROOT}/references/evaluation.md`.

For each finding in the Official review output:
1. **Read the actual code** at the file/line Codex mentions
2. **Classify**: Agree / Disagree / Nuance — with evidence
3. If Codex mentions a file or function that doesn't exist, flag as false positive

## Step 3: Report

Present to user:
1. Codex findings (verbatim from Official output)
2. Claude's evaluation per finding
3. Agreement level (High / Partial / Disagreement)
4. Additional findings Claude spotted that Codex missed

## Step 4: Save

```bash
mkdir -p "${CLAUDE_PLUGIN_DATA}/reviews"
```

Save to `${CLAUDE_PLUGIN_DATA}/reviews/review-<YYYYMMDD-HHMMSS>.md` using format from evaluation.md.

## Gotchas

- **Do not auto-fix.** Present findings, wait for user.
- **Preserve Codex output verbatim.** Evaluation comes after.
- **Companion handles scope detection, job tracking, retry.** Our job is evaluation only.
- **Always pass `--wait`.** Without it, companion prompts for foreground/background selection via AskUserQuestion, which disrupts our flow.
