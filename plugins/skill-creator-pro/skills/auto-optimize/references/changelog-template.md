# changelog.md templates

The changelog is a structured document that a later session (or fresh context) reads to continue without repeating failed experiments. Keep these three sections.

## Current Understanding (update after every kept mutation)

```markdown
## Current Understanding

**What works:**
- Specific hex color codes prevent neon color failures (Exp 3)
- Worked examples are more effective than rules for formatting (Exp 5)

**What doesn't work:**
- Font size instructions alone don't fix legibility -- model ignores px values (Exp 2)
- Vague color descriptions ("pastel", "soft") are unreliable

**Remaining failures:**
- Eval 4 (label formatting) still fails 30% -- labels overlap on dense diagrams
```

## Experiment Log (append after every experiment)

```markdown
## Experiment [N] -- [keep/discard/marginal]

**Score:** [X]/[max] ([percent]%)
**Per-eval:** [Eval1: 5/5] [Eval2: 3/5 DOWN] [Eval3: 4/5]
**Hypothesis:** [What you diagnosed from reflection]
**Change:** [One sentence describing what was changed]
**Result:** [What actually happened -- which evals improved/declined]
**Failing outputs:** [Brief description of what still fails]
```

## Ideas Backlog (add during reflection, prune after trying)

```markdown
## Ideas Backlog

- [ ] Try on-demand hook to block destructive operations
- [ ] Move the API reference table to references/ -- 40 lines of noise in main body
- [x] ~~Add worked example for edge case~~ (tried Exp 5, kept)
- [x] ~~Increase font size instruction~~ (tried Exp 2, didn't work)
```

