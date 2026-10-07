# Companion Invocation Protocol

Shared reference for all codex-advisor skills. Read on demand when launching
the Official Codex plugin's companion script, when the inline ANALYZE rules
in a SKILL.md don't cover an edge case, or when an error needs categorization.

Citations name functions in the Official Codex plugin's
`scripts/codex-companion.mjs` and `scripts/lib/`, checked against
`codex@openai-codex` 1.0.6. Line numbers are left out — they move between
releases. Earlier versions had a different review handler that silently
discarded `--model`; v1.0.4+ passes it through `executeReviewRun` →
`runAppServerReview` → `startThread({ model })` (`lib/codex.mjs`,
`buildThreadParams` builds the params).

---

## 1. Resolve the companion

Skills never resolve the companion themselves. `scripts/codex-task.sh` and
`scripts/codex-job.sh` call `scripts/resolve-companion.sh`, which finds the
official Codex plugin's `codex-companion.mjs` path inside the user's plugin
install. When the plugin is absent, their `die()` exits 1 with `Official Codex
plugin not found — run /codex-setup` on stderr — this is the `setup` error
category (see §6).
Redirect the user to `/codex-setup` and stop.

Every shell step a skill takes is one call to a script in `scripts/`, so the
single `allowed-tools` rule `Bash(${CLAUDE_PLUGIN_ROOT}/scripts/*)` covers the
whole run. A command that starts with anything else — a variable assignment,
`set`, `mkdir`, `git` — falls outside the rule and asks the user.

---

## 2. Verified flag whitelists per subcommand

Every flag below was verified against `codex-companion.mjs`. "Documented"
means it appears in `printUsage`; "parser-only" means it is
accepted by `parseArgs` but not printed in usage.

### `review` (`handleReviewCommand`)

| Flag | Type | Status | Honored? |
|------|------|--------|----------|
| `--base <ref>` | value | documented | yes |
| `--scope <auto\|working-tree\|branch>` | value | documented | yes |
| `--model <m>` | value | parser-only | **yes** — `executeReviewRun` → `runAppServerReview` → `startThread({ model })` (`lib/codex.mjs`). codex-advisor still routes `--model` through `apply-codex-config.py` for **consistency across skills** and so the value persists for the next session — not because the flag is ignored. It also passes `--model` when a project `.codex/config.toml` sets a model (the script's `Run flags:` line), since that file outranks `config.toml`. |
| `--cwd <path>` | value | parser-only | yes |
| `--json` | bool | parser-only | yes |
| `--effort <level>` | — | **NOT REGISTERED** | `valueOptions` is `["base", "scope", "model", "cwd"]`. `--effort` becomes focus text, which review rejects and adversarial-review puts in the prompt (§3). codex-advisor sets it via `~/.codex/config.toml` (`model_reasoning_effort`); a project `.codex/config.toml` that sets it wins for reviews, and the script prints a `Note:` saying so. |
| `--background` | bool | documented | **NO — silent no-op** (see §3) |
| `--wait` | bool | documented | **NO — silent no-op** (see §3) |
| (positional focus text) | — | — | **rejected** by `validateNativeReviewRequest` |

### `adversarial-review` (`handleReviewCommand`)

Identical valueOptions / booleanOptions as `review` (same handler). The
only difference: adversarial does NOT pass `validateNativeReviewRequest`,
so positional focus text IS accepted (joined with spaces).

**Neither** review nor adversarial has `--commit` or `--uncommitted`. To
review a specific commit, use `--base <sha>~1 --scope branch`.

### `task` (`handleTask`)

| Flag | Type | Status | Notes |
|------|------|--------|-------|
| `--write` | bool | documented | enables code changes |
| `--background` | bool | documented | **honored** — calls `enqueueBackgroundTask` |
| `--resume-last` | bool | documented | resume most recent completed task |
| `--resume` | bool | documented | alias for `resume-last` |
| `--fresh` | bool | documented | opposite of resume; mutually exclusive |
| `--json` | bool | parser-only | structured output |
| `--model <m>` | value | documented | accepts `spark` alias (`MODEL_ALIASES`) |
| `--effort <level>` | value | documented | one of `{none, minimal, low, medium, high, xhigh}` (`VALID_REASONING_EFFORTS`); the companion rejects other values. codex-advisor passes `--model`/`--effort` on `task` only when a project `.codex/config.toml` would override `config.toml` (the script's `Run flags:` line). |
| `--cwd <path>` | value | parser-only | |
| `--prompt-file <path>` | value | **parser-only** (not in usage) | read by `readTaskPrompt` |
| `--wait` | — | **NOT REGISTERED** | silently pushed to positionals → **prompt corruption**, see §3 |

### `status` (`handleStatus`)

| Flag | Type | Status | Notes |
|------|------|--------|-------|
| `--wait` | bool | parser-only | **honored** — calls `waitForSingleJobSnapshot` |
| `--timeout-ms <ms>` | value | parser-only | default `240000` (`DEFAULT_STATUS_WAIT_TIMEOUT_MS`); cap per call |
| `--poll-interval-ms <ms>` | value | parser-only | default `2000` (`DEFAULT_STATUS_POLL_INTERVAL_MS`) |
| `--all` | bool | documented | lifts the cap on finished jobs listed; still this session's jobs only |
| `--json` | bool | documented | |
| (positional jobId) | — | — | required when using `--wait` |

### `result` (`handleResult`)

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

### `transfer` (`handleTransfer`, v1.0.5+)

| Flag | Type | Notes |
|------|------|-------|
| `--source <path>` | value | Claude session `.jsonl` to import. Falls back to `CODEX_COMPANION_TRANSCRIPT_PATH` env (`resolveClaudeSessionPath` in `lib/claude-session-transfer.mjs`) when omitted. |
| `--json` | bool | |
| `--cwd <path>` | value | Accepted by `handleTransfer`'s `valueOptions` but **not shown in `printUsage`'s transfer line** — don't copy the usage line as the full flag set. |

No `--model`/`--effort`/`--wait`/`--background` — transfer has no prompt and completes synchronously (≤2 min), so none of those concepts apply. Result payload includes `threadId` and `resumeCommand` (`codex resume <threadId>`) rendered verbatim by `renderTransferResult`.

### 2a. `normalizeArgv` quirk

`normalizeArgv` re-tokenizes input via `splitRawArgumentString`
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

- `handleStatus`'s `booleanOptions` includes `wait`.
- The handler honors it via `waitForSingleJobSnapshot`.
- Uses `DEFAULT_STATUS_WAIT_TIMEOUT_MS = 240000` — above the
  Bash tool's 120s default, so the call needs `timeout: 300000` (§4).
- This is the **only** universal wait mechanism in the companion.

### `review --wait`, `adversarial-review --wait` — SILENT NO-OP

- `handleReviewCommand`'s `booleanOptions` includes both `background` AND
  `wait`, so the parser accepts them.
- BUT `handleReviewCommand` **never reads** `options.wait` or
  `options.background`. It always calls `runForegroundCommand`.
- Both flags are silent no-ops. Review / adversarial-review always run in
  the foreground.
- `printUsage` still advertises `review [--wait|--background]` — an
  upstream bug.

### `task --wait` — SILENT PROMPT CORRUPTION

- `handleTask`'s `booleanOptions` is
  `["json", "write", "resume-last", "resume", "fresh", "background"]`.
  **No `wait`.**
- `parseArgs` (`lib/args.mjs`) does NOT raise an unknown-flag error.
  It silently pushes `--wait` into `positionals`.
- `readTaskPrompt` does `positionals.join(" ")` and uses that
  as the task prompt body.
- Result: Codex receives the literal string `"--wait"` as part of its task
  prompt. No stderr. No exit code. Silent prompt corruption.

The same path applies to **any** unknown flag passed to **any** companion
subcommand, because `parseArgs` has no "unknown flag" mode. On
`adversarial-review` the flag joins the focus text, silently. On `review` it
becomes focus text that `validateNativeReviewRequest` rejects, so the run
fails instead.

**There is no companion-side safety net.** Phase 1 ANALYZE whitelisting in
each skill is the only line of defense.

---

## 4. Two invocation patterns

codex-advisor skills use exactly two patterns to run the companion.

### Pattern A — review / adversarial-review

The companion's `--background` is a no-op here — the review runs in the
foreground of whatever starts it. So `codex-task.sh review` starts it detached
(its own session and process group) and returns at once, and the skill waits
in the same turn with `review-wait`.

```bash
# Phase 2 — prints RUN_DIR=, OUT_FILE=, ERR_FILE= and returns.
# Replace <literal ...> with values from Phase 1.
"${CLAUDE_PLUGIN_ROOT}/scripts/codex-task.sh" review "${CLAUDE_PLUGIN_DATA}" review \
  --base "<literal clean base from Phase 1>"

# Phase 3 — blocks ≤4 min, prints STATUS=running|done; done also prints
# COMPANION_EXIT= and OUTPUT=. Cap at 8 calls (about 30 min) total.
"${CLAUDE_PLUGIN_ROOT}/scripts/codex-task.sh" review-wait "<literal RUN_DIR path>"
```

Why not Bash `run_in_background`: a background command that finishes starts
a new turn, and the skill's `allowed-tools` grant clears at a new turn
(skills.md), so the next script call asks the user.

| `OUTPUT=` | Action |
|-----------|--------|
| `json` | `Read` `OUT_FILE`, go on to Phase 4 |
| `empty` | Companion crashed or was killed. Read `ERR_FILE`, categorize (§6), save `<type>-<ts>-failed.md` |
| `non-json` | `unexpected-format` (§6). Show `ERR_FILE` verbatim, abort |

The companion records the review as a job with its own pid, so `/codex-status`
lists it and `/codex-cancel` stops it; `review-wait` then reports `OUTPUT=empty`.
Bash spawns a fresh shell per call, so remember the literal paths printed on
stdout and re-inject them in every later call.

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

Both wait calls (`wait`, `review-wait`) need the Bash tool's `timeout` set to
300000 — the default is 2 minutes. On the cap, surface as `wait-timeout` (§6). The script refuses any
task argument that is not a known flag (a positional word would replace the
stdin prompt) and keeps all companion output in `RUN_DIR`, because `status`
and `result` echo the prompt back.

---

## 5. Job ID capture

- Always pass `--json` to commands whose output you intend to parse. The
  rendered text format is not stable across releases.
- The scripts parse JSON with `node -e '...'` (already a runtime dependency).
  Do NOT grep / regex the rendered output.
- **Pattern A:** jobId is embedded in the final `OUT_FILE` payload
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
| `not authenticated` / `OPENAI_API_KEY` | auth | `buildAuthStatus` in `lib/codex.mjs` (status detail), surfaced via `buildSetupReport` | Suggest `codex login` |
| `Codex CLI is not installed or is missing required runtime support.` | setup | `getCodexAvailability` check, thrown at multiple call sites incl. `importExternalAgentSession` in `lib/codex.mjs` | Companion binary resolves fine but the actual `codex` CLI it shells out to isn't installed. Direct to `npm install -g @openai/codex`, then `/codex-setup`. Not transfer-specific — any subcommand that needs a live app-server hits this. |
| `not a git repository` | environment | `lib/git.mjs` `ensureGitRepository` | Tell user, stop |
| `unknown revision` / `bad revision` | bad-input | `git rev-parse` | Show `git branch --list`, AskUserQuestion |
| `does not support custom focus text` | wrong-skill | `validateNativeReviewRequest` | Should NOT fire from codex-advisor: Phase 1 strips focus text and offers the adversarial redirect. If it fires, Phase 1 was skipped → SKILL.md regression. |
| `Provide a prompt, a prompt file, piped stdin, or use --resume-last.` | prompt-empty | `requireTaskRequest` | Pattern B sent no prompt. `codex-task.sh launch` already refuses an empty prompt file and positional words, so this points to a companion change — show stderr verbatim. |
| `Task <id> is still running. Use /codex:status before continuing it.` | concurrency-conflict | `resolveLatestTrackedTaskThread` | Previous Codex task in flight. Show user the active jobId, stop. Do NOT silently cancel. |
| `Unsupported reasoning effort "<value>"` | bad-input | `normalizeReasoningEffort` | Fires only when the apply step's `Run flags:` put `--effort` on `task` (rescue, verify, research). Relay the message verbatim and ask for another value. |
| `Choose either --resume/--resume-last or --fresh.` | bad-input | `handleTask` | codex-rescue: ANALYZE produced conflicting flags. Re-prompt. |
| `Missing value for --<key>` | bad-input | `parseArgs` in `lib/args.mjs` | Phase 1 should have caught this → ANALYZE regression. |
| `Stored job <id> is missing its task request payload.` | recovery-impossible | `handleTaskWorker` | Detached task-worker couldn't load the stored request. Surfaced via `result <jobId>` or the job log file, NOT from the original `task --background --json` stdout. Abort, save failure report. |
| JSON parse error on companion stdout | unexpected-format | n/a | Companion output format changed. Show raw stdout/stderr, abort, ask user to report. |
| Pattern A wait cap (8 `review-wait` calls) exceeded | wait-timeout | n/a (Claude-side) | Do not cancel. Leave the review and its `RUN_DIR` in place; point the user at `/codex-status` and `/codex-cancel`. |
| (no stderr — silently corrupted prompt) | silent-flag-corruption | `parseArgs` in `lib/args.mjs` + `readTaskPrompt` | **NOT detectable post-hoc.** Only Phase 1 ANALYZE whitelisting prevents it. If Codex echoes an unknown flag back as task content, treat as Phase 1 regression and AskUserQuestion. |
| `Codex can import Claude sessions only from <dir>: <path>` | bad-input | `lib/claude-session-transfer.mjs` | Source path resolved outside `~/.claude/projects/`. Show the offending path, do not retry with a modified path automatically. |
| `Timed out waiting for Codex to finish importing the Claude session.` | wait-timeout | `requestExternalAgentSessionImport` in `lib/codex.mjs` (`EXTERNAL_AGENT_IMPORT_TIMEOUT_MS = 2 * 60 * 1000`) | Import RPC didn't complete in 2 min. Abort, don't retry silently — re-running may just return the same ledger-cached thread (see next row) or hit the same stall. |
| (same file + same content re-imported → existing `threadId` returned) | **not an error** | ledger dedup, `importedThreadIdForSource` in `lib/codex.mjs` (`external_agent_session_imports.json`) | Normal behavior, not a failure to surface as one. Codex recognizes the identical `sourcePath` + `content_sha256` pair and returns the prior thread instead of creating a duplicate. |
| (other) | unknown | n/a | Show raw stderr verbatim. Do NOT retry. |

Companion messages name the Official plugin's commands (`/codex:status`,
`/codex:cancel`, `/codex:result`). Tell the user the codex-advisor equivalent
(`/codex-status`, `/codex-cancel`, `/codex-result`) — the Official plugin may be
disabled.

**Never:**
- Silently retry
- Swallow errors
- Enter manual polling loops — Pattern A waits with `codex-task.sh
  review-wait`, Pattern B with `codex-task.sh wait`
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
   adversarial redirect (do NOT pass it; the companion rejects it in
   `validateNativeReviewRequest`).
6. **Ambiguous?** → AskUserQuestion; if it is unavailable (non-interactive),
   reply with one `AMBIGUOUS:` line and run nothing. See §9.
7. **Unknown token (not on whitelist, not meta-instruction, not junk)?**
   → never pass it through; AskUserQuestion what it means (§3
   silent-flag-corruption).

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
--foo bar implement login (on codex-rescue)             → AskUserQuestion (--foo not on rescue whitelist)
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
double-check independence depends on it. `codex-task.sh prompt --document`
appends the file by redirect, so the content never enters Bash's stdout.

### Key invariants

- **`prompt --document <path> --tag <tag>`** — redirects to file, Bash
  returns empty stdout, content never enters Claude's context.
- **`codex-task.sh launch`** feeds PROMPT_FILE to the companion on stdin
  and writes its output to files — nothing comes back but the job id.

### Temp file lifecycle

Bash spawns a fresh shell each call, so nothing set in one call survives to
the next. The scripts print every path they make; Claude **remembers the
absolute path** printed on stdout and re-injects it literally in every later
Bash call.

```bash
# Refuses a missing or empty file; prints DOC_LINES= (size, not content).
"${CLAUDE_PLUGIN_ROOT}/scripts/codex-task.sh" check-doc "<literal doc path>"

# Refuses when the companion is missing; prints RUN_DIR= and PROMPT_FILE=.
"${CLAUDE_PLUGIN_ROOT}/scripts/codex-task.sh" new-run "${CLAUDE_PLUGIN_DATA}" <skill>

# Header on stdin; the document is appended inside <document> by redirect.
"${CLAUDE_PLUGIN_ROOT}/scripts/codex-task.sh" prompt "<literal PROMPT_FILE path>" \
  --document "<literal doc path>" --tag document <<'EOF'
<task>
...skill-specific task block...
</task>

<structured_output_contract>...</structured_output_contract>
<grounding_rules>...</grounding_rules>
EOF
```

### Why this preserves independence

- `prompt --document` → the document goes to the file, not the terminal.
  The Bash tool sees only `PROMPT_WRITTEN=<path>`.
- `codex-task.sh launch` → the prompt goes in on stdin; the Bash tool
  sees only `JOB_ID=<id>`.
- Claude knows the path, the line count, and that the assembly succeeded
  — but never sees the document text.

### Topic-only research

For `codex-research` when the user gives a topic (no file), skip the
`--document` and `--tag` entirely. Write the topic inside the heredoc header
and launch the resulting `PROMPT_FILE` as usual.

### Cleanup

Clean up temp files at the end of Phase 5 by re-injecting the literal
absolute path (captured from Phase 1 stdout):

```bash
"${CLAUDE_PLUGIN_ROOT}/scripts/codex-report.sh" clean "${CLAUDE_PLUGIN_DATA}" "<literal RUN_DIR path>" --keep-inputs
```

`--keep-inputs` keeps `prompt.txt` and `result.json`: the Verifier payload
points at both by path. The script refuses any folder that is not a run folder under
`${CLAUDE_PLUGIN_DATA}/tmp/`.

---

## 9. AskUserQuestion fallback for non-interactive runs

There is no env var that reliably tells Claude whether `AskUserQuestion`
is available — `CLAUDECODE` is always set inside Claude Code. The
pragmatic pattern is "try and fall back":

1. Always attempt `AskUserQuestion` first when ANALYZE detects ambiguity.
2. If the tool errors or times out (headless `claude -p` runs), stop and
   reply with one line — `AMBIGUOUS: <reason>. Provide unambiguous input or
   run interactively.` — instead of running anything.

3. Never silently guess. Never pass an ambiguous token through to the
   companion (§3 silent-corruption).

---

## 10. Shared gotchas

- **Wait calls need the Bash `timeout` raised to 300000.**
  `codex-task.sh wait` and `review-wait` block ≤240s; the Bash default is
  120s. A call cut off by the timeout does not stop the job — call again.
- **Never use Bash `run_in_background` for a codex-advisor step.** Its
  completion starts a new turn without the `allowed-tools` grant. The
  companion's own `--background` is a no-op on `review` /
  `adversarial-review`; `codex-task.sh review` detaches it instead.
- **Natural language in `$ARGUMENTS` is for YOU, not the companion.**
  Meta-instructions like "don't analyze first" modify YOUR behavior; they
  never become companion flags or prompt content.
- **Unknown flags don't error — they silently become prompt content.**
  ANALYZE whitelist is the only line of defense.
- **Shell variables do not survive across Bash calls.** Remember the
  absolute paths the scripts print and re-inject them.
- **Never poll manually.** Pattern A waits with `codex-task.sh review-wait`;
  Pattern B with `codex-task.sh wait`. `ps` / `kill` / raw state JSON reads are
  forbidden — they leave orphan jobs in unrecoverable states.
- **Never swallow errors. Never retry silently.** Categorize per §6 and
  surface verbatim.
- **Read source only AFTER Phase 3 completes.** Phase 1-3 must not call
  `Read` / `Grep` / `Glob` / `git diff` / `git log -p` / `git show` /
  `git blame` on source or diffs. Input validation (`codex-task.sh
  check-doc`, `check-ref`) is allowed.
- **In Phase 4, read only what Codex cited.** Never read whole files "for
  context". If a cited file/function/line does not exist in the current
  source tree, classify as "False Positive (hallucination)". If a finding
  has no concrete citation, classify as "Uncited — verification deferred".
