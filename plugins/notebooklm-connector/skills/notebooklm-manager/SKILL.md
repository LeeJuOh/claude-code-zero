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

**Session State (in-memory, conversation-scoped):**
```
_sessions = {
  "<notebook-id>": {
    agentId: string | null,
    questionCount: number,
    lastQueried: ISO timestamp
  }
}
```

**Session Update Rules:**
1. **After new sub-agent creation**: Extract agentId from Task result → `_sessions[id].agentId = newAgentId`
2. **After each query**: `_sessions[id].questionCount++`
3. **When "New Session" selected**: `_sessions[id] = { agentId: null, questionCount: 0, lastQueried: now }`

**Decision Logic:**

| Condition | Action |
|-----------|--------|
| agentId == null | Create new sub-agent → save agentId |
| agentId != null && count < 5 | Resume with agentId |
| count >= 5 | Ask user: "Continue or New Session?" |
| > 10 min stale | New sub-agent, reset session |

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
- "New Session" → `_sessions[id] = { agentId: null, questionCount: 0, lastQueried: now }`
                → On next Task call, create new sub-agent → save new agentId
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
