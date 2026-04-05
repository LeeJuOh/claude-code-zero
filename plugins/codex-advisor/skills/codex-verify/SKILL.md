---
name: codex-verify
description: "Verify a plan or document using Codex as independent reviewer with Claude's double-check for PASS/FAIL verdict. Use when the user asks \"codex 검수\", \"검수해줘\", \"verify this plan\", \"codex double-check\", \"플랜 검수\"."
argument-hint: "path/to/document.md"
allowed-tools: ["Bash", "Read", "Grep", "Glob", "Write"]
---

# Codex Document Verification + Double-Check

Use Codex as an independent reviewer to verify plans, specs, and documents. Codex reviews via the companion task subcommand, Claude evaluates, produces a PASS/FAIL verdict.

For code review, use `/codex-review`. For research, use `/codex-research`.

## Step 1: Determine Input

Parse $ARGUMENTS:

| Input | Action |
|-------|--------|
| Path to a file | Read file content |
| `resume [follow-up]` | Pass `--resume-last "[follow-up]"` to companion task |
| (no args) | Ask user: "What document should I verify?" |

## Step 2: Build Verification Prompt

Read `${CLAUDE_PLUGIN_ROOT}/references/gpt-prompting.md` for XML tag structure.

Write the verification prompt to `${CLAUDE_PLUGIN_DATA}/tmp/codex-verify-prompt.txt`.

Compose the prompt by assembling these XML blocks. Replace the placeholder with the actual document content.

```
<task>
You are a brutally honest technical reviewer. Review the following document for material issues that would cause implementation failure.
Focus areas:
- Logical gaps and unstated assumptions
- Missing error handling or edge cases
- Overcomplexity (is there a simpler approach?)
- Feasibility risks (what could go wrong?)
- Missing dependencies or sequencing issues
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
</grounding_rules>

<completeness_contract>
Review the entire document before finalizing.
Check for interactions between sections that may create contradictions.
</completeness_contract>

<document>
[INSERT DOCUMENT CONTENT HERE]
</document>
```

Create directory if needed: `mkdir -p ${CLAUDE_PLUGIN_DATA}/tmp`

## Step 3: Execute via Companion Script

```bash
CODEX_COMPANION=$("${CLAUDE_PLUGIN_ROOT}/scripts/resolve-companion.sh")
```

If resolve fails: direct to `/codex-setup`.

```bash
node "$CODEX_COMPANION" task --prompt-file "${CLAUDE_PLUGIN_DATA}/tmp/codex-verify-prompt.txt"
```

Timeout: 300000ms (5 minutes). Job is tracked and visible in `/codex:status`.

## Step 4: Double-Check with Verdict

Read `${CLAUDE_PLUGIN_ROOT}/references/evaluation.md` — Peer AI Evaluation and Self-Bias Awareness.

Since Claude may have authored the document, be **extra honest**. For each finding:
- **Valid catch**: "Codex caught this. I missed it during planning."
- **Already considered**: "I considered this — here's why: [reason]"
- **False positive**: "This is a false positive because [evidence]"

### Produce Verdict

```markdown
## Verification Result: PASS / FAIL

### Blocking Issues (P1 — must fix before proceeding)
- [issue]: [why it's blocking]

### Recommendations (P2 — non-blocking)
- [suggestion]: [why it would be better]

### False Positives
- [finding]: [why it's not a real issue]

### Agreement: <High|Partial|Disagreement> (N/M findings)
```

**FAIL** if any P1 issue exists. **PASS** if only P2 or none.

## Step 5: Save & Clean Up

Save to `${CLAUDE_PLUGIN_DATA}/reviews/verify-<YYYYMMDD-HHMMSS>.md`.

```bash
rm -f ${CLAUDE_PLUGIN_DATA}/tmp/codex-verify-prompt.txt
```

## Gotchas

- **Claude has bias reviewing its own work.** Be extra honest.
- **For code review, redirect to `/codex-review`.**
- **PASS doesn't mean perfect.** Always note recommendations.
- **Do not auto-fix.** Present verdict, wait for user.
- **Resume supported.** User can `/codex-verify resume [follow-up]` — pass `--resume-last` to companion.
