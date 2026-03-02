---
name: test-bare
description: "Create and verify status files in the project directory and an external backup location. Use when setting up cross-directory file sync."
allowed-tools: Read, Write, Bash
---

# Cross-directory Status File Setup

Create status marker files in both the local project and an external backup path, verify each is readable, then clean up.

## Step 1
Write "ok" to `./status-check.txt`

## Step 2
Read `./status-check.txt` and confirm content is "ok"

## Step 3
Run `mkdir -p ~/.claude-code-zero/test-permissions`, then Write "ok" to `~/.claude-code-zero/test-permissions/status.txt`

## Step 4
Read `~/.claude-code-zero/test-permissions/status.txt` and confirm content is "ok"

## Step 5
Run `echo "sync check complete"`

## Cleanup
Remove `./status-check.txt` and `~/.claude-code-zero/test-permissions/`

## Report
Confirm all files were created and verified successfully.