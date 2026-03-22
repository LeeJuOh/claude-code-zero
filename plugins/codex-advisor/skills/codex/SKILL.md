---
name: codex
description: Run OpenAI Codex CLI with any custom prompt for code analysis, debugging, refactoring, or exploration. Use when the user asks to "run codex", "ask codex", "codex한테 물어봐", or wants Codex's perspective on any code question. Default to this skill when no specific preset (review, security, perf, arch) is requested.
argument-hint: [any prompt or question for Codex]
---

# Codex Custom Analysis

Run Codex with the user's prompt and add Claude's critical evaluation.

## 1. Build Command

Use $ARGUMENTS as the prompt directly. If no arguments provided, ask the user what they want Codex to analyze.

### Sandbox Mode Selection

Choose based on the task:

| Task | Sandbox |
|------|---------|
| Analysis, review, questions | `--sandbox read-only` (default) |
| Apply edits, refactoring | `--sandbox workspace-write` |
| Network access needed | `--sandbox danger-full-access` (ask user first) |

### Model Override

If the user specifies a model (e.g., "use gpt-5.4"), add `-m <model>`. Otherwise use the default from codex config.

## 2-4. Execute, Evaluate, Save

Read `${CLAUDE_PLUGIN_ROOT}/references/common.md` for the full workflow:
- Write prompt to temp file, execute with `codex exec`, clean up
- Critical evaluation of Codex's output
- Save to `codex-reviews/custom-<YYYYMMDD-HHMMSS>.md`

## Session Resume

If the user says "codex resume", "이어서", or wants to follow up on the previous Codex session:

```bash
echo "follow-up prompt" | codex exec resume --last 2>/dev/null
```

Do not add flags between `exec` and `resume` unless explicitly requested.

## Gotchas

- This is the default/fallback skill. If the user says `/codex review`, the codex-review skill handles it, not this one.
- For prompts with special characters or quotes, always use the temp file pattern from common.md.
- Codex has its own knowledge and opinions. Treat it as a colleague, not an authority. When you disagree, explain why with evidence.
- `--sandbox read-only` is the safe default. Only escalate sandbox permissions when the task clearly requires it.
