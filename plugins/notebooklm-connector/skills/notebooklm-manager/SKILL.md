---
name: notebooklm-manager
description: |
  Manage NotebookLM notebooks and query them. Use when user:
  - Mentions "notebook", "notebooklm", "registry", "list notebooks", "add notebook"
  - Wants to manage their NotebookLM library
  - **Says "ask my [notebook] about [question]" or "query [notebook]: [question]"** (triggers notebook query)
allowed-tools:
  - Read
  - Write(/library.json)
  - Write(/archive.json)
  - Write(/notebooks/**)
  - Write(/logs/**)
  - Glob
  - Grep
  - Task
  - AskUserQuestion
---

# NotebookLM Manager

Central hub for NotebookLM notebook management and query orchestration. Manages local metadata and delegates queries to `notebooklm-chrome-researcher` agent.

## When to Use This Skill

Trigger when user:
- Mentions NotebookLM notebooks or registry management
- Wants to list, add, update, enable/disable, remove, or search notebooks
- **Asks questions to notebooks** (see Query Pattern Detection below)

---

## Query Pattern Detection (PRIORITY)

**IMPORTANT**: Before processing registry commands, check if user message matches query patterns.

### Supported Patterns

#### English Patterns
| Pattern | Example |
|---------|---------|
| `ask my {id} about {question}` | "ask my prompt-caching about KV caching" |
| `ask {id} about {question}` | "ask claude-docs about hooks" |
| `query {id}: {question}` | "query ml-notes: what is backpropagation?" |
| `what does {id} say about {question}` | "what does api-docs say about rate limits?" |

#### Korean Patterns (한국어)
| Pattern | Example |
|---------|---------|
| `{id}에게 물어봐: {question}` | "prompt-caching에게 물어봐: 캐싱이란?" |
| `{id}한테 {question}` | "ml-notes한테 신경망 설명해줘" |
| `{id}에서 {question} 찾아봐` | "api-docs에서 인증 방법 찾아봐" |

---

## Query Handling Flow (with Follow-up Loop)

```
1. Detect query pattern in user message
2. Extract notebook ID and question
3. Lookup notebook in library.json (or archive.json)
4. If not found → Show "Did you mean?" suggestions
5. If found → Get notebook URL from notebooks/{id}.json
6. Determine clear_history value (see below)
7. Invoke agent (first query)
8. **FOLLOW-UP LOOP** (see Follow-up Mechanism section)
9. Synthesize all answers and return to user
10. Update last_used timestamp
```

### Step 6: Determine clear_history Value

**Check user intent:**

| User Intent | clear_history | Detection Keywords |
|-------------|---------------|-------------------|
| Clear history | `"yes"` | "clear history", "fresh start", "히스토리 삭제", "새로 시작" |
| Keep history | `"no"` | "keep history", "continue", "히스토리 유지", "이어서" |
| Not mentioned | **ASK** | Use AskUserQuestion |

**If user didn't mention, ASK:**
```javascript
AskUserQuestion({
  questions: [{
    question: "Clear NotebookLM chat history before query?",
    header: "History",
    options: [
      { label: "No (Recommended)", description: "Keep existing context - faster response" },
      { label: "Yes", description: "Start fresh - slower (~10-15s overhead)" }
    ],
    multiSelect: false
  }]
});
// Map: "No" → "no", "Yes" → "yes"
```

### Step 7: First Agent Invocation

```javascript
Task({
  subagent_type: "notebooklm-connector:notebooklm-chrome-researcher",
  description: "Query notebook",
  prompt: `URL: ${notebook.url}
Question: ${extracted_question}
clear_history: ${clear_history_value}
mode: query

Return answer with completeness assessment and follow-up suggestions.`
});
```

---

## Follow-up Mechanism (Main Agent Controlled)

**CRITICAL**: The main agent (this skill) controls the follow-up loop, NOT the subagent.

### Agent Response Format

The agent returns:
```
**Notebook Title**: [exact title]

**Answer**: [response to question]

**Citations** (if any):
[1] "quote" - Source: [doc name]

---
**Completeness**: [percentage]%
**Gaps identified**: [list of missing information, if any]

**Suggested follow-ups**:
- [Question 1 that would fill gaps]
- [Question 2 for deeper exploration]
```

### Follow-up Decision Logic

After receiving agent response:

```
1. PARSE response:
   - Extract answer, completeness, gaps, suggestions

2. EVALUATE (Main agent decides based on FULL conversation context):
   - Does answer address user's ORIGINAL question?
   - Is completeness < 70%?
   - Are there critical gaps?
   - Did user imply they need comprehensive info?

3. IF follow-up needed (max 2 iterations):
   a. Select most relevant suggested question
   b. Invoke agent again:
      Task({
        subagent_type: "notebooklm-connector:notebooklm-chrome-researcher",
        prompt: `URL: ${notebook.url}
Question: ${selected_followup}
clear_history: no
mode: query
Context: Previous answer covered: ${previous_answer_summary}`
      })
   c. Accumulate answers

4. SYNTHESIZE all answers into coherent response

5. PRESENT to user with follow-up note
```

### Follow-up Criteria

| Condition | Action |
|-----------|--------|
| Completeness ≥ 80% AND no critical gaps | Return immediately |
| Completeness 50-79% AND suggestions exist | Ask 1 follow-up |
| Completeness < 50% OR critical gaps | Ask up to 2 follow-ups |
| Max iterations (2) reached | Return with note |

### Final Response Format

```
**Notebook**: [Title] (`{id}`)

**Answer**:
[Synthesized comprehensive answer combining all follow-up responses]

**Citations**:
[1] "quote" - Source: [doc name]
[2] ...

---
📊 **Query Summary**: [N] follow-up(s) performed for completeness

💡 **Want to explore further?**
- [Remaining suggested question 1]
- [Remaining suggested question 2]
```

---

## Query Error Handling

### Notebook Not Found
```
❌ Notebook '{id}' not found.

Did you mean:
- {similar-id-1} (Topics: ...)
- {similar-id-2} (Topics: ...)

Or try:
- List all: list
- Search: search {partial-id}
```

---

## Tool Boundaries (Strict)

- ✅ Use only: Read, Write, Glob, Grep, Task, AskUserQuestion
- ❌ Do NOT use Chrome tools directly (`mcp__claude-in-chrome__*`)

---

## Storage Model

Three-tier storage for token efficiency:

```
${CLAUDE_PLUGIN_ROOT}/skills/notebooklm-manager/
├── library.json      # Active notebooks (minimal metadata)
├── archive.json      # Inactive notebooks (minimal metadata)
├── notebooks/        # Full metadata per notebook
│   └── {id}.json
├── logs/             # Optional Q&A history
│   └── {id}-{timestamp}.json
└── references/       # Extended documentation
```

---

## Core Commands

### list
- `list` - Show active notebooks
- `list --all` - Show active + archived
- `list-inactive` - Show archived only

### show
- `show <id>` - Display full notebook metadata

### add
- `add <url>` - Smart add (auto-discover metadata via agent)
- `add <url> --name "" --topics "" --description ""` - Manual add

**Smart Add Flow:**
1. Validate URL (must start with `https://notebooklm.google.com/notebook/`)
2. Check duplicates in library → archive
3. Ask about clear_history (default: Yes for discovery)
4. Invoke agent with `mode: discover`
5. Parse response, extract metadata
6. Create notebook entry

### search
- `search <query>` - Search across name, topics, description, tags

### enable / disable
- `enable <id>` - Move from archive to library
- `disable <id>` - Move from library to archive

### update
- `update <id> [--name ""] [--topics ""] [--description ""]`

### remove
- `remove <id>` - Permanently delete (with confirmation)

---

## Data Rules

- **ID**: kebab-case, max 50 chars, unique
- **Topics**: Store top 3 in library.json/archive.json for tokens
- **Timestamps**: ISO 8601, update `updated_at` on changes, `last_used` on queries

---

## References (Progressive Disclosure)

Read only when needed:
- `references/operations.md` - Full command algorithms
- `references/schemas.md` - JSON schemas
- `references/examples.md` - Usage scenarios
- `references/implementation-notes.md` - Parsing, errors, messages