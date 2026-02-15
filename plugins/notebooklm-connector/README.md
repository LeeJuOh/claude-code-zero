# NotebookLM Connector

Manage and query Google NotebookLM notebooks directly from Claude Code using Chrome integration.

## Installation

### 1. Add the marketplace

```shell
/plugin marketplace add LeeJuOh/claude-code-zero
```

### 2. Install the plugin

```shell
/plugin install notebooklm-connector@claude-code-zero
```

Install with a specific scope:

```shell
# User scope (default, available across all projects)
/plugin install notebooklm-connector@claude-code-zero --scope user

# Project scope (shared with team via version control)
/plugin install notebooklm-connector@claude-code-zero --scope project
```

### 3. Verify installation

Run `/plugin` and check the **Installed** tab to confirm.

### Plugin management

```shell
/plugin disable notebooklm-connector@claude-code-zero    # Disable
/plugin enable notebooklm-connector@claude-code-zero     # Re-enable
/plugin update notebooklm-connector@claude-code-zero     # Update
/plugin uninstall notebooklm-connector@claude-code-zero  # Uninstall
```

## Prerequisites

This plugin requires Claude Code's Chrome integration to interact with NotebookLM in your browser.

- **Google Chrome or Microsoft Edge** (Brave/Arc not supported)
- **Claude in Chrome extension** v1.0.36+ ([Chrome Web Store](https://chromewebstore.google.com/detail/claude/fcoeoabgfenejglbffodgkkbkcdhcgfn))
- **Claude Code CLI** v2.0.73+
- **Paid Claude plan** (Pro, Max, Team, or Enterprise)
- **Google account** logged into [NotebookLM](https://notebooklm.google.com) in Chrome

### Setup

1. Install the [Claude in Chrome extension](https://chromewebstore.google.com/detail/claude/fcoeoabgfenejglbffodgkkbkcdhcgfn)
2. Start Claude Code with Chrome integration:
   ```bash
   claude --chrome
   ```
   Or enable in an existing session: `/chrome`
3. Verify connection: `/chrome` should show "Connected"
4. Log into [notebooklm.google.com](https://notebooklm.google.com) in Chrome and keep the session active

To enable Chrome integration by default without the `--chrome` flag: `/chrome` > Select "Enabled by default"

## Usage

### Add a notebook

```
"Add Vercel AI SDK documentation to my notebooks"
```

Claude will ask for alias, topic, and URL, then register the notebook.

### List notebooks

```
"Show me my notebook list"
```

### Query a notebook (Chrome integration required)

```
"What are the rules of Hooks in React docs?"
```

Claude will query NotebookLM through Chrome and return an answer with citations. A follow-up mechanism automatically checks coverage and asks additional questions if needed (up to 3 rounds).

### Manage notebooks

```
"Delete the React docs notebook"
"Update the topic of my AI SDK notebook"
"Search notebooks about frontend"
```

### Chat history

Before the first query to a notebook, you can choose to clear NotebookLM's chat history:

- **No** (recommended): Keep previous context for faster responses
- **Yes**: Start fresh with no prior context

This prompt appears once per notebook URL per session.

## Features

### Skill: notebooklm-manager

Manages the notebook registry and orchestrates queries.

- **Add/List/Delete/Update/Search** notebooks
- Query orchestration with automatic follow-up analysis
- Coverage analysis to ensure comprehensive answers

### Agent: chrome-mcp-query

Queries NotebookLM using your Chrome browser session.

- Automatic connection and login verification
- Chat history management (delete/keep)
- Structured answer format (Title / Answer / Citations / Follow-ups)
- Tab preservation for user verification
- One notebook URL, one question per invocation

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Chrome integration not connected | Run `claude --chrome` or `/chrome`. Verify with `/chrome`. |
| Authentication errors | Log into [notebooklm.google.com](https://notebooklm.google.com) in Chrome. Keep session active. |
| Modal dialog freezes automation | Manually dismiss the dialog in Chrome, then tell Claude to continue. |
| Notebook not found | Verify the notebook is registered (`"list my notebooks"`). URL must start with `https://notebooklm.google.com/notebook/`. |
| UI element not found | Wait a few seconds and retry. Verify the page loads correctly in Chrome. |
| Response timeout | Retry or simplify the question. Check network connection. |
| Session expired | Re-login to NotebookLM in Chrome, then retry. |

If issues persist:

1. Check Claude Code version: `claude --version` (must be 2.0.73+)
2. Verify Chrome extension is enabled: `chrome://extensions`
3. Restart both Chrome and Claude Code
4. If first-time setup, restart Chrome to register the native messaging host

## References

- [Claude Code Chrome Integration](https://code.claude.com/docs/en/chrome)
- [NotebookLM](https://notebooklm.google.com)

## License

MIT
