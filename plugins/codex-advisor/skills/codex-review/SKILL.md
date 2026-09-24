---
name: codex-review
description: "Run Codex code review with Claude's independent double-check. Use when asked \"codex review\", \"review my code with codex\", or wants Codex to review code changes. For adversarial review use /codex-adversarial."
argument-hint: "[--base BRANCH] [--scope auto|working-tree|branch] [--model SLUG] [--effort LEVEL]"
allowed-tools: ["Bash", "Read", "Grep", "Glob", "AskUserQuestion", "Agent"]
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
| 1 ANALYZE | `test -f/-s/-d`, `git rev-parse --verify`, `git branch --list`, `wc -l/-c`, `file`, `echo`, `printf` | `cat`, `head`, `tail`, `git diff`, `git log -p`, `git show`, `git blame`, Read, Grep, Glob |
| 2 INVOKE | Bash for companion launch (multi-arg form only — never `$ARGUMENTS` blob) | All source reads |
| 3 WAIT | `Read` the output file once the background command reports completion | All source reads, manual polling, `ps`/`kill` |
| 4 VERIFY | `prepare-verifier.py`, then `Agent` (`codex-advisor:verifier`) per group | Reading source; judging or re-judging any finding yourself |
| 5 REPORT + SAVE | Write report file | n/a |

The companion collects the diff and context itself. Your value-add is a
verdict reached by someone with no stake in the code, not pre-analysis.
Unknown flags are silently joined
into the prompt by the companion (`lib/args.mjs:47-49` + `:643-650`) —
there is NO post-hoc detection. Phase 1 whitelist is the only safety net.

---

## Phase 1: Analyze

You are a translator. Use LM intelligence, not regex tables.

**Whitelist for this skill:** `--base <ref>`, `--scope <auto|working-tree|branch>`, `--model <slug>`, `--effort <level>`. Nothing else.

`--model` and `--effort` route through `scripts/apply-codex-config.py` to update `~/.codex/config.toml` *before* the companion launches — see the Apply block below. Two reasons:
1. **`--effort` is not a registered review flag** (`handleReviewCommand` `valueOptions = ["base", "scope", "model", "cwd"]` at `:714`). Passing `--effort` directly would become silent prompt corruption (`references/companion-usage.md §3`). Only the config.toml `model_reasoning_effort` key reaches the review path.
2. **Consistency + persistence.** `--model` IS honored as a flag in v1.0.4+ (`startThread({ model })`, `lib/codex.mjs:1010-1015`), but routing it through config.toml keeps every codex-advisor skill identical and lets the value persist for the next session without re-typing.

Rules:

- **Meta-instructions addressed to YOU** (e.g. "don't analyze first", "in Korean", "quickly", "thoroughly" — often typed in the user's own language) → obey for your own behavior, never forward to the companion.
- **Junk, emoji, trailing punctuation** → drop. Strip trailing `,` `.` `)` from flag values (e.g., `--base develop,` → `base=develop`).
- **Focus text detected** (any natural-language string not addressed to you and not a whitelisted flag) → use `AskUserQuestion` to offer the adversarial redirect: "This looks like focus text — use `/codex-adversarial <focus>` instead? The built-in review rejects focus text at `codex-companion.mjs:272-273`." Do NOT pass focus text to the companion.
- **Unknown flag** (e.g., `--commit`, `--uncommitted`, `--wait`, `--foo`) → `AskUserQuestion` to clarify. Common corrections:
  - `--uncommitted` → did you mean `--scope working-tree`?
  - `--commit <sha>` → did you mean `--base <sha>~1 --scope branch`?
  - `--wait` / `--background` → these are silent no-ops on review; drop.
  - Never pass through. The companion has no safety net.
- **Duplicate flag** (e.g., `--base develop --base main`) → `AskUserQuestion` which one is intended. Never silently pick last.
- **Ambiguous** → `AskUserQuestion` (interactive) or exit 1 with clear stderr (non-interactive, see `references/companion-usage.md §9`).

**Input validation** (allowed in Phase 1 — these never load source contents):

```bash
# Verify the base ref exists, if provided.
# Replace <literal clean base> with the value you parsed — or skip this
# block entirely if the user gave no --base.
git rev-parse --verify "<literal clean base>" >/dev/null 2>&1 \
  || { echo "Unknown revision: <literal clean base>" >&2; git branch --list | head -20 >&2; exit 1; }
```

### Apply model/effort (if either flag was provided)

Run this *before* Phase 2 so the companion sees the new `config.toml`:

```bash
# Empty string for either arg = no change. Values are written as given.
python3 "${CLAUDE_PLUGIN_ROOT}/scripts/apply-codex-config.py" \
  "<literal clean model from Phase 1 or empty>" \
  "<literal clean effort from Phase 1 or empty>"
```

The script writes one line to stdout: `Model: <before> -> <after> | Effort: <before> -> <after>`. Relay it verbatim. If it exits non-zero, relay its stderr and stop — launching Codex anyway would run it on settings the user didn't ask for. **config.toml is global**: the change affects every Codex invocation (Official plugin, direct CLI, every codex-advisor skill) until the user changes it again. Say so when anything changed.

If the user passed *neither* flag, still call the script with two empty strings so the user sees the current values in the same format.

**Before Phase 2, also print the Parsed line:**

```
Parsed: base=develop, scope=auto   (meta: "don't analyze first" obeyed)
```

Order: apply-codex-config.py output first, Parsed line second.

For edge cases (flag conflicts, unusual phrasings, classification
details), read `${CLAUDE_PLUGIN_ROOT}/references/companion-usage.md §7`.

---

## Phase 2: Invoke (Pattern A — Bash run_in_background)

Review's companion-side `--background` / `--wait` are silent no-ops
(`handleReviewCommand :709` unconditionally calls `runForegroundCommand`).
We use Claude's Bash `run_in_background=true` to survive the 300s tool
timeout.

```bash
set -o pipefail
CODEX_COMPANION=$("${CLAUDE_PLUGIN_ROOT}/scripts/resolve-companion.sh") \
  || { echo "Official Codex plugin not found — run /codex-setup" >&2; exit 1; }

mkdir -p "${CLAUDE_PLUGIN_DATA}/tmp"
TS=$(date +%s%N)
OUT_FILE="${CLAUDE_PLUGIN_DATA}/tmp/review-${TS}.json"
ERR_FILE="${CLAUDE_PLUGIN_DATA}/tmp/review-${TS}.log"
echo "OUT_FILE=$OUT_FILE"
echo "ERR_FILE=$ERR_FILE"

# Launch via Bash run_in_background=true.
# Replace <literal ...> with values from Phase 1. Omit the entire --base or
# --scope line if the user provided nothing (companion auto-detects).
node "$CODEX_COMPANION" review --json \
  --base "<literal clean base from Phase 1>" \
  --scope "<literal clean scope from Phase 1>" \
  > "$OUT_FILE" 2> "$ERR_FILE"
```

**Remember:** capture the `bash_id` returned by the background launch,
AND the literal `OUT_FILE` / `ERR_FILE` paths printed above. Re-inject
these as literal strings in every subsequent Bash call — shell variables
do not survive across calls.

---

## Phase 3: Wait

The companion runs in the background, so this turn resumes on its own when the
command exits — there is no polling loop to write and no timer to set. On the
completion notification, `Read` `$OUT_FILE`.

| What you find | Action |
|-----------|--------|
| `$OUT_FILE` parses as JSON | Proceed to Phase 4 |
| `$OUT_FILE` is empty | Read `$ERR_FILE`, categorize per §6 of companion-usage.md, save as `review-<ts>-failed.md`, stop |
| `$OUT_FILE` is non-JSON | `unexpected-format` — show raw stderr verbatim, abort |

A run that never finishes is the user's to end, with `/codex-cancel` or Esc.

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
set -o pipefail
REPO=$(git rev-parse --show-toplevel)
WORK="${CLAUDE_PLUGIN_DATA}/tmp/verify-$(date +%s%N)"
echo "WORK=$WORK"

# A branch review judged committed code, so its citations should still match HEAD
# and drift since the review is worth flagging; a working-tree review has no such
# ref. `target.mode` is the scope the companion actually resolved, which is the
# only reliable answer when the user passed --scope auto.
REF=$(node -e 'const t=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")).target;process.stdout.write(t&&t.mode==="branch"?"HEAD":"")' \
  "<literal $OUT_FILE path>")

# Spelt out rather than folded into `${REF:+...}`: zsh does not word-split an
# unquoted expansion, so that form arrives as the single argument `--ref HEAD`.
if [ -n "$REF" ]; then
  python3 "${CLAUDE_PLUGIN_ROOT}/scripts/prepare-verifier.py" \
    --skill review --input "<literal $OUT_FILE path>" --repo "$REPO" \
    --out-dir "$WORK" --ref "$REF"
else
  python3 "${CLAUDE_PLUGIN_ROOT}/scripts/prepare-verifier.py" \
    --skill review --input "<literal $OUT_FILE path>" --repo "$REPO" \
    --out-dir "$WORK"
fi
echo "prepare-verifier exit=$?"
```

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

```bash
mkdir -p "${CLAUDE_PLUGIN_DATA}/reviews"
```

**Success** (Codex returned a result):
save to `${CLAUDE_PLUGIN_DATA}/reviews/review-<YYYYMMDD-HHMMSS>.md` using the
standard format in `references/evaluation.md` — Codex's output verbatim, the
verdicts by classification, then the summary counts.

**Failure** (Codex never produced a result, or Phase 3 hit a failure state):
save to `${CLAUDE_PLUGIN_DATA}/reviews/review-<YYYYMMDD-HHMMSS>-failed.md`
with the §6 error category, the captured stderr, and any partial payload.

Clean up the companion's temp files by re-injecting the literal absolute paths
captured in Phase 2:

```bash
rm -f "<literal $OUT_FILE path>" "<literal $ERR_FILE path>"
```

Leave `$WORK` where it is. A re-verification the user asks for needs those payload
files and their manifest, and the hook refuses a payload it cannot hash-check.

Do NOT rely on `$OUT_FILE` / `$ERR_FILE` shell variables — they are
scoped to the shell that set them, which is not this shell.

---

## Gotchas

- **`--commit`, `--uncommitted` do not exist on review** — they were in
  an older argument-hint and need to be translated by ANALYZE, not
  passed through. See §3.1 of the plan.
- **Focus text on `codex-review` is fatal at the companion** (`:272-273`).
  Offer the adversarial redirect in Phase 1 instead of forwarding.
- **Review always runs in the foreground on the companion side** — the
  companion's `--background` / `--wait` are silent no-ops. Pattern A
  (Bash `run_in_background=true`) is the only way to survive long runs.

For the full shared gotchas list, read
`${CLAUDE_PLUGIN_ROOT}/references/companion-usage.md §10`.
