---
name: review
description: Run Codex code review with Claude's critical evaluation. Use when the user asks for "codex review", "codex 리뷰", "코드 리뷰", wants Codex to review code changes, diff, branch, or commit. Also triggered by hook suggestion after git commit.
argument-hint: [--uncommitted | --base BRANCH | security focus | perf focus | resume PROMPT]
---

# Codex Code Review

Run `codex review` (Codex CLI built-in) and provide Claude's independent critical evaluation.

## Step 0: Setup & Preflight

Read `${CLAUDE_PLUGIN_ROOT}/references/execution.md` — Setup and Preflight sections.

Check `${CLAUDE_PLUGIN_DATA}/config.json` for saved model/reasoning settings. If missing, run first-time setup.

## Step 1: Determine Scope

Parse $ARGUMENTS to determine review scope:

| Input | Action |
|-------|--------|
| `--uncommitted` | `codex review --uncommitted` |
| `--base BRANCH` | `codex review --base BRANCH` |
| `--commit SHA` | `codex review --commit SHA` |
| `resume [PROMPT]` | See Session Resume below |
| `security focus` / `perf focus` / `arch focus` | Pass as review instruction (see Focus Options) |
| (no args, uncommitted changes) | Auto-detect: `codex review --uncommitted` |
| (no args, on feature branch) | Auto-detect: `codex review --base <default-branch>` |
| (no args, nothing to review) | Ask the user what to review |

Detect default branch:
```bash
git remote show origin 2>/dev/null | grep 'HEAD branch' | awk '{print $NF}'
```
Fallback to `main`.

## Step 2: Build & Execute

```bash
codex review [SCOPE] [FOCUS_INSTRUCTION] -c 'model="<MODEL>"' -c 'model_reasoning_effort="<REASONING>"' --enable web_search_cached 2>tmp/codex-stderr.txt
```

Model and reasoning come from `${CLAUDE_PLUGIN_DATA}/config.json`. Omit `-c 'model="..."'` if model is `"default"`.

**`codex review` does NOT accept `-m`, `-s`, or `--json`.** Model must be set via `-c 'model="..."'`.

Timeout: 300000ms. Capture stderr to file, not `/dev/null`.

### Focus Options

If user requests a focus (security, perf, arch), pass it as the instruction argument to `codex review`:

- `/review security focus` → `codex review --uncommitted "Focus on security: injection vulnerabilities, auth gaps, hardcoded secrets, OWASP Top 10"`
- `/review perf focus` → `codex review --uncommitted "Focus on performance: N+1 queries, memory leaks, missing caching, blocking I/O"`
- `/review arch focus` → `codex review --uncommitted "Focus on architecture: module boundaries, coupling, circular dependencies, separation of concerns"`

User can also pass any custom instruction: `/review "focus on error handling"`.

### Session Resume

```bash
codex exec resume --last "[follow-up prompt]" -s read-only -c 'model_reasoning_effort="<REASONING>"' --enable web_search_cached 2>tmp/codex-stderr.txt
```

Resume inherits original session config. Do not re-apply `-m`.

## Step 3: Evaluate

Read `${CLAUDE_PLUGIN_ROOT}/references/execution.md` — Peer AI Evaluation and Cross-Model Comparison sections.

For each Codex finding, read the actual code before agreeing or disagreeing.

## Step 4: Save & Clean Up

Save to `codex-reviews/review-<YYYYMMDD-HHMMSS>.md` using format from execution.md.

```bash
rm -f tmp/codex-stderr.txt
```

Inform user: "Resume this session with `/review resume [follow-up]`."

## Gotchas

- **`codex review` is a subcommand, not `codex exec "review"`.** It has its own flags and does NOT accept `-s` or `--json`.
- **Never `2>/dev/null`.** Always capture stderr to a file for error diagnosis.
- **Timeout is not failure.** Exit 124/137 = timeout, not "no findings."
- **Focus options are instructions, not separate modes.** They're passed as the text argument to `codex review`.
- **Preserve Codex output verbatim.** Claude's evaluation comes after, not instead of.
