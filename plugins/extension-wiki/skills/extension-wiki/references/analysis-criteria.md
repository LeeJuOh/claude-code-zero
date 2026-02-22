# Analysis Criteria

7 evaluation categories with weights for scoring plugins.

## Categories

### 1. Identity & Overview (5%)

| Check | Score |
|-------|-------|
| `plugin.json` exists with name, version, description | +2 |
| Author, license, keywords present | +1 |
| Semantic versioning followed | +1 |
| Homepage or repository URL present | +1 |

### 2. Functionality (20%)

| Check | Score |
|-------|-------|
| Each component has clear purpose in description | +1 per component |
| Trigger phrases documented in skill descriptions | +1 per skill |
| Input/output patterns defined (argument-hint, etc.) | +1 per component |
| Anti-patterns documented ("Do NOT use for") | +1 |
| Components cover a coherent use case | +1 |

Normalize to 5-point scale: `min(5, total / component_count * 2.5)`

### 3. Usage Guide (10%)

| Check | Score |
|-------|-------|
| README.md exists | +2 |
| Installation instructions present | +1 |
| Usage examples with code blocks | +1 |
| LICENSE file exists | +1 |

### 4. Dependencies & Constraints (10%)

| Check | Score |
|-------|-------|
| Tool dependencies clearly declared in frontmatter | +2 |
| External dependencies documented (MCP, CLI tools) | +1 |
| Environment variables documented | +1 |
| Model requirements specified where needed | +1 |

### 5. Security & Permissions (30%)

Scoring is inverse — start at 5, deductions apply:

| Finding | Deduction |
|---------|-----------|
| `bypassPermissions` on skill | -3 (CRITICAL) |
| `Bash(*)` unlimited on skill | -3 (CRITICAL) |
| Hardcoded secrets/tokens found | -3 (CRITICAL) |
| `bypassPermissions` on agent | -2 (HIGH) |
| Destructive Bash patterns (rm, drop, etc.) | -2 (HIGH) |
| Hook scripts with network access (curl, wget) | -2 (HIGH) |
| Agent hook with broad tool access | -2 (HIGH) |
| Dynamic context injection (`!`cmd``) with unsafe commands | -2 (HIGH) |
| LSP server running untrusted binary | -2 (HIGH) |
| Broad Bash patterns | -1 (MEDIUM) |
| `Write` tool allowed | -1 (MEDIUM) |
| Hook scripts reading env vars | -1 (MEDIUM) |
| Prompt hook with data exfiltration potential | -1 (MEDIUM) |
| Agent memory storing sensitive data | -1 (MEDIUM) |
| Inline hooks in skill/agent frontmatter | -1 (MEDIUM) |

Minimum score: 0

### 6. Architecture (10%)

| Check | Score |
|-------|-------|
| Clear component separation (skill vs agent responsibilities) | +2 |
| Data flow documented or evident | +1 |
| State management defined (storage location, schema) | +1 |
| No circular dependencies between components | +1 |

### 7. Quality (15%)

| Check | Score |
|-------|-------|
| kebab-case naming for plugin and components | +1 |
| Frontmatter complete (name, description at minimum) | +1 |
| English content in all public-facing files | +1 |
| tests/ directory exists with test infrastructure | +1 |
| CHANGELOG.md exists with version history | +1 |

## Overall Score Calculation

```
overall = (identity * 0.05) + (functionality * 0.20) + (usage * 0.10)
        + (dependencies * 0.10) + (security * 0.30) + (architecture * 0.10)
        + (quality * 0.15)
```

## Grade Scale

| Score | Grade |
|-------|-------|
| 4.5 - 5.0 | A |
| 3.5 - 4.4 | B |
| 2.5 - 3.4 | C |
| 1.5 - 2.4 | D |
| 0.0 - 1.4 | F |

## Visual Bar

Use 30-char wide block characters to represent the score:

```
██████████████████████████████ 5.0/5  A
████████████████████████░░░░░░ 4.0/5  B
██████████████████░░░░░░░░░░░░ 3.0/5  C
████████████░░░░░░░░░░░░░░░░░░ 2.0/5  D
██████░░░░░░░░░░░░░░░░░░░░░░░░ 1.0/5  F
```
