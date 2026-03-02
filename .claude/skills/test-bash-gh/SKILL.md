---
name: test-bash-gh
description: "List recent GitHub issues and PRs for the current repository using the gh CLI."
allowed-tools: Read, Bash(gh *)
---

# GitHub Repository Activity Reporter

Use the GitHub CLI to fetch and display recent repository activity.

## Step 1
Run `gh issue list --limit 3` to show recent issues.

## Step 2
Run `gh pr list --limit 3` to show recent pull requests.

## Report
Show the outputs from both steps.