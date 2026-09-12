---
status: accepted
---

# 0012 — Double-check runs in a fresh subagent; independence is enforced by structure, not instruction

## Context

codex-advisor exists to use Codex as an **independent** reviewer of work the main Claude session
produced. Every skill ends with a double-check (Phase 4) in which Claude classifies each Codex
finding as Agreed / Disputed / Nuanced / False Positive / Uncited.

Until now that double-check was performed by the **main session** — the same context that wrote
the code under review. The north star "do not read source before Codex returns" was only an
instruction (the plugin ships one `SessionStart` hook and nothing else), and it could not help
anyway: the main session does not need to read the code, it already has it in context as the
author. `references/evaluation.md`'s "Self-Bias Awareness" section ("I authored some of this code,
so I may have blind spots") is a confession of the problem, not a fix. Anthropic's harness
write-up records the observed failure directly: Claude finds the problem and then talks itself out
of it.

Three alternatives were on the table:

1. **Strengthen the instruction** (more emphatic "do not rationalize"). Rejected — a natural-language
   rule cannot erase pre-call contamination; the author already knows the code.
2. **PreToolUse hook** blocking `Read`/`Grep` before Phase 4. Rejected — it addresses reading, not
   authorship, and the hook cannot tell which phase the skill is in. (A different hook — one that
   fixes the Verifier's *input* — was adopted later; see Amendment.)
3. **Keep the status quo.** Rejected — the plugin's only purpose is independent review; a reviewer
   who is also the author defeats it.

## Decision

Phase 4 is split so that the main session never judges a finding:

- **Fact by script.** A deterministic script checks each cited `file:line` for existence and
  assigns `ok` / `missing` / `uncited`. False Positive and Uncited are decided here, not by a model.
  The same script groups findings that cite the same file with overlapping line ranges; grouping is
  never a model's discretion.
- **Judgment by a fresh subagent.** One subagent per finding group, defined under `agents/`, with
  `Read`/`Grep` only. Its input is the finding, its citation, the existence result, and the
  classification rules — no session history, no authorship. It returns a single JSON verdict
  (Agreed / Disputed / Nuanced + evidence). Its prompt is tuned skeptical: default to Disputed,
  no commitment to the original finding, JSON only.
- **Aggregation by the main session.** It parses Codex output, launches the subagents, collects
  the JSON, and writes the report labelled `Verifier: fresh subagent`. It does not alter verdicts.
- **Degraded mode.** When the Agent tool is unavailable (headless), the main session performs the
  old Phase 4 and labels the report `Self-verified — independent sub-task unavailable`.

Applies to all five double-checking skills. For verify/research the subagent receives the document
plus the Codex result and checks citations itself (no script — the input is bounded and section/URL
citations are not `file:line`). For rescue `--write` the judged object is the diff. The subagent
model is inherited from the session, never pinned. No size threshold: one finding still gets a
subagent.

## Consequences

- Independence no longer depends on the main session obeying "do not read". The verifier has
  nothing to defend because it wrote nothing. Reading during Phases 1–3 is no longer a leak worth
  a hook.
- Token cost rises with finding count (shared prefix is cache-hit; only the finding differs). Zero
  findings cost nothing extra. Latency is flat because subagents run in parallel.
- Residual bias is model-level, not session-level: the subagent is still Claude. The skeptical
  prompt is the mitigation; its strength is an implementation concern, not an architectural one.
- Changing this back means re-merging Phase 4 into five SKILL.md files and deleting the agent and
  script — deliberate friction.

## Amendment 2026-09-12 — the Verifier's prompt is written by script and enforced by hook

The main session launches each Verifier with the `Agent` tool, and it writes that call's `prompt`.
The author of the code can slip one sentence of defence into it ("the caller already guards this"),
and the fresh subagent would judge with the author's opinion in hand — the write-side leak of
the read-side fix. Instructing "pass it verbatim" would make independence depend on obedience
again, contradicting the first consequence above.

So the script that checks citations also writes one payload file per finding group plus a
manifest of sha256 hashes, and a plugin `PreToolUse` hook (matcher `Agent`) fires only when
`subagent_type` is the Verifier: it reads the payload path out of the prompt, checks the hash, and
replaces the whole prompt with the file's content via `updatedInput`; missing path, missing file or
hash mismatch is denied. Anything the main session appended is discarded before the Verifier
sees it. Measured 2026-09-12 in `claude -p`: the hook receives `prompt` and `subagent_type`, and
the subagent answers the replaced prompt.

This does not reopen alternative 2: that hook needed to know the skill's phase; this one only
inspects `subagent_type`.

Related: [[0004]] (prompt ownership — task path is ours, native path untouched), spec 016.
