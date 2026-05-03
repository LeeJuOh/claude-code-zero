# Platform Reference

Quick reference for Claude Code platform features used in skill development. Reflects Claude Code v2.1.126.

For the latest spec, fetch official docs: `WebFetch https://code.claude.com/docs/en/<page>`. Key pages: `skills.md`, `hooks.md`, `hooks-guide.md`, `plugins-reference.md`, `sub-agents.md`.

---

## Frontmatter Fields

| Field | Description |
|-------|-------------|
| `name` | Lowercase letters, numbers, and hyphens only (max 64 chars). If omitted, uses directory name. When a plugin declares skills via `"skills": ["./"]` in `plugin.json`, the `name` field becomes the invocation name (not the directory basename), giving stable identity across install methods. |
| `description` | Trigger condition — see Phase 5 for optimization. Combined with `when_to_use`, capped at 1,536 chars in skill listing (skills.md). |
| `when_to_use` | Additional context for when Claude should invoke. Trigger phrases or example requests. Counts toward the 1,536-char cap (combined with description). (skills.md) |
| `argument-hint` | Hint shown during autocomplete (e.g., `[issue-number]`) |
| `arguments` | Named positional arguments for `$name` substitution. Accepts space-separated string or YAML list. Names map to argument positions in order. (skills.md) |
| `allowed-tools` | Restrict tools (e.g., `Read, Grep, Bash(git *)`). Bare names and `Bash(command *)` command-scoped patterns work. `Write(path)` path-scoped does not. `$()` command substitution triggers a separate security prompt regardless. Skills inherit parent `settings.json` permissions: `permissions.allow` is additive, `permissions.deny` overrides skill `allowed-tools` (deny > allow). Honored in `--print` / headless mode since v2.1.119. |
| `model` | Model override when this skill is active |
| `effort` | Effort level override. Options: `low`, `medium`, `high`, `xhigh`, `max`. Available levels depend on the model. Default: inherits from session. (skills.md) |
| `context` | `fork` to run in isolated subagent |
| `agent` | Subagent type when `context: fork` is set (e.g., `Explore`, `Plan`) |
| `hooks` | On-demand hooks active during skill execution (parsed and registered by the runtime; scoped to the skill's session) |
| `disable-model-invocation` | `true` = manual-only (user invokes with `/name`) |
| `paths` | Glob patterns. Accepts comma-separated string or YAML list. Skill only triggers for matching file paths (e.g., `"src/**/*.ts"`). (skills.md) |
| `user-invocable` | `false` = hidden from `/` menu, Claude-only background knowledge |
| `shell` | Shell interpreter for inline shell execution blocks: `bash` (default) or `powershell` |

---

## String Substitutions

Available in SKILL.md body:

| Variable | Resolves to |
|----------|-------------|
| `$ARGUMENTS` | Text the user typed after the slash command (e.g., `/my-skill fix the login bug` → `fix the login bug`) |
| `$ARGUMENTS[N]` | Nth individual argument (0-indexed). E.g., `/my-skill foo bar` → `$ARGUMENTS[0]` = `foo` |
| `$N` | Shorthand for `$ARGUMENTS[N]`, such as `$0` for the first argument. (skills.md) |
| `$name` | Named argument declared in the `arguments` frontmatter list. With `arguments: [issue, branch]`, `$issue` expands to the first argument. (skills.md) |
| `${CLAUDE_SKILL_DIR}` | Absolute path to this skill's folder — use to reference bundled files (`${CLAUDE_SKILL_DIR}/references/api.md`) |
| `${CLAUDE_PLUGIN_ROOT}` | Plugin root directory — use for hook script paths |
| `${CLAUDE_PLUGIN_DATA}` | Persistent data directory that survives plugin upgrades — use for config, logs, databases |
| `${CLAUDE_SESSION_ID}` | Current session ID — e.g., append to `${CLAUDE_PLUGIN_DATA}/runs/${CLAUDE_SESSION_ID}.log` for per-session isolation |
| `${CLAUDE_EFFORT}` | Current effort level: `low`, `medium`, `high`, `xhigh`, or `max` — added in v2.1.120. Use to gate optional deep-analysis steps based on effort budget (e.g., skip extra eval rounds when `low`). |

Indexed arguments use shell-style quoting. Wrap multi-word values in quotes to pass as a single argument. `$ARGUMENTS` always expands to the full argument string as typed. (skills.md)

`${CLAUDE_SKILL_DIR}` is the most important for skill authors. Use it whenever your SKILL.md body tells Claude to read a bundled file — it resolves correctly regardless of where the plugin is installed.

---

## Bash Permission Patterns

The Bash tool permission checker handles env-var prefixes and network redirects. Patterns like `Bash(git *)` match compound commands (`ls && git push`), env-var-prefixed commands (`FOO=bar git push`), and commands with extra spaces or tabs correctly — no defensive expansion or workarounds needed.

### Skill Permissions

- `Skill(name)` — exact match
- `Skill(name *)` — prefix match (any arguments)

Use to allow/deny specific skills via permission rules. Source: skills.md "Restrict Claude's skill access".

---

## Hook System

### Hook Types

- **`command`** — Run a shell script. Most common for linting, logging, validation.
- **`prompt`** — Inject a model prompt. Good for safety checks that need reasoning.
- **`http`** — POST JSON to a URL. Useful for integrations that don't need shell access (webhooks, logging services).
- **`agent`** — Spawn a subagent for complex evaluation.
- **`mcp_tool`** — Invoke an MCP tool directly (added in v2.1.118). Skip the shell round-trip when the action is already exposed by an MCP server (e.g., post to Linear, log to a webhook MCP). Specify `tool_name` and `arguments` in the hook entry.

### Conditional Filtering

Hooks support an `if` field using permission rule syntax (e.g., `Bash(git *)`) to narrow when they fire, reducing overhead from process spawning. Compound commands and env-var-prefixed commands are matched correctly.

### Permission Decisions

PreToolUse hooks can return `allow`, `deny`, or `defer`. `defer` pauses headless sessions at the tool call — useful for human-in-the-loop gates in `-p` pipelines, resumed with `-p --resume`.

### Hook Output Limit

Hook output exceeding 50K characters is saved to disk with a file path + preview instead of being injected directly into context. Design hooks to produce concise output; if your hook generates large results, write to a file and return just the path.

### PostToolUse Input/Output

- `PostToolUse` and `PostToolUseFailure` inputs include `duration_ms` (v2.1.119) — tool execution time excluding permission prompts and PreToolUse hooks. Useful for skills that audit slow tool calls. (hooks.md)
- `hookSpecificOutput.updatedToolOutput` lets a `PostToolUse` hook replace the tool's result for any tool (v2.1.121, previously MCP-only). Use for redaction, normalization, or summarization before the model sees the output. (hooks.md)

### `preventContinuation:true`

For prompt-type hooks on non-Stop events, this flag stops the model from continuing after the hook fires.

### `hookSpecificOutput.sessionTitle`

`UserPromptSubmit` hooks can return `{"hookSpecificOutput": {"sessionTitle": "..."}}` to rename the current session. Useful for skills that derive a meaningful title from the first user prompt.

### Available Events

`PreToolUse`, `PostToolUse`, `SessionStart`, `Stop`, `SubagentStop`, `StopFailure`, `SessionEnd`, `SubagentStart`, `UserPromptSubmit`, `UserPromptExpansion`, `PostToolBatch`, `PostToolUseFailure`, `PreCompact`, `PostCompact`, `Notification`, `PermissionRequest`, `PermissionDenied`, `Setup`, `ConfigChange`, `CwdChanged`, `FileChanged`, `TaskCreated`, `TeammateIdle`, `TaskCompleted`, `InstructionsLoaded`, `Elicitation`, `ElicitationResult`, `WorktreeCreate`, `WorktreeRemove`.

Notable: `PermissionDenied` fires after auto mode classifier denials — return `{retry: true}` to let the model retry. Useful for skills that need graceful recovery from permission blocks.

Verify against official docs (`hooks.md`, `hooks-guide.md`) — hook events and types evolve across releases.

### Frontmatter Hooks vs Plugin Hooks

- **Frontmatter hooks** (`hooks:` in SKILL.md): Scoped to the skill's session. Use for skill-specific guardrails.
- **Plugin hooks** (`hooks/hooks.json` at plugin root): Always-on. Use for global behaviors.

---

## Platform Gotchas

- **Inline shell may be disabled.** Users can set `disableSkillShellExecution: true` in settings.json, which blocks all inline shell execution in skills. If your skill relies on inline shell, document it as a requirement and provide a Bash tool fallback.
- **Use `/reload-plugins` during development.** After editing a skill, run `/reload-plugins` to pick up changes without restarting Claude Code.
- **Avoid JS prototype property names in settings.json rules.** Permission rule names like `toString`, `constructor`, `hasOwnProperty` cause settings.json to be silently ignored. Audit named rules against JS prototype property names.
