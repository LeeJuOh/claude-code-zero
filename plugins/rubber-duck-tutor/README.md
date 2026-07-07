# rubber-duck-tutor

> If you can't explain it to a duck, you don't understand it.

## Why

AI coding assistants generate code fast. The trap is what happens to *you* — plans look reasonable, code compiles, reviews pass, and at no point did you engage deeply enough to understand what was built. [Anthropic's research](https://www.anthropic.com/research/AI-assistance-coding-skills) found that developers who passively accept AI-generated code score 17% lower on comprehension — but developers who ask questions and request explanations perform just as well as those coding by hand.

This plugin builds that questioning habit into your workflow — across the whole AI-coding lifecycle, not just after the code lands: before you ask AI to build something, once it's written, when you're about to ship it, and when you're new to a codebase. The duck asks you questions, then waits. No hints, no teaching — just a question and silence. If you can't explain it, you've found a gap.

**Learning shouldn't compete with productivity.** When the duck suggests a review, it guides you to `/branch` first — fork the conversation, do the review there, and return to your main work with `/resume`. No interrupted flow, no "I'll do it later" that never happens.

## Features

| Mode | When | What it checks |
|------|------|----------------|
| `/duck-prebuild` | *Before* asking AI to implement, or after a plan is created | Can you sketch the shape yourself first — or, for a plan, do you understand its decisions and trade-offs? |
| `/duck-verify` | After implementation | Can you explain the code, find edge cases, and fix a bug with your own hands? |
| `/duck-review` | Before commit/merge | Can you justify every change — and predict where it'll hurt in 6 months? |
| `/duck-orient` | New to a codebase | Can you navigate and explain the repo structure? |

`/duck` with no argument auto-detects the right mode from context and routes you to the matching `/duck-<mode>` skill.

### `/coach` — the teaching sibling

| Mode | When | What it does |
|------|------|----------------|
| `/coach <topic>` | You want to learn something specific | Explains it in plain language with one analogy, gives a minimal runnable example, sets a harder exercise, then critiques your attempt like a senior would |
| `/coach <file>`, or `/coach` right after generating code | You want to understand code that was just written | Dissects it section by section — what it does, why this way over the obvious alternative, where it breaks first in prod — then an exercise and critique |
| `/coach` alone, nothing to dissect | You have an open gap from a past duck session | Surfaces the most recent unresolved gap and teaches it; resolving it requires passing the exercise, not just saying "I get it" |

Manual-invocation only (`disable-model-invocation: true`) — coach never auto-triggers, so it never competes for the wheel with an external teach-style skill you might already have installed.

Auto-hooks fire at two kinds of checkpoint, and react differently.

**Plan/spec creation** (Write under `docs/adr/`, `docs/plans?/`, `docs/specs?/`, `docs/rfcs?/`, with a filename-prefix fallback — `plan*.md` / `spec*.md` / `design*.md` / `rfc*.md` / `adr*.md` — for repos that don't nest docs that way; deterministic, non-AI, non-conversational files like README / CHANGELOG / CLAUDE.md and unrelated markdown like `notes.md` skip the hook either way) suggests `/branch` + `/duck-<mode>` so a full review session happens in a forked conversation without interrupting your work — capped at 2 suggestions per session.

**Shipping** (`git push`, `gh pr create` / `glab mr create` — matchers scoped to those exact subcommands so unrelated calls like `git status` or `gh issue list` skip the hook entirely) confronts you inline, no branching, no interruption. Rather than a generic question, it triages what you shipped against six risk categories (concurrency, security, performance, data schema, public API, architecture boundary) and asks about whichever high-risk change you didn't actually discuss in conversation — an invariant, error mode, ordering constraint, or trade-off, never a code-quality nitpick. If nothing shipped is high-risk-and-unengaged, it retrieves an unresolved gap you were stuck on in a past session instead of asking something brand new (spaced retrieval beats a fresh question). Only if neither applies does it fall back to a short artifact-level question. If the shipped change is too large or spans too many artifacts for one inline question to do justice, it suggests `/branch` + `/duck-review` instead so a fuller review happens without interrupting your flow. Ignore three ship confrontations in a row and the next one demotes from a question to a non-blocking scoreboard — naming every high-risk change and how many you actually engaged with, never a bare percentage; answering once reverts the next confrontation to question mode. Every fire/answer/ignore is logged, and `/duck-orient` surfaces a rolling summary ("last 30 days: N fired, M answered, K ignored") so you can see whether any of this is actually working.

The three shipping triggers share a single budget of 1 confrontation per session (first one to fire wins, since `git push` alone also covers platforms the `gh`/`glab` hooks miss). Both budgets get 24h TTL cleanup and are skipped entirely in subagent contexts.

## How the duck works

- **Hint Ladder / fading scaffolding** — the duck starts abstract and narrows only if you're stuck. It never reveals the code.
- **Uncertainty Check** — you're asked to verbalize your hunch *before* the duck responds, so you can't retrofit understanding from a hint.
- **Temporal cost simulation** — at least one question per session asks where this decision will hurt in 6 months, to surface hidden maintenance costs.
- **Intensity scaling** — Quick / Standard / Deep auto-calibrated to the artifact size, so a one-line fix doesn't get a 45-minute interrogation.
- **Committable orientation artifact** — `/duck-orient` produces `.claude/orientation.md` that's team-shareable so new contributors inherit your mental model.

## Scope

Duck only checks whether *you* understand — it doesn't referee the code or the plan itself, and it never teaches. Code quality and spec compliance are `/code-review`'s job; stress-testing a plan's decisions and trade-offs before you build is `/grilling`'s; closing a gap once duck finds one is `/coach`'s. Duck's questions ask "do you know this," never "is this good" — and coach never quizzes to check whether you already know something, since that's duck's job, not coach's. Neither persona does the other's work; that split is what keeps both honest.

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
/coach <topic>     # senior-engineer teaching session on a specific topic
/coach <file>      # dissect that file section by section
/coach             # dissect session-generated code, or pick up an open gap
```

## License

MIT
