# SKILL.md Reference

Claude Code-specific frontmatter fields and string substitutions for SKILL.md files.

## Frontmatter Fields

All fields are optional; only the body content is required.

| Field | Description |
|-------|-------------|
| `name` | Skill name (defaults to directory name) |
| `description` | Trigger condition for model matching — NOT a summary. Use "Use when ..." pattern |
| `argument-hint` | Autocomplete hint (e.g., `"[url] [options]"`) |
| `disable-model-invocation` | `true` = user-only invocation (model cannot trigger) |
| `user-invocable` | `false` = hidden from `/` menu (model-only) |
| `allowed-tools` | Restrict available tools (e.g., `Read, Grep, Bash(git *)`) |
| `model` | Model override (e.g., `sonnet`, `haiku`) |
| `context` | `fork` = run in isolated subagent context |
| `agent` | Agent type when `context: fork` (e.g., `Explore`) |
| `hooks` | On-demand hooks active only during skill execution |

## String Substitutions

Available inside SKILL.md body content:

| Variable | Description |
|----------|-------------|
| `$ARGUMENTS` | Full argument string passed to the skill |
| `$ARGUMENTS[N]` / `$N` | Nth argument (0-based) |
| `${CLAUDE_SKILL_DIR}` | Directory containing SKILL.md (not plugin root). Use for referencing bundled scripts/files |
| `${CLAUDE_SESSION_ID}` | Current session ID |
| `` !`command` `` | Shell command execution — result injected as preprocessing |
