# notebooklm-connector

> Ask questions about your NotebookLM sources from Claude Code and follow the citations back to the notebook.

## Why

When your reference material lives in NotebookLM, a question about an API can interrupt the work in your editor. You switch to the notebook, ask, then copy the answer back. This connector sends the question through Chrome and returns the answer with citations you can inspect.

If the answer leaves part of the question open, the agent can ask follow-up questions in the same notebook. Set `max_followups` to limit those rounds.

## Features

| Feature | Description |
|---------|-------------|
| Source-grounded answers | Ask about your notebook sources and inspect the citations returned with the answer |
| Automatic follow-up | Coverage analysis detects gaps and re-queries — default 3 rounds, configurable via `max_followups` |
| Input length pre-validation | Condenses prompts over `max_query_length` (default 40k characters) before they reach NotebookLM |
| Smart Add | Agent opens the notebook and parses the actual title, topics, and description — not just URL slug |
| Notebook lifecycle | Add, query, `list` / `list --all`, search, `enable` / `disable`, `remove`, `show <id>` |
| Scope isolation | Per-project state (md5-hashed directory) or per-user state; chosen at install time. Legacy paths auto-migrated |
| Error recovery | Typed errors (`CHROME_NOT_CONNECTED`, `AUTH_REQUIRED`, …) come with step-by-step reconnect guidance |
| Tab reuse | Follow-up queries reuse the existing Chrome tab for cheap re-routing |

## Configuration

Per-user settings are read from the skill config:

| Key | Default | Description |
|---|---|---|
| `max_followups` | `3` | Max coverage follow-up rounds before finalizing |
| `max_query_length` | `40000` | Input length cap (characters) |
| `language` | auto | Response language |
| `auto_coverage` | `true` | Enable/disable automatic gap detection |

## Prerequisites

- **Google Chrome or Microsoft Edge**
- **[Claude in Chrome extension](https://chromewebstore.google.com/detail/claude/fcoeoabgfenejglbffodgkkbkcdhcgfn)** v1.0.36+
- **Claude Code CLI** v2.0.73+
- **Paid Claude plan** (Pro, Max, Teams, or Enterprise)
- **Google account** logged into [NotebookLM](https://notebooklm.google.com)

## Install

```shell
/plugin install notebooklm-connector@claude-code-zero
```

Start Claude Code with Chrome integration: `claude --chrome`

## Usage

```
"Add https://notebooklm.google.com/notebook/abc123 to my notebooks"
"What authentication methods does the API support?"
"Show my notebooks"
"Search notebooks about frontend"
"Disable the gemini-docs notebook"
"Remove notebook abc123"
"Show notebook abc123"
```

## License

MIT
