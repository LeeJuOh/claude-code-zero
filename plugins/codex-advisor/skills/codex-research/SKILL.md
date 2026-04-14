---
name: codex-research
description: "Deep-dive research using Codex with Claude's cross-model synthesis. Use when the user asks \"codex research\", \"codex 리서치\", \"codex 분석\", \"코덱스로 조사\", \"딥다이브\", \"이슈 분석해줘\". NOT for code review or plan verification."
argument-hint: "topic [path/to/document.md] [--model SLUG] [--effort LEVEL]"
allowed-tools: ["Bash", "Read", "Grep", "Glob", "AskUserQuestion"]
---

# Codex Research + Cross-Model Synthesis

You are a **translator + executor + double-checker**. The user wants
deep-dive research. Your job is to hand the topic (and any context
document) to Codex **without loading the document into your own
context**, then synthesize Codex's findings with your own independent
analysis.

For code review use `/codex-review`. For plan verification use
`/codex-verify`.

## Execution Contract

**This contract overrides default exploration habits. Read it before Phase 1.**

| Phase | Allowed | Forbidden |
|-------|---------|-----------|
| 1 ANALYZE | `test -f/-s`, `wc -l/-c`, `file`, `echo`, `printf`, `cat "$DOC" >> "$PROMPT_FILE"` (file-redirect, no stdout) | `cat "$DOC"` to stdout, `head`, `tail`, Read, Grep, Glob |
| 2 INVOKE | Bash for companion launch via stdin pipe | All source / document reads to stdout |
| 3 WAIT | `status --wait` loop (≤6 iterations, ≤24 min) | All reads, manual polling, `ps`/`kill` |
| 4 DOUBLE-CHECK | Verify claims against your own knowledge; read the context document (if any) now | n/a |
| 5 REPORT + SAVE | Write report file | n/a |

**Why the document stays out of context in Phase 1-3:** same reason as
verify — independence. If you read it upfront, your synthesis just
echoes Codex instead of adding independent perspective.

Unknown flags silently become task prompt content (`readTaskPrompt
:585-592`). Phase 1 is the only safety net.

---

## Phase 1: Analyze + assemble blind payload

### Parse `$ARGUMENTS`

**Whitelist for this skill:** `--model <slug>`, `--effort <level>` (skill-level, route through `apply-codex-config.py` — never reach the companion). The topic and optional document path are other skill inputs, not companion flags.

Rules:

- **Plain text** → treat as the research topic/question.
- **A single path** → treat as a context document; the research task comes from the surrounding text or the filename.
- **`resume [follow-up]`** → pass `--resume-last` to the companion.
- **Mixed** (topic + path) → both, in the blind payload template.
- **Meta-instructions addressed to YOU** ("한국어로", "빨리", "thoroughly") → obey for your own behavior, never include in the prompt.
- **No args** → `AskUserQuestion`: "What should I research?"
- **Unknown flags** (e.g., `--base`, `--write`, `--foo`) → `AskUserQuestion`. research has no companion flags to forward. `--model`/`--effort` are the only skill-level flags and route through `apply-codex-config.py`, not the companion.

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
echo "PROMPT_FILE=$PROMPT_FILE"
echo "JOB_JSON_FILE=$JOB_JSON_FILE"

# Header via heredoc. Replace <literal topic> with the cleaned research
# topic from Phase 1. Do NOT embed the user's meta-instructions.
cat > "$PROMPT_FILE" <<'EOF'
<task>
You are a technical researcher conducting a deep investigation.
Topic: <literal topic from Phase 1>
Investigate thoroughly. Use web search if helpful.
Surface non-obvious insights, not just the first answer.
</task>

<compact_output_contract>
Structured analysis with clear sections.
Separate: observed facts, reasoned inferences, open questions.
Identify risks, trade-offs, alternative perspectives.
</compact_output_contract>

<research_mode>
Breadth first, then depth where evidence changes the recommendation.
</research_mode>

<citation_rules>
Cite sources. Prefer primary. Say "I'm not sure" rather than guessing.
</citation_rules>

<grounding_rules>
Ground claims in evidence. Label hypotheses clearly.
</grounding_rules>
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
  "<literal clean effort from Phase 1 or empty>"
```

Relay the `Model: ... | Effort: ...` stdout line verbatim; pass stderr advisories through. **config.toml is global** — the change affects every Codex invocation until changed again. Flag that to the user when values changed.

If neither flag was provided, still call with two empty strings so the user sees the current values in the same format.

**Before Phase 2, also print the Parsed line:**

```
Parsed: topic="GraphQL vs tRPC in 2026", doc=(none)
# or
Parsed: topic="performance regression analysis", doc="benchmarks/results.md" (DOC_LINES=512)
```

Order: apply-codex-config.py output first, Parsed line second. Remember the literal `PROMPT_FILE`, `JOB_JSON_FILE`, and (if any) `USER_DOC` paths.

For edge cases, read `${CLAUDE_PLUGIN_ROOT}/references/companion-usage.md §7` (ANALYZE rules) and `§8` (blind-payload details).

---

## Phase 2: Invoke (Pattern B — stdin pipe to `task --background`)

```bash
# NEVER pass a positional arg — readTaskPrompt short-circuits on
# positionalPrompt (:591), silently dropping the entire blind payload.
cat "<literal PROMPT_FILE path>" | node "$CODEX_COMPANION" task --background --json \
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
# Repeat until status is "completed" or "failed", or cap hit.
node "$CODEX_COMPANION" status --wait "<literal JOB_ID>" \
  --timeout-ms 240000 --json
```

- `completed` → fetch result
- `failed` → categorize per §6, save failure report
- `waitTimedOut === true` + queued/running → re-call
- Cap exhausted → `wait-timeout` (§6). Show JOB_ID, suggest `/codex:status <JOB_ID>`.

Fetch result:

```bash
node "$CODEX_COMPANION" result "<literal JOB_ID>" --json
```

Full error table: `${CLAUDE_PLUGIN_ROOT}/references/companion-usage.md §6`.

---

## Phase 4: Double-check + synthesize

Now you may verify claims, read the context document (if any), and
synthesize.

Read `${CLAUDE_PLUGIN_ROOT}/references/evaluation.md`.

For each substantive claim in Codex's findings:

- **Verify against own knowledge** — is this factually correct?
- **Check citations** — do the sources Codex named actually exist and
  support the claim?
- **Read the context document** (if one was provided) — does the
  document actually say what Codex claims it says?
- **Classify:**
  - **Agree** — claim is verified
  - **Disagree** — claim is wrong, with evidence
  - **Nuance** — real insight, but missing context
  - **False Positive (hallucination)** — Codex cited a source, fact, or
    document passage that does **not exist** or says something different
  - **Uncited** — no concrete source. Label as "needs verification" and
    surface to the user. Never invent sources.

Then **synthesize**:

- Fill gaps Codex missed
- Challenge unstated assumptions
- Combine the verified findings into a coherent analysis
- If Claude independently reaches the same conclusion with no new
  information, call that out — Codex may have added little value

Adapt output format to the question type:
- Comparison → table
- Pros/cons → list
- Root cause → causal chain
- Survey → categorized bullets

---

## Phase 5: Report + save

```bash
mkdir -p "${CLAUDE_PLUGIN_DATA}/reviews"
```

**Success:** save to
`${CLAUDE_PLUGIN_DATA}/reviews/research-<YYYYMMDD-HHMMSS>.md`:

```markdown
# Codex Research — <date>

## Topic
<what was investigated>

## Codex Findings
<verbatim>

## Claude's Evaluation & Synthesis
<independent analysis, with per-finding classification>

## Agreement: <High|Partial|Disagreement>

## Key Takeaways
- <actionable conclusions>
```

**Failure:** save to
`${CLAUDE_PLUGIN_DATA}/reviews/research-<YYYYMMDD-HHMMSS>-failed.md` with
the §6 error category, stderr, and topic/document path.

Clean up temp files using literal paths from Phase 1:

```bash
rm -f "<literal PROMPT_FILE path>" "<literal JOB_JSON_FILE path>" "<literal JOB_JSON_FILE path>.stderr"
```

---

## Gotchas

- **Codex can hallucinate sources and facts** — verify specific claims
  before agreeing.
- **Never Read the context document before Phase 4.** If you do, your
  synthesis just echoes Codex instead of adding independent perspective.
- **Topic-only mode skips the document append entirely** — don't
  accidentally pass an empty `<context_document>` tag.
- **`cat "$USER_DOC" >> "$PROMPT_FILE"`** — file redirect keeps stdout
  empty. Reading the doc to stdout defeats the entire point.
- **Never pass a positional argument with Pattern B's stdin pipe.**
  `readTaskPrompt` short-circuits on `positionalPrompt || readStdinIfPiped()` (`:591`); a positional silently drops the entire blind payload.
- **Value is in synthesis.** If Claude reaches the same conclusion
  alone, Codex added nothing — say so in the report instead of padding.
- **Temp file paths must come from Phase 1 stdout.** Re-inject literal
  absolute paths; Bash shell variables do not survive across calls.

For the full shared gotchas list, read
`${CLAUDE_PLUGIN_ROOT}/references/companion-usage.md §10`.
