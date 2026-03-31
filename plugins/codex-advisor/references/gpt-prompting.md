# GPT-5.4 Prompting Guide

Patterns for composing effective Codex/GPT-5.4 prompts. All codex-advisor skills should follow these patterns when building prompts for `codex exec`.

## Core Principles

1. **One task per run.** Split unrelated asks into separate runs.
2. **State what done looks like.** Don't assume Codex infers the desired end state.
3. **Prefer better contracts over higher reasoning.** Tighten the prompt before raising `model_reasoning_effort`.
4. **Use XML tags consistently.** Stable structure > natural language explanation.
5. **Ground claims.** Add grounding rules for any task where unsupported guesses would hurt quality.

## Prompt Blocks

Wrap each block in its XML tag. Use only the blocks the task needs.

### Core (use in every prompt)

```xml
<task>
Concrete job, relevant context, expected end state.
</task>
```

### Output Format (pick one)

```xml
<structured_output_contract>
Return exactly the requested output shape and nothing else.
Keep the answer compact.
Put the highest-value findings or decisions first.
</structured_output_contract>
```

```xml
<compact_output_contract>
Keep the final answer compact and structured.
Do not include long scene-setting or repeated recap.
</compact_output_contract>
```

### Follow-through

```xml
<default_follow_through_policy>
Default to the most reasonable low-risk interpretation and keep going.
Only stop to ask questions when a missing detail changes correctness, safety, or an irreversible action.
</default_follow_through_policy>
```

```xml
<completeness_contract>
Resolve the task fully before stopping.
Do not stop at the first plausible answer.
Check whether there are follow-on fixes, edge cases, or cleanup needed for a correct result.
</completeness_contract>
```

```xml
<verification_loop>
Before finalizing, verify the result against the task requirements and the changed files or tool outputs.
If a check fails, revise the answer instead of reporting the first draft.
</verification_loop>
```

### Grounding

```xml
<grounding_rules>
Ground every claim in the provided context or your tool outputs.
Do not present inferences as facts.
If a point is a hypothesis, label it clearly.
</grounding_rules>
```

```xml
<missing_context_gating>
Do not guess missing repository facts.
If required context is absent, retrieve it with tools or state exactly what remains unknown.
</missing_context_gating>
```

```xml
<citation_rules>
Back important claims with citations or explicit references to the source material you inspected.
Prefer primary sources.
</citation_rules>
```

### Safety & Scope

```xml
<action_safety>
Keep changes tightly scoped to the stated task.
Avoid unrelated refactors, renames, or cleanup unless they are required for correctness.
Call out any risky or irreversible action before taking it.
</action_safety>
```

### Task-Specific

```xml
<dig_deeper_nudge>
After you find the first plausible issue, check for second-order failures, empty-state behavior, retries, stale state, and rollback paths before you finalize.
</dig_deeper_nudge>
```

```xml
<research_mode>
Separate observed facts, reasoned inferences, and open questions.
Prefer breadth first, then go deeper only where the evidence changes the recommendation.
</research_mode>
```

## Block Selection by Task Type

| Task | Required Blocks | Optional Blocks |
|------|----------------|-----------------|
| **Review** | `task`, `structured_output_contract`, `grounding_rules` | `dig_deeper_nudge`, `verification_loop` |
| **Adversarial review** | `task`, `structured_output_contract`, `grounding_rules`, `dig_deeper_nudge` | `verification_loop` |
| **Document verification** | `task`, `compact_output_contract`, `grounding_rules` | `completeness_contract` |
| **Research** | `task`, `compact_output_contract`, `research_mode`, `citation_rules` | `grounding_rules` |
| **Diagnosis** | `task`, `compact_output_contract`, `verification_loop`, `missing_context_gating` | `default_follow_through_policy` |

## Anti-Patterns

**Vague framing** — "Take a look at this and let me know what you think." → Use `<task>` with concrete scope.

**Missing output contract** — "Investigate and report back." → Always specify the output shape.

**Raising reasoning instead of tightening the prompt** — "Think harder" → Add `<verification_loop>` or `<grounding_rules>`.

**Mixing unrelated jobs** — "Review, fix, update docs, and suggest roadmap" → Split into separate runs.

**Unsupported certainty** — "Tell me exactly why production failed" → Add `<grounding_rules>` to separate fact from inference.
