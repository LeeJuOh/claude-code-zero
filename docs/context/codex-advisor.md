# codex-advisor

## Why this exists

Codex is a strong second opinion, but calling it from inside Claude Code has sharp edges: the
companion's argument parser silently turns unknown flags into prompt content, long reviews die on
Bash's 5-minute timeout, and the most valuable thing — an *independent* check — is lost the moment
Claude reads the diff before Codex does.

codex-advisor wraps Codex as a **double-check peer**, not an oracle. Every Codex finding is
classified *after* Codex returns (Agreed / Disputed / Nuanced / Unverifiable / False Positive /
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
`completeness_contract`, `research_mode`, `citation_rules`, `autonomy_policy`) are
**internalized at design time** — not imported at runtime. The block *tags* came from the Official
plugin's `gpt-5-4-prompting` skill (`prompt-blocks.md`); the *bodies* are ours and are re-synced
against the current OpenAI model guide (as of spec 016: "Using GPT-5.6" and "Using GPT-6 Astra").
We decide which block goes in which skill — the Official skill is a menu, not a contract. Cost of
vendoring: drift + **provenance debt**. See [[0004]].

**Autonomy policy**:
The single block in rescue that tells Codex what it may do without asking: report for
review/diagnose requests, act for change/fix requests, confirm only for external, destructive, or
scope-expanding actions, and never stop at a partial answer or a plan. It replaces the three
overlapping blocks (`completeness_contract`, `verification_loop`, `action_safety`) whose "call out
before acting" wording made Codex ask — and nobody can answer: the companion rejects every
server request, and a turn that ends in a question still counts as completed, so the work is left
undone while the status says success. The policy therefore never asks; what the task states is
treated as approved, and anything else risky is listed in the final report instead.
_Avoid_: safety block, approval block.

**Static shaping** vs **adaptive shaping**:
verify/research use **one fixed template per skill** — correct, because their task type is *fixed*
(verify always reviews a document, research always investigates a topic). rescue uses **adaptive
shaping**: its task type is *variable* (implement / debug / investigate), so the skill's LM selects
task-appropriate blocks per request and wraps the user's verbatim text. Static shaping is justified
by determinism + independence; adaptive shaping is acceptable for rescue because its double-check is
post-hoc on the diff. See [[0004]].

**Double-check independence**:
The north star: the reviewer must not know the reviewed party's conclusions. It has two sides.
*Write-side*: what Claude sends to Codex carries evidence and focus only, never Claude's
hypothesis (see **Hypothesis exclusion**). *Read-side*: the verdict on each Codex finding is made
by a **Verifier** that has no conversation history, not by the main session that authored the code.
Instructions alone cannot deliver either side — the main session is the author and already holds
the code in context — so both are enforced by structure. See [[0012]]. The structure covers the
Verifier's launch prompt and, while the skill runs, any follow-up message to a Verifier; a Verifier
resumed after the report is saved is outside the guarantee, since the saved verdicts no longer
change. For verify/research the
document additionally never enters Claude's context (**blind payload**).

**Verifier**:
The fresh subagent that judges one finding group. It receives the finding, its citation, the
citation-existence result, and the classification rules — no conversation history and no authoring
memory. Shared project instructions (the CLAUDE.md hierarchy) are visible to it as to every
subagent; they are common rules, not the author's memory. It returns
one verdict per item (never a single label for a group, never PASS/FAIL —
that is arithmetic the main session does from the verdicts), each Agreed / Disputed / Nuanced /
Unverifiable with evidence, tuned skeptical (default Disputed when
it has seen counter-evidence; Unverifiable when it has seen nothing). Items are numbered in
advance only where the script extracts findings (review, adversarial), so only there is a skipped
item caught; for prose results (verify, research, rescue) the Verifier draws the item boundaries
itself. The report names it:
`Verifier: fresh subagent`; a group whose Verifier call failed is shown as `Unverified` — the main
session never judges in its place. Its model is never pinned by the plugin and never chosen by the
main session: the user's subagent-model setting applies, else the session's model.
_Avoid_: double-checker, judge agent, reviewer (that word is Codex's role).

**Author note**:
The main session's labelled dissent beneath a Verifier verdict it disagrees with. The verdict
is never edited or overridden; the note sits next to it, marked as the author's opinion, and the
user weighs both. It is written only after the verdict exists — never fed to the Verifier.
_Avoid_: override, re-judgment, main's verdict.

**Hypothesis exclusion**:
The write-side rule. When Claude composes focus text (adversarial, verify), a research topic, or a
rescue task, it forwards *evidence* (scope, symptoms, reproduction, logs, the user's own words) and
*focus* (an area to look at) but drops *hypotheses* (a claimed cause, a suspected `file:line`, an
expected answer). The preview shows what was dropped as `Excluded (hypothesis):` so the user can
put it back; no flag skips the preview. It is a check only when a person answers — a question
timeout the user enabled, or a headless run with no question tool, can let the call proceed
unconfirmed. Assertion → hypothesis; area only → focus. The rule
applies to every invocation alike — whether the user typed the slash command or Claude composed
the call from the user's intent — so no source detection exists; a hypothesis the user wants sent
is restored from the preview in one step. A rescue task statement is the requirement itself, i.e.
evidence, never a hypothesis.
_Avoid_: prompt sanitizing, focus filtering.

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

**Six-way classification** (formerly Five-way):
Every double-check labels each Codex finding: **Agreed** / **Disputed** (the Verifier found
evidence against it) / **Nuanced** / **Unverifiable** (the Verifier found no evidence either way
within the cited range — a verification gap, not a Codex error; the report counts these
separately; the script also assigns it to every finding in a file the working tree has changed
since the reviewed ref, cited line present or not, so neither a stale `missing` nor a changed line
reaches a verdict) / **False Positive** (Codex cited a file/function/line that does not exist — a
hallucination) / **Uncited** (no concrete citation → "verification deferred"). The split of labour
is fixed: False Positive and Uncited are *facts* decided by the citation-existence script;
Agreed / Disputed / Nuanced / Unverifiable are *judgments* decided by the **Verifier**. For
verify/research (section and URL citations, no `file:line`) the Verifier decides all six.
"Disputed" without evidence is not allowed; "I couldn't tell" is Unverifiable. Inventing a citation to justify reading a file is
forbidden.

**Raised item** (vs. Codex finding):
An item the Verifier introduces itself rather than receiving — a **gap** (`missing-N`: a part of
the approved research scope the result never answers) or an **unrequested change**
(`side-effect-N`: something a rescue write did that no requirement asked for). These are not
claims of Codex's, so the six-way classification does not apply to them: a gap is **Confirmed**
or **Refuted**, an unrequested change is **Harmless** or **Harmful**. They are reported and
counted on their own lines and never enter the agreement rate, which measures Codex's accuracy
on what Codex actually said. Calling a gap "Agreed" would read as approving the gap and would
credit Codex for its own omission.

**Finding group**:
The unit one Verifier judges. Findings citing the same file are merged by the script, capped
at five findings and a bounded payload size so a group never grows large enough to invite
pattern-matching leniency; a single finding over the size bound forms its own group rather than
being cut. Grouping is never the main session's call — the biased party must not
decide what gets diluted together.

**Verifier payload**:
The text a Verifier receives, and the only text it receives. Written to a file by the citation
script (one per finding group, hashes in a manifest), chosen by the main session by path, and
delivered by a plugin hook that replaces the launch prompt with the file's content after checking
the hash. Anything the main session adds to the prompt is discarded before the Verifier sees it —
the author cannot brief the judge. For verify/research the payload also points at the prompt
Codex received — the scope the user approved in the preview — so omissions are judged against it,
never against a summary by the main session. _Avoid_: verifier prompt (that is what the main session writes
and the hook throws away).

**Pattern A** vs **Pattern B**:
Two invocation shapes. **A** (review/adversarial): the companion's own `--background`/`--wait` are
**silent no-ops** (`handleReviewCommand` always runs foreground), so we use Bash
`run_in_background=true` to survive the 300s tool timeout; completion arrives as a background-task
notification and the output file is then `Read` (the former `BashOutput` polling loop and
`KillShell` are gone from Claude Code; there is no wait cap — the user cancels a stuck job). **B** (task): the
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

The script **does not judge the values** — no model list, no effort set, no alias, no cache lookup.
It writes what it is given and lets Codex settle validity at run time. This is
deliberate and was paid for: v4.7.0 deleted a cache-backed validation layer that had started calling
real, newly-released models invalid, because any list we keep is a copy of someone else's world and
rots faster than the original. Non-blocking validation was never a defence anyway — it warned and
saved the value regardless. **Do not reintroduce it.** v5.0.0 (issue `016`) removed the last
survivor of that layer, the `spark` alias — the same reasoning, applied to the one model name the
script still knew. See spec `012`.

**Provenance debt**:
The obligation to mark, next to every vendored block, which model guide its wording came from, so
a maintainer knows what to re-sync when OpenAI publishes the next guide. Partly paid in 4.5.0 (tag
origin noted); paid in full by spec 016 (each block cites the 5.6 / Astra guide section it follows).
The plugin has no "default model" of its own to compare against — what sits in a user's
config.toml is whatever that user set. See [[0004]].

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
