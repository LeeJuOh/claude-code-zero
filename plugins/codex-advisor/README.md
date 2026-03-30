# codex-advisor

> Get a second opinion from a different AI model — run OpenAI Codex for code review, document verification, and research with Claude's critical evaluation.

## Why

Claude reviewing its own code is like proofreading your own essay — you see what you meant to write, not what you actually wrote. A second model with different training catches different things.

This plugin runs OpenAI's Codex CLI, then has Claude critically evaluate the findings — agreeing, disagreeing, or adding context. The result is a cross-model analysis where each catch is backed by evidence.

## Features

| Skill | Description |
|-------|-------------|
| `/codex-review` | Code review — supports `--uncommitted`, `--base BRANCH`, focus modes (security, perf, arch) |
| `/codex-verify` | Document/plan verification — PASS/FAIL verdict |
| `/codex-research` | Deep-dive research, issue analysis, technical exploration |

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
/codex-verify docs/my-plan.md             # verify a plan document
/codex-research "React vs Svelte 비교"     # deep-dive research
/codex-research resume "what about X?"     # continue previous session
```

## License

MIT
