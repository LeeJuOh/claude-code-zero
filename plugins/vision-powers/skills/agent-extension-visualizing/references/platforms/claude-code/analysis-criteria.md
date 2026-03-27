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
| Rules | `.md` files in `rules/` or root-level `RULE.md` |
| Hooks | Entries in `hooks/hooks.json` or `hooks/*.json` |
| MCP Servers | Entries in `.mcp.json` |
| LSP Servers | Entries in `.lsp.json` |
| Config | `settings.json` at plugin root (only `agent` field supported) |

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

## Skill Category Distribution

Classify each active skill into one of the 9 functional categories. This reveals the plugin's purpose and capability spread.

| Category | Icon | Purpose |
|----------|------|---------|
| Library & API Reference | `scope-badge--info` | Knowledge about how to use libraries, CLIs, SDKs |
| Product Verification | `scope-badge--success` | Testing and verifying code output |
| Data Fetching & Analysis | `scope-badge--info` | Connecting to data and monitoring stacks |
| Business Process & Team Automation | `scope-badge--warning` | Automating repetitive team workflows |
| Code Scaffolding & Templates | `scope-badge--info` | Generating framework boilerplate |
| Code Quality & Review | `scope-badge--success` | Enforcing code quality standards |
| CI/CD & Deployment | `scope-badge--warning` | Fetching, pushing, and deploying code |
| Runbooks | `scope-badge--danger` | Multi-tool investigation from symptoms to reports |
| Infrastructure Operations | `scope-badge--danger` | Routine maintenance and operational procedures |

Use the distribution to characterize the plugin: a plugin with mostly "Library & API Reference" skills is a knowledge-focused library; one with "CI/CD" + "Runbooks" is an operations toolkit.

## Skill Design Quality

Evaluate design maturity based on established best practices from the Claude Code ecosystem.

### Evaluation Criteria

| Criterion | What it measures | Detection |
|-----------|-----------------|-----------|
| Description as Trigger | Does the `description` field explain when to trigger, not just what the skill does? | Look for "Use when...", trigger scenarios, context keywords. Bad: just "Generates X reports" |
| Progressive Disclosure | Does the skill keep SKILL.md focused and use supporting files for detail? | SKILL.md under ~500 lines; `references/`, `scripts/`, `assets/` directories used; pointers from SKILL.md to reference files |
| Gotchas Section | Does the skill document common failure points? | Presence of "Gotchas", "Common issues", "Troubleshooting", or equivalent section |
| Script Bundling | Does the skill include reusable scripts? | `scripts/` directory with executable files; skill instructions reference bundled scripts instead of having the model write them from scratch |
| On-demand Hooks | Does the skill register session-scoped hooks? | `hooks` field in SKILL.md frontmatter |
| Data Persistence | If the skill stores data, does it use stable storage? | Uses `${CLAUDE_PLUGIN_DATA}` rather than `${CLAUDE_PLUGIN_ROOT}` or skill directory |
| Anti-railroading | Do instructions explain the why, giving Claude flexibility to adapt? | Instructions explain reasoning; avoid excessive all-caps MUSTs or rigid step sequences; theory-of-mind approach |

### Maturity Levels

| Level | Badge | Criteria |
|-------|-------|----------|
| Mature | `check-badge--pass` | 5+ criteria pass (or N/A); has progressive disclosure + gotchas |
| Developing | `scope-badge--medium` | 3-4 criteria pass; functional but missing gotchas or reference files |
| Basic | `scope-badge--low` | 1-2 criteria pass; works but follows few best practices |

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
5. Skill description budget exceeded in the user's context scenario → at least CONDITIONAL; exceeded in both 200K and 1M → CONFLICTING
6. MCP tool surface would exceed 10% cap in the user's context scenario → at least CONDITIONAL; exceeded in both → CONFLICTING
7. Cross-plugin component dependency MISSING → at least CONDITIONAL
8. Projected hooks > 15 or hook context injection HIGH → at least CONDITIONAL
9. Scope conflicts: plugin hooks/MCP collide with project-level configs on same event/name → at least CONDITIONAL
10. All clear → RECOMMENDED

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

Evaluate the plugin's impact on the Claude Code context window using the **always-loaded vs deferred** model. This mirrors how Claude Code actually injects context — some items consume tokens at session start, others are loaded on-demand.

> **Important**: When scanning `~/.claude/plugins/cache/`, multiple versions of the same plugin may be cached. Claude Code loads only the active version, so deduplicate by plugin name (keeping the latest by file mtime) to avoid inflated counts.

> **Research context**: Empirical estimates suggest ~20% structural waste in production context windows from unused tools, duplicates, and stale results. Context budget awareness directly impacts model performance — the "Lost in the Middle" effect shows that fuller context correlates with lower accuracy on retrieval tasks.

#### Always-Loaded vs Deferred

| Category | Loading | Examples |
|----------|---------|----------|
| **Always-loaded** | Injected at session start, consumes tokens immediately | Skill/command descriptions, Rules (without `paths:`), CLAUDE.md + @imports, agent/command definitions |
| **Deferred** | Reserved but loaded on-demand | MCP tool schemas (~90% of MCP tokens), memory files, Rules with `paths:`, skills with `disable-model-invocation` |

#### Skill Description Budget (Always-Loaded)

Claude loads all skill and command descriptions (from those without `disable-model-invocation: true`) at session start. Official budget (source: [Skills docs](https://code.claude.com/docs/en/skills#troubleshooting)): **2% of context window, with 16,000 character fallback** when context window size cannot be determined. Overridable via `SLASH_COMMAND_TOOL_CHAR_BUDGET` env var.

| Window | Budget | Derivation | Threshold (HIGH) | Threshold (MEDIUM) |
|--------|--------|------------|-------------------|---------------------|
| 200K | ~16,000 chars | 2% × 200K tokens × ~4 chars/token (coincides with fallback) | Projected > 14,000 chars (87%) | Projected > 10,000 chars (62%) |
| 1M | ~80,000 chars | 2% × 1M tokens × ~4 chars/token | Projected > 70,000 chars (87%) | Projected > 50,000 chars (62%) |

Skills and commands with `disable-model-invocation: true` have zero always-on cost — exclude from calculation.

> **Note**: Both skills (`skills/*/SKILL.md`) and commands (`commands/*.md`) consume context budget. The env-fit-scan.js script counts both. If `SLASH_COMMAND_TOOL_CHAR_BUDGET` is set, use that value instead of the calculated budget.

#### Rules Context Cost (Always-Loaded / Deferred)

Rules without `paths:` frontmatter load their full content at session start (always-loaded). Rules with `paths:` only load when matching file paths are in context (deferred — zero always-on cost). Estimate: `file_size_bytes / 4` tokens per rule.

#### CLAUDE.md @import Chain (Always-Loaded)

If the plugin includes a CLAUDE.md, trace `@import` directives (up to 5 hops). Each imported file is always-loaded. Report total files in chain and estimated token cost (`total_bytes / 4`).

#### MCP Tool Surface (Deferred)

MCP tool definitions load at session start, capped at 10% of context. Excess tools are deferred until needed.

| Window | Budget | Threshold (HIGH) | Threshold (MEDIUM) |
|--------|--------|-------------------|---------------------|
| 200K | ~20,000 tokens | Projected > 18,000 tokens | Projected > 12,000 tokens |
| 1M | ~100,000 tokens | Projected > 90,000 tokens | Projected > 60,000 tokens |

Estimation heuristic (not from official docs): ~200 tokens per tool definition, ~25 tools per MCP server. Actual values vary by server — treat as rough approximation.

#### Hook Context Injection (Per-Event)

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

### Scope Impact

Assess how the plugin distributes effects across Claude Code's three scope levels.

| Scope | Location | Implication |
|-------|----------|-------------|
| Global | `~/.claude/` | Plugin applies to ALL projects. Hooks fire everywhere. |
| Workspace | `{repo}/.claude/` (parent) | Inherited by child projects in the repo. |
| Project | `{repo}/.claude/` (leaf) or `~/.claude/projects/` | Most specific, highest priority. |

Check for:
- **Scope appropriateness**: Is a globally-installed plugin truly useful across all projects? Framework-specific plugins (React, Django) may be better suited for project-level activation.
- **Scope conflicts**: Plugin hooks/MCP/skills that collide with project-level configurations.
- **Inheritance implications**: Whether plugin effects propagate to child projects unintentionally.

### Bundle Source

Identify the plugin's installation provenance for transparency.

| Source | Detection | Badge |
|--------|-----------|-------|
| Marketplace | `skills-lock.json` entry with marketplace identifier, or cache path pattern | `scope-badge--info` |
| Local | Symlinked cache entry, or source in current working directory | `scope-badge--success` |
| GitHub | `repository` field in plugin.json pointing to github.com | `scope-badge--warning` |
| Unknown | No definitive signal | `scope-badge--low` |
