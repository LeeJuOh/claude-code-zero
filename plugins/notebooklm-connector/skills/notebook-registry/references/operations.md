# Detailed Operations

Complete specifications for all registry operations.

## list [--all]

**Purpose:** Display active notebooks or all notebooks including archived.

**Token Cost:**
- Default: 300-500 tokens (library.json only)
- With `--all`: 600-1000 tokens (library.json + archive.json)

**Algorithm:**
1. Read `${CLAUDE_PLUGIN_ROOT}/skills/notebook-registry/library.json`
2. If `--all` flag present, also read `archive.json`
3. Parse notebook entries
4. Calculate relative timestamps
5. Format and display

**Output Format:**
```
Active Notebooks (3)

Claude Code Documentation (claude-code-docs)
   Topics: Claude Code, CLI, Agent Development
   Last used: 2h ago
   URL: https://notebooklm.google.com/notebook/abc123def456

React Hooks Complete Guide (react-hooks-guide)
   Topics: React, Hooks, Frontend
   Last used: 5d ago
   URL: https://notebooklm.google.com/notebook/xyz789ghi012

Machine Learning Fundamentals (machine-learning-basics)
   Topics: Machine Learning, Neural Networks, Python
   Last used: 3h ago
   URL: https://notebooklm.google.com/notebook/ml123abc456
```

**With --all flag:**
```
Active Notebooks (3)
[... active notebooks ...]

Inactive Notebooks (1)

Old React Tutorial (old-react-tutorial) [ARCHIVED]
   Topics: React, Legacy, Tutorial
   Last used: 3mo ago
   URL: https://notebooklm.google.com/notebook/old123tutorial
```

**Edge Cases:**
- Empty library: "No active notebooks. Use 'add <url>' to add one."
- Empty with --all: Shows both sections as empty

---

## list-inactive

**Purpose:** Display only archived/disabled notebooks.

**Token Cost:** 200-400 tokens (archive.json only)

**Algorithm:**
1. Read `archive.json`
2. Parse and format entries

**Output:** Same format as `list`, shows archived notebooks only.

---

## show <id>

**Purpose:** Display complete metadata for a single notebook.

**Token Cost:** 200-300 tokens (one notebooks/{id}.json file)

**Algorithm:**
1. Check `library.json` for ID → If found, status = "Active"
2. If not found, check `archive.json` → If found, status = "Inactive"
3. If not found in either → ERROR
4. Read `notebooks/{id}.json`
5. Format and display all fields

**Output Format:**
```
Notebook: Claude Code Documentation (claude-code-docs)
Status: Active
URL: https://notebooklm.google.com/notebook/abc123def456

Description:
Complete official documentation for Claude Code including CLI usage, agent
development, plugin creation, MCP integration, and API reference. Contains
comprehensive guides for all features.

Topics: Claude Code, CLI, Agent Development, SDK, Plugins, MCP, Hooks

Tags: documentation, reference, official

Use Cases:
- Learning Claude Code features
- Plugin development reference
- API documentation lookup
- Agent system prompt examples

Content Types: web, pdf

Created: 2026-01-20 08:00
Updated: 2026-01-24 11:30
Last used: 2h ago
```

**Error Handling:**
```
ERROR: Notebook 'unknown-id' not found.

Use: list, list --all, search <query>
```

---

## add <url> [--name ""] [--topics ""] [--description ""]

**Purpose:** Add a new notebook to the registry.

### Smart Add (URL only)

**Recommended approach** - Auto-discovers metadata.

**Algorithm:**
1. Validate URL format (must start with `https://notebooklm.google.com/notebook/`)
2. Check if URL already exists in `library.json` → If yes, ERROR duplicate
3. Check if URL exists in `archive.json` → If yes, prompt to enable
4. Invoke `notebooklm-chrome-researcher` agent with discovery question:
   ```
   What is the content of this notebook? What topics are covered?
   Provide a complete overview briefly and concisely.
   ```
5. Parse discovered content to extract:
   - Name
   - Topics (as array)
   - Description
   - Content types (if mentioned)
6. Generate ID from discovered name using kebab-case
7. Create `notebooks/{id}.json` with full metadata
8. Add minimal entry to `library.json`
9. Display confirmation

**Example:**
```bash
add https://notebooklm.google.com/notebook/abc123
```

**Process output:**
```
Discovering notebook content...
✓ Found: "Claude Code Documentation"
✓ Topics: Claude Code, CLI, Agent Development, SDK, Plugins
✓ Description extracted

Adding to registry...
✓ Created: claude-code-docs
✓ Added to active library

Notebook 'Claude Code Documentation' is ready to use.
```

### Manual Add (With metadata)

**Algorithm:**
1. Validate URL
2. Check for duplicates (same as Smart Add)
3. Generate ID from provided `--name`
4. Create `notebooks/{id}.json` with provided metadata
5. Add minimal entry to `library.json`

**Example:**
```bash
add https://notebooklm.google.com/notebook/abc123 \
  --name "Claude Code Docs" \
  --topics "Claude Code,CLI,SDK" \
  --description "Official documentation"
```

### Duplicate Detection

**Found in library.json:**
```
ERROR: Notebook 'claude-code-docs' already exists with this URL.

Current entry:
Name: Claude Code Documentation
Status: Active
Last used: 2h ago

Use 'update claude-code-docs' to modify metadata.
Use 'show claude-code-docs' to view full details.
```

**Found in archive.json:**
```
ARCHIVE: Found 'Old React Tutorial' in inactive notebooks.

This notebook was previously added but is now archived.

Enable and use this notebook? (yes/no)
```

**If user responds "yes":**
- Move entry from `archive.json` to `library.json`
- Update `notebooks/{id}.json`: set `enabled=true`, update `updated_at`
- Return notebook info for use

**If user responds "no":**
```
Cancelled. Notebook remains in archive.

Options:
- Enable manually: enable old-react-tutorial
- View details: show old-react-tutorial
- Use search to find alternatives: search <query>
```

---

## disable <id>

**Purpose:** Archive a notebook (remove from active list, keep metadata).

**Algorithm:**
1. Find notebook in `library.json`
2. If not found → ERROR "Not found in active notebooks"
3. Remove entry from `library.json`
4. Add entry to `archive.json`
5. Read `notebooks/{id}.json`
6. Update: `enabled=false`, `updated_at=now`
7. Write `notebooks/{id}.json`

**Example:**
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

**Files Modified:**
- `library.json` (entry removed)
- `archive.json` (entry added)
- `notebooks/{id}.json` (enabled=false)

---

## enable <id>

**Purpose:** Restore archived notebook to active library.

**Algorithm:**
1. Find notebook in `archive.json`
2. If not found → ERROR "Not found in inactive notebooks"
3. Remove entry from `archive.json`
4. Add entry to `library.json`
5. Read `notebooks/{id}.json`
6. Update: `enabled=true`, `updated_at=now`
7. Write `notebooks/{id}.json`

**Example:**
```bash
enable react-native-docs
```

**Output:**
```
✓ Notebook 'React Native Docs' has been restored.

The notebook is now active and ready to use.
```

**Files Modified:**
- `archive.json` (entry removed)
- `library.json` (entry added)
- `notebooks/{id}.json` (enabled=true)

---

## remove <id>

**Purpose:** Permanently delete notebook and all its data.

**Algorithm:**
1. Find notebook in `library.json` or `archive.json`
2. If not found → ERROR
3. Count Q&A logs: `glob logs/{id}-*.json`
4. Show confirmation prompt with details
5. Wait for user confirmation (yes/no)
6. If confirmed:
   - Remove entry from `library.json` or `archive.json`
   - Delete `notebooks/{id}.json`
   - Delete all `logs/{id}-*.json` files
   - Write updated library/archive file

**Example:**
```bash
remove old-react-tutorial
```

**Confirmation Prompt:**
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

**After confirmation:**
```
Deleting notebook...
✓ Removed from archive
✓ Deleted notebooks/old-react-tutorial.json
✓ Deleted 12 Q&A log files

Notebook 'Old React Tutorial' and all its data have been permanently deleted.
```

**If user says "no":**
```
Cancelled. No files were deleted.
```

**Files Modified/Deleted:**
- `library.json` or `archive.json` (entry removed)
- `notebooks/{id}.json` (deleted)
- `logs/{id}-*.json` (all deleted)

---

## update <id> [--name ""] [--topics ""] [--description ""] [--tags ""] [--use-cases ""]

**Purpose:** Modify notebook metadata.

**Supported Fields:**
- `--name "New Name"` - Display name
- `--topics "topic1,topic2,topic3"` - Comma-separated topics
- `--description "New description"` - Long-form description
- `--tags "tag1,tag2"` - Custom tags
- `--use-cases "case1,case2"` - Usage scenarios

**Algorithm:**
1. Find notebook in `library.json` or `archive.json`
2. If not found → ERROR
3. Read `notebooks/{id}.json`
4. Update specified fields
5. Set `updated_at` to current timestamp
6. Write `notebooks/{id}.json`
7. If `name` or `topics` changed → Sync to `library.json`/`archive.json`

**Example:**
```bash
update claude-code-docs \
  --topics "Claude Code,CLI,SDK,Plugins,MCP,Hooks,Agents" \
  --tags "documentation,reference,official,updated"
```

**Output:**
```
✓ Updated: Claude Code Documentation

Changes:
- Topics: Added MCP, Hooks, Agents
- Tags: Added 'updated'

Last updated: just now
```

**Files Modified:**
- `notebooks/{id}.json` (always)
- `library.json` or `archive.json` (only if name/topics changed)

---

## search <query> [--field topics|tags|description]

**Purpose:** Find notebooks by content.

**Token Cost:** 2000-5000+ tokens (reads all notebooks/{id}.json files)

**Algorithm:**
1. Glob all files in `notebooks/` directory
2. Read each `{id}.json` file
3. Extract searchable fields:
   - name
   - topics (array)
   - description
   - tags (array)
   - use_cases (array)
4. Perform case-insensitive substring search on query
5. Rank results by:
   - Exact match in name (highest priority)
   - Match in topics
   - Match in description
   - Match in tags/use_cases
   - Active notebooks ranked above inactive
6. Show top 3-5 results

**Example:**
```bash
search react
```

**Output:**
```
Search Results for "react" (3 found)

Active Notebooks:

1. React Hooks Complete Guide (react-hooks-guide)
   Topics: React, Hooks, Frontend
   Description: Complete guide to React Hooks including useState, useEffect,
                custom hooks, and best practices...
   Last used: 5d ago

2. React Native Docs (react-native-docs)
   Topics: React Native, Mobile, Cross-platform
   Description: Official React Native documentation covering components,
                APIs, and native modules...
   Last used: 2w ago

Inactive Notebooks:

3. Old React Tutorial (old-react-tutorial) [ARCHIVED]
   Topics: React, Legacy, Tutorial
   Last used: 3mo ago
```

**If more than 5 matches:**
```
... and 7 more results.

Refine your search or use:
- show {id} for details
- search {query} --field topics (search topics only)
```

**Field-Specific Search:**
```bash
search "machine learning" --field topics
```
Only searches in topics field.

**No Results:**
```
No notebooks found matching "golang".

Suggestions:
- Try different keywords
- Check spelling
- View all notebooks: list --all
- Add a new notebook: add <url>
```

---

## Usage Tracking (External Operation)

**Triggered by:** `notebooklm-chrome-researcher` agent after successful query

**Note:** This is NOT performed by the registry skill itself. The researcher agent handles this.

**Algorithm:**
1. Read `notebooks/{id}.json`
2. Update `last_used` to current ISO 8601 timestamp
3. Write `notebooks/{id}.json`
4. Determine if notebook is in library or archive
5. Read corresponding `library.json` or `archive.json`
6. Update `last_used` in minimal entry
7. Write `library.json` or `archive.json`
8. Create Q&A log at `logs/{id}-{timestamp}.json` with:
   - notebook_id, notebook_name
   - timestamp
   - question, answer
   - citations (if available)
   - multi_turn flag

**Files Modified:**
- `notebooks/{id}.json`
- `library.json` or `archive.json`
- `logs/{id}-{timestamp}.json` (created)