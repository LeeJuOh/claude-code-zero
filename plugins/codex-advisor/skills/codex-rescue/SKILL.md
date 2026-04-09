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
- `--write` (bool; default ON for implementation, OFF for read-only investigation)
- `--model <name>` (passes `spark` alias through; other values forwarded verbatim)
- `--effort <level>` — must be one of `{none, minimal, low, medium, high, xhigh}`. **Validate before invoking.** An out-of-range value triggers `Unsupported reasoning effort "<value>"` from the companion (`:119-122`).
- `--resume-last` / `--resume` / `--fresh` — mutually exclusive. Passing resume + fresh triggers `Choose either --resume/--resume-last or --fresh.` (`:721-723`). If ANALYZE produces a conflict, AskUserQuestion; never forward both.

**Everything else in `$ARGUMENTS` is the task description**, which
becomes the prompt body. Translate it cleanly:

- **Meta-instructions addressed to YOU** ("한국어로 답해", "먼저 읽지 마") → obey for your own behavior, never include in the task prompt (they'd confuse Codex).
- **Junk, emoji** → drop.
- **Vague task** (e.g., just "fix it", "do something") → `AskUserQuestion` for clarification. Never explore the repo to guess intent.
- **Unknown flag** (e.g., `--foo`, `--background`, `--wait`) → `AskUserQuestion`. `--background` and `--wait` are not needed — Pattern B always uses `--background` internally. `--wait` on task is **silent prompt corruption**; we never accept it.
- **Ambiguous effort / model value** → `AskUserQuestion`.

**Before Phase 2, print exactly one line:**

```
Parsed: task="implement login rate limiter", write=true, effort=high, model=(default)
```

**Snapshot before** — file list only, no contents:

```bash
git status --porcelain > "${CLAUDE_PLUGIN_DATA}/tmp/rescue-${TS}-pre.list" 2>/dev/null || true
git rev-parse HEAD > "${CLAUDE_PLUGIN_DATA}/tmp/rescue-${TS}-pre.sha"
```

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
echo "PROMPT_FILE=$PROMPT_FILE"
echo "JOB_JSON_FILE=$JOB_JSON_FILE"

# Write the cleaned task description to the prompt file.
# Do NOT include meta-instructions. Do NOT include flag names.
cat > "$PROMPT_FILE" <<'EOF'
<task description goes here — the cleaned string from Phase 1>
EOF

# Launch via stdin pipe. NEVER pass a positional arg — readTaskPrompt
# short-circuits on positionalPrompt (:591), silently dropping stdin.
cat "$PROMPT_FILE" | node "$CODEX_COMPANION" task --background --json \
  ${WRITE_FLAG:+--write} \
  ${MODEL:+--model "$MODEL"} \
  ${EFFORT:+--effort "$EFFORT"} \
  ${RESUME_FLAG:+"$RESUME_FLAG"} \
  > "$JOB_JSON_FILE" 2> "${JOB_JSON_FILE}.stderr" \
  || { echo "task launch failed:" >&2; cat "${JOB_JSON_FILE}.stderr" >&2; exit 1; }

# Capture jobId — use node (already a dependency)
JOB_ID=$(node -e 'const fs=require("fs");try{const j=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));if(!j.jobId)throw new Error("no jobId");process.stdout.write(j.jobId);}catch(e){process.stderr.write("JOB_ID parse failed: "+e.message+"\n");process.exit(1);}' "$JOB_JSON_FILE") \
  || { echo "raw companion stdout:" >&2; cat "$JOB_JSON_FILE" >&2; exit 1; }
echo "JOB_ID=$JOB_ID"
```

`$WRITE_FLAG` is set to a non-empty string when `--write` should be ON
(the default for implementation). Omit it for read-only investigation.
`$RESUME_FLAG` is one of `--resume-last` / `--resume` / `--fresh` —
never two at once.

Remember the literal `PROMPT_FILE`, `JOB_JSON_FILE`, and `JOB_ID`
values. They are needed in every later phase.

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

- **Validate `--effort` against `{none, minimal, low, medium, high, xhigh}` BEFORE invoking.** An invalid value triggers a companion error and wastes a round-trip.
- **Never combine `--resume` / `--resume-last` with `--fresh`.** The companion rejects the combination (`:721-723`).
- **Never pass a positional argument with Pattern B's stdin pipe.** `readTaskPrompt` short-circuits on `positionalPrompt || readStdinIfPiped()` (`:591`); a positional silently drops the entire task description.
- **`--wait` on task is silent prompt corruption.** It becomes part of the task prompt body. ANALYZE must reject it.
- **Do NOT explore the repo in Phase 1.** The point of delegation is that Codex builds the context. Exploring biases the double-check.

For the full shared gotchas list, read
`${CLAUDE_PLUGIN_ROOT}/references/companion-usage.md §10`.
