---
name: codex-verify
description: "Verify a plan or document using Codex as an independent reviewer. Use when the user asks \"codex 검수\", \"검수해줘\", \"verify this plan\", \"codex double-check\", \"코덱스로 확인\", \"플랜 검수\", wants Codex to review a plan or spec document, or says \"확인해줘\" after writing a plan. Also triggered by hook suggestion after task completion."
argument-hint: "path/to/document.md | resume PROMPT"
---

# Codex Document Verification

Use Codex as an independent reviewer to verify plans, specs, and documents. This is the "second pair of eyes" pattern — Codex reviews the document, Claude evaluates Codex's findings, and produces a PASS/FAIL verdict.

For code review, use `/codex-review` instead.

## Step 0: Setup & Preflight

Read `${CLAUDE_PLUGIN_ROOT}/references/execution.md` — Setup, Directory Setup, and Preflight sections.

Check `${CLAUDE_PLUGIN_DATA}/config.json` for saved settings. If missing, run first-time setup.

## Step 1: Determine Input

Parse $ARGUMENTS:

| Input | Action |
|-------|--------|
| Path to a file (`.md`, `.txt`, etc.) | Read file, verify as document |
| `resume [PROMPT]` | Resume previous Codex session |
| (no args) | Ask user: "What document should I verify?" |

## Step 2: Execute

### Document Verification

Read the document content, then write a verification prompt using XML tag structure (see `${CLAUDE_PLUGIN_ROOT}/references/gpt-prompting.md`):

```
Write to ${CLAUDE_PLUGIN_DATA}/tmp/codex-advisor-prompt.txt:

<task>
You are a brutally honest technical reviewer. Review the following document for material issues that would cause implementation failure.
Focus areas:
- Logical gaps and unstated assumptions
- Missing error handling or edge cases
- Overcomplexity (is there a simpler approach?)
- Feasibility risks (what could go wrong?)
- Missing dependencies or sequencing issues
- Whether the implementation order avoids build breaks
- Internal contradictions or ambiguous requirements
</task>

<compact_output_contract>
Return a structured verdict:
1. PASS or FAIL (with clear reasons)
2. Blocking issues (P1) — must fix before proceeding
3. Recommendations (P2) — non-blocking improvements
Be direct. No compliments. Just the problems.
</compact_output_contract>

<grounding_rules>
Ground every finding in the document text.
Do not speculate about issues not evidenced in the document.
If a concern is an inference, label it clearly.
</grounding_rules>

<completeness_contract>
Review the entire document before finalizing.
Do not stop after finding the first issue.
Check for interactions between sections that may create contradictions.
</completeness_contract>

<document>
{{DOCUMENT_CONTENT}}
</document>
```

```bash
codex exec "$(cat ${CLAUDE_PLUGIN_DATA}/tmp/codex-advisor-prompt.txt)" -m <MODEL> -s read-only -c 'model_reasoning_effort="<REASONING>"' --enable web_search_cached 2>${CLAUDE_PLUGIN_DATA}/tmp/codex-stderr.txt
```

### Session Resume

```bash
codex exec resume --last "[follow-up prompt]" -s read-only -c 'model_reasoning_effort="<REASONING>"' --enable web_search_cached 2>${CLAUDE_PLUGIN_DATA}/tmp/codex-stderr.txt
```

## Step 3: Evaluate with Verdict

Read `${CLAUDE_PLUGIN_ROOT}/references/execution.md` — Peer AI Evaluation section.

Since Claude may have authored the document, be **extra honest** about Codex's findings. Don't dismiss valid catches just because you wrote the plan.

For each finding:
- **Valid catch**: "Codex caught this. I missed it during planning."
- **Already considered**: "I considered this — here's why the current approach is correct: [reason]"
- **False positive**: "This is a false positive because [evidence]"

### Produce Verdict

```markdown
## Verification Result: PASS / FAIL

### Blocking Issues (P1 -- must fix before proceeding)
- [issue]: [why it's blocking]

### Recommendations (P2 -- non-blocking)
- [suggestion]: [why it would be better]

### False Positives
- [finding]: [why it's not a real issue]

### Cross-Model Notes
- [planning intent vs Codex feedback]
```

**FAIL** if any P1 (blocking) issue exists. **PASS** if only P2 or no issues.

## Step 4: Save & Clean Up

Save to `${CLAUDE_PLUGIN_DATA}/reviews/verify-<YYYYMMDD-HHMMSS>.md` using format from execution.md, with the verdict section. Create `${CLAUDE_PLUGIN_DATA}/reviews/` if it doesn't exist.

```bash
rm -f ${CLAUDE_PLUGIN_DATA}/tmp/codex-advisor-prompt.txt ${CLAUDE_PLUGIN_DATA}/tmp/codex-stderr.txt
```

Inform user: "Resume this session with `/codex-verify resume [follow-up]`."

## Gotchas

- **Claude has bias reviewing its own work.** Be extra honest. Don't rationalize away valid Codex findings.
- **This skill is for documents only.** If the user wants code review, redirect to `/codex-review`.
- **PASS doesn't mean perfect.** It means no blocking issues. Always note recommendations.
- **Never `2>/dev/null`.** Capture stderr for error diagnosis.
- **Timeout is not failure.** Exit 124/137 = timeout, not "no findings."
- **Do not auto-fix after verification.** Present the verdict and wait for user to decide next steps. See No Auto-Fix Rule in execution.md.
