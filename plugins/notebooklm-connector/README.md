# notebooklm-connector

> Query your Google NotebookLM notebooks directly from Claude Code — source-grounded answers without leaving the terminal.

## Why

Working with external documentation in Claude Code means bad trade-offs: feeding entire docs into context burns tokens, Claude may hallucinate when it doesn't have the information, and copy-pasting between NotebookLM and your editor kills flow.

This plugin bridges Claude Code and NotebookLM through Chrome automation. You ask a question in natural language, and it routes to NotebookLM — which answers strictly from your uploaded documents. Coverage analysis detects gaps and sends follow-up queries (default 3 rounds, configurable via `max_followups`) before presenting the final answer with citations.

## Features

| Feature | Description |
|---------|-------------|
| Source-grounded answers | Responses come only from your uploaded documents, not training data |
| Automatic follow-up | Coverage analysis detects gaps and re-queries — default 3 rounds, configurable via `max_followups` |
| Input length pre-validation | Rejects prompts over ~40k characters before they reach NotebookLM |
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
