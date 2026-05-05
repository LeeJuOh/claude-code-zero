---
name: codex-verify
description: "Verify a plan or document using Codex as independent reviewer with PASS/FAIL verdict. Use when asked \"codex 검수\", \"verify this plan\", \"플랜 검수\"."
argument-hint: "path/to/document.md [--model SLUG] [--effort LEVEL]"
allowed-tools: ["Bash", "Read", "Grep", "Glob", "AskUserQuestion"]
---

# Codex Document Verification + Double-Check

You are a **translator + executor + double-checker**. The user wants an
independent review of a plan or document. Your job is to hand the
document to Codex **without ever loading it into your own context**, so
your follow-up evaluation is genuinely independent.

For code review use `/codex-review`. For research use `/codex-research`.

## Execution Contract

**This contract overrides default exploration habits. Read it before Phase 1.**

| Phase | Allowed | Forbidden |
|-------|---------|-----------|
| 1 ANALYZE | `test -f/-s`, `wc -l/-c`, `file`, `echo`, `printf`, `cat "$DOC" >> "$PROMPT_FILE"` (file-redirect, no stdout) | `cat "$DOC"` to stdout, `head`, `tail`, Read, Grep, Glob |
| 2 INVOKE | Bash for companion launch via stdin pipe | All source / document reads to stdout |
| 3 WAIT | `status --wait` loop (≤6 iterations, ≤24 min) | All reads, manual polling, `ps`/`kill` |
| 4 DOUBLE-CHECK | Read the document (now — not before) to verify Codex's findings | n/a |
| 5 REPORT + SAVE | Write report file | n/a |

**Why the document stays out of context in Phase 1-3:** if you read the
document upfront, you form opinions before seeing Codex's. The
double-check is then biased — you'll rationalize away valid catches.
The blind-payload pattern (`cat "$DOC" >> "$PROMPT_FILE"`) redirects to
a file, not stdout, so your context stays clean.

Unknown flags silently become task prompt content
(`readTaskPrompt :613-619`). Phase 1 is the only safety net.

---

## Phase 1: Analyze + assemble blind payload

### Parse `$ARGUMENTS`

**Whitelist for this skill:** `--model <slug>`, `--effort <level>` (skill-level, route through `apply-codex-config.py` — never reach the companion). The document path is another skill input, not a companion flag.

Rules:

- **A single path** → treat as the document to verify.
- **`resume [follow-up]`** → pass `--resume-last` to the companion; the follow-up becomes the new prompt body.
- **Multiple paths** → `AskUserQuestion` which one.
- **Meta-instructions addressed to YOU** ("한국어로 평가해", "엄격하게") → obey for your own behavior, never include in the prompt.
- **No args** → `AskUserQuestion`: "What document should I verify?"
- **Unknown flags** (e.g., `--base`, `--write`, `--foo`) → `AskUserQuestion`. verify has no companion flags to forward. `--model`/`--effort` are skill-level and route through `apply-codex-config.py`.

### Resolve the document path

```bash
# Input validation only — never load content.
# Replace <literal doc path> with the path parsed from $ARGUMENTS.
test -f "<literal doc path>" || { echo "File not found: <literal doc path>" >&2; exit 1; }
test -s "<literal doc path>" || { echo "File is empty: <literal doc path>" >&2; exit 1; }
echo "DOC_LINES=$(wc -l < "<literal doc path>")"   # size info, not content
```

### Assemble the blind payload

```bash
set -o pipefail
CODEX_COMPANION=$("${CLAUDE_PLUGIN_ROOT}/scripts/resolve-companion.sh") \
  || { echo "Official Codex plugin not found — run /codex-setup" >&2; exit 1; }

mkdir -p "${CLAUDE_PLUGIN_DATA}/tmp"
TS=$(date +%s%N)
PROMPT_FILE="${CLAUDE_PLUGIN_DATA}/tmp/verify-prompt-${TS}.txt"
JOB_JSON_FILE="${CLAUDE_PLUGIN_DATA}/tmp/verify-job-${TS}.json"
echo "PROMPT_FILE=$PROMPT_FILE"
echo "JOB_JSON_FILE=$JOB_JSON_FILE"

# Header via heredoc — no document content yet
cat > "$PROMPT_FILE" <<'EOF'
<task>
You are a brutally honest technical reviewer. Review the following document for
material issues that would cause implementation failure.
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
Ground every finding in the document text. Cite specific sections.
Do not speculate about issues not evidenced in the document.
</grounding_rules>

<completeness_contract>
Review the entire document before finalizing.
Check for interactions between sections that may create contradictions.
</completeness_contract>

<document>
EOF

# Append document via file redirect — stdout stays empty, context stays clean.
# Use the literal doc path, NOT a shell variable from a prior Bash call.
cat "<literal doc path>" >> "$PROMPT_FILE"

# Close XML
printf '\n</document>\n' >> "$PROMPT_FILE"
```

### Apply model/effort (if either flag was provided)

Run after payload assembly, before Phase 2, so the companion sees the new `config.toml`:

```bash
python3 "${CLAUDE_PLUGIN_ROOT}/scripts/apply-codex-config.py" \
  "<literal clean model from Phase 1 or empty>" \
  "<literal clean effort from Phase 1 or empty>"
```

Relay the `Model: ... | Effort: ...` stdout line verbatim; pass stderr advisories through. **config.toml is global** — the change affects every Codex invocation until changed again. Flag that to the user when values changed.

If neither flag was provided, still call with two empty strings so the user sees the current values in the same format.

**Before Phase 2, also print the Parsed line:**

```
Parsed: doc="docs/plan.md" (DOC_LINES=247), payload=PROMPT_FILE
```

Order: apply-codex-config.py output first, Parsed line second. Remember the literal `PROMPT_FILE`, `JOB_JSON_FILE`, and `USER_DOC` paths. They are needed in later phases.

For edge cases, read `${CLAUDE_PLUGIN_ROOT}/references/companion-usage.md §7` (ANALYZE rules) and `§8` (blind-payload details).

---

## Phase 2: Invoke (Pattern B — stdin pipe to `task --background`)

```bash
# NEVER pass a positional arg — readTaskPrompt short-circuits on
# positionalPrompt (:619), silently dropping the entire blind payload.
cat "<literal PROMPT_FILE path>" | node "$CODEX_COMPANION" task --background --json \
  > "<literal JOB_JSON_FILE path>" 2> "<literal JOB_JSON_FILE path>.stderr" \
  || { echo "task launch failed:" >&2; cat "<literal JOB_JSON_FILE path>.stderr" >&2; exit 1; }

# Capture jobId (node, not python — avoid host assumptions)
JOB_ID=$(node -e 'const fs=require("fs");try{const j=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));if(!j.jobId)throw new Error("no jobId");process.stdout.write(j.jobId);}catch(e){process.stderr.write("JOB_ID parse failed: "+e.message+"\n");process.exit(1);}' "<literal JOB_JSON_FILE path>") \
  || { echo "raw companion stdout:" >&2; cat "<literal JOB_JSON_FILE path>" >&2; exit 1; }
echo "JOB_ID=$JOB_ID"
```

Remember the literal `JOB_ID` for Phase 3-4.

---

## Phase 3: Wait (`status --wait` loop)

Each call blocks ≤4 min. Re-call on timeout. Cap at **6 iterations** (24
minutes).

```bash
# Repeat until status is "completed" or "failed", or cap hit.
node "$CODEX_COMPANION" status --wait "<literal JOB_ID>" \
  --timeout-ms 240000 --json
```

- `status === "completed"` → fetch result
- `status === "failed"` → categorize per §6, save failure report
- `waitTimedOut === true` with `queued`/`running` → re-call
- 6 iterations exhausted → `wait-timeout` (§6). Show JOB_ID, suggest `/codex:status <JOB_ID>`.

Fetch result:

```bash
node "$CODEX_COMPANION" result "<literal JOB_ID>" --json
```

Full error table: `${CLAUDE_PLUGIN_ROOT}/references/companion-usage.md §6`.

---

## Phase 4: Double-check with verdict

**Now you read the document.** Not before.

Read `${CLAUDE_PLUGIN_ROOT}/references/evaluation.md` (Peer AI
Evaluation + Self-Bias Awareness).

**Self-bias warning:** if Claude authored the document (same session),
acknowledge it: "Note: I authored this — extra honesty required." Don't
rationalize away valid catches.

For each of Codex's findings:

- **Valid catch** — "Codex caught this. I missed it during planning."
  Read the cited document section to confirm.
- **Already considered** — "I considered this: [reason]." Cite the
  document section that addresses it.
- **False Positive (hallucination)** — Codex cited a document section
  that does **not exist**, or misread what the section says. Read the
  cited section to confirm.
- **Uncited** — no concrete section reference. Surface as "verification
  deferred". Never invent citations.

### Produce the verdict

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

---

## Phase 5: Report + save

```bash
mkdir -p "${CLAUDE_PLUGIN_DATA}/reviews"
```

**Success:** save to
`${CLAUDE_PLUGIN_DATA}/reviews/verify-<YYYYMMDD-HHMMSS>.md` with:
- The document path
- Codex's output verbatim
- Per-finding classification with document citations
- Final verdict (PASS / FAIL)

**Failure:** save to
`${CLAUDE_PLUGIN_DATA}/reviews/verify-<YYYYMMDD-HHMMSS>-failed.md` with
the §6 error category, stderr, and the document path.

Clean up temp files using the literal paths captured in Phase 1:

```bash
rm -f "<literal PROMPT_FILE path>" "<literal JOB_JSON_FILE path>" "<literal JOB_JSON_FILE path>.stderr"
```

---

## Gotchas

- **Never Read the document before Phase 4.** The blind-payload pattern
  preserves double-check independence. Reading in Phase 1 defeats the
  entire purpose of the skill.
- **`cat "$USER_DOC" >> "$PROMPT_FILE"`** — file redirect keeps stdout
  empty. `cat "$USER_DOC"` alone would dump content into Claude's
  context. The `>> "$PROMPT_FILE"` is load-bearing.
- **Never pass a positional argument with Pattern B's stdin pipe.**
  `readTaskPrompt` short-circuits on `positionalPrompt || readStdinIfPiped()` (`:619`); a positional silently drops the entire blind payload.
- **`set -o pipefail` is mandatory.** Without it, a cat-side failure
  sends 0 bytes and the companion's `prompt-empty` error masks the root
  cause.
- **Temp file paths must come from Phase 1 stdout.** Do not rely on
  `$PROMPT_FILE` / `$JOB_JSON_FILE` variables in later Bash calls —
  Bash spawns a fresh shell each call. Re-inject literal absolute paths.
- **Claude has bias reviewing its own work.** If the document was
  authored in this session, be extra honest. Don't rationalize valid
  catches.

For the full shared gotchas list, read
`${CLAUDE_PLUGIN_ROOT}/references/companion-usage.md §10`.
