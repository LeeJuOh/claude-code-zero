# NotebookLM Connector Plugin

A plugin for managing and querying NotebookLM notebooks using Claude Code's Chrome integration beta feature.

## Overview

This plugin provides:

1. **NotebookLM Manager** (Skill: `notebooklm-manager`)
   - Add, list, delete, and update NotebookLM notebooks
   - Search and manage notebooks by topic
   - Query orchestration with follow-up loop mechanism

2. **Chrome Integration-Based Querying** (Agent: `chrome-mcp-query`)
   - Uses Claude Code's Chrome integration beta feature
   - Query NotebookLM and collect answers
   - Chat history management (delete/keep options)

---

## Architecture

### Core Design: Shared Chrome Session via MCP

Unlike traditional browser automation approaches that spawn fresh Playwright/headless sessions per query, this plugin leverages **Claude Code's Chrome integration (MCP)** to share the user's existing Chrome session. This means:

- No separate browser process or authentication flow
- Uses the user's live NotebookLM login state
- Real browser tabs visible for verification
- Zero external dependencies (pure Claude Code plugin)

### Architecture Overview

```
┌───────────────────────┐
│     User Request      │
└───────────┬───────────┘
            ▼
┌───────────────────────┐
│  Skill Layer          │
│  notebooklm-manager   │
│                       │
│  - Query orchestration│
│  - Notebook registry  │
│  - Follow-up analysis │
│                       │
│  - Coverage analysis  │
│  (triggered by hook)  │
│  → new query or deliver│
└───────────┬───────────┘
            │ Task(chrome-mcp-query)
            ▼
┌───────────────────────┐
│  Agent Layer          │
│  chrome-mcp-query     │
│                       │
│  - 6-step workflow    │
│  - Tab management     │
│  - JS polling         │
│  - Response extraction│
└───────────┬───────────┘
            │ Chrome MCP tools
            ▼
┌───────────────────────┐     ┌───────────────────────┐
│  Browser Layer        │     │  Data Layer           │
│  Chrome + Extension   │     │  (file-based)         │
│                       │     │                       │
│  - Tab create/navigate│     │  data/library.json    │
│  - Form input/submit  │     │  data/notebooks/*.json│
│  - JavaScript exec    │     │  data/archive.json    │
│  - Screenshot fallback│     │                       │
└───────────────────────┘     └───────────────────────┘
```

**Hook Layer** (cross-cutting):

| Hook | Event | Scope | Purpose |
|------|-------|-------|---------|
| `follow-up-reminder.sh` | `PostToolUse` | Plugin-level (`hooks/hooks.json`) | Approves with `decision:"block"` + coverage analysis instructions in `reason` after agent completes |

---

## How It Differs (vs Reference)

This plugin was inspired by a reference implementation (`notebooklm-skill`) but takes a fundamentally different architectural approach:

| Aspect | Reference (`notebooklm-skill`) | This Plugin |
|--------|-------------------------------|-------------|
| **Browser** | Fresh Playwright session per query | Shared Chrome session via MCP |
| **Auth** | Persistent profile + cookie injection | User's existing Chrome login |
| **Follow-up** | Text appended to response | PostToolUse hook + `decision:"block"` with instructions in `reason` |
| **Session** | Stateless (fresh each time) | Stateless (agent reuses existing browser tab) |
| **Dependencies** | Python, Playwright, venv | None (pure Claude Code plugin) |

---

## Operating Modes

### Normal Mode

```
User ──► Skill(notebooklm-manager) ──► Task(chrome-mcp-query) ──► Chrome MCP ──► NotebookLM
                                              │ (Task completes)
                                        PostToolUse Hook (plugin-level hooks.json)
                                        → decision:"block" + reason: COVERAGE_REMINDER
                                              │
                                        Coverage analysis (Section 5)
                                        → new query or deliver response
```

- Skill triggers directly from user prompt
- After Task completes, **PostToolUse hook** (defined in plugin-level `hooks/hooks.json`) fires
- Hook returns `decision:"block"` with coverage analysis instructions as `reason`, which Claude processes as a direct prompt
- Works regardless of whether the skill is active (plugin-level scope)
- Agent reuses existing browser tab for the same URL, enabling follow-up queries without re-navigation

---

## Follow-Up Mechanism

The follow-up system ensures comprehensive answers through a hook-driven feedback loop:

```
Agent returns response ──► PostToolUse hook fires (plugin-level hooks.json)
                           │
                           ▼
                     decision:"block" + reason: COVERAGE_REMINDER
                           │
                           ▼
                     Claude performs:
                     1. Are all user topics covered?
                     2. Any missing keywords? (✅/❌)
                           │
                    ┌──────┴──────┐
                    ▼             ▼
              Gaps exist     All covered
                    │             │
                    ▼             ▼
            Task(new agent  Synthesize &
             same URL)      deliver to user
            (max 3 times)
```

**Why plugin-level hook (`hooks/hooks.json`)?**
- Fires regardless of whether `notebooklm-manager` skill is active
- Works when main agent calls `Task(chrome-mcp-query)` directly
- Filters by `tool_input.subagent_type` to target only `chrome-mcp-query` — no side effects on other Task invocations
- Follow-up queries reuse the existing Chrome tab — no extra session overhead

---

## Chrome Integration Requirements

This plugin uses **Claude Code's Chrome integration beta feature** to query NotebookLM directly in your browser.

### Prerequisites

Before using this plugin, ensure you have:

✅ **Google Chrome or Microsoft Edge** - Required (third-party Chromium browsers like Brave/Arc are not supported)
✅ **Claude in Chrome extension** - Version 1.0.36 or higher ([Install from Chrome Web Store](https://chromewebstore.google.com/detail/claude/fcoeoabgfenejglbffodgkkbkcdhcgfn))
✅ **Claude Code CLI** - Version 2.0.73 or higher
✅ **Paid Claude plan** - Pro, Max, Team, or Enterprise
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
  - Registers notebook metadata
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
  2. Call chrome-mcp-query agent
  3. Query NotebookLM
  4. Wait for response with thinking indicator detection
  5. Provide answer with citations
```

## Features

### Skill: notebooklm-manager

Manages the notebook registry.

**Supported Operations**:
- **List**: Display all registered notebooks
- **Add**: Register new notebook (requires alias, topic, url)
- **Delete**: Remove specific notebook
- **Update**: Update notebook information
- **Search**: Find notebooks by topic

### Agent: chrome-mcp-query

Queries NotebookLM using Claude Code's Chrome integration.

**Key Features**:
- Automatic Chrome integration connection check
- NotebookLM login status verification
- **Chat History Management**: Delete/keep options before querying
- UI waiting and stability guarantees
- Structured answer format (Title/Answer/Citations/Follow-ups)
- Tab preservation (user can verify)

**Constraints**:
- Processes only one notebook URL at a time
- Answers only one question per invocation
- Cannot compare multiple notebooks

## Chat History Handling

Before the **first query** to a notebook in a session, the skill confirms with the user:

```
Clear NotebookLM chat history before querying? (No / Yes)

Note: NotebookLM's chat history is kept personally.
Previous conversation context may affect the current question.
```

- **"No" (Recommended)**: Keep previous context, faster response
- **"Yes"**: Start fresh, may involve UI modal interaction

After asking once for a given notebook URL, this confirmation is skipped for subsequent queries to the same URL in the same session.

## Error Handling & Troubleshooting

### Common Errors

| Error | Cause | Solution | Learn More |
|-------|-------|----------|------------|
| **Chrome integration not connected** | Running without `--chrome` flag | 1. Run `claude --chrome`<br>2. Or execute `/chrome`<br>3. Verify: `/chrome` shows "Connected" | [Chrome Docs](https://code.claude.com/docs/en/chrome) |
| **Authentication required** | Not logged into Google in Chrome | 1. Open Chrome<br>2. Go to notebooklm.google.com<br>3. Log in with Google account<br>4. Keep session active<br>5. Retry query | Session is shared with Chrome |
| **Modal dialog detected** | JavaScript alert/confirm appeared | 1. Manually dismiss dialog in Chrome<br>2. Tell Claude to continue<br>3. Report which action triggered it | Known Chrome automation limitation |
| **No notebook URL** | Notebook not in registry | 1. List notebooks: "list my notebooks"<br>2. Add notebook: "add <url>"<br>3. Verify URL format | Must start with `https://notebooklm.google.com/notebook/` |
| **UI element not found** | NotebookLM UI changed or still loading | 1. Wait 5-10 seconds<br>2. Manually verify page loaded<br>3. Check URL is correct<br>4. Try manual refresh | UI detection may need updates |
| **Response timeout (75s)** | Network slow or long document | 1. Retry with same question<br>2. Simplify question<br>3. Check network connection | Large documents take longer |
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
5. If this is your first time connecting, restart Chrome to register the native messaging host
   - The native messaging host is installed at `~/.anthropic/native-messaging/` (macOS/Linux)
6. If the extension service worker went idle, click the extension icon to wake it up, then reconnect

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
- Waiting over 60 seconds
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
4. If accessing someone else's notebook, ensure it is shared with you

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

## Requirements

1. **Claude Code**: Local installation required
2. **Chrome Integration**: `--chrome` flag or `/chrome` command
3. **NotebookLM Login**: Must be logged into Google account in Chrome
4. **Notebook Sharing**: Only required if accessing notebooks owned by others (shared via "Anyone with link")

## References

- [Claude Code Official Documentation](https://github.com/anthropics/claude-code)
- [NotebookLM](https://notebooklm.google.com)

## License

MIT

## Version

- **v1.0.0**: Initial release
  - Notebook registry management (add/list/delete/update)
  - Chrome integration-based query agent
  - Chat history management feature
