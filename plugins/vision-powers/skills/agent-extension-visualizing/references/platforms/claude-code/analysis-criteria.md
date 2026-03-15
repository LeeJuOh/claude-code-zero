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

1. Any required dependency MISSING/UNSET → at least CONDITIONAL
2. Required dependency MISSING + DUPLICATE overlap → CONFLICTING
3. DUPLICATE skill with HIGH trigger collision → at least REDUNDANT
4. Multiple OVERLAP findings covering > 50% of plugin's skills → at least REDUNDANT
5. Projected hooks > 15 or context impact HIGH → at least CONDITIONAL
6. All clear → RECOMMENDED

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

### Hook & Context Impact

| Metric | Threshold | Severity |
|--------|-----------|----------|
| Projected total hooks | > 15 | HIGH |
| Projected total hooks | 10-15 | MEDIUM |
| Same-event collisions | Any | Note (not inherently bad) |
| Context tokens added | > 5,000 (est.) | HIGH |
| Context tokens added | 2,000-5,000 | MEDIUM |
| Total plugin skills in env | > 50 | Note context pressure |
