---
name: notebooklm-manager
description: |
  This skill should be used when the user wants to interact with NotebookLM notebooks
  via Claude Code's Chrome integration.

  Trigger phrases: "Query my NotebookLM", "Ask my notebook about X", "query [id] about X",
  "list my notebooks", "add notebook URL", "show notebook details", "search notebooks for X",
  "Check my docs", "what does my [topic] notebook say about".

  Also triggers when user: (1) mentions NotebookLM explicitly, (2) shares NotebookLM URL
  (https://notebooklm.google.com/notebook/...).

  Do NOT use for: general web searches, local file reading, or non-NotebookLM documentation queries.

  Requires: claude --chrome with claude-in-chrome MCP.
allowed-tools:
  - Read
  - Write
  - Task
  - AskUserQuestion
---

# NotebookLM Manager

Query orchestration and notebook registry management.

## Instructions

### 1. Chrome Connection Check

Before any query, verify Chrome connection.
**Note**: Chrome MCP tools (`mcp__claude-in-chrome__*`) are only available to the agent, not this skill.
The skill delegates connection verification to the agent via Task invocation.

If agent reports Chrome not connected → Inform user: "Chrome not connected. Run: `claude --chrome`"

### 2. Query Detection

Extract from user message:
- `notebook_id`: Which notebook (e.g., "claude-docs")
- `question`: What to ask

### 3. Notebook Lookup

Read `${SKILL_ROOT}/data/library.json` to find notebook URL.
- **File not found → Create `data/` folder and files with `[]`**
- Not found → Show "Did you mean?" with similar IDs

### 4. Chat History Confirmation (First Query Only)

**Before the first query to a notebook**, ask user about chat history:

```
AskUserQuestion({
  questions: [{
    question: "Clear NotebookLM chat history before querying?",
    header: "History",
    options: [
      { label: "No (Recommended)", description: "Keep previous context, faster response" },
      { label: "Yes", description: "Start fresh, may involve UI modal interaction" }
    ],
    multiSelect: false
  }]
})
```

Pass result to agent as `clearHistory: true/false` in the prompt.

**Note**: Clearing history may trigger a confirmation modal in NotebookLM, which can slow down automation. Default "No" is recommended.

### 5. Session Management (File-Based, Per-Session)

Track agentId per notebook using persistent file storage, isolated per Claude Code session.

**Session ID**: `${CLAUDE_SESSION_ID}` (automatically replaced with current session ID)

**Session State File**: `${SKILL_ROOT}/data/sessions/${CLAUDE_SESSION_ID}.json`

**Why session-scoped?**
- Cannot resume a sub-agent from terminal A in terminal B
- Each Claude Code session uses an independent state file
- Prevents conflicts in multi-terminal environments

**Schema**:
```json
{
  "notebooks": {
    "<notebook-id>": {
      "agentId": "string or null",
      "questionCount": 0,
      "lastQueried": "ISO timestamp"
    }
  },
  "created_at": "ISO timestamp",
  "updated_at": "ISO timestamp"
}
```

#### 5.1 Session Operations

**BEFORE every query:**
1. Read `${SKILL_ROOT}/data/sessions/${CLAUDE_SESSION_ID}.json`
   - Directory not found → Create `data/sessions/`
   - File not found → Create with empty notebooks: `{"notebooks": {}, "created_at": "<now>", "updated_at": "<now>"}`
2. Look up `notebooks[notebook-id]`
   - Not found → No session exists (agentId is null)

**AFTER every query:**
1. Update session:
   - Set `notebooks[id].agentId` from Task result
   - Increment `notebooks[id].questionCount`
   - Set `notebooks[id].lastQueried` to current ISO timestamp
   - Set `updated_at` to current ISO timestamp
2. Write updated state to `${SKILL_ROOT}/data/sessions/${CLAUDE_SESSION_ID}.json`

#### 5.2 Decision Logic

| Condition | Action |
|-----------|--------|
| Session not found / agentId null | Create new sub-agent, save agentId |
| agentId exists AND count < 5 | Resume with existing agentId |
| count >= 5 | Ask user: "Continue or New Session?" |

**Session prompt (at 5+ questions):**
```
AskUserQuestion({
  questions: [{
    question: "Would you like to continue the current session or start a new one?",
    header: "Session (5+ questions)",
    options: [
      { label: "Continue", description: "Maintain existing context" },
      { label: "New Session (Recommended)", description: "Start with new sub-agent" }
    ],
    multiSelect: false
  }]
})
```

**Based on selection:**
- "New Session" → Set `notebooks[id] = { agentId: null, questionCount: 0, lastQueried: now }` → On next Task call, create new sub-agent → save new agentId
- "Continue" → Resume with existing agentId

#### 5.3 Automatic Cleanup (Hooks)

- **SessionEnd hook**: Automatically deletes session file when session terminates
- **SessionStart hook**: Cleans up session files older than 24 hours (TTL)
- **Abnormal termination protection**: TTL-based cleanup prevents orphan files

### 6. Agent Invocation

**New session:**
```
Task({
  subagent_type: "notebooklm-connector:chrome-mcp-query",
  prompt: `Execute 6 steps: Input parsing → Tab setup → Title extraction → Submit question → Poll response → Output and exit

URL: {url}
Question: {question}
mode: query
clearHistory: {true/false}

Output the response immediately upon receiving it and exit.`
})
```

**Resume session:**
```
Task({
  subagent_type: "notebooklm-connector:chrome-mcp-query",
  resume: {agentId},
  prompt: "Follow-up: {question}"
})
```

### 7. Follow-Up Mechanism (⚠️ CRITICAL - MANDATORY)

**Core Principles:**
- Sub-agent returns response + FOLLOW_UP_REQUIRED block, then terminates
- **Main agent MUST perform the CHECKLIST**

**Quick Reference (5 Steps):**

1. **Check** for `⚠️ FOLLOW_UP_REQUIRED` in response
2. **Analyze** user's original request → list keywords
3. **Verify** each keyword is covered (✅/❌)
4. **Query** for missing topics via `Task(resume: agentId)`
5. **Complete** when all covered OR 3 follow-ups done → synthesize

**Max 3 follow-ups**: Ask user to summarize or continue after limit reached.

**Why resume?** Sub-agent retains previous context, enabling immediate follow-up without re-navigation.

See `references/follow-up-workflow.md` for detailed workflow, examples, and session update rules.

---

## Response Format

```
**Notebook**: [Title] (`{id}`)

**Answer**: [response]

**Citations**:
[1] "quote" - Source: [doc]

---
**Suggested follow-ups**:
- [question 1]
- [question 2]
```

---

## Commands

See `references/commands.md` for full command reference.

| Command | Description |
|---------|-------------|
| `list` | Show active notebooks |
| `add <url>` | Smart add (auto-discover) |
| `show <id>` | Notebook details |
| `search <query>` | Find notebooks |

---

## Storage

Location: `${SKILL_ROOT}/data/`

```
data/
├── library.json        # Active notebooks (index)
├── archive.json        # Archived notebooks
└── notebooks/{id}.json # Full metadata (on-demand)
```

**Initialization**:
- If `data/` folder does not exist, create it
- If `library.json` does not exist, create with:
  `{"notebooks": {}, "schema_version": "3.0", "updated_at": "<ISO timestamp>"}`
- If `archive.json` does not exist, create with:
  `{"notebooks": {}, "schema_version": "3.0", "updated_at": "<ISO timestamp>"}`
- If `notebooks/` folder does not exist, create it

---

## Tool Boundaries

- **Use**: Read, Write, Task, AskUserQuestion
- **Do NOT use**: Chrome MCP tools directly (`mcp__claude-in-chrome__*`)

---

## References

- `references/commands.md` - Full command reference
- `references/schemas.md` - JSON schemas
- `references/follow-up-workflow.md` - Detailed follow-up mechanism

---

## Plan Mode Support (Automatic)

In Plan Mode, the skill is automatically invoked via a UserPromptSubmit hook when notebook-related keywords are detected.

**How it works:**
1. Hook detects keywords: "notebook", "노트북", "notebooklm", or NotebookLM URLs
2. Hook checks if current mode is Plan Mode (`permission_mode: "plan"`)
3. If Plan Mode: Hook runs `claude -p` to invoke this skill in an independent process
4. Results are injected back as context for the main session to use in planning

**No syntax change required.** Use the same natural language:
- "Ask my claude-code-docs notebook about hooks"
- "Query gemini-api notebook for function calling examples"
- "Compare information from claude-docs and gemini-api notebooks"

**Note:** In Plan Mode, each query runs in a fresh process. Session state (agentId, questionCount) from previous queries is not preserved across Plan Mode invocations
