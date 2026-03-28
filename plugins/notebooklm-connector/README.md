# notebooklm-connector

> Query your Google NotebookLM notebooks directly from Claude Code — source-grounded answers without leaving the terminal.

## Why

Working with external documentation in Claude Code means bad trade-offs: feeding entire docs into context burns tokens, Claude may hallucinate when it doesn't have the information, and copy-pasting between NotebookLM and your editor kills flow.

This plugin bridges Claude Code and NotebookLM through Chrome automation. You ask a question in natural language, and it routes to NotebookLM — which answers strictly from your uploaded documents. Coverage analysis detects gaps and sends follow-up queries (up to 3 rounds) before presenting the final answer with citations.

## Features

| Feature | Description |
|---------|-------------|
| Source-grounded answers | Responses come only from your uploaded documents, not training data |
| Automatic follow-up | Coverage analysis detects gaps and sends additional queries (up to 3 rounds) |
| Smart Add | Auto-extracts notebook title, topics, and description from URL |
| Natural language commands | Add, query, list, search, enable/disable, remove notebooks |
| Tab reuse | Follow-up queries reuse the existing Chrome tab |

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
```

## License

MIT
