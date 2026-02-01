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

### 5. Session Management

Track sessions per-notebook for intelligent resume decisions.

**Session State (in-memory, conversation-scoped - resets on new session):**
```
_sessions = {
  "<notebook-id>": {
    agentId: string | null,
    questionCount: number,
    lastQueried: ISO timestamp
  }
}
```

**Decision Logic:**

| Condition | Action |
|-----------|--------|
| Same notebook, count < 5, < 10 min old | Resume with agentId |
| Same notebook, count >= 5 | Ask user: continue or fresh? |
| Same notebook, > 10 min stale | New agent |
| Different notebook | Use that notebook's session |
| "new session" / "start fresh" | New agent, reset count |

**Session prompt (at 5+ questions):**
```
AskUserQuestion({
  questions: [{
    question: "Continue current session or start fresh?",
    header: "Session (5+ questions)",
    options: [
      { label: "Continue", description: "Keep context" },
      { label: "New Session (Recommended)", description: "Start fresh" }
    ],
    multiSelect: false
  }]
})
```

**Based on selection:**
- "New Session" → `_sessions[id] = { agentId: null, questionCount: 0, lastQueried: now }`
- "Continue" → Resume with existing agentId

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

### 7. Follow-Up Mechanism (CRITICAL)

Every agent response ends with a follow-up prompt and returns an `agentId`.

**Required behavior:**
1. **STOP** - Do not immediately respond to user
2. **ANALYZE** - Compare answer to user's original request
3. **IDENTIFY GAPS** - Is more information needed?
4. **ASK FOLLOW-UP** - If gaps exist, use resume with agentId:
   ```
   Task({
     subagent_type: "notebooklm-connector:chrome-mcp-query",
     resume: {agentId},
     prompt: "Follow-up: [comprehensive question with context]"
   })
   ```
5. **REPEAT** - Until information is complete
6. **SYNTHESIZE** - Combine all answers before responding to user

**Limit**: Max 3 follow-ups. After 3, ask user: "Continue investigation or summarize now?"

**Why resume?** The sub-agent retains previous analysis context, enabling immediate follow-up without re-navigation.

**Example flow:**
```
User: "How do I implement streaming with error handling in Gemini API?"

Agent 1: Returns streaming info + FOLLOW-UP CHECK
→ Main agent identifies: error handling details missing
→ Resume with: "Follow-up: What are the specific error types and recommended handling patterns for streaming?"

Agent 2: Returns error handling details
→ Main agent: Information complete
→ Synthesize both answers and respond to user
```

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
