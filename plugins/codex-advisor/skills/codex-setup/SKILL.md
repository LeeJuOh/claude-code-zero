---
name: codex-setup
description: "Check Codex CLI, auth, Official plugin status, and configure defaults (model, reasoning effort). Use when the user says \"codex setup\", \"codex 설정\", \"코덱스 설치\", \"모델 바꿔\", \"코덱스 모델\", or when another codex-advisor skill reports setup issues."
argument-hint: "[--model MODEL] [--effort LEVEL] [--status]"
allowed-tools: ["Bash", "Read", "Edit", "AskUserQuestion"]
---

# Codex Setup & Configuration

Preflight check and `~/.codex/config.toml` configuration helper for codex-advisor.

## Mode Selection

Parse $ARGUMENTS:

| Input | Action |
|-------|--------|
| `--status` or no args | Run preflight + show current config |
| `--model MODEL` | Set default model in config.toml |
| `--effort LEVEL` | Set reasoning effort in config.toml |
| Combined flags | Apply all settings |

## Preflight Check

### Check Codex CLI

```bash
which codex >/dev/null 2>&1 && codex --version || echo "NOT_INSTALLED"
```

If NOT_INSTALLED: "Codex CLI is not installed. Install: `npm install -g @openai/codex`"

### Check Authentication

```bash
codex --version 2>&1
```

If output contains "not authenticated" or "OPENAI_API_KEY": "Authentication required. Run: `codex login`"
If version prints normally: auth is likely OK (full verification happens on first real command).

### Check Official Codex Plugin

```bash
CODEX_COMPANION=$("${CLAUDE_PLUGIN_ROOT}/scripts/resolve-companion.sh")
```

If exit code non-zero: show the error message ("Official Codex plugin not found. Install: `/plugin install codex@openai-codex` then `/reload-plugins`")

If found, run setup check:

```bash
node "$CODEX_COMPANION" setup --json
```

Include the setup output in the status report.

## Configuration Management

Read current config:

```bash
cat ~/.codex/config.toml 2>/dev/null || echo "NO_CONFIG"
```

### Set Model (`--model`)

Valid models: `gpt-5.4`, `gpt-5.4-mini`, `gpt-5.3-codex-spark`, or any model string.

1. Ensure directory exists: `mkdir -p ~/.codex`
2. If `~/.codex/config.toml` doesn't exist, create it with `model = "NEW_MODEL"`
3. If it exists, use the **Edit tool** to replace the `model = "..."` line. If no model line exists, append it.

### Set Reasoning Effort (`--effort`)

Valid levels: `none`, `minimal`, `low`, `medium`, `high`, `xhigh`.

1. If `~/.codex/config.toml` doesn't exist, create with `model_reasoning_effort = "NEW_EFFORT"`
2. If it exists, use the **Edit tool** to replace the `model_reasoning_effort = "..."` line. If no such line exists, append it.

## Status Report

```markdown
## Codex Setup Status

| Item | Status |
|------|--------|
| Codex CLI | version or NOT_INSTALLED |
| Authentication | OK or FAILED |
| Official Plugin | OK or NOT_INSTALLED (required) |

## Current Configuration (~/.codex/config.toml)

| Setting | Value |
|---------|-------|
| model | <current or "default (not set)"> |
| model_reasoning_effort | <current or "default (not set)"> |
| web_search | <current or "default (not set)"> |

These defaults apply to ALL Codex commands — both Official plugin and direct CLI.
To change: `/codex-setup --model gpt-5.4-mini --effort high`
```

## Gotchas

- **config.toml applies globally.** Changes affect all Codex commands system-wide, not just codex-advisor.
- **Official `/codex:review` ignores `--model` flag.** The only way to change the review model is via config.toml — that's why this skill exists.
- **Don't create config.toml if user only asked for status.** Only write when explicitly setting values.
