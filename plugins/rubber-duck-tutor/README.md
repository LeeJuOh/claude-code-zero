# rubber-duck-tutor

> If you can't explain it to a duck, you don't understand it.

## Why

AI coding assistants generate code fast. The trap is what happens to *you* — plans look reasonable, code compiles, reviews pass, and at no point did you engage deeply enough to understand what was built. [Anthropic's research](https://www.anthropic.com/research/AI-assistance-coding-skills) found that developers who passively accept AI-generated code score 17% lower on comprehension — but developers who ask questions and request explanations perform just as well as those coding by hand.

This plugin builds that questioning habit into your workflow. The duck asks you questions about the code, then waits. No hints, no teaching — just a question and silence. If you can't explain it, you've found a gap.

## Features

| Mode | When | What it checks |
|------|------|----------------|
| `/duck plan` | After a plan is created | Do you understand the decisions and trade-offs? |
| `/duck verify` | After implementation | Can you explain the code and find edge cases? |
| `/duck review` | Before commit/merge | Can you justify every change in the diff? |
| `/duck orient` | New to a codebase | Can you navigate and explain the repo structure? |

`/duck` with no argument auto-detects the right mode from context.

Auto-hooks suggest duck sessions at workflow checkpoints — plan creation, spec documents, PR/MR creation, and session end. The duck speaks in character (🦆 꽥). Rate-limited to 2 suggestions per session.

## Prerequisites

- **jq** (recommended, `brew install jq`) — hooks fall back to regex without it

## Install

```shell
/plugin install rubber-duck-tutor@claude-code-zero
```

## Usage

```
/duck              # auto-detect mode
/duck plan         # review a plan
/duck verify       # verify implementation
/duck review       # review changes before commit
/duck orient       # codebase orientation
```

## License

MIT
