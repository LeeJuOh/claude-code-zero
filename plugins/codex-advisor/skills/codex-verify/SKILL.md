---
name: codex-verify
description: "Verify a plan or document using Codex as independent reviewer with PASS/FAIL verdict. Use when asked \"codex verify\", \"verify this plan\", \"review this doc for issues\"."
argument-hint: "path/to/document.md [focus text] [--model SLUG] [--effort LEVEL]"
allowed-tools: ["Bash", "Read", "Grep", "Glob", "AskUserQuestion", "Agent"]
disallowed-tools: ["SendMessage"]
---

# Codex Document Verification + Double-Check

You are a **translator + executor**. The user wants an independent review of a
plan or document. Your first job is to hand the document to Codex **without ever
loading it into your own context**. Your second job is to hand what Codex returns
to a fresh Verifier subagent and report the verdict it reaches. The judging is
deliberately not yours — if you drafted the document in this session, a blind
payload cannot erase that memory, and a fresh reader has no such stake (ADR 0012).

For code review use `/codex-review`. For research use `/codex-research`.

## Execution Contract

**This contract overrides default exploration habits. Read it before Phase 1.**

| Phase | Allowed | Forbidden |
|-------|---------|-----------|
| 1 ANALYZE | `test -f/-s`, `wc -l/-c`, `file`, `echo`, `printf`, `cat "$DOC" >> "$PROMPT_FILE"` (file-redirect, no stdout) | `cat "$DOC"` to stdout, `head`, `tail`, Read, Grep, Glob |
| 2 INVOKE | Bash for companion launch via stdin pipe | All source / document reads to stdout |
| 3 WAIT | `status --wait` loop (≤6 iterations, ≤24 min), result written to a file | All reads, manual polling, `ps`/`kill` |
| 4 VERIFY | `prepare-verifier.py --mode doc`, then `Agent` (`codex-advisor:verifier`) | Reading the document or the Codex result; judging any finding yourself |
| 5 REPORT + SAVE | Write report file | n/a |

**Why the document stays out of context:** the Verifier judges against the
document, and it can only do that honestly if it comes to the document fresh.
Your copy would add nothing and cost the independence. The blind-payload pattern
(`cat "$DOC" >> "$PROMPT_FILE"`) redirects to a file, not stdout, so your context
stays clean; Phase 4 passes paths, not text, for the same reason.

Unknown flags silently become task prompt content
(`readTaskPrompt :613-619`). Phase 1 is the only safety net.

---

## Phase 1: Analyze + assemble blind payload

### Parse `$ARGUMENTS`

**Whitelist for this skill:** `--model <slug>`, `--effort <level>` (skill-level, route through `apply-codex-config.py` — never reach the companion). The document path and the focus text are other skill inputs, not companion flags.

Take the document path first, then read whatever text is left as **focus** —
natural-language direction for the review, appended to the `<task>` focus areas.

- **A single path** → the document to verify.
- **Text beside the path** → the focus text. Join the non-flag, non-meta tokens
  with spaces. No focus text is the normal case; the payload is then identical
  to a run with no focus at all.
- **Multiple paths** → `AskUserQuestion` which one.
- **Meta-instructions addressed to YOU** (e.g. "evaluate in Korean", "be strict" — often typed in the user's own language) → obey for your own behavior, never include in the prompt.
- **No args** → `AskUserQuestion`: "What document should I verify?"
- **Unknown flags** (e.g., `--base`, `--write`, `--foo`) → `AskUserQuestion`. verify has no companion flags to forward. `--model`/`--effort` are skill-level and route through `apply-codex-config.py`.

### Hypothesis exclusion

Codex is the independent reviewer here, and a reviewer handed a conclusion
confirms that conclusion instead of forming its own — anchoring. So the focus
text carries **where to look and what was observed**, and your own read of the
document stays behind. Sort what you were given into three kinds:

| Kind | Example | Forwarded |
|---|---|---|
| **Evidence** — symptom, observed condition, the request in the user's own words | "the rollout section changed twice last week" | yes |
| **Focus** — an area to examine, no claim attached | "security angle", "look hard at the migration sequencing" | yes |
| **Hypothesis** — a claim about what is wrong, a named section plus a verdict, the answer you expect | "§4's rollback plan can't work without a feature flag", "the estimates are the weak part" | no |

The boundary in one line: **a claim about what is wrong makes it a hypothesis; a
bare area makes it focus.** "Check the rollback plan" points somewhere and
claims nothing — focus. "The rollback plan is missing a feature flag" hands over
the finding — hypothesis.

Apply this the same way whatever the words' origin — whether the user typed the
slash command or you read their intent and invoked this skill yourself. Your own
invocations are where hypotheses leak hardest, and a test for "who typed this"
would make one sentence behave two ways.

Keep the excluded text. Phase 1.5 shows it, and the user can send it after all
in one step.

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
RESULT_FILE="${CLAUDE_PLUGIN_DATA}/tmp/verify-result-${TS}.json"
echo "PROMPT_FILE=$PROMPT_FILE"
echo "JOB_JSON_FILE=$JOB_JSON_FILE"
echo "RESULT_FILE=$RESULT_FILE"

# Header via heredoc — no document content yet.
# Block provenance — official gpt-5-4-prompting (prompt-blocks.md), bodies
# adapted to this skill's output schema; re-checked against the 5.6/Astra
# guides 2026-09-11. Re-sync the tag set if the official guide updates.
#   task                        — §Core Wrapper
#   structured_output_contract  — §Output and Format
#   grounding_rules             — §Grounding and Missing Context
#   completeness_contract       — §Follow-through and Completion
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
Pay particular attention to: <literal focus text from Phase 1 — omit this whole line when no focus text was given>
</task>

<structured_output_contract>
Return a structured verdict:
1. PASS or FAIL (with clear reasons)
2. Blocking issues (P1) — must fix before proceeding
3. Recommendations (P2) — non-blocking improvements
Be direct. No compliments. Just the problems.
</structured_output_contract>

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
Parsed: doc="docs/plan.md" (DOC_LINES=247), focus="security angle", payload=PROMPT_FILE
```

Omit `focus=` when there was none.

Order: apply-codex-config.py output first, Parsed line second. Remember the literal `PROMPT_FILE`, `JOB_JSON_FILE`, `RESULT_FILE`, and `USER_DOC` paths. They are needed in later phases.

For edge cases, read `${CLAUDE_PLUGIN_ROOT}/references/companion-usage.md §7` (ANALYZE rules) and `§8` (blind-payload details).

---

## Phase 1.5: Draft Review

Before sending anything to Codex, show the user the verification
prompt. The XML payload is already written to PROMPT_FILE (with the
document blind-appended). Show the prompt structure — especially the
focus areas — so the user can verify or customize the review framing.

### Display the draft

Show the XML prompt header (everything except the `<document>` body)
in a fenced code block, plus document info:

````
**Verification prompt to send to Codex:**

```xml
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
Pay particular attention to: security angle
</task>

<structured_output_contract>
Return a structured verdict:
1. PASS or FAIL (with clear reasons)
2. Blocking issues (P1) — must fix before proceeding
3. Recommendations (P2) — non-blocking improvements
Be direct. No compliments. Just the problems.
</structured_output_contract>

<grounding_rules>
Ground every finding in the document text. Cite specific sections.
Do not speculate about issues not evidenced in the document.
</grounding_rules>

<completeness_contract>
Review the entire document before finalizing.
Check for interactions between sections that may create contradictions.
</completeness_contract>
```

Document: `docs/plan.md` (247 lines) — blind-appended as `<document>`
Excluded (hypothesis): "§4's rollback plan can't work without a feature flag"
````

The XML block must reflect the **exact content** written to
PROMPT_FILE (minus the document body). Do not summarize. The example above
shows a run with focus text — drop that line when there was none.

Always print the `Excluded (hypothesis):` line, with `(none)` when nothing was
excluded, so the user sees the rule's decision rather than inferring it from
what survived.

### Ask for approval

Use `AskUserQuestion` exactly once:

- Question: "This verification prompt will be sent to Codex."
- Options:
  1. "Approve — execute as shown"
  2. "Send the excluded lines too" — offer this only when something was excluded
  3. "Needs changes"
  4. "Cancel"

### Handle the response

- **Approve** → proceed to Phase 2 with the current PROMPT_FILE.
- **Send the excluded lines too** → append the excluded text to the focus
  text, rewrite PROMPT_FILE the same way as below, then re-display and re-ask.
  The user asked for it, so it travels — but they see the prompt it produced
  before it runs.
- **Needs changes** → the user will describe what to change. Common
  edits: reword focus areas, add domain-specific review criteria,
  remove irrelevant focus areas, change the review tone. Rewrite
  PROMPT_FILE with updated XML header, re-append the document via
  blind redirect, then re-display and re-ask. No loop limit.
- **Cancel** → clean up PROMPT_FILE and JOB_JSON_FILE, stop execution.

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
node "$CODEX_COMPANION" result "<literal JOB_ID>" --json \
  > "<literal RESULT_FILE path>"
```

The redirect is load-bearing: Phase 4 hands that file to the script and to the
Verifier, and Codex's answer quotes the document you have been keeping out of
context. Printing it here would undo Phase 1.

Full error table: `${CLAUDE_PLUGIN_ROOT}/references/companion-usage.md §6`.

---

## Phase 4: Verify

You still do not read the document. A fresh Verifier subagent reads it, reads
Codex's result, and decides — you never formed an opinion about this document, and
this phase keeps it that way. Your job here is plumbing: run the script, launch the
Verifier, collect what comes back.

### Step 1 — Prepare the payload

```bash
WORK="${CLAUDE_PLUGIN_DATA}/tmp/verify-payload-$(date +%s%N)"
echo "WORK=$WORK"

python3 "${CLAUDE_PLUGIN_ROOT}/scripts/prepare-verifier.py" \
  --mode doc --skill verify \
  --prompt-file "<literal PROMPT_FILE path>" \
  --result-file "<literal RESULT_FILE path>" \
  --document "<literal USER_DOC path>" \
  --out-dir "$WORK"
echo "prepare-verifier exit=$?"
```

The payload holds those three paths and nothing else — no document text, no Codex
text. That is what lets the Verifier read them first-hand while your context stays
clean. There is no citation check here: the input is one document, so a section
reference either resolves when the Verifier opens the file or it does not.

| Exit | Meaning | What you do |
|---|---|---|
| 0 | payload written | Step 2 |
| 2 | bad usage, unreadable input, or git failure | Show stderr verbatim and stop. |

### Step 2 — Launch the Verifier

Make one `Agent` call:

- `subagent_type: codex-advisor:verifier`, which starts a fresh subagent. Not
  `fork` — a fork inherits this entire conversation, including whatever you know
  about this document.
- `prompt`: the `group-all.json` path and nothing else. A PreToolUse hook replaces
  the prompt with that file's hash-checked contents, so any sentence you write
  around the path is discarded before the Verifier sees it.

When the `Agent` call fails, the result is `Unverified — Verifier call failed`, and
by rule 3 in `references/evaluation.md` that is a FAIL. Do not judge the result in
its place and do not retry on your own. A retry the user asks for is a new `Agent`
call on the same payload path: a Verifier already running or finished takes no
follow-up message.

### Step 3 — Collect the verdicts

The Verifier returns one JSON object, `{"verdicts": [...]}`. It split Codex's prose
into items itself and ided them `item-1`, `item-2`, …, because nobody numbered them
in advance.

Read `${CLAUDE_PLUGIN_ROOT}/references/evaluation.md` and follow its *Reporting*
section — match verdicts to ids, count, and apply the PASS/FAIL rules there. The
verdict is a count, not a judgment of yours.

A verdict you disagree with stays exactly as the Verifier wrote it; your
disagreement goes beneath it on one `Author note (main session):` line. Rewriting
the verdict would make you the judge again.

---

## Phase 5: Report + save

```bash
mkdir -p "${CLAUDE_PLUGIN_DATA}/reviews"
```

**Success:** save to
`${CLAUDE_PLUGIN_DATA}/reviews/verify-<YYYYMMDD-HHMMSS>.md` using the standard
format in `references/evaluation.md` — the document path as the scope, Codex's
output verbatim, the verdicts by classification, the summary counts, and the
PASS/FAIL line that section's rules produce.

**Failure:** save to
`${CLAUDE_PLUGIN_DATA}/reviews/verify-<YYYYMMDD-HHMMSS>-failed.md` with
the §6 error category, stderr, and the document path.

Clean up temp files using the literal paths captured in Phase 1:

```bash
rm -f "<literal PROMPT_FILE path>" "<literal JOB_JSON_FILE path>" "<literal JOB_JSON_FILE path>.stderr" \
  "<literal RESULT_FILE path>"
```

Leave `$WORK` where it is. A re-verification the user asks for needs that payload
file and its manifest, and the hook refuses a payload it cannot hash-check.

---

## Gotchas

- **The document never enters your context, in any phase.** Phase 1 redirects
  it into the prompt file and Phase 4 passes its path to the Verifier. Reading it
  yourself at any point puts an opinion where the independence was.
- **`cat "$USER_DOC" >> "$PROMPT_FILE"`** — file redirect keeps stdout
  empty. `cat "$USER_DOC"` alone would dump content into Claude's
  context. The `>> "$PROMPT_FILE"` is load-bearing.
- **Never pass a positional argument with Pattern B's stdin pipe.**
  `readTaskPrompt` short-circuits on `positionalPrompt || readStdinIfPiped()` (`:619`); a positional silently drops the entire blind payload.
- **`set -o pipefail` is mandatory.** Without it, a cat-side failure
  sends 0 bytes and the companion's `prompt-empty` error masks the root
  cause.
- **Temp file paths must come from Phase 1 stdout.** Do not rely on
  `$PROMPT_FILE` / `$JOB_JSON_FILE` / `$RESULT_FILE` variables in later Bash
  calls — Bash spawns a fresh shell each call. Re-inject literal absolute paths.

For the full shared gotchas list, read
`${CLAUDE_PLUGIN_ROOT}/references/companion-usage.md §10`.
