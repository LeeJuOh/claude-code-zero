---
name: codex-setup
description: "Check the Codex CLI, sign-in and the Official plugin, and set the default model and effort in config.toml."
disable-model-invocation: true
argument-hint: "[--model MODEL] [--effort LEVEL] [--status]"
allowed-tools: ["Bash(${CLAUDE_PLUGIN_ROOT}/scripts/*)", "Read", "Edit", "AskUserQuestion"]
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

One call finds the Official Codex plugin and asks its companion what is installed and signed in:

```bash
"${CLAUDE_PLUGIN_ROOT}/scripts/codex-job.sh" setup
```

If it fails with `Official Codex plugin not found`, guide the user through the full installation process:

1. Tell the user to run these commands **in order** (they must type these themselves since they are interactive CLI commands):
   - `/plugin marketplace add openai/codex-plugin-cc` — adds the Official Codex marketplace
   - `/plugin install codex@openai-codex` — installs the plugin from that marketplace
   - `/reload-plugins` — activates the newly installed plugin
2. After the user completes the steps, re-run the check to verify.

Do NOT just print the steps and move on. Wait for the user to complete them. Until then, report the CLI and authentication rows as unknown — only the companion checks them.

Otherwise fill the status report from the JSON: `codex.available` and `codex.detail` for the CLI, `auth.loggedIn` and `auth.detail` for authentication. Relay `nextSteps`, except the review-gate one — `--enable-review-gate` belongs to the Official plugin's own `/codex:setup` and Stop hook, which codex-advisor does not wrap.

## Configuration Management

### Read current config

```bash
"${CLAUDE_PLUGIN_ROOT}/scripts/codex-job.sh" config
```

### Set Model / Effort (`--model`, `--effort`)

Both flags are handled by one call. Empty string = no change for that field:

```bash
"${CLAUDE_PLUGIN_ROOT}/scripts/apply-codex-config.py" "<model or empty>" "<effort or empty>"
```

The script's first stdout line is:

```
Model: <before> -> <after> | Effort: <before> -> <after>
```

Relay that line verbatim to the user — it shows before/after so they can confirm. If it exits non-zero, relay its stderr instead — the file was left untouched. A `Note:` line means the current project's own `.codex/config.toml` sets the same key, which outranks `config.toml` in that project — relay it.

**Model and effort handling**

The script writes both values as given and judges neither — Codex owns the list of valid models and effort levels, and it decides at run time. Don't add a validity check here or reintroduce one downstream, and don't teach the script a model alias: any model name we keep goes stale the moment OpenAI ships the next one, and then it calls a working value wrong.

So when a user asks which models or efforts they can use, don't answer from memory — availability is account-scoped and changes. Tell them to run `codex` and open its `/model` picker.

The effort value lands on the `model_reasoning_effort` key (`none` is the exception — it belongs to `plan_mode_reasoning_effort`, which this plugin doesn't set). The script edits only the top-level keys (above the first `[table]` header), preserves everything else (e.g. `model_context_window`, `[projects.*]`), follows `CODEX_HOME`, and writes atomically via a temp file. On Python 3.11+ it parses the file before and after and refuses to write if anything other than the requested keys would change.

If a value looks like an obvious typo, `AskUserQuestion` beats letting it through — config.toml is global, so a typo follows the user into every later session.

## Status Report

```markdown
## Codex Setup Status

| Item | Status |
|------|--------|
| Codex CLI | `codex.detail` or NOT_INSTALLED |
| Authentication | `auth.detail` or NOT LOGGED IN |
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
- **Other skills set these too.** review, adversarial, rescue, verify and research accept `--model`/`--effort` and write them through the same script. Review and adversarial have no `--effort` flag, so config.toml is the only way to set their effort — details in `references/companion-usage.md` §2.
- **Don't create config.toml if the user only asked for status.** `apply-codex-config.py "" ""` is safe (no-op, prints current values) but avoid it when just reporting — `codex-job.sh config` is enough.
