---
name: notebooklm-manager
description: |
  Query NotebookLM notebooks via Chrome integration.
  Use when: "ask my notebook", "query [id] about X", "add notebook [url]"
  Requires: claude --chrome with claude-in-chrome MCP.
allowed-tools:
  - Read
  - Write
  - Glob
  - Task
  - AskUserQuestion
---

# NotebookLM Manager

Query orchestration and notebook registry management.

## Instructions

### 1. Chrome Connection Check

Before any query:
```
tabs_context_mcp() → Check connection
```
Not connected → "Chrome not connected. Run: `claude --chrome`"

### 2. Query Detection

Extract from user message:
- `notebook_id`: Which notebook (e.g., "claude-docs")
- `question`: What to ask

### 3. Notebook Lookup

Read `${SKILL_ROOT}/data/library.json` to find notebook URL.
- **File not found → Create `data/` folder and files with `[]`**
- Not found → Show "Did you mean?" with similar IDs

### 4. Session Management

**Count-based auto-resume logic:**

| Question # | Action |
|------------|--------|
| 1-5 | Auto-resume (`Task(resume: agentId)`) |
| 6+ | Ask user: resume or fresh session |
| "new session", "start fresh" | New agent (reset count) |
| Different notebook | New agent |

Track question count in conversation context (no file storage needed).

### 5. Agent Invocation

**New session:**
```
Task({
  subagent_type: "notebooklm-connector:notebooklm-chrome-researcher",
  prompt: "URL: {url}\nQuestion: {question}\nmode: query"
})
```

**Resume session:**
```
Task({
  subagent_type: "notebooklm-connector:notebooklm-chrome-researcher",
  resume: {agentId},
  prompt: "Follow-up: {question}"
})
```

### 6. Follow-Up Mechanism (CRITICAL)

Every agent response ends with a follow-up prompt and returns an `agentId`.

**Required behavior:**
1. **STOP** - Do not immediately respond to user
2. **ANALYZE** - Compare answer to user's original request
3. **IDENTIFY GAPS** - Is more information needed?
4. **ASK FOLLOW-UP** - If gaps exist, use resume with agentId:
   ```
   Task({
     subagent_type: "notebooklm-connector:notebooklm-chrome-researcher",
     resume: {agentId},
     prompt: "Follow-up: [comprehensive question with context]"
   })
   ```
5. **REPEAT** - Until information is complete
6. **SYNTHESIZE** - Combine all answers before responding to user

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

| Command | Description |
|---------|-------------|
| `list` | Show active notebooks |
| `list --all` | Include archived |
| `show <id>` | Notebook details |
| `add <url>` | Smart add (auto-discover) |
| `search <query>` | Find notebooks |
| `enable/disable <id>` | Toggle status |
| `remove <id>` | Delete (confirm required) |

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
- If `library.json` or `archive.json` does not exist, create with empty array `[]`
- If `notebooks/` folder does not exist, create it

---

## Tool Boundaries

- **Use**: Read, Write, Glob, Task, AskUserQuestion
- **Do NOT use**: Chrome MCP tools directly (`mcp__claude-in-chrome__*`)

---

## References

- `references/schemas.md` - JSON schemas
