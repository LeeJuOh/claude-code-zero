# JSON Schemas

Complete schemas with concrete examples for all registry files.

## library.json (Minimal Metadata)

Active notebooks with minimal metadata for fast loading.

```json
{
  "notebooks": {
    "claude-code-docs": {
      "id": "claude-code-docs",
      "name": "Claude Code Documentation",
      "url": "https://notebooklm.google.com/notebook/abc123def456",
      "topics": ["Claude Code", "CLI", "Agent Development"],
      "last_used": "2026-01-25T14:30:00Z"
    },
    "react-hooks-guide": {
      "id": "react-hooks-guide",
      "name": "React Hooks Complete Guide",
      "url": "https://notebooklm.google.com/notebook/xyz789ghi012",
      "topics": ["React", "Hooks", "Frontend"],
      "last_used": "2026-01-20T09:15:00Z"
    },
    "machine-learning-basics": {
      "id": "machine-learning-basics",
      "name": "Machine Learning Fundamentals",
      "url": "https://notebooklm.google.com/notebook/ml123abc456",
      "topics": ["Machine Learning", "Neural Networks", "Python"],
      "last_used": "2026-01-25T12:00:00Z"
    }
  },
  "schema_version": "3.0",
  "updated_at": "2026-01-25T14:30:00Z"
}
```

**Field Details:**
- `id`: Generated from name using kebab-case (e.g., "Claude Code Docs" → "claude-code-docs")
- `name`: User-friendly display name
- `url`: Full NotebookLM URL including notebook ID
- `topics`: Top 3 topics for quick filtering (limited to keep token cost low)
- `last_used`: ISO 8601 timestamp, updated after each query
- `schema_version`: Registry format version
- `updated_at`: Last modification timestamp for library.json

## archive.json (Inactive Notebooks)

Same structure as library.json, but for disabled notebooks.

```json
{
  "notebooks": {
    "old-react-tutorial": {
      "id": "old-react-tutorial",
      "name": "Old React Tutorial",
      "url": "https://notebooklm.google.com/notebook/old123tutorial",
      "topics": ["React", "Legacy", "Tutorial"],
      "last_used": "2025-10-15T16:20:00Z"
    }
  },
  "schema_version": "3.0",
  "updated_at": "2026-01-15T10:00:00Z"
}
```

## notebooks/{id}.json (Full Metadata)

Complete metadata stored per notebook, loaded only when needed.

**Example: notebooks/claude-code-docs.json**

```json
{
  "id": "claude-code-docs",
  "name": "Claude Code Documentation",
  "url": "https://notebooklm.google.com/notebook/abc123def456",
  "description": "Complete official documentation for Claude Code including CLI usage, agent development, plugin creation, MCP integration, and API reference. Contains comprehensive guides for all features.",
  "topics": [
    "Claude Code",
    "CLI",
    "Agent Development",
    "SDK",
    "Plugins",
    "MCP",
    "Hooks"
  ],
  "tags": [
    "documentation",
    "reference",
    "official"
  ],
  "use_cases": [
    "Learning Claude Code features",
    "Plugin development reference",
    "API documentation lookup",
    "Agent system prompt examples"
  ],
  "content_types": [
    "web",
    "pdf"
  ],
  "created_at": "2026-01-20T08:00:00Z",
  "updated_at": "2026-01-24T11:30:00Z",
  "last_used": "2026-01-25T14:30:00Z",
  "enabled": true
}
```

**Field Details:**
- `id`: Same as library.json
- `name`: Same as library.json
- `url`: Same as library.json
- `description`: Long-form description (discovered via browser query or user-provided)
- `topics`: Extended list (no limit, unlike library.json's 3-topic limit)
- `tags`: User-defined tags for custom organization
- `use_cases`: What this notebook is useful for
- `content_types`: Source types (pdf, web, video, youtube, text, markdown, etc.)
- `created_at`: When added to registry
- `updated_at`: Last metadata modification
- `last_used`: Last query timestamp (synced with library.json)
- `enabled`: true = in library.json, false = in archive.json

**Example: notebooks/machine-learning-basics.json**

```json
{
  "id": "machine-learning-basics",
  "name": "Machine Learning Fundamentals",
  "url": "https://notebooklm.google.com/notebook/ml123abc456",
  "description": "Comprehensive machine learning course materials covering neural networks, deep learning architectures, training techniques, optimization algorithms, and practical implementations in Python with TensorFlow and PyTorch.",
  "topics": [
    "Machine Learning",
    "Neural Networks",
    "Deep Learning",
    "Python",
    "TensorFlow",
    "PyTorch",
    "Computer Vision",
    "NLP"
  ],
  "tags": [
    "education",
    "course",
    "hands-on"
  ],
  "use_cases": [
    "Learning ML fundamentals",
    "Neural network architecture reference",
    "TensorFlow/PyTorch code examples",
    "Training best practices"
  ],
  "content_types": [
    "pdf",
    "web",
    "jupyter-notebook",
    "video"
  ],
  "created_at": "2026-01-15T13:00:00Z",
  "updated_at": "2026-01-24T16:45:00Z",
  "last_used": "2026-01-25T12:00:00Z",
  "enabled": true
}
```

## logs/{id}-{timestamp}.json (Q&A History)

Records each query and response for tracking and analytics.

**Example: logs/claude-code-docs-2026-01-25T14-30-00.json**

```json
{
  "notebook_id": "claude-code-docs",
  "notebook_name": "Claude Code Documentation",
  "timestamp": "2026-01-25T14:30:00Z",
  "question": "How do I create a custom subagent with restricted tool access?",
  "answer": "To create a custom subagent with restricted tool access, you need to:\n\n1. Create a markdown file in .claude/agents/ with YAML frontmatter\n2. Specify the tools field to allowlist specific tools\n3. Or use disallowedTools field to denylist tools\n\nExample frontmatter:\n```yaml\n---\nname: safe-researcher\ndescription: Research agent with restricted capabilities\ntools: Read, Grep, Glob, Bash\ndisallowedTools: Write, Edit\n---\n```\n\nThe subagent will only be able to use Read, Grep, Glob, and Bash tools, preventing file modifications.",
  "citations": [
    {
      "number": "1",
      "text": "To restrict tools, use the `tools` field (allowlist) or `disallowedTools` field (denylist)",
      "source": "sub-agents-documentation.pdf"
    },
    {
      "number": "2",
      "text": "tools: Read, Grep, Glob, Bash",
      "source": "sub-agents-examples.md"
    }
  ],
  "multi_turn": false
}
```

**Field Details:**
- `notebook_id`: Links to notebooks/{id}.json
- `notebook_name`: Display name at time of query
- `timestamp`: ISO 8601 query time
- `question`: Exact user question sent to NotebookLM
- `answer`: Full response from NotebookLM
- `citations`: Array of NotebookLM-provided citations
  - `number`: Citation reference number
  - `text`: Quoted text from source document
  - `source`: Source document filename
- `multi_turn`: false = new conversation, true = follow-up question

**Example: Multi-turn conversation**

**logs/react-hooks-guide-2026-01-25T15-00-00.json**

```json
{
  "notebook_id": "react-hooks-guide",
  "notebook_name": "React Hooks Complete Guide",
  "timestamp": "2026-01-25T15:00:00Z",
  "question": "Follow-up: What about cleanup functions in useEffect?",
  "answer": "Cleanup functions in useEffect are essential for preventing memory leaks. Here's how they work:\n\n1. Return a function from useEffect\n2. React calls it before the component unmounts\n3. Also called before re-running the effect (if dependencies changed)\n\nExample:\n```javascript\nuseEffect(() => {\n  const subscription = subscribe();\n  return () => {\n    subscription.unsubscribe();\n  };\n}, []);\n```\n\nCommon use cases: clearing timers, canceling subscriptions, removing event listeners.",
  "citations": [
    {
      "number": "1",
      "text": "Return a function from useEffect to specify how to clean up after it",
      "source": "react-hooks-reference.pdf"
    }
  ],
  "multi_turn": true
}
```

**Filename Format:**
- Pattern: `{id}-{timestamp}.json`
- Timestamp uses hyphens instead of colons for filesystem compatibility
- Example: `claude-code-docs-2026-01-25T14-30-00.json`
- Original timestamp: `2026-01-25T14:30:00Z`

## Empty State Examples

**Empty library.json:**
```json
{
  "notebooks": {},
  "schema_version": "3.0",
  "updated_at": "2026-01-20T10:00:00Z"
}
```

**Empty archive.json:**
```json
{
  "notebooks": {},
  "schema_version": "3.0",
  "updated_at": "2026-01-20T10:00:00Z"
}
```

**Minimal notebook (manual add, no discovery):**
```json
{
  "id": "quick-reference",
  "name": "Quick Reference",
  "url": "https://notebooklm.google.com/notebook/qr123",
  "description": "",
  "topics": ["Reference"],
  "tags": [],
  "use_cases": [],
  "content_types": [],
  "created_at": "2026-01-25T10:00:00Z",
  "updated_at": "2026-01-25T10:00:00Z",
  "last_used": "2026-01-25T10:00:00Z",
  "enabled": true
}
```
