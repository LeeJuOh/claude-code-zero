---
name: codex-review
description: "Run Codex code review with Claude's independent double-check. Use when asked \"codex review\", \"review my code with codex\", or wants Codex to review code changes. For adversarial review use /codex-adversarial."
argument-hint: "[--base BRANCH] [--scope auto|working-tree|branch] [--model SLUG] [--effort LEVEL]"
allowed-tools: ["Bash(${CLAUDE_PLUGIN_ROOT}/scripts/*)", "Read", "Grep", "Glob", "AskUserQuestion", "Agent"]
---

# Codex Code Review + Double-Check

You are a **translator + executor**. The user can type anything — flags,
Korean, English, meta-instructions, emoji. Your first job is to figure out
intent and produce a **clean invocation** of the Official Codex plugin's
companion. Your second job is to hand what Codex returns to a fresh Verifier
subagent and report what it decides. The judging is deliberately not yours.

## Execution Contract

**This contract overrides default exploration habits. Read it before Phase 1.**

| Phase | Allowed | Forbidden |
|-------|---------|-----------|
| 1 ANALYZE | `codex-task.sh check-ref`, `apply-codex-config.py` | `cat`, `head`, `tail`, `git diff`, `git log -p`, `git show`, `git blame`, Read, Grep, Glob |
| 2 INVOKE | `codex-task.sh review` (multi-arg form only — never `$ARGUMENTS` blob) | All source reads |
| 3 WAIT | `codex-task.sh review-wait` loop (≤8 calls, about 30 min), then `Read` `OUT_FILE` | All source reads, `run_in_background`, `ps`/`kill` |
| 4 VERIFY | `codex-task.sh payload`, then `Agent` (`codex-advisor:verifier`) per group | Reading source; judging or re-judging any finding yourself |
| 5 REPORT + SAVE | `codex-report.sh save`, `codex-report.sh clean` | Write tool for the report |

The companion collects the diff and context itself. Your value-add is a
verdict reached by someone with no stake in the code, not pre-analysis.
The companion's parser turns an unknown flag into
focus text (`parseArgs` in `lib/args.mjs`), and the built-in review rejects
focus text, so the run fails. Phase 1 whitelist catches it first.

---

## Phase 1: Analyze

You are a translator. Use LM intelligence, not regex tables.

**Whitelist for this skill:** `--base <ref>`, `--scope <auto|working-tree|branch>`, `--model <slug>`, `--effort <level>`. Nothing else.

`--model` and `--effort` go through `scripts/apply-codex-config.py`, which updates `~/.codex/config.toml` before the companion launches — see the Apply block below. Never put `--effort` on the review command: review has no such flag, so the companion would mix it into the prompt. Why, and when `--model` does go on the command: `references/companion-usage.md` §2.

Rules:

- **Meta-instructions addressed to YOU** (e.g. "don't analyze first", "in Korean", "quickly", "thoroughly" — often typed in the user's own language) → obey for your own behavior, never forward to the companion.
- **Junk, emoji, trailing punctuation** → drop. Strip trailing `,` `.` `)` from flag values (e.g., `--base develop,` → `base=develop`).
- **Focus text detected** (any natural-language string not addressed to you and not a whitelisted flag) → use `AskUserQuestion` to offer the adversarial redirect: "This looks like focus text — use `/codex-adversarial <focus>` instead? The built-in review rejects focus text." Do NOT pass focus text to the companion.
- **Unknown flag** (e.g., `--commit`, `--uncommitted`, `--wait`, `--foo`) → `AskUserQuestion` to clarify. Common corrections:
  - `--uncommitted` → did you mean `--scope working-tree`?
  - `--commit <sha>` → did you mean `--base <sha>~1 --scope branch`?
  - `--wait` / `--background` → these are silent no-ops on review; drop.
  - Never pass through. The companion has no safety net.
- **Duplicate flag** (e.g., `--base develop --base main`) → `AskUserQuestion` which one is intended. Never silently pick last.
- **Ambiguous** → `AskUserQuestion`; if it is unavailable (non-interactive), reply with one `AMBIGUOUS:` line and run nothing (`references/companion-usage.md §9`).

**Input validation** (allowed in Phase 1 — these never load source contents):

```bash
# Verify the base ref exists, if provided.
# Replace <literal clean base> with the value you parsed — or skip this
# call entirely if the user gave no --base.
"${CLAUDE_PLUGIN_ROOT}/scripts/codex-task.sh" check-ref "<literal clean base>"
```

### Apply model/effort (if either flag was provided)

Run this *before* Phase 2 so the companion sees the new `config.toml`:

```bash
# Empty string for either arg = no change. Values are written as given.
"${CLAUDE_PLUGIN_ROOT}/scripts/apply-codex-config.py" \
  "<literal clean model from Phase 1 or empty>" \
  "<literal clean effort from Phase 1 or empty>" \
  --run-flags model
```

The script's first stdout line is `Model: <before> -> <after> | Effort: <before> -> <after>`. Relay its stdout verbatim. If it exits non-zero, relay its stderr and stop — launching Codex anyway would run it on settings the user didn't ask for. A `Run flags:` line means the project's own `.codex/config.toml` sets that value and outranks `config.toml`; add those flags, exactly as printed, to the `review` command in Phase 2. A `Note:` line names a project value no flag can override — there is no effort flag for reviews — so say the requested value won't apply in this project. **config.toml is global**: the change affects every Codex invocation (Official plugin, direct CLI, every codex-advisor skill) until the user changes it again. Say so when anything changed.

If the user passed *neither* flag, still call the script with two empty strings so the user sees the current values in the same format.

**Before Phase 2, also print the Parsed line:**

```
Parsed: base=develop, scope=auto   (meta: "don't analyze first" obeyed)
```

Order: apply-codex-config.py output first, Parsed line second.

For edge cases (flag conflicts, unusual phrasings, classification
details), read `${CLAUDE_PLUGIN_ROOT}/references/companion-usage.md §7`.

---

## Phase 2: Invoke (Pattern A — detached review)

Review's companion-side `--background` / `--wait` are silent no-ops
(`handleReviewCommand` always calls `runForegroundCommand`), so the script
detaches the companion itself and returns at once.

```bash
# Replace <literal ...> with values from Phase 1. Omit the entire --base or
# --scope line if the user provided nothing (companion auto-detects).
"${CLAUDE_PLUGIN_ROOT}/scripts/codex-task.sh" review "${CLAUDE_PLUGIN_DATA}" review \
  <flags from the "Run flags:" line, if the apply step printed one> \
  --base "<literal clean base from Phase 1>" \
  --scope "<literal clean scope from Phase 1>"
```

The script refuses any flag outside that list and prints `RUN_DIR=`,
`OUT_FILE=` and `ERR_FILE=`. Re-inject the literal paths in every later
Bash call — shell variables do not survive across calls.

---

## Phase 3: Wait

Call with the Bash tool's `timeout` set to 300000: each call blocks up to 4
minutes, and the default Bash timeout is 2. Keep calling in the foreground, in
this turn — a background command that finishes starts a new turn, and the
`allowed-tools` grant does not carry over to it. A call the Bash tool cuts off
does not stop the review — call again, and count it toward the cap. **Cap at 8
calls** (about 30 minutes).

```bash
"${CLAUDE_PLUGIN_ROOT}/scripts/codex-task.sh" review-wait "<literal RUN_DIR path>"
```

- `STATUS=running` → call again.
- `STATUS=done` → act on the `OUTPUT=` line:

| `OUTPUT=` | Action |
|-----------|--------|
| `json` | `Read` `OUT_FILE`, then Phase 4 |
| `empty` | Read `ERR_FILE`, categorize per §6 of companion-usage.md, save `review-<ts>-failed.md`, stop |
| `non-json` | `unexpected-format` — show `ERR_FILE` verbatim, abort |

- 8 calls exhausted → `wait-timeout` (§6). Do NOT cancel; leave the review
  running and its `RUN_DIR` in place (skip the Phase 5 clean). Point the user
  at `/codex-status` to follow it and `/codex-cancel` to stop it.

The full error categorization table is in
`${CLAUDE_PLUGIN_ROOT}/references/companion-usage.md §6`.

---

## Phase 4: Verify

You do not judge Codex's findings — a fresh subagent does. You have been in this
conversation since before the review started, and an author grading a review of
their own code is not a review (ADR 0012). Your job in this phase is plumbing:
run the script, launch the Verifiers, collect what comes back.

### Step 1 — Prepare the payloads

```bash
"${CLAUDE_PLUGIN_ROOT}/scripts/codex-task.sh" payload "${CLAUDE_PLUGIN_DATA}" \
  --skill review --input "<literal OUT_FILE path>" --ref auto
```

`--ref auto` turns on the worktree-drift check only for a branch review: that
review judged committed code, so its citations should still match HEAD. The
wrapper adds the repo root and a fresh payload folder, prints `WORK=<path>`,
and exits with `prepare-verifier.py`'s code.

The script cuts the output into findings, checks that every cited `file:line`
exists, and writes one payload file per group. Its stdout JSON is your view of the
findings — you do not re-derive that list by hand, because a list you extracted
yourself is a list you have already formed an opinion about.

| Exit | Meaning | What you do |
|---|---|---|
| 0 | payloads written | Step 2 |
| 3 | `parse_error` — Codex's output format changed | Go to Phase 5 and report `Codex output format changed — no verdicts`. No Verifier, no hand-extracted findings. |
| 4 | `no_output` — Codex returned nothing to judge | Go to Phase 5 and report `Codex returned no output — no verdicts`. |
| 2 | bad usage, unreadable input, or git failure | Show stderr verbatim and stop. |

Exit 0 with an empty `groups` list means Codex raised nothing. Report zero findings
plus Codex's own summary, and launch no Verifier.

### Step 2 — Launch one Verifier per group

For each entry in the script's `groups`, make one `Agent` call:

- `subagent_type: codex-advisor:verifier`, which starts a fresh subagent. Not
  `fork` — a fork inherits this entire conversation, which is exactly the memory
  the double-check exists to remove.
- `prompt`: the group's `payload` path and nothing else. A PreToolUse hook replaces
  the prompt with that file's hash-checked contents, so any sentence you write
  around the path is discarded before the Verifier sees it. There is no hint to
  pass and no room to pass one.

Launch at most **10 at a time** and start the next batch once those return. The
session cap is 20 concurrent subagents; the headroom keeps a large review from
hitting it.

When an `Agent` call fails, that group's findings are `Unverified — Verifier call
failed`. Do not judge them in its place and do not retry on your own. If the user
asks for a retry, make a new `Agent` call with the same payload path — a Verifier,
running or finished, is never resumed with a follow-up message.

### Step 3 — Collect the verdicts

Each Verifier returns one JSON object, `{"verdicts": [...]}`.

Read `${CLAUDE_PLUGIN_ROOT}/references/evaluation.md` and follow its *Reporting*
section: match verdicts to ids, transcribe the script's own labels (`missing` →
False Positive, `uncited` → Uncited, drift `unverifiable` → Unverifiable), and
count. A non-empty `worktree_drift` gets the drift line the template shows.

A verdict you disagree with stays exactly as the Verifier wrote it; your
disagreement goes beneath it on one `Author note (main session):` line. Rewriting
the verdict would make you the judge again.

---

## Phase 5: Report + save

**Success** (Codex returned a result):
save with `codex-report.sh save … review` using the
standard format in `references/evaluation.md` — Codex's output verbatim, the
verdicts by classification, then the summary counts.

**Failure** (Codex never produced a result, or Phase 3 hit a failure state):
save with `codex-report.sh save … review --failed`
with the §6 error category, the captured stderr, and any partial payload.

Clean up the companion's temp files — the `RUN_DIR` folder from Phase 2, as a
literal path:

```bash
"${CLAUDE_PLUGIN_ROOT}/scripts/codex-report.sh" clean "${CLAUDE_PLUGIN_DATA}" "<literal RUN_DIR path>"
```

Leave `WORK` where it is. A re-verification the user asks for needs those payload
files and their manifest, and the hook refuses a payload it cannot hash-check.

---

## Gotchas

- **Focus text on `codex-review` is fatal at the companion** (`validateNativeReviewRequest`).
  Offer the adversarial redirect in Phase 1 instead of forwarding.
- **Review always runs in the foreground on the companion side** — the
  companion's `--background` / `--wait` are silent no-ops. `codex-task.sh
  review` detaches it; `review-wait` is how this turn outlasts it.

For the full shared gotchas list, read
`${CLAUDE_PLUGIN_ROOT}/references/companion-usage.md §10`.
