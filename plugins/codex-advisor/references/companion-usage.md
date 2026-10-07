# Companion Invocation Protocol

Shared reference for all codex-advisor skills. Read on demand when launching
the Official Codex plugin's companion script, when the inline ANALYZE rules
in a SKILL.md don't cover an edge case, or when an error needs categorization.

All line numbers below cite
`references/codex-plugin-cc/plugins/codex/scripts/codex-companion.mjs`
(verified against `codex@openai-codex` 1.0.5). Earlier versions of the
Official Codex plugin had a different review handler that silently
discarded `--model`; v1.0.4+ propagates it through `executeReviewRun` →
`runAppServerReview` → `startThread({ model })` (`lib/codex.mjs:63-71`
builds the params, `lib/codex.mjs:1010-1015` makes the call).
codex-advisor requires the 1.0.0+ companion.

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
means it appears in `printUsage` (`:75-89`); "parser-only" means it is
accepted by `parseArgs` but not printed in usage.

### `review` (`handleReviewCommand` at `:712-753`)

| Flag | Type | Status | Honored? |
|------|------|--------|----------|
| `--base <ref>` | value | documented | yes |
| `--scope <auto\|working-tree\|branch>` | value | documented | yes |
| `--model <m>` | value | parser-only | **yes** — `executeReviewRun :358-371` → `runAppServerReview` (`lib/codex.mjs:1002`) → `startThread({ model })` (`lib/codex.mjs:1010-1015`). codex-advisor still routes `--model` through `apply-codex-config.py` for **consistency across skills** and so the value persists for the next session — not because the flag is ignored. It also passes `--model` when a project `.codex/config.toml` sets a model (the script's `Run flags:` line), since that file outranks `config.toml`. |
| `--cwd <path>` | value | parser-only | yes |
| `--json` | bool | parser-only | yes |
| `--effort <level>` | — | **NOT REGISTERED** | `valueOptions` at `:714` is `["base", "scope", "model", "cwd"]`. `--effort` becomes silent prompt corruption (§3). codex-advisor sets it via `~/.codex/config.toml` (`model_reasoning_effort`); a project `.codex/config.toml` that sets it wins for reviews, and the script prints a `Note:` saying so. |
| `--background` | bool | documented in `:80` | **NO — silent no-op** (see §3) |
| `--wait` | bool | documented in `:80` | **NO — silent no-op** (see §3) |
| (positional focus text) | — | — | **rejected** by `validateNativeReviewRequest` (`:271-284`) |

### `adversarial-review` (`handleReviewCommand` via `:1038-1042`)

Identical valueOptions / booleanOptions as `review` (same handler). The
only difference: adversarial does NOT pass `validateNativeReviewRequest`,
so positional focus text IS accepted (joined with spaces at `:723`).

**Neither** review nor adversarial has `--commit` or `--uncommitted`. To
review a specific commit, use `--base <sha>~1 --scope branch`.

### `task` (`handleTask` at `:762-823`)

| Flag | Type | Status | Notes |
|------|------|--------|-------|
| `--write` | bool | documented | enables code changes |
| `--background` | bool | documented | **honored** — `:788-805` calls `enqueueBackgroundTask` |
| `--resume-last` | bool | documented | resume most recent completed task |
| `--resume` | bool | documented | alias for `resume-last` per `:777` |
| `--fresh` | bool | documented | opposite of resume; mutually exclusive (`:778-780`) |
| `--json` | bool | parser-only | structured output |
| `--model <m>` | value | documented | accepts `spark` alias (`:72`) |
| `--effort <level>` | value | documented | one of `{none, minimal, low, medium, high, xhigh}` (`:71`, `:114-125`) The companion rejects other values. codex-advisor passes `--model`/`--effort` on `task` only when a project `.codex/config.toml` would override `config.toml` (the script's `Run flags:` line). |
| `--cwd <path>` | value | parser-only | |
| `--prompt-file <path>` | value | **parser-only** (not in `:82` usage) | reads file at `:644-646` |
| `--wait` | — | **NOT REGISTERED** | silently pushed to positionals → **prompt corruption**, see §3 |

### `status` (`handleStatus` at `:883-908`)

| Flag | Type | Status | Notes |
|------|------|--------|-------|
| `--wait` | bool | parser-only | **honored** — calls `waitForSingleJobSnapshot` (`:893-897`) |
| `--timeout-ms <ms>` | value | parser-only | default `240000` (`:69`); cap per call |
| `--poll-interval-ms <ms>` | value | parser-only | default `2000` (`:70`) |
| `--all` | bool | documented | list all jobs |
| `--json` | bool | documented | |
| (positional jobId) | — | — | required when using `--wait` (`:902-904`) |

### `result` (`handleResult` at `:910-926`)

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

### `transfer` (`handleTransfer` at `:825-836`, v1.0.5+)

| Flag | Type | Notes |
|------|------|-------|
| `--source <path>` | value | Claude session `.jsonl` to import. Falls back to `CODEX_COMPANION_TRANSCRIPT_PATH` env (`resolveClaudeSessionPath`, `lib/claude-session-transfer.mjs:20-23`) when omitted. |
| `--json` | bool | |
| `--cwd <path>` | value | Accepted by `handleTransfer`'s `valueOptions` (`:827`) but **not shown in `printUsage`'s transfer line** (`:83`) — don't copy the usage line as the full flag set. |

No `--model`/`--effort`/`--wait`/`--background` — transfer has no prompt and completes synchronously (≤2 min), so none of those concepts apply. Result payload includes `threadId` and `resumeCommand` (`codex resume <threadId>`) rendered verbatim by `renderTransferResult` (`:616-623`).

### 2a. `normalizeArgv` quirk

`normalizeArgv` (`:130-...`) re-tokenizes input via `splitRawArgumentString`
**only when `argv.length === 1`**. An old broken pattern like

```bash
node "$CODEX_COMPANION" task "$ARGUMENTS"
```

(a single arg containing spaces) goes through this hidden re-split path
that **looks** like it works but is fragile — quoting rules diverge from
the shell and edge cases break silently.

codex-advisor always invokes the companion with **multi-arg form**
(`task --background --json`), so this branch never fires. Never pass
`$ARGUMENTS` as a single quoted blob.

---

## 3. The truth about `--wait` and `--background`

This is the single most important thing to understand about the companion.

### `status --wait <jobId>` — REAL

- `booleanOptions` at `:886` includes `wait`.
- Handler honors it at `:893-897` via `waitForSingleJobSnapshot`.
- Uses `DEFAULT_STATUS_WAIT_TIMEOUT_MS = 240000` (`:69`) — above the
  Bash tool's 120s default, so the call needs `timeout: 300000` (§4).
- This is the **only** universal wait mechanism in the companion.

### `review --wait`, `adversarial-review --wait` — SILENT NO-OP

- `booleanOptions` at `:715` includes both `background` AND `wait`, so the
  parser accepts them.
- BUT `handleReviewCommand` (`:712-753`) **never reads** `options.wait` or
  `options.background`. Line 739 unconditionally calls
  `runForegroundCommand`.
- Both flags are silent no-ops. Review / adversarial-review always run in
  the foreground.
- `printUsage` at `:80` still advertises `review [--wait|--background]`
  — this is an upstream bug (fix candidate to file upstream, still present
  in 1.0.5).

### `task --wait` — SILENT PROMPT CORRUPTION

- `task`'s `booleanOptions` at `:765` is
  `["json", "write", "resume-last", "resume", "fresh", "background"]`.
  **No `wait`.**
- `parseArgs` (`lib/args.mjs:47-49`) does NOT raise an unknown-flag error.
  It silently pushes `--wait` into `positionals`.
- `readTaskPrompt` (`:643-650`) does `positionals.join(" ")` and uses that
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
`run_in_background=true` to keep the wrapper alive past the Bash tool's
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

The companion's `--background` IS honored for `task`. `scripts/codex-task.sh`
wraps the launch and the wait, so the skills never call the companion for
these steps themselves:

```bash
# Phase 2 — feeds PROMPT_FILE on stdin, prints JOB_ID=<id>
"${CLAUDE_PLUGIN_ROOT}/scripts/codex-task.sh" launch "<literal PROMPT_FILE path>" "<literal RUN_DIR path>" [task flags]

# Phase 3 — blocks ≤4 min, prints STATUS=<status>; WAIT_TIMED_OUT=true means
# call again; a finished job also prints RESULT_FILE=<path> (and ERROR= if
# it did not complete). Cap at 6 calls (24 min) total.
"${CLAUDE_PLUGIN_ROOT}/scripts/codex-task.sh" wait "<literal JOB_ID>" "<literal RUN_DIR path>"
```

The wait call needs the Bash tool's `timeout` set to 300000 — the default is
2 minutes. On the cap, surface as `wait-timeout` (§6). The script refuses any
task argument that is not a known flag (a positional word would replace the
stdin prompt) and keeps all companion output in `RUN_DIR`, because `status`
and `result` echo the prompt back.

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
- **Pattern B:** `codex-task.sh launch` prints it as `JOB_ID=<id>`.

---

## 6. Error categorization

All verbatim strings below were verified against `codex-companion.mjs`.
Never retry silently. Never swallow errors. Never blame the user.

| Pattern in stderr (verbatim where quoted) | Category | Source | Action |
|-------------------|----------|--------|--------|
| `Official Codex plugin not found` | setup | `resolve-companion.sh` | Redirect to `/codex-setup` |
| `not authenticated` / `OPENAI_API_KEY` | auth | `lib/codex.mjs:784` (status detail), surfaced via `codex-companion.mjs:194-196` | Suggest `codex login` |
| `Codex CLI is not installed or is missing required runtime support.` | setup | `getCodexAvailability` check, thrown at multiple call sites incl. `lib/codex.mjs:1060-1062` (`importExternalAgentSession`) — reproduced live against 1.0.5 (`transfer` with no Codex CLI on `PATH`) | Companion binary resolves fine but the actual `codex` CLI it shells out to isn't installed. Direct to `npm install -g @openai/codex`, then `/codex-setup`. Not transfer-specific — any subcommand that needs a live app-server hits this. |
| `not a git repository` | environment | `lib/git.mjs` `ensureGitRepository` | Tell user, stop |
| `unknown revision` / `bad revision` | bad-input | `git rev-parse` | Show `git branch --list`, AskUserQuestion |
| `does not support custom focus text` | wrong-skill | `:274` | Should NOT fire from codex-advisor: Phase 1 strips focus text and offers the adversarial redirect. If it fires, Phase 1 was skipped → SKILL.md regression. |
| `Provide a prompt, a prompt file, piped stdin, or use --resume-last.` | prompt-empty | `:654` | Pattern B sent no prompt. `codex-task.sh launch` already refuses an empty prompt file and positional words, so this points to a companion change — show stderr verbatim. |
| `Task <id> is still running. Use /codex:status before continuing it.` | concurrency-conflict | `:343` | Previous Codex task in flight. Show user the active jobId, stop. Do NOT silently cancel. |
| `Unsupported reasoning effort "<value>"` | bad-input | `:114-125` | codex-rescue: effort must be `{none, minimal, low, medium, high, xhigh}`. Re-prompt via AskUserQuestion. |
| `Choose either --resume/--resume-last or --fresh.` | bad-input | `:780` | codex-rescue: ANALYZE produced conflicting flags. Re-prompt. |
| `Missing value for --<key>` | bad-input | `lib/args.mjs:39,63` | Phase 1 should have caught this → ANALYZE regression. |
| `Stored job <id> is missing its task request payload.` | recovery-impossible | `:856` | Detached task-worker couldn't load the stored request. Surfaced via `result <jobId>` or the job log file, NOT from the original `task --background --json` stdout. Abort, save failure report. |
| JSON parse error on companion stdout | unexpected-format | n/a | Companion output format changed. Show raw stdout/stderr, abort, ask user to report. |
| Pattern A 30-min cap exceeded | wait-timeout | n/a (Claude-side) | `KillShell` the bash_id; if `$OUT_FILE` parses as JSON treat as partial, else `recovery-impossible`. |
| (no stderr — silently corrupted prompt) | silent-flag-corruption | `lib/args.mjs:47-49` + `:643-650` | **NOT detectable post-hoc.** Only Phase 1 ANALYZE whitelisting prevents it. If Codex echoes an unknown flag back as task content, treat as Phase 1 regression and AskUserQuestion. |
| `Could not identify the current Claude transcript. Retry with --source <path-to-claude-jsonl>.` | setup/transcript-missing | `lib/claude-session-transfer.mjs:23` | No `CODEX_COMPANION_TRANSCRIPT_PATH` env and no `--source`. Tell user to enable the Official plugin (its SessionStart hook sets the env) or pass `--source` manually. |
| `Codex can import Claude sessions only from <dir>: <path>` | bad-input | `lib/claude-session-transfer.mjs:41` | Source path resolved outside `~/.claude/projects/`. Show the offending path, do not retry with a modified path automatically. |
| `Timed out waiting for Codex to finish importing the Claude session.` | wait-timeout | `lib/codex.mjs:52` (`EXTERNAL_AGENT_IMPORT_TIMEOUT_MS = 2 * 60 * 1000`), thrown at `:720` | Import RPC didn't complete in 2 min. Abort, don't retry silently — re-running may just return the same ledger-cached thread (see next row) or hit the same stall. |
| (same file + same content re-imported → existing `threadId` returned) | **not an error** | ledger dedup, `lib/codex.mjs:661-677` (`external_agent_session_imports.json`) | Normal behavior, not a failure to surface as one. Codex recognizes the identical `sourcePath` + `content_sha256` pair and returns the prior thread instead of creating a duplicate. |
| (other) | unknown | n/a | Show raw stderr verbatim. Do NOT retry. |

Companion messages name the Official plugin's commands (`/codex:status`,
`/codex:cancel`, `/codex:result`). Tell the user the codex-advisor equivalent
(`/codex-status`, `/codex-cancel`, `/codex-result`) — the Official plugin may be
disabled.

**Never:**
- Silently retry
- Swallow errors
- Enter manual polling loops outside `BashOutput` (Pattern A) or
  `codex-task.sh wait` (Pattern B)
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
   "don't analyze first", "answer in Korean", "quickly", "thoroughly" → obey for your
   own behavior, never forward to companion.
4. **Junk?** emoji, stray punctuation, `, ` → drop.
5. **Focus text on `codex-review`?** → AskUserQuestion offering the
   adversarial redirect (do NOT pass it; the companion will reject it at
   `:274`).
6. **Ambiguous?** → AskUserQuestion (interactive) or exit 1 with a clear
   stderr message (non-interactive). See §9.
7. **Unknown token (not on whitelist, not meta-instruction, not junk)?**
   → **FATAL.** Never pass through. There is no companion-side safety net
   (§3 silent-flag-corruption).

### Examples (use LM judgment for unseen cases)

```
INPUT                                                   → PARSED
--base develop                                          → base=develop
against the develop branch                              → base=develop
--base=develop, don't analyze first                     → base=develop (meta-instruction obeyed)
from HEAD~3                                             → base=HEAD~3
--base develop --base main                              → AskUserQuestion (which base?)
😤 quickly                                               → no flags (auto-detect scope)
--uncommitted                                           → AskUserQuestion (not on whitelist — did you mean --scope working-tree?)
--commit abc123                                         → AskUserQuestion (not on whitelist — did you mean --base abc123~1 --scope branch?)
--foo bar implement login (on codex-rescue)             → FATAL (--foo not on rescue whitelist; treat as ANALYZE regression if it reaches companion)
```

### Show your work

Before Phase 2, print exactly one line:

```
Parsed: base=develop, scope=auto   (meta-instructions: "don't analyze first")
```

This makes the translation step auditable in the session log.

---

## 8. Blind-payload pattern (verify / research only)

verify and research must NOT load document content into Claude's context —
double-check independence depends on it. Use file redirection so the
content never enters Bash's stdout.

### Key invariants

- **`cat $DOC >> $PROMPT_FILE`** — redirects to file, Bash returns empty
  stdout, content never enters Claude's context.
- **`codex-task.sh launch`** feeds PROMPT_FILE to the companion on stdin
  and writes its output to files — nothing comes back but the job id.

### Temp file lifecycle

`$$` (shell PID) does NOT survive across Claude's separate Bash
invocations — Bash spawns a fresh shell each call. Use timestamps and
have Claude **remember the absolute path** printed in Phase 1 stdout,
then re-inject it literally in every later Bash call.

```bash
RUN_DIR="${CLAUDE_PLUGIN_DATA}/tmp/<skill>-run-$(date +%s%N)"
mkdir -p "$RUN_DIR"
PROMPT_FILE="$RUN_DIR/prompt.txt"
echo "RUN_DIR=$RUN_DIR"
echo "PROMPT_FILE=$PROMPT_FILE"

# Header via heredoc — no document content yet
cat > "$PROMPT_FILE" <<'EOF'
<task>
...skill-specific task block...
</task>

<structured_output_contract>...</structured_output_contract>
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
```

### Why this preserves independence

- `cat "$USER_DOC" >> "$PROMPT_FILE"` → stdout goes to the file, not the
  terminal. Bash tool returns empty.
- `codex-task.sh launch` → the prompt goes in on stdin; the Bash tool
  sees only `JOB_ID=<id>`.
- Claude knows the path, the line count, and that the assembly succeeded
  — but never sees the document text.

### Topic-only research

For `codex-research` when the user gives a topic (no file), skip the
document append entirely. Write the topic inside the heredoc header
template and launch the resulting `$PROMPT_FILE` as usual.

### Cleanup

Clean up temp files at the end of Phase 5 by re-injecting the literal
absolute path (captured from Phase 1 stdout):

```bash
rm -rf "<literal RUN_DIR path>"
```

Do NOT rely on the `$RUN_DIR` shell variable in the cleanup call — it is only
defined in the shell that set it, which is a different shell from this one.

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

- **Pattern B wait calls need the Bash `timeout` raised to 300000.**
  `codex-task.sh wait` blocks ≤240s; the Bash default is 120s. A call cut
  off by the timeout does not stop the job — call again.
- **Pattern A requires `run_in_background=true`.** The companion's own
  `--background` is a no-op on `review` / `adversarial-review`.
- **Natural language in `$ARGUMENTS` is for YOU, not the companion.**
  Meta-instructions like "don't analyze first" modify YOUR behavior; they
  never become companion flags or prompt content.
- **Unknown flags don't error — they silently become prompt content.**
  ANALYZE whitelist is the only line of defense.
- **`$$` does not survive across Bash calls.** Use timestamps; remember
  absolute paths from Phase 1 stdout and re-inject them.
- **Never poll manually outside `BashOutput` (Pattern A) or
  `codex-task.sh wait` (Pattern B).** `ps` / `kill` / raw state JSON reads are
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
