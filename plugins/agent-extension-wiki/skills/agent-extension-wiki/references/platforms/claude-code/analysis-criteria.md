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
