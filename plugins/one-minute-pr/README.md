# one-minute-pr

> A pull request body that a reviewer can judge in one minute.

## Why

An agent can write a PR body faster than a reviewer can read it. The usual result is a long summary of the diff, claims with no proof, and no word on how to undo the change. The reviewer then reads the whole diff to find what the body should have said, and the review queue grows.

This skill opens the PR with a short body in a fixed order: why the change exists, the shapes that changed, what it leaves out, what it could break, how to roll it back, and what was run to prove it. It uses only evidence the agent has seen. When it cannot find evidence, the body says "not found" and the reply tells you what to send.

## Quick Start

Commit your work, then ask the agent to open a PR.

```
open a PR for this branch
```

The skill pushes the branch, writes the body, checks it, and posts it with your forge CLI (`gh`, `glab`, or another). Without a forge CLI it prints the body.

## Install

| Agent | Install | Call |
|---|---|---|
| Claude Code | `/plugin marketplace add LeeJuOh/claude-code-zero`, then `/plugin install one-minute-pr@claude-code-zero` | `/one-minute-pr` or ask for a PR |
| Codex | `codex plugin marketplace add LeeJuOh/claude-code-zero`, then `codex plugin add one-minute-pr@claude-code-zero` | `$one-minute-pr` or ask for a PR |
| Antigravity | `agy plugin install https://github.com/LeeJuOh/claude-code-zero/tree/main/plugins/one-minute-pr` | `/one-minute-pr` or ask for a PR |
| Any agent (skills CLI) | `npx skills add LeeJuOh/claude-code-zero --skill one-minute-pr` | Ask for a PR |

Requires git and Node.js 18 or later.

## What the body looks like

| Section | Content |
|---|---|
| Why | The problem and the approach, in one to three sentences |
| What changed | The changed contracts, data structures, settings, or flows, as a `diff` block or a diagram |
| Scope | What the change covers and what it leaves out |
| Tradeoffs | Rejected alternatives a reviewer would ask about |
| Blast Radius | What the change touches, the fact that makes it safe or risky, and how far that was checked |
| Rollback | How to undo the change. Always present |
| Verification | One to three real runs and their output |

Sections with nothing to say are dropped, except Rollback. The body stays near 40 lines. When there is more, the skill asks whether it goes in a folded PR comment or a document you link.

The skill does not commit for you, does not run tests or take screenshots to make new evidence, and does not follow the repo's PR template.
