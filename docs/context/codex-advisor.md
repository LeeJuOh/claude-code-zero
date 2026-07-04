# codex-advisor

## Why this exists

Codex is a strong second opinion, but calling it from inside Claude Code has sharp edges: the
companion's argument parser silently turns unknown flags into prompt content, long reviews die on
Bash's 5-minute timeout, and the most valuable thing — an *independent* check — is lost the moment
Claude reads the diff before Codex does.

codex-advisor wraps Codex as a **double-check peer**, not an oracle. Every Codex finding is
classified by Claude *after* Codex returns (Agreed / Disputed / Nuanced / False Positive /
Uncited), the wrapper survives long jobs, and the input parser is whitelisted so a stray comma or a
Korean meta-instruction never reaches Codex as a flag.

The wrapper calls the **companion binary directly** and bypasses the Official Codex plugin's
skill / agent / command layer. What that means for prompt fidelity — when we can distort an
official prompt and when we structurally cannot — is the domain model below. See [[0004]].

## What it does

Ten skills (`codex-review`, `codex-adversarial`, `codex-rescue`, `codex-verify`,
`codex-research`, `codex-transfer` — landing via issue 006, plus `codex-setup` / `codex-status` /
`codex-result` / `codex-cancel`) translate messy human input into one clean companion invocation,
run it resiliently, then double-check the result — except `codex-transfer`, a one-way handoff
with nothing returned to check (see **Transfer**). Each maps to exactly one companion subcommand.

## Language

**Companion**:
The Official Codex plugin's `codex-companion.mjs` binary — the engine codex-advisor calls. Resolved
at runtime by `scripts/resolve-companion.sh` (registry → version cache → marketplace mirror). It is
**not** a skill; the Official plugin is used only as the binary's supplier. codex-advisor requires
companion **v1.0.4+**.

**Companion subcommand**:
`review` | `adversarial-review` | `task` | `transfer` (v1.0.5+) | `status` | `result` | `cancel`.
The stable interface codex-advisor adapts. The adapter boundary is *here* — the CLI contract —
not the prompt text.

**Native path** (`review`, `adversarial-review`):
Subcommands whose prompt is owned by **Codex**, not us. `review` runs the server-side built-in
reviewer; `adversarial-review` makes the companion load `prompts/adversarial-review.md` and
interpolate `USER_FOCUS` + `REVIEW_INPUT` server-side (`codex-companion.mjs:242-248`). A caller can
supply only flags + focus text. **Distorting these prompts is structurally impossible** — they live
in code we call, not in our payload.

**Task path** (`verify`, `research`, `rescue`):
Subcommand `task` pipes stdin **raw** — `readTaskPrompt = positionalPrompt || readStdinIfPiped()`
(`codex-companion.mjs:643-650`). The companion wraps nothing, so **codex-advisor owns the entire
prompt**. There is no "official task prompt" to distort; only our own prompt quality matters.

**Vendored prompt blocks**:
The XML blocks our task prompts use (`task`, `structured_output_contract`, `grounding_rules`,
`completeness_contract`, `research_mode`, `citation_rules`, `action_safety`, `verification_loop`)
are copied from the Official plugin's `gpt-5-4-prompting` skill (`prompt-blocks.md`) and
**internalized at design time** — not imported at runtime. The official skill is
`user-invocable: false` guidance (a block menu, not a function) at a version-pinned path, so
referencing it live would be non-deterministic and version-fragile. Cost of vendoring: drift +
**provenance debt**. See [[0004]].

**Static shaping** vs **adaptive shaping**:
verify/research use **one fixed template per skill** — correct, because their task type is *fixed*
(verify always reviews a document, research always investigates a topic). rescue uses **adaptive
shaping**: its task type is *variable* (implement / debug / investigate), so the skill's LM selects
task-appropriate blocks per request and wraps the user's verbatim text. Static shaping is justified
by determinism + independence; adaptive shaping is acceptable for rescue because its double-check is
post-hoc on the diff. See [[0004]].

**Double-check independence**:
The north star. Claude must **not** read source or the document before Codex returns — Phases 1–3
forbid `Read`/`Grep`/`git diff`. The wrapper's value is the post-hoc classification, never
pre-analysis. Reading first means Claude rationalizes away valid catches. For verify/research this
is enforced by the **blind payload**.

**Blind payload**:
verify/research assemble the prompt with `cat "$DOC" >> "$PROMPT_FILE"` (file-redirect, empty
stdout) then `cat "$PROMPT_FILE" | node companion task` (stdin pipe). The document text reaches
Codex but **never enters Claude's context**. A positional arg after `task` would silently drop the
whole payload (`:649`), so the pipe is load-bearing.

**Transfer**:
Session handoff — the current Claude Code conversation is imported into a resumable Codex thread
(`codex resume <id>`), after which work continues *outside* Claude Code. One-way: unlike every
other skill, there is no double-check phase, because nothing comes back to classify — Claude
exits the loop at handoff. Not to be confused with rescue (delegation: Codex works, Claude
reviews the result and keeps the wheel). The wrapper's value here is whitelisting, error
taxonomy, and disable-parity — not verification. Requires companion v1.0.5+.

**Transcript env contract**:
`CODEX_COMPANION_TRANSCRIPT_PATH` — the env var through which the companion's `transfer` locates
the current session's transcript. Planted at SessionStart by whichever hook runs first: the
Official plugin's, or codex-advisor's conditional hook when the Official plugin is disabled.
Hooks are the **only** channel that receives the transcript path; the model cannot derive it
(mtime guessing breaks under concurrent sessions). See [[0006]].

**Five-way classification**:
Every double-check labels each Codex finding: **Agreed** / **Disputed** / **Nuanced** / **False
Positive** (Codex cited a file/function/line that does not exist — a hallucination) / **Uncited**
(no concrete citation → "verification deferred"). Inventing a citation to justify reading a file is
forbidden.

**Pattern A** vs **Pattern B**:
Two invocation shapes. **A** (review/adversarial): the companion's own `--background`/`--wait` are
**silent no-ops** (`handleReviewCommand` always runs foreground), so we use Bash
`run_in_background=true` + `BashOutput` polling to survive the 300s tool timeout. **B** (task): the
companion's `--background` **is** honored, returns a job immediately, then we poll via
`status --wait` (≤240s/call, under the limit).

**Silent flag corruption**:
The companion's `parseArgs` has no unknown-flag error — any unrecognized token is silently joined
into the prompt body (`lib/args.mjs:48-49` for long flags, `:70` for short flags +
`codex-companion.mjs:643-650`). There is **no companion-side safety net**;
each skill's Phase 1 ANALYZE whitelist is the only defense. This is why input is whitelisted, not
blindly forwarded.

**Model/effort routing**:
`--model` / `--effort` never reach the companion as flags. They route through
`scripts/apply-codex-config.py`, which writes `~/.codex/config.toml`. Reason: `--effort` is not a
registered review flag (it would become prompt corruption), and config.toml persists across
sessions + keeps every skill identical. The change is **global** — it affects every Codex
invocation until changed again.

**Provenance debt**:
Vendored blocks carry no source marker in shipped skills/scripts/README (`grep gpt-5-4-prompting`
over them finds nothing — only this CONTEXT.md names the origin).
A maintainer cannot tell they came from the official guide, nor that they should be **re-synced**
when the Official plugin bumps its prompting guide (the guide targets GPT-5.4; our default model is
gpt-5.5 — it is already one generation behind). Paying this debt = a provenance note + re-sync
trigger. See [[0004]].

## Flagged ambiguities

**"Wrapper distorts the official prompt"** — the founding worry, resolved as: impossible for
native paths (server-side), undefined for task paths (no official prompt). The real, narrower risk
is *our own* task-prompt quality drifting from the vendored guide — tracked by provenance, not by
hunting for "official corruption".

## Example dialogue

> **Dev:** rescue should reference the official `gpt-5-4-prompting` skill at runtime — thinner
> wrapper, auto-updates.
> **Domain:** That skill is a block *menu* with `user-invocable: false`, at a version-pinned path.
> Referencing it live means an LM re-derives the prompt every run — non-deterministic, so Phase 1.5
> can't preview the exact text, and for verify/research it breaks double-check independence. We
> vendor the blocks instead. The debt is provenance, and we pay it with a note, not a runtime
> import.
> **Dev:** Then make rescue static too, like verify.
> **Domain:** verify's task is fixed — one template fits. rescue's task is variable; one template
> mis-fits half the cases. So rescue shapes adaptively, and that's allowed *because* its
> double-check runs on the diff afterward, not on the prompt.
