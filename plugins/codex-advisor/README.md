# codex-advisor

> Get a second opinion from a different AI model — run OpenAI Codex for code review, document verification, and research with Claude's critical evaluation.

## Why

Claude reviewing its own code is like proofreading your own essay — you see what you meant to write, not what you actually wrote. A second model with different training catches different things.

This plugin runs OpenAI's Codex CLI, then has Claude critically evaluate the findings — agreeing, disagreeing, or adding context. The result is a cross-model analysis where each catch is backed by evidence.

## Features

| Skill | Description |
|-------|-------------|
| `/codex-review` | Code review — supports `--uncommitted`, `--base BRANCH`, `adversarial` mode, focus modes (security, perf, arch) |
| `/codex-verify` | Document/plan verification — PASS/FAIL verdict |
| `/codex-research` | Deep-dive research, issue analysis, technical exploration |

### Adversarial Review

`/codex-review adversarial` runs a specialized adversarial prompt that actively tries to break confidence in the change. Findings include severity, confidence scores, and concrete recommendations in structured JSON format.

### Stop Review Gate

Optional hook that suggests Codex review when code changes are detected before session end. Enable in config:

```json
{ "stopGate": true }
```

### Auto-hooks

- Post-commit: suggests review after `git commit`
- Task completed: suggests verification when code changes detected
- Stop gate: suggests review before session end (when enabled)

### No Auto-Fix Policy

Review and verification results are presented for human decision-making. Claude will not automatically fix findings — the user explicitly requests which changes to make.

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
/codex-review adversarial                  # adversarial review (structured JSON)
/codex-review adversarial --base main      # adversarial review of branch diff
/codex-review security focus               # security-focused review
/codex-verify docs/my-plan.md             # verify a plan document
/codex-research "React vs Svelte 비교"     # deep-dive research
/codex-research resume "what about X?"     # continue previous session
```

## License

MIT
