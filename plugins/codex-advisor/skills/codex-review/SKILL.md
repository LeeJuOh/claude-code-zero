---
name: codex-review
description: Run Codex built-in code review with Claude's critical evaluation. Use when the user asks for "codex review", "codex 리뷰", wants Codex to review their code changes, diff, branch, or commit.
argument-hint: [--uncommitted | --base BRANCH | --commit SHA | custom instructions]
---

# Codex Code Review

Run Codex's built-in `codex review` and add Claude's critical evaluation.

## 1. Determine Review Scope

Based on $ARGUMENTS or the current git state:

| User Input | Command |
|------------|---------|
| (no args, uncommitted changes exist) | `codex review --uncommitted` |
| (no args, on feature branch) | `codex review --base <default-branch>` |
| `--base main` | `codex review --base main` |
| `--commit abc123` | `codex review --commit abc123` |
| Any other text | `codex review "<text>"` |

If no arguments and no uncommitted changes and on the default branch, ask the user what to review.

Pass through any additional flags the user provides (e.g., `-m model`, `--title "..."`) directly to `codex review`.

## 2. Execute

```bash
codex review [OPTIONS] 2>/dev/null
```

Timeout: 600000ms. The `2>/dev/null` suppresses thinking tokens.

## 3-4. Critical Evaluation and Save

Read `${CLAUDE_PLUGIN_ROOT}/references/common.md` for the critical evaluation workflow and file saving pattern. Save as `codex-reviews/review-<YYYYMMDD-HHMMSS>.md`.

## Gotchas

- `codex review` has no `-o` output flag. Capture stdout from the Bash tool result.
- Empty output may mean "no issues" or a silent failure. Check exit code.
- Codex review focuses on changed code only. For full-project analysis, use `/codex-security` or `/codex-arch` instead.
