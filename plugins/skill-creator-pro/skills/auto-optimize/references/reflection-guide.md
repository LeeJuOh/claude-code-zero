# Reflection Guide

How to diagnose failures and form targeted mutations, instead of guessing.

---

## Why Reflection Matters

The naive approach: score drops on Eval 3, so you add an instruction about Eval 3. Maybe it helps, maybe it doesn't -- you're guessing at the cause based on which eval failed.

The reflection approach: score drops on Eval 3, so you **read the actual failing outputs**, see that the model consistently generates a bulleted list where a table was expected, trace this back to the instruction "present the data clearly" which is ambiguous, and replace it with "present the data as a markdown table." You know exactly what to fix and why.

This is GEPA's "Actionable Side Information" (ASI) pattern adapted for skill optimization. Instead of using scalar scores as your only signal, you use the full output as diagnostic evidence.

---

## The Reflection Process

### 1. Collect

Gather every output from the latest experiment that failed at least one eval. Include the full output, not a summary -- the diagnosis depends on details you might not think to preserve.

### 2. Compare

Look at the failing outputs side by side:
- **Same failure across outputs?** There's a systematic gap in the skill instruction.
- **Different failures each time?** The instruction may be ambiguous -- the model interprets it differently each run.
- **Partial success?** The output is mostly right. Find the exact point where it diverges from the expected behavior.

Also compare against passing outputs:
- What did the passing outputs do differently?
- Was the difference in the model's interpretation, or in the input scenario?

### 3. Trace Back

For each failure pattern, find the responsible instruction in SKILL.md:

| Failure Pattern | Root Cause Type | Example |
|---|---|---|
| Model does X when it should do Y | Ambiguous instruction | "use appropriate colors" -> model picks neon |
| Model skips step entirely | Missing instruction | No mention of validation step |
| Model does the right thing inconsistently | Weak instruction | "try to include" vs "always include" |
| Model over-applies a rule | Over-specified instruction | "never use lists" blocks even appropriate uses |
| Output format wrong | Format not demonstrated | Description without example |

### 4. Hypothesize

Write your hypothesis in this format:

```
HYPOTHESIS: [Eval N] fails because [specific instruction or gap] causes [specific model behavior].
PREDICTION: Changing [specific text] to [specific replacement] will fix [this eval] without affecting [other evals].
RISK: This change might [potential side effect] because [reasoning].
```

The hypothesis must be **falsifiable** -- after the experiment, you can clearly say it was right or wrong.

**Bad hypothesis:** "The skill needs more detail about colors."
**Good hypothesis:** "Eval 2 fails because 'use soft colors' is subjective. The model picks saturated blues 4/5 times. Replacing with hex codes #E8E8E8, #B0C4DE, #98D8C8 will make Eval 2 pass consistently. Risk: specific colors might not suit all diagram types."

---

## Common Reflection Patterns

### Pattern: Consistent failure on the same eval
The instruction is either missing or too vague. Add or strengthen it.

### Pattern: Eval passes sometimes, fails other times
The instruction exists but is ambiguous. The model interprets it differently each run. Make it more specific, or add an example that demonstrates the expected behavior.

### Pattern: One eval improved, another regressed
The new instruction conflicts with an existing one, or it over-constrains the model. Look for tension between instructions. Sometimes the fix is to merge two conflicting instructions into one coherent rule.

### Pattern: Mutation helped on test input A but not B
The skill may be overfitting to one scenario. The fix should generalize -- explain the principle, not just the specific case.

### Pattern: Model follows the letter but not the spirit
The instruction is too mechanical. Replace with reasoning: "We do X because Y happens otherwise" lets the model adapt to edge cases you didn't anticipate.

---

## Example Reflection Chain

**Experiment 2 results:** Score 17/20. Eval 3 ("Color contrast") failed 3/5 times.

**Step 1 -- Collect:** Read the 3 failing outputs.

**Step 2 -- Compare:**
- Output A: Used dark blue text on dark purple background
- Output B: Used light gray text on white background
- Output C: Used neon green on bright yellow
- All 3 have low contrast. The 2 passing outputs used black-on-white.

**Step 3 -- Trace back:** The skill says "use visually appealing colors." This is subjective -- the model optimizes for "appealing" and ignores contrast. There's no instruction about readability.

**Step 4 -- Hypothesize:** "Eval 3 fails because 'visually appealing' doesn't imply readable. The model picks aesthetically interesting color combos that happen to have poor contrast. Adding 'ensure high contrast between text and background -- dark text on light backgrounds or vice versa' should fix Eval 3. Risk: might make diagrams look plain, but readability trumps aesthetics for this skill."

**Result after mutation:** Eval 3 went from 2/5 to 5/5. Other evals unchanged. Hypothesis confirmed.

---

## When Reflection Doesn't Help

Sometimes you've read the failures, traced the cause, and still can't figure out why the model does what it does. This is normal. In this case:

1. **Try the opposite.** If you've been adding instructions, try removing one that might be causing confusion.
2. **Try an example.** A concrete example often communicates what prose cannot.
3. **Try restructuring.** Move the problematic section higher in the skill (models weight earlier content more) or into a reference file (reduces noise).
4. **Log it as an open question** in the Ideas Backlog and move on to a different eval's failures.

Don't spend more than 2 experiments on a single hypothesis family. If "make the color instruction more specific" didn't work twice, the root cause is probably elsewhere.
