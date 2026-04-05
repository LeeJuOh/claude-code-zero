---
name: codex-research
description: "Deep-dive research using Codex with Claude's cross-model synthesis. Use when the user asks \"codex research\", \"codex 리서치\", \"codex 분석\", \"코덱스로 조사\", \"딥다이브\", \"이슈 분석해줘\". NOT for code review or plan verification."
argument-hint: "topic or question | path/to/document.md"
allowed-tools: ["Bash", "Read", "Grep", "Glob", "Write"]
---

# Codex Research + Cross-Model Synthesis

Use Codex for deep-dive research via the companion task subcommand. Claude evaluates, verifies claims, fills gaps, and synthesizes a combined analysis.

## Step 1: Determine Research Task

Parse $ARGUMENTS:

| Input | Action |
|-------|--------|
| A question or topic | Research directly |
| Path to a file | Read file, use as context |
| `resume [follow-up]` | Pass `--resume-last "[follow-up]"` to companion task |
| (no args) | Ask user: "What should I research?" |

## Step 2: Build Research Prompt

Read `${CLAUDE_PLUGIN_ROOT}/references/gpt-prompting.md` for XML tag structure.

Adapt `<task>` to context:
- Issue investigation → "root cause analysis, reproduction steps"
- Technology comparison → "trade-offs, real-world adoption, gotchas"
- Architecture → "patterns, anti-patterns, scale"
- General → "breadth first, then depth on interesting findings"

Write to `${CLAUDE_PLUGIN_DATA}/tmp/codex-research-prompt.txt`:

```
<task>
You are a technical researcher conducting a deep investigation.
Topic: {{USER_QUESTION_OR_TOPIC}}
{{#if DOCUMENT}}Context document is provided below.{{/if}}
Investigate thoroughly. Use web search if helpful.
Surface non-obvious insights, not just the first answer.
</task>

<compact_output_contract>
Structured analysis with clear sections.
Separate: observed facts, reasoned inferences, open questions.
Identify risks, trade-offs, alternative perspectives.
</compact_output_contract>

<research_mode>
Breadth first, then depth where evidence changes the recommendation.
</research_mode>

<citation_rules>
Cite sources. Prefer primary. Say "I'm not sure" rather than guessing.
</citation_rules>

<grounding_rules>
Ground claims in evidence. Label hypotheses clearly.
</grounding_rules>

{{#if DOCUMENT}}
<context_document>
{{DOCUMENT_CONTENT}}
</context_document>
{{/if}}
```

Create directory if needed: `mkdir -p ${CLAUDE_PLUGIN_DATA}/tmp`

## Step 3: Execute via Companion Script

```bash
CODEX_COMPANION=$("${CLAUDE_PLUGIN_ROOT}/scripts/resolve-companion.sh")
```

If resolve fails: direct to `/codex-setup`.

```bash
node "$CODEX_COMPANION" task --prompt-file "${CLAUDE_PLUGIN_DATA}/tmp/codex-research-prompt.txt"
```

Timeout: 300000ms (5 minutes). Job is tracked and visible in `/codex:status`.

## Step 4: Double-Check & Synthesize

Read `${CLAUDE_PLUGIN_ROOT}/references/evaluation.md`.

1. **Verify claims** — Check facts against own knowledge. Flag fabrications.
2. **Fill gaps** — Add perspectives Codex missed.
3. **Challenge assumptions** — Call out unstated assumptions.
4. **Synthesize** — Combine findings into coherent analysis.

Adapt output format to question:
- Comparison → table
- Pros/cons → list
- Root cause → chain
- Survey → categorized bullets

## Step 5: Save & Clean Up

Save to `${CLAUDE_PLUGIN_DATA}/reviews/research-<YYYYMMDD-HHMMSS>.md`:

```markdown
# Codex Research — <date>

## Topic
<what was investigated>

## Codex Findings
<verbatim>

## Claude's Evaluation & Synthesis
<independent analysis>

## Agreement: <High|Partial|Disagreement>

## Key Takeaways
- <actionable conclusions>
```

```bash
rm -f ${CLAUDE_PLUGIN_DATA}/tmp/codex-research-prompt.txt
```

## Gotchas

- **Codex can hallucinate sources and facts.** Verify specific claims.
- **Value is in synthesis.** If Claude reaches same conclusion alone, Codex added nothing.
- **Do not auto-fix.** Present findings, wait for user.
- **Resume supported.** User can `/codex-research resume [follow-up]` — pass `--resume-last` to companion.
