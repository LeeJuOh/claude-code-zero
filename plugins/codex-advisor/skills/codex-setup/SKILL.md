---
name: codex-setup
description: "Check Codex CLI, auth, Official plugin status, and configure defaults. Use when asked \"codex setup\", \"configure codex\", \"install codex\", or when another codex-advisor skill reports setup issues."
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

If exit code non-zero (plugin not found), guide the user through the full installation process:

1. Tell the user to run these commands **in order** (they must type these themselves since they are interactive CLI commands):
   - `/plugin marketplace add openai/codex-plugin-cc` — adds the Official Codex marketplace
   - `/plugin install codex@openai-codex` — installs the plugin from that marketplace
   - `/reload-plugins` — activates the newly installed plugin
2. After the user completes the steps, re-run the companion check to verify.

Do NOT just print the steps and move on. Wait for the user to complete them.

If found, run setup check:

```bash
node "$CODEX_COMPANION" setup --json
```

Include the setup output in the status report.

## Configuration Management

### Read current config

```bash
cat ~/.codex/config.toml 2>/dev/null || echo "NO_CONFIG"
```

### Set Model / Effort (`--model`, `--effort`)

Both flags are handled by one call. Empty string = no change for that field:

```bash
python3 "${CLAUDE_PLUGIN_ROOT}/scripts/apply-codex-config.py" "<model or empty>" "<effort or empty>"
```

The script prints one line to stdout:

```
Model: <before> -> <after> | Effort: <before> -> <after>
```

Relay that line verbatim to the user — it shows before/after so they can confirm.

**Model and effort handling**

The script writes both values as given and judges neither — Codex owns the list of valid models and effort levels, and it decides at run time. Don't add a validity check here or reintroduce one downstream: any list we keep goes stale the moment OpenAI ships a model, and then it calls a working value wrong. The only transformation is the `spark` → `gpt-5.3-codex-spark` alias.

So when a user asks which models or efforts they can use, don't answer from memory — availability is account-scoped and changes. Tell them to run `codex` and open its `/model` picker.

The effort value lands on the `model_reasoning_effort` key (`none` is the exception — it belongs to `plan_mode_reasoning_effort`, which this plugin doesn't set). The script preserves other keys in `config.toml` (e.g. `model_context_window`) and writes atomically via a temp file.

If a value looks like an obvious typo, `AskUserQuestion` beats letting it through — config.toml is global, so a typo follows the user into every later session.

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
To change: `/codex-setup --model gpt-5.6-sol --effort high`
```

## Gotchas

- **config.toml applies globally.** Changes affect all Codex commands system-wide — Official plugin, direct CLI, and every codex-advisor skill. Warn the user when you mutate it.
- **`--effort` is not a registered review/adversarial flag.** `handleReviewCommand` `valueOptions = [base, scope, model, cwd]` (`codex-companion.mjs:714`). The only path that reaches the review code is the config.toml `model_reasoning_effort` key. `--model` IS honored as a flag in companion 1.0.4+ (`startThread({ model })`, `lib/codex.mjs:1010-1015`), but codex-advisor still routes it through `config.toml` for **consistency across skills** and so the value persists for the next session — same call shape on review/adversarial/rescue/verify/research. Every skill (`review`, `adversarial`, `research`, `verify`, `rescue`) accepts `--model`/`--effort` and writes via `scripts/apply-codex-config.py` — so the user doesn't have to call `codex-setup` separately.
- **Don't create config.toml if the user only asked for status.** `apply-codex-config.py "" ""` is safe (no-op, prints current values) but avoid it when just reporting — `grep`/`cat` is enough.
