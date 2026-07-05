# rubber-duck-tutor

> If you can't explain it to a duck, you don't understand it.

## Why

AI coding assistants generate code fast. The trap is what happens to *you* — plans look reasonable, code compiles, reviews pass, and at no point did you engage deeply enough to understand what was built. [Anthropic's research](https://www.anthropic.com/research/AI-assistance-coding-skills) found that developers who passively accept AI-generated code score 17% lower on comprehension — but developers who ask questions and request explanations perform just as well as those coding by hand.

This plugin builds that questioning habit into your workflow. The duck asks you questions about the code, then waits. No hints, no teaching — just a question and silence. If you can't explain it, you've found a gap.

**Learning shouldn't compete with productivity.** When the duck suggests a review, it guides you to `/branch` first — fork the conversation, do the review there, and return to your main work with `/resume`. No interrupted flow, no "I'll do it later" that never happens.

## Features

| Mode | When | What it checks |
|------|------|----------------|
| `/duck-prebuild` | *Before* asking AI to implement, or after a plan is created | Can you sketch the shape yourself first — or, for a plan, do you understand its decisions and trade-offs? |
| `/duck-verify` | After implementation | Can you explain the code, find edge cases, and fix a bug with your own hands? |
| `/duck-review` | Before commit/merge | Can you justify every change — and predict where it'll hurt in 6 months? |
| `/duck-orient` | New to a codebase | Can you navigate and explain the repo structure? |

`/duck` with no argument auto-detects the right mode from context and routes you to the matching `/duck-<mode>` skill.

Auto-hooks fire at two kinds of checkpoint, and react differently. **Plan/spec creation** (plan creation, spec documents — Write under `docs/adr/`, `docs/plans?/`, `docs/specs?/`, `docs/rfcs?/`, with a filename-prefix fallback — `plan*.md` / `spec*.md` / `design*.md` / `rfc*.md` / `adr*.md` — for repos that don't nest docs that way; deterministic, non-AI, non-conversational files like README / CHANGELOG / CLAUDE.md and unrelated markdown like `notes.md` skip the hook either way) suggests `/branch` + `/duck-<mode>` so a full review session happens in a forked conversation without interrupting your work — capped at 2 suggestions per session. **Shipping** (`git push`, `gh pr create` / `glab mr create` — matchers scoped to those exact subcommands so unrelated calls like `git status` or `gh issue list` skip the hook entirely) confronts you inline with one understanding question about what you just shipped, rather than suggesting a command — no branching, no interruption. The three shipping triggers share a single budget of 1 confrontation per session (first one to fire wins, since `git push` alone also covers platforms the `gh`/`glab` hooks miss), falling back to the branch+session suggestion only when the shipped change is too large for one inline question. Both budgets get 24h TTL cleanup and are skipped entirely in subagent contexts.

## How the duck works

- **Hint Ladder / fading scaffolding** — the duck starts abstract and narrows only if you're stuck. It never reveals the code.
- **Uncertainty Check** — you're asked to verbalize your hunch *before* the duck responds, so you can't retrofit understanding from a hint.
- **Temporal cost simulation** — at least one question per session asks where this decision will hurt in 6 months, to surface hidden maintenance costs.
- **Intensity scaling** — Quick / Standard / Deep auto-calibrated to the artifact size, so a one-line fix doesn't get a 45-minute interrogation.
- **Committable orientation artifact** — `/duck orient` produces `.claude/orientation.md` that's team-shareable so new contributors inherit your mental model.

## Prerequisites

- **jq** (recommended, `brew install jq`) — hooks fall back to regex without it
- **`/branch` and `/resume`** — Claude Code built-ins (`/branch [name]`, `/resume [session]`). Always available; no separate plugin needed.

## Install

```shell
/plugin install rubber-duck-tutor@claude-code-zero
```

## Usage

```
/duck              # auto-detect mode → routes to a /duck-<mode> skill
/duck-prebuild     # sketch before asking AI to implement, or review a plan
/duck-verify       # verify implementation
/duck-review       # review changes before commit
/duck-orient       # codebase orientation (pass `refresh` to regenerate)
```

## License

MIT
