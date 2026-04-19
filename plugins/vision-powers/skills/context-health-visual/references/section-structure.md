# Environment Health — JSON Data Schema

This document defines the JSON structure for `sections-data.json` used by the
`context-health-visual` skill. The visual-report-writer outputs this file;
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
    "skill_security": { ... },
    "plugin_components": { ... },
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
| `report_type` | string | Fixed: `"context-health-visual"` — explicit type marker for render-sections.js dispatch |

---

## sections.header

| Field | Type | Description |
|-------|------|-------------|
| `status_tally` | object | `{healthy: N, attention: N, critical: N, graded_total: 6, observational: ["Plugin Inventory", "Startup Context Budget", "Trigger Collisions", "Hook Complexity", "Plugin Components"]}` — tally is for graded areas only (§3, §4a, §4b, §7, §8, §9); observational areas listed separately |
| `top_lever` | string | Single-sentence top action: "Adding `disable-model-invocation: true` to 3 skills frees 840 chars (10.5%) from desc budget" |
| `scan_date` | string | ISO date of scan |
| `estimate_caveat` | string | Fixed text: "Values are estimates. Run `/context` for ground truth." (hidden if `--paste-context` was used) |
| `summary` | string | 1-2 sentence overall assessment |
| `quick_stats` | object | `{plugins, skills, hooks, mcp_servers, est_startup_tokens, context_window_size}` |
| `env_flags` | array | `[{flag, text, severity: "info"}]` — surface environment switches that materially change behavior. Emit an entry when `agent_teams_enabled=true` (CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS — see costs.md for per-teammate session token impact), `desc_budget_override` is set, or `auto_memory_disabled=true`. Observational, no severity |

---

## sections.overview

| Field | Type | Description |
|-------|------|-------------|
| `area_type` | string | Fixed: `"observational"` — §1 Plugin Inventory has no official thresholds |
| `chart_data` | object | Chart.js data: `{labels: ["Skills","Commands","Agents","Hooks","MCP"], datasets: [{data: [N,...]}]}` |
| `plugins` | array | `[{name, description, skill_count, command_count, enabled_state: "active"\|"disabled"}]` (renamed from `status` to avoid confusion with health tiers — this is the plugin's enabled state, not a grading) |
| `totals` | object | `{active_plugins, disabled_plugins, stale_in_cache, orphaned_cache_count, total_skills, total_commands, local_skills}` — `orphaned_cache_count` is separate from `stale_in_cache`: orphans are cache directories not pointed at by any `installed_plugins.json` installPath (old versions remaining on disk), while stale = enabled-in-settings-but-missing-from-cache |
| `orphans` | array | `[<plugin_name>]` — cache entries without an active `installPath`. Per plugins-reference.md, old versions are kept for a 7-day grace period after an update before being cleaned up |
| `plugin_options` | object | `{<plugin_name>: [<option_key>]}` — per-plugin option keys pulled from `settings.*.json → pluginConfigs[<id>].options`. **Keys only, values excluded** — option payloads can hold sensitive tokens (per plugins-reference.md). Observational |
| `info_notes` | array | `[{text, severity: "info"}]` — neutral observations (e.g. stale cache cleanup suggestion, 7-day orphan grace window), never severity-flagged |

---

## sections.context_budget

| Field | Type | Description |
|-------|------|-------------|
| `context_window_size` | number | Current window size in tokens (200000 or 1000000) |
| `env_and_settings` | object | `{enable_tool_search: {raw, effective_mode: "deferred"\|"upfront"\|"auto"\|"unknown", threshold_pct, proxy_fallback_applied, note}, anthropic_base_url, add_dir_claude_md, auto_memory_disabled, agent_teams_enabled, desc_budget_override, claude_md_excludes}` — shows how env affects calculation. `enable_tool_search` is the normalized object from `normalizeEnableToolSearch()` per mcp.md's 5-value table |
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

Section §3 (Description Obesity) is split into three axes per `health-criteria.md`.
Render each axis as its own card so the user can see which mechanism is firing.

| Field | Type | Description |
|-------|------|-------------|
| `description_axis_a_cap` | object | Axis A — per-entry 1,536-char hard cap. `{over_cap_entries: [{plugin, skill, combined_chars, overflow_chars}], over_cap_count, status}` |
| `description_axis_b_budget` | object | Axis B — total budget saturation. `{total_combined_chars, effective_budget, budget_source: "SLASH_COMMAND_TOOL_CHAR_BUDGET env"\|"1% of <window>"\|"8K fallback", pct_of_budget, status}` |
| `description_axis_c_balance` | object | Axis C — unbalanced consumption (observational, no tier). `{top_consumers: [{plugin, skill, combined_chars, pct_of_total}], avg_combined_chars, outliers: [{plugin, skill, multiple_of_avg}]}` |
| `at_rest_body_sizes` | object | §4a `{skills: [{plugin, skill, body_lines, over_500: bool}], over_500_count, status}` |
| `post_compact_risk` | object | §4b `{skills_over_5k: [{plugin, skill, est_tokens}], total_est_tokens, would_exceed_25k: bool, status}` — LATENT risk |
| `disable_model_invocation` | object | `{using_count, not_using: [{plugin, skill, combined_chars, user_invocable}]}` — listing-included skills that could benefit from the flag, sorted by `combined_chars` descending |
| `subagent_preloads` | object | `{agents_with_preload: [{plugin, agent, preload_skills: [<skill>]}], total_preloaded_skills}` — per sub-agents.md, subagents with `skills:` frontmatter inject the full skill body (not just description) when the subagent starts. Observational — no tier. Included here because the preload cost hits the skill-health budget (body, not description) |

---

## sections.trigger_analysis

| Field | Type | Description |
|-------|------|-------------|
| `area_type` | string | Fixed: `"observational"` — §5 has no official threshold for overlap severity; the subagent's DUPLICATE/OVERLAP output is surfaced verbatim |
| `inspector` | string | Fixed: "trigger-collision-inspector subagent (Waza-style lexical pairwise)" |
| `total_descriptions_analyzed` | number | Count of skill descriptions passed to the subagent |
| `collisions` | array | `[{skill_a, skill_b, classification: "DUPLICATE"\|"OVERLAP", shared_keywords: [string], note}]` — COMPLEMENT pairs are not returned |
| `mermaid_diagram` | string | Mermaid graph showing collision clusters |
| `info_notes` | array | `[{text, severity: "info"}]` — e.g. "DUPLICATE pairs trigger unpredictably (skills.md)" when any DUPLICATE returned |

---

## sections.skill_security

New §9 — Skill Security Scan. **Graded** (exception: grading is based on confidence-filtered
findings, not docs-cited thresholds — see health-criteria.md §9 for rationale).

| Field | Type | Description |
|-------|------|-------------|
| `area_type` | string | Fixed: `"graded"` — §9 grades on security finding confidence, not performance thresholds |
| `status` | string | `"healthy"` \| `"attention"` \| `"critical"` — per health-criteria.md §9 |
| `scanned_count` | number | Total SKILL.md files scanned (plugin cache + local) |
| `skills_with_findings` | number | Number of skills that have at least one finding |
| `counts_by_severity` | object | `{critical: N, warning: N}` — across all findings before confidence filter |
| `counts_by_category` | object | `{prompt_injection: N, data_exfil: N, destructive: N, hardcoded_credential: N, obfuscation: N, safety_override: N}` |
| `findings` | array | `[{plugin, skill, category, severity, confidence, line_number, excerpt}]` — full list; `confident` and `likely_safe` findings are collapsed by default in the UI |
| `info_notes` | array | `[{text, severity: "info"\|"warning"}]` — e.g. "N low-risk findings collapsed (safe/likely_safe)" |

---

## sections.plugin_components

Section §10 — plugin-level components beyond skills/commands/agents/hooks/MCP. Per
plugins-reference.md: `bin/` executables, `monitors/`, `.lsp.json`, `output-styles/`,
and `channels`. Observational — count only, no severity.

| Field | Type | Description |
|-------|------|-------------|
| `area_type` | string | Fixed: `"observational"` — §10 has no official thresholds |
| `per_plugin` | object | `{<plugin_name>: {bin, monitors, lsp_servers, output_styles, channels}}` — zero counts omitted |
| `totals` | object | `{bin, monitors, lsp_servers, output_styles, channels}` — aggregate across enabled plugins |
| `info_notes` | array | `[{text, severity: "info"}]` — e.g. "LSP servers are persistent subprocesses", "monitors run for the whole session" |

---

## sections.hooks_and_mcp

§6 hooks is observational (no grading), §7 mcp is graded on effective loading mode.

| Field | Type | Description |
|-------|------|-------------|
| `hooks` | object | `{area_type: "observational", total, type_counts: {command, http, prompt, agent}, event_counts: {}, event_collisions: [{event, matcher, entries: [{source}]}], llm_hooks, inline_sources: [{plugin, source: "inline"\|"file"}], schema_issues: [{event, hook_index, issue_type: "missing_matcher"\|"missing_command"\|"unknown_type", detail}], schema_issue_counts: {missing_matcher: N, missing_command: N, unknown_type: N}}` — no `status` field; prompt/agent hook cost, collision ordering, and schema issues are surfaced as info notes rather than tiers |
| `mcp` | object | `{server_count, effective_mode: "deferred"\|"upfront"\|"auto"\|"unknown", threshold_pct, proxy_fallback_applied, servers: [{name, source_scope: "user"\|"project"\|"local"\|"plugin:<name>"\|"plugin:<name> (inline)"}], status}` — graded on effective_mode per §7; token cost not included, point users to `/context` |
| `chart_data` | object | Chart.js data for hook type distribution |
| `info_notes` | array | `[{text, severity: "info"}]` — e.g. "N prompt/agent hooks — each invocation incurs an LLM call (hooks.md)", "event collision: X hooks on <event>/<matcher>, ordering unpredictable" |

---

## sections.claude_md_memory

| Field | Type | Description |
|-------|------|-------------|
| `claude_md` | object | `{files: [{path, scope: "project-root"\|"ancestor"\|"ancestor-local"\|"nested"\|"local-root"\|"user", load_mode: "always-loaded"\|"lazy-loaded", compact_resilient: bool, lines, bytes, over_200}], total_lines, total_bytes, total_est_tokens, nested_lines, nested_bytes, nested_est_tokens, imports: [{from, target}], excluded_by_settings: [paths], status}` — `total_*` fields count always-loaded files only; `nested_*` are lazy-loaded and reported separately. `compact_resilient: true` marks the project-root files that are re-injected after `/compact` per memory.md; nested and ancestor files are not re-injected |
| `memory` | object | `{path, lines, bytes, pct_of_limit, over_200_lines, over_25kb, topic_files, status}` |

---

## sections.recommendations

| Field | Type | Description |
|-------|------|-------------|
| `items` | array | `[{area, severity: "critical"\|"warning"\|"info", action, impact_estimate, current_value, target_value, docs_source}]` — sorted by severity, impact |
| `top_lever` | object | Single recommendation with largest projected savings, promoted to header |
| `summary` | string | 1-2 sentence recommendation summary |
