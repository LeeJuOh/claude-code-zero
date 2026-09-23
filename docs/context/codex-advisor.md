# codex-advisor

codex-advisor wraps Codex as a double-check peer, not an oracle: its ten skills translate messy
input into one whitelisted call to the Official Codex plugin's companion binary, bypassing that
plugin's skill, agent, and command layer ([[0004]]). Every skill except the one-way
`codex-transfer` handoff ends with an independent Verifier classifying what Codex returned.

## Language

### Companion and prompt ownership

**Companion**:
The Official Codex plugin's `codex-companion.mjs` binary — the engine codex-advisor calls directly.
It is not a skill; the Official plugin is used only as the binary's supplier.

**Companion subcommand**:
One of the companion's CLI entry points: `review`, `adversarial-review`, `task`, `transfer`,
`status`, `result`, `cancel`. This CLI contract, not the prompt text, is the adapter boundary
codex-advisor adapts.

**Native path** (`review`, `adversarial-review`):
The subcommands whose prompt is owned by Codex and applied inside the companion, so a caller
supplies only flags and focus text. Distorting these prompts is structurally impossible — they live
in code we call, not in our payload.
_Avoid_: "the wrapper distorts the official prompt" (impossible here by construction).

**Task path** (`verify`, `research`, `rescue`):
The `task` subcommand, which passes our prompt to Codex raw and wraps nothing, so codex-advisor owns
the entire prompt. There is no official task prompt to distort; only our own prompt quality matters.
_Avoid_: "official task prompt" (none exists — the real risk is our own prompt drifting from the
vendored guide, tracked by **Provenance debt**).

**Vendored prompt blocks**:
The XML blocks our task prompts use, internalized at design time rather than imported at runtime:
the tags come from the Official plugin's prompting guide, the bodies are ours and re-synced against
the current OpenAI model guide. We decide which block goes in which skill — the Official guide is a
menu, not a contract ([[0004]]).

**Provenance debt**:
The obligation to mark, next to every vendored block, which model guide its wording came from, so a
maintainer knows what to re-sync when OpenAI publishes the next guide. It is the cost of vendoring,
alongside drift ([[0004]]).

**Autonomy policy**:
The single block in rescue's prompt that sets what Codex may do without asking: report on
review/diagnose requests, act on change/fix requests, never stop at a partial answer or a plan, and
list unrequested external, destructive, or scope-expanding actions in the final report. It never
asks, because no one can answer — the companion rejects every server request, and a turn that ends
in a question still counts as completed.
_Avoid_: safety block, approval block.

**Static shaping** vs **adaptive shaping**:
Static shaping is one fixed prompt template per skill, used by verify and research because their
task type is fixed; adaptive shaping is rescue's per-request choice of blocks around the user's
verbatim text, because its task type varies. Adaptive shaping is acceptable for rescue only because
its double-check runs afterward on the diff, not on the prompt ([[0004]]).

### Invocation

**Pattern A** vs **Pattern B**:
The two invocation shapes. Pattern A (review, adversarial) runs the companion in a Claude-side
background shell because the companion's own background flags are silent no-ops there; Pattern B
(task) uses the companion's own background job and polls its status.

**Silent flag corruption**:
The companion parser's habit of joining any unrecognized token into the prompt body instead of
raising an error. With no companion-side safety net, each skill's input whitelist is the only
defense.

**Model/effort routing**:
The rule that model and effort choices never reach the companion as flags but are written to the
user's global Codex config, where they persist and affect every Codex invocation. The routing never
judges the values — no model list, no effort set, no alias; Codex settles validity at run time.

**Transfer**:
Session handoff: the current Claude Code conversation is imported into a resumable Codex thread,
and work continues outside Claude Code. One-way — nothing comes back to classify, so there is no
double-check phase.
_Avoid_: rescue (that is delegation — Codex works, Claude reviews the result and keeps the wheel).

**Transcript env contract**:
The environment variable through which the companion's `transfer` locates the current session's
transcript, planted at session start by the Official plugin's hook or, when that plugin is disabled,
by codex-advisor's conditional hook. Hooks are the only channel that receives the transcript path;
the model cannot derive it ([[0006]]).

### Double-check

**Double-check independence**:
The north star: the reviewer must not know the reviewed party's conclusions. Write-side, Claude
sends Codex evidence and focus but never its hypothesis; read-side, each finding is judged by a
Verifier with no conversation history — both enforced by structure, not instruction ([[0012]]).

**Hypothesis exclusion**:
The write-side rule: when Claude composes focus text, a research topic, or a rescue task, it
forwards evidence and focus (an area to look at) but drops hypotheses (any assertion — a claimed
cause, a suspected `file:line`, an expected answer) and shows them in the preview so the user can
put them back. It applies to every invocation alike, whoever started it, and a rescue task
statement is the requirement itself — evidence, never a hypothesis.
_Avoid_: prompt sanitizing, focus filtering.

**Blind payload**:
The verify/research prompt assembly in which the document reaches Codex without ever entering
Claude's context — neither when the prompt is sent nor when the result is read back.

**Verifier**:
The fresh subagent that judges one finding group with no conversation history or authoring memory,
returning one verdict per item — Agreed, Disputed, Nuanced, or Unverifiable — with evidence, tuned
skeptical. The main session never judges in its place: a group whose Verifier call failed is
reported as Unverified.
_Avoid_: double-checker, judge agent, reviewer (that word is Codex's role).

**Verifier payload**:
The text a Verifier receives, and the only text it receives: written by the citation script, one
per finding group, and swapped in for the launch prompt by a plugin hook, so anything the main
session adds is discarded. The author cannot brief the judge.
_Avoid_: verifier prompt (that is what the main session writes and the hook throws away).

**Finding group**:
The unit one Verifier judges: findings citing the same file, merged by the script and capped in
count and size so a group never grows large enough to invite pattern-matching leniency. Grouping is
never the main session's call — the biased party must not decide what gets diluted together.

**Author note**:
The main session's labelled dissent beneath a Verifier verdict it disagrees with, written only
after the verdict exists and never fed to the Verifier. The verdict is never edited; the user
weighs both.
_Avoid_: override, re-judgment, main's verdict.

**Six-way classification**:
The label set for every Codex finding: Agreed, Disputed, Nuanced, Unverifiable (no evidence either
way — a verification gap, not a Codex error), False Positive (a cited location that does not exist —
a hallucination), and Uncited (no concrete citation — verification deferred). False Positive and
Uncited are facts decided by the citation script, the other four are judgments decided by the
Verifier, and for verify/research the Verifier decides all six.
_Avoid_: Five-way classification (the former name).

**Raised item**:
An item the Verifier introduces itself rather than receives — a gap (part of the approved research
scope the result never answers) or an unrequested change (something a rescue write did that no
requirement asked for). Not a Codex claim, so it gets its own labels (a gap is Confirmed or
Refuted, an unrequested change Harmless or Harmful) and never enters the agreement rate.
_Avoid_: Codex finding; labelling a gap Agreed (it reads as approving the gap and credits Codex for
its own omission).
