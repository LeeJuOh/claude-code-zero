---
name: codex-adversarial
description: "Run Codex adversarial review with Claude's double-check. Actively tries to break confidence in the change. Use when the user asks \"adversarial review\", \"적대적 리뷰\", \"코드 공격\", wants thorough security/correctness challenge."
argument-hint: "[--uncommitted | --base BRANCH | --commit SHA] [FOCUS_TEXT]"
allowed-tools: ["Bash", "Read", "Grep", "Glob"]
---

# Codex Adversarial Review + Double-Check

Invoke the Official Codex companion's adversarial review, then apply Claude's critical evaluation. Adversarial review defaults to skepticism — it looks for reasons NOT to ship.

## Step 1: Execute via Companion Script

```bash
CODEX_COMPANION=$("${CLAUDE_PLUGIN_ROOT}/scripts/resolve-companion.sh")
```

If resolve fails: direct to `/codex-setup`.

```bash
node "$CODEX_COMPANION" adversarial-review --wait $ARGUMENTS
```

Timeout: 300000ms (5 minutes).

### If command fails:

| Error | Action |
|-------|--------|
| resolve-companion.sh exits 1 | Official plugin not installed → direct to `/codex-setup` |
| "not authenticated" in stderr | Auth required → suggest `codex login` |
| Other error | Show raw error, don't retry silently |

## Step 2: Double-Check

Read `${CLAUDE_PLUGIN_ROOT}/references/evaluation.md`.

Adversarial findings are intentionally skeptical. For each finding:
1. **Read the actual code** at the file/line mentioned
2. **Verify the attack scenario** — is the failure mode realistic?
3. **Classify**: Agree / Disagree / Nuance
4. Check that file paths and line numbers actually exist — adversarial prompts hallucinate more

Be especially rigorous here. Adversarial review produces more false positives by design.

## Step 3: Report

Present to user:
1. Codex adversarial findings (verbatim)
2. Claude's evaluation per finding, with realistic risk assessment
3. Agreement level
4. Findings that are genuine concerns vs noise

## Step 4: Save

Save to `${CLAUDE_PLUGIN_DATA}/reviews/adversarial-<YYYYMMDD-HHMMSS>.md`.

## Gotchas

- **Expect more false positives than regular review.** That's by design.
- **Do not auto-fix.** Present findings, wait for user.
- **Validate every file path.** Adversarial prompts are prone to hallucinating paths.
