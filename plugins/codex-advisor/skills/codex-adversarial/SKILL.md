---
name: codex-adversarial
description: "Run Codex adversarial review — actively tries to break confidence in the change. Use when asked \"adversarial review\", \"red-team this change\", or wants thorough security/correctness challenge."
argument-hint: "[--base BRANCH] [--scope auto|working-tree|branch] [--model SLUG] [--effort LEVEL] [focus text]"
allowed-tools: ["Bash(${CLAUDE_PLUGIN_ROOT}/scripts/*)", "Read", "Grep", "Glob", "AskUserQuestion", "Agent"]
---

# Codex Adversarial Review + Double-Check

You are a **translator + executor**. Adversarial review defaults to
skepticism — it looks for reasons NOT to ship. Your first job is a clean
invocation; your second is to hand what comes back to a fresh Verifier subagent
and report what it decides. The judging is deliberately not yours.

## Execution Contract

**This contract overrides default exploration habits. Read it before Phase 1.**

| Phase | Allowed | Forbidden |
|-------|---------|-----------|
| 1 ANALYZE | `codex-task.sh check-ref`, `apply-codex-config.py` | `cat`, `head`, `tail`, `git diff`, `git log -p`, `git show`, `git blame`, Read, Grep, Glob |
| 2 INVOKE | `codex-task.sh review` (multi-arg form only — never `$ARGUMENTS` blob) | All source reads |
| 3 WAIT | `codex-task.sh review-wait` loop (≤8 calls, about 30 min), then `Read` `OUT_FILE` | All source reads, `run_in_background`, `ps`/`kill` |
| 4 VERIFY | `codex-task.sh payload`, then `Agent` (`codex-advisor:verifier`) per group | Reading source; judging or re-judging any finding yourself |
| 5 REPORT + SAVE | `codex-report.sh save`, `codex-report.sh clean` | Write tool for the report |

The companion collects the diff itself. Unknown flags are silently
joined into the focus text, and so into the prompt (`parseArgs` in
`lib/args.mjs`). Phase 1 whitelist is the only safety net.

---

## Phase 1: Analyze

You are a translator. Use LM intelligence, not regex tables.

**Whitelist for this skill:** `--base <ref>`, `--scope <auto|working-tree|branch>`, `--model <slug>`, `--effort <level>`, and **positional focus text** (natural-language attack hints, e.g., "check for SQL injection in login handler").

`--model` and `--effort` go through `scripts/apply-codex-config.py`, which updates `~/.codex/config.toml` before the companion launches — see the Apply block below. Never put `--effort` on the review command: review has no such flag, so the companion would mix it into the prompt. Why, and when `--model` does go on the command: `references/companion-usage.md` §2.

Rules:

- **Meta-instructions addressed to YOU** (e.g. "in Korean", "quickly", "thoroughly" — often typed in the user's own language) → obey for your own behavior, never forward.
- **Junk, emoji, trailing punctuation on flag values** → drop (`--base develop,` → `base=develop`).
- **Focus text** — unlike `/codex-review`, adversarial DOES accept it. Collect all non-flag, non-meta tokens and join with spaces. This becomes the positional prompt passed after the flags. Never embed meta-instructions in the focus text.
- **Unknown flag** (e.g., `--commit`, `--uncommitted`, `--wait`, `--foo`) → `AskUserQuestion` to clarify. Common corrections:
  - `--uncommitted` → did you mean `--scope working-tree`?
  - `--commit <sha>` → did you mean `--base <sha>~1 --scope branch`?
  - `--wait` / `--background` → silent no-ops on adversarial; drop.
  - Never pass through.
- **Duplicate flag** → `AskUserQuestion` which one.
- **Ambiguous** → `AskUserQuestion`; if it is unavailable (non-interactive), reply with one `AMBIGUOUS:` line and run nothing (`references/companion-usage.md §9`).

### Hypothesis exclusion

Codex is the second opinion here, and a reviewer handed a cause confirms that
cause instead of finding its own — anchoring. So the focus text carries **where
to look and what was observed**, and your cause theory stays behind. Sort what
you were given into three kinds:

| Kind | Example | Forwarded |
|---|---|---|
| **Evidence** — symptom, repro step, log line, the request in the user's own words | "POST /login with an empty password returns 500" | yes |
| **Focus** — an area to examine, no claim attached | "look at the login handler", "the null handling around session setup" | yes |
| **Hypothesis** — a claim about cause, a suspected `file:line`, the answer you expect | "auth.ts:42 is missing a null check, that's the bypass", "it's probably the session cache race" | no |

The boundary in one line: **a claim about cause makes it a hypothesis; a bare
area makes it focus.** "Check the null handling in the login handler" points at
code and claims nothing — focus. "The login handler's missing null check lets
auth through" hands over the finding — hypothesis.

Apply this the same way whatever the words' origin — whether the user typed the
slash command or you read their intent and invoked this skill yourself. Your own
invocations are where hypotheses leak hardest, and a test for "who typed this"
would make one sentence behave two ways.

Keep the excluded text. Phase 1.5 shows it, and the user can send it after all
in one step.

**Input validation** (allowed in Phase 1):

```bash
# Replace <literal clean base> with the value from Phase 1 — or skip
# call entirely if the user gave no --base.
"${CLAUDE_PLUGIN_ROOT}/scripts/codex-task.sh" check-ref "<literal clean base>"
```

### Apply model/effort (if either flag was provided)

Run before Phase 2 so the companion sees the new `config.toml`:

```bash
"${CLAUDE_PLUGIN_ROOT}/scripts/apply-codex-config.py" \
  "<literal clean model from Phase 1 or empty>" \
  "<literal clean effort from Phase 1 or empty>" \
  --run-flags model
```

Relay its stdout verbatim. If it exits non-zero, relay its stderr and stop — launching Codex anyway would run it on settings the user didn't ask for. A `Run flags:` line means the project's own `.codex/config.toml` sets that value and outranks `config.toml`; add those flags, exactly as printed, to the `adversarial-review` command in Phase 2 (and to the command shown in the draft). A `Note:` line names a project value no flag can override — there is no effort flag for reviews — so say the requested value won't apply in this project. **config.toml is global** — the change affects every Codex invocation until changed again. Flag that to the user when values changed.

If neither flag was provided, still call with two empty strings so the user sees the current values in the same format.

**Before Phase 2, also print the Parsed line:**

```
Parsed: base=develop, scope=auto, focus="check SQL injection in login"   (meta: "quickly" obeyed)
```

Order: apply-codex-config.py output first, Parsed line second.

For edge cases, read `${CLAUDE_PLUGIN_ROOT}/references/companion-usage.md §7`.

---

## Phase 1.5: Draft Review

Before launching the adversarial review, show the user the exact
command that will be executed. Adversarial uses Pattern A (positional
args to companion), so the command itself IS the prompt.

### Display the draft

Show the full companion command in a fenced code block:

````
**Adversarial review command to execute:**

```bash
"${CLAUDE_PLUGIN_ROOT}/scripts/codex-task.sh" review "${CLAUDE_PLUGIN_DATA}" adversarial-review \
  --base develop \
  --scope auto \
  --focus "check SQL injection in login handler"
```
````

Each flag/arg line must match what Phase 2 will actually execute.
Omit lines for flags the user did not provide. If focus text was
transformed from the user's original input, show both:

```
Original: "pls look at the login handler for sql injection stuff"
→ focus: "check SQL injection in login handler"
```

Then always print what the hypothesis rule held back, so the user sees the
rule's decision rather than having to infer it from what survived:

```
Excluded (hypothesis): "probably the null check at auth.ts:42"
```

Write `(none)` when nothing was excluded — an absent line reads as "the rule
didn't run".

### Ask for approval

Use `AskUserQuestion` exactly once:

- Question: "This command will run the adversarial review."
- Options:
  1. "Approve — execute as shown"
  2. "Send the excluded lines too" — offer this only when something was excluded
  3. "Needs changes"
  4. "Cancel"

### Handle the response

- **Approve** → proceed to Phase 2 with the displayed parameters.
- **Send the excluded lines too** → append the excluded text to the focus
  text, then re-display and re-ask. The user asked for it, so it travels —
  but they see the command it produced before it runs.
- **Needs changes** → the user will describe what to change (e.g.,
  change base branch, adjust scope, reword focus text). Apply edits,
  re-display, re-ask. No loop limit.
- **Cancel** → stop execution. Do not proceed to Phase 2.

---

## Phase 2: Invoke (Pattern A — detached review)

Adversarial shares `handleReviewCommand` with `review`, so
`--background` / `--wait` are silent no-ops. The script detaches the
companion itself and returns at once.

```bash
# Replace <literal ...> with values from Phase 1. Omit the entire line
# for values the user did not provide, including --focus when there is no
# focus text.
"${CLAUDE_PLUGIN_ROOT}/scripts/codex-task.sh" review "${CLAUDE_PLUGIN_DATA}" adversarial-review \
  <flags from the "Run flags:" line, if the apply step printed one> \
  --base "<literal clean base from Phase 1>" \
  --scope "<literal clean scope from Phase 1>" \
  --focus "<literal clean focus text from Phase 1>"
```

The script refuses any flag outside that list and passes the focus text to the
companion as the positional prompt, after the flags. It prints `RUN_DIR=`,
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
| `empty` | Read `ERR_FILE`, categorize per §6, save `adversarial-<ts>-failed.md`, stop |
| `non-json` | `unexpected-format` — show `ERR_FILE` verbatim, abort |

- 8 calls exhausted → `wait-timeout` (§6). Do NOT cancel; leave the review
  running and its `RUN_DIR` in place (skip the Phase 5 clean). Point the user
  at `/codex-status` to follow it and `/codex-cancel` to stop it.

Full error table: `${CLAUDE_PLUGIN_ROOT}/references/companion-usage.md §6`.

---

## Phase 4: Verify

You do not judge Codex's findings — a fresh subagent does. You have been in this
conversation since before the review started, and an author grading a review of
their own code is not a review (ADR 0012). Your job in this phase is plumbing:
run the script, launch the Verifiers, collect what comes back. Adversarial's
higher false-positive rate is handled where it belongs — the script checks every
citation against the tree, and the Verifier weighs the attack scenario.

### Step 1 — Prepare the payloads

```bash
"${CLAUDE_PLUGIN_ROOT}/scripts/codex-task.sh" payload "${CLAUDE_PLUGIN_DATA}" \
  --skill adversarial --input "<literal OUT_FILE path>" --ref auto
```

`--ref auto` turns on the worktree-drift check only for a branch review: that
review judged committed code, so its citations should still match HEAD. The
wrapper adds the repo root and a fresh payload folder, prints `WORK=<path>`,
and exits with `prepare-verifier.py`'s code.

The script reads `result.findings`, checks that every cited `file:line` exists, and
writes one payload file per group. Its stdout JSON is your view of the findings —
you do not re-derive that list by hand, because a list you extracted yourself is a
list you have already formed an opinion about.

| Exit | Meaning | What you do |
|---|---|---|
| 0 | payloads written | Step 2 |
| 3 | `parse_error` — Codex's structured output no longer parses | Go to Phase 5 and report `Codex output format changed — no verdicts`. No Verifier, no hand-extracted findings. |
| 4 | `no_output` — Codex returned nothing to judge | Go to Phase 5 and report `Codex returned no output — no verdicts`. |
| 2 | bad usage, unreadable input, or git failure | Show stderr verbatim and stop. |

Exit 0 with an empty `groups` list means Codex raised nothing. Report zero findings
plus Codex's own `overall_explanation`, and launch no Verifier.

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

**Success:** save with `codex-report.sh save … adversarial` using the
standard format in `references/evaluation.md` — Codex's output verbatim, the
verdicts by classification, then the summary counts. The counts are the risk
picture: a high False Positive line is what separates noise from the real
concerns, so leave it visible rather than summarizing it away.

**Failure:** save with `codex-report.sh save … adversarial --failed`
with error category and captured stderr.

Clean up the companion's temp files — the `RUN_DIR` folder from Phase 2, as a
literal path:

```bash
"${CLAUDE_PLUGIN_ROOT}/scripts/codex-report.sh" clean "${CLAUDE_PLUGIN_DATA}" "<literal RUN_DIR path>"
```

Leave `WORK` where it is. A re-verification the user asks for needs those payload
files and their manifest, and the hook refuses a payload it cannot hash-check.

---

## Gotchas

- **Adversarial hallucinates more.** False Positive is the most common label on
  the noisiest findings, and the script reaches it before any Verifier runs by
  checking the citation against the tree. A high False Positive count in the
  report is the expected shape here, not a broken run.
- **Focus text IS allowed here** (unlike `/codex-review`). Pass it as
  `--focus`; the script puts it after the flags as the positional argument.
- **`--commit`, `--uncommitted` do not exist** — translate via ANALYZE,
  never pass through.
- **Companion-side `--background` / `--wait` are silent no-ops.** Same
  handler as review. Use Pattern A (`review` + `review-wait`).

For the full shared gotchas list, read
`${CLAUDE_PLUGIN_ROOT}/references/companion-usage.md §10`.
