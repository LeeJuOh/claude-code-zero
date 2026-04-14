---
name: codex-review
description: "Run Codex code review with Claude's independent double-check. Use when the user asks \"codex review\", \"codex 리뷰\", \"코드 리뷰\", wants Codex to review code changes, diff, branch, or commit. For adversarial review use /codex-adversarial."
argument-hint: "[--base BRANCH] [--scope auto|working-tree|branch] [--model SLUG] [--effort LEVEL]"
allowed-tools: ["Bash", "BashOutput", "KillShell", "Read", "Grep", "Glob", "AskUserQuestion"]
---

# Codex Code Review + Double-Check

You are a **translator + executor + double-checker**. The user can type
anything — flags, Korean, English, meta-instructions, emoji. Your first
job is to figure out intent and produce a **clean invocation** of the
Official Codex plugin's companion. Your second job is to double-check
what Codex returns, without biasing yourself by reading the diff first.

## Execution Contract

**This contract overrides default exploration habits. Read it before Phase 1.**

| Phase | Allowed | Forbidden |
|-------|---------|-----------|
| 1 ANALYZE | `test -f/-s/-d`, `git rev-parse --verify`, `git branch --list`, `wc -l/-c`, `file`, `echo`, `printf` | `cat`, `head`, `tail`, `git diff`, `git log -p`, `git show`, `git blame`, Read, Grep, Glob |
| 2 INVOKE | Bash for companion launch (multi-arg form only — never `$ARGUMENTS` blob) | All source reads |
| 3 WAIT | `BashOutput` | All source reads, manual polling, `ps`/`kill` outside `KillShell` |
| 4 DOUBLE-CHECK | Read ONLY files/lines Codex cited | Reading whole files "for context"; reading uncited files; inventing citations |
| 5 REPORT + SAVE | Write report file | n/a |

The companion collects the diff and context itself. Your value-add is
the double-check, not pre-analysis. Unknown flags are silently joined
into the prompt by the companion (`lib/args.mjs:47-49` + `:585-592`) —
there is NO post-hoc detection. Phase 1 whitelist is the only safety net.

---

## Phase 1: Analyze

You are a translator. Use LM intelligence, not regex tables.

**Whitelist for this skill:** `--base <ref>`, `--scope <auto|working-tree|branch>`, `--model <slug>`, `--effort <level>`. Nothing else.

`--model` and `--effort` never reach the companion (the Official `/codex:review` handler silently ignores them). They route through `scripts/apply-codex-config.py` to update `~/.codex/config.toml` *before* the companion launches — see the Apply block below.

Rules:

- **Meta-instructions addressed to YOU** ("분석 먼저 하지마", "한국어로", "빨리", "thoroughly") → obey for your own behavior, never forward to the companion.
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
# Empty string for either arg = no change. Alias `spark` auto-expands.
python3 "${CLAUDE_PLUGIN_ROOT}/scripts/apply-codex-config.py" \
  "<literal clean model from Phase 1 or empty>" \
  "<literal clean effort from Phase 1 or empty>"
```

The script writes one line to stdout: `Model: <before> -> <after> | Effort: <before> -> <after>`. Relay it verbatim. Advisory stderr warnings (slug not in local cache) pass through — keep them visible. **config.toml is global**: the change affects every Codex invocation (Official plugin, direct CLI, every codex-advisor skill) until the user changes it again. Say so when anything changed.

If the user passed *neither* flag, still call the script with two empty strings so the user sees the current values in the same format.

**Before Phase 2, also print the Parsed line:**

```
Parsed: base=develop, scope=auto   (meta: "분석 먼저 하지마" obeyed)
```

Order: apply-codex-config.py output first, Parsed line second.

For edge cases (flag conflicts, unusual phrasings, classification
details), read `${CLAUDE_PLUGIN_ROOT}/references/companion-usage.md §7`.

---

## Phase 2: Invoke (Pattern A — Bash run_in_background)

Review's companion-side `--background` / `--wait` are silent no-ops
(`handleReviewCommand :681` unconditionally calls `runForegroundCommand`).
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

Poll with `BashOutput` every **30 seconds** (60s acceptable for very
long reviews). Termination signal: `BashOutput` response field
`status === "completed"`. Never match on stdout content — the payload
format can change.

| Situation | Action |
|-----------|--------|
| `status === "completed"` and `$OUT_FILE` parses as JSON | Proceed to Phase 4 |
| `status === "completed"` and `$OUT_FILE` is empty | Read `$ERR_FILE`, categorize per §6 of companion-usage.md, save as `review-<ts>-failed.md`, stop |
| `status === "completed"` and `$OUT_FILE` is non-JSON | `unexpected-format` — show raw stderr verbatim, abort |
| 30 minutes elapsed, still running | `wait-timeout` — `KillShell` the bash_id. If `$OUT_FILE` parses as JSON treat as partial result; otherwise mark `recovery-impossible` and save failure report |

Do NOT use `ps`, `kill` (except via `KillShell` on cap), manual polling
loops, or raw state JSON reads. The full error categorization table is
in `${CLAUDE_PLUGIN_ROOT}/references/companion-usage.md §6`.

---

## Phase 4: Double-check

Now — and **only now** — you may read source code.

Read `${CLAUDE_PLUGIN_ROOT}/references/evaluation.md`.

Parse `$OUT_FILE` JSON. For each finding Codex reported:

1. **Read ONLY the file:line Codex cited.** Never the whole file. Never
   adjacent files "for context".
2. **Classify:**
   - **Agree** — cited code matches the finding
   - **Disagree** — cited code contradicts the finding, with evidence
   - **Nuance** — the finding is real but needs context Codex missed
   - **False Positive (hallucination)** — Codex cited a file, function,
     or line that does **not exist** in the current source tree
   - **Uncited** — no concrete file:line citation. Surface to user as
     "verification deferred". **Do NOT invent citations** to justify
     reading files.

---

## Phase 5: Report + save

```bash
mkdir -p "${CLAUDE_PLUGIN_DATA}/reviews"
```

**Success** (Codex returned a result):
save to `${CLAUDE_PLUGIN_DATA}/reviews/review-<YYYYMMDD-HHMMSS>.md`
using the format from `references/evaluation.md`. Include the Codex
output verbatim, then Claude's per-finding classification, then an
Agreement summary.

**Failure** (Codex never produced a result, or Phase 3 hit a failure
state):
save to `${CLAUDE_PLUGIN_DATA}/reviews/review-<YYYYMMDD-HHMMSS>-failed.md`
with the §6 error category, the captured stderr, and any partial
payload.

Clean up temp files by re-injecting the literal absolute paths captured
in Phase 2:

```bash
rm -f "<literal $OUT_FILE path>" "<literal $ERR_FILE path>"
```

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
