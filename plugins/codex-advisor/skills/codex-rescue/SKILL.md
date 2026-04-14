---
name: codex-rescue
description: "Delegate an implementation task to Codex via Official plugin, then Claude reviews the result. Use when the user asks \"codex rescue\", \"codex 위임\", \"코덱스한테 시켜\", \"codex fix\", wants Codex to implement, investigate, or fix something."
argument-hint: "task description [--write] [--model MODEL] [--effort LEVEL] [--resume-last|--resume|--fresh]"
allowed-tools: ["Bash", "Read", "Grep", "Glob", "AskUserQuestion"]
---

# Codex Task Delegation + Double-Check

You are a **translator + executor + double-checker**. The user is
handing off an implementation task. Your job is to parse their messy
input into a clean `task` invocation, let Codex do the work in the
background, then review what changed.

**Critical:** do NOT explore the repo before Codex runs. The point of
delegating is that Codex builds the context. Exploring first biases
your double-check and wastes turns.

## Execution Contract

**This contract overrides default exploration habits. Read it before Phase 1.**

| Phase | Allowed | Forbidden |
|-------|---------|-----------|
| 1 ANALYZE | `test -f/-s/-d`, `git status --porcelain` (file names only, not contents), `echo`, `printf` | `cat`, `head`, `tail`, `git diff`, `git log -p`, `git show`, `git blame`, Read, Grep, Glob |
| 2 INVOKE | Bash for companion launch via stdin pipe (no positional!) | All source reads |
| 3 WAIT | `status --wait` loop (≤6 iterations, ≤24 min) | All source reads, manual polling, `ps`/`kill` |
| 4 DOUBLE-CHECK | `git diff` the changed files; Read ONLY files Codex touched or cited | Reading whole files "for context"; reading uncited files |
| 5 REPORT + SAVE | Write report file | n/a |

Unknown flags are silently joined into the **task prompt** by the
companion (`readTaskPrompt :585-592`). Phase 1 whitelist is the only
safety net.

---

## Phase 1: Analyze

You are a translator. Use LM intelligence, not regex tables.

**Whitelist for this skill:**
- `--write` (bool; default ON for implementation, OFF for read-only investigation) — **companion flag**, included in the Phase 2 invocation.
- `--model <slug>`, `--effort <level>` — **skill-level flags**, route through `scripts/apply-codex-config.py` (see Apply block below) and **never reach the companion**. The alias `spark` auto-expands to `gpt-5.3-codex-spark`. The script validates effort against `{none, minimal, low, medium, high, xhigh}` as an advisory — out-of-set values still save but surface a warning so the user sees it. If the user gives an obviously wrong value (typo), prefer `AskUserQuestion` in Phase 1 over letting it propagate.
- `--resume-last` / `--resume` / `--fresh` — mutually exclusive companion flags. Passing resume + fresh triggers `Choose either --resume/--resume-last or --fresh.` (`:721-723`). If ANALYZE produces a conflict, `AskUserQuestion`; never forward both.

**Everything else in `$ARGUMENTS` is the task description**, which
becomes the prompt body. Translate it cleanly:

- **Meta-instructions addressed to YOU** ("한국어로 답해", "먼저 읽지 마") → obey for your own behavior, never include in the task prompt (they'd confuse Codex).
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

---

## Phase 2: Invoke (Pattern B — companion `--background` + stdin pipe)

`task --background` is honored by the companion (`:730-746` →
`enqueueBackgroundTask`). It returns a job payload immediately.

```bash
set -o pipefail
CODEX_COMPANION=$("${CLAUDE_PLUGIN_ROOT}/scripts/resolve-companion.sh") \
  || { echo "Official Codex plugin not found — run /codex-setup" >&2; exit 1; }

mkdir -p "${CLAUDE_PLUGIN_DATA}/tmp"
TS=$(date +%s%N)
PROMPT_FILE="${CLAUDE_PLUGIN_DATA}/tmp/rescue-prompt-${TS}.txt"
JOB_JSON_FILE="${CLAUDE_PLUGIN_DATA}/tmp/rescue-job-${TS}.json"
PRE_LIST="${CLAUDE_PLUGIN_DATA}/tmp/rescue-pre-${TS}.list"
PRE_SHA="${CLAUDE_PLUGIN_DATA}/tmp/rescue-pre-${TS}.sha"
echo "PROMPT_FILE=$PROMPT_FILE"
echo "JOB_JSON_FILE=$JOB_JSON_FILE"
echo "PRE_LIST=$PRE_LIST"
echo "PRE_SHA=$PRE_SHA"

# Snapshot current repo state — file names only, no contents
git status --porcelain > "$PRE_LIST" 2>/dev/null || true
git rev-parse HEAD > "$PRE_SHA"

# Write the cleaned task description. Replace <literal ...> with the
# value built in Phase 1. Do NOT include meta-instructions or flags.
cat > "$PROMPT_FILE" <<'EOF'
<literal cleaned task description from Phase 1>
EOF

# Launch via stdin pipe. Each flag line below is optional — include only
# what Phase 1 parsed. Omit the entire line for flags not provided.
# --write: include for implementation (default ON); omit for read-only.
# Model/effort are NOT passed as companion flags — they were written to
#   config.toml by apply-codex-config.py in Phase 1 and the companion
#   picks them up from there.
# --resume-last/--resume/--fresh: mutually exclusive; omit if none.
# NEVER pass a positional arg — readTaskPrompt short-circuits on
# positionalPrompt (:591), silently dropping stdin.
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

Remember the literal `PROMPT_FILE`, `JOB_JSON_FILE`, `PRE_LIST`,
`PRE_SHA`, and `JOB_ID` values. Re-inject these as literal strings in
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
node "$CODEX_COMPANION" result "<literal JOB_ID>" --json
```

Full error table: `${CLAUDE_PLUGIN_ROOT}/references/companion-usage.md §6`.

Notable cases:

- `Task <id> is still running. Use /codex:status before continuing it.` → a previous task is still in flight. Show the user the active jobId and stop. Never silently cancel.
- `Stored job <id> is missing its task request payload.` → detached worker couldn't load the request. `recovery-impossible`. Save failure report.

---

## Phase 4: Double-check

Now — and **only now** — you may read the code.

Read `${CLAUDE_PLUGIN_ROOT}/references/evaluation.md`.

### If Codex made code changes (`--write`)

```bash
git diff
git diff --stat
git status --porcelain
```

For each changed file:

1. **Read the diff**, then read only the relevant sections of the file.
2. **Evaluate:**
   - Does the change actually solve the task?
   - Correctness — any bugs introduced?
   - Scope — any files modified that shouldn't have been? Cross-check against the pre-snapshot file list.
   - Side effects — does it break something nearby?

### If Codex returned investigation results (read-only)

Apply the Peer AI Evaluation in `evaluation.md`:

- **Agree** — claim matches the code
- **Disagree** — claim contradicts the code, with evidence
- **Nuance** — real insight, but missing context
- **False Positive (hallucination)** — Codex cited a file / function /
  line that does **not exist** in the current source tree
- **Uncited** — no concrete citation. Surface as "verification
  deferred". Never invent citations.

---

## Phase 5: Report + save

```bash
mkdir -p "${CLAUDE_PLUGIN_DATA}/reviews"
```

**Success:** save to
`${CLAUDE_PLUGIN_DATA}/reviews/rescue-<YYYYMMDD-HHMMSS>.md` with:

- The task description
- Codex's output verbatim
- The diff (if any)
- Claude's per-finding / per-file evaluation
- Verdict: appropriate / has issues / needs rework
- **Do NOT auto-accept changes.** Present, wait for user.

**Failure:** save to
`${CLAUDE_PLUGIN_DATA}/reviews/rescue-<YYYYMMDD-HHMMSS>-failed.md` with
the §6 error category and captured stderr.

Clean up temp files using literal paths:

```bash
rm -f "<literal PROMPT_FILE path>" "<literal JOB_JSON_FILE path>" "<literal JOB_JSON_FILE.stderr path>" \
      "<literal pre.list path>" "<literal pre.sha path>"
```

---

## Gotchas

- **`--model` / `--effort` go through `apply-codex-config.py`, not the companion.** config.toml becomes the single source of truth; companion flags were silent no-ops on review/adversarial and needlessly inconsistent between skills. `apply-codex-config.py` warns on out-of-set effort but still writes — surface the warning to the user rather than swallowing it.
- **Never combine `--resume` / `--resume-last` with `--fresh`.** The companion rejects the combination (`:721-723`).
- **Never pass a positional argument with Pattern B's stdin pipe.** `readTaskPrompt` short-circuits on `positionalPrompt || readStdinIfPiped()` (`:591`); a positional silently drops the entire task description.
- **`--wait` on task is silent prompt corruption.** It becomes part of the task prompt body. ANALYZE must reject it.
- **Do NOT explore the repo in Phase 1.** The point of delegation is that Codex builds the context. Exploring biases the double-check.

For the full shared gotchas list, read
`${CLAUDE_PLUGIN_ROOT}/references/companion-usage.md §10`.
