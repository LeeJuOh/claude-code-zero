# Environment Fit Diagnosis — Detailed Steps

This reference contains the detailed procedure for Phase 4.5 of the agent-extension-visualizing workflow. The orchestrator SKILL.md references this file for the full step-by-step process.

## Step 1: Extract Plugin Characteristics

Extract these from the feature-architect output:

- Plugin name and at-a-glance description (from Plugin Summary)
- Skill names and trigger descriptions (from Functionality Analysis → Skills table)
- Skill description character counts (sum of all description text)
- Skills with `disable-model-invocation: true` (zero always-on context cost)
- Hook events, count, and **types** (command / prompt / agent) (from Hooks table; 0 if no hooks)
- Hooks that return `additionalContext` (if identifiable from hook scripts)
- External requirements (`requirements` code block; empty if none)
- MCP server count (from `.mcp.json` if present)
- Component interaction patterns:
  - Skills with `allowed-tools` containing `Skill(...)` → Skill→Skill dependency
  - Skills with `context: fork` + `agent` referencing non-plugin agents → Skill→External Agent
  - Agent `skills:` field entries not in this plugin → Agent→External Skill
  - Agent `mcpServers:` string references (not inline) → Agent→External MCP
  - Skills with `allowed-tools` containing `mcp__*` patterns → Skill→MCP dependency

## Step 2: Run Environment Scan

```
Bash(node {plugin-root}/scripts/env-fit-scan.js --plugin-name {plugin-name})
```

Where `{plugin-root}` is this plugin's root directory and `{plugin-name}` is from Phase 3. The script outputs JSON with: `install_status`, `installed_plugins`, `installed_skills` (with `total_desc_chars`, `disabled_count`), `local_skills`, `hook_inventory` (with `total`, `type_counts`), and `context_metrics` (with `mcp_servers`).

If the plugin has external requirements (from Step 1), also check them with simple commands:

| Type | Check pattern | Status values |
|------|--------------|---------------|
| CLI | `which {name} >/dev/null 2>&1` | AVAILABLE / MISSING |
| MCP | `grep -q '"{name}"' ~/.claude/.mcp.json 2>/dev/null` | AVAILABLE / MISSING |
| ENV | `[ -n "${name}" ]` | SET / UNSET |

## Step 3: Six Diagnostic Analyses

### 3A: Installation Status

- `INSTALLED` → `ALREADY_INSTALLED`
- `NOT_INSTALLED` → `NEW`

### 3B: Dependency Check

Build requirements table: `[{name, type, required, status, help}]`.
Determine: READY / PARTIAL / ACTION_NEEDED.
If no requirements block existed → READY.

### 3C: Context Budget Analysis

Calculate the plugin's context footprint using dual scenarios.

1. **Skill description chars**: Sum description chars for skills in this plugin that do NOT have `disable-model-invocation: true`. Add to current environment total from `installed_skills.total_desc_chars` + `local_skills.total_desc_chars`.
   - 200K scenario: compare against 16,000 char fallback budget
   - 1M scenario: compare against ~80,000 char budget (2% of 1M)

2. **MCP tool surface**: Count MCP servers this plugin adds (from `.mcp.json`). Estimate tokens using heuristic: servers x 25 tools x 200 tokens/tool.
   - Current MCP token estimate: `context_metrics.mcp_servers x 25 x 200`
   - Adding: `new_servers x 25 x 200`
   - 200K scenario: compare projected total against ~20,000 token cap (10% of 200K)
   - 1M scenario: compare projected total against ~100,000 token cap (10% of 1M)

3. **Hook context injection**: Check if any hooks in this plugin return `additionalContext` or use `type: prompt`/`type: agent`. Note but don't score heavily — these are per-event, not always-on.

4. **Zero-cost skills**: Note how many skills use `disable-model-invocation: true` — these have no always-on context cost and should be highlighted as a positive design choice.

Severity determination: present both 200K and 1M scenarios in the report. For the overall severity, use the scenario matching the **user's current session model** (e.g., Opus 4.6[1M] → 1M scenario, Sonnet/Haiku → 200K scenario). If the model context cannot be determined, default to 200K as fallback.

### 3D: Functional Overlap & Trigger Analysis

Compare the analyzed plugin's skills against all installed/local skill descriptions. For each skill, scan for semantic overlap — considering purpose, trigger phrases, and approach.

Classify each meaningful overlap:

| Classification | Condition | Example |
|----------------|-----------|---------|
| DUPLICATE | Same purpose AND same triggers | Two "commit message generator" skills |
| OVERLAP | Similar purpose, partial trigger overlap | Both handle "code review" but different scope |
| COMPLEMENT | Related domain, different purpose | One analyzes PRs, other generates changelogs |
| UPGRADE | Same purpose but analyzed plugin is superior | More features, better design, broader coverage |

For DUPLICATE/OVERLAP findings, assess trigger collision severity:
- **HIGH**: Near-identical descriptions → Claude unpredictably chooses
- **MEDIUM**: Shared keywords but distinguishable intent/scope
- **LOW**: Thematically related but clearly different triggers

### 3E: Hook Impact

- Current hook count (`hook_inventory.total`) + adding → projected total
- Distinguish hook types from `hook_inventory.type_counts`: command/http (lightweight, zero context) vs prompt/agent (LLM call per event)
- Flag: projected hooks > 15 (HIGH), 10-15 (MEDIUM)
- Same-event collisions with existing plugins (informational)

### 3F: Component Dependency Analysis

For each cross-plugin reference found in Step 1:
1. Check if the referenced component exists in the user's environment (installed plugins, local skills, MCP servers)
2. Classify as AVAILABLE or MISSING
3. Internal references (within the same plugin) → INTERNAL, skip

Types to check:
- Skill → Skill: `allowed-tools: Skill(plugin:name)` or instruction-based invocation
- Agent → Skill: `skills:` field with non-plugin skill names
- Skill/Agent → MCP: `mcp__server__*` in allowed-tools, or `mcpServers:` string references
- Skill → Agent: `context: fork` + `agent` field referencing external agent

MISSING dependencies → at least CONDITIONAL verdict.

## Step 4: Determine Overall Verdict

Use `references/platforms/claude-code/analysis-criteria.md` (Environment Fit section).

Verdict priority (highest severity wins):

1. Required dependency MISSING/UNSET → at least CONDITIONAL
2. Required dependency MISSING + DUPLICATE overlap → CONFLICTING
3. DUPLICATE skill with HIGH trigger collision → at least REDUNDANT
4. Multiple OVERLAP findings covering > 50% of plugin's skills → at least REDUNDANT
5. Skill description budget exceeded in the user's context scenario → at least CONDITIONAL; exceeded in both 200K and 1M → CONFLICTING
6. MCP tool surface would exceed 10% cap in the user's context scenario → at least CONDITIONAL; exceeded in both → CONFLICTING
7. Cross-plugin component dependency MISSING → at least CONDITIONAL
8. Projected hooks > 15 or hook context injection HIGH → at least CONDITIONAL
9. All clear → RECOMMENDED

## Step 5: Build Diagnosis Data

```
environment_fit: {
  verdict: RECOMMENDED | CONDITIONAL | REDUNDANT | CONFLICTING,
  verdict_summary: "1-2 sentence diagnosis in output language",
  installation_status: NEW | ALREADY_INSTALLED,
  context_budget: {
    skill_desc: { current_chars, adding_chars, budget_200k, budget_1m, severity },
    mcp_tools: { current_servers, adding_servers, est_tokens, budget_200k, budget_1m, severity },
    hook_injection: [{ hook_name, type, impact_note }],
    zero_cost_skills: N
  },
  dependency_check: { verdict, requirements[] },
  overlap_findings: [{ analyzed_skill, existing_skill, classification, detail }],
  trigger_collisions: [{ skills, severity, collision_phrases }],
  hook_impact: { current, adding, projected, types: {command, prompt, agent}, event_collisions[], severity },
  component_deps: [{ source, target, dep_type, status }],
  recommendations: ["actionable 1-line recommendation"]
}
```

Omit empty categories. Save for Phase 5/5R.
