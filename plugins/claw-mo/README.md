# claw-mo

Claude Code plugin for managing [mo](https://github.com/k1LoW/mo) markdown viewer sessions.

## Features

- **Auto-start**: Start mo server with configured watch patterns per project
- **Browser integration**: Open docs in cmux browser or system browser
- **Per-project config**: Watch patterns and port stored per git root
- **Duplicate prevention**: Checks running servers before starting
- **Port isolation**: Hash-based auto-assignment (6300-6399) prevents cross-project conflicts

## Prerequisites

- [mo](https://github.com/k1LoW/mo): `brew install k1LoW/tap/mo`

## Usage

| Command | Description |
|---------|-------------|
| `/claw-mo` | Start server + open browser (idempotent) |
| `/claw-mo setup` | Configure watch patterns and port for current project |
| `/claw-mo status` | Show running mo servers |
| `/claw-mo stop` | Stop server for current project |
| `/claw-mo add <pattern>` | Add a watch pattern |
| `/claw-mo remove <pattern>` | Remove a watch pattern |
| `/claw-mo reset` | Clear mo session (fresh start) |

## Configuration

Stored in `${CLAUDE_PLUGIN_DATA}/config.json`, keyed by project root path:

```json
{
  "/path/to/project": {
    "port": 6342,
    "patterns": ["docs/**/*.md", "*.md"]
  }
}
```

## How it works

1. Project identification via `git rev-parse --show-toplevel`
2. Port auto-assigned from path hash (6300-6399), overridable
3. mo started with `--no-open` + configured `-w` patterns
4. Browser opened via cmux (if available) or system `open` command
