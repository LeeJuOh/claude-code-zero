---
name: verify
description: Verify implementation or plan using Codex as an independent reviewer. Use when the user asks "codex 검수", "검수해줘", "verify", "codex double-check", "코덱스로 확인", "플랜 검수", wants Codex to verify completed work, or says "확인해줘" after implementation. Also triggered by hook suggestion after task completion.
argument-hint: [path to plan file | --uncommitted | --base BRANCH | resume PROMPT]
---

# Codex Verification

Use Codex as an independent reviewer to verify Claude's implementation or review a plan document. This is the "second pair of eyes" pattern.

## Step 0: Setup & Preflight

Read `${CLAUDE_PLUGIN_ROOT}/references/execution.md` — Setup and Preflight sections.

Check `${CLAUDE_PLUGIN_DATA}/config.json` for saved settings. If missing, run first-time setup.

## Step 1: Detect Input Type

Parse $ARGUMENTS and context to determine what to verify:

| Input | Type | Execution |
|-------|------|-----------|
| Path to `.md` file | Plan verification | `codex exec` with plan review persona |
| `--uncommitted` / `--base` / `--commit` | Code verification | `codex review` with verification persona |
| `resume [PROMPT]` | Session resume | `codex exec resume --last` |
| (no args, uncommitted changes) | Code verification | Auto-detect scope |
| (no args, on feature branch) | Code verification | `codex review --base <default-branch>` |
| (no args, no changes) | Ask user | "What should I verify?" |

## Step 2: Execute

### Code Verification

Use `codex review` with a verification-focused instruction:

```bash
codex review [SCOPE] "You are an independent reviewer verifying another developer's implementation. Focus on: logic errors and unhandled edge cases, missing error handling or validation, security vulnerabilities introduced by changes, performance regressions, inconsistencies with existing codebase patterns, missing or inadequate tests. Verdict: PASS (no blocking issues) or FAIL (blocking issues found)." -c 'model="<MODEL>"' -c 'model_reasoning_effort="<REASONING>"' --enable web_search_cached 2>tmp/codex-stderr.txt
```

### Plan Verification

Read the plan file content, then use `codex exec`:

```
Write to tmp/codex-advisor-prompt.txt:

You are a brutally honest technical reviewer. Review this implementation plan for:
- Logical gaps and unstated assumptions
- Missing error handling or edge cases
- Overcomplexity (is there a simpler approach?)
- Feasibility risks (what could go wrong?)
- Missing dependencies or sequencing issues
- Whether the implementation order avoids build breaks

Be direct. No compliments. Just the problems.
Verdict: PASS or FAIL with clear reasons.

THE PLAN:
<plan file content>
```

```bash
codex exec "$(cat tmp/codex-advisor-prompt.txt)" -m <MODEL> -s read-only -c 'model_reasoning_effort="<REASONING>"' --enable web_search_cached 2>tmp/codex-stderr.txt
```

### Session Resume

```bash
codex exec resume --last "[follow-up prompt]" -s read-only -c 'model_reasoning_effort="<REASONING>"' --enable web_search_cached 2>tmp/codex-stderr.txt
```

## Step 3: Evaluate with Verdict

Read `${CLAUDE_PLUGIN_ROOT}/references/execution.md` — Peer AI Evaluation section.

Since Claude implemented the code (or wrote the plan), be **extra honest** about Codex's findings. Don't dismiss valid catches just because you authored the work.

For each finding:
- **Valid catch**: "Codex caught this. I missed it during implementation."
- **Already considered**: "I considered this — here's why the current approach is correct: [reason]"
- **False positive**: "This is a false positive because [evidence]"

### Produce Verdict

```markdown
## Verification Result: PASS / FAIL

### Blocking Issues (P1 -- must fix before merge)
- [issue]: [why it's blocking]

### Recommendations (P2 -- non-blocking)
- [suggestion]: [why it would be better]

### False Positives
- [finding]: [why it's not a real issue]

### Cross-Model Notes
- [implementation intent vs Codex feedback]
```

**FAIL** if any P1 (blocking) issue exists. **PASS** if only P2 or no issues.

## Step 4: Save & Clean Up

Save to `codex-reviews/verify-<YYYYMMDD-HHMMSS>.md` using format from execution.md, with the verdict section.

```bash
rm -f tmp/codex-advisor-prompt.txt tmp/codex-stderr.txt
```

Inform user: "Resume this session with `/verify resume [follow-up]`."

## Gotchas

- **Claude has bias reviewing its own work.** Be extra honest. Don't rationalize away valid Codex findings.
- **Plan verification uses `codex exec`, code verification uses `codex review`.** Different commands, different flags. `codex review` does NOT accept `-m`, `-s`, or `--json` — model must be set via `-c 'model="..."'`.
- **Scope matters.** If Claude changed 3 files, verify those 3 — don't let Codex wander into unrelated code.
- **PASS doesn't mean perfect.** It means no blocking issues. Always note recommendations.
- **Never `2>/dev/null`.** Capture stderr for error diagnosis.
