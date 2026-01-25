# NotebookLM Connector Plugin

A plugin for managing and querying NotebookLM notebooks using Claude Code's Chrome integration beta feature.

## Overview

This plugin provides:

1. **Notebook Registry Management** (Skill: `notebook-registry`)
   - Add, list, delete, and update NotebookLM notebooks
   - Search and manage notebooks by topic

2. **Chrome Integration-Based Querying** (Agent: `notebooklm-chrome-researcher`)
   - Uses Claude Code's Chrome integration beta feature
   - Query NotebookLM and collect answers
   - Chat history management (delete/keep options)

---

## ⚠️ Privacy & Data Management

**IMPORTANT: Personal Data Protection**

This plugin stores your notebook metadata locally. Please be careful not to commit your personal data:

### What Gets Stored

📁 **User Data (DO NOT commit to Git):**
- `skills/notebook-registry/library.json` - Your active notebooks list
- `skills/notebook-registry/archive.json` - Your archived notebooks
- `skills/notebook-registry/notebooks/*.json` - Full metadata for each notebook
- `skills/notebook-registry/logs/*.json` - Q&A history (if implemented)

These files contain:
- Notebook URLs
- Topics you're interested in
- Descriptions and metadata
- Query history

### Git Configuration

The repository includes a `.gitignore` that protects:
- ✅ `notebooks/*.json` - All notebook metadata files
- ✅ `logs/*.json` - All Q&A logs

**Initial empty files are committed** for structure, but:
- ⚠️ After adding notebooks, `library.json` and `archive.json` will contain your data
- ⚠️ **Be careful with `git add .` or `git commit -a`**
- ⚠️ Always review changes before committing: `git diff`

### Best Practices

```bash
# ✅ Good: Add specific plugin files only
git add plugins/notebooklm-connector/agents/
git add plugins/notebooklm-connector/skills/notebook-registry/SKILL.md

# ⚠️ Careful: Review what's included
git add plugins/notebooklm-connector/
git status  # Check what's staged
git diff --staged  # Review changes

# ❌ Dangerous: Might include personal data
git add .
git commit -a
```

### If You Accidentally Commit Personal Data

```bash
# Remove file from last commit (before push)
git reset HEAD~1 plugins/notebooklm-connector/skills/notebook-registry/library.json
git commit --amend

# If already pushed, contact repository admin or use git filter-branch
```

---

## Directory Structure

```
plugins/notebooklm-connector/
├── .claude-plugin/
│   └── plugin.json           # Plugin metadata
├── skills/
│   └── notebook-registry/
│       ├── SKILL.md          # Notebook registry skill documentation
│       ├── library.json      # Active notebooks index
│       ├── archive.json      # Archived notebooks index
│       └── notebooks/        # Per-notebook metadata (one file per notebook)
├── agents/
│   └── notebooklm-chrome-researcher.md  # Chrome integration research agent
└── README.md                 # This file
```

## Chrome Integration Requirements

This plugin uses **Claude Code's Chrome integration beta feature** to query NotebookLM directly in your browser.

### Prerequisites

Before using this plugin, ensure you have:

✅ **Google Chrome browser** - Required (Brave/Arc not yet supported)
✅ **Claude in Chrome extension** - Version 1.0.36 or higher ([Install from Chrome Web Store](https://chromewebstore.google.com/detail/claude/fcoeoabgfenejglbffodgkkbkcdhcgfn))
✅ **Claude Code CLI** - Version 2.0.73 or higher
✅ **Paid Claude plan** - Pro, Team, or Enterprise
✅ **Google account login** - **You must be logged into NotebookLM in Chrome**

### Setup Steps

1. **Install Chrome Extension**
   - Open [Claude in Chrome on Chrome Web Store](https://chromewebstore.google.com/detail/claude/fcoeoabgfenejglbffodgkkbkcdhcgfn)
   - Click "Add to Chrome"
   - Pin the extension for easy access

2. **Start Claude Code with Chrome Integration**
   ```bash
   claude --chrome
   ```
   Or enable in existing session:
   ```
   /chrome
   ```

3. **Verify Connection**
   ```
   /chrome
   ```
   Should show: "Chrome integration: ✓ Connected"

4. **Log into NotebookLM** (One-time)
   - Open Chrome and go to [notebooklm.google.com](https://notebooklm.google.com)
   - Log in with your Google account
   - **Critical**: Keep this session active - the plugin uses Chrome's login state

### How It Works

- **Session sharing**: Chrome integration uses your browser's existing login session
- **No separate auth**: No need for API keys or separate authentication
- **Tab management**: Creates new tabs for queries, keeps them open for verification
- **Real browser**: Not headless - you'll see Chrome windows during automation

### Important Limitations

⚠️ **Modal Dialog Warning**

JavaScript modal dialogs (`alert`, `confirm`, `prompt`) **BLOCK all browser automation**.

If a modal appears during automation:
- The extension cannot receive ANY commands
- Automation freezes until the modal is manually dismissed
- **Solution**: Manually close the dialog, then tell Claude to continue

**Prevention**: The agent avoids clicking elements that trigger modals. If you encounter frequent modals, please report the issue.

⚠️ **Chrome Must Be Running**

- Chrome integration requires Chrome to be open (not headless)
- Browser windows will appear during queries
- This is normal behavior - the plugin automates your real browser

⚠️ **Session Persistence**

- You must stay logged into Google/NotebookLM in Chrome
- If your session expires, you'll see auth errors
- **Solution**: Log in manually in Chrome, then retry

### Enable by Default (Optional)

To avoid using `--chrome` flag every time:

```
/chrome → Select "Enabled by default"
```

**Note**: Enabling by default increases context usage slightly since browser tools are always loaded.

### Permissions

Site-level permissions are managed through the Chrome extension settings:
- Run `/chrome` to see current permissions
- Add notebooklm.google.com to allowed sites if prompted
- The agent will request permission for new domains automatically

### Learn More

- [Claude Code Chrome Integration Docs](https://code.claude.com/docs/en/chrome)
- [Getting Started with Claude for Chrome](https://support.anthropic.com/en/articles/12012173-getting-started-with-claude-for-chrome)

---

## Usage

### 1. Adding a Notebook

```
User: "Add Vercel AI SDK documentation to my notebooks"
Claude:
  - Requests alias, topic, url information
  - Updates library.json and writes notebooks/*.json (metadata)
  - "✅ Notebook added successfully."
```

### 2. Listing Notebooks

```
User: "Show me my notebook list"
Claude:
  📚 Registered notebooks:
  1. Vercel AI SDK Docs (Topic: AI SDK, Vercel)
  2. React Official Docs (Topic: React, Frontend)
```

### 3. Querying NotebookLM (Chrome Integration Required)

**Important**: Chrome integration must be enabled:
```bash
claude --chrome
```
Or in Claude Code:
```
/chrome
```

**Query Example**:
```
User: "What are the rules of Hooks in React docs?"
Claude:
  1. Verify Chrome integration
  2. Call notebooklm-chrome-researcher agent
  3. Confirm chat history deletion
  4. Query NotebookLM
  5. Provide answer in Source/Answer/Quote/🔍 format
```

## Features

### Skill: notebook-registry

Manages the notebook registry.

**Supported Operations**:
- **List**: Display all registered notebooks
- **Add**: Register new notebook (requires alias, topic, url)
- **Delete**: Remove specific notebook
- **Update**: Update notebook information
- **Search**: Find notebooks by topic

**File Locations**:
- `${CLAUDE_PLUGIN_ROOT}/skills/notebook-registry/library.json` (active index)
- `${CLAUDE_PLUGIN_ROOT}/skills/notebook-registry/archive.json` (archived index)
- `${CLAUDE_PLUGIN_ROOT}/skills/notebook-registry/notebooks/*.json` (per-notebook metadata)

### Agent: notebooklm-chrome-researcher

Queries NotebookLM using Claude Code's Chrome integration.

**Key Features**:
- Automatic Chrome integration connection check
- NotebookLM login status verification
- **Chat History Management**: Delete/keep options before querying
- UI waiting and stability guarantees
- Structured answer format (Source/Answer/Quote/🔍)
- Tab preservation (user can verify)

**Constraints**:
- Processes only one notebook URL at a time
- Answers only one question per invocation
- Cannot compare multiple notebooks

## Chat History Handling

The agent **always** confirms with the user before querying:

```
Should we delete the previous session before starting? (yes/no)

Note: NotebookLM's chat history is kept personally.
Previous conversation context may affect the current question.
```

- **"Yes"**: Delete history via "Delete Chat History" menu in chat panel
- **"No"**: Keep existing conversation context

## Error Handling & Troubleshooting

### Common Errors

| Error | Cause | Solution | Learn More |
|-------|-------|----------|------------|
| **Chrome integration not connected** | Running without `--chrome` flag | 1. Run `claude --chrome`<br>2. Or execute `/chrome`<br>3. Verify: `/chrome` shows "Connected" | [Chrome Docs](https://code.claude.com/docs/en/chrome) |
| **Authentication required** | Not logged into Google in Chrome | 1. Open Chrome<br>2. Go to notebooklm.google.com<br>3. Log in with Google account<br>4. Keep session active<br>5. Retry query | Session is shared with Chrome |
| **Modal dialog detected** | JavaScript alert/confirm appeared | 1. Manually dismiss dialog in Chrome<br>2. Tell Claude to continue<br>3. Report which action triggered it | Known Chrome automation limitation |
| **No notebook URL** | Notebook not in registry | 1. List notebooks: "list my notebooks"<br>2. Add notebook: "add <url>"<br>3. Verify URL format | Must start with `https://notebooklm.google.com/notebook/` |
| **UI element not found** | NotebookLM UI changed or still loading | 1. Wait 5-10 seconds<br>2. Manually verify page loaded<br>3. Check URL is correct<br>4. Try manual refresh | UI detection may need updates |
| **Response timeout (120s)** | Network slow or long document | 1. Retry with same question<br>2. Simplify question<br>3. Check network connection | Large documents take longer |
| **Tab creation failed** | Chrome permissions or resources | 1. Close unused Chrome tabs<br>2. Check `/chrome` permissions<br>3. Restart Chrome | Resource limitation |
| **Session expired** | Google session timed out | 1. Re-login to NotebookLM in Chrome<br>2. Verify you see notebook interface<br>3. Retry query | Sessions expire after inactivity |

### Troubleshooting Guide

#### 1. Chrome Integration Not Working

**Symptoms**:
- "Chrome integration not connected" error
- `/chrome` shows "Not connected"

**Solutions**:
```bash
# Check Claude Code version (must be 2.0.73+)
claude --version

# Check Chrome extension installed
# Open chrome://extensions and look for "Claude in Chrome"

# Restart with Chrome integration
claude --chrome

# Verify connection
/chrome
```

**Still not working?**
1. Update Chrome to latest version
2. Update Chrome extension to 1.0.36+
3. Restart both Chrome and Claude Code
4. Check Chrome extension permissions

#### 2. Authentication Keeps Failing

**Symptoms**:
- "Authentication required" error repeatedly
- Redirected to accounts.google.com
- "Choose an account" screen appears

**Root cause**: Not logged into NotebookLM in Chrome

**Solution**:
```bash
# Step 1: Verify Chrome session
1. Open Chrome (same instance running with Claude Code)
2. Navigate to: https://notebooklm.google.com
3. Log in if prompted
4. Verify you see your notebooks

# Step 2: Keep session active
- Don't log out from Chrome
- Don't clear Chrome cookies
- Chrome must stay running

# Step 3: Retry in Claude Code
"Query my <notebook-name> about <question>"
```

**Important**: Chrome integration uses your **existing Chrome session**. If you log out in Chrome, the plugin stops working.

#### 3. Modal Dialogs Blocking Automation

**Symptoms**:
- Agent stops responding after clicking something
- "Modal dialog detected" warning
- Automation freezes

**Why this happens**: JavaScript `alert()`, `confirm()`, `prompt()` block ALL browser events, including the extension's communication channel.

**Solution**:
```
1. Look at the Chrome window
2. Dismiss any dialog/alert manually (click OK/Cancel)
3. Tell Claude: "I dismissed the modal, continue"
4. Agent will resume
```

**Prevention**: The agent tries to avoid elements that trigger modals. If you encounter modals frequently, please report which action triggered them.

**Technical detail**: This is a fundamental Chrome automation limitation documented in the [official Chrome integration docs](https://code.claude.com/docs/en/chrome).

#### 4. Response Never Completes

**Symptoms**:
- Waiting over 120 seconds
- "Response timeout" error
- Loading indicator stuck

**Possible causes**:
- Network issues
- Very large document analysis
- NotebookLM server slow
- Streaming response not detected

**Solutions**:
```bash
# Option 1: Retry
"Ask the same question again"

# Option 2: Simplify question
"Summarize X in 3 points" instead of "Tell me everything about X"

# Option 3: Check manually
1. Look at Chrome tab
2. See if response actually arrived
3. If yes, copy manually
4. Report timing issue
```

#### 5. UI Elements Not Found

**Symptoms**:
- "Cannot find chat input field" warning
- "NotebookLM UI not detected" error

**Causes**:
- Page still loading
- NotebookLM UI redesigned
- Wrong URL / notebook doesn't exist
- Permissions issue (notebook not shared)

**Solutions**:
```bash
# Verify URL
1. Check URL format: https://notebooklm.google.com/notebook/<id>
2. Open URL manually in Chrome
3. Verify notebook loads correctly
4. Check sharing: Notebook must be "Anyone with link"

# Wait longer
1. Try: "Continue anyway" when prompted
2. Agent may succeed after waiting

# Report issue
If notebook loads manually but agent fails, please report:
- Notebook language/region
- What element wasn't found
- Screenshot of the page
```

### Getting Help

If errors persist:

1. **Check logs**: Look at Claude Code terminal for detailed error messages
2. **Verify prerequisites**: Chrome version, extension version, Claude Code version
3. **Test manually**: Can you access NotebookLM manually in Chrome?
4. **Report issues**: Include error message, steps to reproduce, and environment details

**Useful diagnostic commands**:
```bash
# Check all versions
claude --version
chrome://version  # In Chrome address bar

# Check extension
chrome://extensions  # Verify "Claude in Chrome" is enabled

# Check connection
/chrome  # In Claude Code
```

## Answer Format

The agent provides answers in this format:

```
**Source**: https://notebooklm.google.com/notebook/...

**Answer**: [Detailed answer content]

**Quote**: [Original citation (evidence)]

**🔍 Missing & Next Steps**:
- [Follow-up questions if further investigation needed]
- [If answer is complete] None - answer complete
```

## Requirements

1. **Claude Code**: Local installation required
2. **Chrome Integration**: `--chrome` flag or `/chrome` command
3. **NotebookLM Login**: Must be logged into Google account in Chrome
4. **Notebook Sharing**: NotebookLM notebooks must be shared as "Anyone with link"

## Best Practices

### Development and Execution Notes

1. **Plugin Structure**:
   - `skills/`, `agents/` folders required at root
   - `plugin.json` located in `.claude-plugin/` folder

2. **File Paths**:
   - Use absolute paths to avoid runtime issues:
     - `${CLAUDE_PLUGIN_ROOT}/skills/notebook-registry/library.json`
     - `${CLAUDE_PLUGIN_ROOT}/skills/notebook-registry/archive.json`
     - `${CLAUDE_PLUGIN_ROOT}/skills/notebook-registry/notebooks/*.json`

3. **Browser Automation**:
   - Must be logged into Google account in Chrome before accessing NotebookLM
   - Login session is shared

4. **DOM Element Recognition**:
   - NotebookLM has React-based complex UI
   - Defensive instructions like "verify input field activation", "wait for loading to stop"

5. **--chrome Disabled Response**:
   - Agent checks browser connection at step 0
   - If not connected, guides user to `claude --chrome` or `/chrome`

6. **UI Manipulation Vulnerabilities**:
   - Agent may fail when NotebookLM UI changes
   - Uses visual elements ("three-dot menu", "trash icon") and text-based navigation

7. **Permissions and Security**:
   - Browser control is sensitive operation
   - Recommend `claude --chrome --permission-mode acceptEdits` for testing

## Validation

Validate the plugin:
```bash
cd plugins/notebooklm-connector
claude plugin validate .
```

## References

- [Claude Code Official Documentation](https://github.com/anthropics/claude-code)
- [NotebookLM](https://notebooklm.google.com)
- Reference: `references/notebooklm-skill/` (open source reference)

## License

MIT

## Version

- **v1.0.0**: Initial release
  - Notebook registry management (add/list/delete/update)
  - Chrome integration-based query agent
  - Chat history management feature
