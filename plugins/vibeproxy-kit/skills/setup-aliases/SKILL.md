---
name: setup-aliases
description: "Configure or rebuild backend-specific VibeProxy aliases. Use when the user wants to set up, reset, or customize Claude Code aliases for Codex, Copilot, Antigravity, or Gemini models through VibeProxy."
allowed-tools:
  - Bash(command *)
  - Read
---

# VibeProxy Setup

Set up VibeProxy aliases for using Codex, Copilot, Antigravity, and Gemini models through Claude Code.

## What This Does

1. Adds `cc-*` aliases to `~/.zshrc` (idempotent — safe to run multiple times)
2. Adds `cc-list` function to show all available aliases
3. Prints OAuth login instructions for each provider

## Steps

### Step 1: Check VibeProxy Installation

Verify VibeProxy.app is installed:

```bash
ls /Applications/VibeProxy.app/Contents/Resources/cli-proxy-api-plus 2>/dev/null && echo "OK" || echo "NOT INSTALLED"
```

If not installed, tell the user to download from VibeProxy GitHub releases page and install to /Applications.

### Step 2: Run Setup Script

```bash
bash $SKILL_DIR/scripts/setup.sh
```

If the script outputs `[skip]`, aliases are already set up.

### Step 3: Apply Changes

```bash
source ~/.zshrc
```

### Step 4: Show OAuth Login Instructions

Print these instructions for the user:

```
=== OAuth Login (manual) ===

1. Open VibeProxy app → Settings

2. Codex: Click "Connect" → Sign in with OpenAI

3. Copilot: Click "Connect" → Sign in with GitHub

4. Antigravity: Click "Connect" → Sign in with Google

5. Gemini: ⚠️ Known GUI bug (vibeproxy#286) — use CLI instead:
   /Applications/VibeProxy.app/Contents/Resources/cli-proxy-api-plus \
     -login --config /Applications/VibeProxy.app/Contents/Resources/config.yaml
   → Select "2. Google One" when prompted
```

### Step 5: Verify

Check the proxy server is running:

```bash
curl -s http://localhost:8318/ 2>/dev/null | head -1
```

If it returns the endpoints JSON, setup is complete. Run `cc-list` to see available aliases.

## Gotchas

- The script checks for an existing marker comment before writing. Running it twice won't duplicate aliases.
- VibeProxy uses port 8318 (CLIProxyAPI backend), not 8317 (ThinkingProxy frontend). Aliases point to 8318.
- Gemini GUI OAuth silently fails — always use the CLI workaround until the bug is fixed.
- If the user already has custom `cc-*` aliases, the script won't touch them, but naming conflicts are possible. Check with `grep 'alias cc-' ~/.zshrc` first.
