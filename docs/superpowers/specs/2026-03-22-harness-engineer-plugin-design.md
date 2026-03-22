# Harness Engineer Plugin — Design Spec

> Claude Code plugin that enforces and guides the 16 harness engineering principles in any repository.

## Background

### Problem

OpenAI's "Harness Engineering" blog (Feb 2026) described a comprehensive approach to agent-first development. Cassie Kozyrkov distilled it into [12 actionable rules](https://www.youtube.com/watch?v=BabEnt6VjtE). Anthropic's Claude Code team shared [4 complementary lessons](https://x.com/trq212/status/2027463795355095314) in "Seeing Like an Agent." Together these 16 principles represent the most comprehensive framework for making AI coding agents reliable at scale.

However, **no existing tool comprehensively scores and guides these principles**. Analysis of the 47+ projects across all categories in [awesome-agent-harness](https://github.com/anthropics/awesome-agent-harness) reveals:

- **Orchestrators** (Vibe Kanban, Emdash, Composio) — execute agents in parallel worktrees but don't enforce harness principles
- **Task runners** (Symphony, Baton) — automate issue→PR pipeline but depend on external trackers
- **Frameworks** (Harness Kit, DeerFlow) — provide patterns and some runtime enforcement (Harness Kit has 19 tenets with DAG orchestration) but don't score against a unified principle set
- **Issue managers** (Backlog.md) — repo-native markdown issues with web UI and decisions support, but no harness principle scoring

The gap: **no tool combines repo-native issue management with unified harness principle scoring and remediation guidance**.

### The 16 Principles

**Kozyrkov's 12 Rules (derived from [OpenAI's Harness Engineering blog](https://openai.com/index/harness-engineering/)):**

Note: The OpenAI blog describes these concepts narratively; Cassie Kozyrkov organized them into 12 discrete rules.

1. **Humans Steer, Agents Execute** — Engineers design environments, agents implement
2. **No Manually-Written Code** — Improve agent tools/context instead of hand-fixing
3. **Repository Knowledge as System of Record** — All context lives in the repo as markdown
4. **AGENTS.md as Table of Contents** — Small entry point (map) pointing to deeper context
5. **Application Legibility** — Agent can "see" the app (screenshots, DevTools, etc.)
6. **Ephemeral Observability Stacks** — Per-branch/worktree observability
7. **Rigid Architectural Boundaries** — Strict, predictable layered architecture
8. **Mechanical Enforcement of Taste** — Linters with agent-friendly error messages
9. **High-Throughput Merge Philosophy** — Corrections cheap, waiting expensive
10. **Plans as First-Class Artifacts** — Execution plans checked into repo
11. **Continuous Garbage Collection** — Background agents clean technical debt
12. **The Ralph Wiggum Loop** — Agent self-review + agent peer review before human

**From Anthropic — [Seeing Like an Agent](https://x.com/trq212/status/2027463795355095314) (Claude Code team, 4 lessons):**

13. **Fewer Tools, More Expressiveness** — Composable primitives beat sprawling toolkits
14. **Progressive Disclosure** — Agents recursively discover context across layers rather than loading everything upfront
15. **See Like an Agent** — Observe where agents struggle, improve the harness
16. **Harness Evolves with the Model** — Remove tools that become obstacles as model capabilities grow

Note: "Simple composable patterns > complex frameworks" from [Building Effective Agents](https://www.anthropic.com/research/building-effective-agents) is a guiding philosophy that informs the overall approach rather than a discrete principle to check.

### References

**Principle sources:**

- [Harness Engineering (OpenAI blog)](https://openai.com/index/harness-engineering/) — Seminal blog; concepts organized into 12 rules by Kozyrkov
- [12 Rules of Harness Engineering (Cassie Kozyrkov)](https://www.youtube.com/watch?v=BabEnt6VjtE) — 12 discrete rules derived from OpenAI blog
- [Seeing Like an Agent (Thariq, Claude Code team)](https://x.com/trq212/status/2027463795355095314) — 4 complementary lessons from Claude Code development
- [Building Effective Agents (Anthropic Research)](https://www.anthropic.com/research/building-effective-agents) — Guiding philosophy: simple composable patterns

**Ecosystem references:**

- [awesome-agent-harness (landscape)](https://github.com/anthropics/awesome-agent-harness) — 47+ projects across 10 categories
- [agent-harness (governance templates)](https://github.com/MattMagg/agent-harness) — 7 principles, checklists, invariants
- [Backlog.md (markdown-native task manager)](https://github.com/MrLesk/Backlog.md) — Full-featured repo-native issue management with web UI

## Product Definition

### One-liner

A Claude Code plugin that enforces and guides the 16 harness engineering principles through repo structure checks, markdown-native issue management, and a local web dashboard.

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

AGENTS.md                          # Agent entry point — table of contents (Principles 4, 14)
```

### 2. `/harness check` — Compliance Scoring

Scans the repo and scores compliance against all 16 principles:

```
$ /harness check

[Principle 3] Repository as System of Record
  ✓ issues/ directory exists with 3 issues
  ✓ docs/decisions/ has 2 decision records
  ✗ No docs/plans/ found

[Principle 4] AGENTS.md as Table of Contents
  ✓ AGENTS.md exists
  ✗ AGENTS.md is 450 lines — should be a map, not an encyclopedia

[Principle 7] Rigid Architectural Boundaries
  ✗ No .harness/architecture.yaml found

Score: 8/16 principles passing
```

Each check produces:
- Status: pass / warn / fail
- Specific finding (what's wrong)
- Remediation guide (how to fix)

### 3. `/harness issue` — Markdown-Native Issue Management

Lightweight, harness-aware issue management (simpler than Backlog.md, focused on principle compliance):

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

Generates a self-contained HTML dashboard with:

**Tab 1 — Issue Kanban**
- Columns: To Do / In Progress / In Review / Done
- Cards show assignee (human/agent), priority
- Card click → issue detail + agent execution log

**Tab 2 — Compliance Scoreboard**
- 16 principles with pass/warn/fail status
- Total score (e.g., 11/16)
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

| Event | Action | Principle | Phase |
|-------|--------|-----------|-------|
| SessionStart | Show open issues summary + compliance warnings | 3, 4, 14 | MVP |
| PreToolUse(Write) | Check architectural boundary violations | 7 | Phase 2 |
| PostToolUse(Bash) | Check linter error messages are agent-friendly | 8 | Phase 3 |

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
    board-generator/                 # Static HTML dashboard generator
```

## MVP Scope (Phase 1)

| Feature | Principles | Rationale |
|---------|-----------|-----------|
| `/harness init` | 3, 4, 10, 14 | Prerequisite for everything else |
| `/harness check` | All 16 | Core value — makes enforcement real |
| `/harness issue` | 3 | Most tangible "repo = SoR" feature |
| `/harness board` (Tab 1, 2) | 3 | Humans need visibility |
| SessionStart hook | 3, 4, 14 | Agent gets context automatically |

## Phase 2

| Feature | Principles |
|---------|-----------|
| `/harness decide` | 3 |
| `/harness plan` | 10 |
| `/harness run` | 1, 12 |
| PreToolUse hook — architecture check | 7 |
| Dashboard Tab 3 (Knowledge Map) | 3, 4, 14 |

## Phase 3 (Future)

| Feature | Principles |
|---------|-----------|
| Linter error message format enforcement | 8 |
| Garbage collection agent | 11 |
| Ralph Wiggum self-review loop | 12 |
| Ephemeral observability guide | 6 |
| Dashboard Tab 4 (Agent Activity) | 1 |
| Harness evolution tracking | 16 |
| MCP server (multi-agent support) | 13 |
| Extract to independent CLI tool (C → B) | — |

## Competitive Positioning

| | Vibe Kanban | Backlog.md | Symphony | Chorus | Harness Kit | **harness-engineer** |
|---|---|---|---|---|---|---|
| Issue management | DB-based | Repo markdown | External (Linear) | Own backend | DAG tasks | **Repo markdown** |
| Agent dispatch | O | X | O | O | O (Odin CLI) | **Phase 2** |
| Dashboard | O | O (Web + TUI) | O (optional) | O | O (TaskIt) | **O** |
| Principle enforcement | X | X | X | X | O (19 tenets) | **Core (16 principles)** |
| Repo = SoR | X | O | X | X | Partial | **O** |
| Knowledge accumulation | X | Decisions (ADR) | X | Partial | O (breadcrumbs) | **O** |

**Differentiator**: No existing tool combines repo-native markdown issue management with unified scoring against the 16 harness engineering principles and actionable remediation guidance. Harness Kit enforces its own 19 tenets through DAG orchestration; harness-engineer scores against the canonical OpenAI + Anthropic principles as a Claude Code plugin with zero infrastructure dependencies.

## Design Decisions

1. **Plugin name** — `harness-engineer`. Describes what it does (engineer the harness).
2. **Dashboard tech** — Static HTML generation. No runtime dependency (no Node/Python/Bun server required). The skill generates an HTML file with embedded data and opens it in the browser. Regenerated on each `/harness board` invocation. For Phase 2+, may upgrade to a lightweight local server if real-time updates prove necessary.
3. **Issue ID format** — Auto-increment with prefix: `ISSUE-001`, `ISSUE-002`. Simple, readable, sortable. The prefix distinguishes from decision (`DEC-`) and plan (`PLAN-`) IDs.
4. **Config format** — YAML (`.harness/config.yaml`). Consistent with the rest of the ecosystem (AGENTS.md, architecture files). Human-readable. Agent-readable.
5. **Backlog.md differentiation** — Backlog.md is a mature, full-featured task manager (web UI, TUI kanban, decisions/ADR, subtasks, dependencies, Definition of Done). We don't replicate its breadth. Instead, we design a lighter format optimized for harness engineering: agent execution logs, principle tags, compliance integration. The key differentiator is that harness-engineer scores issues against the 16 principles — Backlog.md manages tasks without harness awareness.
6. **Issues directory location** — `issues/` at repo root (not `.harness/issues/`). Maximizes agent discoverability and follows the "repo knowledge is the system of record" principle — issues are first-class repo content, not hidden config.

## Architecture Definition Format

`.harness/architecture.yaml` defines layer boundaries for Principle 7 checks:

```yaml
layers:
  - name: types
    paths: ["src/types/**"]
    allowed_imports: []                    # types import nothing
  - name: repo
    paths: ["src/repo/**"]
    allowed_imports: ["types"]             # repo imports types only
  - name: service
    paths: ["src/service/**"]
    allowed_imports: ["types", "repo"]     # service imports types + repo
  - name: ui
    paths: ["src/ui/**", "src/components/**"]
    allowed_imports: ["types", "service"]  # ui imports types + service, never repo
```

The check validates that files in each layer only import from allowed layers. Violation messages include the principle number and remediation:

```
[Principle 7] Architectural boundary violation:
  src/ui/Login.tsx imports from src/repo/userRepo.ts
  UI layer cannot import from Repo layer directly.
  Fix: Use a Service layer function instead.
```

## Compliance Check Criteria (All 16 Principles)

Each principle has concrete, scannable criteria for pass/warn/fail:

| # | Principle | Pass | Warn | Fail |
|---|-----------|------|------|------|
| 1 | Humans Steer | `issues/` has issues with `assignee: agent` | — | No issues directory |
| 2 | No Manual Code | Advisory only (Phase 3) | — | — |
| 3 | Repo = SoR | `issues/` + `docs/decisions/` + `docs/plans/` all exist with content | Some directories empty | Missing directories |
| 4 | AGENTS.md as ToC | `AGENTS.md` exists and < 200 lines | `AGENTS.md` exists but > 200 lines | No `AGENTS.md` |
| 5 | App Legibility | Advisory only (Phase 3) | — | — |
| 6 | Ephemeral Observability | Advisory only (Phase 3) | — | — |
| 7 | Rigid Boundaries | `.harness/architecture.yaml` exists and no violations found | Config exists but violations detected | No architecture config |
| 8 | Mechanical Enforcement | Linter config detected in repo (`.eslintrc`, `ruff.toml`, etc.) | Linter exists but no agent-friendly error messages | No linter config |
| 9 | High-Throughput Merge | Advisory only (Phase 3) | — | — |
| 10 | Plans as Artifacts | `docs/plans/` has plan files | Directory exists but empty | No plans directory |
| 11 | Garbage Collection | Advisory only (Phase 3) | — | — |
| 12 | Ralph Wiggum Loop | Advisory only (Phase 3) | — | — |
| 13 | Fewer Tools | Advisory only (Phase 3) | — | — |
| 14 | Progressive Disclosure | Context layered across files (skill files, docs/) rather than monolithic | — | All context in single file |
| 15 | See Like an Agent | Advisory only (Phase 3) | — | — |
| 16 | Harness Evolves | Advisory only (Phase 3) | — | — |

**MVP scoring:** Principles with concrete checks (1, 3, 4, 7, 8, 10, 14) produce pass/warn/fail. Advisory-only principles display guidance text with a "not yet enforced" label. Score is `N/M` where M = number of actively checked principles.

## Dashboard Serving Mechanism

The dashboard is a **generated static HTML file**, not a running server:

1. `/harness board` skill runs a script that:
   - Reads `issues/`, `docs/decisions/`, `docs/plans/`, `.harness/config.yaml`
   - Runs compliance checks
   - Generates a single self-contained HTML file (CSS + JS + data embedded)
   - Writes to `.harness/board.html`
   - Opens in default browser via `open` (macOS) / `xdg-open` (Linux)
2. No background process needed. No port conflicts.
3. To refresh: re-run `/harness board`.
4. **Static HTML limitations**: No drag-and-drop kanban (requires JS event handling + file writes). Cards are read-only views with links to issue files. Interactive features (status changes, reordering) use `/harness issue` commands instead.
5. Phase 2+ may add a watch mode with a lightweight local server if interactive dashboard features prove necessary.

## Scope Clarification

**Phase 2 and Phase 3 are explicitly out of scope for implementation planning.** The plan should cover Phase 1 (MVP) only. Phase 2/3 items are listed for directional context but should not influence MVP architecture decisions beyond keeping the design extensible.

## PostToolUse(Bash) Hook Scope

The PostToolUse(Bash) hook for linter error message checking is **Phase 3** (moved from the hooks table to align with Principle 8's Phase 3 timeline).
