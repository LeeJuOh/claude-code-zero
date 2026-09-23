# rubber-duck-tutor

rubber-duck-tutor keeps the user's understanding sharp during AI-assisted coding, so AI-generated
work is not accepted without being understood. It works through two personas: one that verifies
understanding (Duck) and one that builds it (Coach).

## Language

### Purpose and personas

**Rubber-stamping**:
Accepting AI-generated output (code, plans, designs) without understanding it. The failure mode the
plugin exists to prevent.
_Avoid_: blind approval, glossing over

**Duck**:
The interrogator persona. Asks questions and waits — never solves, never hints, never teaches.
_Avoid_: tutor, quizmaster, teacher

**Coach**:
The teaching persona. Explains, drills, and critiques the user's attempts like a senior engineer —
never quizzes to test understanding, though it resolves a Gap when the user demonstrates
understanding by passing an exercise (not by saying "I get it").
_Avoid_: tutor, mentor, sensei

**ducking**:
The understanding-discipline engine: the shared persona, questioning technique, and session
management that every user-facing mode reads. A reference document, deliberately not a skill —
nothing invokes it, and automatic confrontation belongs to the ship-point hooks (ADR 0003).
_Avoid_: core, core.md, shared rules, auto-trigger, auto-activates on detection, ducking skill

**Complement (not substitute)**:
Duck and no-numb are complements: a user who wants a hard gate installs both, and Duck does not
absorb no-numb's forcing function. By the same principle Duck stays out of code review (code
quality) and grilling (plan validation) — its axis is always the user's understanding.

### Confrontation

**Confrontation**:
A non-blocking, default-on understanding question. It surfaces the work without stopping it — the
user can answer or move on.
_Avoid_: nudge, prompt, reminder, gate, quiz, checkpoint

**Gate**:
A blocking enforcement mechanism that holds work until a condition is met (e.g. passing a quiz).
Explicitly rejected — see ADR 0003.
_Avoid_: block, wall, checkpoint

**Forcing function**:
The mechanism behind a gate: friction deliberately added to compel a behavior. no-numb's model and
Duck's anti-pattern.

**Ship point**:
The moment work leaves the machine — `git push`, `gh pr create`, `glab mr create`.
_Avoid_: deploy, release

**Ship-point confrontation**:
A confrontation fired at the ship point about the change just shipped. Duck's primary default-on
verification layer.
_Avoid_: post-push nag

**Shared ship budget**:
The limit of one ship-point confrontation per session, shared by every ship point — whichever fires
first wins. The push is the universal fallback, since web PRs, Bitbucket, and GitLab MRs all push
first, so it covers PRs and MRs opened outside the CLI.

**Retrieval confrontation**:
A confrontation that re-asks an unresolved Gap from a past session, using the spacing effect. The
middle rung of the fallback ladder (blind-spot target > Gap retrieval > generic artifact question).
_Avoid_: quiz replay

**Scoreboard**:
The factual tally shown instead of a question once the ignore streak is exceeded ("M of N high-risk
changes engaged", with the changes named). A low-intensity form of confrontation — still
non-blocking, and it returns to question mode once the user answers again.
_Avoid_: nag, warning banner

**Ignore streak**:
The number of confrontations ignored in a row, counted from confrontation telemetry. The condition
for demoting to the scoreboard.

**Confrontation telemetry**:
The record of every confrontation fired, answered, or ignored. The observation layer that removes
"we don't know whether it works".
_Avoid_: analytics, usage stats

### Targeting

**Engagement**:
An objective signal from the live conversation that the user discussed, questioned, or directed a
specific change themselves — silence, agreement, or the AI writing it unprompted does not count.
One axis of the blind-spot judgment.
_Avoid_: attention, review status

**Risk taxonomy**:
The fixed classification for judging how much a change matters — concurrency, security,
performance, data schema, public API, architecture boundary. Always a judgment call, never a hard
rule; the other axis of the blind-spot judgment.
_Avoid_: severity levels

**Blind spot**:
A high-risk change (top of the risk taxonomy) with no engagement — the first-priority target of a
confrontation. Not a file-view-rate metric: a low-risk change is no target even if never seen.
_Avoid_: unseen file, coverage gap

**Interface-fact question**:
The question form that asks about a change's invariant, error mode, ordering constraint, or
trade-off, used on blind-spot targets. It checks reviewer- or architect-level understanding, not
coder-level recall.
_Avoid_: did-you-read-it question

### Comprehension

**Artifact-level comprehension**:
Understanding *what* an artifact does and *why*, one output at a time. The default verification
target.
_Avoid_: output review, high-level review

**Code-level comprehension**:
Understanding *how* the code works, line by line. An opt-in deeper layer, not an enforced default —
verifying everything this way is impractical.
_Avoid_: line-by-line review

**Before-build comprehension**:
Understanding exercised *before* the AI generates anything — the user predicts their own design or
plan first, then compares it with the AI's output.
_Avoid_: pre-coding review

**After-build comprehension**:
Understanding exercised *after* the code or artifact exists — verifying that the user grasped what
was generated.

**Generation effect**:
The learning boost from producing your own answer before seeing a reference. The reason
before-build comprehension earns its place.

**Gap**:
A demonstrated hole in the user's understanding — something they could not explain when asked.
Stays unresolved until the user later demonstrates they can explain it.
_Avoid_: weakness, mistake, failure
