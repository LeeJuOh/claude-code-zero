---
name: codex-setup
description: "Check Codex CLI, auth, Official plugin status, and configure defaults (model, reasoning effort). Use when the user says \"codex setup\", \"codex 설정\", \"코덱스 설치\", \"모델 바꿔\", \"코덱스 모델\", or when another codex-advisor skill reports setup issues."
argument-hint: "[--model MODEL] [--effort LEVEL] [--status]"
allowed-tools: ["Bash", "Read"]
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
codex exec "echo hello" -s read-only 2>&1 | head -5
```

If auth error: "Authentication required. Run: `codex login`"

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

```bash
# Create config if it doesn't exist
mkdir -p ~/.codex
# Update or create the model line
if grep -q '^model' ~/.codex/config.toml 2>/dev/null; then
  sed -i '' 's/^model = .*/model = "NEW_MODEL"/' ~/.codex/config.toml
else
  echo 'model = "NEW_MODEL"' >> ~/.codex/config.toml
fi
```

### Set Reasoning Effort (`--effort`)

Valid levels: `none`, `minimal`, `low`, `medium`, `high`, `xhigh`.

```bash
if grep -q '^model_reasoning_effort' ~/.codex/config.toml 2>/dev/null; then
  sed -i '' 's/^model_reasoning_effort = .*/model_reasoning_effort = "NEW_EFFORT"/' ~/.codex/config.toml
else
  echo 'model_reasoning_effort = "NEW_EFFORT"' >> ~/.codex/config.toml
fi
```

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
