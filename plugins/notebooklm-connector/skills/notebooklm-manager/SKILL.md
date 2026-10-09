---
name: notebooklm-manager
description: |
  Manages NotebookLM notebooks — query, add, list, search, enable/disable, remove.
  Use when a notebooklm.google.com URL appears or user mentions NotebookLM.
  Handles URLs through its own Chrome agent — do not navigate directly.
  Requires: claude-in-chrome MCP.
allowed-tools: Read, Write, Edit, Agent, AskUserQuestion
---

# NotebookLM Manager

Query orchestration and notebook registry management.

## Instructions

### Tool Boundaries
Don't call Chrome MCP tools (`mcp__claude-in-chrome__*`) directly. All browser interaction goes through the chrome-mcp-query agent via Agent, because the agent owns tab setup, response polling, and error classification. If the agent returns an error, report it instead of attempting Chrome tools yourself.

### 0. Data Path Resolution (run first)

Read `~/.claude-code-zero/notebooklm-connector/data-path` to obtain `DATA_DIR`.
The PreToolUse hook automatically detects install scope (project vs user) and writes the correct path.

- The file contains a single line: the absolute path to the data directory.
- Store this as `{DATA_DIR}` and use it for ALL subsequent file operations.
- **File read error → Tell user to restart the session (hook may not be loaded).**

### 0.1 Config

Read `{DATA_DIR}/config.json` for user preferences:
- `max_followups`: Maximum follow-up queries in coverage analysis (default: 3)
- `max_query_length`: Maximum characters per query sent to NotebookLM (default: 40000)
- `language`: Preferred response language (null = match user's language)
- `auto_coverage`: Enable automatic coverage analysis (default: true)

If the file is missing or a field is absent, use defaults above.

### 1. Query Detection

Extract from user message:
- `notebook_id`: Which notebook (e.g., "claude-docs")
- `question`: What to ask

### 2. Notebook Lookup

Read `{DATA_DIR}/library.json` to find notebook URL.
- **File not found → Re-run Step 0. If still missing, tell user to restart the session.**
- Not found → Show "Did you mean?" with similar IDs

### 3. Chat History

Default: `clearHistory: false` (keep previous context).

Set `clearHistory: true` only when the user explicitly requests it
(e.g., "clear history and query…", "start fresh on this notebook").

### 3.5 Input Length Validation

NotebookLM has a server-side character limit on chat input (~45,000–50,000 chars). There is no client-side enforcement — the textarea accepts any length, but the backend silently fails to respond beyond the limit, leaving the agent stuck in a polling loop.

Read `max_query_length` from config (default: 40000).

If `question.length > max_query_length`:
1. **Condense**: Rewrite the question to stay within the limit while preserving intent and key terms.
2. **Inform user**: Note that the question was condensed and show the shortened version.
3. If the question cannot be meaningfully condensed (e.g., a large code block the user wants analyzed), suggest breaking it into smaller, focused queries.

### 4. Agent Invocation

```
Agent({
  subagent_type: "notebooklm-connector:chrome-mcp-query",
  prompt: `Execute the workflow: Input parsing → Tab setup → Title extraction → Submit question → Poll response → Output and exit

URL: {url}
Question: {question}
clearHistory: {true/false}

Output the response immediately upon receiving it and exit.`
})
```

**Follow-up queries** use the same Agent format with the follow-up question.
The agent's STEP 1 automatically reuses the existing tab for the same URL.

#### 4.1 Agent Result Parsing

After Agent returns, check the agent output:

| Agent Output Contains | Action |
|---|---|
| `ERROR_TYPE: CHROME_NOT_CONNECTED` | Show the agent's "Steps to fix" to the user, stop |
| `ERROR_TYPE: AUTH_REQUIRED` | Tell user to log in to Google in Chrome, stop |
| `ERROR_TYPE:` (any other) | Show error details from agent output, stop |
| Agent tool itself errors | Inform user the agent could not start. Check plugin installation. |
| Response is empty or very short (< 20 chars) | Inform user that NotebookLM returned no meaningful response. Likely causes: input too long, no relevant content in notebook, or backend timeout. Do NOT proceed to coverage analysis. |
| Normal response (no ERROR_TYPE, ≥ 20 chars) | Proceed to Section 5 |

### 5. Coverage Analysis

NotebookLM frequently answers only the first part of multi-topic questions. Without this check, users get incomplete answers and need to re-query manually.

If `auto_coverage` is `false` in config, skip to Section 6.

After every successful Agent(chrome-mcp-query) return, check coverage before presenting the answer.
The PostToolUse hook will also remind you via `COVERAGE_REMINDER`.

#### STEP A: ANALYZE
Re-read user's original message. List ALL keywords/topics.

#### STEP B: VERIFY
Each keyword: ✅ covered / ❌ missing

#### STEP C: QUERY (if gaps)
Launch follow-up: `Agent(subagent_type: "notebooklm-connector:chrome-mcp-query", same URL, missing topic question)`
Follow-ups are cheap — the same Chrome tab is reused.
Then return to STEP A.

#### STEP D: COMPLETE
All covered OR `max_followups` reached → Synthesize and present (Section 6 format).
After limit: AskUserQuestion to confirm whether to continue.

---

### 6. Response Format

```
**Notebook**: [Title] (`{id}`)

**Answer**: [response]

---
**Suggested follow-ups**:
- [question 1]
- [question 2]
```

If `language` is set in config, present the answer in that language.

---

## Commands

See [references/commands.md](references/commands.md) for full command reference.

| Command | Description |
|---------|-------------|
| `list` | Show active notebooks |
| `add <url>` | Smart add (auto-discover) |
| `show <id>` | Notebook details |
| `search <query>` | Find notebooks |

---

## Storage

The hook picks the data directory per install scope and migrates legacy layouts. Always use `{DATA_DIR}` from Section 0. File formats: [references/schemas.md](references/schemas.md).

---

## References

- [references/commands.md](references/commands.md) — Full command reference
- [references/schemas.md](references/schemas.md) — JSON schemas
- [references/gotchas.md](references/gotchas.md) — Common pitfalls and failure modes
