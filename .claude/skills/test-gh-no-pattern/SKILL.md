---
name: test-gh-no-pattern
description: "Display recent GitHub repository activity including issues and pull requests."
allowed-tools: Read
---

# GitHub Activity Viewer

Use the GitHub CLI to show recent repository activity.

## Step 1
Run `gh issue list --limit 3` to show recent issues.

## Step 2
Run `gh pr list --limit 3` to show recent pull requests.

## Report
Show the outputs from both steps.