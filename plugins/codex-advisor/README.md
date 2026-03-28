# codex-advisor

> Get a second opinion from a different AI model — run OpenAI Codex for code review and verification with Claude's critical evaluation.

## Why

Claude reviewing its own code is like proofreading your own essay — you see what you meant to write, not what you actually wrote. A second model with different training catches different things.

This plugin runs OpenAI's Codex CLI for code review or verification, then has Claude critically evaluate Codex's findings — agreeing, disagreeing, or adding context. The result is a cross-model analysis where each catch is backed by evidence from the actual code.

## Features

| Skill | Description |
|-------|-------------|
| `/codex-review` | Code review — supports `--uncommitted`, `--base BRANCH`, focus modes (security, perf, arch) |
| `/codex-verify` | Independent verification — PASS/FAIL verdict on implementation or plan documents |

Auto-hooks suggest review after commits and verification after task completion.

## Prerequisites

- **[OpenAI Codex CLI](https://github.com/openai/codex)** installed and configured

## Install

```shell
/plugin install codex-advisor@claude-code-zero
```

## Usage

```
/codex-review                              # auto-detect scope
/codex-review --uncommitted                # review uncommitted changes
/codex-review --base develop               # review branch diff
/codex-review security focus               # security-focused review
/codex-verify                              # verify implementation
/codex-verify docs/my-plan.md              # verify a plan document
/codex-review resume "what about X?"       # continue previous session
```

## License

MIT
