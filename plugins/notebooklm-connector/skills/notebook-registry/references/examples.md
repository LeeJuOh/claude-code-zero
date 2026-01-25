# Usage Examples

Real-world scenarios demonstrating registry operations.

## Example 1: First-Time Setup

**User:** "I want to add my Claude Code documentation notebook"

**Assistant:** "What's the NotebookLM URL?"

**User:** "https://notebooklm.google.com/notebook/abc123def456"

**Command:**
```bash
add https://notebooklm.google.com/notebook/abc123def456
```

**Process:**
```
Checking for duplicates... ✓ Not found
Discovering notebook content...

Invoking notebooklm-chrome-researcher agent...
Question: "What is the content of this notebook? What topics are covered?"

Response received:
- Name: "Claude Code Documentation"
- Topics: "Claude Code, CLI, Agent Development, SDK, Plugins"
- Description: "Complete official documentation for Claude Code..."

Generating ID... claude-code-documentation
Creating metadata files...
✓ Created: notebooks/claude-code-documentation.json
✓ Added to library.json

Notebook 'Claude Code Documentation' is ready to use.
```

**Result Files:**

`library.json`:
```json
{
  "notebooks": {
    "claude-code-documentation": {
      "id": "claude-code-documentation",
      "name": "Claude Code Documentation",
      "url": "https://notebooklm.google.com/notebook/abc123def456",
      "topics": ["Claude Code", "CLI", "Agent Development"],
      "last_used": "2026-01-25T10:00:00Z"
    }
  },
  "schema_version": "3.0",
  "updated_at": "2026-01-25T10:00:00Z"
}
```

`notebooks/claude-code-documentation.json`:
```json
{
  "id": "claude-code-documentation",
  "name": "Claude Code Documentation",
  "url": "https://notebooklm.google.com/notebook/abc123def456",
  "description": "Complete official documentation for Claude Code including CLI usage, agent development, plugin creation, MCP integration, and API reference.",
  "topics": ["Claude Code", "CLI", "Agent Development", "SDK", "Plugins"],
  "tags": [],
  "use_cases": [],
  "content_types": ["web"],
  "created_at": "2026-01-25T10:00:00Z",
  "updated_at": "2026-01-25T10:00:00Z",
  "last_used": "2026-01-25T10:00:00Z",
  "enabled": true
}
```

---

## Example 2: Manual Add (When Smart Discovery Fails)

**Scenario:** Browser integration unavailable or user prefers manual entry

**Command:**
```bash
add https://notebooklm.google.com/notebook/ml123 \
  --name "Machine Learning Basics" \
  --topics "ML,Neural Networks,Python" \
  --description "ML course materials"
```

**Process:**
```
Checking for duplicates... ✓ Not found
Generating ID from name... machine-learning-basics
Creating metadata files...
✓ Created: notebooks/machine-learning-basics.json
✓ Added to library.json

Notebook 'Machine Learning Basics' is ready to use.

Note: Basic metadata added. Use 'update machine-learning-basics' to add more details later.
```

---

## Example 3: Finding a Notebook

**User:** "I need the React documentation"

**Command:**
```bash
search react
```

**Output:**
```
Search Results for "react" (3 found)

Active Notebooks:

1. React Hooks Complete Guide (react-hooks-guide)
   Topics: React, Hooks, Frontend
   Description: Complete guide to React Hooks including useState, useEffect...
   Last used: 5d ago

2. React Native Docs (react-native-docs)
   Topics: React Native, Mobile, Cross-platform
   Description: Official React Native documentation...
   Last used: 2w ago

Inactive Notebooks:

3. Old React Tutorial (old-react-tutorial) [ARCHIVED]
   Topics: React, Legacy, Tutorial
   Last used: 3mo ago

Which notebook should I use?
```

**User:** "Number 1"

**Assistant:** "Using 'React Hooks Complete Guide' (react-hooks-guide)"

---

## Example 4: Viewing Full Details

**User:** "Show me the details of the machine learning notebook"

**Command:**
```bash
show machine-learning-basics
```

**Output:**
```
Notebook: Machine Learning Basics (machine-learning-basics)
Status: Active
URL: https://notebooklm.google.com/notebook/ml123

Description:
ML course materials covering neural networks, deep learning, and Python
implementations with TensorFlow and PyTorch.

Topics: ML, Neural Networks, Python, TensorFlow, PyTorch, Deep Learning

Tags: (none)

Use Cases: (none set)

Content Types: (not specified)

Created: 2026-01-25 10:00
Updated: 2026-01-25 10:00
Last used: 10:00 today
```

---

## Example 5: Updating Metadata

**Scenario:** User discovers notebook has more content than initially thought

**Command:**
```bash
update machine-learning-basics \
  --topics "ML,Neural Networks,Python,TensorFlow,PyTorch,Deep Learning,Computer Vision,NLP" \
  --tags "education,course,hands-on" \
  --use-cases "Learning ML fundamentals,Neural network reference,Code examples"
```

**Output:**
```
✓ Updated: Machine Learning Basics

Changes:
- Topics: Added TensorFlow, PyTorch, Deep Learning, Computer Vision, NLP
- Tags: Added education, course, hands-on
- Use Cases: Added 3 use cases

Last updated: just now
```

**Verify:**
```bash
show machine-learning-basics
```

```
Notebook: Machine Learning Basics (machine-learning-basics)
Status: Active
URL: https://notebooklm.google.com/notebook/ml123

Description:
ML course materials covering neural networks, deep learning, and Python
implementations with TensorFlow and PyTorch.

Topics: ML, Neural Networks, Python, TensorFlow, PyTorch, Deep Learning,
        Computer Vision, NLP

Tags: education, course, hands-on

Use Cases:
- Learning ML fundamentals
- Neural network reference
- Code examples

Content Types: (not specified)

Created: 2026-01-25 10:00
Updated: 2026-01-25 14:30  ← Updated timestamp
Last used: 14:30 today
```

---

## Example 6: Archiving Unused Notebooks

**Scenario:** User no longer actively uses React Native, wants cleaner active list

**Command:**
```bash
disable react-native-docs
```

**Output:**
```
✓ Notebook 'React Native Docs' has been archived.

The notebook is now inactive and won't appear in default listings.
All metadata and Q&A logs are preserved.

To restore: enable react-native-docs
To remove permanently: remove react-native-docs
```

**Verify:**
```bash
list
```

```
Active Notebooks (2)

Claude Code Documentation (claude-code-documentation)
   Topics: Claude Code, CLI, Agent Development
   Last used: 2h ago

Machine Learning Basics (machine-learning-basics)
   Topics: ML, Neural Networks, Python
   Last used: 30m ago
```

```bash
list-inactive
```

```
Inactive Notebooks (1)

React Native Docs (react-native-docs) [ARCHIVED]
   Topics: React Native, Mobile, Cross-platform
   Last used: 2w ago
```

---

## Example 7: Restoring Archived Notebook

**Scenario:** User needs React Native docs again

**Command:**
```bash
enable react-native-docs
```

**Output:**
```
✓ Notebook 'React Native Docs' has been restored.

The notebook is now active and ready to use.
```

**Verify:**
```bash
list
```

```
Active Notebooks (3)

Claude Code Documentation (claude-code-documentation)
   Topics: Claude Code, CLI, Agent Development
   Last used: 2h ago

Machine Learning Basics (machine-learning-basics)
   Topics: ML, Neural Networks, Python
   Last used: 30m ago

React Native Docs (react-native-docs)
   Topics: React Native, Mobile, Cross-platform
   Last used: 2w ago
```

---

## Example 8: Duplicate Detection

**Scenario:** User tries to add notebook that already exists

**Command:**
```bash
add https://notebooklm.google.com/notebook/abc123def456
```

**Output:**
```
ERROR: Notebook 'claude-code-documentation' already exists with this URL.

Current entry:
Name: Claude Code Documentation
Status: Active
Last used: 2h ago

Use 'update claude-code-documentation' to modify metadata.
Use 'show claude-code-documentation' to view full details.
```

---

## Example 9: Enabling Archived Notebook via Add

**Scenario:** User tries to add notebook that's in archive

**Command:**
```bash
add https://notebooklm.google.com/notebook/old123tutorial
```

**Output:**
```
ARCHIVE: Found 'Old React Tutorial' in inactive notebooks.

This notebook was previously added but is now archived.

Enable and use this notebook? (yes/no):
```

**User:** "yes"

**Process:**
```
✓ Notebook 'Old React Tutorial' has been restored.
✓ Moved from archive to active library

Notebook is ready to use.
```

**User:** "no"

**Output:**
```
Cancelled. Notebook remains in archive.

Options:
- Enable manually: enable old-react-tutorial
- View details: show old-react-tutorial
- Search alternatives: search react
```

---

## Example 10: Permanent Deletion

**Scenario:** User wants to completely remove old tutorial

**Command:**
```bash
remove old-react-tutorial
```

**Confirmation:**
```
⚠️  WARNING: This will permanently delete:
   - Notebook metadata
   - All Q&A history logs

Notebook: Old React Tutorial (old-react-tutorial)
Status: Inactive
Q&A logs: 12 files

This action cannot be undone.

Are you sure? (yes/no):
```

**User:** "yes"

**Process:**
```
Deleting notebook...
✓ Removed from archive.json
✓ Deleted notebooks/old-react-tutorial.json
✓ Deleted 12 Q&A log files:
  - logs/old-react-tutorial-2025-10-15T10-00-00.json
  - logs/old-react-tutorial-2025-10-18T14-30-00.json
  - ... (10 more)

Notebook 'Old React Tutorial' and all its data have been permanently deleted.
```

**User:** "no"

**Output:**
```
Cancelled. No files were deleted.
```

---

## Example 11: Listing All Notebooks

**Command:**
```bash
list
```

**Output:**
```
Active Notebooks (3)

Claude Code Documentation (claude-code-documentation)
   Topics: Claude Code, CLI, Agent Development
   Last used: 2h ago
   URL: https://notebooklm.google.com/notebook/abc123def456

Machine Learning Basics (machine-learning-basics)
   Topics: ML, Neural Networks, Python
   Last used: 30m ago
   URL: https://notebooklm.google.com/notebook/ml123

React Hooks Complete Guide (react-hooks-guide)
   Topics: React, Hooks, Frontend
   Last used: 5d ago
   URL: https://notebooklm.google.com/notebook/xyz789
```

**Command:**
```bash
list --all
```

**Output:**
```
Active Notebooks (3)

[... same as above ...]

Inactive Notebooks (2)

React Native Docs (react-native-docs) [ARCHIVED]
   Topics: React Native, Mobile, Cross-platform
   Last used: 2w ago
   URL: https://notebooklm.google.com/notebook/rn456

Old React Tutorial (old-react-tutorial) [ARCHIVED]
   Topics: React, Legacy, Tutorial
   Last used: 3mo ago
   URL: https://notebooklm.google.com/notebook/old123
```

---

## Example 12: Empty State

**Scenario:** Fresh installation, no notebooks yet

**Command:**
```bash
list
```

**Output:**
```
No active notebooks.

Add your first notebook:
  add <notebooklm-url>

Example:
  add https://notebooklm.google.com/notebook/abc123
```

---

## Example 13: Field-Specific Search

**Scenario:** Search only in topics field

**Command:**
```bash
search "Machine Learning" --field topics
```

**Output:**
```
Search Results in "topics" for "Machine Learning" (1 found)

Active Notebooks:

1. Machine Learning Basics (machine-learning-basics)
   Topics: ML, Neural Networks, Python, TensorFlow, PyTorch, Deep Learning
   Last used: 30m ago
```

---

## Example 14: Q&A Log After Query

**Scenario:** User queries a notebook via `notebooklm-chrome-researcher` agent

**Agent Operation (external to registry):**
1. User asks: "How do I create a subagent?"
2. Agent queries notebook: claude-code-documentation
3. Gets answer with citations
4. **Updates registry tracking:**

**Files Modified:**

`notebooks/claude-code-documentation.json`:
```json
{
  "id": "claude-code-documentation",
  "name": "Claude Code Documentation",
  "url": "https://notebooklm.google.com/notebook/abc123def456",
  "description": "Complete official documentation...",
  "topics": ["Claude Code", "CLI", "Agent Development", "SDK", "Plugins"],
  "tags": ["documentation", "reference", "official"],
  "use_cases": ["Learning features", "API reference"],
  "content_types": ["web"],
  "created_at": "2026-01-20T08:00:00Z",
  "updated_at": "2026-01-24T11:30:00Z",
  "last_used": "2026-01-25T14:30:00Z",  ← Updated
  "enabled": true
}
```

`library.json`:
```json
{
  "notebooks": {
    "claude-code-documentation": {
      "id": "claude-code-documentation",
      "name": "Claude Code Documentation",
      "url": "https://notebooklm.google.com/notebook/abc123def456",
      "topics": ["Claude Code", "CLI", "Agent Development"],
      "last_used": "2026-01-25T14:30:00Z"  ← Updated
    }
  },
  "schema_version": "3.0",
  "updated_at": "2026-01-25T14:30:00Z"
}
```

**Created Log:**

`logs/claude-code-documentation-2026-01-25T14-30-00.json`:
```json
{
  "notebook_id": "claude-code-documentation",
  "notebook_name": "Claude Code Documentation",
  "timestamp": "2026-01-25T14:30:00Z",
  "question": "How do I create a custom subagent with restricted tool access?",
  "answer": "To create a custom subagent with restricted tool access...",
  "citations": [
    {
      "number": "1",
      "text": "To restrict tools, use the `tools` field...",
      "source": "sub-agents-documentation.pdf"
    }
  ],
  "multi_turn": false
}
```