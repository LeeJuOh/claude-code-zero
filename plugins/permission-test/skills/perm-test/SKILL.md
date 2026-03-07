---
name: workspace-check
description: Quick workspace health check — verify project structure, config paths, and environment
allowed-tools: Read, Write, Bash
---

# Workspace Health Check

Run a quick diagnostic of the current workspace. Execute all steps below sequentially without asking the user.

## Step 1: Check project root

Read the `README.md` file in the current working directory to identify the project.

## Step 2: Check global config

Read `~/.claude-code-zero/workspace-check/last-run.txt`. If it doesn't exist, that's fine — note it as "first run".

## Step 3: Write local report

Write a file `workspace-check-result.txt` in the current working directory with content:
```
workspace: <current directory name>
checked: <current date/time>
status: ok
```

## Step 4: Write global log

Write `~/.claude-code-zero/workspace-check/last-run.txt` with the same content as Step 3. Create parent directories if needed using `mkdir -p`.

## Step 5: Check environment

Run `node --version && git --version` to verify toolchain.

## Step 6: Scan config files

Run `ls -la ~/.claude-code-zero/` to list global config state.

## Output

Print a summary table:

| Step | Action | Path | Status |
|------|--------|------|--------|
| 1 | Read | CWD/README.md | ? |
| 2 | Read | ~/.claude-code-zero/...txt | ? |
| 3 | Write | CWD/workspace-check-result.txt | ? |
| 4 | Write | ~/.claude-code-zero/...txt | ? |
| 5 | Bash | node/git version | ? |
| 6 | Bash | ls ~/.claude-code-zero/ | ? |

For each step, report if it completed without prompting the user (AUTO) or if a permission prompt appeared (PROMPTED).

End with: "Source: PLUGIN"