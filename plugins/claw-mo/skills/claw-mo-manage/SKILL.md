---
name: claw-mo-manage
description: "Manage mo markdown viewer — check status, add/remove patterns and groups, reset sessions. Use when user says claw-mo-manage, wants to check mo status, modify watch patterns, add or remove groups, or reset mo session."
allowed-tools: Bash, AskUserQuestion, Read, Write
---

# claw-mo-manage

Interactive management hub for mo markdown viewer. Shows current state and lets the user choose what to do.

For config schema, HTTP API, and groups: read `${PLUGIN_DIR}/references/shared.md`

## Steps

### 1. Gather State

Run in parallel:
- `mo --status --json` — get all running servers
- Read `${PLUGIN_DATA_DIR}/config.json` — get all configured projects
- Get current project key: `git rev-parse --show-toplevel`

### 2. Display Dashboard

Present a clear overview:

```
mo 서버 현황
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
● project-a     :6342  실행 중  docs(12) plans(3) default(2)
● project-b     :6367  실행 중  specs(5)
○ project-c     :6315  중지됨

현재 프로젝트: project-a (:6342)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
무엇을 할까요?
1) 패턴 추가
2) 패턴 제거
3) 그룹 추가
4) 그룹 제거
5) 세션 초기화
```

Match config entries with running servers to show accurate status (● running / ○ stopped).

### 3. AskUserQuestion

Ask what the user wants to do. Handle based on choice:

**패턴 추가**:
1. Ask which group (show existing groups)
2. Ask the glob pattern
3. If server running → use HTTP API: `POST /_/api/patterns` with `{"pattern": "...", "group": "..."}`
4. Update config file
5. Confirm

**패턴 제거**:
1. Show current patterns per group
2. Ask which to remove
3. If server running → use HTTP API: `DELETE /_/api/patterns?pattern=...&group=...`
4. Update config file
5. Confirm

**그룹 추가**:
1. Ask group name and patterns
2. If server running → add patterns via API with new target group
3. Update config file
4. Confirm

**그룹 제거**:
1. Show groups, ask which to remove
2. If server running → remove all patterns for that group via API
3. Update config file (remove group key)
4. Confirm

**세션 초기화**:
1. `echo "y" | mo --clear -p PORT`
2. Confirm reset

### 4. Loop or Exit

After completing an action, show the updated dashboard and ask if they want to do anything else. Exit when they're done.

## Gotchas

- Always pipe `y` to `mo --clear` — it prompts for confirmation and will hang without it
- Config is desired state — update config AND runtime (via API) together to keep them in sync
- Group names must be simple lowercase — they become URL path segments
- If server is not running, only update config (skip API calls)
