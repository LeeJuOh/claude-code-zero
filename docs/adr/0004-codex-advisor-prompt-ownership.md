---
status: accepted
---

# 0004 — codex-advisor prompt ownership: native is untouchable, task is vendored, rescue shapes adaptively

## Context

codex-advisor is a wrapper that lets Claude use Codex as a double-check / review peer.
It does **not** call the Official Codex plugin's skills, agent, or slash commands. It resolves
the companion binary (`codex-companion.mjs`) via `scripts/resolve-companion.sh` and invokes the
companion subcommands directly, bypassing the entire official prompt layer
(`commands/*.md`, `agents/codex-rescue.md`, `skills/gpt-5-4-prompting`).

The driving question: **does our wrapper distort the official prompts?** The answer is not
uniform — it splits by who owns the prompt for each companion subcommand:

- **`review`** — native built-in reviewer. The prompt lives server-side in the Codex
  app-server. Neither the official command nor codex-advisor authors it.
- **`adversarial-review`** — the companion loads `prompts/adversarial-review.md` server-side and
  interpolates `USER_FOCUS` (focus text) + `REVIEW_INPUT` (companion-gathered repo context)
  (`codex-companion.mjs:239-245`). The official adversarial prompt is applied by the code path we
  call; a caller can only supply focus text + flags.
- **`task`** (used by verify / research / rescue) — `readTaskPrompt` returns
  `positionalPrompt || readStdinIfPiped()` **raw** (`codex-companion.mjs:613-619`). The companion
  wraps nothing. There is **no official task prompt**. The official prompt-shaping for task lives
  only in advisory material: `agents/codex-rescue.md` and the `gpt-5-4-prompting` skill
  (`user-invocable: false`), which codex-advisor bypasses.

So "the wrapper distorts the official prompt" is **structurally impossible** for review /
adversarial (server-side, unreachable), and **undefined** for task (no official prompt exists —
only our own prompt quality matters).

A `task`-path prompt is therefore 100% codex-advisor's responsibility. Today verify/research use
static XML templates; commit `f0a74a1` ("v3.0.0 — … GPT-5.4 prompting …") shows those blocks were
modeled on the official `gpt-5-4-prompting` guide at design time — but the shipped files cite no
source (`grep` finds none). rescue alone sends the user's text raw, with no scaffolding.

Note: the official guide is `gpt-5-4-prompting` (GPT-5.4), while codex-advisor's default model is
`gpt-5.5`. The official plugin ships no 5.5 prompting guide — it is itself one model-generation
behind.

## Decision

**Prompt ownership is the load-bearing distinction.**

1. **Native paths (review / adversarial-review):** pass flags + focus text only. We do not and
   cannot author these prompts. Distortion risk is zero by construction — keep it that way. Never
   route code review through `task` (that would replace the verified native review contract with
   our own prompt — the real distortion).

2. **Task paths, fixed task type (verify / research):** keep static per-skill templates. Their XML
   blocks (`task`, `compact_output_contract`, `grounding_rules`, `completeness_contract`,
   `research_mode`, `citation_rules`) are **vendored** from the official `gpt-5-4-prompting`
   `prompt-blocks.md` — copied and internalized at design time, **not** imported at runtime.
   Rationale: determinism, Phase 1.5 previewability (the user approves the exact text sent), and
   double-check independence (no per-run LM re-shaping).

3. **Task path, variable task type (rescue) — B2:** rescue's task is open-ended (implement /
   debug / investigate), so no single static template fits. The rescue skill's own LM selects
   task-appropriate blocks at Phase 1 and wraps the user's **verbatim** task text; the user
   approves the wrapped prompt at Phase 1.5. The independence argument that justifies static
   verify/research does **not** apply to rescue — its double-check runs on the resulting diff,
   post-hoc, so shaping the input prompt does not contaminate it. Write-capable runs add
   `action_safety`; read-only runs add `grounding_rules`.

The user's words are never rewritten — only wrapped in standard scaffolding they approve. That
keeps the original "don't lead Codex in the wrong direction" concern satisfied.

## Considered options

- **(A) Re-import the official rescue path** (`agents/codex-rescue.md` + runtime
  `gpt-5-4-prompting`) — rejected: breaks the uniform "companion-direct" architecture,
  reintroduces version-pinned skill-file coupling, and yields a non-deterministic prompt that
  defeats Phase 1.5 preview.
- **(B) Runtime-reference the official guide for verify/research too** — rejected: it is
  `user-invocable: false` guidance (a block *menu*, not a function), lives at a version-pinned path
  (`cache/openai-codex/codex/<ver>/…`), and is LM-applied → non-deterministic, breaking preview and
  independence. The duplicated surface is ~5 XML blocks; abstraction cost > duplication cost.
- **(C) Keep rescue raw passthrough** — rejected: write-capable runs ship with no `action_safety`,
  and a blindly-approved vague prompt has no scaffolding — below official quality for the one
  command where output quality (not independence) is the goal.
- **(D, chosen) Native untouched + verify/research vendored-static + rescue adaptive (B2).**

## Consequences

- **Provenance debt is now explicit and must be paid.** Vendored blocks carry no source marker in
  shipped files. Add a provenance note (verify / research / rescue / `companion-usage.md`) naming
  the official `gpt-5-4-prompting` origin and a **re-sync trigger** when the official plugin bumps
  its prompting guide (e.g. a future `gpt-5-5-prompting`). Without it, a maintainer cannot tell the
  blocks are vendored and will not know to re-sync.
- **rescue gains official-grade structure** while preserving user intent (task text verbatim). The
  Phase 1.5 human gate replaces the official LM-agent auto-shaping — arguably higher intent
  fidelity, at the cost of the user having to read the wrapped prompt.
- **The distortion worry is permanently bounded.** It is impossible for review/adversarial
  (server-side) and undefined for task (no official prompt). Future audits should check our own
  prompt quality against the vendored guide, not hunt for "official prompt corruption".
- **Block selection is now per-task-type** (verify=4 blocks, research=5 blocks, rescue=variable).
  Drift between our vendored blocks and the official guide is the new maintenance surface, tracked
  by the provenance note.
