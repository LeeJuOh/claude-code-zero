---
name: codex-rescue
description: "Delegate an implementation task to Codex, then Claude reviews the result. Use when asked \"codex rescue\", \"delegate to codex\", \"have codex do it\", or wants Codex to implement or fix something."
argument-hint: "task description [--write] [--model MODEL] [--effort LEVEL] [--resume-last|--resume|--fresh]"
allowed-tools: ["Bash", "Read", "Grep", "Glob", "AskUserQuestion", "Agent"]
disallowed-tools: ["SendMessage"]
---

# Codex Task Delegation + Double-Check

You are a **translator + executor**. The user is handing off an
implementation task. Your job is to parse their messy input, wrap the
**verbatim** task text in standard prompt scaffolding, let Codex do the work in
the background, then hand the result to a fresh Verifier subagent and report what
it decides. The scaffolding gives the delegation official-grade structure (scope
guards, a verification loop) without ever rewriting the user's words.

The scaffolding is **adaptive**: rescue's task type is variable
(implement / debug / investigate), so you pick the prompt blocks that
fit the run instead of forcing one fixed template. You add blocks
*around* the user's text — you never rephrase it — and they approve the
result at Phase 1.5.

**Critical:** do NOT explore the repo before Codex runs. The point of
delegating is that Codex builds the context. Exploring first wastes turns, and
it puts the code in the context of the one session whose opinion the Verifier is
there to replace.

## Execution Contract

**This contract overrides default exploration habits. Read it before Phase 1.**

| Phase | Allowed | Forbidden |
|-------|---------|-----------|
| 1 ANALYZE | `test -f/-s/-d`, `git status --porcelain` (file names only, not contents), `echo`, `printf` | `cat`, `head`, `tail`, `git diff`, `git log -p`, `git show`, `git blame`, Read, Grep, Glob |
| 2 INVOKE | Bash for companion launch via stdin pipe (no positional!) | All source reads |
| 3 WAIT | `status --wait` loop (≤6 iterations, ≤24 min) | All source reads, manual polling, `ps`/`kill` |
| 4 VERIFY | `prepare-verifier.py`, then `Agent` (`codex-advisor:verifier`) | Reading source; judging or re-judging the result yourself |
| 5 REPORT + SAVE | Write report file | n/a |

Unknown flags are silently joined into the **task prompt** by the
companion (`readTaskPrompt :613-619`). Phase 1 whitelist is the only
safety net.

---

## Phase 1: Analyze

You are a translator. Use LM intelligence, not regex tables.

**Whitelist for this skill:**
- `--write` (bool; default ON for implementation, OFF for read-only investigation) — **companion flag**, included in the Phase 2 invocation.
- `--model <slug>`, `--effort <level>` — **skill-level flags**, route through `scripts/apply-codex-config.py` (see Apply block below) and **never reach the companion**. The alias `spark` auto-expands to `gpt-5.3-codex-spark`. Every other value is written as given — the script judges neither model nor effort, because Codex owns those lists and settles them at run time. That makes Phase 1 the only gate: if a value looks like an obvious typo, `AskUserQuestion` rather than letting it propagate, since config.toml is global and nothing downstream will second-guess it.
- `--resume-last` / `--resume` / `--fresh` — mutually exclusive companion flags. Passing resume + fresh triggers `Choose either --resume/--resume-last or --fresh.` (`:750`). If ANALYZE produces a conflict, `AskUserQuestion`; never forward both.

**Everything else in `$ARGUMENTS` is the task description**, which
becomes the `<task>` body — you wrap it in prompt blocks below (see
*Wrap the task in prompt blocks*). Translate it cleanly:

- **Meta-instructions addressed to YOU** (e.g. "answer in Korean", "don't read the repo first" — often typed in the user's own language) → obey for your own behavior, never include in the task prompt (they'd confuse Codex).
- **Junk, emoji** → drop.
- **Vague task** (e.g., just "fix it", "do something") → `AskUserQuestion` for clarification. Never explore the repo to guess intent.
- **Unknown flag** (e.g., `--foo`, `--background`, `--wait`) → `AskUserQuestion`. `--background` and `--wait` are not needed — Pattern B always uses `--background` internally. `--wait` on task is **silent prompt corruption**; we never accept it.
- **Ambiguous effort / model value** → `AskUserQuestion`.

### Apply model/effort (if either flag was provided)

Run before Phase 2 so the companion sees the new `config.toml`:

```bash
python3 "${CLAUDE_PLUGIN_ROOT}/scripts/apply-codex-config.py" \
  "<literal clean model from Phase 1 or empty>" \
  "<literal clean effort from Phase 1 or empty>"
```

Relay the `Model: ... | Effort: ...` stdout line verbatim; pass stderr advisories through. **config.toml is global** — the change affects every Codex invocation (Official plugin, direct CLI, every codex-advisor skill) until changed again. Flag that to the user when values changed.

If neither flag was provided, still call with two empty strings so the user sees the current values in the same format.

**Before Phase 2, also print the Parsed line:**

```
Parsed: task="implement login rate limiter", write=true, resume=(last)
```

Order: apply-codex-config.py output first, Parsed line second. (Model/effort already shown by the apply script — don't duplicate them in Parsed.)

For edge cases, read `${CLAUDE_PLUGIN_ROOT}/references/companion-usage.md §7`.

### Wrap the task in prompt blocks

The cleaned task text is **not** sent bare. Wrap it in standard
scaffolding so the delegation carries the same structure verify/research
get — but keep the user's words **verbatim** inside `<task>` (no
summarizing, no rewording). You add blocks *around* their text; you
never rewrite it. That's the whole point: structure without distortion.

Pick the blocks by task type — `--write` is the signal. An
implementation or fix mutates the repo, so it needs an autonomy boundary
it can act inside; a read-only investigation needs grounding instead.

- **Always:** `<task>` — the approved task text, verbatim.
- **`--write` ON (implement / fix):** add `<autonomy_policy>`, full form.
- **`--write` OFF (read-only investigation):** add `<autonomy_policy>`, read-only form, plus `<grounding_rules>`.

One policy block covers scope, follow-through, and testing because Codex
has no one to ask: the companion rejects every server request it makes,
and a turn that ends in a question still reports `completed`, so a
question reads as success while the task sits unfinished. The policy
settles the boundary up front rather than inviting a check-in.

Block bodies — copy exactly:

<!-- source: OpenAI "Using GPT-5.6" §Define autonomy and approval boundaries; "Using GPT-6 Astra" §Initiative and follow-through, §Testing and verification (2026-09-11) -->

```xml
<autonomy_policy>
For review, diagnose, or research requests, inspect the relevant materials and report. Do not implement changes.
For change or fix requests, make the requested in-scope local changes and run relevant non-destructive validation without asking first.
Bias towards action. Do not stop at a partial answer, a proposed plan, or an offer to continue.
Do not perform external writes, destructive actions, or scope expansions the task did not ask for; list them in the final report instead. What the task itself asks for is already approved.
Never end with a question — no one can answer it.
If the task's stated cause does not hold, make the requested change anyway and say so in the final report.
Do not write tests for reversible, low-impact changes that mirror the implementation.
</autonomy_policy>
```

The read-only form drops the lines about making changes and keeps the
reporting and follow-through ones. The question line stays: a read-only
run reaches Codex through the same companion, so a question ends the
turn there too, and the job still reports `completed`.

The premise line is what keeps a wrong order from passing as a clean run.
The task text travels verbatim, cause claim included, so Codex may be sent to
the wrong place — and Phase 4 only checks whether the requested change landed,
not whether it was the right change. Reporting the mismatch costs a sentence;
acting on it would be the scope expansion the line above forbids, so the
read-only form asks only for the report.

```xml
<autonomy_policy>
For review, diagnose, or research requests, inspect the relevant materials and report. Do not implement changes.
Bias towards action. Do not stop at a partial answer, a proposed plan, or an offer to continue.
Never end with a question — no one can answer it.
If the task's stated cause does not hold, say so in the final report.
</autonomy_policy>
```

<!-- source: official gpt-5-4-prompting (prompt-blocks.md) §Grounding and Missing Context › grounding_rules; re-checked against the 5.6/Astra guides 2026-09-11 -->

```xml
<grounding_rules>
Ground every claim in the provided context or your tool outputs.
Do not present inferences as facts.
If a point is a hypothesis, label it clearly.
</grounding_rules>
```

Assemble the wrapped prompt with `<task>` first, then the selected
blocks in the order listed. This wrapped XML — **not** the bare task
text — is what Phase 1.5 previews and Phase 2 writes to PROMPT_FILE.

---

## Phase 1.5: Draft Review

Before sending anything to Codex, show the user exactly what will be
sent. The user approved the *intent* — now they approve the *prompt*.

### Display the draft

Show the **wrapped XML prompt** (everything that will go into
PROMPT_FILE) in a fenced code block, along with the companion flags that
will be used — `<task>` holds their verbatim text, surrounded by the
blocks selected in Phase 1.

````
**Prompt to send to Codex:**

```xml
<task>
<the approved task description from Phase 1 — verbatim, nothing added>
</task>

<autonomy_policy>
For review, diagnose, or research requests, inspect the relevant materials and report. Do not implement changes.
For change or fix requests, make the requested in-scope local changes and run relevant non-destructive validation without asking first.
Bias towards action. Do not stop at a partial answer, a proposed plan, or an offer to continue.
Do not perform external writes, destructive actions, or scope expansions the task did not ask for; list them in the final report instead. What the task itself asks for is already approved.
Never end with a question — no one can answer it.
If the task's stated cause does not hold, make the requested change anyway and say so in the final report.
Do not write tests for reversible, low-impact changes that mirror the implementation.
</autonomy_policy>
```

Flags: `--write` `--resume-last`
````

The example above shows the `--write` block set. For a read-only run,
show the read-only `<autonomy_policy>` followed by `<grounding_rules>`
(per the Phase 1 selection). The fenced block must contain the **exact
wrapped XML** that will be written to PROMPT_FILE — the user's text
verbatim inside `<task>`, no summarization, no rewording.

### Ask for approval

Use `AskUserQuestion` exactly once:

- Question: "This prompt will be sent to Codex task."
- Options:
  1. "Approve — execute as shown"
  2. "Needs changes"
  3. "Cancel"

### Handle the response

- **Approve** → proceed to Phase 2 with the displayed text.
- **Needs changes** → the user will describe what to change. Apply
  their edit to the draft, then re-display and re-ask. No loop
  limit — the user controls when to stop.
- **Cancel** → stop execution. Do not proceed to Phase 2.

---

## Phase 2: Invoke (Pattern B — companion `--background` + stdin pipe)

`task --background` is honored by the companion (`:758-790` →
`enqueueBackgroundTask`). It returns a job payload immediately.

```bash
set -o pipefail
CODEX_COMPANION=$("${CLAUDE_PLUGIN_ROOT}/scripts/resolve-companion.sh") \
  || { echo "Official Codex plugin not found — run /codex-setup" >&2; exit 1; }

mkdir -p "${CLAUDE_PLUGIN_DATA}/tmp"
TS=$(date +%s%N)
PROMPT_FILE="${CLAUDE_PLUGIN_DATA}/tmp/rescue-prompt-${TS}.txt"
JOB_JSON_FILE="${CLAUDE_PLUGIN_DATA}/tmp/rescue-job-${TS}.json"
RESULT_FILE="${CLAUDE_PLUGIN_DATA}/tmp/rescue-result-${TS}.json"
echo "PROMPT_FILE=$PROMPT_FILE"
echo "JOB_JSON_FILE=$JOB_JSON_FILE"
echo "RESULT_FILE=$RESULT_FILE"

# --write only: snapshot the whole working tree (tracked + untracked) as a git
# tree object. Phase 4 diffs against it, so the Verifier sees what Codex changed
# and not what the tree was already dirty with. Drop this line for a read-only
# run — there is nothing to diff. The real index is never touched.
PRE_TREE=$(python3 "${CLAUDE_PLUGIN_ROOT}/scripts/prepare-verifier.py" \
  snapshot --repo "$(git rev-parse --show-toplevel)")
echo "PRE_TREE=$PRE_TREE"

# Write the approved WRAPPED prompt from Phase 1.5 — <task> with the
# user's verbatim text plus the Phase 1 blocks, never the bare task text.
cat > "$PROMPT_FILE" <<'EOF'
<literal approved wrapped XML prompt from Phase 1.5>
EOF

# Launch via stdin pipe. Each flag line below is optional — include only
# what Phase 1 parsed. Omit the entire line for flags not provided.
# --write: include for implementation (default ON); omit for read-only.
# Model/effort are NOT passed as companion flags — they were written to
#   config.toml by apply-codex-config.py in Phase 1 and the companion
#   picks them up from there.
# --resume-last/--resume/--fresh: mutually exclusive; omit if none.
# NEVER pass a positional arg — readTaskPrompt short-circuits on
# positionalPrompt (:619), silently dropping stdin.
cat "$PROMPT_FILE" | node "$CODEX_COMPANION" task --background --json \
  --write \
  --resume-last \
  > "$JOB_JSON_FILE" 2> "${JOB_JSON_FILE}.stderr" \
  || { echo "task launch failed:" >&2; cat "${JOB_JSON_FILE}.stderr" >&2; exit 1; }

# Capture jobId — use node (already a dependency)
JOB_ID=$(node -e 'const fs=require("fs");try{const j=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));if(!j.jobId)throw new Error("no jobId");process.stdout.write(j.jobId);}catch(e){process.stderr.write("JOB_ID parse failed: "+e.message+"\n");process.exit(1);}' "$JOB_JSON_FILE") \
  || { echo "raw companion stdout:" >&2; cat "$JOB_JSON_FILE" >&2; exit 1; }
echo "JOB_ID=$JOB_ID"
```

Each flag line in the template is optional — include only what Phase 1
parsed. Replace `<literal ...>` values with the actual strings from
Phase 1. `--write` defaults to ON for implementation; omit for
read-only investigation.

Remember the literal `PROMPT_FILE`, `JOB_JSON_FILE`, `RESULT_FILE`, `PRE_TREE`,
and `JOB_ID` values. Re-inject these as literal strings in
every subsequent Bash call — shell variables do not survive across calls.

---

## Phase 3: Wait (`status --wait` loop)

Each `status --wait` call blocks ≤4 min (under Bash 300s). Re-call on
timeout. **Cap total iterations at 6** (24 minutes).

```bash
# Repeat this call until status is "completed" or "failed", or cap hit.
node "$CODEX_COMPANION" status --wait "<literal JOB_ID>" \
  --timeout-ms 240000 --json
```

Inspect the returned JSON:

- `status === "completed"` → proceed to fetch result
- `status === "failed"` → categorize per §6, save failure report
- `waitTimedOut === true` and `status` still `queued`/`running` → re-call (iteration budget permitting)
- 6 iterations exhausted → `wait-timeout` (§6). Do NOT silently cancel; leave the job running. Show the user the JOB_ID and suggest `/codex:status <JOB_ID>` for manual follow-up.

Fetch the final result:

```bash
node "$CODEX_COMPANION" result "<literal JOB_ID>" --json \
  > "<literal RESULT_FILE path>"
```

Phase 4 hands that file to the script rather than to you, so write it to disk even
when you are about to read it for the report.

Full error table: `${CLAUDE_PLUGIN_ROOT}/references/companion-usage.md §6`.

Notable cases:

- `Task <id> is still running. Use /codex:status before continuing it.` → a previous task is still in flight. Show the user the active jobId and stop. Never silently cancel.
- `Stored job <id> is missing its task request payload.` → detached worker couldn't load the request. `recovery-impossible`. Save failure report.

---

## Phase 4: Verify

You do not judge what Codex produced — a fresh subagent does. You wrote the task
text, you approved the prompt, and you have been in this conversation the whole
time; an author grading work done to their own order is not a review (ADR 0012).
Your job in this phase is plumbing: run the script, launch the Verifier, collect
what comes back.

The two run modes send different things to the Verifier — a diff when Codex wrote
code, Codex's report when it only investigated. Pick the one that matches Phase 2.

### If Codex made code changes (`--write`)

```bash
set -o pipefail
REPO=$(git rev-parse --show-toplevel)
WORK="${CLAUDE_PLUGIN_DATA}/tmp/verify-$(date +%s%N)"
echo "WORK=$WORK"

python3 "${CLAUDE_PLUGIN_ROOT}/scripts/prepare-verifier.py" \
  --mode diff --pre "<literal PRE_TREE from Phase 2>" \
  --prompt-file "<literal PROMPT_FILE path>" --repo "$REPO" --out-dir "$WORK"
echo "prepare-verifier exit=$?"
```

The script snapshots the tree again and diffs it against the Phase 2 snapshot, so
the payload holds exactly what changed while Codex ran — not whatever the working
tree happened to be dirty with beforehand. Untracked files Codex created or edited
are in it too, because both snapshots cover the whole tree.

`diff_empty: true` means Codex changed nothing. Report that, and launch no
Verifier.

### If Codex returned investigation results (read-only)

```bash
set -o pipefail
REPO=$(git rev-parse --show-toplevel)
WORK="${CLAUDE_PLUGIN_DATA}/tmp/verify-$(date +%s%N)"
echo "WORK=$WORK"

python3 "${CLAUDE_PLUGIN_ROOT}/scripts/prepare-verifier.py" \
  --skill rescue --input "<literal RESULT_FILE path>" --repo "$REPO" \
  --out-dir "$WORK"
echo "prepare-verifier exit=$?"
```

Codex's report here is prose, so the whole of it becomes one payload and the
Verifier decides where the items begin and end. You do not cut it into claims
first — a list you extracted yourself is a list you have already formed an opinion
about.

### Exit codes (both modes)

| Exit | Meaning | What you do |
|---|---|---|
| 0 | payload written | Launch the Verifier |
| 3 | `parse_error` — the companion's result no longer parses | Go to Phase 5 and report `Codex output format changed — no verdicts`. No Verifier, no hand-extracted claims. |
| 4 | `no_output` — Codex returned nothing to judge | Go to Phase 5 and report `Codex returned no output — no verdicts`. |
| 2 | bad usage, unreadable input, or git failure | Show stderr verbatim and stop. |

### Launch the Verifier

Both modes produce a single group, `all`. Make one `Agent` call:

- `subagent_type: codex-advisor:verifier`, which starts a fresh subagent. Not
  `fork` — a fork inherits this entire conversation, including the task you wrote,
  which is exactly the memory the double-check exists to remove.
- `prompt`: the group's `payload` path and nothing else. A PreToolUse hook replaces
  the prompt with that file's hash-checked contents, so any sentence you write
  around the path is discarded before the Verifier sees it. There is no hint to
  pass and no room to pass one.

In `--write` mode the Verifier reads the diff and may `Read` and `Grep` the
surrounding code to see what the change landed in. It splits your task text into
requirements (`req-1`, `req-2`, …) itself and raises anything the diff changed that
no requirement asked for as `side-effect-N`.

When the `Agent` call fails, the result is `Unverified — Verifier call failed`. Do
not judge it in its place and do not retry on your own. If the user asks for a
retry, make a new `Agent` call with the same payload path — a Verifier, running or
finished, is never resumed with a follow-up message.

### Collect the verdicts

The Verifier returns one JSON object, `{"verdicts": [...]}`.

Read `${CLAUDE_PLUGIN_ROOT}/references/evaluation.md` and follow its *Reporting*
section for matching ids, counting, and the `side-effect-N` lines.

A verdict you disagree with stays exactly as the Verifier wrote it; your
disagreement goes beneath it on one `Author note (main session):` line. Rewriting
the verdict would make you the judge again.

---

## Phase 5: Report + save

```bash
mkdir -p "${CLAUDE_PLUGIN_DATA}/reviews"
```

**Success:** save to
`${CLAUDE_PLUGIN_DATA}/reviews/rescue-<YYYYMMDD-HHMMSS>.md` using the standard
format in `references/evaluation.md`, with the task description in *Scope* and
Codex's output verbatim. In `--write` mode the Verifier's `req-N` verdicts are
the per-requirement result and `side-effect-N` goes on the *Unrequested changes*
line.

**Do NOT auto-accept the changes.** Present them and wait for the user —
`references/evaluation.md` has the rule and the reason.

**Failure:** save to
`${CLAUDE_PLUGIN_DATA}/reviews/rescue-<YYYYMMDD-HHMMSS>-failed.md` with
the §6 error category and captured stderr.

Clean up temp files using literal paths:

```bash
rm -f "<literal JOB_JSON_FILE path>" "<literal JOB_JSON_FILE.stderr path>" \
      "<literal RESULT_FILE path>"
```

Leave `$WORK` and `$PROMPT_FILE` where they are. A re-verification the user asks
for needs the payload, the diff, and the task text the payload points at, and the
hook refuses a payload it cannot hash-check.

---

## Gotchas

- **`--model` / `--effort` go through `apply-codex-config.py`, not the companion.** config.toml becomes the single source of truth; routing keeps every codex-advisor skill identical, lets the value persist for the next session without re-typing, and is the only way to set `effort` for review/adversarial (whose `valueOptions = [base, scope, model, cwd]` does not include effort). `apply-codex-config.py` writes whatever it's given without judging it — Codex is the authority on valid models and efforts, so a bad value surfaces there, not here.
- **Never combine `--resume` / `--resume-last` with `--fresh`.** The companion rejects the combination (`:750`).
- **Never pass a positional argument with Pattern B's stdin pipe.** `readTaskPrompt` short-circuits on `positionalPrompt || readStdinIfPiped()` (`:619`); a positional silently drops the entire task description.
- **`--wait` on task is silent prompt corruption.** It becomes part of the task prompt body. ANALYZE must reject it.
- **Do NOT explore the repo in Phase 1.** The point of delegation is that Codex builds the context. Exploring biases the double-check.

For the full shared gotchas list, read
`${CLAUDE_PLUGIN_ROOT}/references/companion-usage.md §10`.
