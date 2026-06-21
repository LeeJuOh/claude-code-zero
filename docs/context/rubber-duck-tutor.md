# CONTEXT — rubber-duck-tutor

> Ubiquitous language for rubber-duck-tutor. Glossary only — no implementation.
> Decisions live in `docs/adr/`. Vocabulary sharpened during the grill session (2026-06-21).

## Language

**ducking**:
The model-invoked comprehension-discipline engine — the reusable loop every user-facing mode
calls. Auto-engaged when the agent detects rubber-stamping.
_Avoid_: core, core.md, shared rules

**Rubber-stamping**:
Accepting AI-generated output (code, plan, design) without understanding it. The failure mode
the plugin exists to prevent.
_Avoid_: blind approval, glossing over

**Confrontation**:
A non-blocking, default-on understanding question. It surfaces but does not halt work — the user
may answer it or move on.
_Avoid_: nudge, prompt, reminder

**Gate**:
A blocking forcing function that halts work until a condition is met (e.g. passing a quiz).
Explicitly rejected — see ADR 0003.
_Avoid_: block, wall, checkpoint

**Forcing function**:
The mechanism behind a gate — friction deliberately inserted to compel an action. no-numb's
model; duck's anti-pattern.

**Ship-point confrontation**:
The confrontation fired at the moment of shipping (`git push` / PR / MR creation) about the
change just shipped. Duck's primary default-on verification layer.
_Avoid_: post-push nag

**Artifact-level comprehension**:
Understanding *what* a deliverable does and *why*, at the output grain. The default verification
target.
_Avoid_: output review, high-level review

**Code-level comprehension**:
Understanding *how* the code works, line by line. A voluntary deeper layer (`duck-verify`), never
the forced default — exhaustive verification is infeasible.
_Avoid_: line-by-line review

**Before-build comprehension**:
Understanding exercised *before* AI generates — predicting your own design or plan first, then
comparing against AI's output. Covered by `duck-prebuild`.
_Avoid_: pre-coding review

**After-build comprehension**:
Understanding exercised *after* the code or artifact exists — verifying you grasp what was
produced. Covered by `duck-verify` and `duck-review`.

**Generation effect**:
The learning boost from producing your own answer before seeing the reference. The reason
before-build comprehension earns its place.

**Shared ship budget**:
`{git push, gh pr create, glab mr create}` fire a ship-point confrontation at most once per
session — first to fire wins. `git push` is the universal fallback (web PRs, Bitbucket, GitLab
MRs all push first), so it covers platforms the CLI hooks miss.

**Complement (not substitute)**:
duck and no-numb are complements — a user who wants hard gates installs both. duck does not
absorb no-numb's forcing function.

## Recorded in

- ADR: `docs/adr/0003-duck-rejects-gates-confronts-at-ship-point.md`
- Handoff / implementation directive: `docs/handoff/2026-06-21-rubber-duck-tutor-redesign.md`
