# Implementation Notes

Detailed flows, heuristics, and message templates moved out of SKILL.md for progressive disclosure.

**Smart Add Implementation Flow**:

**Step 1: Validate URL**
```javascript
if (!url.startsWith('https://notebooklm.google.com/notebook/')) {
  return ERROR: "Invalid URL format. Must start with: https://notebooklm.google.com/notebook/"
}
```

**Step 2: Check Duplicates**
```javascript
// Read library.json
const library = Read('${CLAUDE_PLUGIN_ROOT}/skills/notebooklm-manager/library.json');

// Check if URL already exists in active library (search by URL, not ID)
const existingInLibrary = Object.values(library.notebooks).find(nb => nb.url === url);
if (existingInLibrary) {
  return ERROR: `Notebook already exists in active library.

Name: ${existingInLibrary.name}
ID: ${existingInLibrary.id}

Available actions:
- View details: show ${existingInLibrary.id}
- Update metadata: update ${existingInLibrary.id} --name "..." --topics "..."`;
}

// Read archive.json
const archive = Read('${CLAUDE_PLUGIN_ROOT}/skills/notebooklm-manager/archive.json');

// Check if URL exists in archive
const existingInArchive = Object.values(archive.notebooks).find(nb => nb.url === url);
if (existingInArchive) {
  ASK: `Found in archive: ${existingInArchive.name}

Enable this notebook? (yes/no)`;

  if (user_says_yes) {
    // Move from archive to library (enable operation)
    return enable(existingInArchive.id);
  } else {
    return CANCEL;
  }
}
```

**Step 2.5: Determine clear_history Value (MANDATORY)**

```javascript
// Check if user expressed intent about chat history

// a) User wants to CLEAR history:
//    Intent: 채팅 히스토리를 삭제/클리어하고 싶다는 의도
//    Examples: "히스토리 삭제", "채팅 지워", "기록 클리어",
//              "clear history", "새로 시작해서 물어봐"
//    → clearHistoryValue = "yes"
//    WARNING: This is SLOW (~10-15 seconds overhead)

// b) User wants to KEEP history (RECOMMENDED):
//    Intent: 기존 대화를 유지하고 싶다는 의도
//    Examples: "히스토리 유지", "삭제하지 말고", "이어서 물어봐"
//    → clearHistoryValue = "no"
//    BENEFIT: Faster queries, no deletion overhead

// c) User didn't mention → MUST ASK (default: "아니오" for speed):
const clearHistory = AskUserQuestion({
  questions: [{
    question: "노트북 질의 전에 NotebookLM의 기존 채팅 히스토리를 삭제할까요?",
    header: "Chat History",
    options: [
      { label: "아니오 (권장)", description: "기존 대화 유지 - 빠른 응답" },
      { label: "예", description: "새로운 컨텍스트에서 시작 - 느림" }
    ],
    multiSelect: false
  }]
});
const clearHistoryValue = clearHistory.includes("아니오") ? "no" : "yes";
```

**Step 3: Invoke Agent (MANDATORY - Use Task Tool)**
```javascript
// CRITICAL: Pass explicit "yes" or "no", NEVER "ask"!
const response = Task({
  subagent_type: "notebooklm-chrome-researcher",
  description: "Query/Discover notebook",
  prompt: `URL: ${url}
Question: ${question}
clear_history: ${clearHistoryValue}

Return NotebookLM's answer with follow-up suggestions.`
});

// Agent handles: Chrome integration, navigation, SENDING question, extraction
// You receive: NotebookLM's actual response
```

**Step 4: Parse Agent Response**
```javascript
// Agent returns structured format:
// **Notebook Title**: Gemini API 레퍼런스
// **Answer**: This notebook covers Gemini API documentation...
// **Extracted Metadata**:
// - Topics: API, Gemini, Google AI
// - Content Types: documentation, reference
// ...

// Parse the structured response:
function parseAgentResponse(response) {
  const lines = response.split('\n');

  // 1. Extract EXACT notebook title (CRITICAL - do NOT modify)
  const titleLine = lines.find(l => l.startsWith('**Notebook Title**:'));
  const name = titleLine
    ? titleLine.replace('**Notebook Title**:', '').trim()
    : null;

  // 2. Extract answer/description
  const answerStart = lines.findIndex(l => l.startsWith('**Answer**:'));
  const metadataStart = lines.findIndex(l => l.startsWith('**Extracted Metadata**'));
  let description = '';
  if (answerStart !== -1) {
    const endIdx = metadataStart !== -1 ? metadataStart : lines.length;
    description = lines.slice(answerStart, endIdx)
      .join('\n')
      .replace('**Answer**:', '')
      .trim()
      .substring(0, 500); // Max 500 chars
  }

  // 3. Extract topics from metadata section
  const topicsLine = lines.find(l => l.includes('Topics:'));
  const topics = topicsLine
    ? topicsLine.split(':')[1].split(',').map(t => t.trim()).filter(Boolean)
    : [];

  // 4. Extract content types
  const contentTypesLine = lines.find(l => l.includes('Content Types:'));
  const content_types = contentTypesLine
    ? contentTypesLine.split(':')[1].split(',').map(t => t.trim()).filter(Boolean)
    : ['notes'];

  return { name, description, topics, content_types };
}

// IMPORTANT: Use the EXACT name from agent response
// Do NOT modify, translate, or "improve" the title
// The agent extracts it directly from NotebookLM page DOM
```

**Step 5: Generate ID**
```javascript
function generateId(name) {
  return name
    .toLowerCase()
    // Preserve non-ASCII characters (Korean, Japanese, Chinese, etc.)
    // Only remove special punctuation, keep letters and numbers
    .replace(/[\s]+/g, '-')           // Spaces → hyphen
    .replace(/[^\p{L}\p{N}-]/gu, '')  // Remove non-letter, non-number except hyphen (Unicode-aware)
    .replace(/-+/g, '-')              // Multiple hyphens → single
    .replace(/^-+|-+$/g, '')          // Remove leading/trailing hyphens
    .substring(0, 50);                // Max 50 chars
}

// Examples:
// "React Documentation" → "react-documentation"
// "Gemini API 레퍼런스" → "gemini-api-레퍼런스"
// "Claude Code 공식 문서" → "claude-code-공식-문서"
// "ML & AI Basics" → "ml-ai-basics"
// "OpenAI API Documentation" → "openai-api-documentation"

// Check collision:
let id = generateId(metadata.name);
let counter = 2;
while (idExists(id)) {
  id = generateId(metadata.name) + `-${counter}`;
  counter++;
}
```

**Step 6: Create Full Metadata File**
```javascript
const now = new Date().toISOString();
const fullMetadata = {
  id: id,
  name: metadata.name,
  url: url,
  description: metadata.description,
  topics: metadata.topics,
  tags: [],                        // Empty, user can add later
  use_cases: [],                   // Empty, user can add later
  content_types: metadata.content_types,
  created_at: now,
  updated_at: now,
  last_used: now,
  enabled: true
};

Write(
  `${CLAUDE_PLUGIN_ROOT}/skills/notebooklm-manager/notebooks/${id}.json`,
  JSON.stringify(fullMetadata, null, 2)
);
```

**Step 7: Add to Library (Minimal Entry)**
```javascript
// Read existing library
const library = Read('${CLAUDE_PLUGIN_ROOT}/skills/notebooklm-manager/library.json');

// Add new entry
library.notebooks[id] = {
  id: id,
  name: metadata.name,
  url: url,
  topics: metadata.topics.slice(0, 3),  // Top 3 only for tokens
  last_used: now
};

library.updated_at = now;

// Write back
Write(
  '${CLAUDE_PLUGIN_ROOT}/skills/notebooklm-manager/library.json',
  JSON.stringify(library, null, 2)
);
```

**Step 8: Confirm to User**
```
✅ Notebook added successfully!

📖 {metadata.name} ({id})

Topics: {topics[0]}, {topics[1]}, {topics[2]}

📊 Discovered content:
{description (first 200 chars)}...

---
Query this notebook:
  "Ask my {id} about [your question]"
  "Query {id}: [your question]"
```

---

**Manual Add** - Provide metadata directly:
```bash
add <url> --name "Name" --topics "topic1,topic2" --description "Description"
```

**Manual Flow** (skip discovery):
- User provides all metadata
- Skip Step 3 (agent invocation)
- Go directly to Step 5 (Generate ID)
- Faster but requires user input

---

**Priority Check**: Checks active notebooks first, then archive. If found in archive, asks to enable.

## Token Efficiency

| Operation | Tokens | Files Read |
|-----------|--------|------------|
| list | 300-500 | library.json only |
| list --all | 600-1000 | library.json + archive.json |
| show {id} | 200-300 | notebooks/{id}.json only |
| search | 2000-5000+ | All notebooks/{id}.json |

**70-85% token savings** vs single-file approach.

## Helper Functions

**ID Generation:**
```
"Machine Learning Basics" → "machine-learning-basics"
```
Lowercase + spaces→hyphens + remove special chars

**Relative Time:**
```
< 60s: "just now"
< 60m: "45m ago"
< 24h: "5h ago"
< 7d: "3d ago"
< 30d: "2w ago"
Otherwise: "2026-01-20"
```

**Parse Topics:**
```
"React, Frontend, Hooks" → ["React", "Frontend", "Hooks"]
```
Split by comma, trim whitespace.

## Error Handling & Interactive Guidance

### Smart Error Messages with Suggestions

**Not Found (with fuzzy matching):**

When a notebook ID is not found, perform smart matching and suggest alternatives:

```javascript
// User tries: show react
// ID "react" not found

// Step 1: Search for similar IDs
const allNotebooks = [...library.notebooks, ...archive.notebooks];
const suggestions = allNotebooks.filter(nb =>
  nb.id.includes('react') ||
  nb.name.toLowerCase().includes('react') ||
  nb.topics.some(t => t.toLowerCase().includes('react'))
);

// Step 2: Provide helpful error with suggestions
if (suggestions.length > 0) {
  ERROR: Notebook 'react' not found.

  Did you mean:
  - react-hooks-guide (Topics: React, Hooks, Frontend)
  - react-documentation (Topics: React, JSX, Components)

  Or search for more: search react
} else {
  ERROR: Notebook 'react' not found.

  Available notebooks: list
  Search by topic: search <query>
  Add new notebook: add <url>
}
```

**Implementation Logic:**
```javascript
function findSimilarNotebooks(searchTerm, maxResults = 3) {
  const allNotebooks = [
    ...Object.values(library.notebooks),
    ...Object.values(archive.notebooks)
  ];

  // Scoring system
  const scored = allNotebooks.map(nb => {
    let score = 0;
    const term = searchTerm.toLowerCase();

    // Exact ID match (highest priority)
    if (nb.id === term) score += 100;

    // ID contains term
    if (nb.id.includes(term)) score += 50;

    // Name contains term
    if (nb.name.toLowerCase().includes(term)) score += 30;

    // Topics contain term
    if (nb.topics.some(t => t.toLowerCase().includes(term))) score += 20;

    // Fuzzy: Edit distance < 3 for ID
    const editDistance = levenshtein(nb.id, term);
    if (editDistance <= 2) score += (3 - editDistance) * 15;

    return { notebook: nb, score };
  });

  // Return top matches with score > 0
  return scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults)
    .map(s => s.notebook);
}

// Simple Levenshtein distance for fuzzy matching
function levenshtein(a, b) {
  const matrix = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}
```

**Output Examples:**

**Example 1: Close match**
```
User: show react-doc
Error: 'react-doc' not found

Did you mean:
→ react-docs (Topics: React, Documentation)
  Last used: 2h ago

Or try:
- View all: list
- Search: search react
```

**Example 2: Multiple matches**
```
User: show ai
Error: 'ai' not found

Did you mean:
→ ai-fundamentals (Topics: AI, Machine Learning)
→ openai-api-docs (Topics: OpenAI, API, GPT)
→ ai-ethics-research (Topics: AI, Ethics) [ARCHIVED]

Or search: search ai
```

**Example 3: No matches**
```
User: show golang
Error: 'golang' not found

No similar notebooks found.

Available actions:
- View all notebooks: list
- Search by topic: search <query>
- Add new notebook: add <url>
```

---

**Duplicate with Details:**
```javascript
// User tries to add existing notebook

ERROR: Notebook 'react-hooks-guide' already exists.

Current details:
  Name: React Hooks Complete Guide
  Topics: React, Hooks, Frontend
  Status: Active
  Last used: 2h ago

Available actions:
- View details: show react-hooks-guide
- Update metadata: update react-hooks-guide --topics "React,Hooks,Advanced"
- If different notebook, use different name
```

---

**Invalid URL:**
```
ERROR: Invalid NotebookLM URL.

Expected format:
  https://notebooklm.google.com/notebook/<notebook-id>

Your URL:
  {user_provided_url}

Check:
- URL starts with https://notebooklm.google.com/notebook/
- Notebook ID is present
- No typos in domain name
```

---

**Empty Registry:**
```
No notebooks found.

To get started:
1. Add a notebook: add <url>
2. Or search existing: search <topic>

Example:
  add https://notebooklm.google.com/notebook/abc123def456
```

## Success Confirmation Messages

All operations should provide clear, actionable success messages.

### List Operation
```
📚 Active Notebooks (3)

1. claude-code-docs
   Topics: Claude Code, CLI, SDK
   Last used: 2h ago

2. react-hooks-guide
   Topics: React, Hooks, Frontend
   Last used: 5d ago

3. machine-learning-basics
   Topics: Machine Learning, Neural Networks
   Last used: 3h ago

---
Query: "Ask my claude-code-docs about [question]"
```

### Show Operation
```
📖 Claude Code Documentation (claude-code-docs)

Status: ✅ Active
URL: https://notebooklm.google.com/notebook/abc123

Description:
Complete official documentation for Claude Code including CLI usage,
agent development, plugin creation, MCP integration, and API reference.

Topics: Claude Code, CLI, Agent Development, SDK, Plugins
Tags: documentation, reference, official

Created: 2026-01-20 | Last used: 2h ago

---
Query: "Ask my claude-code-docs about [question]"
```

### Add Operation (Smart Add)
```
🔍 Discovering notebook content...
⏳ Querying NotebookLM...
✅ Notebook added successfully!

📖 React Documentation (react-documentation)

Topics: React, Hooks, JSX, Components

📊 Discovered content:
This notebook covers React documentation, focusing on Hooks, Components,
and JSX syntax. It contains official documentation and code examples...

---
Query: "Ask my react-documentation about [question]"
```

### Add Operation (Manual)
```
✅ Notebook added successfully!

📖 Python Asyncio Guide (python-asyncio-guide)

Topics: Python, Asyncio, Concurrency

---
Query: "Ask my python-asyncio-guide about [question]"
```

### Enable Operation
```
✅ Notebook enabled!

Name: Old React Tutorial
ID: old-react-tutorial

Status changed: Archived → Active

The notebook is now available in your active library.

Next steps:
- Query: "Ask my old-react-tutorial about <topic>"
- List active: list
```

### Disable Operation
```
✅ Notebook archived!

Name: React Native Docs
ID: react-native-docs

Status changed: Active → Archived

The notebook is now in archive (hidden from default list).
All metadata and Q&A logs are preserved.

To restore later:
- Enable: enable react-native-docs
- Or permanently remove: remove react-native-docs
```

### Update Operation
```
✅ Notebook updated!

Name: Claude Code Documentation
ID: claude-code-docs

Changes applied:
- Topics: Added "Hooks", "MCP Integration"
- Tags: Added "updated-2026"

Updated: just now

Next steps:
- View changes: show claude-code-docs
- Query with new topics: "Ask my claude-code-docs about MCP"
```

### Remove Operation
```
⚠️  Confirming deletion...

Notebook: Old React Tutorial
Status: Archived
Q&A logs: 12 files
Total size: ~45KB

Are you sure? This cannot be undone. (yes/no)

[User confirms]

✅ Notebook permanently deleted!

Removed:
- notebooks/old-react-tutorial.json
- 12 Q&A log files
- Archive registry entry

The notebook and all its data have been permanently removed.
```

### Search Operation
```
🔍 Search results for "react" (3 found)

Active:
1. react-hooks-guide — React, Hooks, Frontend (5d ago)
2. react-documentation — React, JSX, Components (2w ago)

Archived:
3. old-react-tutorial — React, Legacy, Tutorial (3mo ago)

---
Query: "Ask my react-hooks-guide about [question]"
```
