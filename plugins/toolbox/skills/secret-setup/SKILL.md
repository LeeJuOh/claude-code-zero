---
name: secret-setup
description: Scan CLAUDE.md and project config for hardcoded secrets (API keys, DB URLs, tokens, passwords), then extract them into a gitignored env file and wire up a SessionStart hook so they load automatically. Use when user says "separate secrets", "remove keys from CLAUDE.md", "extract API keys", "secret setup", "env var setup", "hardcoded credentials", or when CLAUDE.md contains visible secrets that should be externalized. Also trigger when user mentions ".env setup for Claude", "load secrets via hook", or "protect credentials in CLAUDE.md".
disable-model-invocation: true
allowed-tools: Read, Edit, Write, Bash, Grep, Glob, AskUserQuestion
---

# Secret Setup

Extract hardcoded secrets from CLAUDE.md and project config into a gitignored env file, then wire up a SessionStart hook to load them automatically via `CLAUDE_ENV_FILE`.

This is a security hygiene tool. Secrets in CLAUDE.md get committed to git, shared with collaborators, and cached in Claude's context. The fix is to move them to a gitignored file and load them through a hook.

## Phase 1: Scan for secrets

Search these files for hardcoded secrets:

- `CLAUDE.md` (project root)
- `.claude/CLAUDE.md` (if exists)
- `.claude/settings.json` and `.claude/settings.local.json`
- Any `.claude/rules/*.md` files

Use these detection patterns (regex):

| Pattern | What it catches |
|---------|----------------|
| `sk-[a-zA-Z0-9_-]{20,}` | OpenAI / Anthropic API keys |
| `sk_(test\|live)_[a-zA-Z0-9]{20,}` | Stripe API keys |
| `(api[_-]?key\|api[_-]?secret\|access[_-]?token\|secret[_-]?key)\s*[:=]\s*["']?[A-Za-z0-9+/_.~-]{16,}` | Generic API key assignments |
| `(postgres\|postgresql\|mysql\|mongodb\|redis\|amqp\|rediss):\/\/[^\s"']+` | Database / message broker connection strings |
| `Bearer\s+[A-Za-z0-9._~+/=-]{20,}` | Bearer tokens |
| `(password\|passwd\|pwd)\s*[:=]\s*["']?[^\s"']{8,}` | Password assignments |
| `ghp_[A-Za-z0-9]{36,}\|github_pat_[A-Za-z0-9_]{22,}` | GitHub tokens |
| `xoxb-[0-9]+-[A-Za-z0-9]+\|xoxp-[0-9]+-[A-Za-z0-9]+` | Slack tokens |
| `AKIA[0-9A-Z]{16}` | AWS access key IDs |
| `[A-Za-z0-9/+=]{40}` | AWS secret access keys (flag only when adjacent to an AWS access key ID) |
| `https?://hooks\.slack\.com/[^\s"']+` | Slack webhook URLs |
| `[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}` | UUIDs (flag only if near key/token/secret context words) |

Run the scan with Grep, then present findings in a table:

```
| # | File | Line | Type | Value (masked) |
|---|------|------|------|----------------|
| 1 | CLAUDE.md:42 | API Key | sk-...abc1 |
| 2 | CLAUDE.md:55 | DB URL | postgres://...@host/db |
```

Ask the user to confirm which items are actual secrets to extract. Some may be intentional examples or documentation — do not force extraction of those.

## Phase 2: Variable mapping

For each confirmed secret, propose an environment variable name:

- If the secret is already referenced by a known env var name in the project (e.g., `DATABASE_URL` in code), reuse that name.
- Otherwise, derive a descriptive UPPER_SNAKE_CASE name from the context (e.g., `OPENAI_API_KEY`, `SLACK_WEBHOOK_URL`).

Present the mapping and ask for confirmation:

```
| # | Current value (masked) | Proposed env var |
|---|----------------------|-----------------|
| 1 | sk-...abc1 | OPENAI_API_KEY |
| 2 | postgres://...@host/db | DATABASE_URL |
```

The user may rename variables or skip items. Wait for approval before proceeding.

## Phase 3: Infrastructure setup

This phase creates the env file, hook script, hook registration, and deny rules. Each step checks for existing infrastructure and merges rather than overwrites.

### Step 3.1: Determine env file location

Check if the project already has a gitignored env file:

```bash
# Look for existing gitignored env files
for f in .env.local .env.secret .env .env.development.local; do
  git check-ignore "$f" 2>/dev/null && echo "FOUND: $f"
done
```

- If a gitignored env file exists, propose appending to it.
- If multiple exist, ask the user which one to use.
- If none exist, ask the user where to create one (default: `.env.local`).

### Step 3.2: Ensure gitignore coverage

Verify the chosen file is gitignored:

```bash
git check-ignore -q "<chosen-file>" 2>/dev/null
echo $?  # 0 = ignored, 1 = NOT ignored
```

If not ignored, propose adding the filename to `.gitignore`. Show the exact line to add and ask for confirmation.

### Step 3.3: Write the env file

- If the file already exists, append new variables (do not duplicate existing ones).
- If it does not exist, create it with a header comment.

Format:
```bash
# Claude Code secrets — loaded via SessionStart hook
# DO NOT commit this file to git
OPENAI_API_KEY=<paste-your-key-here>
DATABASE_URL=<paste-your-connection-string-here>
```

Tell the user to fill in the actual values. Do NOT write real secret values — use placeholder text. The user edits the file directly afterward.

### Step 3.4: Create the hook script

Create `.claude/hooks/load-secrets.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

# Load secrets into Claude Code session via CLAUDE_ENV_FILE
# Triggered by SessionStart hook

ENV_FILE="$CLAUDE_PROJECT_DIR/<chosen-env-file>"

if [ ! -f "$ENV_FILE" ]; then
  exit 0  # No env file yet — skip silently
fi

if [ -z "${CLAUDE_ENV_FILE:-}" ]; then
  exit 0  # No CLAUDE_ENV_FILE provided — skip
fi

# Read each non-comment, non-empty line and export it
while IFS= read -r line || [ -n "$line" ]; do
  # Skip comments and empty lines
  [[ "$line" =~ ^[[:space:]]*# ]] && continue
  [[ -z "${line// }" ]] && continue
  echo "export $line" >> "$CLAUDE_ENV_FILE"
done < "$ENV_FILE"

exit 0
```

Make it executable:
```bash
chmod +x .claude/hooks/load-secrets.sh
```

Replace `<chosen-env-file>` with the actual relative path determined in Step 3.1.

### Step 3.5: Register the hook in settings.local.json

Read `.claude/settings.local.json` (create if missing). Merge the SessionStart hook entry into the existing hooks structure without clobbering other hooks.

The hook entry to add:

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
- If `settings.local.json` does not exist, create it with only the hooks entry.
- If it exists but has no `hooks` key, add the `hooks` key.
- If it has `hooks` but no `SessionStart`, add the `SessionStart` array.
- If it already has `SessionStart` entries, append the new entry to the array.

### Step 3.6: Add deny rules

Add deny rules to `.claude/settings.local.json` to prevent Claude from reading the env file directly. This is a safety net — secrets should only be available through the environment, not through file reads.

Deny rules to add (adjust the path to match the chosen env file):

```json
{
  "permissions": {
    "deny": [
      "Read(<env-file-path>)",
      "Bash(cat <env-file-path>*)"
    ]
  }
}
```

For example, if the env file is `.env.local`:
```json
{
  "permissions": {
    "deny": [
      "Read(.env.local)",
      "Bash(cat .env.local*)"
    ]
  }
}
```

Merge with existing deny rules — do not remove existing entries.

## Phase 4: Clean up CLAUDE.md

For each extracted secret, replace the hardcoded value with the `$ENV_VAR_NAME` reference in the original file.

Example — before:
```
API_KEY: sk-1234567890abcdef
```

After:
```
API_KEY: $OPENAI_API_KEY  (loaded via SessionStart hook)
```

Add a brief note near the top of CLAUDE.md (or update existing notes section) explaining the setup:

```markdown
## Secrets

Environment variables are loaded automatically via SessionStart hook.
See `.claude/hooks/load-secrets.sh` for the loading mechanism.
Do not hardcode secrets in this file — use `$VAR_NAME` references.
```

## Phase 5: Verification

Test the hook script by running it with a mock `CLAUDE_ENV_FILE`:

```bash
MOCK_ENV=$(mktemp)
CLAUDE_ENV_FILE="$MOCK_ENV" CLAUDE_PROJECT_DIR="$(pwd)" .claude/hooks/load-secrets.sh
echo "=== Loaded variables ==="
cat "$MOCK_ENV"
rm "$MOCK_ENV"
```

Expected output: one `export VAR=value` line per secret (or placeholder).

After verification, inform the user:
1. Fill in actual values in the env file.
2. The hook activates on the **next session start** (restart Claude Code or start a new session).
3. Variables will be available as regular environment variables in Bash commands.
4. Run `/hooks` to confirm the SessionStart hook appears.

## Gotchas

- **Existing env files**: Always check for and append to existing env files rather than creating duplicates. A project might already have `.env.local` with other variables.
- **Nested CLAUDE.md**: Some projects have CLAUDE.md at multiple levels. Scan all of them, not just the root one.
- **settings.local.json is gitignored**: Claude Code auto-gitignores this file. That is the correct place for the hook registration and deny rules because they reference local file paths.
- **CLAUDE_ENV_FILE is session-scoped**: The env var `CLAUDE_ENV_FILE` is only available inside SessionStart hooks. The hook writes `export` lines to it, and Claude Code sources that file before each Bash command in the session.
- **Placeholder values**: Never write actual secret values. Always use `<paste-your-key-here>` style placeholders so the user fills them in manually.
- **Deny rules are additive**: When merging deny rules into settings.local.json, existing deny rules must be preserved. Use array concatenation, not replacement.
- **Hook idempotency**: The hook script skips gracefully if the env file does not exist yet. This prevents errors when the env file is created later.
- **Line ending safety**: Always use Unix LF line endings in the hook script. CRLF causes `command\r: not found` errors.
