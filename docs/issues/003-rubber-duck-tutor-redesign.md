# rubber-duck-tutor redesign: reject gates → ship-point confrontation (v3.0.0)

> 상태: 구현 대기 · 생성: 2026-06-21
> 지시서: `docs/handoff/2026-06-21-rubber-duck-tutor-redesign.md`
> ADR: `docs/adr/0003-duck-rejects-gates-confronts-at-ship-point.md`
> 용어집: `plugins/rubber-duck-tutor/CONTEXT.md`

Vertical-slice issues for the v2.4.1 → 3.0.0 redesign. Each slice is independently grabbable and
verifiable on its own. Decisions are locked — see the ADR, glossary, and implementation
directive above. Vocabulary below uses the domain glossary (ducking, confrontation, ship-point
confrontation, artifact-level vs code-level comprehension, shared ship budget).

## Dependency graph

```
S1  S2  S3 ──────────────────┐
                              ▼
                   S4 ──► S5 ──► S6 ──► S8
                    │      │
                    └──► S7 (also needs S3)
                           S5 ──► S9
```

Slices with no blocker (S1, S2, S3, S4) can start immediately. Version handling: each Phase 1
slice carries a patch bump on commit; the breaking command removal lands the major bump in S9.

The ASCII is a transitive simplification — the authoritative blockers are each slice's
**Blocked by** field. Edges not visible above: S7 needs both S3 and S4; S9 needs S5; S6 also
inherits S4 through S5.

---

## S1 — Remove the false /branch · /resume fallback

**Phase:** 1 · **Blocked by:** None — can start immediately.

### What to build
`/branch` and `/resume` are Claude Code built-ins (`/branch [name]`, `/resume [session]`,
alias `/continue`). The plugin currently documents them as needing an external plugin
(`lab-harness-zero`) and layers a fallback branch on that false premise. Remove the fallback
branch and the external-plugin prerequisite; simplify to "built-in, always available."

### Acceptance criteria
- [ ] No plugin doc claims `/branch` or `/resume` requires an external plugin.
- [ ] The fallback branch for "when /branch and /resume are unavailable" is gone.
- [ ] README Prerequisites no longer lists the external-plugin dependency.

### Blocked by
None — can start immediately.

---

## S2 — Path-based document trigger

**Phase:** 1 · **Blocked by:** None — can start immediately.

### What to build
The document trigger currently matches by **filename** (`adr*.md`), which silently misses the
standard numbered-ADR form (`0001-...md`) — including this repo's own ADRs. Switch to
**path-based** matching (`docs/adr/`, `docs/plans?/`, `docs/specs?/`, `docs/rfcs?/`) with a
filename fallback, one optional override key for a custom path regex, and a footgun fallback
(a bad override regex reverts to the default rather than disabling the trigger).

### Acceptance criteria
- [ ] Writing a numbered ADR (`docs/adr/0003-....md`) fires the trigger.
- [ ] Filename-style names (`adr-foo.md`) still match via the fallback.
- [ ] A malformed override regex falls back to the default path set; the trigger never silently dies.

### Blocked by
None — can start immediately.

---

## S3 — Ship hooks: shared ship budget + suggest→confront

**Phase:** 1 · **Blocked by:** None — can start immediately.

### What to build
Two changes to the ship hooks. (1) **Shared ship budget**: `{git push, gh pr create,
glab mr create}` fire a ship-point confrontation at most once per session — first to fire wins —
so the universal `git push` signal covers platforms the CLI hooks miss without double-firing.
(2) **Suggest→confront**: the ship hook's `additionalContext` changes from "suggest /branch +
/duck-review" into one inline understanding question about the change just shipped (artifact
grain). Deep sessions still get the branch-first framing.

**Explicitly not doing:** the inline compound-command regex in the ship scripts is *intentional*
redundant defense — the `if:` Bash matcher already inspects each sub-command of `a && b`
independently, so the script-side regex is belt-and-suspenders, not a bug. Do not "simplify" it
away. Alias / `hub` coverage (other command names) is a separate low-priority gap, out of scope.

### Acceptance criteria
- [ ] The first ship action in a session fires one confrontation; a second ship action the same
      session is silent.
- [ ] `git push` alone (no `gh`/`glab`) still fires the confrontation.
- [ ] The injected context confronts with a question, not a bare suggestion to run a command.

### Blocked by
None — can start immediately.

---

## S4 — Promote core.md to the `ducking` engine

**Phase:** 2 · **Blocked by:** None — can start immediately (but S5, S6 build on it).

### What to build
Promote the shared rules in `core.md` to a model-invoked `ducking` skill — the reusable
comprehension-discipline engine that auto-engages when the agent detects rubber-stamping. Move
the helper scripts (`log-gap.sh`, `recent-gaps.sh`) into the engine's own `scripts/` directory
and repoint every path that referenced the old location. **Six sites** hardcode
`${CLAUDE_PLUGIN_ROOT}/skills/duck/scripts/...` and must be repointed: the `allowed-tools` lines
in the five mode SKILL.md files (`duck-design`, `duck-plan`, `duck-verify`, `duck-review`,
`duck-orient`) plus the in-body script path in `core.md` (now the engine). A missed `allowed-tools`
path fails silently as a Bash-permission mismatch, so the grep below is the real gate.

### Acceptance criteria
- [ ] A model-invoked `ducking` skill exists and auto-engages on detected rubber-stamping.
- [ ] Helper scripts run from the engine's new `scripts/` path.
- [ ] `grep -rn 'skills/duck/scripts'` returns no live references — all six repoint sites updated.
- [ ] No skill or reference points at the old `core.md` path (grep is clean).

### Blocked by
None — can start immediately.

---

## S5 — Merge duck-design + duck-plan into `duck-prebuild`

**Phase:** 2 · **Blocked by:** S4.

### What to build
Collapse the two before-build modes into a single `duck-prebuild` skill that covers both
predict-first design sketching (the generation effect) and plan/decision review in one mode.
Delete the two old skills and propagate the rename through **every live reference** so no dead
command pointer survives. The reference set is larger than the handoff checklist records — a
`grep -rn 'duck-design\|duck-plan'` is the authoritative gate, not a fixed list. Known live sites:

- `duck` router SKILL.md — description + the mode-map rows that route to `/duck-design` / `/duck-plan`
- sibling cross-refs — `duck-verify` and `duck-review` SKILL.md descriptions both name `/duck-plan`
- the plan/doc hooks — `post-plan.sh`, `post-write-plan.sh` (their `additionalContext` says `/duck-plan`)
- plugin `README.md` — command table, Quick Start, hooks paragraph
- **repo-root `README.md` and `README.ko.md`** — the marketplace command list (missed by the handoff checklist)

Scope boundary: the `plugin.json` / `marketplace.json` **description** prose is rewritten in S9
(identity rewrite), so S5 does **not** touch those two strings — that avoids an S5/S9 write-write
clash. S5 owns the rename everywhere except the two manifest descriptions.

### Acceptance criteria
- [ ] `/duck-prebuild` runs both before-build flows.
- [ ] `/duck-design` and `/duck-plan` skills no longer exist.
- [ ] `grep -rn 'duck-design\|duck-plan'` returns no live references **except** the two manifest
      descriptions (owned by S9) and historical docs (`docs/handoff`, `docs/issues`, `docs/adr`).

### Blocked by
S5 depends on S4 (the wrapper calls the `ducking` engine).

---

## S6 — Invoke consistency + thin wrappers

**Phase:** 2 · **Blocked by:** S4, S5.

### What to build
Make exactly one skill model-invoked (`ducking`); every user-facing mode
(`duck-prebuild`, `duck-verify`, `duck-review`, `duck-orient`) and the `duck` router become
user-invoked and **thin** — they set the phase-specific framing and call the engine, holding no
duplicated loop logic. There are currently **two** model-invocation leaks, not one: `duck-design`
(flagged in the handoff) **and** the `duck` router itself — both lack `disable-model-invocation:
true` (only `duck-plan`/`verify`/`review`/`orient` set it today). Both must end up user-invoked,
with `ducking` the sole model-invoked skill.

### Acceptance criteria
- [ ] Exactly one skill is model-invocable (`ducking`); all others set `disable-model-invocation: true`.
- [ ] No user-facing wrapper duplicates the engine loop — each calls `ducking`.
- [ ] The previous `duck-design` auto-pop behavior no longer occurs from a wrapper.

### Blocked by
S6 depends on S4 and S5.

---

## S7 — Config dial

**Phase:** 3 · **Blocked by:** S3, S4.

### What to build
A persistent config at `${CLAUDE_PLUGIN_DATA}/config.json` with `enabled` (default on; flip off
on deadline days) and a default intensity (`quick` / `standard` / `deep`). Use an explicit
`.enabled == false` check (guard the `//`-style footgun). Both the ship hooks and the skills
honor it — `enabled: false` silences everything.

### Acceptance criteria
- [ ] With `enabled: false`, ship-point confrontations do not fire and the skills no-op.
- [ ] Default intensity is read by the `ducking` engine.
- [ ] A missing or malformed config file defaults to enabled / standard rather than crashing.

### Blocked by
S7 depends on S3 (the hooks must read `enabled`) and S4 (the engine reads intensity).

---

## S8 — Turn-scoping for duck-verify

**Phase:** 3 · **Blocked by:** S6.

### What to build
`duck-verify` should catch the edits made *this session* beyond what `git diff` shows — parse
the transcript for `Edit`/`Write`/`MultiEdit`/`NotebookEdit` since the last user prompt
(technique adapted from no-numb's gate). Parse defensively: a transcript-format change must
degrade gracefully, not crash.

### Acceptance criteria
- [ ] An uncommitted edit made earlier this session is surfaced by `duck-verify`.
- [ ] Behavior still works when there is a clean `git diff` (session edits already committed).
- [ ] A transcript that can't be parsed degrades to the `git diff` path instead of erroring.

### Blocked by
S8 depends on S6 (the `duck-verify` wrapper is finalized).

---

## S9 — Identity rewrite + 3.0.0 bump

**Phase:** 3 · **Blocked by:** S5.

### What to build
Rewrite the plugin identity in README, `plugin.json`, and `marketplace.json`: a
comprehension-maintenance layer across the whole AI-coding lifecycle that merges with peer
skills (grill-with-docs, `/branch`) when present and stands alone when not — not narrowed to
after-build only. S9 is the **sole writer** of the `plugin.json` and `marketplace.json`
**description** strings (S5 deliberately leaves them untouched), so the rewrite is where the
removed `/duck-design` and `/duck-plan` names finally drop out of those two manifests. Bump the
version to `3.0.0` (breaking: `/duck-design` and `/duck-plan` are removed). Local-source plugin,
so the version lives in `marketplace.json` only.

### Acceptance criteria
- [ ] README and both manifests describe the lifecycle-wide identity; no after-build-only framing.
- [ ] Descriptions list only the current commands (no removed `/duck-design`, `/duck-plan`).
- [ ] `marketplace.json` version is `3.0.0`.

### Blocked by
S9 depends on S5 (commands are renamed there).
