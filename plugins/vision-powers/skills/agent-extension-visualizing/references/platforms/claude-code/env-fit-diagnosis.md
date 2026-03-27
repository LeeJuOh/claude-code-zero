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
- Rules count and loading type (rules without `paths:` → always-loaded; with `paths:` → on-demand)
- CLAUDE.md presence and @import directives (trace import chain for context cost estimation)
- Plugin source context (source_type from Phase 1 — local, github, installed)
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

Where `{plugin-root}` is this plugin's root directory and `{plugin-name}` is from Phase 3. The script merges `enabledPlugins` across all three settings scopes (user → project → local) with later scopes overriding earlier ones, then filters all scan results to only include plugins enabled for the current project context. It outputs JSON with: `install_status`, `installed_plugins` (enabled only), `installed_skills` (with `total_desc_chars`, `disabled_count`), `installed_commands` (with `total_desc_chars`, `disabled_count`), `local_skills` (includes both skills and commands), `hook_inventory` (with `total`, `type_counts`; plugin hooks filtered by enabled), `context_metrics` (with `mcp_servers` from all 3 settings scopes), and `disabled_plugins` (list of explicitly disabled plugin names from merged settings).

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

Calculate the plugin's context footprint using the **always-loaded vs deferred** model. This distinction mirrors how Claude Code actually injects context — some items consume tokens at session start (always-loaded), while others are loaded on-demand (deferred).

> **Research context**: Academic research (Tony Mason, UBC — arXiv 2603.09023) analyzing 857 production sessions found **21.8% structural waste** in context windows: 11% unused tools, 2.2% duplicates, 8.7% stale results. This makes context budget awareness critical for plugin recommendations.

#### Always-loaded items (consume tokens at session start)

| Resource | Token cost model | Budget |
|----------|-----------------|--------|
| Skill/command descriptions | Sum description chars for items WITHOUT `disable-model-invocation: true`. Formatted as `"skill-name": description` in `<available_skills>` XML | 2% of context window (16K chars fallback) |
| Rules (without `paths:`) | Full file content loaded at session start. Rules WITH `paths:` frontmatter are on-demand | Part of instruction context |
| CLAUDE.md files | Full content with `@import` expansion (up to 5 hops). Includes HTML comment stripping | Part of instruction context |
| Agent/command definitions | Full file content for agents and commands | Part of instruction context |
| MCP server config | Server names and metadata (small) | Minimal |

#### Deferred items (loaded on-demand, reserved but not always present)

| Resource | Token cost model | Budget |
|----------|-----------------|--------|
| MCP tool schemas | ~90% of MCP tokens. Loaded when tools are needed | 10% of context window |
| Individual memory files | Loaded via `readFileState` on demand | N/A |
| Rules with `paths:` | Only loaded when matching file paths are in context | N/A |
| Skills with `disable-model-invocation: true` | Only loaded when user explicitly invokes | Zero always-on cost |

#### Calculation steps

1. **Skill/command description chars (always-loaded)**:
   Sum description chars for skills AND commands in this plugin that do NOT have `disable-model-invocation: true`. Add to current environment total from `installed_skills.total_desc_chars` + `installed_commands.total_desc_chars` + `local_skills.total_desc_chars`.

   **Budget reference** (source: [official Skills docs](https://code.claude.com/docs/en/skills)):
   > "The budget scales dynamically at 2% of the context window, with a fallback of 16,000 characters."
   > Overridable via `SLASH_COMMAND_TOOL_CHAR_BUDGET` environment variable.

   - 200K scenario: ~16,000 chars (2% of 200K tokens × ~4 chars/token ≈ 16K; coincides with the 16K fallback)
   - 1M scenario: ~80,000 chars (2% of 1M tokens × ~4 chars/token ≈ 80K)

2. **Rules context cost (always-loaded)**:
   Count rules in this plugin. Rules WITHOUT `paths:` frontmatter are always-loaded — their full content is injected at session start. Rules WITH `paths:` are on-demand (deferred). Estimate token cost as `file_size_bytes / 4`.

3. **MCP tool surface (deferred, but reserved)**:
   Count MCP servers this plugin adds (from `.mcp.json`). Estimate tokens using heuristic: servers x 25 tools x 200 tokens/tool.
   - Current MCP token estimate: `context_metrics.mcp_servers x 25 x 200`
   - Adding: `new_servers x 25 x 200`
   - 200K scenario: compare projected total against ~20,000 token cap (10% of 200K)
   - 1M scenario: compare projected total against ~100,000 token cap (10% of 1M)

4. **CLAUDE.md @import chain analysis**:
   If the plugin includes a `CLAUDE.md`, trace its `@import` directives (up to 5 hops). Each imported file adds to always-loaded context. Report:
   - Total files in import chain
   - Estimated total token cost of the chain (`total_bytes / 4`)
   - Whether any imports reference files outside the plugin directory (potential security concern)

5. **Hook context injection**: Check if any hooks in this plugin return `additionalContext` or use `type: prompt`/`type: agent`. Note but don't score heavily — these are per-event, not always-on.

6. **Zero-cost skills**: Note how many skills use `disable-model-invocation: true` — these have no always-on context cost and should be highlighted as a positive design choice.

#### Severity determination

Present both 200K and 1M scenarios in the report. For the overall severity, use the scenario matching the **user's current session model** (e.g., Opus 4.6[1M] → 1M scenario, Sonnet/Haiku → 200K scenario). If the model context cannot be determined, default to 200K as fallback.

Context budget severity considers the **cumulative** always-loaded cost (descriptions + rules + CLAUDE.md imports), not just skill descriptions alone.

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

### 3F: Scope Impact Analysis

Analyze how the plugin distributes its configuration across Claude Code's three scope levels and what inheritance implications this creates.

#### Scope hierarchy

| Scope | Location | Inheritance |
|-------|----------|-------------|
| **Global** | `~/.claude/` | Applies to all projects |
| **Workspace** | `{repo}/.claude/` for repos with child projects | Inherited by child projects |
| **Project** | `{repo}/.claude/` (leaf project) or `~/.claude/projects/{encoded-path}/` | Most specific, highest priority |

#### Analysis steps

1. **Determine plugin installation scope**: Plugins install into the global scope (`~/.claude/plugins/`). Check if the plugin's `settings.json` configures MCP servers or permissions that propagate globally.

2. **Identify scope-affecting components**:
   - **Skills**: Always available globally once plugin is enabled (no scope restriction)
   - **Hooks**: Plugin hooks fire globally — check if any should be scope-limited (e.g., hooks specific to a framework)
   - **MCP servers**: Plugin MCP config applies globally — can conflict with project-level MCP configs
   - **Rules**: If the plugin bundles rules, they apply at the plugin's scope level

3. **Detect scope conflicts**:
   - Plugin hooks that overlap with project-level hooks (same event + matcher)
   - Plugin MCP servers that share names with project-level MCP configs
   - Plugin skills that could confuse with project-local skills (name collision)

4. **Assess scope appropriateness**:
   - Is this plugin truly global (useful across all projects)?
   - Would it be better as a project-level configuration?
   - Are there components that should be conditionally activated per-project?

Output: `scope_impact` object with `installation_scope`, `affected_scopes`, `scope_conflicts[]`, and `appropriateness` assessment.

### 3G: Bundle Source Detection

Identify how the plugin was installed to provide provenance context in the report.

#### Detection methods

1. **skills-lock.json**: Claude Code tracks bundle installations in `skills-lock.json`:
   - Project-level (v1): `{repo}/.claude/skills-lock.json`
   - Global (v3): `~/.claude/skills-lock.json`

   Parse the lock file entries — each maps a skill name to its source bundle (marketplace name, version, and publisher).

2. **Plugin cache path**: Inspect the plugin's location in `~/.claude/plugins/cache/`:
   - Path contains marketplace identifier → `marketplace` source
   - Path is a symlink → `local` source (development mode)
   - Plugin.json contains `repository` field with `github.com` → `github` source

3. **Fallback heuristic**: If neither lock file nor cache path provides definitive information:
   - Plugin has `repository` URL in plugin.json → likely `github`
   - Plugin is in the current working directory → `local`
   - Otherwise → `unknown`

#### Output

```
bundle_source: {
  type: "marketplace" | "local" | "github" | "unknown",
  identifier: "marketplace-name@publisher" | "/path/to/local" | "github.com/owner/repo"
}
```

### 3H: Component Dependency Analysis

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
9. Scope conflicts: plugin hooks/MCP collide with project-level configs on same event/name → at least CONDITIONAL
10. All clear → RECOMMENDED

## Step 5: Build Diagnosis Data

```
environment_fit: {
  verdict: RECOMMENDED | CONDITIONAL | REDUNDANT | CONFLICTING,
  verdict_summary: "1-2 sentence diagnosis in output language",
  installation_status: NEW | ALREADY_INSTALLED,
  context_budget: {
    always_loaded: {
      skill_descriptions: { tokens, items },
      rules: { tokens, items, always, on_demand },
      claude_md: { tokens, import_chain },
      total_tokens
    },
    deferred: {
      mcp_tools: { tokens, servers },
      zero_cost_skills: N,
      on_demand_rules: N,
      total_tokens
    },
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
  scope_impact: {
    installation_scope: "global",
    affected_scopes: ["global", "workspace", "project"],
    scope_conflicts: [{ type, this_component, existing_component, scope, detail }],
    appropriateness: "1-2 sentence assessment"
  },
  bundle_source: { type: "marketplace" | "local" | "github", identifier: "..." },
  recommendations: ["actionable 1-line recommendation"]
}
```

Omit empty categories. Save for Phase 5/5R.
