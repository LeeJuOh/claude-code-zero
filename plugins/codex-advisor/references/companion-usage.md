# Companion Invocation Protocol

Shared reference for all codex-advisor skills. Read on demand when launching
the Official Codex plugin's companion script, when the inline ANALYZE rules
in a SKILL.md don't cover an edge case, or when an error needs categorization.

All line numbers below cite
`references/codex-plugin-cc/plugins/codex/scripts/codex-companion.mjs`
(verified against the v4.1 contract).

---

## 1. Resolve the companion

```bash
CODEX_COMPANION=$("${CLAUDE_PLUGIN_ROOT}/scripts/resolve-companion.sh")
```

`resolve-companion.sh` finds the official Codex plugin's
`codex-companion.mjs` path inside the user's plugin install and prints it.
It exits 1 with `Official Codex plugin not found. ...` on stderr if the
plugin is absent — this is the `setup` error category (see §6). Redirect
the user to `/codex-setup` and stop.

---

## 2. Verified flag whitelists per subcommand

Every flag below was verified against `codex-companion.mjs`. "Documented"
means it appears in `printUsage` (`:73-86`); "parser-only" means it is
accepted by `parseArgs` but not printed in usage.

### `review` (`handleReviewCommand` at `:654-695`)

| Flag | Type | Status | Honored? |
|------|------|--------|----------|
| `--base <ref>` | value | documented | yes |
| `--scope <auto\|working-tree\|branch>` | value | documented | yes |
| `--model <m>` | value | parser-only | yes |
| `--cwd <path>` | value | parser-only | yes |
| `--json` | bool | parser-only | yes |
| `--background` | bool | documented in `:78` | **NO — silent no-op** (see §3) |
| `--wait` | bool | documented in `:78` | **NO — silent no-op** (see §3) |
| (positional focus text) | — | — | **rejected** by `validateNativeReviewRequest` (`:270-283`) |

### `adversarial-review` (`handleReviewCommand` via `:975-979`)

Identical valueOptions / booleanOptions as `review` (same handler). The
only difference: adversarial does NOT pass `validateNativeReviewRequest`,
so positional focus text IS accepted (joined with spaces at `:665`).

**Neither** review nor adversarial has `--commit` or `--uncommitted`. To
review a specific commit, use `--base <sha>~1 --scope branch`.

### `task` (`handleTask` at `:704-765`)

| Flag | Type | Status | Notes |
|------|------|--------|-------|
| `--write` | bool | documented | enables code changes |
| `--background` | bool | documented | **honored** — `:730-746` calls `enqueueBackgroundTask` |
| `--resume-last` | bool | documented | resume most recent completed task |
| `--resume` | bool | documented | alias for `resume-last` per `:719` |
| `--fresh` | bool | documented | opposite of resume; mutually exclusive (`:721-723`) |
| `--json` | bool | parser-only | structured output |
| `--model <m>` | value | documented | accepts `spark` alias (`:70`) |
| `--effort <level>` | value | documented | one of `{none, minimal, low, medium, high, xhigh}` (`:69`, `:119-122`) |
| `--cwd <path>` | value | parser-only | |
| `--prompt-file <path>` | value | **parser-only** (not in `:80` usage) | reads file at `:586-587` |
| `--wait` | — | **NOT REGISTERED** | silently pushed to positionals → **prompt corruption**, see §3 |

### `status` (`handleStatus` at `:812-837`)

| Flag | Type | Status | Notes |
|------|------|--------|-------|
| `--wait` | bool | parser-only | **honored** — calls `waitForSingleJobSnapshot` (`:820-826`) |
| `--timeout-ms <ms>` | value | parser-only | default `240000` (`:67`); cap per call |
| `--poll-interval-ms <ms>` | value | parser-only | default `2000` (`:68`) |
| `--all` | bool | documented | list all jobs |
| `--json` | bool | documented | |
| (positional jobId) | — | — | required when using `--wait` (`:831-833`) |

### `result` (`handleResult` at `:839-855`)

| Flag | Type | Notes |
|------|------|-------|
| `--json` | bool | |
| `--cwd <path>` | value | |
| (positional jobId) | — | optional — resolves latest if omitted |

### `cancel` (`handleCancel`)

| Flag | Type |
|------|------|
| `--json` | bool |
| (positional jobId) | — |

### 2a. `normalizeArgv` quirk

`normalizeArgv` (`:127-136`) re-tokenizes input via `splitRawArgumentString`
**only when `argv.length === 1`**. An old broken pattern like

```bash
node "$CODEX_COMPANION" task "$ARGUMENTS"
```

(a single arg containing spaces) goes through this hidden re-split path
that **looks** like it works but is fragile — quoting rules diverge from
the shell and edge cases break silently.

v4.1 always invokes the companion with **multi-arg form**
(`task --background --json`), so this branch never fires. Never pass
`$ARGUMENTS` as a single quoted blob.

---

## 3. The truth about `--wait` and `--background`

This is the single most important thing to understand about the companion.

### `status --wait <jobId>` — REAL

- `booleanOptions` at `:815` includes `wait`.
- Handler honors it at `:820-826` via `waitForSingleJobSnapshot`.
- Uses `DEFAULT_STATUS_WAIT_TIMEOUT_MS = 240000` (`:67`), safely under
  Bash's 300s tool timeout.
- This is the **only** universal wait mechanism in the companion.

### `review --wait`, `adversarial-review --wait` — SILENT NO-OP

- `booleanOptions` at `:657` includes both `background` AND `wait`, so the
  parser accepts them.
- BUT `handleReviewCommand` (`:654-695`) **never reads** `options.wait` or
  `options.background`. Line 681 unconditionally calls
  `runForegroundCommand`.
- Both flags are silent no-ops. Review / adversarial-review always run in
  the foreground.
- `printUsage` at `:78` still advertises `review [--wait|--background]`
  — this is an upstream bug (filing is a v4.2 candidate).

### `task --wait` — SILENT PROMPT CORRUPTION

- `task`'s `booleanOptions` at `:707` is
  `["json", "write", "resume-last", "resume", "fresh", "background"]`.
  **No `wait`.**
- `parseArgs` (`lib/args.mjs:47-49`) does NOT raise an unknown-flag error.
  It silently pushes `--wait` into `positionals`.
- `readTaskPrompt` (`:585-592`) does `positionals.join(" ")` and uses that
  as the task prompt body.
- Result: Codex receives the literal string `"--wait"` as part of its task
  prompt. No stderr. No exit code. Silent prompt corruption.

The same silent-corruption path applies to **any** unknown flag passed to
**any** companion subcommand, because `parseArgs` has no "unknown flag"
mode. This is not a task-specific footgun; it's the parser's contract.

**There is no companion-side safety net.** Phase 1 ANALYZE whitelisting in
each skill is the only line of defense.

---

## 4. Two invocation patterns

codex-advisor skills use exactly two patterns to run the companion.

### Pattern A — review / adversarial-review

The companion's `--background` is a no-op here, so we use Claude's own Bash
`run_in_background=true` to keep the wrapper alive past Bash's 300s
per-call timeout.

```bash
set -o pipefail
CODEX_COMPANION=$("${CLAUDE_PLUGIN_ROOT}/scripts/resolve-companion.sh")

mkdir -p "${CLAUDE_PLUGIN_DATA}/tmp"
TS=$(date +%s%N)
OUT_FILE="${CLAUDE_PLUGIN_DATA}/tmp/review-${TS}.json"
ERR_FILE="${CLAUDE_PLUGIN_DATA}/tmp/review-${TS}.log"
echo "OUT_FILE=$OUT_FILE"
echo "ERR_FILE=$ERR_FILE"

# Launch via Bash run_in_background=true (Claude-side).
# Replace <literal ...> with values from Phase 1.
node "$CODEX_COMPANION" review --json \
  --base "<literal clean base from Phase 1>" \
  > "$OUT_FILE" 2> "$ERR_FILE"
```

**Phase 3 polling spec** (do not improvise):

| Item | Value |
|------|-------|
| Tool | `BashOutput` — never `ps`, `kill`, or state JSON reads |
| Cadence | 30 seconds between polls (60s acceptable for very long reviews) |
| Termination | `BashOutput` response field `status === "completed"` (NOT stdout content matching — payload format may change) |
| Total cap | 30 minutes (review p99 ≈ 20 min; 30 min gives headroom) |
| Cap exceeded | `wait-timeout` (§6) → `KillShell` the bash_id → if `$OUT_FILE` is non-empty and parses as JSON treat as partial result, otherwise `recovery-impossible` |
| `$OUT_FILE` empty after exit | Companion crashed / SIGKILLed. Read `$ERR_FILE`, categorize, save `<type>-<ts>-failed.md` |
| `$OUT_FILE` non-JSON | `unexpected-format` (§6). Show raw stderr verbatim, abort |

Claude must remember the bash_id **and** the absolute `$OUT_FILE` /
`$ERR_FILE` paths printed in Phase 1 — they are needed in Phase 3/4. Bash
spawns a fresh shell per call, so local variables do not persist; always
reuse the literal paths you captured from stdout.

### Pattern B — task family (rescue / verify / research)

The companion's `--background` IS honored for `task`. It returns a job
payload immediately, then polls via `status --wait`.

```bash
set -o pipefail
CODEX_COMPANION=$("${CLAUDE_PLUGIN_ROOT}/scripts/resolve-companion.sh")

mkdir -p "${CLAUDE_PLUGIN_DATA}/tmp"
TS=$(date +%s%N)
PROMPT_FILE="${CLAUDE_PLUGIN_DATA}/tmp/<skill>-prompt-${TS}.txt"
JOB_JSON_FILE="${CLAUDE_PLUGIN_DATA}/tmp/<skill>-job-${TS}.json"
echo "PROMPT_FILE=$PROMPT_FILE"
echo "JOB_JSON_FILE=$JOB_JSON_FILE"

# (Assemble $PROMPT_FILE — see §8 for the blind-payload pattern)

# Invoke via stdin pipe. NEVER pass a positional arg — readTaskPrompt
# short-circuits on positionalPrompt (:591), silently dropping stdin.
cat "$PROMPT_FILE" | node "$CODEX_COMPANION" task --background --json \
  > "$JOB_JSON_FILE" 2> "${JOB_JSON_FILE}.stderr" \
  || { echo "task launch failed:" >&2; cat "${JOB_JSON_FILE}.stderr" >&2; exit 1; }

# Capture jobId — use node (already a dependency) to avoid host-python assumptions
JOB_ID=$(node -e 'const fs=require("fs");try{const j=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));if(!j.jobId)throw new Error("no jobId");process.stdout.write(j.jobId);}catch(e){process.stderr.write("JOB_ID parse failed: "+e.message+"\n");process.exit(1);}' "$JOB_JSON_FILE") \
  || { echo "raw companion stdout:" >&2; cat "$JOB_JSON_FILE" >&2; exit 1; }
echo "JOB_ID=$JOB_ID"

# Poll. Each call blocks ≤4 min (well under Bash 300s). Re-call until
# status === "completed" or "failed". Cap at 6 iterations (24 min) total.
node "$CODEX_COMPANION" status --wait "$JOB_ID" \
  --timeout-ms 240000 --json

# Fetch final result
node "$CODEX_COMPANION" result "$JOB_ID" --json
```

`status --wait` returns a snapshot with `waitTimedOut: true` when the
deadline hits but the job is still running. Re-call in that case. On the
cap, surface as `wait-timeout` (§6).

---

## 5. Job ID capture

- Always pass `--json` to commands whose output you intend to parse. The
  rendered text format is not stable across releases.
- Parse jobId with `node -e '...'` (already a runtime dependency). Do NOT
  grep / regex the rendered output.
- **Pattern A:** jobId is embedded in the final `$OUT_FILE` payload
  (alongside `review`, `target`, `threadId`, `codex`). It is the
  `threadId` or inside the `codex` object depending on review type — read
  the actual payload, don't guess the key.
- **Pattern B:** jobId is in the immediate response from
  `task --background --json` as `{"jobId": "...", "status": "queued", ...}`.
- **Always set `set -o pipefail`** before any `cat file | node ...` or
  similar pipeline. Without it, a failing left side (e.g., missing
  `PROMPT_FILE`) sends 0 bytes into the companion, which then throws
  `Provide a prompt, a prompt file, piped stdin, or use --resume-last.`
  (`:596`) — masking the real root cause.

---

## 6. Error categorization

All verbatim strings below were verified against `codex-companion.mjs`.
Never retry silently. Never swallow errors. Never blame the user.

| Pattern in stderr (verbatim where quoted) | Category | Source | Action |
|-------------------|----------|--------|--------|
| `Official Codex plugin not found` | setup | `resolve-companion.sh` | Redirect to `/codex-setup` |
| `not authenticated` / `OPENAI_API_KEY` | auth | `:253-254` | Suggest `codex login` |
| `not a git repository` | environment | `lib/git.mjs` `ensureGitRepository` | Tell user, stop |
| `unknown revision` / `bad revision` | bad-input | `git rev-parse` | Show `git branch --list`, AskUserQuestion |
| `does not support custom focus text` | wrong-skill | `:272-273` | Should NOT fire post-v4.1: Phase 1 strips focus text and offers adversarial redirect. If it fires, Phase 1 was skipped → SKILL.md regression. |
| `Provide a prompt, a prompt file, piped stdin, or use --resume-last.` | prompt-empty | `:596` | Pattern B failed before consuming stdin. Common cause: `cat` failed and `set -o pipefail` was missing, OR a positional arg overrode stdin (§3). |
| `Task <id> is still running. Use /codex:status before continuing it.` | concurrency-conflict | `:316` | Previous Codex task in flight. Show user the active jobId, stop. Do NOT silently cancel. |
| `Unsupported reasoning effort "<value>"` | bad-input | `:119-122` | codex-rescue: effort must be `{none, minimal, low, medium, high, xhigh}`. Re-prompt via AskUserQuestion. |
| `Choose either --resume/--resume-last or --fresh.` | bad-input | `:721-723` | codex-rescue: ANALYZE produced conflicting flags. Re-prompt. |
| `Missing value for --<key>` | bad-input | `lib/args.mjs:39,63` | Phase 1 should have caught this → ANALYZE regression. |
| `Stored job <id> is missing its task request payload.` | recovery-impossible | `:785` | Detached task-worker couldn't load the stored request. Surfaced via `result <jobId>` or the job log file, NOT from the original `task --background --json` stdout. Abort, save failure report. |
| JSON parse error on companion stdout | unexpected-format | n/a | Companion output format changed. Show raw stdout/stderr, abort, ask user to report. |
| Pattern A 30-min cap exceeded | wait-timeout | n/a (Claude-side) | `KillShell` the bash_id; if `$OUT_FILE` parses as JSON treat as partial, else `recovery-impossible`. |
| (no stderr — silently corrupted prompt) | silent-flag-corruption | `lib/args.mjs:47-49` + `:585-592` | **NOT detectable post-hoc.** Only Phase 1 ANALYZE whitelisting prevents it. If Codex echoes an unknown flag back as task content, treat as Phase 1 regression and AskUserQuestion. |
| (other) | unknown | n/a | Show raw stderr verbatim. Do NOT retry. |

**Never:**
- Silently retry
- Swallow errors
- Enter manual polling loops outside `BashOutput` (Pattern A) or
  `status --wait` (Pattern B)
- Use `ps`, `kill`, or raw state JSON reads for tracking
- Pass any token through to the companion that did not survive Phase 1's
  whitelist (see "silent-flag-corruption" — no companion-side safety net)
- Blame the user

---

## 7. ANALYZE classification rules (full)

The 5-line core lives inline in each SKILL.md. Consult this section when
the inline rules don't cover an edge case.

### Core algorithm

For each token in `$ARGUMENTS`:

1. **Whitelisted flag?** (with or without trailing punctuation, with or
   without `=`) → normalize and include.
   - Strip trailing `,` `.` `)` from values (`--base develop,` → `base=develop`).
   - `--key=value` and `--key value` both accepted.
2. **Duplicate flag?** e.g., `--base develop --base main` → AskUserQuestion
   which one is intended. Never silently pick "last wins".
3. **Natural-language meta-instruction addressed to YOU?** e.g.,
   "분석 먼저 하지마", "한국어로 답해", "빨리", "thoroughly" → obey for your
   own behavior, never forward to companion.
4. **Junk?** emoji, stray punctuation, `, ` → drop.
5. **Focus text on `codex-review`?** → AskUserQuestion offering the
   adversarial redirect (do NOT pass it; the companion will reject it at
   `:272-273`).
6. **Ambiguous?** → AskUserQuestion (interactive) or exit 1 with a clear
   stderr message (non-interactive). See §9.
7. **Unknown token (not on whitelist, not meta-instruction, not junk)?**
   → **FATAL.** Never pass through. There is no companion-side safety net
   (§3 silent-flag-corruption).

### Examples (use LM judgment for unseen cases)

```
INPUT                                                   → PARSED
--base develop                                          → base=develop
develop 브랜치 대비로                                    → base=develop
--base=develop, 분석 먼저 하지마                          → base=develop (meta-instruction obeyed)
HEAD~3부터                                              → base=HEAD~3
--base develop --base main                              → AskUserQuestion (which base?)
😤 빨리                                                  → no flags (auto-detect scope)
--uncommitted                                           → AskUserQuestion (not on whitelist — did you mean --scope working-tree?)
--commit abc123                                         → AskUserQuestion (not on whitelist — did you mean --base abc123~1 --scope branch?)
--foo bar implement login (on codex-rescue)             → FATAL (--foo not on rescue whitelist; treat as ANALYZE regression if it reaches companion)
```

### Show your work

Before Phase 2, print exactly one line:

```
Parsed: base=develop, scope=auto   (meta-instructions: "분석 먼저 하지마")
```

This makes the translation step auditable in the session log.

---

## 8. Blind-payload pattern (verify / research only)

verify and research must NOT load document content into Claude's context —
double-check independence depends on it. Use file redirection and stdin
piping so the content never enters Bash's stdout.

### Key invariants

- **`cat $DOC >> $PROMPT_FILE`** — redirects to file, Bash returns empty
  stdout, content never enters Claude's context.
- **`cat "$PROMPT_FILE" | node companion task --background --json`** —
  sends payload over the stdin pipe, not as a positional.
- **Never add a positional prompt after `task`** in Pattern B. `:591` does
  `positionalPrompt || readStdinIfPiped()`; any positional short-circuits
  stdin and the entire blind payload is silently dropped.
- **`--prompt-file` is parser-only** (`:706` vs `:80`). Stdin is the
  first-class path (`readTaskPrompt` at `:585-592` handles it explicitly
  via `lib/fs.mjs:35-40`). Use stdin.
- **`set -o pipefail`** is mandatory. Without it, a cat-side failure
  sends 0 bytes and the companion's `prompt-empty` error masks the real
  root cause.

### Temp file lifecycle

`$$` (shell PID) does NOT survive across Claude's separate Bash
invocations — Bash spawns a fresh shell each call. Use timestamps and
have Claude **remember the absolute path** printed in Phase 1 stdout,
then re-inject it literally in every later Bash call.

```bash
set -o pipefail
CODEX_COMPANION=$("${CLAUDE_PLUGIN_ROOT}/scripts/resolve-companion.sh")

mkdir -p "${CLAUDE_PLUGIN_DATA}/tmp"
TS=$(date +%s%N)
PROMPT_FILE="${CLAUDE_PLUGIN_DATA}/tmp/<skill>-prompt-${TS}.txt"
JOB_JSON_FILE="${CLAUDE_PLUGIN_DATA}/tmp/<skill>-job-${TS}.json"
echo "PROMPT_FILE=$PROMPT_FILE"
echo "JOB_JSON_FILE=$JOB_JSON_FILE"

# Header via heredoc — no document content yet
cat > "$PROMPT_FILE" <<'EOF'
<task>
...skill-specific task block...
</task>

<compact_output_contract>...</compact_output_contract>
<grounding_rules>...</grounding_rules>

<document>
EOF

# Input validation only — never load content.
# Replace <literal doc path> with the path parsed from $ARGUMENTS.
test -f "<literal doc path>" || { echo "File not found: <literal doc path>" >&2; exit 1; }
test -s "<literal doc path>" || { echo "File is empty: <literal doc path>" >&2; exit 1; }
echo "DOC_LINES=$(wc -l < "<literal doc path>")"   # size info, not content

# Append document via redirect — Bash stdout stays empty.
# Use the literal doc path, NOT a shell variable from a prior Bash call.
cat "<literal doc path>" >> "$PROMPT_FILE"

# Close XML
printf '\n</document>\n' >> "$PROMPT_FILE"

# Phase 2 — launch via stdin pipe (no positional!)
cat "$PROMPT_FILE" | node "$CODEX_COMPANION" task --background --json \
  > "$JOB_JSON_FILE" 2> "${JOB_JSON_FILE}.stderr" \
  || { echo "task launch failed:" >&2; cat "${JOB_JSON_FILE}.stderr" >&2; exit 1; }

# Capture jobId (use node, not python, to avoid host assumptions)
JOB_ID=$(node -e 'const fs=require("fs");try{const j=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));if(!j.jobId)throw new Error("no jobId");process.stdout.write(j.jobId);}catch(e){process.stderr.write("JOB_ID parse failed: "+e.message+"\n");process.exit(1);}' "$JOB_JSON_FILE") \
  || { echo "raw companion stdout:" >&2; cat "$JOB_JSON_FILE" >&2; exit 1; }
echo "JOB_ID=$JOB_ID"
```

### Why this preserves independence

- `cat "$USER_DOC" >> "$PROMPT_FILE"` → stdout goes to the file, not the
  terminal. Bash tool returns empty.
- `cat "$PROMPT_FILE" | node ...` → stdout goes to the pipe. Bash tool
  still returns empty on success.
- Claude knows the path, the line count, and that the assembly succeeded
  — but never sees the document text.

### Topic-only research

For `codex-research` when the user gives a topic (no file), skip the
document append entirely. Write the topic inside the heredoc header
template and pipe the resulting `$PROMPT_FILE` straight into `task
--background --json`.

### Cleanup

Clean up temp files at the end of Phase 5 by re-injecting the literal
absolute paths (captured from Phase 1 stdout):

```bash
rm -f "<literal $PROMPT_FILE path>" "<literal $JOB_JSON_FILE path>" "<literal ${JOB_JSON_FILE}.stderr path>"
```

Do NOT rely on `$PROMPT_FILE` / `$JOB_JSON_FILE` shell variables in the
cleanup call — those are only defined in the shell that set them, which
is a different shell from this one.

---

## 9. AskUserQuestion fallback for non-interactive runs

There is no env var that reliably tells Claude whether `AskUserQuestion`
is available — `CLAUDECODE` is always set inside Claude Code. The
pragmatic pattern is "try and fall back":

1. Always attempt `AskUserQuestion` first when ANALYZE detects ambiguity.
2. If the tool errors or times out (headless `claude -p` runs), fall back
   to a clean stderr + exit 1:

   ```bash
   printf 'AMBIGUOUS: %s\nProvide unambiguous input or run interactively.\n' \
     "$REASON" >&2
   exit 1
   ```

3. Never silently guess. Never pass an ambiguous token through to the
   companion (§3 silent-corruption).

---

## 10. Shared gotchas

- **Bash 300s timeout ≠ job failure when Pattern B is used.** `status
  --wait` blocks ≤240s per call, well under the limit.
- **Pattern A requires `run_in_background=true`.** The companion's own
  `--background` is a no-op on `review` / `adversarial-review`.
- **Natural language in `$ARGUMENTS` is for YOU, not the companion.**
  Meta-instructions like "분석 먼저 하지마" modify YOUR behavior; they
  never become companion flags or prompt content.
- **Unknown flags don't error — they silently become prompt content.**
  ANALYZE whitelist is the only line of defense.
- **Pattern B stdin pipe never combines with a positional arg.**
  `readTaskPrompt` does `positionalPrompt || readStdinIfPiped()`
  (`:585-592`); a positional silently overrides stdin and drops the
  entire blind payload.
- **Always `set -o pipefail` before `cat ... | node ...`.** Without it,
  a cat-side failure masks as a companion-side `prompt-empty` error.
- **`$$` does not survive across Bash calls.** Use timestamps; remember
  absolute paths from Phase 1 stdout and re-inject them.
- **Never poll manually outside `BashOutput` (Pattern A) or `status
  --wait` (Pattern B).** `ps` / `kill` / raw state JSON reads are
  forbidden — they leave orphan jobs in unrecoverable states.
- **Never swallow errors. Never retry silently.** Categorize per §6 and
  surface verbatim.
- **Read source only AFTER Phase 3 completes.** Phase 1-3 must not call
  `Read` / `Grep` / `Glob` / `git diff` / `git log -p` / `git show` /
  `git blame` on source or diffs. Input validation (`test -f`, `wc -l`,
  `git rev-parse --verify`, `git branch --list`) is allowed.
- **In Phase 4, read only what Codex cited.** Never read whole files "for
  context". If a cited file/function/line does not exist in the current
  source tree, classify as "False Positive (hallucination)". If a finding
  has no concrete citation, classify as "Uncited — verification deferred".
