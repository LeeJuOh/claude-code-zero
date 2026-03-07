---
name: notebooklm-manager
description: |
  Manages NotebookLM notebooks — query, add, list, search, enable/disable, remove.
  ALWAYS use this skill when a notebooklm.google.com URL appears in the user's message
  or the user mentions NotebookLM in any context. This skill handles NotebookLM URLs
  through its own Chrome agent — do not navigate to NotebookLM URLs directly with
  Chrome tools when this skill is available.

  Trigger phrases: "add notebook" + URL, "query [id] about X", "list my notebooks",
  "show notebook details", "search notebooks", "check my docs",
  "what does my notebook say about", "remove/delete/disable/enable notebook".

  Do NOT use for: general web searches, local file reading, or non-NotebookLM queries.
  Requires: claude --chrome with claude-in-chrome MCP.
allowed-tools: Read, Write, Edit, Agent, AskUserQuestion
---

# NotebookLM Manager

Query orchestration and notebook registry management.

## Instructions

### CRITICAL CONSTRAINT
This skill MUST NOT call any `mcp__claude-in-chrome__*` tools.
These tools DO NOT EXIST in this skill's allowed tool set.
All Chrome interaction is delegated to the agent via Task.
After receiving an agent error, do NOT attempt to use Chrome tools yourself.

### 0. Data Path Resolution (MUST run first)

Read `~/.claude-code-zero/notebooklm-connector/data-path` to obtain `DATA_DIR`.
The PreToolUse hook automatically detects install scope (project vs user) and writes the correct path.

- The file contains a single line: the absolute path to the data directory.
- Store this as `{DATA_DIR}` and use it for ALL subsequent file operations.
- **File read error → Tell user to restart the session (hook may not be loaded).**

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

### 4. Agent Invocation

```
Task({
  subagent_type: "notebooklm-connector:chrome-mcp-query",
  prompt: `Execute the workflow: Input parsing → Tab setup → Title extraction → Submit question → Poll response → Output and exit

URL: {url}
Question: {question}
clearHistory: {true/false}

Output the response immediately upon receiving it and exit.`
})
```

**Follow-up queries** use the same Task format with the follow-up question.
The agent's STEP 1 automatically reuses the existing tab for the same URL.

#### 4.1 Agent Result Parsing

After Task returns, check the agent output:

| Agent Output Contains | Action |
|---|---|
| `ERROR_TYPE: CHROME_NOT_CONNECTED` | Show Chrome Connection Troubleshooting (below), stop |
| `ERROR_TYPE: AUTH_REQUIRED` | Tell user to log in to Google in Chrome, stop |
| `ERROR_TYPE:` (any other) | Show error details from agent output, stop |
| Task tool itself errors | Inform user the agent could not start. Check plugin installation. |
| Normal response (no ERROR_TYPE) | Proceed to Section 5 |

**Chrome Connection Troubleshooting** (show to user):
1. Verify Chrome or Edge browser is running
2. Chrome → `chrome://extensions` → Ensure "Claude in Chrome" extension is enabled
3. In Chrome, click extension icon → Side panel → Click **"Connect" button**
   - If a login screen appears, sign in with your Claude account (Pro/Max/Team/Enterprise required)
4. In Claude Code: `/chrome` → Select "Reconnect extension"
5. If this is your first time connecting, restart the browser to register the native messaging host, then repeat steps 3-4
6. Retry the query

### 5. Post-Query Coverage Analysis (MANDATORY — DO NOT SKIP)

**After EVERY successful Task(chrome-mcp-query) return, perform this checklist BEFORE presenting any answer.**
The PostToolUse hook will also remind you via `COVERAGE_REMINDER` message.

**DO NOT present the answer yet. DO NOT generate "Suggested follow-ups" yet.**

#### STEP A: ANALYZE
Re-read user's original message. List ALL keywords/topics.

#### STEP B: VERIFY
Each keyword: ✅ covered / ❌ missing

#### STEP C: QUERY (if gaps)
Launch follow-up: `Task(subagent_type: "notebooklm-connector:chrome-mcp-query", same URL, missing topic question)`
Follow-ups are cheap — the same Chrome tab is reused.
Then return to STEP A.

#### STEP D: COMPLETE
All covered OR 3 follow-ups → Synthesize and present (Section 6 format).
Max 3 follow-ups. After limit: AskUserQuestion to confirm whether to continue.

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

Data is isolated per install scope. The hook resolves the correct path automatically.

```
~/.claude-code-zero/notebooklm-connector/
├── data-path                       # Current session's resolved data directory
├── global/data/                    # User-level install (shared across projects)
│   ├── library.json
│   ├── archive.json
│   └── notebooks/{id}.json
└── projects/<md5-hash>/data/       # Project-level install (per-project isolation)
    ├── library.json
    ├── archive.json
    └── notebooks/{id}.json
```

The `data-path` file is written by the PreToolUse hook on each session start.
Data directory and default files are lazily created on first `data-path` read.

**Migration (one-time)**:
- `data/` → `global/data/`: Existing flat data layout is moved to the global subdirectory.
- Legacy paths (`~/.claude/plugins/...`, `~/.claude/claude-code-zero/...`) are copied to `global/data/`.

---

## Tool Boundaries

- **Use**: Read, Write (data dir), Edit (data dir), Task, AskUserQuestion
- **Do NOT use**: Chrome MCP tools directly (`mcp__claude-in-chrome__*`)

---

## References

- [references/commands.md](references/commands.md) - Full command reference
- [references/schemas.md](references/schemas.md) - JSON schemas
