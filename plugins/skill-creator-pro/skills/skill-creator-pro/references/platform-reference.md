# Platform Reference

Quick reference for Claude Code platform features used in skill development. Reflects Claude Code v2.1.98.

For the latest spec, fetch official docs: `WebFetch https://code.claude.com/docs/en/<page>`. Key pages: `skills.md`, `hooks.md`, `hooks-guide.md`, `plugins-reference.md`, `sub-agents.md`.

---

## Frontmatter Fields

| Field | Description |
|-------|-------------|
| `name` | kebab-case, matches folder name. When a plugin declares skills via `"skills": ["./"]` in `plugin.json`, the `name` field becomes the invocation name (not the directory basename), giving stable identity across install methods. |
| `description` | Trigger condition — see Phase 5 for optimization |
| `argument-hint` | Hint shown during autocomplete (e.g., `[issue-number]`) |
| `allowed-tools` | Restrict tools (e.g., `Read, Grep, Bash(git *)`). Bare names and `Bash(command *)` command-scoped patterns work. `Write(path)` path-scoped does not. `$()` command substitution triggers a separate security prompt regardless. Skills inherit parent `settings.json` permissions: `permissions.allow` is additive, `permissions.deny` overrides skill `allowed-tools` (deny > allow). |
| `model` | Model override when this skill is active |
| `effort` | Effort level override (`low`, `medium`, `high`). Session default is `high` for API-key, Bedrock, Vertex, Foundry, Team, and Enterprise users — set `effort: medium` explicitly if your skill needs a lower default. |
| `context` | `fork` to run in isolated subagent |
| `agent` | Subagent type when `context: fork` is set (e.g., `Explore`, `Plan`) |
| `hooks` | On-demand hooks active during skill execution (parsed and registered by the runtime; scoped to the skill's session) |
| `disable-model-invocation` | `true` = manual-only (user invokes with `/name`) |
| `paths` | YAML list of globs — skill only triggers for matching file paths (e.g., `["src/**/*.ts"]`) |
| `skills` | List of skill names to auto-load when subagents execute this skill |
| `user-invocable` | `false` = hidden from `/` menu, Claude-only background knowledge |
| `shell` | Shell interpreter for inline shell execution blocks: `bash` (default) or `powershell` |

---

## String Substitutions

Available in SKILL.md body:

| Variable | Resolves to |
|----------|-------------|
| `$ARGUMENTS` | Text the user typed after the slash command (e.g., `/my-skill fix the login bug` → `fix the login bug`) |
| `$ARGUMENTS[N]` | Nth individual argument (0-indexed). E.g., `/my-skill foo bar` → `$ARGUMENTS[0]` = `foo` |
| `${CLAUDE_SKILL_DIR}` | Absolute path to this skill's folder — use to reference bundled files (`${CLAUDE_SKILL_DIR}/references/api.md`) |
| `${CLAUDE_PLUGIN_ROOT}` | Plugin root directory — use for hook script paths |
| `${CLAUDE_PLUGIN_DATA}` | Persistent data directory that survives plugin upgrades — use for config, logs, databases |
| `${CLAUDE_SESSION_ID}` | Current session ID — e.g., append to `${CLAUDE_PLUGIN_DATA}/runs/${CLAUDE_SESSION_ID}.log` for per-session isolation |

`${CLAUDE_SKILL_DIR}` is the most important for skill authors. Use it whenever your SKILL.md body tells Claude to read a bundled file — it resolves correctly regardless of where the plugin is installed.

---

## Bash Permission Patterns

The Bash tool permission checker handles env-var prefixes and network redirects. Patterns like `Bash(git *)` match compound commands (`ls && git push`), env-var-prefixed commands (`FOO=bar git push`), and commands with extra spaces or tabs correctly — no defensive expansion or workarounds needed.

---

## Hook System

### Hook Types

- **`command`** — Run a shell script. Most common for linting, logging, validation.
- **`prompt`** — Inject a model prompt. Good for safety checks that need reasoning.
- **`http`** — POST JSON to a URL. Useful for integrations that don't need shell access (webhooks, logging services).
- **`agent`** — Spawn a subagent for complex evaluation.

### Conditional Filtering

Hooks support an `if` field using permission rule syntax (e.g., `Bash(git *)`) to narrow when they fire, reducing overhead from process spawning. Compound commands and env-var-prefixed commands are matched correctly.

### Permission Decisions

PreToolUse hooks can return `allow`, `deny`, or `defer`. `defer` pauses headless sessions at the tool call — useful for human-in-the-loop gates in `-p` pipelines, resumed with `-p --resume`.

### Hook Output Limit

Hook output exceeding 50K characters is saved to disk with a file path + preview instead of being injected directly into context. Design hooks to produce concise output; if your hook generates large results, write to a file and return just the path.

### `preventContinuation:true`

For prompt-type hooks on non-Stop events, this flag stops the model from continuing after the hook fires.

### `hookSpecificOutput.sessionTitle`

`UserPromptSubmit` hooks can return `{"hookSpecificOutput": {"sessionTitle": "..."}}` to rename the current session. Useful for skills that derive a meaningful title from the first user prompt.

### Available Events

`PreToolUse`, `PostToolUse`, `SessionStart`, `Stop`, `SubagentStop`, `StopFailure`, `SessionEnd`, `SubagentStart`, `UserPromptSubmit`, `PreCompact`, `PostCompact`, `Notification`, `PermissionRequest`, `PermissionDenied`, `Setup`, `ConfigChange`, `CwdChanged`, `FileChanged`, `TaskCreated`, `TeammateIdle`, `TaskCompleted`, `InstructionsLoaded`, `Elicitation`, `ElicitationResult`, `WorktreeCreate`, `WorktreeRemove`.

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
