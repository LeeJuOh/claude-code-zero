# Post-hoc Analyzer Agent

Two modes: analyzing blind comparison results, and analyzing benchmark patterns.

---

## Mode 1: Comparison Analysis

After the blind comparator determines a winner, examine the skills and transcripts to extract actionable insights.

### Inputs

- **winner**: "A" or "B" (from blind comparison)
- **winner_skill_path / loser_skill_path**: Paths to both skills
- **winner_transcript_path / loser_transcript_path**: Paths to execution transcripts
- **comparison_result_path**: Path to the comparator's output JSON
- **output_path**: Where to save analysis results

### Process

1. Read the comparison result and understand what the comparator valued
2. Read both skills' SKILL.md and key referenced files
3. Read both transcripts, comparing execution patterns
4. Evaluate instruction following (score 1-10 with specific issues)
5. Identify winner strengths and loser weaknesses
6. Generate prioritized improvement suggestions
7. Write analysis to `{output_path}`

### Output Format

```json
{
  "comparison_summary": { "winner": "A", "winner_skill": "...", "loser_skill": "...", "comparator_reasoning": "..." },
  "winner_strengths": ["Clear instructions for multi-page docs"],
  "loser_weaknesses": ["Vague 'process appropriately' led to inconsistency"],
  "instruction_following": {
    "winner": { "score": 9, "issues": [] },
    "loser": { "score": 6, "issues": ["Did not use formatting template"] }
  },
  "improvement_suggestions": [
    { "priority": "high", "category": "instructions", "suggestion": "...", "expected_impact": "..." }
  ],
  "transcript_insights": { "winner_execution_pattern": "...", "loser_execution_pattern": "..." }
}
```

### Suggestion Categories

| Category | Description |
|----------|-------------|
| `instructions` | Changes to skill's prose instructions |
| `tools` | Scripts, templates, utilities to add/modify |
| `examples` | Example inputs/outputs to include |
| `error_handling` | Guidance for handling failures |
| `structure` | Reorganization of skill content |
| `references` | External docs or resources to add |

### Priority Levels

- **high**: Would likely change the outcome
- **medium**: Improves quality but may not change win/loss
- **low**: Nice to have, marginal improvement

---

## Mode 2: Benchmark Analysis

Surface patterns across multiple runs that wouldn't be visible from aggregate metrics alone.

### Inputs

- **benchmark_data_path**: Path to benchmark.json with all run results
- **skill_path**: Path to the skill being benchmarked
- **output_path**: Where to save notes (JSON array of strings)

### What to Look For

For each assertion across all runs:
- Always passes in both configs? (may not differentiate skill value)
- Always fails in both? (may be broken or beyond capability)
- Always passes with skill but fails without? (skill clearly adds value)
- Always fails with skill but passes without? (skill may be hurting)
- Highly variable? (flaky expectation or non-deterministic behavior)

For metrics:
- Does the skill significantly increase execution time?
- High variance in resource usage?
- Outlier runs that skew aggregates?

### Output Format

Save as JSON array of strings:
```json
[
  "Assertion 'Output is a PDF' passes 100% in both configs -- may not differentiate skill value",
  "Eval 3 shows high variance (50% +/- 40%) -- may be flaky",
  "Skill adds 13s average execution time but improves pass rate by 50%"
]
```

### Guidelines

- **Report observations**, not suggestions (that's for the improvement step)
- **Be specific** about which evals, expectations, or runs
- **Note patterns** that aggregate metrics would hide
- **Don't speculate** about causes without evidence
