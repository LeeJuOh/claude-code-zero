---
name: codex-review
description: Run Codex code review with Claude's critical evaluation. Use when the user asks for "codex review", "codex 리뷰", "코드 리뷰", wants Codex to review code changes, diff, branch, or commit. Also triggered by hook suggestion after git commit.
argument-hint: [--uncommitted | --base BRANCH | adversarial | security focus | resume PROMPT]
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
| `adversarial` | Adversarial review via `codex exec` (see Adversarial Mode) |
| `adversarial --base BRANCH` | Adversarial review of branch diff |
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
codex review [SCOPE] [FOCUS_INSTRUCTION] -c 'model="<MODEL>"' -c 'model_reasoning_effort="<REASONING>"' --enable web_search_cached 2>${CLAUDE_PLUGIN_DATA}/tmp/codex-stderr.txt
```

Model and reasoning come from `${CLAUDE_PLUGIN_DATA}/config.json`. Omit `-c 'model="..."'` if model is `"default"`.

**`codex review` does NOT accept `-m`, `-s`, or `--json`.** Model must be set via `-c 'model="..."'`.

Timeout: 300000ms. Capture stderr to file, not `/dev/null`.

### Focus Options

If user requests a focus (security, perf, arch), pass it as the instruction argument to `codex review`:

- `/codex-reviewsecurity focus` → `codex review --uncommitted "Focus on security: injection vulnerabilities, auth gaps, hardcoded secrets, OWASP Top 10"`
- `/codex-reviewperf focus` → `codex review --uncommitted "Focus on performance: N+1 queries, memory leaks, missing caching, blocking I/O"`
- `/codex-reviewarch focus` → `codex review --uncommitted "Focus on architecture: module boundaries, coupling, circular dependencies, separation of concerns"`

User can also pass any custom instruction: `/codex-review"focus on error handling"`.

### Adversarial Mode

When user passes `adversarial`, use `codex exec` with the adversarial prompt template instead of `codex review`.

1. Determine scope (same as regular review: uncommitted, branch, or commit)
2. Collect the diff:
   - `--uncommitted` → `git diff && git diff --cached`
   - `--base BRANCH` → `git diff BRANCH...HEAD`
   - `--commit SHA` → `git show SHA`
3. Read `${CLAUDE_PLUGIN_ROOT}/references/adversarial-prompt.md` for the template
4. Write the prompt (with diff appended) to `${CLAUDE_PLUGIN_DATA}/tmp/codex-advisor-prompt.txt`
5. Execute:

```bash
codex exec "$(cat ${CLAUDE_PLUGIN_DATA}/tmp/codex-advisor-prompt.txt)" -m <MODEL> -s read-only -c 'model_reasoning_effort="<REASONING>"' --enable web_search_cached 2>${CLAUDE_PLUGIN_DATA}/tmp/codex-stderr.txt
```

6. Parse the JSON response against the schema in `${CLAUDE_PLUGIN_ROOT}/references/review-output-schema.json`
7. Proceed to Step 3 (Evaluate) — apply Peer AI Evaluation to each finding

The adversarial prompt requests structured JSON output with severity, confidence, file, and line for each finding. If Codex returns malformed JSON, fall back to treating the output as prose.

### Session Resume

```bash
codex exec resume --last "[follow-up prompt]" -s read-only -c 'model_reasoning_effort="<REASONING>"' --enable web_search_cached 2>${CLAUDE_PLUGIN_DATA}/tmp/codex-stderr.txt
```

Resume inherits original session config. Do not re-apply `-m`.

## Step 3: Evaluate

Read `${CLAUDE_PLUGIN_ROOT}/references/execution.md` — Peer AI Evaluation and Cross-Model Comparison sections.

For each Codex finding, read the actual code before agreeing or disagreeing.

## Step 4: Save & Clean Up

Save to `${CLAUDE_PLUGIN_DATA}/reviews/review-<YYYYMMDD-HHMMSS>.md` using format from execution.md. Create `${CLAUDE_PLUGIN_DATA}/reviews/` if it doesn't exist.

```bash
rm -f ${CLAUDE_PLUGIN_DATA}/tmp/codex-stderr.txt
```

Inform user: "Resume this session with `/codex-reviewresume [follow-up]`."

## Gotchas

- **`codex review` is a subcommand, not `codex exec "review"`.** It has its own flags and does NOT accept `-s` or `--json`.
- **Adversarial mode uses `codex exec`, not `codex review`.** It needs the custom prompt template for structured JSON output.
- **Never `2>/dev/null`.** Always capture stderr to a file for error diagnosis.
- **Timeout is not failure.** Exit 124/137 = timeout, not "no findings."
- **Focus options are instructions, not separate modes.** They're passed as the text argument to `codex review`.
- **Preserve Codex output verbatim.** Claude's evaluation comes after, not instead of.
- **Do not auto-fix after review.** Present findings, then wait for user to request changes. See No Auto-Fix Rule in execution.md.
