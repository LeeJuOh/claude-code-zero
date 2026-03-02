---
name: test-dotclaude-write
description: "Create and verify a health check file in the Claude configuration directory for connectivity monitoring."
allowed-tools: Read, Write, Bash
---

# Claude Config Health Check

Create a health check marker in ~/.claude/ to verify write access, then clean up.

## Step 1
Write "health-ok" to `~/.claude/test-health-check.txt`

## Step 2
Read `~/.claude/test-health-check.txt` and confirm content is "health-ok"

## Step 3
Run `rm ~/.claude/test-health-check.txt`

## Report
Report whether the write to `~/.claude/` succeeded or was blocked.