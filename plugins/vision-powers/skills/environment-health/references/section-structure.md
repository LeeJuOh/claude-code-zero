# Environment Health — JSON Data Schema

This document defines the JSON structure for `sections-data.json` used by the
`environment-health` skill. The visual-report-writer outputs this file;
`render-sections.js` converts it into HTML section files.

**Key principle:** Focus on content, not presentation. The render script handles all
HTML structure and CSS classes.

---

## Top-level Structure

```json
{
  "metadata": { ... },
  "sections": {
    "header": { ... },
    "overview": { ... },
    "context_budget": { ... },
    "skill_health": { ... },
    "trigger_analysis": { ... },
    "hooks_and_mcp": { ... },
    "claude_md_memory": { ... },
    "recommendations": { ... }
  }
}
```

---

## metadata (required)

| Field | Type | Description |
|-------|------|-------------|
| `lang` | string | Language code: "en", "ko", "ja", etc. |
| `title` | string | Report title, e.g. "Environment Health Report" |
| `font_link` | string | Google Fonts `<link>` tag |
| `css_variables` | string | CSS variable overrides |
| `css_variables_dark` | string | Dark mode overrides |
| `mermaid_theme` | string | Additional Mermaid themeVariables |
| `report_type` | string | Fixed: `"environment-health"` — explicit type marker for render-sections.js dispatch |

---

## sections.header

| Field | Type | Description |
|-------|------|-------------|
| `status_tally` | object | `{healthy: N, attention: N, critical: N, graded_total: 6, observational: ["Plugin Inventory", "Startup Context Budget"]}` — tally is for graded areas only; observational areas listed separately |
| `top_lever` | string | Single-sentence top action: "Adding `disable-model-invocation: true` to 3 skills frees 840 chars (10.5%) from desc budget" |
| `scan_date` | string | ISO date of scan |
| `estimate_caveat` | string | Fixed text: "Values are estimates. Run `/context` for ground truth." (hidden if `--paste-context` was used) |
| `summary` | string | 1-2 sentence overall assessment |
| `quick_stats` | object | `{plugins, skills, hooks, mcp_servers, est_startup_tokens, context_window_size}` |

---

## sections.overview

| Field | Type | Description |
|-------|------|-------------|
| `area_type` | string | Fixed: `"observational"` — §1 Plugin Inventory has no official thresholds |
| `chart_data` | object | Chart.js data: `{labels: ["Skills","Commands","Agents","Hooks","MCP"], datasets: [{data: [N,...]}]}` |
| `plugins` | array | `[{name, description, skill_count, command_count, enabled_state: "active"\|"disabled"}]` (renamed from `status` to avoid confusion with health tiers — this is the plugin's enabled state, not a grading) |
| `totals` | object | `{active_plugins, disabled_plugins, stale_in_cache, total_skills, total_commands, local_skills}` |
| `info_notes` | array | `[{text, severity: "info"}]` — neutral observations (e.g. stale cache cleanup suggestion), never severity-flagged |

---

## sections.context_budget

| Field | Type | Description |
|-------|------|-------------|
| `context_window_size` | number | Current window size in tokens (200000 or 1000000) |
| `env_and_settings` | object | `{enable_tool_search, add_dir_claude_md, auto_memory_disabled, desc_budget_override, claude_md_excludes}` — shows how env affects calculation |
| `always_loaded` | object | `{system_prompt, memory, env_info, mcp_names, skill_descriptions, claude_md, rules, total}` — each with `tokens` and `label` and `source_citation` |
| `deferred` | object | `{mcp_tools, on_demand_rules, disabled_skills, total}` — each with `tokens` and `label` |
| `est_load_pct` | number | `always_loaded.total / context_window_size` |
| `area_type` | string | Fixed: `"observational"` — this area does NOT assign a tier |
| `component_status_refs` | array | `[{component, owner_section, status, rationale}]` — each component's grading is delegated to its owner section (e.g. `{component: "claude_md", owner_section: 8, status: "critical"}`) |
| `top_component_by_weight` | object | `{component, pct_of_load}` — descriptive observation, no severity |
| `estimate_caveat` | string | Fixed text: "Values are estimates. Run `/context` for ground truth." |
| `chart_data` | object | Stacked bar chart data for always-loaded breakdown |

---

## sections.skill_health

| Field | Type | Description |
|-------|------|-------------|
| `description_budget` | object | `{total_chars, effective_budget, budget_source: "SLASH_COMMAND_TOOL_CHAR_BUDGET env"\|"1% of 200K"\|"8K fallback", pct, over_250_char_entries: [{plugin, skill, chars}], status}` |
| `at_rest_body_sizes` | object | `{skills: [{plugin, skill, body_lines, over_500: bool}], over_500_count, status}` — section 4a |
| `post_compact_risk` | object | `{skills_over_5k: [{plugin, skill, est_tokens}], total_est_tokens, would_exceed_25k: bool, status}` — section 4b, labeled as LATENT risk |
| `disable_model_invocation` | object | `{using_count, not_using: [{plugin, skill, desc_chars}]}` — skills that could benefit from the flag |

---

## sections.trigger_analysis

| Field | Type | Description |
|-------|------|-------------|
| `inspector` | string | Fixed: "trigger-collision-inspector subagent (Waza-style lexical pairwise)" |
| `total_descriptions_analyzed` | number | Count of skill descriptions passed to the subagent |
| `collisions` | array | `[{skill_a, skill_b, classification: "DUPLICATE"\|"OVERLAP", shared_keywords: [string], note}]` — COMPLEMENT pairs are not returned |
| `mermaid_diagram` | string | Mermaid graph showing collision clusters |
| `status` | string | "healthy" \| "attention" \| "critical" |

---

## sections.hooks_and_mcp

| Field | Type | Description |
|-------|------|-------------|
| `hooks` | object | `{total, type_counts: {command,http,prompt,agent}, event_counts: {}, event_collisions: [], llm_hooks, status}` |
| `mcp` | object | `{server_count, effective_mode: "deferred"\|"auto"\|"false", est_tokens, servers: [{name, source_scope}], status}` |
| `chart_data` | object | Chart.js data for hook type distribution |

---

## sections.claude_md_memory

| Field | Type | Description |
|-------|------|-------------|
| `claude_md` | object | `{files: [{path,scope,lines,bytes,over_200}], total_lines, total_tokens, imports: [{from,target}], excluded_by_settings: [paths], status}` |
| `memory` | object | `{path, lines, bytes, pct_of_limit, over_200_lines, over_25kb, topic_files, status}` |

---

## sections.recommendations

| Field | Type | Description |
|-------|------|-------------|
| `items` | array | `[{area, severity: "critical"\|"warning"\|"info", action, impact_estimate, current_value, target_value, docs_source}]` — sorted by severity, impact |
| `top_lever` | object | Single recommendation with largest projected savings, promoted to header |
| `summary` | string | 1-2 sentence recommendation summary |
