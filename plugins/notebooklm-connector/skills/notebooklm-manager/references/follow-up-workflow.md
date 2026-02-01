# Follow-Up Workflow Reference

Detailed documentation for the follow-up mechanism in NotebookLM query orchestration.

## Core Principles

- Sub-agent returns response + FOLLOW_UP_REQUIRED block, then terminates
- **Main agent MUST perform the CHECKLIST**

---

## Sub-agent Response Processing (MANDATORY)

After receiving sub-agent response, perform the following steps:

### STEP A: Check for FOLLOW_UP_REQUIRED in response
- Look for `⚠️ FOLLOW_UP_REQUIRED` or `📋 CHECKLIST` at the beginning of response

### STEP B: Analyze user's original request
- List the keywords/topics requested by user
- Example: "streaming and error handling" → keywords: ["streaming", "error handling"]

### STEP C: Verify response coverage
- Check if each keyword is covered in the response
- Covered: ✅ / Missing: ❌

### STEP D: Additional query for missing topics
```
Task({
  subagent_type: "notebooklm-connector:chrome-mcp-query",
  resume: {agentId from previous response},
  prompt: "Follow-up: {specific question about missing topic}"
})
```

### STEP E: Completion determination
- When all keywords are covered, OR
- After completing 3 follow-up queries
- → Synthesize all responses and deliver to user

---

## Session Update Rules

1. **After new sub-agent creation**: Extract agentId from Task result → `_sessions[id].agentId = newAgentId`
2. **After each query**: `_sessions[id].questionCount++`
3. **When "New Session" selected**: `_sessions[id] = { agentId: null, questionCount: 0, lastQueried: now }`

---

## Follow-up Query Limit

- **Max 3 follow-ups**: If information is still insufficient after 3 follow-up queries:
  ```
  AskUserQuestion({
    questions: [{
      question: "Completed 3 follow-up queries. Continue investigating?",
      header: "Follow-up Limit",
      options: [
        { label: "Summarize Now (Recommended)", description: "Synthesize response with current information" },
        { label: "Continue Investigation", description: "Continue with more queries" }
      ],
      multiSelect: false
    }]
  })
  ```

---

## Example Flow (Compound Question)

```
User: "Tell me about streaming and error handling in Gemini API"

[1st Query]
→ Task(new sub-agent) → returns agentId: "abc123"
→ _sessions["gemini-api"].agentId = "abc123"
→ _sessions["gemini-api"].questionCount = 1
→ Response: streaming info + FOLLOW_UP_REQUIRED block

[MANDATORY Checklist]
→ Keywords: ["streaming", "error handling"]
→ streaming: ✅ covered
→ error handling: ❌ missing
→ Decision: Additional query needed!

[2nd Query - Automatic]
→ Task(resume: "abc123", "Explain in detail how to handle errors in Gemini API")
→ _sessions["gemini-api"].questionCount = 2
→ Response: error handling info + FOLLOW_UP_REQUIRED block

[MANDATORY Checklist Re-check]
→ streaming: ✅ (1st response)
→ error handling: ✅ (2nd response)
→ Decision: Information complete!

[Synthesize Response]
→ Combine 1st + 2nd responses and deliver to user

[At 5+ queries]
→ AskUserQuestion("Continue or New Session?")
→ If "New Session" selected:
   → _sessions["gemini-api"] = { agentId: null, questionCount: 0 }
   → On next query, create new sub-agent → save new agentId
```

---

## Why Resume?

The sub-agent retains previous analysis context, enabling immediate follow-up without re-navigation.
