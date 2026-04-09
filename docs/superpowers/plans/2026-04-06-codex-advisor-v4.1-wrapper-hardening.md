# codex-advisor v4.1 — Wrapper Hardening & Analyze-First Contract

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harden codex-advisor so that no matter how the user types a command — flags, Korean, English, emoji, typos, meta-instructions, or any mix — the skills reliably translate input into a clean invocation of the Official Codex plugin, execute it without hitting Bash's 5-minute timeout, and only read source code AFTER Codex returns (to double-check, not to pre-analyze).

**Scope:** 5 skills (codex-review, codex-adversarial, codex-rescue, codex-verify, codex-research) + 1 new shared reference (`companion-usage.md`) + README. codex-setup is untouched.

**Version:** 4.0.1 → 4.1.0 (minor — behavioral contract change)

---

## 1. Problem Statement

### 1.1 Evidence from the Broken Session (2026-04-06)

The user ran:

```
/codex-advisor:codex-review --base develop, 절대 너가 먼저 코드 분석하지말고 그냥 리뷰 프롬프트만 보내고 코덱스 결과 더블체크해
```

What went wrong, observed in the session log:

1. **Raw `$ARGUMENTS` passthrough** — The skill did `node "$CODEX_COMPANION" review --wait $ARGUMENTS`, which fed the Korean meta-instruction into the companion's arg parser. The parser treated `절대 너가...` as focus text; `review` subcommand rejects focus text (`codex-companion.mjs:270-274`).
2. **5-minute Bash timeout hit** — `review` runs synchronously in foreground; the Bash tool killed the wrapper after 300s and Claude lost the job handle.
3. **Manual polling chaos** — Claude improvised: tried `wait` subcommand (doesn't exist), tried `result review-mnmw52i8-olgq59` (wrong ID, "No job found"), then wrote a custom Python polling loop inside Bash.
4. **No canonical wait path** — The skill didn't know the proper "long-running wait" mechanism for the official plugin.
5. **Double-check never ran** — After 28 minutes of thrashing, the user interrupted before Codex's result was ever evaluated.

### 1.2 Root Causes

| # | Root cause | Current behavior | Fix direction |
|---|------------|------------------|---------------|
| RC1 | Skill treats `$ARGUMENTS` as shell passthrough | Natural language, Korean text, emoji all get forwarded to companion's arg parser → parser errors or silent misparsing | Claude analyzes `$ARGUMENTS` with LM intelligence → builds clean companion call |
| RC2 | Bash 300s timeout kills foreground wrapper | Long reviews die mid-flight; recovery is undefined | Make "wait for long jobs" the **normal path**, not an exception. See §3 for the unified pattern. |
| RC3 | No "pre-analysis forbidden" contract | Claude is tempted to read code before Codex runs, biasing the double-check | Front-load an Execution Contract that forbids source reads until Phase 4 |
| RC4 | verify/research read documents with `Read` tool | Claude's context gets contaminated by document content → double-check is not independent | Blind payload assembly via `cat "$PROMPT_FILE" \| node companion.mjs ...` (stdin pipe — content never enters Claude's stdout) |
| RC5 | review/adversarial skill blurs with companion's own parser | Unclear where validation happens | Explicit: Claude analyzes → companion invokes → Claude never re-validates |
| RC6 | **Plan author assumed `--wait` was a universal companion flag** | Original v4.1 draft proposed `review --wait`, `task --wait`. Source verification (`codex-companion.mjs:657, 707`) shows `--wait` is **only honored on `status`**; `review` accepts it but ignores it (always foreground), and `task` rejects it entirely. | All companion-interface claims must be backed by source/`--help` verification before being written into a plan. |

---

## 2. Core Principle

```
codex-advisor = translator layer
                  ↓
    user's messy input  ──►  clean official plugin invocation
                  ↓
    Official plugin result  ──►  Claude's independent double-check
```

Every skill is a **translator** + **executor** + **double-checker**. The user can type anything; the skill's first job is to figure out intent and produce a canonical call to the Official Codex plugin.

**Source code reading is forbidden until Phase 4** (double-check). Not for review, not for verify, not for research, not for anything.

**Two narrow exceptions** to "no reads before Phase 4", both classified as **input validation** (not analysis):

1. **Existence/identity checks** — `test -f "$DOC_PATH"`, `test -s "$DOC_PATH"`, `git rev-parse --verify develop`. These confirm the input refers to something real. They never load contents.
2. **Blind payload assembly** (verify/research only) — `cat "$DOC_PATH" >> "$PROMPT_FILE"` and `cat "$PROMPT_FILE" | node companion.mjs ...`. The `cat` writes to a file or pipe, not to Bash stdout, so the document content never enters Claude's context window.

---

## 3. Unified Phase Structure

All 5 skills share this phase contract:

```
Phase 1 — ANALYZE
  Parse $ARGUMENTS with LM intelligence.
  Extract: companion flags + (for verify/research) document path
  Obey: natural-language meta-instructions addressed to Claude
  Drop: junk, emoji, trailing punctuation (e.g., "develop," → "develop")
  Output: clean parameters ready for the official plugin
  Ambiguous → AskUserQuestion (interactive) or fail-fast error (non-interactive).
  Unknown flag (not on this skill's whitelist) = ALWAYS fatal — never pass through.
    The companion silently treats unknown flags as positional text and joins them
    into the prompt (lib/args.mjs:47-49 + readTaskPrompt:585-592). There is no
    companion-side safety net; ANALYZE is the only line of defense.

  Allowed Bash commands in Phase 1 (input validation only):
    test -f / -s / -d
    git rev-parse --verify
    git branch --list (lists names, NOT contents)
    wc -l / wc -c (size info, NOT contents)
    file (MIME type, NOT contents)
    echo / printf (only for emitting captured paths to Claude's stdout)
  FORBIDDEN in Phase 1 (these load source/diff/log into Claude's context):
    cat / head / tail / less / more
    git diff / git log -p / git show / git blame
    Read / Grep / Glob tools

Phase 2 — INVOKE (background-first, two patterns)

  Pattern A — review / adversarial-review (companion has no --background)
    Use Claude's Bash run_in_background=true to launch the wrapper:
      node "$CODEX_COMPANION" review --json --base develop \
        > "$OUT_FILE" 2> "$ERR_FILE"
    Bash returns the bash_id immediately. Capture it.

  Pattern B — task / verify / research / rescue (companion supports --background)
    cat "$PROMPT_FILE" | node "$CODEX_COMPANION" task --background --json --write \
      > "$JOB_JSON_FILE" 2>&1
    The companion's --background returns immediately with a job payload.
    Parse JOB_ID from $JOB_JSON_FILE.

Phase 3 — WAIT (normal path, not recovery)

  Pattern A — review / adversarial-review
    Poll Bash output with BashOutput tool every 30-60s until the
    backgrounded shell exits. Then read $OUT_FILE for the JSON payload.

  Pattern B — task / verify / research / rescue
    node "$CODEX_COMPANION" status --wait "$JOB_ID" \
      --timeout-ms 240000 --json
    Each call blocks ≤4 min (well under Bash 300s). Re-call until status
    is "completed" or "failed". Then:
    node "$CODEX_COMPANION" result "$JOB_ID" --json

Phase 4 — DOUBLE-CHECK
  ONLY now may Claude read source code.
  Read ONLY files/lines Codex cited in its findings.
  Do NOT read whole files "for context".
  If Codex cites a file/function/line that does not exist in the current
  source tree, classify the finding as "false positive (hallucination)".
  If a finding has no concrete citation (e.g., a vague design comment or
  a research summary), classify as "uncited — verification deferred" and
  surface it to the user for manual review. Do NOT invent citations to
  justify reading files.
  Classify each finding: Agree / Disagree / Nuance / False Positive / Uncited.

Phase 5 — REPORT + SAVE
  Structured report per references/evaluation.md.
  Success → save to ${CLAUDE_PLUGIN_DATA}/reviews/<type>-<timestamp>.md
  Failure (Codex never produced result) → save to
    ${CLAUDE_PLUGIN_DATA}/reviews/<type>-<timestamp>-failed.md
    with the categorized error from §4 and the captured stderr.
```

### 3.1 Per-skill ANALYZE targets and flag whitelists

Whitelists are derived from `codex-companion.mjs` `valueOptions` / `booleanOptions` of each subcommand. Anything not on the whitelist must be treated as fatal ambiguity by Phase 1 — see C1 / silent-flag-corruption in §4.

| Skill | Official plugin target | Phase 2 pattern | Whitelist (verified against source) | Notes |
|-------|------------------------|-----------------|--------------------------------------|-------|
| codex-review | `companion review` | A (Bash run_in_background) | `--base <ref>`, `--scope <auto\|working-tree\|branch>` | NO focus text. NO `--commit` (does not exist on review — `:656`). To review a specific commit, derive `--base <sha>~1 --scope branch`. |
| codex-adversarial | `companion adversarial-review` | A (Bash run_in_background) | `--base <ref>`, `--scope <auto\|working-tree\|branch>`, plus positional focus text | Focus text passed as positional after flags. Same handler as review (`:976`), so `--commit` does not exist here either. |
| codex-rescue | `companion task --write` | B (companion --background + stdin pipe) | `--write`, `--model <m>`, `--effort <none\|minimal\|low\|medium\|high\|xhigh>`, `--resume-last` / `--resume` / `--fresh` | Task description goes via stdin pipe (NEVER as a positional — would override stdin per readTaskPrompt:591). `--write` ON by default, omit only for read-only investigation. |
| codex-verify | `companion task` | B (companion --background + stdin pipe) | (no user-controllable companion flags) | Document path is a SKILL input only — never reaches the companion as a flag. Companion call uses fixed `--background --json`. |
| codex-research | `companion task` | B (companion --background + stdin pipe) | (no user-controllable companion flags) | Topic OR document path. Same fixed `--background --json` invocation. |

### 3.2 ANALYZE — inline core (embedded in each SKILL.md)

The full classification rules and edge cases live in `references/companion-usage.md §7`. Each SKILL.md inlines only the **core block** below so the rules are always in context without an extra file read. The block is intentionally short — it must fit comfortably above the fold of every SKILL.md.

```markdown
## Phase 1: Analyze

You are a translator. Use LM intelligence, not regex tables.
Whitelist for this skill: <skill-specific flag list — see §3.1>
Meta-instructions to YOU (e.g., "분석 먼저 하지마", "한국어로") → obey, never forward to companion.
Junk, emoji, trailing punctuation → drop. Strip trailing `,` `.` `)` from flag values
  (e.g., "--base develop," → base="develop").
Ambiguous flags → AskUserQuestion (interactive) or exit 1 with clear stderr (non-interactive).
ANY token not on the whitelist → fatal. The companion silently treats unknown
  flags as positional text and joins them into the task prompt
  (lib/args.mjs:47-49 + readTaskPrompt:585-592). NEVER pass through.
Show ONE line "Parsed: <result>" before Phase 2.

For edge cases (flag conflicts, unusual phrasings, classification details),
read ${CLAUDE_PLUGIN_ROOT}/references/companion-usage.md §7.
```

### 3.3 Blind-payload pattern (verify / research only)

**Temp file lifecycle (critical):** `$$` is the current shell PID, but Claude's Bash tool spawns a fresh shell per call, so `$$` differs across Phase 1 / Phase 2 / Phase 5 invocations and `rm -f "...-$$.txt"` at the end will silently fail to clean anything (`rm -f` swallows missing-file errors). The pattern below uses a **timestamp** for the path and Claude **remembers the absolute path** (echoed to stdout in Phase 1) and re-injects it as a literal string in subsequent Bash calls. Do NOT rely on `$$`.

```bash
# Phase 1 — assemble blind payload
# Claude must capture the printed PROMPT_FILE / JOB_JSON_FILE paths from
# stdout and reuse them verbatim in every later Bash call this skill runs.

set -o pipefail
TS=$(date +%s%N)
PROMPT_FILE="${CLAUDE_PLUGIN_DATA}/tmp/<skill>-prompt-${TS}.txt"
JOB_JSON_FILE="${CLAUDE_PLUGIN_DATA}/tmp/<skill>-job-${TS}.json"
mkdir -p "$(dirname "$PROMPT_FILE")"
echo "PROMPT_FILE=$PROMPT_FILE"
echo "JOB_JSON_FILE=$JOB_JSON_FILE"

# Header via heredoc (no document content)
cat > "$PROMPT_FILE" <<'EOF'
<task>
...skill-specific task block...
</task>

<compact_output_contract>...</compact_output_contract>
<grounding_rules>...</grounding_rules>

<document>
EOF

# Sanity check path without reading content (input validation, allowed in Phase 1)
test -f "$USER_DOC" || { echo "File not found: $USER_DOC" >&2; exit 1; }
test -s "$USER_DOC" || { echo "File is empty: $USER_DOC" >&2; exit 1; }
echo "DOC_LINES=$(wc -l < "$USER_DOC")"   # size info, not content

# Append document — redirect to file, no stdout, Claude never sees content
cat "$USER_DOC" >> "$PROMPT_FILE"

# Close XML
printf '\n</document>\n' >> "$PROMPT_FILE"

# Phase 2 — invoke via stdin pipe (the OFFICIAL companion interface).
# NEVER pass a positional arg here. readTaskPrompt (codex-companion.mjs:585-592)
# does `positionalPrompt || readStdinIfPiped()` — any positional silently
# overrides stdin and the entire blind payload is dropped.
cat "$PROMPT_FILE" | node "$CODEX_COMPANION" task --background --json \
  > "$JOB_JSON_FILE" 2> "${JOB_JSON_FILE}.stderr" \
  || { echo "task launch failed:" >&2; cat "${JOB_JSON_FILE}.stderr" >&2; exit 1; }

# Capture jobId — use node (already a dependency) instead of python3 to
# avoid host-python assumptions. Fail loudly on parse errors instead of
# letting an empty $JOB_ID propagate into status --wait.
JOB_ID=$(node -e 'const fs=require("fs");try{const j=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));if(!j.jobId)throw new Error("no jobId");process.stdout.write(j.jobId);}catch(e){process.stderr.write("JOB_ID parse failed: "+e.message+"\n");process.exit(1);}' "$JOB_JSON_FILE") \
  || { echo "raw companion stdout:" >&2; cat "$JOB_JSON_FILE" >&2; exit 1; }
echo "JOB_ID=$JOB_ID"

# Phase 3 — wait via official mechanism.
# DEFAULT_STATUS_WAIT_TIMEOUT_MS = 240000 (codex-companion.mjs:67),
# safely under Bash's 300s. Re-call only when waitTimedOut === true AND
# status is still queued/running. Cap total budget at 6 iterations
# (= 24 minutes); on cap surface as "wait-timeout" per §4.

# Phase 4 — fetch result
node "$CODEX_COMPANION" result "$JOB_ID" --json

# Cleanup — Claude must run this in the SAME Bash call that captured
# the variables, OR re-inject the absolute paths captured from Phase 1.
rm -f "$PROMPT_FILE" "$JOB_JSON_FILE" "${JOB_JSON_FILE}.stderr"
```

**Why stdin pipe instead of `--prompt-file`:** `--prompt-file` exists in the parser (`codex-companion.mjs:706`) but is not advertised in `--help` (line 80 usage omits it). Stdin support is the **first-class** prompt path (`readTaskPrompt` at lines 585-592 handles stdin explicitly via `lib/fs.mjs:35-40`) and is less likely to silently disappear in a future companion update. The blind-payload property is preserved either way: `cat "$PROMPT_FILE" | node ...` sends the document into the pipe, never to Bash's stdout, so Claude's context stays clean.

**Why `cat >> file` (not `Read`) for assembly:** Bash redirects send stdout to the file, not to the terminal, so the Bash tool returns empty stdout. The document content never enters Claude's context window. Claude knows the path, the size (via `wc -l`), and the assembly result — but not the content. This preserves double-check independence.

**Why `set -o pipefail`:** without it, `cat $missing_file | node ...` would silently send 0 bytes into the companion's stdin. The companion would then throw `Provide a prompt, a prompt file, piped stdin, or use --resume-last.` (`codex-companion.mjs:596`), but the cat-side failure (the actual root cause) would be invisible. With `pipefail`, the pipeline's exit code reflects the leftmost failure.

### 3.4 Pattern A details (review / adversarial-review)

```bash
# Phase 2 — INVOKE
mkdir -p "${CLAUDE_PLUGIN_DATA}/tmp"
TS=$(date +%s%N)
OUT_FILE="${CLAUDE_PLUGIN_DATA}/tmp/review-${TS}.json"
ERR_FILE="${CLAUDE_PLUGIN_DATA}/tmp/review-${TS}.log"
echo "OUT_FILE=$OUT_FILE"
echo "ERR_FILE=$ERR_FILE"

# Launched via Claude's Bash tool with run_in_background=true
node "$CODEX_COMPANION" review --json --base develop \
  > "$OUT_FILE" 2> "$ERR_FILE"
# Bash returns bash_id immediately. Claude must remember bash_id AND
# the absolute OUT_FILE / ERR_FILE paths for Phase 3.
```

**Phase 3 polling specification (mandatory — do not improvise):**

| Item | Value |
|------|-------|
| Polling tool | `BashOutput` (NEVER raw `ps`, `kill`, or state JSON reads) |
| Cadence | 30 seconds between polls (60s acceptable for very long reviews) |
| Termination signal | `BashOutput` response field `status === "completed"` (NOT stdout content matching — output format may change) |
| Per-poll budget | n/a (`BashOutput` returns instantly) |
| Total budget cap | 30 minutes (review p99 ≈ 20 min in practice; 30 min leaves headroom) |
| Cap-exceeded action | Categorize as `wait-timeout` per §4 → `KillShell` the bash_id → if `$OUT_FILE` is non-empty and parses as JSON, treat as partial result; otherwise mark `recovery-impossible` |
| `$OUT_FILE` empty after exit | Companion crashed or was SIGKILLed; read `$ERR_FILE`, categorize per §4, save as `<type>-<ts>-failed.md` |
| `$OUT_FILE` non-JSON | `unexpected-format` per §4; show raw stderr verbatim, abort |

**Phase 4 — DOUBLE-CHECK** (allowed only after Phase 3 confirms `status === "completed"` and `$OUT_FILE` parses as JSON):
- Parse `$OUT_FILE` JSON, extract findings + jobId.
- Read ONLY files/lines the JSON payload cites. Never the whole file.
- If a cited path/function/line does not exist in the current source tree → classify as "False Positive (hallucination)".

**Why Bash run_in_background instead of foreground:** review/adversarial cannot use `--background` on the companion itself (`handleReviewCommand` at `codex-companion.mjs:654-695` registers `--background` and `--wait` in `booleanOptions` line 657 but **never reads `options.background` or `options.wait`** — line 681 unconditionally calls `runForegroundCommand`). Claude's Bash tool's `run_in_background=true` is the only way to keep the wrapper alive past 300s. The wrapper runs to completion, writes its rendered JSON payload to `$OUT_FILE`, and exits cleanly. BashOutput-based polling avoids the SIGKILL path that would have left the job in an irrecoverable state.

**Note on the misleading usage line:** `printUsage` at `codex-companion.mjs:78` advertises `review [--wait|--background]` even though both flags are silent no-ops. This is an upstream bug; v4.1 ignores it and routes around with Pattern A. (Filing an issue upstream is a v4.2 candidate, not in scope here.)

---

## 4. Error Categorization

Companion errors must be surfaced cleanly with no retries and no silent swallowing. All `verbatim` strings below were verified against `references/codex-plugin-cc/plugins/codex/scripts/codex-companion.mjs` at the line numbers shown.

| Pattern in stderr (verbatim where quoted) | Category | Source line | Action |
|-------------------|----------|---|--------|
| `Official Codex plugin not found` (from `resolve-companion.sh`) | setup | scripts/resolve-companion.sh | Redirect to `/codex-setup` |
| `not authenticated` / `OPENAI_API_KEY` | auth | `:253-254` | Suggest `codex login` |
| `not a git repository` | environment | `lib/git.mjs` `ensureGitRepository` | Tell user, stop |
| `unknown revision` / `bad revision` | bad-input | git rev-parse | Show current branches via `git branch --list`, then AskUserQuestion |
| `does not support custom focus text` | wrong-skill | `:273` | Should NOT fire post-v4.1: Phase 1 ANALYZE strips focus text upstream and offers adversarial redirect proactively. If it fires, it means Phase 1 was skipped — treat as a SKILL.md regression. |
| `Provide a prompt, a prompt file, piped stdin, or use --resume-last.` | prompt-empty | `:596` | Pattern B failed before consuming stdin. Common cause: `cat` failed and `set -o pipefail` was missing, OR a positional arg accidentally overrode stdin (see §3.3 footgun note). |
| `Task <id> is still running. Use /codex:status before continuing it.` | concurrency-conflict | `:316` | A previous Codex task is in flight. Show user the active jobId and stop. Do NOT silently cancel. |
| `Unsupported reasoning effort "<value>"` | bad-input | `:120-122` | codex-rescue: ANALYZE accepted an effort value that is not in `{none, minimal, low, medium, high, xhigh}`. Re-prompt. |
| `Choose either --resume/--resume-last or --fresh.` | bad-input | `:721-723` | codex-rescue: ANALYZE produced conflicting flags. Re-prompt. |
| `Missing value for --<key>` | bad-input | `lib/args.mjs:39, 63` | A flag has no value. Phase 1 should have caught this — treat as ANALYZE regression. |
| `Stored job <id> is missing its task request payload.` | recovery-impossible | `:785` | Detached task-worker started but couldn't load the stored job request. Surfaced via `result <jobId>` or the job log file, NOT via the original `task --background --json` stdout. Abort, save failure report. |
| JSON parse error on companion stdout | unexpected-format | n/a | Companion output format changed. Show raw stdout/stderr, abort, ask user to report. |
| Pattern A 30-min cap exceeded | wait-timeout | n/a (Claude-side cap, see §3.4) | `KillShell` the bash_id; if `$OUT_FILE` parses as JSON treat as partial result, otherwise `recovery-impossible`. |
| (no stderr — silently corrupted prompt) | silent-flag-corruption | `lib/args.mjs:47-49` | Caused by an unknown flag being pushed into `positionals` and joined into the task prompt by `readTaskPrompt` (`:585-592`). **NOT detectable post-hoc** — only Phase 1 ANALYZE whitelisting can prevent it. If observed (e.g., Codex echoing `--wait` back as task content), treat as a Phase 1 regression and AskUserQuestion to confirm intent. |
| (other) | unknown | n/a | Show raw stderr verbatim, do NOT retry |

**Never:**
- Silently retry
- Swallow errors
- Enter manual polling loops outside the canonical `BashOutput` (Pattern A) or `status --wait` (Pattern B) paths
- Use `ps`, `kill`, or raw state JSON reading
- Pass any token through to the companion that did not survive the Phase 1 whitelist (see "silent-flag-corruption" — there is no companion-side safety net)
- Blame the user

---

## 5. File Structure

```
plugins/codex-advisor/
├── .claude-plugin/plugin.json        # version untouched (marketplace.json owns it)
├── README.md                          # updated: explicit wrapper + analyze contract
├── references/
│   ├── companion-usage.md             # NEW — invocation / wait / blind-payload protocol
│   ├── evaluation.md                  # existing (double-check protocol, unchanged)
│   └── gpt-prompting.md               # existing (XML templates for verify/research)
├── scripts/
│   └── resolve-companion.sh           # unchanged
└── skills/
    ├── codex-review/SKILL.md          # rewrite — 5 phases, Pattern A
    ├── codex-adversarial/SKILL.md     # rewrite — 5 phases, Pattern A, focus-text support
    ├── codex-rescue/SKILL.md          # rewrite — 5 phases, Pattern B
    ├── codex-verify/SKILL.md          # rewrite — 5 phases, Pattern B + blind payload
    ├── codex-research/SKILL.md        # rewrite — 5 phases, Pattern B + blind payload
    └── codex-setup/SKILL.md           # UNTOUCHED
```

### 5.1 `references/companion-usage.md` (new) — contents outline

```markdown
# Companion Invocation Protocol

Shared reference for all codex-advisor skills. Read on demand when launching
the official Codex plugin's companion script, when the inline ANALYZE rules
in a SKILL.md don't cover an edge case, or when an error needs categorization.

## 1. Resolve the companion
CODEX_COMPANION=$("${CLAUDE_PLUGIN_ROOT}/scripts/resolve-companion.sh")
(One paragraph: resolve-companion.sh greps the user's plugin install for the
 official Codex plugin's codex-companion.mjs path and prints it. Exits 1 if
 the official plugin is not installed — that's the "setup" error category.)

## 2. Verified flag whitelists per subcommand
(tables for review / adversarial-review / task / status / result,
 each row marked "documented" or "undocumented but parser-supported")

### 2a. normalizeArgv quirk
`normalizeArgv` (codex-companion.mjs:127-136) re-tokenizes the input via
`splitRawArgumentString` ONLY when `argv.length === 1`. This means an old
broken pattern like `node companion task "$ARGUMENTS"` (single arg containing
spaces) goes through a hidden re-split path that LOOKS like it works but is
fragile. v4.1 always invokes with multi-arg form (e.g.,
`task --background --json`) so this branch never fires. Never pass
$ARGUMENTS as a single quoted blob.

## 3. The truth about --wait
- `status --wait <jobId>` — REAL. Polls and blocks until done or timeout.
  `booleanOptions` includes `wait` (`:815`); handler honors it (`:821-826`)
  with `DEFAULT_STATUS_WAIT_TIMEOUT_MS = 240000` (`:67`).
- `review --wait`, `adversarial-review --wait` — `booleanOptions` includes
  `wait` AND `background` (`:657`), so the parser accepts both. But
  `handleReviewCommand` (`:654-695`) NEVER reads `options.wait` or
  `options.background` — line 681 unconditionally calls `runForegroundCommand`.
  Both flags are silent no-ops. Always foreground.
- `task --wait` — `wait` is NOT in `task`'s `booleanOptions` (`:707`). The
  companion does NOT raise an unknown-flag error. `parseArgs`
  (`lib/args.mjs:47-49`) silently pushes `--wait` into `positionals`, then
  `readTaskPrompt` (`:585-592`) does `positionals.join(" ")` and uses that
  as the task prompt. Result: Codex receives the literal string `"--wait"`
  as its task — silent prompt corruption, no stderr, no exit code. The same
  silent-corruption path applies to ANY unknown flag passed to ANY companion
  subcommand. There is no companion-side safety net.

The only universal "wait" mechanism is `status --wait <jobId>`. Skills must
NEVER pass any unwhitelisted token to the companion (see §7 ANALYZE rules).

## 4. Two invocation patterns

### Pattern A: review / adversarial-review (Bash run_in_background)
(complete bash example with $OUT_FILE / $ERR_FILE / BashOutput polling)

### Pattern B: task family (companion --background + status --wait)
(complete bash example with stdin pipe + JSON jobId capture +
 status --wait loop + result fetch)

## 5. Job ID capture
- Always pass `--json` to commands whose output you intend to parse.
- Parse jobId with `python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["jobId"])' "$FILE"`
  (or equivalent). Never grep/regex the rendered text — format may change.
- Pattern A: jobId is inside the final $OUT_FILE payload, not the start.
- Pattern B: jobId is in the immediate response from `task --background --json`.

## 6. Error categorization table
(from §4 of the plan, verbatim)

## 7. ANALYZE classification rules (full)
The 5-line core lives inline in each SKILL.md. The full ruleset:

- Token matches a whitelisted flag (with or without trailing punctuation,
  with or without `=`)? → normalize and include.
- Multiple values for the same flag (e.g., `--base develop --base main`)?
  → AskUserQuestion which one is intended (never silently pick last).
- Token is natural-language meta-instruction addressed to YOU
  (e.g., "분석 먼저 하지마", "한국어로 답해", "빨리")?
  → obey for your own behavior, do NOT forward to companion.
- Token is junk (emoji, stray punctuation)? → drop.
- Token is ambiguous? → AskUserQuestion (interactive) or
  exit with a clear error message (non-interactive).
- review-skill detects focus text? → AskUserQuestion offering adversarial redirect.

Examples (illustrative — use LM judgment for unseen cases):
  --base develop                        → base=develop
  develop 브랜치 대비로                 → base=develop
  --base=develop, 분석 먼저 하지마      → base=develop (meta-instruction obeyed)
  HEAD~3부터                            → base=HEAD~3
  --base develop --base main            → AskUserQuestion (which base?)
  😤 빨리                               → no flags (auto-detect)

## 8. Blind payload pattern (verify/research only)
(heredoc header → test + cat >> → close tag → stdin pipe to task --background)
(includes cleanup of temp files)

## 9. AskUserQuestion fallback for non-interactive runs
There is no env var that reliably tells Claude whether AskUserQuestion is
available — `CLAUDECODE` is always set inside Claude Code. The pragmatic
pattern is "try and fall back":

1. Always attempt AskUserQuestion first when ANALYZE detects ambiguity.
2. If the tool errors or times out (headless `claude -p` runs), fall back to:
     printf 'AMBIGUOUS: %s\nProvide unambiguous input or run interactively.\n' \
       "$REASON" >&2
     exit 1
3. Never silently guess. Never pass an ambiguous token through to the
   companion (see §3 silent-corruption note).

## 10. Shared gotchas
- Bash 300s timeout ≠ job failure when Pattern B is used (status --wait
  blocks ≤240s per call, well under the limit).
- For Pattern A, only `run_in_background=true` survives long reviews.
- Natural language in $ARGUMENTS is for YOU, not companion.
- Unknown flags don't error — they silently become part of the task prompt.
  ANALYZE whitelist is the only line of defense.
- When using Pattern B's stdin pipe to `task`, NEVER pass a positional arg.
  `readTaskPrompt` (`:585-592`) does `positionalPrompt || readStdinIfPiped()`,
  so any positional silently overrides stdin and the entire blind payload
  is dropped. Always: `cat "$PROMPT_FILE" | node "$CODEX_COMPANION" task --background --json` (no positional).
- Always set `set -o pipefail` before piping into the companion. Without
  it, `cat $missing_file | node ...` silently sends 0 bytes and the
  companion's "Provide a prompt..." error masks the cat-side failure.
- Temp file paths: `$$` (shell PID) does NOT survive across Claude's
  separate Bash invocations. Use timestamps and have Claude remember the
  absolute path from Phase 1 stdout. See §3.3.
- Never poll manually outside BashOutput (Pattern A) or status --wait (Pattern B).
- Never swallow errors. Never retry silently.
```

### 5.2 SKILL.md common skeleton

```markdown
---
name: codex-<name>
description: "<existing description, unchanged>"
argument-hint: "<cleaned hint — no FOCUS_TEXT on codex-review>"
allowed-tools: ["Bash", "BashOutput", "Read", "Grep", "Glob", "AskUserQuestion"]
---

# codex-<name>

<one-line purpose>

## Execution Contract

**This contract overrides default exploration habits. It is the first thing you read.**

| Phase | Allowed | Forbidden |
|-------|---------|-----------|
| 1 ANALYZE | `test -f/-s/-d`, `git rev-parse --verify`, `git branch --list`, `wc -l/-c`, `file`, `echo`, `printf` | `cat`, `head`, `tail`, `git diff`, `git log -p`, `git show`, `git blame`, Read, Grep, Glob |
| 2 INVOKE | Bash for companion launch (multi-arg form only — never `$ARGUMENTS` blob) | All source reads |
| 3 WAIT | BashOutput (Pattern A) / `status --wait` (Pattern B) | All source reads, manual polling, `ps`/`kill` |
| 4 DOUBLE-CHECK | Read ONLY files/lines Codex cited | Reading whole files "for context"; reading uncited files; inventing citations |
| 5 REPORT + SAVE | Write report file | n/a |

The companion collects diffs and context itself. Your value-add is the
double-check, not pre-analysis. Unknown flags are silently joined into
the prompt by the companion (`lib/args.mjs:47-49` + `:585-592`) — there is
NO post-hoc detection. Phase 1 whitelist is the only safety net.

## Phase 1: Analyze

You are a translator. Use LM intelligence, not regex tables.
Whitelist for this skill: <flag list — see plan §3.1 for verified per-skill list>
Meta-instructions to YOU → obey, never forward to companion.
Junk, emoji, trailing punctuation → drop (`develop,` → `develop`).
Ambiguous → AskUserQuestion (interactive) or fail-fast `exit 1` (non-interactive).
ANY token not on the whitelist → fatal. The companion has no safety net.
Show ONE line "Parsed: <result>" before Phase 2.

For edge cases, read ${CLAUDE_PLUGIN_ROOT}/references/companion-usage.md §7.

## Phase 2: Invoke

<Pattern A or Pattern B bash block, see plan §3.3 / §3.4>

**Pattern B critical guard:** when piping into `task --background`, NEVER
add a positional arg. `readTaskPrompt` (`:585-592`) does
`positionalPrompt || readStdinIfPiped()` — any positional silently overrides
stdin and the entire blind payload is dropped. Always:
`cat "$PROMPT_FILE" | node "$CODEX_COMPANION" task --background --json` (no positional).
Always start the script with `set -o pipefail`.

## Phase 3: Wait

<Pattern A: BashOutput polling at 30s cadence, 30 min cap | Pattern B: status --wait loop ≤6 iterations>
On error, consult ${CLAUDE_PLUGIN_ROOT}/references/companion-usage.md §6.

## Phase 4: Double-check

Read ${CLAUDE_PLUGIN_ROOT}/references/evaluation.md.
For each Codex finding: classify Agree / Disagree / Nuance / False Positive.
- "False Positive" specifically when Codex cites a file/function/line that
  does not exist in the current source tree.
- Read ONLY the file:line Codex cited. Never the whole file.

## Phase 5: Report + save

Save success to ${CLAUDE_PLUGIN_DATA}/reviews/<type>-<YYYYMMDD-HHMMSS>.md.
Save failure to ${CLAUDE_PLUGIN_DATA}/reviews/<type>-<YYYYMMDD-HHMMSS>-failed.md
with the captured stderr and the §4 error category.

## Gotchas
- <skill-specific gotcha 1-2 only — shared gotchas live in companion-usage.md §10>
```

---

## 6. Behavioral Changes Summary

| Area | Before (v4.0.1) | After (v4.1.0) |
|------|-----------------|----------------|
| `$ARGUMENTS` handling | Raw passthrough: `review --wait $ARGUMENTS` | Claude analyzes, produces clean flags. Trailing punctuation (`develop,`) stripped. Unknown tokens are FATAL, never passed through. |
| Wait mechanism | `--wait` flag (silently ignored on review; silently corrupts task prompt) | Pattern A: Bash `run_in_background` + BashOutput polling (30s cadence, 30 min cap). Pattern B: companion `--background` + repeated `status --wait <jobId> --timeout-ms 240000` (≤6 iterations = 24 min). |
| Bash 300s timeout | Killed long reviews; lost job | Pattern A bypasses entirely via `run_in_background=true`; Pattern B caps each wait at 240s, loops with explicit budget |
| Silent flag corruption | Unknown flags silently joined into prompt (no error) | Phase 1 ANALYZE whitelist is FATAL — any unknown token aborts the call |
| Pre-analysis | Implicit "don't do it" via phase order | Explicit Execution Contract table at top of every SKILL.md + Phase 1 allow/deny command lists in §3 |
| verify/research payload | `Read` tool loads document into Claude context | Blind `cat >> file` + stdin pipe; content never enters context |
| Stdin pipe positional footgun | n/a | Documented in §5.1 §10: never combine stdin pipe with a positional arg |
| `--prompt-file` reliance | Used (undocumented companion flag, `:706`) | Replaced with stdin pipe (officially supported `:585-592`) |
| Temp file lifecycle | n/a (current verify uses fixed path) | Timestamp-based path (`$(date +%s%N)`); Claude captures path from Phase 1 stdout and reuses verbatim. `$$` is forbidden — does not survive across Bash calls. |
| Job ID capture | Implicit ("from stdout") | Explicit: `--json` + node-based JSON parse with fail-loud on parse error; `set -o pipefail` mandatory |
| Error surface | Mixed; some errors retried implicitly; "stale running PID" was author-invented terminology | Categorized table with verbatim companion strings + source line numbers; never retry silently; new `silent-flag-corruption` and `wait-timeout` categories |
| codex-review focus text | Unclear — `argument-hint` advertised `FOCUS_TEXT` AND non-existent `--commit`/`--uncommitted` | Hint cleaned to whitelist-only; detected focus text → offer adversarial redirect |
| ANALYZE rules location | n/a (didn't exist) | Inline core in every SKILL.md (always loaded); full ruleset in `companion-usage.md §7` (lazy load) |
| Hallucinated citations | Mentioned vaguely in v4.0.1 codex-review/adversarial; lost in initial v4.1 draft | Restored as a dedicated "False Positive" classification in Phase 4 |
| Citation-less findings | Implicitly read whole files for context | New "Uncited" classification — surface to user, do not invent citations |
| Non-interactive ambiguity | AskUserQuestion only (would hang headless) | Documented try-and-fall-back pattern in §9 of companion-usage.md |
| Failure save path | Undefined | `<type>-<timestamp>-failed.md` with categorized error |

---

## 7. Implementation Tasks

- [ ] 0. **Verify companion interface against current source.** Read `references/codex-plugin-cc/plugins/codex/scripts/codex-companion.mjs` and `lib/args.mjs`, then confirm each row of §11 "Verification Notes" still matches the source. **Stop if any row drifts — rewrite the affected section of this plan before continuing.** (The initial verification was performed during the v4.1 plan revision. §11 is the contract.)
- [ ] 0a. **Confirm `plugins/codex-advisor/.claude-plugin/plugin.json` has no `version` field.** Per repo gotcha "Version priority", a `version` in plugin.json silently overrides marketplace.json for local plugins. Check with `grep version plugins/codex-advisor/.claude-plugin/plugin.json` — must return nothing.
- [ ] 1. Write `plugins/codex-advisor/references/companion-usage.md` with all 10 sections from §5.1 (including §2a normalizeArgv quirk).
- [ ] 2. Rewrite `skills/codex-review/SKILL.md`
  - Execution Contract table at top (per §5.2 skeleton)
  - Inline ANALYZE block per §3.2 with whitelist `--base`, `--scope` only (no `--commit`)
  - Pattern A invoke + Phase 3 BashOutput polling (30s cadence, 30 min cap)
  - argument-hint cleaned to `[--base BRANCH] [--scope auto|working-tree|branch]` (remove `FOCUS_TEXT`, `--commit SHA`, `--uncommitted` — none exist on the companion)
  - Focus-text-detected → AskUserQuestion offering adversarial redirect
  - Restore "Codex cites missing file/function → false positive" rule in Phase 4
- [ ] 3. Rewrite `skills/codex-adversarial/SKILL.md`
  - Same skeleton as codex-review (Pattern A)
  - argument-hint cleaned to `[--base BRANCH] [--scope auto|working-tree|branch] [focus text]`
  - Focus text handling (positional after flags)
- [ ] 4. Rewrite `skills/codex-rescue/SKILL.md`
  - Pattern B (stdin pipe + `--background --json` + status --wait + result)
  - Whitelist per §3.1: `--write`, `--model <m>`, `--effort <l>`, `--resume-last`/`--resume`/`--fresh`. Effort values must validate against `{none, minimal, low, medium, high, xhigh}` BEFORE invoking the companion (avoid `Unsupported reasoning effort` error).
  - `--write` default for code changes; omit for read-only investigation
  - Vague task → AskUserQuestion, never explore repo
- [ ] 5. Rewrite `skills/codex-verify/SKILL.md`
  - Pattern B + blind payload from §3.3 (timestamp-based PROMPT_FILE, captured via stdout)
  - **Read tool stays in `allowed-tools`** — Phase 4 needs it. Phase 1-3 forbidden by Execution Contract instruction, not by tool removal.
  - Heredoc template preserved; `--prompt-file` removed in favor of stdin pipe; `set -o pipefail` mandatory
- [ ] 6. Rewrite `skills/codex-research/SKILL.md`
  - Pattern B + blind payload from §3.3
  - Topic-only mode (no file) still works — skip the document append, just heredoc the topic
- [ ] 7. Update `plugins/codex-advisor/README.md` (user-perspective per repo's README style guide)
  - "왜 필요한가" section: 사용자가 현재 (v4.0.1) 겪는 구체적 불편 — 한국어 메타-지시 + flag 혼합 입력이 silent prompt corruption / 5분 timeout으로 깨지는 시나리오
  - Concrete before/after example: paste the §1.1 broken input on top, then "after v4.1: parses to `--base develop`, runs in background, completes in N minutes" — shows wrapper value tangibly without exposing internal Pattern A/B detail
  - Remove any stale references to FOCUS_TEXT, --commit, --uncommitted on codex-review
  - Do NOT document Pattern A vs B — that's internal architecture, belongs in companion-usage.md
- [ ] 8. Run `unset CLAUDECODE && claude plugin validate .` from `plugins/codex-advisor/`
- [ ] 9. **Manual smoke test (6 scenarios — must all pass before bumping version):**
  1. The failing input from §1.1 (`/codex-advisor:codex-review --base develop, 절대 ...`) parses cleanly. Verify ANALYZE strips the trailing comma so that `git rev-parse --verify develop` (not `develop,`) succeeds. Pattern A runs in background, completes without polling chaos.
  2. Long codex-review (>5 minutes) completes via Pattern A + BashOutput without Bash killing the wrapper. Verify the 30 min cap by inspecting the SKILL.md polling loop.
  3. `/codex-verify docs/some-plan.md` runs Pattern B with blind payload, never reads document content into Claude's context. Verify by inspecting the conversation transcript: NO `Read` / `Grep` / `Glob` tool call should reference the document path between Phase 1 and Phase 4.
  4. Long codex-verify (>5 minutes) completes via Pattern B + repeated `status --wait` calls without losing the job. Verify via the JOB_ID being reachable through `result <jobId>`.
  5. Codex output cites a non-existent file/line → Phase 4 classifies it as "False Positive (hallucination)" instead of trying to read it.
  6. **Phase 1 regression check:** invoke `/codex-rescue --foo bar implement login`. ANALYZE must reject `--foo` (not on rescue whitelist) → AskUserQuestion or `exit 1`. Do NOT silently pass through (would result in `--foo bar` being joined into the Codex task prompt).
- [ ] 10. **Only after Task 9 passes:** bump `codex-advisor` version in `.claude-plugin/marketplace.json`: `4.0.1` → `4.1.0`. Confirm bump is in `marketplace.json` only (per Task 0a, plugin.json must not have a `version` field).

---

## 8. Out of Scope

- Rewriting the official Codex plugin (reference-only)
- Patching the companion to make `review --background` actually work (would simplify Pattern A → Pattern B unification, but that's a v4.2 candidate and requires upstream coordination)
- Changing `resolve-companion.sh` (works fine)
- Changing `codex-setup` (no issues)
- Changing `references/evaluation.md` (double-check protocol is fine)
- Adding new skills or removing existing ones
- Adding eval/test infrastructure (manual smoke test only)
- Hook-based enforcement of the Execution Contract (PreToolUse hook blocking Read in Phases 1-3) — instruction-only is acceptable for v4.1; revisit in v4.2 if Claude is observed violating the contract.

---

## 9. Open Questions — Resolved

| # | Question | Resolution |
|---|----------|------------|
| 1 | `companion-usage.md` single-file vs scattered inline | **Hybrid**: 5-line ANALYZE core inline in each SKILL.md (always-loaded), full ruleset in companion-usage.md §7 (lazy-load) |
| 2 | codex-review focus text detected | AskUserQuestion offering adversarial redirect |
| 3 | Execution Contract position | **Top of each SKILL.md, before Phase 1, as a table** |
| 4 | `--wait` as default for all skills | **Rejected.** `--wait` is fictional for task and no-op for review. Use Pattern A (Bash run_in_background) for review/adversarial; Pattern B (companion `--background` + `status --wait`) for task family. |
| 5 | Version bump | `4.0.1 → 4.1.0` (minor — behavioral contract change) |
| 6 | `--prompt-file` vs stdin pipe | **stdin pipe** — `--prompt-file` is undocumented; stdin is officially supported |
| 7 | Read tool removal from verify/research | **Read stays.** Phase 4 needs it. Forbidden in Phase 1-3 by instruction, not by tool removal. |

---

## 10. Success Criteria

The rewrite is done when:

1. The failing input from §1.1 (`/codex-advisor:codex-review --base develop, 절대 ...`) parses cleanly into `--base develop`, runs Pattern A in background, and completes without manual polling. (Smoke test #1)
2. A codex-review whose underlying Codex run takes >5 minutes completes successfully via Pattern A + BashOutput, without the Bash 300s timeout killing the wrapper. (Smoke test #2)
3. No skill reads source code before Phase 4 — verifiable by reviewing the SKILL.md Execution Contract tables and confirming no Phase 1-3 step calls Read/Grep/Glob/`git diff`/`git log` on source.
4. verify/research never load document content into Claude's context — verifiable by smoke test #3.
5. A codex-verify whose underlying Codex run takes >5 minutes completes via Pattern B + repeated `status --wait` calls. (Smoke test #4)
6. Codex's hallucinated citations are classified as "False Positive" in Phase 4 instead of triggering a read attempt. (Smoke test #5)
7. `unset CLAUDECODE && claude plugin validate .` passes from `plugins/codex-advisor/`.
8. README reflects the wrapper + analyze + double-check contract from a user perspective, including a concrete before/after example using the §1.1 broken input. Pattern A/B internals stay out of the README (they live in `companion-usage.md`).
9. Companion interface verification (§11) re-confirmed by Task 0; any drift triggers plan revision before implementation.
10. Version bumped to 4.1.0 in `marketplace.json` **only after smoke tests pass**.

---

## 11. Verification Notes

These claims about the official Codex companion (`references/codex-plugin-cc/plugins/codex/scripts/codex-companion.mjs`, 1007 lines, plus `lib/args.mjs` and `lib/fs.mjs`) were verified during the v4.1 plan revision on 2026-04-06. Task 0 must re-verify each row before implementation. If any row drifts, **stop and revise the affected plan section** — the v4.1 design depends on these invariants.

| # | Invariant | Source | Status |
|---|-----------|--------|--------|
| V1 | `validateNativeReviewRequest` rejects focus text on `review` with `does not support custom focus text` | `codex-companion.mjs:270-283` | ✓ |
| V2 | `handleReviewCommand` registers `--background` and `--wait` in booleanOptions but NEVER reads them; line 681 unconditionally calls `runForegroundCommand` | `codex-companion.mjs:654-695` (parser at `:657`, ignored at `:681`) | ✓ |
| V3 | `handleTask` actually honors `--background` (calls `enqueueBackgroundTask` which spawns a detached worker) | `codex-companion.mjs:730-746` + `:613-624` | ✓ |
| V4 | `task` does NOT have `--wait` in booleanOptions; unknown long flags are pushed to `positionals` (NO error) and joined into the prompt by `readTaskPrompt` | `codex-companion.mjs:707` (no `wait`) + `lib/args.mjs:47-49` + `codex-companion.mjs:585-592` | ✓ — **silent prompt corruption, not an error** |
| V5 | `status --wait <jobId> --timeout-ms <ms>` works; `DEFAULT_STATUS_WAIT_TIMEOUT_MS = 240000` (under Bash 300s) | `codex-companion.mjs:67` + `:812-833` | ✓ |
| V6 | `--prompt-file` is in `task` valueOptions but NOT in `printUsage` | `codex-companion.mjs:706` (parser) + `:80` (usage omits) | ✓ |
| V7 | Stdin pipe is honored: `readTaskPrompt` returns `positionalPrompt \|\| readStdinIfPiped()`; `readStdinIfPiped` reads all of fd 0 if not TTY | `codex-companion.mjs:585-592` + `lib/fs.mjs:35-40` | ✓ |
| V8 | Stdin is silently overridden if a positional prompt exists (V7's `\|\|` short-circuits) | same | ✓ — footgun documented in §5.1 §10 |
| V9 | `review` valueOptions: `["base", "scope", "model", "cwd"]`. NO `--commit`, NO `--uncommitted`. | `codex-companion.mjs:656` | ✓ — argument-hint must be cleaned |
| V10 | `normalizeArgv` re-tokenizes only when `argv.length === 1` | `codex-companion.mjs:127-136` | ✓ — quirk documented in §5.1 §2a |
| V11 | `printUsage` advertises `review [--wait\|--background]` even though both are no-ops | `codex-companion.mjs:78` | ✓ — upstream usage bug; v4.2 candidate to file |
| V12 | "Stored job <id> is missing its task request payload" is raised inside `handleTaskWorker` (detached worker), surfaced via log file or `result <jobId>`, NOT from the parent `task --background --json` stdout | `codex-companion.mjs:785` | ✓ — §4 categorization updated |
| V13 | Real concurrency error: `Task <id> is still running. Use /codex:status before continuing it.` | `codex-companion.mjs:316` | ✓ — added to §4 |
| V14 | "stale running PID" is NOT a literal companion error string | grep returns 0 matches | ✓ — removed from plan §4 (was author-invented terminology) |
