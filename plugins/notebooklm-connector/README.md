# NotebookLM Connector

> Query your Google NotebookLM notebooks directly from Claude Code — source-grounded answers without leaving the terminal.

## The Problem

Working with external documentation in Claude Code often means choosing between bad trade-offs:

- **Token cost**: Feeding entire documentation sets into Claude's context burns tokens and still misses details buried in long documents.
- **Hallucination risk**: When Claude doesn't have the information, it may generate plausible-sounding but incorrect answers — dangerous for API references and technical specs.
- **Manual friction**: Copy-pasting between NotebookLM and your editor disrupts your flow and loses context between queries.

## The Solution

Not  ebookLM Connector bridges Claude Code and Google NotebookLM through Chrome browser automation. You ask Claude a question in natural language, and the plugin routes it to NotebookLM, which answers strictly from your uploaded documents — then brings the response back into your terminal with citations.

```
You (in Claude Code)
  │
  ├─ "What's the rate limit for the Gemini API?"
  │
  ▼
Skill (notebooklm-manager)
  │  Finds notebook, orchestrates query
  ▼
Agent (chrome-mcp-query)
  │  Automates Chrome via MCP
  ▼
NotebookLM (in your browser)
  │  Answers from uploaded docs only
  ▼
Coverage Analysis
  │  Checks if all topics are covered
  │  Sends follow-up queries if gaps found
  ▼
Final Answer (with citations)
```

Key differentiators:

- **Source-grounded**: Answers come only from documents you uploaded to NotebookLM — no hallucinations from training data.
- **Automatic follow-up**: Coverage analysis detects gaps in the answer and sends additional queries (up to 3 rounds) before presenting the final result.

## Why NotebookLM?

| Approach | Token Cost | Accuracy | Setup Effort | Best For |
|----------|-----------|----------|-------------|----------|
| Feed docs into context | High | Varies by doc size | None | Small, single documents |
| Web search | None | Unverified sources | None | General knowledge |
| Local RAG pipeline | Medium | Depends on chunking | High (infra + tuning) | Large private corpora |
| **NotebookLM via this plugin** | **None** | **Document-only** | **Medium (one-time)** | **Technical references, API docs** |

NotebookLM uses Gemini to answer questions strictly from your uploaded sources. This plugin automates the interaction so you never leave Claude Code.

## Prerequisites

This plugin requires Claude Code's Chrome integration (beta) to interact with NotebookLM in your browser.

- **Google Chrome or Microsoft Edge** (Brave, Arc, and other Chromium-based browsers are not supported. WSL is also not supported.)
- **Claude in Chrome extension** v1.0.36+ ([Chrome Web Store](https://chromewebstore.google.com/detail/claude/fcoeoabgfenejglbffodgkkbkcdhcgfn))
- **Claude Code CLI** v2.0.73+
- **Direct Anthropic plan** (Pro, Max, Teams, or Enterprise) — not available through third-party providers (Amazon Bedrock, Google Cloud Vertex AI, Microsoft Foundry)
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

## Quick Start

After completing Prerequisites and Installation:

### 1. Add a notebook

Upload your documents to [NotebookLM](https://notebooklm.google.com) and copy the notebook URL, then tell Claude:

```
"Add https://notebooklm.google.com/notebook/abc123 to my notebooks"
```

The plugin uses Smart Add to automatically open the notebook in Chrome, extract its title, topics, and description, and register it in your library.

### 2. Query it

Ask Claude a question about any topic in that notebook:

```
"What authentication methods does the API support?"
```

Claude routes the question to NotebookLM, retrieves the answer, then runs coverage analysis to check whether all parts of your question were addressed.

### 3. See coverage analysis in action

If you ask a multi-part question, the plugin automatically detects gaps:

```
"Explain function calling and structured outputs in the Gemini API"
```

The plugin queries NotebookLM, checks whether both "function calling" and "structured outputs" are covered, and sends a follow-up query for any missing topic — all before presenting the final synthesized answer.

## Usage Examples

### API documentation lookup during development

You're implementing a function calling feature and need to check the exact request format:

```
You: "What's the request format for function calling in the Gemini API?"

Claude:
**Notebook**: Gemini API Docs & Reference (`gemini-api-docs-reference`)

**Answer**: Function calling requires a `tools` parameter containing
`function_declarations` with name, description, and parameters schema...

---
**Suggested follow-ups**:
- How do I handle the function call response?
- What parameter types are supported in the schema?
```

### Multi-topic research with follow-up analysis

You need to compare features across documentation:

```
You: "Compare rate limits and pricing between different Gemini model tiers"
```

The plugin queries NotebookLM, detects that "pricing" wasn't fully covered in the first response, automatically sends a follow-up query about pricing, then presents a unified answer covering both topics.

## Architecture

### Plugin Components

```
notebooklm-connector/
├── .claude-plugin/plugin.json
├── skills/notebooklm-manager/
│   ├── SKILL.md
│   └── references/              # Command + schema docs
├── agents/chrome-mcp-query.md
└── hooks/
    ├── hooks.json
    ├── init-data.sh             # Data directory initialization
    ├── approve-data-write.sh    # Auto-approve writes to data dir
    └── follow-up-reminder.sh    # Coverage analysis reminder
```

User data is stored outside the plugin directory at `~/.claude/claude-code-zero/notebooklm-connector/data/` to persist across plugin updates.

### Query Flow

1. **Skill** (`notebooklm-manager`) receives the user's question, looks up the notebook in `library.json`, and delegates to the agent.
2. **Agent** (`chrome-mcp-query`) automates Chrome via the Claude-in-Chrome MCP server: navigates to the notebook URL, submits the question, polls for the response, and returns structured output.
3. **Hook** (`PostToolUse`) fires after the agent returns, reminding the skill to run coverage analysis.
4. **Coverage analysis** (in the skill) checks whether all topics in the original question were addressed. If gaps exist, it sends follow-up queries (max 3 rounds) before presenting the final answer.

### Data Storage

Location: `~/.claude/claude-code-zero/notebooklm-connector/data/`

```
data/
├── library.json            # Active notebook index (fast lookup)
├── archive.json            # Archived/disabled notebooks
└── notebooks/{id}.json     # Full metadata per notebook (loaded on-demand)
```

- Data is stored outside the plugin directory to persist across plugin updates.
- `library.json` stores minimal entries (id, name, url, topics) for fast loading.
- `notebooks/{id}.json` stores full metadata (description, tags, use cases, content types) and is loaded only when needed.
- The init hook automatically creates the data directory and empty files on first skill invocation.
- On first use after updating from an older version, existing data is migrated from the old location automatically.

## Commands Reference

All commands are triggered through natural language. Example phrases are shown below.

| Action | Example Phrases |
|--------|----------------|
| Add notebook | `"Add <url> to my notebooks"` |
| Add (manual) | `"Add <url> manually"` — skips auto-discovery, prompts for metadata |
| List notebooks | `"Show my notebooks"`, `"List my notebooks"` |
| List all | `"List all notebooks including archived"` |
| Show details | `"Show details for <id>"` |
| Search | `"Search notebooks about frontend"` |
| Query | `"What does my <topic> notebook say about X?"` |
| Enable/Disable | `"Disable the react-docs notebook"` |
| Remove | `"Delete the react-docs notebook"` — confirmation required |

## Features

### Smart Add

When you provide a NotebookLM URL, the plugin opens it in Chrome, reads the notebook title and uploaded document names, and automatically generates an ID, topics, and description. No manual metadata entry required.

### Coverage Analysis

After every query, the skill analyzes whether all keywords and topics from your original question appear in the response. If gaps are detected, it sends targeted follow-up queries to NotebookLM (up to 3 rounds) before presenting the final synthesized answer. This is mandatory and cannot be skipped.

### Chat History Management

By default, previous chat context in NotebookLM is preserved for faster responses. To start fresh, explicitly ask Claude to clear history before querying (e.g., "Clear history and ask my notebook about X").

### Tab Reuse

Follow-up queries to the same notebook reuse the existing Chrome tab instead of opening a new one. This makes multi-round coverage analysis fast and efficient.

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
