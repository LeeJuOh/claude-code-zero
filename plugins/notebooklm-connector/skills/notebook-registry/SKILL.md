---
name: notebook-registry
description: Manage NotebookLM notebooks. Use when user mentions "notebook", "notebooklm", "registry", "list notebooks", "add notebook", "search notebook", or needs to manage their NotebookLM library.
allowed-tools:
  - Read
  - Write
  - Glob
  - Grep
  - Task
---

# NotebookLM Notebook Registry

Ultra-lightweight registry for managing NotebookLM notebooks with smart discovery and 3-tier storage.

## Architecture & Tool Restrictions

**This skill is restricted to specific tools** (defined in frontmatter):
- ✅ `Read` - Read registry files
- ✅ `Write` - Update registry files
- ✅ `Glob` - Find notebook files
- ✅ `Grep` - Search notebook metadata
- ✅ `Task` - Invoke subagents

**NOT allowed** (intentionally restricted):
- ❌ `mcp__claude-in-chrome__*` - Chrome automation tools
- ❌ Direct browser interaction

**Why?**
- **Separation of concerns**: This skill manages metadata only
- **Querying is delegated**: Use `notebooklm-chrome-researcher` agent via `Task`
- **Prevents logic duplication**: Agent has auth, error handling, UI detection
- **Maintainability**: Browser changes only affect agent, not this skill

**When you need to query NotebookLM**:
```javascript
// ✅ CORRECT: Use Task to invoke agent
Task({
  subagent_type: "notebooklm-chrome-researcher",
  prompt: "Query this notebook...",
  ...
})

// ❌ WRONG: Direct Chrome tool use
mcp__claude-in-chrome__navigate(...)  // Not allowed in this skill!
```

---

## When to Use This Skill

Trigger when user:
- Mentions "notebook", "notebooklm", "registry"
- Wants to list, add, search, or manage notebooks
- Needs to find a notebook by topic or name
- Wants to enable/disable notebooks

## Core Operations

### List Notebooks

**Active notebooks only:**
```bash
list
```

**All notebooks (including archived):**
```bash
list --all
```

**Inactive notebooks only:**
```bash
list-inactive
```

### Show Notebook Details

```bash
show <id>
```

Shows full metadata including description, tags, use cases, and content types.

### Add Notebook

**Smart Add (Recommended)** - Auto-discover metadata:
```bash
add <url>
```

**⚠️ CRITICAL: Architecture Requirement**

Smart Add MUST use the `notebooklm-chrome-researcher` agent via Task tool.

**DO NOT**:
- ❌ Use Chrome tools directly (`mcp__claude-in-chrome__*`)
- ❌ Query NotebookLM yourself
- ❌ Parse HTML/DOM manually
- ❌ Try to automate browser without agent

**MUST DO**:
- ✅ Use `Task` tool to invoke `notebooklm-chrome-researcher`
- ✅ Wait for agent completion (blocking)
- ✅ Extract metadata from agent's text response

**Why?**
- **Separation of concerns**: Registry manages metadata, agent handles querying
- **Reuse agent logic**: Auth validation, error handling, UI detection, citation extraction
- **Maintainability**: Changes to NotebookLM UI only affect agent, not skill
- **Reliability**: Agent has complete error recovery logic

---

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
const library = Read('${CLAUDE_PLUGIN_ROOT}/skills/notebook-registry/library.json');
if (library.notebooks[url]) {
  return ERROR: "Notebook already exists in active library."
}

// Read archive.json
const archive = Read('${CLAUDE_PLUGIN_ROOT}/skills/notebook-registry/archive.json');
if (archive.notebooks[url]) {
  ASK: "Found in archive. Enable this notebook? (yes/no)"
  if (user_says_yes) {
    // Move from archive to library (enable operation)
    return enable(notebook_id);
  } else {
    return CANCEL;
  }
}
```

**Step 3: Invoke Discovery Agent (MANDATORY - Use Task Tool)**
```javascript
// CRITICAL: Use Task tool, NOT Chrome tools directly!
const response = Task({
  subagent_type: "notebooklm-chrome-researcher",
  description: "Discovering notebook metadata",
  prompt: `Query this NotebookLM notebook and tell me about its content:

URL: ${url}

Question: What is the main topic and content of this notebook? Please provide:
1. The main subject or topic
2. Key areas or subtopics covered
3. Type of content (documentation, research, tutorial, notes, etc.)

Be concise but comprehensive (2-3 sentences).`
});

// Agent handles: Chrome integration, auth, navigation, querying, extraction
// You receive: Text response with discovered information
```

**Step 4: Parse Agent Response**
```javascript
// Agent returns natural language like:
// "This notebook covers React documentation, focusing on Hooks,
//  Components, and JSX syntax. It contains official documentation
//  and code examples for building React applications."

// Extract metadata:
const metadata = {
  name: extractMainTopic(response),        // "React Documentation"
  topics: extractTopics(response),         // ["React", "Hooks", "Components", "JSX"]
  description: response.trim(),            // Full response (max 500 chars)
  content_types: inferContentTypes(response) // ["documentation", "code examples"]
};

// Smart parsing helpers:
function extractMainTopic(text) {
  // Look for first major topic/noun phrase
  // "This notebook covers X" → return "X"
  // "About Y" → return "Y"
  // Fallback: First capitalized phrase
}

function extractTopics(text) {
  // Find capitalized words/phrases (likely topics)
  // Look for patterns: "including X, Y, and Z"
  // Limit to top 5 most relevant
  // Remove common words: "This", "The", "It", etc.
}

function inferContentTypes(text) {
  // Keyword matching:
  if (text.includes("documentation")) return ["documentation"];
  if (text.includes("tutorial")) return ["tutorial"];
  if (text.includes("research")) return ["research"];
  // Default: ["notes"]
}
```

**Step 5: Generate ID**
```javascript
function generateId(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')   // Non-alphanumeric → hyphen
    .replace(/^-+|-+$/g, '')       // Remove leading/trailing
    .substring(0, 50);             // Max 50 chars
}

// Examples:
// "React Documentation" → "react-documentation"
// "ML & AI Basics" → "ml-ai-basics"
// "Claude Code Guide (2024)" → "claude-code-guide-2024"

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
  `${CLAUDE_PLUGIN_ROOT}/skills/notebook-registry/notebooks/${id}.json`,
  JSON.stringify(fullMetadata, null, 2)
);
```

**Step 7: Add to Library (Minimal Entry)**
```javascript
// Read existing library
const library = Read('${CLAUDE_PLUGIN_ROOT}/skills/notebook-registry/library.json');

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
  '${CLAUDE_PLUGIN_ROOT}/skills/notebook-registry/library.json',
  JSON.stringify(library, null, 2)
);
```

**Step 8: Confirm to User**
```
✅ Notebook added successfully!

Name: {metadata.name}
ID: {id}
Topics: {topics[0]}, {topics[1]}, {topics[2]}

📊 Discovered content:
{description (first 200 chars)}...

Next steps:
- Query: "Ask my {id} about [topic]"
- Details: show {id}
- List all: list
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

### Search Notebooks

```bash
search <query>
```

Searches in: name, topics, description, tags, use_cases

Shows active notebooks first, then inactive with status indicator.

### Enable/Disable

```bash
enable <id>   # Move from archive to library
disable <id>  # Move from library to archive
```

### Update Notebook

```bash
update <id> [--name ""] [--topics ""] [--description ""] [--tags ""] [--use-cases ""]
```

### Remove Notebook

```bash
remove <id>
```

Deletes from library/archive + full metadata + all Q&A logs. Confirms before deletion.

## File Structure

```
${CLAUDE_PLUGIN_ROOT}/skills/notebook-registry/
├── library.json          # Active notebooks (minimal metadata)
├── archive.json         # Inactive notebooks (minimal metadata)
├── notebooks/           # Full metadata per notebook
│   └── {id}.json
├── logs/                # Q&A history
│   └── {id}-{timestamp}.json
└── references/          # Detailed documentation
    ├── schemas.md       # JSON schemas
    ├── operations.md    # Operation details
    └── examples.md      # Usage examples
```

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

Next steps:
- Query a notebook: "Ask my claude-code-docs about hooks"
- View details: show <id>
- Add notebook: add <url>
```

### Show Operation
```
📖 Notebook: Claude Code Documentation (claude-code-docs)
Status: ✅ Active
URL: https://notebooklm.google.com/notebook/abc123

Description:
Complete official documentation for Claude Code including CLI usage,
agent development, plugin creation, MCP integration, and API reference.

Topics: Claude Code, CLI, Agent Development, SDK, Plugins
Tags: documentation, reference, official
Content Types: web, pdf

Created: 2026-01-20
Last used: 2h ago

Next steps:
- Query: "Ask my claude-code-docs about <topic>"
- Update: update claude-code-docs --tags "documentation,updated"
- Disable: disable claude-code-docs
```

### Add Operation (Smart Add)
```
🔍 Discovering notebook content...
⏳ Querying NotebookLM...
✅ Notebook added successfully!

Name: React Documentation
ID: react-documentation
Topics: React, Hooks, JSX, Components

📊 Discovered content:
This notebook covers React documentation, focusing on Hooks, Components,
and JSX syntax. It contains official documentation and code examples...

Next steps:
- Start querying: "Ask my react-documentation about Hooks rules"
- View details: show react-documentation
- List all: list
```

### Add Operation (Manual)
```
✅ Notebook added successfully!

Name: Python Asyncio Guide
ID: python-asyncio-guide
Topics: Python, Asyncio, Concurrency

Next steps:
- Query: "Ask my python-asyncio-guide about event loops"
- View: show python-asyncio-guide
- Update later: update python-asyncio-guide --description "..."
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

Active notebooks:

1. react-hooks-guide
   Topics: React, Hooks, Frontend
   Description: Complete guide to React Hooks including useState...
   Last used: 5d ago

2. react-documentation
   Topics: React, JSX, Components
   Description: Official React documentation with examples...
   Last used: 2w ago

Archived notebooks:

3. old-react-tutorial [ARCHIVED]
   Topics: React, Legacy, Tutorial
   Last used: 3mo ago

Next steps:
- View details: show react-hooks-guide
- Query: "Ask my react-hooks-guide about useEffect"
- Enable archived: enable old-react-tutorial
```

---

## For More Details

- **[Schemas](references/schemas.md)** - Complete JSON schemas
- **[Operations](references/operations.md)** - Detailed operation specs
- **[Examples](references/examples.md)** - Usage examples
