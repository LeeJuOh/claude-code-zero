# rubber-duck-tutor

A Claude Code plugin that protects your coding skills while using AI. Makes you explain things to a duck — because if you can't explain it, you don't understand it.

## The Problem

AI coding assistants are great at generating code. The trap is what happens to *you* in the process.

Plans look reasonable — you approve. Code compiles — you move on. Reviews pass — you merge. At no point did you engage deeply enough to actually understand what was built. [Anthropic's research](https://www.anthropic.com/research/AI-assistance-coding-skills) found that developers who passively accept AI-generated code score **17% lower** on comprehension. The same study found that **how** you use AI matters more than **whether** you use it — developers who asked questions and requested explanations performed just as well as those coding by hand.

This plugin builds that questioning habit into your workflow.

## How It Works

The duck asks you questions about the code you just wrote (or approved), then waits. No hints, no teaching, no "think about..." — just a question and silence. You explain. If you can't, you've found a gap. That gap is where the learning happens.

Three modes map to the moments where rubber-stamping is most dangerous:

| Mode | When | What it checks |
|---|---|---|
| `/duck plan` | After a plan is created | Do you understand the decisions and trade-offs? |
| `/duck verify` | After implementation | Can you explain the code and find edge cases? |
| `/duck review` | Before commit/merge | Can you justify every change in the diff? |

`/duck` with no argument auto-detects the right mode from context.

### What makes this different from code review

This isn't about finding bugs. It's about whether *you* understand the code. A code review checks if the code is correct. The duck checks if the developer is engaged.

## Key Behaviors

- **One question at a time** — never batches questions
- **Hard stop after asking** — waits for your answer before continuing
- **No hints** — if you're stuck, it points you to the file, not the answer
- **Fading scaffolding** — starts with "open file X, line N" and gradually asks "where would you look?"
- **Intensity scaling** — 30-second quick check if you nail it, 15-minute deep dive if gaps appear
- **Confidence check** — "rate 1-10" surfaces uncertainty you might not notice
- **Gap summary** — names what you didn't know so you can revisit later

## Installation

```bash
claude plugin install rubber-duck-tutor@claude-code-zero
```

Auto-hooks (suggestions after commits and plan creation) are included by default.

### Recommended: install jq

The auto-hooks use [`jq`](https://jqlang.github.io/jq/) for reliable JSON parsing. Without it, hooks fall back to regex extraction which works for common cases but may fail on unusual input.

```bash
brew install jq    # macOS
apt-get install jq # Debian/Ubuntu
```

## Usage

```
/duck              # Auto-detect mode
/duck plan         # Review a plan
/duck verify       # Verify implementation
/duck review       # Review changes before commit
```

## The Science

The techniques are grounded in learning science research: the generation effect (producing answers beats reading them), desirable difficulties (struggle strengthens memory), the fluency illusion (readable code feels understood even when it isn't), and spaced retrieval (returning to concepts over time). Full details in the skill's bundled references.

Adapted from [learning-opportunities](https://github.com/DrCatHicks/learning-opportunities) by Dr. Cat Hicks (CC-BY-4.0). Rubber duck debugging concept from *The Pragmatic Programmer* by Hunt & Thomas.

## License

MIT
