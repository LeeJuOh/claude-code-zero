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

Auto-hooks suggest duck sessions at workflow checkpoints — plan creation, spec documents (Write on `plan*.md` / `spec*.md` / `design*.md` — deterministic, non-AI, non-conversational files like README / CHANGELOG / CLAUDE.md are filtered out), `gh pr create` / `glab mr create`, and `git push`. Hook matchers are scoped to those exact subcommands so unrelated git/gh/glab calls (`git status`, `gh issue list`) skip the hook entirely. When triggered, the duck suggests `/branch` + `/duck <mode>` so the review happens in a forked conversation without interrupting your work. Rate-limited to 2 suggestions per session, with 24h TTL cleanup, and skipped entirely in subagent contexts.

## How the duck works

- **Hint Ladder / fading scaffolding** — the duck starts abstract and narrows only if you're stuck. It never reveals the code.
- **Uncertainty Check** — you're asked to verbalize your hunch *before* the duck responds, so you can't retrofit understanding from a hint.
- **Temporal cost simulation** — at least one question per session asks where this decision will hurt in 6 months, to surface hidden maintenance costs.
- **Intensity scaling** — Quick / Standard / Deep auto-calibrated to the artifact size, so a one-line fix doesn't get a 45-minute interrogation.
- **Committable orientation artifact** — `/duck orient` produces `.claude/orientation.md` that's team-shareable so new contributors inherit your mental model.
- **Korean-native duck persona** — the duck speaks and thinks in Korean. If you want English, ask for it; otherwise expect 한국어.

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
