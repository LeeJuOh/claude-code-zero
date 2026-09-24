---
name: codex-research
description: "Deep-dive research using Codex, double-checked by a fresh verifier subagent. Use when asked \"codex research\", \"deep dive with codex\", \"investigate this topic\". Not for code review or plan verification."
argument-hint: "topic [path/to/document.md] [--model SLUG] [--effort LEVEL]"
allowed-tools: ["Bash", "Read", "Grep", "Glob", "AskUserQuestion", "Agent"]
---

# Codex Research + Independent Verification

You are a **translator + executor**. The user wants deep-dive research. Your first
job is to hand the topic (and any context document) to Codex **without loading the
document into your own context**. Your second job is to hand what Codex returns to
a fresh Verifier subagent, which judges the findings and raises what the research
left out. The judging is deliberately not yours (ADR 0012).

For code review use `/codex-review`. For plan verification use
`/codex-verify`.

## Execution Contract

**This contract overrides default exploration habits. Read it before Phase 1.**

| Phase | Allowed | Forbidden |
|-------|---------|-----------|
| 1 ANALYZE | `test -f/-s`, `wc -l/-c`, `file`, `echo`, `printf`, `cat "$DOC" >> "$PROMPT_FILE"` (file-redirect, no stdout) | `cat "$DOC"` to stdout, `head`, `tail`, Read, Grep, Glob |
| 2 INVOKE | Bash for companion launch via stdin pipe | All source / document reads to stdout |
| 3 WAIT | `status --wait` loop (≤6 iterations, ≤24 min), result written to a file | All reads, manual polling, `ps`/`kill` |
| 4 VERIFY | `prepare-verifier.py --mode doc`, then `Agent` (`codex-advisor:verifier`) | Reading the document or the Codex result; judging or supplementing any finding yourself |
| 5 REPORT + SAVE | Write report file | n/a |

**Why the material stays out of context:** the value of this skill is a second
reader who owes nothing to the first. Once you have read Codex's findings, your
own additions arrive downstream of them — which is agreement dressed as
independence. Passing paths instead of text is what keeps the two readings apart.

Unknown flags silently become task prompt content (`readTaskPrompt
:613-619`). Phase 1 is the only safety net.

---

## Phase 1: Analyze + assemble blind payload

### Parse `$ARGUMENTS`

**Whitelist for this skill:** `--model <slug>`, `--effort <level>` (skill-level, route through `apply-codex-config.py` — never reach the companion). The topic and optional document path are other skill inputs, not companion flags.

Rules:

- **Plain text** → treat as the research topic/question.
- **A single path** → treat as a context document; the research task comes from the surrounding text or the filename.
- **Mixed** (topic + path) → both, in the blind payload template.
- **Meta-instructions addressed to YOU** (e.g. "in Korean", "quickly", "thoroughly" — often typed in the user's own language) → obey for your own behavior, never include in the prompt.
- **No args** → `AskUserQuestion`: "What should I research?"
- **Unknown flags** (e.g., `--base`, `--write`, `--foo`) → `AskUserQuestion`. research has no companion flags to forward. `--model`/`--effort` are the only skill-level flags and route through `apply-codex-config.py`, not the companion.

### Hypothesis exclusion

Codex is the investigator here, and an investigator handed an answer verifies
that answer instead of searching — anchoring. So the topic carries **what to
investigate and what has been observed**, and your own conclusion stays behind.
Sort what you were given into three kinds:

| Kind | Example | Forwarded |
|---|---|---|
| **Evidence** — symptom, measurement, the question in the user's own words | "p99 doubled after the 3.2 upgrade" | yes |
| **Focus** — an area or angle to investigate, no claim attached | "compare tRPC and GraphQL for our shape of API", "the caching layer" | yes |
| **Hypothesis** — a claim about cause, a preferred conclusion, the answer you expect | "the regression is the new connection pool default", "tRPC is the right call, confirm it" | no |

The boundary in one line: **a claim about the answer makes it a hypothesis; a
bare area or question makes it focus.** "Why did p99 double after 3.2?" asks —
focus. "p99 doubled because 3.2 changed the pool default" answers — hypothesis.

Apply this the same way whatever the words' origin — whether the user typed the
slash command or you read their intent and invoked this skill yourself. Your own
invocations are where hypotheses leak hardest, and a test for "who typed this"
would make one sentence behave two ways.

Keep the excluded text. Phase 1.5 shows it, and the user can send it after all
in one step.

### If a document was provided, validate it

```bash
# Input validation only — never load content.
# Replace <literal doc path> with the path parsed from $ARGUMENTS.
test -f "<literal doc path>" || { echo "File not found: <literal doc path>" >&2; exit 1; }
test -s "<literal doc path>" || { echo "File is empty: <literal doc path>" >&2; exit 1; }
echo "DOC_LINES=$(wc -l < "<literal doc path>")"   # size info, not content
```

### Assemble the payload

```bash
set -o pipefail
CODEX_COMPANION=$("${CLAUDE_PLUGIN_ROOT}/scripts/resolve-companion.sh") \
  || { echo "Official Codex plugin not found — run /codex-setup" >&2; exit 1; }

mkdir -p "${CLAUDE_PLUGIN_DATA}/tmp"
TS=$(date +%s%N)
PROMPT_FILE="${CLAUDE_PLUGIN_DATA}/tmp/research-prompt-${TS}.txt"
JOB_JSON_FILE="${CLAUDE_PLUGIN_DATA}/tmp/research-job-${TS}.json"
RESULT_FILE="${CLAUDE_PLUGIN_DATA}/tmp/research-result-${TS}.json"
echo "PROMPT_FILE=$PROMPT_FILE"
echo "JOB_JSON_FILE=$JOB_JSON_FILE"
echo "RESULT_FILE=$RESULT_FILE"

# Header via heredoc. Replace <literal topic> with the cleaned research
# topic from Phase 1. Do NOT embed the user's meta-instructions.
# Block provenance — official gpt-5-4-prompting (prompt-blocks.md), bodies
# adapted to this skill's output schema; re-checked against the 5.6/Astra
# guides 2026-09-11. Re-sync the tag set if the official guide updates.
#   task                        — §Core Wrapper
#   structured_output_contract  — §Output and Format
#   research_mode               — §Task-Specific Blocks
#   citation_rules              — §Grounding and Missing Context
cat > "$PROMPT_FILE" <<'EOF'
<task>
You are a technical researcher conducting a deep investigation.
Topic: <literal topic from Phase 1>
Investigate thoroughly. Use web search if helpful.
Surface non-obvious insights, not just the first answer.
</task>

<structured_output_contract>
Structured analysis with clear sections.
Separate: observed facts, reasoned inferences, open questions.
Identify risks, trade-offs, alternative perspectives.
</structured_output_contract>

<research_mode>
Breadth first, then depth where evidence changes the recommendation.
</research_mode>

<citation_rules>
Cite sources. Prefer primary. Say "I'm not sure" rather than guessing.
</citation_rules>
EOF
```

**Topic-only mode:** if the user gave no document, stop here — the
payload is complete. Skip the append step below.

**Document mode:** append the context document via file redirect:

```bash
printf '\n<context_document>\n' >> "$PROMPT_FILE"
# Use the literal doc path, NOT a shell variable from a prior Bash call.
cat "<literal doc path>" >> "$PROMPT_FILE"
printf '\n</context_document>\n' >> "$PROMPT_FILE"
```

### Apply model/effort (if either flag was provided)

Run after payload assembly, before Phase 2, so the companion sees the new `config.toml`:

```bash
python3 "${CLAUDE_PLUGIN_ROOT}/scripts/apply-codex-config.py" \
  "<literal clean model from Phase 1 or empty>" \
  "<literal clean effort from Phase 1 or empty>" \
  --run-flags model,effort
```

Relay its stdout verbatim. If it exits non-zero, relay its stderr and stop — launching Codex anyway would run it on settings the user didn't ask for. A `Run flags:` line means the project's own `.codex/config.toml` sets that value and outranks `config.toml`; add those flags, exactly as printed, to the `task` command in Phase 2. **config.toml is global** — the change affects every Codex invocation until changed again. Flag that to the user when values changed.

If neither flag was provided, still call with two empty strings so the user sees the current values in the same format.

**Before Phase 2, also print the Parsed line:**

```
Parsed: topic="GraphQL vs tRPC in 2026", doc=(none)
# or
Parsed: topic="performance regression analysis", doc="benchmarks/results.md" (DOC_LINES=512)
```

Order: apply-codex-config.py output first, Parsed line second. Remember the literal `PROMPT_FILE`, `JOB_JSON_FILE`, `RESULT_FILE`, and (if any) `USER_DOC` paths.

For edge cases, read `${CLAUDE_PLUGIN_ROOT}/references/companion-usage.md §7` (ANALYZE rules) and `§8` (blind-payload details).

---

## Phase 1.5: Draft Review

Before sending anything to Codex, show the user what will be sent.
The XML payload is already written to PROMPT_FILE (without the
document body for document mode — that's blind-appended). Show the
prompt structure so the user can verify the topic and framing.

### Display the draft

Show the XML prompt header (everything except the document body) in a
fenced code block, plus document info if attached:

````
**Prompt to send to Codex research:**

```xml
<task>
You are a technical researcher conducting a deep investigation.
Topic: GraphQL vs tRPC performance in 2026
Investigate thoroughly. Use web search if helpful.
Surface non-obvious insights, not just the first answer.
</task>

<structured_output_contract>
Structured analysis with clear sections.
Separate: observed facts, reasoned inferences, open questions.
Identify risks, trade-offs, alternative perspectives.
</structured_output_contract>

<research_mode>
Breadth first, then depth where evidence changes the recommendation.
</research_mode>

<citation_rules>
Cite sources. Prefer primary. Say "I'm not sure" rather than guessing.
</citation_rules>
```

Document: `benchmarks/results.md` (512 lines) — blind-appended as `<context_document>`
Excluded (hypothesis): "the regression is the new connection pool default"
````

For topic-only mode (no document), omit the Document line.

The XML block must reflect the **exact content** written to
PROMPT_FILE. Do not summarize or abbreviate the XML structure.

Always print the `Excluded (hypothesis):` line, with `(none)` when nothing was
excluded, so the user sees the rule's decision rather than inferring it from
what survived.

### Ask for approval

Use `AskUserQuestion` exactly once:

- Question: "This prompt will be sent to Codex research."
- Options:
  1. "Approve — execute as shown"
  2. "Send the excluded lines too" — offer this only when something was excluded
  3. "Needs changes"
  4. "Cancel"

### Handle the response

- **Approve** → proceed to Phase 2 with the current PROMPT_FILE.
- **Send the excluded lines too** → fold the excluded text back into the
  topic, rewrite PROMPT_FILE the same way as below, then re-display and
  re-ask. The user asked for it, so it travels — but they see the prompt it
  produced before it runs.
- **Needs changes** → the user will describe what to change (e.g.,
  topic rewording, adding/removing XML blocks, changing research
  framing). Rewrite PROMPT_FILE with the updated content (re-append
  the document if in document mode), then re-display and re-ask. No
  loop limit.
- **Cancel** → clean up PROMPT_FILE and JOB_JSON_FILE, stop execution.

---

## Phase 2: Invoke (Pattern B — stdin pipe to `task --background`)

```bash
# NEVER pass a positional arg — readTaskPrompt short-circuits on
# positionalPrompt (:619), silently dropping the entire blind payload.
cat "<literal PROMPT_FILE path>" | node "$CODEX_COMPANION" task --background --json \
  <flags from the "Run flags:" line, if the apply step printed one> \
  > "<literal JOB_JSON_FILE path>" 2> "<literal JOB_JSON_FILE path>.stderr" \
  || { echo "task launch failed:" >&2; cat "<literal JOB_JSON_FILE path>.stderr" >&2; exit 1; }

# Capture jobId (node, not python)
JOB_ID=$(node -e 'const fs=require("fs");try{const j=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));if(!j.jobId)throw new Error("no jobId");process.stdout.write(j.jobId);}catch(e){process.stderr.write("JOB_ID parse failed: "+e.message+"\n");process.exit(1);}' "<literal JOB_JSON_FILE path>") \
  || { echo "raw companion stdout:" >&2; cat "<literal JOB_JSON_FILE path>" >&2; exit 1; }
echo "JOB_ID=$JOB_ID"
```

Remember the literal `JOB_ID`.

---

## Phase 3: Wait (`status --wait` loop)

Each call blocks ≤4 min. Re-call on timeout. Cap at **6 iterations** (24
minutes).

```bash
# Redirect is load-bearing: `status --json` echoes request.prompt back, document and all.
node "$CODEX_COMPANION" status --wait "<literal JOB_ID>" \
  --timeout-ms 240000 --json > "<literal JOB_JSON_FILE path>.status"

node -e 'const o=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"));process.stdout.write(JSON.stringify({status:o.job&&o.job.status,waitTimedOut:o.waitTimedOut})+"\n")' \
  "<literal JOB_JSON_FILE path>.status"
```

- `completed` → fetch result
- `failed` → categorize per §6, save failure report
- `waitTimedOut === true` + queued/running → re-call
- Cap exhausted → `wait-timeout` (§6). Show JOB_ID, suggest `/codex:status <JOB_ID>`.

Fetch result:

```bash
node "$CODEX_COMPANION" result "<literal JOB_ID>" --json \
  > "<literal RESULT_FILE path>"
```

The redirect is load-bearing: Phase 4 hands that file to the script and to the
Verifier. Printing it here would put Codex's answer in your context before anyone
independent had looked at it.

Full error table: `${CLAUDE_PLUGIN_ROOT}/references/companion-usage.md §6`.

---

## Phase 4: Verify

You still do not read the Codex result or the context document. A fresh Verifier
subagent reads them, judges the findings, opens the sources they cite, and raises
what the research left out. Your job here is plumbing: run the script, launch the
Verifier, collect what comes back.

### Step 1 — Prepare the payload

```bash
WORK="${CLAUDE_PLUGIN_DATA}/tmp/research-payload-$(date +%s%N)"
echo "WORK=$WORK"

# Drop the --document line for a topic-only run — there is no document to name,
# and the approved prompt file is the scope the Verifier judges coverage against.
python3 "${CLAUDE_PLUGIN_ROOT}/scripts/prepare-verifier.py" \
  --mode doc --skill research \
  --prompt-file "<literal PROMPT_FILE path>" \
  --result-file "<literal RESULT_FILE path>" \
  --document "<literal USER_DOC path>" \
  --out-dir "$WORK"
echo "prepare-verifier exit=$?"
```

The payload holds those paths and nothing else — no document text, no Codex text.
`PROMPT_FILE` is the scope the user approved in Phase 1.5, which is what makes
"Codex did not cover this" a checkable claim rather than an opinion about the
topic.

| Exit | Meaning | What you do |
|---|---|---|
| 0 | payload written | Step 2 |
| 2 | bad usage, unreadable input, or git failure | Show stderr verbatim and stop. |

### Step 2 — Launch the Verifier

Make one `Agent` call:

- `subagent_type: codex-advisor:verifier`, which starts a fresh subagent. Not
  `fork` — a fork inherits this entire conversation, and with it every framing you
  and the user built while assembling the topic.
- `prompt`: the `group-all.json` path and nothing else. A PreToolUse hook replaces
  the prompt with that file's hash-checked contents, so any sentence you write
  around the path is discarded before the Verifier sees it.

When the `Agent` call fails, the result is `Unverified — Verifier call failed`. Do
not judge the findings in its place and do not retry on your own. A retry the user
asks for is a new `Agent` call on the same payload path: a Verifier already
running or finished takes no follow-up message.

### Step 3 — Collect the verdicts

The Verifier returns one JSON object, `{"verdicts": [...]}`. It split Codex's prose
into items itself and ided them `item-1`, `item-2`, …, and any part of the approved
scope the result does not cover comes back as `missing-1`, `missing-2`, … labelled
`Confirmed` or `Refuted`. Those are the gaps — report them, do not fill them.

Read `${CLAUDE_PLUGIN_ROOT}/references/evaluation.md` and follow its *Reporting*
section — match verdicts to ids and count. `missing-N` items stay out of the
agreement rate and get their own line: they are not verdicts on anything Codex
claimed.

A verdict you disagree with stays exactly as the Verifier wrote it; your
disagreement goes beneath it on one `Author note (main session):` line. Rewriting
the verdict would make you the judge again.

---

## Phase 5: Report + save

```bash
mkdir -p "${CLAUDE_PLUGIN_DATA}/reviews"
```

**Success:** save to
`${CLAUDE_PLUGIN_DATA}/reviews/research-<YYYYMMDD-HHMMSS>.md` using the standard
format in `references/evaluation.md` — the topic (and document path, if any) as
the scope, Codex's output verbatim, the verdicts by classification, and the
summary counts. The `missing-N` items go under *Gaps in the Codex result*, which
is where a reader looks to see what the research did not answer.

**Failure:** save to
`${CLAUDE_PLUGIN_DATA}/reviews/research-<YYYYMMDD-HHMMSS>-failed.md` with
the §6 error category, stderr, and topic/document path.

Clean up temp files using literal paths from Phase 1:

```bash
rm -f "<literal PROMPT_FILE path>" "<literal JOB_JSON_FILE path>" "<literal JOB_JSON_FILE path>.stderr" \
  "<literal JOB_JSON_FILE path>.status" \
  "<literal RESULT_FILE path>"
```

Leave `$WORK` where it is. A re-verification the user asks for needs that payload
file and its manifest, and the hook refuses a payload it cannot hash-check.

---

## Gotchas

- **Codex can hallucinate sources and facts** — the Verifier opens the URLs and
  sections it cites, which is why the payload gives paths and the Verifier has
  `WebFetch`.
- **The context document never enters your context, in any phase.** Phase 1
  redirects it into the prompt file and Phase 4 passes its path to the Verifier.
- **Topic-only mode skips the document append entirely** — don't
  accidentally pass an empty `<context_document>` tag.
- **`cat "$USER_DOC" >> "$PROMPT_FILE"`** — file redirect keeps stdout
  empty. Reading the doc to stdout defeats the entire point.
- **Never pass a positional argument with Pattern B's stdin pipe.**
  `readTaskPrompt` short-circuits on `positionalPrompt || readStdinIfPiped()` (`:619`); a positional silently drops the entire blind payload.
- **Gaps are reported, not filled.** What Codex left out comes back as
  `missing-N` from the Verifier, which judged it against the scope the user
  approved. Writing your own supplement here would put the author back in the
  analysis.
- **Temp file paths must come from Phase 1 stdout.** Re-inject literal
  absolute paths for `PROMPT_FILE`, `JOB_JSON_FILE`, and `RESULT_FILE`; Bash
  shell variables do not survive across calls.

For the full shared gotchas list, read
`${CLAUDE_PLUGIN_ROOT}/references/companion-usage.md §10`.
