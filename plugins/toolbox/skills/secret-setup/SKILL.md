---
name: secret-setup
description: Extract hardcoded secrets from CLAUDE.md, .mcp.json, and project config into a gitignored env file, then wire a SessionStart hook to load them automatically. Use when user says "separate secrets", "extract API keys", "secret setup", "env var setup", "hardcoded credentials", ".env setup for Claude", "load secrets via hook", "protect credentials", or "clean up mcp secrets".
disable-model-invocation: true
allowed-tools: Read, Edit, Write, Bash, Grep, Glob, AskUserQuestion
argument-hint: "[scan-only]"
---

# Secret Setup

Extract hardcoded secrets from CLAUDE.md, `.mcp.json`, and project config into a gitignored env file, then wire up a SessionStart hook to load them automatically via `CLAUDE_ENV_FILE`.

Secrets in CLAUDE.md and `.mcp.json` get committed to git, shared with collaborators, and cached in Claude's context. This skill moves them to a gitignored file and loads them through a hook or shell profile.

If the user passes `scan-only`, stop after Phase 1 (report findings without modifying anything).

## Phase 1: Scan for secrets

Read [references/detection-patterns.md](references/detection-patterns.md) for the full list of regex patterns and scan targets.

Run Grep with each pattern against the scan targets. Present findings in a table:

```
| # | File | Line | Type | Value (masked) |
|---|------|------|------|----------------|
| 1 | CLAUDE.md:42 | API Key | sk-...abc1 |
| 2 | CLAUDE.md:55 | DB URL | postgres://...@host/db |
```

Ask the user to confirm which items are actual secrets to extract. Some may be intentional examples or documentation — do not force extraction.

## Phase 2: Variable mapping

For each confirmed secret, propose an environment variable name:

- If the secret is already referenced by a known env var name in the project (e.g., `DATABASE_URL` in code), reuse that name.
- Otherwise, derive a descriptive UPPER_SNAKE_CASE name from context.

Present the mapping and ask for confirmation. Mark the source so MCP secrets get handled differently in Phase 4:

```
| # | Source | Current value (masked) | Proposed env var |
|---|--------|----------------------|-----------------|
| 1 | CLAUDE.md | sk-...abc1 | OPENAI_API_KEY |
| 2 | CLAUDE.md | postgres://...@host/db | DATABASE_URL |
| 3 | .mcp.json | xoxb-...token | SLACK_TOKEN |
```

The user may rename variables or skip items. Wait for approval before proceeding.

## Phase 3: Infrastructure setup

Each step checks for existing infrastructure and merges rather than overwrites.

### Step 3.1: Determine env file location

Check if the project already has a gitignored env file:

```bash
for f in .env.local .env.secret .env .env.development.local; do
  git check-ignore "$f" 2>/dev/null && echo "FOUND: $f"
done
```

- If a gitignored env file exists, propose appending to it.
- If multiple exist, ask the user which one to use.
- If none exist, ask the user where to create one (default: `.env.local`).

### Step 3.2: Ensure gitignore coverage

```bash
git check-ignore -q "<chosen-file>" 2>/dev/null
echo $?  # 0 = ignored, 1 = NOT ignored
```

If not ignored, propose adding the filename to `.gitignore`. Show the exact line and ask for confirmation.

### Step 3.3: Write the env file

- If the file exists, append new variables (skip duplicates).
- If not, create with a header comment.

Format:
```bash
# Claude Code secrets — loaded via SessionStart hook
# DO NOT commit this file to git
OPENAI_API_KEY=<paste-your-key-here>
DATABASE_URL=<paste-your-connection-string-here>
```

Tell the user to fill in actual values. Do NOT write real secret values — always use placeholders.

### Step 3.4: Create the hook script

Read the template at [assets/load-secrets.sh.template](assets/load-secrets.sh.template). Copy it to `.claude/hooks/load-secrets.sh`, replacing `{{ENV_FILE_PATH}}` with the actual relative path from Step 3.1.

Make it executable:
```bash
chmod +x .claude/hooks/load-secrets.sh
```

### Step 3.5: Register the hook in settings.local.json

Read `.claude/settings.local.json` (create if missing). Merge the SessionStart hook entry:

```json
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "startup",
        "hooks": [
          {
            "type": "command",
            "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/load-secrets.sh"
          }
        ]
      }
    ]
  }
}
```

Merging rules:
- No file → create with only the hooks entry.
- No `hooks` key → add it.
- No `SessionStart` → add the array.
- Existing `SessionStart` → append the new entry.

### Step 3.6: Add deny rules

Add deny rules to `.claude/settings.local.json` to prevent Claude from reading the env file directly. Adjust paths to match the chosen env file (example uses `.env.local`):

```json
{
  "permissions": {
    "deny": [
      "Read(.env.local)",
      "Bash(cat .env.local*)",
      "Bash(head .env.local*)",
      "Bash(tail .env.local*)",
      "Bash(less .env.local*)",
      "Bash(more .env.local*)"
    ]
  }
}
```

Merge with existing deny rules — do not remove existing entries.

## Phase 4: Clean up source files

### CLAUDE.md and config files

Replace each hardcoded value with the `$ENV_VAR_NAME` reference.

Before:
```
API_KEY: sk-1234567890abcdef
```

After:
```
API_KEY: $OPENAI_API_KEY  (loaded via SessionStart hook)
```

Add a brief note near the top of CLAUDE.md:

```markdown
## Secrets

Environment variables are loaded automatically via SessionStart hook.
See `.claude/hooks/load-secrets.sh` for the loading mechanism.
Do not hardcode secrets in this file — use `$VAR_NAME` references.
```

### MCP config files (.mcp.json)

MCP servers are spawned as separate processes when Claude Code starts — **before** SessionStart hooks run. This means MCP servers cannot receive env vars set via the SessionStart hook. They only inherit env vars already present in the parent shell environment.

Present the user with two options:

**Option A (recommended for shared repos):** Remove the hardcoded value from the `env` field. The user sets the env var in their shell profile (`~/.zshrc` or `~/.bashrc`) instead. The MCP server inherits it from the parent process.

Before:
```json
{
  "env": {
    "SLACK_TOKEN": "xoxb-actual-token"
  }
}
```

After:
```json
{
  "env": {}
}
```

User adds to `~/.zshrc`:
```bash
export SLACK_TOKEN="xoxb-actual-token"
```

**Option B (simpler):** Gitignore `.mcp.json` entirely. Secrets stay in the file but are not committed. Downside: MCP server configuration is no longer shared with collaborators.

Ask the user which option they prefer. If Option A, also add the env var to the `.env.local` file (as a reference, even though it won't be loaded via hook for MCP). Tell the user they must restart their shell and Claude Code for changes to take effect.

## Phase 5: Verification

Test the hook script:

```bash
MOCK_ENV=$(mktemp)
CLAUDE_ENV_FILE="$MOCK_ENV" CLAUDE_PROJECT_DIR="$(pwd)" .claude/hooks/load-secrets.sh
echo "=== Loaded variables ==="
cat "$MOCK_ENV"
rm "$MOCK_ENV"
```

Expected output: one `export VAR="value"` line per secret (or placeholder).

After verification, inform the user:
1. Fill in actual values in the env file.
2. The hook activates on the **next session start** (restart Claude Code or start a new session).
3. Variables will be available as regular environment variables in Bash commands.
4. Run `/hooks` to confirm the SessionStart hook appears.

## Gotchas

- **Existing env files**: Always check for and append to existing env files rather than creating duplicates. A project might already have `.env.local` with other variables.
- **Nested CLAUDE.md**: Some projects have CLAUDE.md at multiple levels. Scan all of them, not just the root one.
- **settings.local.json is gitignored**: Claude Code auto-gitignores this file. That is the correct place for hook registration and deny rules because they reference local file paths.
- **CLAUDE_ENV_FILE is session-scoped**: Only available inside SessionStart hooks. The hook writes `export` lines to it, and Claude Code sources that file before each Bash command in the session.
- **Placeholder values**: Never write actual secret values. Always use `<paste-your-key-here>` style placeholders so the user fills them in manually.
- **Deny rules are additive**: When merging deny rules into settings.local.json, existing deny rules must be preserved. Use array concatenation, not replacement.
- **Hook idempotency**: The hook script skips gracefully if the env file does not exist yet. This prevents errors when the env file is created later.
- **Line ending safety**: Always use Unix LF line endings in the hook script. CRLF causes `command\r: not found` errors.
- **Value quoting**: The hook script wraps values in double quotes (`export KEY="value"`) to handle spaces and special characters. If a value itself contains double quotes, the user must escape them in the env file (`KEY=value with \"quotes\"`).
- **MCP secrets ≠ CLAUDE.md secrets**: MCP servers start as separate processes before SessionStart hooks run. They cannot receive env vars from the hook. MCP secrets must be set in the shell profile (`~/.zshrc`) or the `.mcp.json` must be gitignored.
- **MCP env field inheritance**: When an `env` field in `.mcp.json` is empty or missing a key, the MCP server inherits that env var from the parent shell. This is standard Unix process behavior — removing a key from `env` does NOT block inheritance.
