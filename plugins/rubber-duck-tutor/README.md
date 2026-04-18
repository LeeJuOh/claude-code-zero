# rubber-duck-tutor

> If you can't explain it to a duck, you don't understand it.

## Why

AI coding assistants generate code fast. The trap is what happens to *you* — plans look reasonable, code compiles, reviews pass, and at no point did you engage deeply enough to understand what was built. [Anthropic's research](https://www.anthropic.com/research/AI-assistance-coding-skills) found that developers who passively accept AI-generated code score 17% lower on comprehension — but developers who ask questions and request explanations perform just as well as those coding by hand.

This plugin builds that questioning habit into your workflow. The duck asks you questions about the code, then waits. No hints, no teaching — just a question and silence. If you can't explain it, you've found a gap.

**Learning shouldn't compete with productivity.** When the duck suggests a review, it guides you to `/branch` first — fork the conversation, do the review there, and return to your main work with `/resume`. No interrupted flow, no "I'll do it later" that never happens.

## Features

| Mode | When | What it checks |
|------|------|----------------|
| `/duck design` | *Before* asking AI to implement | Can you sketch the shape yourself first, so you'll spot where the AI answer differs? |
| `/duck plan` | After a plan is created | Do you understand the decisions and trade-offs? |
| `/duck verify` | After implementation | Can you explain the code, find edge cases, and fix a bug with your own hands? |
| `/duck review` | Before commit/merge | Can you justify every change — and predict where it'll hurt in 6 months? |
| `/duck orient` | New to a codebase | Can you navigate and explain the repo structure? |

`/duck` with no argument auto-detects the right mode from context.

Auto-hooks suggest duck sessions at workflow checkpoints — plan creation, spec documents, PR/MR creation, and git push. When triggered, the duck suggests `/branch` + `/duck <mode>` so the review happens in a forked conversation without interrupting your work. Rate-limited to 2 suggestions per session.

## Prerequisites

- **jq** (recommended, `brew install jq`) — hooks fall back to regex without it

## Install

```shell
/plugin install rubber-duck-tutor@claude-code-zero
```

## Usage

```
/duck              # auto-detect mode
/duck design       # sketch before asking AI to implement
/duck plan         # review a plan
/duck verify       # verify implementation
/duck review       # review changes before commit
/duck orient       # codebase orientation
```

## License

MIT
