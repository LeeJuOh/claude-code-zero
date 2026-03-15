# Plugin Profile Criteria

Objective, fact-based criteria for profiling plugins. No numeric scores — capture observable facts.

## Component Inventory

Count components by type from the plugin's file structure:

| Type | Detection |
|------|-----------|
| Active Skills | SKILL.md with `allowed-tools`, `context: fork`, `agent`, `hooks`, or auxiliary files |
| Reference Skills | SKILL.md with none of the above — pure knowledge documents |
| Agents | `.md` files in `agents/` |
| Commands | `.md` files in `commands/` |
| Hooks | Entries in `hooks/hooks.json` or `hooks/*.json` |
| MCP Servers | Entries in `.mcp.json` |
| LSP Servers | Entries in `.lsp.json` |

## Documentation Checklist

Check existence of each item:

| Item | Detection |
|------|-----------|
| README.md | File exists and has content |
| LICENSE | `LICENSE*` file exists |
| CHANGELOG.md | File exists |
| tests/ | Directory exists with test infrastructure |
| Usage examples | Code blocks in README.md or SKILL.md |

Mark each as present (checkmark) or absent (cross).

## Security Risk Level

From security-auditor output — not scored numerically:

| Level | Condition |
|-------|-----------|
| CRITICAL | Any CRITICAL finding |
| HIGH | Any HIGH finding (no CRITICAL) |
| MEDIUM | Any MEDIUM finding (no HIGH/CRITICAL) |
| LOW | Only LOW findings |

Include finding counts: `{n} Critical, {n} High, {n} Medium, {n} Low`

## Primary Pattern

Detect the plugin's architectural pattern:

| Pattern | Detection Heuristics |
|---------|---------------------|
| Orchestrator-Agent | A skill with `context: fork` + `agent` field, or multiple agents with clear delegation from a coordinator skill |
| Standalone | Single skill or few skills with no agent delegation |
| Library | Mostly reference skills providing knowledge/guidelines, few or no active skills |
| Hybrid | Mix of orchestrator and standalone patterns |

## Target Users

1-2 sentence description derived from plugin analysis:
- What type of developer benefits from this plugin?
- What workflows or domains does it target?

## Quality Checklist

PASS/FAIL items — objective checks only:

| Check | Pass Criteria |
|-------|---------------|
| Plugin name is kebab-case | Matches `^[a-z0-9]+(-[a-z0-9]+)*$` |
| Component names are kebab-case | All skill/agent/command names match kebab-case |
| Frontmatter complete | All skills have `name` + `description`; all agents have `name` + `description` |
| English content in public-facing files | SKILL.md, agent.md, README.md are in English |
| Homepage or repository URL | Present in plugin.json |
| Skill auxiliary files organized | Templates, refs in subdirectories |
| Error handling documented | Error scenarios addressed in descriptions or code |

## Environment Fit

Comprehensive assessment of whether a plugin should be installed in the user's current environment. Builds on dependency checking with functional overlap analysis, trigger collision detection, and context impact evaluation.

### Overall Verdict

| Verdict | Badge | Condition |
|---------|-------|-----------|
| RECOMMENDED | `risk-badge--low` | Dependencies met, no significant overlap, no trigger collisions, acceptable context impact |
| CONDITIONAL | `risk-badge--medium` | Useful but has caveats: minor overlap with existing skills, missing optional dependencies, or moderate context impact. Include specific recommendations |
| REDUNDANT | `risk-badge--high` | Core functionality already covered by installed plugins. At least one DUPLICATE overlap found, or multiple OVERLAP findings covering the plugin's main purpose |
| CONFLICTING | `risk-badge--critical` | Would cause problems: HIGH trigger collisions with existing skills, required dependencies missing, or context budget would be exceeded |

### Verdict Priority (highest severity wins)

1. Required dependency MISSING/UNSET → at least CONDITIONAL
2. Required dependency MISSING + DUPLICATE overlap → CONFLICTING
3. DUPLICATE skill with HIGH trigger collision → at least REDUNDANT
4. Multiple OVERLAP findings covering > 50% of plugin's skills → at least REDUNDANT
5. Skill description budget exceeded in 200K scenario → at least CONDITIONAL; exceeded in both 200K and 1M → CONFLICTING
6. MCP tool surface would exceed 10% cap in 200K scenario → at least CONDITIONAL; exceeded in both → CONFLICTING
7. Cross-plugin component dependency MISSING → at least CONDITIONAL
8. Projected hooks > 15 or hook context injection HIGH → at least CONDITIONAL
9. All clear → RECOMMENDED

### Dependency Check

Cross-reference external requirements against the user's environment:

| Requirement Type | Check Method |
|-----------------|-------------|
| CLI tools | `which {tool}` |
| MCP servers | `grep` in `~/.claude/.mcp.json` |
| Environment variables | `test -n` |
| Plugin dependencies | `ls ~/.claude/plugins/cache/` |

All checks run in a single bash block. Each requirement has a required/optional classification and actionable help text from feature-architect.

Dependency verdict:

| Level | Condition |
|-------|-----------|
| READY | All requirements (required + optional) available |
| PARTIAL | All required available, some optional missing |
| ACTION_NEEDED | Any required dependency missing |

### Context Budget

Evaluate the plugin's impact on the Claude Code context window. Because the context window varies by model (200K default vs 1M extended), present both scenarios.

#### Skill Description Budget

Claude loads all skill descriptions (from skills without `disable-model-invocation: true`) at session start. Official budget: 2% of context window, with 16,000 character fallback. Overridable via `SLASH_COMMAND_TOOL_CHAR_BUDGET` env var.

| Window | Budget | Threshold (HIGH) | Threshold (MEDIUM) |
|--------|--------|-------------------|---------------------|
| 200K | 16,000 chars (fallback) | Projected > 14,000 chars (87%) | Projected > 10,000 chars (62%) |
| 1M | ~80,000 chars (est. 2% × 1M tokens × ~4 chars/token) | Projected > 70,000 chars (87%) | Projected > 50,000 chars (62%) |

Skills with `disable-model-invocation: true` have zero always-on cost — exclude from calculation.

> **Note**: The 1M budget is an estimated conversion (tokens → chars). If `SLASH_COMMAND_TOOL_CHAR_BUDGET` is set, use that value instead.

#### MCP Tool Surface

MCP tool definitions load at session start, capped at 10% of context. Excess tools are deferred until needed.

| Window | Budget | Threshold (HIGH) | Threshold (MEDIUM) |
|--------|--------|-------------------|---------------------|
| 200K | ~20,000 tokens | Projected > 18,000 tokens | Projected > 12,000 tokens |
| 1M | ~100,000 tokens | Projected > 90,000 tokens | Projected > 60,000 tokens |

Estimation heuristic (not from official docs): ~200 tokens per tool definition, ~25 tools per MCP server. Actual values vary by server — treat as rough approximation.

#### Hook Context Injection

Hooks with `type: command` that return `additionalContext` in their JSON output inject data into the main context. Hooks with `type: prompt` or `type: agent` trigger separate LLM calls (API cost, not context pollution, but worth noting).

| Pattern | Impact |
|---------|--------|
| Hook returns `additionalContext` | Direct context injection — flag |
| Hook `type: prompt` or `type: agent` | Separate LLM call — note API cost |
| Hook `type: command` with no context return | Zero context impact |

### Functional Overlap Classification

| Classification | Meaning | Impact on Verdict |
|----------------|---------|-------------------|
| DUPLICATE | Same purpose AND same triggers as existing skill | → REDUNDANT or CONFLICTING |
| OVERLAP | Similar purpose, partially overlapping triggers | → CONDITIONAL if minor; REDUNDANT if covers main purpose |
| COMPLEMENT | Related domain, different purpose | → no negative impact (note as informational) |
| UPGRADE | Same purpose but analyzed plugin does it better | → RECOMMENDED (with note to consider replacing existing) |

### Trigger Collision Severity

| Severity | Description | Impact |
|----------|-------------|--------|
| HIGH | Near-identical descriptions — Claude cannot reliably distinguish | → CONFLICTING |
| MEDIUM | Shared keywords but distinguishable context/scope | → CONDITIONAL |
| LOW | Thematically related but clearly different triggers | → informational only |

### Hook Impact

| Metric | Threshold | Severity |
|--------|-----------|----------|
| Projected total hooks | > 15 | HIGH |
| Projected total hooks | 10-15 | MEDIUM |
| Same-event collisions | Any | Note (not inherently bad) |
| Hooks with prompt/agent type | > 3 | MEDIUM (API cost) |
| Hooks returning additionalContext | Any | Note (context injection) |

### Component Dependencies

Analyze cross-plugin references where the analyzed plugin's components depend on external skills, agents, or MCP servers.

#### Detection Patterns

| Source | Pattern | Dependency Type |
|--------|---------|-----------------|
| Skill `allowed-tools` | `Skill(plugin:name)` or `Skill(name *)` | Skill → Skill |
| Skill body | "invoke `/plugin:skill`" or "call /plugin:skill" | Skill → Skill (instructional) |
| Skill `context: fork` + `agent` | Agent name not in this plugin's `agents/` | Skill → External Agent |
| Agent `skills` field | Skill name not in this plugin's `skills/` | Agent → External Skill |
| Agent `mcpServers` (string ref) | Server name not inline-defined | Agent → External MCP |
| Skill `allowed-tools` | `mcp__servername__*` | Skill → MCP |
| Skill body | `` !`command` `` dynamic injection | Skill → CLI tool |

#### Status

| Status | Meaning |
|--------|---------|
| AVAILABLE | Referenced component exists in user's environment |
| MISSING | Referenced component not found — functionality will break |
| INTERNAL | Reference is within the same plugin — no external dependency |
