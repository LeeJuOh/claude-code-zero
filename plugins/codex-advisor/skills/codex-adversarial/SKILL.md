---
name: codex-adversarial
description: "Run Codex adversarial review — actively tries to break confidence in the change. Use when asked \"adversarial review\", \"적대적 리뷰\", or wants thorough security/correctness challenge."
argument-hint: "[--base BRANCH] [--scope auto|working-tree|branch] [--model SLUG] [--effort LEVEL] [focus text]"
allowed-tools: ["Bash", "BashOutput", "KillShell", "Read", "Grep", "Glob", "AskUserQuestion"]
---

# Codex Adversarial Review + Double-Check

You are a **translator + executor + double-checker**. Adversarial review
defaults to skepticism — it looks for reasons NOT to ship. Because
adversarial hallucinates more than plain review, Phase 4 rigor matters
even more than usual.

## Execution Contract

**This contract overrides default exploration habits. Read it before Phase 1.**

| Phase | Allowed | Forbidden |
|-------|---------|-----------|
| 1 ANALYZE | `test -f/-s/-d`, `git rev-parse --verify`, `git branch --list`, `wc -l/-c`, `file`, `echo`, `printf` | `cat`, `head`, `tail`, `git diff`, `git log -p`, `git show`, `git blame`, Read, Grep, Glob |
| 2 INVOKE | Bash for companion launch (multi-arg form only — never `$ARGUMENTS` blob) | All source reads |
| 3 WAIT | `BashOutput` | All source reads, manual polling, `ps`/`kill` outside `KillShell` |
| 4 DOUBLE-CHECK | Read ONLY files/lines Codex cited | Reading whole files "for context"; reading uncited files; inventing citations |
| 5 REPORT + SAVE | Write report file | n/a |

The companion collects the diff itself. Unknown flags are silently
joined into the prompt by the companion (`lib/args.mjs:47-49` +
`:613-619`). Phase 1 whitelist is the only safety net.

---

## Phase 1: Analyze

You are a translator. Use LM intelligence, not regex tables.

**Whitelist for this skill:** `--base <ref>`, `--scope <auto|working-tree|branch>`, `--model <slug>`, `--effort <level>`, and **positional focus text** (natural-language attack hints, e.g., "check for SQL injection in login handler").

`--model` and `--effort` route through `scripts/apply-codex-config.py` to update `~/.codex/config.toml` before the companion launches. Two reasons:
1. **`--effort` is not a registered review flag** (`handleReviewCommand` `valueOptions = ["base", "scope", "model", "cwd"]` at `:684`). Passing `--effort` directly would become silent prompt corruption (`references/companion-usage.md §3`). Only the config.toml `model_reasoning_effort` key reaches the review path.
2. **Consistency + persistence.** `--model` IS honored as a flag in v1.0.4 (`startThread({ model })`, `lib/codex.mjs:56-66`), but routing it through config.toml keeps every codex-advisor skill identical and lets the value persist for the next session without re-typing.

Rules:

- **Meta-instructions addressed to YOU** ("한국어로", "빨리", "thoroughly") → obey for your own behavior, never forward.
- **Junk, emoji, trailing punctuation on flag values** → drop (`--base develop,` → `base=develop`).
- **Focus text** — unlike `/codex-review`, adversarial DOES accept it. Collect all non-flag, non-meta tokens and join with spaces. This becomes the positional prompt passed after the flags. Never embed meta-instructions in the focus text.
- **Unknown flag** (e.g., `--commit`, `--uncommitted`, `--wait`, `--foo`) → `AskUserQuestion` to clarify. Common corrections:
  - `--uncommitted` → did you mean `--scope working-tree`?
  - `--commit <sha>` → did you mean `--base <sha>~1 --scope branch`?
  - `--wait` / `--background` → silent no-ops on adversarial; drop.
  - Never pass through.
- **Duplicate flag** → `AskUserQuestion` which one.
- **Ambiguous** → `AskUserQuestion` (interactive) or exit 1 (non-interactive, see `references/companion-usage.md §9`).

**Input validation** (allowed in Phase 1):

```bash
# Replace <literal clean base> with the value from Phase 1 — or skip
# this block entirely if the user gave no --base.
git rev-parse --verify "<literal clean base>" >/dev/null 2>&1 \
  || { echo "Unknown revision: <literal clean base>" >&2; git branch --list | head -20 >&2; exit 1; }
```

### Apply model/effort (if either flag was provided)

Run before Phase 2 so the companion sees the new `config.toml`:

```bash
python3 "${CLAUDE_PLUGIN_ROOT}/scripts/apply-codex-config.py" \
  "<literal clean model from Phase 1 or empty>" \
  "<literal clean effort from Phase 1 or empty>"
```

Relay the `Model: ... | Effort: ...` stdout line verbatim, plus any stderr advisories. **config.toml is global** — the change affects every Codex invocation until changed again. Flag that to the user when values changed.

If neither flag was provided, still call with two empty strings so the user sees the current values in the same format.

**Before Phase 2, also print the Parsed line:**

```
Parsed: base=develop, scope=auto, focus="check SQL injection in login"   (meta: "빨리" obeyed)
```

Order: apply-codex-config.py output first, Parsed line second.

For edge cases, read `${CLAUDE_PLUGIN_ROOT}/references/companion-usage.md §7`.

---

## Phase 2: Invoke (Pattern A — Bash run_in_background)

Adversarial shares `handleReviewCommand` with `review` (`:725, :992-1003`), so
`--background` / `--wait` are silent no-ops. Use Bash
`run_in_background=true`.

```bash
set -o pipefail
CODEX_COMPANION=$("${CLAUDE_PLUGIN_ROOT}/scripts/resolve-companion.sh") \
  || { echo "Official Codex plugin not found — run /codex-setup" >&2; exit 1; }

mkdir -p "${CLAUDE_PLUGIN_DATA}/tmp"
TS=$(date +%s%N)
OUT_FILE="${CLAUDE_PLUGIN_DATA}/tmp/adversarial-${TS}.json"
ERR_FILE="${CLAUDE_PLUGIN_DATA}/tmp/adversarial-${TS}.log"
echo "OUT_FILE=$OUT_FILE"
echo "ERR_FILE=$ERR_FILE"

# Launch via Bash run_in_background=true.
# Replace <literal ...> with values from Phase 1. Omit the entire line
# for values the user did not provide. Focus text is a positional arg —
# place it AFTER all flags, or omit if empty.
node "$CODEX_COMPANION" adversarial-review --json \
  --base "<literal clean base from Phase 1>" \
  --scope "<literal clean scope from Phase 1>" \
  "<literal clean focus text from Phase 1>" \
  > "$OUT_FILE" 2> "$ERR_FILE"
```

Capture the `bash_id` and the literal `OUT_FILE` / `ERR_FILE` paths.
Re-inject these as literal strings in every subsequent Bash call — shell
variables do not survive across calls.

---

## Phase 3: Wait

Poll with `BashOutput` every **30 seconds** (60s acceptable for very
long reviews). Termination: `BashOutput` response field
`status === "completed"`. Never match on stdout content.

| Situation | Action |
|-----------|--------|
| `completed` + `$OUT_FILE` is valid JSON | Proceed to Phase 4 |
| `completed` + `$OUT_FILE` empty | Read `$ERR_FILE`, categorize per §6, save `adversarial-<ts>-failed.md`, stop |
| `completed` + non-JSON | `unexpected-format` — show stderr verbatim, abort |
| 30 minutes elapsed | `wait-timeout` — `KillShell` the bash_id, handle per §6 |

Full error table: `${CLAUDE_PLUGIN_ROOT}/references/companion-usage.md §6`.

---

## Phase 4: Double-check

Now — and **only now** — you may read source code.

Read `${CLAUDE_PLUGIN_ROOT}/references/evaluation.md`.

Adversarial findings are intentionally skeptical. **Be especially
rigorous — adversarial review produces more false positives by design.**

Parse `$OUT_FILE` JSON. For each finding:

1. **Read ONLY the file:line Codex cited.** Never whole files.
2. **Verify the attack scenario is realistic.** Adversarial prompts
   happily invent implausible failure modes.
3. **Classify:**
   - **Agree** — cited code matches a real vulnerability / bug
   - **Disagree** — cited code does not have the problem described
   - **Nuance** — real issue but Codex overstated severity or missed a
     mitigating factor
   - **False Positive (hallucination)** — Codex cited a file, function,
     or line that does **not exist** in the current source tree. This is
     the most common failure mode for adversarial.
   - **Uncited** — no concrete file:line. Surface to user as
     "verification deferred". **Never invent citations.**

---

## Phase 5: Report + save

```bash
mkdir -p "${CLAUDE_PLUGIN_DATA}/reviews"
```

**Success:** save to
`${CLAUDE_PLUGIN_DATA}/reviews/adversarial-<YYYYMMDD-HHMMSS>.md`. Include
Codex output verbatim, per-finding classifications, and a realistic risk
assessment separating genuine concerns from noise.

**Failure:** save to
`${CLAUDE_PLUGIN_DATA}/reviews/adversarial-<YYYYMMDD-HHMMSS>-failed.md`
with error category and captured stderr.

Clean up temp files using the literal paths captured in Phase 2:

```bash
rm -f "<literal $OUT_FILE path>" "<literal $ERR_FILE path>"
```

---

## Gotchas

- **Adversarial hallucinates more.** False Positive classification in
  Phase 4 is the most common outcome for the noisiest findings. Always
  verify the cited file:line exists before agreeing.
- **Focus text IS allowed here** (unlike `/codex-review`). It goes as a
  positional argument after the flags.
- **`--commit`, `--uncommitted` do not exist** — translate via ANALYZE,
  never pass through.
- **Companion-side `--background` / `--wait` are silent no-ops.** Same
  handler as review. Use Pattern A.

For the full shared gotchas list, read
`${CLAUDE_PLUGIN_ROOT}/references/companion-usage.md §10`.
