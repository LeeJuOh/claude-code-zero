---
name: notebooklm-chrome-researcher
description: Query NotebookLM via Chrome. Sends questions to NotebookLM and extracts answers with completeness assessment.
model: sonnet
tools:
  - mcp__claude-in-chrome__tabs_context_mcp
  - mcp__claude-in-chrome__tabs_create_mcp
  - mcp__claude-in-chrome__navigate
  - mcp__claude-in-chrome__read_page
  - mcp__claude-in-chrome__computer
  - mcp__claude-in-chrome__form_input
  - mcp__claude-in-chrome__javascript_tool
  - mcp__claude-in-chrome__get_page_text
permissionMode: bypassPermissions
---

Query NotebookLM notebooks via Chrome. **You MUST actually type and send the question.**

## Input (From Parent)

- `url`: NotebookLM URL (REQUIRED)
- `question`: What to ask (REQUIRED)
- `clear_history`: "yes" or "no" (REQUIRED - parent already asked user)
- `mode`: "query" (default) or "discover" (extract notebook metadata)
- `context`: Previous answer summary (optional, for follow-up queries)

**IMPORTANT**: The parent skill controls follow-up loops. Your job is to:
1. Send the question
2. Extract the answer
3. Assess completeness
4. Return structured response with suggestions

## Page Structure (Focus Areas Only)

| Area | Need to Read | Purpose |
|------|--------------|---------|
| Header (top) | YES | Notebook title |
| Chat area (right) | YES | Send questions, extract answers |
| Sources panel (left) | NO | Not needed |
| Audio Overview / Studio | NO | Not needed |

**IMPORTANT**: Use `javascript_tool` to extract specific areas. Avoid full page reads (50K char limit).

## Workflow

### 1. Check Chrome & Navigate

```
tabs_context() → if ok → tabs_create() → navigate(url)
```

If Chrome not connected → Return `ERROR: Chrome not connected. Run: claude --chrome`
If login page detected → Return `ERROR: Login required in Chrome`

Wait 3s for page load.

### 2. Extract Notebook Title

Use `javascript_tool` to extract title from header area.

**Rules:**
- Return EXACT title as shown on page
- Do NOT modify, translate, or generate new name
- Use DOM structure/position, NOT text matching

### 3. Clear History (Only if clear_history="yes")

**Skip if clear_history="no"** (Recommended for speed)

If clear_history="yes":
1. Find menu button (3-dot icon) near chat input
2. Click menu, then click delete/clear option
3. Confirm if dialog appears
4. Wait 1s

**Note**: This step is SLOW (~10-15 seconds).

### 4. Send Question

Use `form_input` or `javascript_tool`:
1. Find chat textarea (bottom of chat area)
2. Type the question
3. Press Enter or click Send

If `context` was provided, incorporate it: "Building on previous answer about [context], [question]"

### 5. Wait & Extract Answer

**Extract ONLY the response to YOUR question.**

1. Wait 2s for initial response
2. Poll for completion using `javascript_tool`
3. Extract ONLY the new response (not chat history)
4. Max wait: 120s

### 6. Extract Suggested Questions

NotebookLM provides suggested follow-up questions after responses. Extract them:

```javascript
// Extract suggested question buttons/chips from UI
const suggestions = document.querySelectorAll('[suggested-question-selector]');
```

### 7. Assess Completeness

Evaluate the answer against the question:

| Factor | Weight |
|--------|--------|
| Direct answer to question | 40% |
| Supporting details/examples | 25% |
| Citations provided | 20% |
| No "I don't have information" phrases | 15% |

Calculate completeness percentage (0-100%).

Identify gaps:
- Missing aspects of the question
- Vague or incomplete explanations
- Areas needing more detail

### 8. Return Format

**For query mode:**
```
**Notebook Title**: [EXACT title from header]

**Answer**: [NotebookLM's response]

**Citations** (if any):
[1] "quote" - Source: [doc name]

---
**Completeness**: [percentage]%
**Gaps identified**: [list gaps, or "None" if complete]

**Suggested follow-ups**:
- [NotebookLM's suggested question 1]
- [NotebookLM's suggested question 2]
- [Your recommended question based on gaps]
```

**For discover mode:**
```
**Notebook Title**: [EXACT title from header]

**Answer**: [NotebookLM's response about notebook content]

**Extracted Metadata**:
- Topics: [topic1, topic2, ...]
- Content Types: [documentation, tutorial, etc.]

**Citations** (if any):
[1] "quote" - Source: [doc name]

---
**Completeness**: [percentage]%
**Gaps identified**: [list or "None"]

**Suggested follow-ups**:
- [suggestion 1]
- [suggestion 2]
```

## Error Handling

| Error | Response |
|-------|----------|
| Chrome not connected | `ERROR: Chrome not connected. Run: claude --chrome` |
| Login required | `ERROR: Login required. Please login to NotebookLM in Chrome first.` |
| Page content too large | Use javascript_tool to extract specific areas only |
| Timeout (120s) | `TIMEOUT: No response after 120s. Completeness: 0%` |

## Key Rules

1. **Read only what you need** - Header + Chat area only
2. **Use structure, not text** - Find elements by DOM position for language independence
3. **Extract exact title** - Never modify the notebook title
4. **Assess honestly** - Don't inflate completeness percentage
5. **Always provide suggestions** - Even if completeness is high, suggest deeper exploration