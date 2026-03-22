# Harness Engineer Plugin — Design Spec

> Claude Code plugin that enforces and guides the 15 harness engineering principles in any repository.

## Background

### Problem

OpenAI's "Harness Engineering" (Feb 2026) defined 12 principles for agent-first development. Anthropic's "Seeing Like an Agent" added 3 more. Together these 15 principles represent the most comprehensive framework for making AI coding agents reliable at scale.

However, **no existing tool enforces these principles**. Analysis of all 19 projects in [awesome-agent-harness](https://github.com/anthropics/awesome-agent-harness) reveals:

- **Orchestrators** (Vibe Kanban, Emdash, Composio) — execute agents but don't enforce harness principles
- **Task runners** (Symphony, Baton) — automate issue→PR pipeline but depend on external trackers
- **Frameworks** (Harness Kit, DeerFlow) — provide patterns but don't enforce them
- **Issue managers** (Backlog.md) — repo-native markdown issues but no harness enforcement

The gap: **no tool makes "repo = system of record" real while enforcing harness engineering principles**.

### The 15 Principles

**From OpenAI (12 Rules of Harness Engineering):**

1. **Humans Steer, Agents Execute** — Engineers design environments, agents implement
2. **No Manually-Written Code** — Improve agent tools/context instead of hand-fixing
3. **Repository Knowledge as System of Record** — All context lives in the repo as markdown
4. **Progressive Disclosure** — Small entry point (map) pointing to deeper context
5. **Application Legibility** — Agent can "see" the app (screenshots, DevTools, etc.)
6. **Ephemeral Observability Stacks** — Per-branch/worktree observability
7. **Rigid Architectural Boundaries** — Strict, predictable layered architecture
8. **Mechanical Enforcement of Taste** — Linters with agent-friendly error messages
9. **High-Throughput Merge Philosophy** — Corrections cheap, waiting expensive
10. **Plans as First-Class Artifacts** — Execution plans checked into repo
11. **Continuous Garbage Collection** — Background agents clean technical debt
12. **The Ralph Wiggum Loop** — Agent self-review + agent peer review before human

**From Anthropic:**

13. **Fewer Tools, More Expressiveness** — Composable primitives beat sprawling toolkits
14. **See Like an Agent** — Observe where agents struggle, improve the harness
15. **Simple Composable Patterns > Complex Frameworks** — Avoid over-engineering

### References

- [Harness Engineering (OpenAI)](https://openai.com/index/harness-engineering/)
- [12 Rules of Harness Engineering (Cassie Kozyrkov)](https://www.youtube.com/watch?v=BabEnt6VjtE)
- [Lessons from Building Claude Code: Seeing Like an Agent (Thariq)](https://x.com/trq212/status/2027463795355095314)
- [Building Effective Agents (Anthropic)](https://www.anthropic.com/research/building-effective-agents)
- [agent-harness (governance templates)](https://github.com/MattMagg/agent-harness)
- [Backlog.md (markdown-native task manager)](https://github.com/MrLesk/Backlog.md)
- [awesome-agent-harness (landscape)](https://github.com/anthropics/awesome-agent-harness)

## Product Definition

### One-liner

A Claude Code plugin that enforces and guides the 15 harness engineering principles through repo structure checks, markdown-native issue management, and a local web dashboard.

### Target User

Solo developer (or small team) using Claude Code as their primary coding agent, who wants to practice harness engineering principles without manually tracking compliance.

### Product Form

Claude Code plugin (Phase 1) → Independent CLI tool (Phase 2, future).

## Core Features

### 1. `/harness init` — Repo Structure Scaffolding

Creates the harness-compliant repo structure:

```
.harness/
  config.yaml                      # Which principles to enforce, architecture rules
  architecture.yaml                # Layer boundary definitions (Principle 7)

issues/                            # Issues/tasks as markdown (Principle 3)
  ISSUE-001-example.md

docs/
  decisions/                       # Design decision records (Principle 3)
  plans/                           # Execution plans (Principle 10)

AGENTS.md                          # Agent entry point — table of contents (Principle 4)
```

### 2. `/harness check` — Compliance Scoring

Scans the repo and scores compliance against all 15 principles:

```
$ /harness check

[Principle 3] Repository as System of Record
  ✓ issues/ directory exists with 3 issues
  ✓ docs/decisions/ has 2 decision records
  ✗ No docs/plans/ found

[Principle 4] Progressive Disclosure
  ✓ AGENTS.md exists
  ✗ AGENTS.md is 450 lines — should be a map, not an encyclopedia

[Principle 7] Rigid Architectural Boundaries
  ✗ No .harness/architecture.yaml found

Score: 8/15 principles passing
```

Each check produces:
- Status: pass / warn / fail
- Specific finding (what's wrong)
- Remediation guide (how to fix)

### 3. `/harness issue` — Markdown-Native Issue Management

Absorbs Backlog.md-style functionality:

- `create` — Create issue as `.md` file with YAML frontmatter
- `list` — List issues by status/priority/assignee
- `close` — Mark issue as done
- `assign` — Assign to human or agent

**Issue file format:**

```markdown
---
id: ISSUE-001
title: Fix auth token expiry
status: todo          # todo | in-progress | in-review | done
priority: high        # low | medium | high | critical
assignee: agent       # human | agent
created: 2026-03-22
---

## Description
Token expiry not handled during API calls.

## Acceptance Criteria
- [ ] Return 401 for expired tokens
- [ ] Implement automatic token refresh

## Agent Execution Log
<!-- Automatically appended by harness -->
```

### 4. `/harness board` — Local Web Dashboard

Launches a local web server (`localhost`) with:

**Tab 1 — Issue Kanban**
- Columns: To Do / In Progress / In Review / Done
- Cards show assignee (human/agent), priority
- Card click → issue detail + agent execution log

**Tab 2 — Compliance Scoreboard**
- 15 principles with pass/warn/fail status
- Total score (e.g., 11/15)
- Click failing item → remediation guide

**Tab 3 — Knowledge Map** (Phase 2)
- `docs/decisions/` timeline
- `docs/plans/` list + status
- `AGENTS.md` structure visualization

**Tab 4 — Agent Activity** (Phase 3)
- Running agent status
- Completed work history
- Cost tracking

### 5. `/harness decide` — Design Decision Records (Phase 2)

```markdown
---
id: DEC-001
title: JWT vs Session-based Auth
date: 2026-03-22
status: accepted      # proposed | accepted | rejected | superseded
---

## Context
...

## Decision
JWT. Reason: ...

## Consequences
...
```

### 6. `/harness plan` — Execution Plans (Phase 2)

Create and check in execution plans as first-class artifacts (Principle 10).

### 7. `/harness run` — Agent Dispatch (Phase 2)

Dispatch an agent to work on a specific issue. Agent reads the issue file, executes, and results are logged back to the issue.

### 8. Hooks

| Event | Action | Principle |
|-------|--------|-----------|
| SessionStart | Show open issues summary + compliance warnings | 3, 4 |
| PreToolUse(Write) | Check architectural boundary violations | 7 |
| PostToolUse(Bash) | Check linter error messages are agent-friendly | 8 |

## Plugin Structure

```
plugins/harness-engineer/
  .claude-plugin/plugin.json
  skills/
    harness-init/SKILL.md
    harness-check/SKILL.md
    harness-issue/SKILL.md
    harness-board/SKILL.md
    harness-decide/SKILL.md        # Phase 2
    harness-plan/SKILL.md          # Phase 2
    harness-run/SKILL.md           # Phase 2
  hooks/
    hooks.json
    session-start.sh
    pre-write-check.sh             # Phase 2
  agents/
    compliance-checker.md
  scripts/
    board-server/                   # Dashboard web server
```

## MVP Scope (Phase 1)

| Feature | Principles | Rationale |
|---------|-----------|-----------|
| `/harness init` | 3, 4, 10 | Prerequisite for everything else |
| `/harness check` | All 15 | Core value — makes enforcement real |
| `/harness issue` | 3 | Most tangible "repo = SoR" feature |
| `/harness board` (Tab 1, 2) | 3 | Humans need visibility |
| SessionStart hook | 3, 4 | Agent gets context automatically |

## Phase 2

| Feature | Principles |
|---------|-----------|
| `/harness decide` | 3 |
| `/harness plan` | 10 |
| `/harness run` | 1, 12 |
| PreToolUse hook — architecture check | 7 |
| Dashboard Tab 3 (Knowledge Map) | 3, 4 |

## Phase 3 (Future)

| Feature | Principles |
|---------|-----------|
| Linter error message format enforcement | 8 |
| Garbage collection agent | 11 |
| Ralph Wiggum self-review loop | 12 |
| Ephemeral observability guide | 6 |
| Dashboard Tab 4 (Agent Activity) | 1 |
| MCP server (multi-agent support) | 13 |
| Extract to independent CLI tool (C → B) | — |

## Competitive Positioning

| | Vibe Kanban | Backlog.md | Symphony | Chorus | **harness-engineer** |
|---|---|---|---|---|---|
| Issue management | DB-based | Repo markdown | External (Linear) | Own backend | **Repo markdown** |
| Agent dispatch | O | X | O | O | **Phase 2** |
| Dashboard | O | O | X | O | **O** |
| Principle enforcement | X | X | X | X | **Core feature** |
| Repo = SoR | X | O | X | X | **O** |
| Knowledge accumulation | X | X | X | Partial | **O** |

No existing tool combines repo-native issue management with harness principle enforcement.

## Open Questions

1. **Plugin name** — `harness-engineer`? `harness-check`? `repo-harness`?
2. **Dashboard tech** — Static HTML generation vs lightweight local server (Node/Python/Bun)?
3. **Issue ID format** — Auto-increment (`ISSUE-001`) vs timestamp-based vs slug-only?
4. **Config format** — YAML (`.harness/config.yaml`) vs TOML vs JSON?
5. **Backlog.md compatibility** — Should we be compatible with Backlog.md's file format, or design our own?
