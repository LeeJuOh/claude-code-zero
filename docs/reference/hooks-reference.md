# Hooks Reference

Hook configuration for Claude Code plugins.

## Definition

Hooks are defined in `hooks/hooks.json` inside the plugin root.

## Events

`SessionStart`, `PreToolUse`, `PostToolUse`, `UserPromptSubmit`, `Stop`, `SubagentStart`, `SubagentStop`

## Hook Types

| Type | Description |
|------|-------------|
| `command` | Shell script execution |
| `http` | POST to an HTTP endpoint |
| `prompt` | LLM evaluation |
| `agent` | Agent verification |

## Example

```json
{
  "hooks": {
    "PostToolUse": [{
      "matcher": "Write|Edit",
      "hooks": [{ "type": "command", "command": "${CLAUDE_PLUGIN_ROOT}/scripts/lint.sh" }]
    }]
  }
}
```

The `matcher` field filters by tool name (regex pattern). Use `${CLAUDE_PLUGIN_ROOT}` for script paths.
