---
name: context-health-visual
disable-model-invocation: true
description: >
  Diagnose Claude Code environment health — context budget, description obesity,
  trigger collisions, hooks, MCP, plugins, CLAUDE.md, memory, and skill-security scan.
  Use when asked to audit the environment, check context budget, review plugins,
  or scan installed skills for risky patterns.
argument-hint: "[--format html|md] [--lang <code>] [--paste-context] [--use-instructions-loaded-hook]"
allowed-tools: Read, Glob, Grep, Agent, AskUserQuestion, Bash(node *), Bash(open *), Bash(rm -rf /tmp/env-health-*)
---

# Environment Health

Diagnose the user's Claude Code environment health. Outputs either an inline markdown
report or a self-contained interactive HTML dashboard. Covers 10 diagnostic areas — 6
graded scores against official thresholds (§4 splits into §4a at-rest and §4b post-compact;
§9 Skill Security Scan uses security baselines rather than docs-cited thresholds)
plus 5 observational areas (raw numbers, no tier).

## Instructions

### Input Parsing

Parse these arguments:

| Flag | Values | Default | Meaning |
|------|--------|---------|---------|
| `--format` | `html` \| `md` | `html` | Output mode. `html` generates a full interactive dashboard (default — recommended). `md` produces an inline markdown report for non-browser contexts or chat pasting |
| `--lang` | ISO code (`en`, `ko`, `fr`, etc.) | detected | Report language. Falls back to detecting the user message language, then `en` |
| `--paste-context` | (flag) | off | Ask the user to paste their `/context` output and use it to correct the estimated startup load |
| `--use-instructions-loaded-hook` | (flag) | off | Guide the user through temporarily enabling the `InstructionsLoaded` hook for file-level ground-truth data, then offer to revert it |

### Phase 1 — Data Collection

**Determine the context window size.** The scan subprocess cannot detect the active
session's window from `process.env`. Derive it from the active model ID:

- Model ID contains `[1m]` (e.g. `claude-opus-4-6[1m]`) → `1000000`
- Any other model ID → `200000`

Pass this as `--window-size=<N>` so the scan records it and downstream formulas use
the correct denominator.

**Run the scan:**

```bash
node ${CLAUDE_PLUGIN_ROOT}/skills/context-health-visual/scripts/env-health-scan.js --window-size=<N>
```

The script writes a JSON blob to stdout with these sections:

- `scan_date`, `context_window_size`, `env_and_settings` (normalized
  `enable_tool_search` per mcp.md's 5-value table, `agent_teams_enabled`,
  `anthropic_base_url`)
- `installed_plugins` (`{plugins, orphan_count, orphans}`), `disabled_plugins`
- `installed_skills`, `installed_commands`, `local_skills` (each entry carries
  `desc_chars`, `when_to_use_chars`, `combined_chars`, `disabled`, `user_invocable`)
- `skill_bodies` (at-rest 500-line flag + post-compact 5K-token flag)
- `hook_inventory` (type counts, event collisions, `llm_hooks` — includes inline
  hooks from `plugin.json`'s `hooks` field: `schema_issues` and `schema_issue_counts`
  for hook schema validation)
- `skill_security` (scanned_count, findings with confidence levels, counts_by_severity,
  counts_by_category — covers 6 pattern categories: prompt_injection, data_exfil,
  destructive, hardcoded_credential, obfuscation, safety_override)
- `context_metrics` (MCP server count + source scopes — includes plugin `.mcp.json`
  files AND inline `mcpServers` from `plugin.json`)
- `plugin_components` (`bin` / `monitors` / `lsp_servers` / `output_styles` /
  `channels` per plugin + totals)
- `subagent_preloads` (agents with `skills:` frontmatter that preload bodies at start)
- `plugin_options` (per-plugin option **keys only**, values omitted — sensitive)
- `claude_md` (walks cwd → filesystem root + `~/.claude/CLAUDE.md`, plus enumerates
  lazy-loaded nested files below cwd; respects `claudeMdExcludes`; each entry carries
  `scope`, `load_mode`, `compact_resilient`)
- `rules`, `memory`

Save to `/tmp/env-health-<pid>/scan.json`.

**Optional ground truth refinement:**

- If `--paste-context` is set: use `AskUserQuestion` to ask for the `/context` output,
  parse the reported always-loaded token counts, and override the estimates in the
  report. Clear the estimate-caveat when doing so.
- If `--use-instructions-loaded-hook` is set: walk the user through adding a temporary
  command-type `InstructionsLoaded` hook to `~/.claude/settings.json` that logs to
  `/tmp/env-health-<pid>/instructions-loaded.log`. Instruct them to start a new Claude
  Code session so the hook fires, then parse the log for exact per-file loading. Offer
  to revert the hook after reading the log.

### Phase 2 — Analysis

Read `${CLAUDE_PLUGIN_ROOT}/skills/context-health-visual/references/health-criteria.md`
for the full threshold specification. Apply it as follows:

**Compute the effective description budget:**

```
effective_budget = env_and_settings.desc_budget_override
                ?? max(8000, floor(context_window_size * 0.01))
```

**Graded areas** (§3, §4a, §4b, §7, §8, §9): classify into
🟢 healthy / 🟡 attention / 🔴 critical using the rules in `health-criteria.md`. Every
threshold you apply must cite its docs source. (§9 Skill Security Scan is an exception —
graded on security baselines without docs-cited thresholds; see health-criteria.md §9.)

**Observational areas** (§1 Plugin Inventory, §2 Startup Context Budget aggregate,
§5 Trigger Collisions, §6 Hook Complexity, §10 Plugin Components): do NOT assign a
tier. Emit raw numbers and info-level notes only. Delegate individual component
grading in §2 to the owner area per the status-delegation table.

**Trigger collisions (§5):** delegate to the `trigger-collision-inspector` subagent.
Build the input inventory by concatenating every installed skill and command
description, one per line:

```
[plugin-name] skill-name: description text
```

Invoke the subagent via the `Agent` tool with `subagent_type` set to
`trigger-collision-inspector`. The subagent returns `{total_descriptions_analyzed,
collisions: [...]}`. Surface the pairs verbatim — DUPLICATE / OVERLAP classification
is shown as reported, without aggregating into a tier (the prior 1-2 vs 3+ OVERLAP
thresholds had no official basis and were removed in favor of raw observation).

Do NOT implement Jaccard or pairwise comparison in the orchestrator or the scan
script. The subagent owns the entire comparison (direct adoption of Waza
`inspector-context.md:113`).

**Top lever computation:** rank possible actions by raw numeric impact (chars freed,
tokens saved) — not by severity — so observational areas can still surface a lever.
Examples:

- Adding `disable-model-invocation: true` to the N skills with the largest
  `combined_chars` → frees `sum(combined_chars)` (% of budget). Prefer skills users
  invoke manually (`/commit`, `/deploy`, `/release`)
- Trimming entries over 1,536 chars → frees `combined_chars - 1536` per entry
- Moving body content of a 5K+ token SKILL.md to `references/` → removes it from both
  at-rest and compact budgets

Pick the single lever with the largest projected savings and promote it to the
header + recommendations top card.

### Phase 3 — Report Generation

**Principle:** HTML is the default because a dashboard renders the 10 diagnostic areas as KPI cards, bars, and collision heatmaps that markdown can't match. Only choose `md` when running in a non-browser context (cowork, headless CI), when the user asks for markdown explicitly, or when pasting into a chat thread is more useful than opening a file.

Mermaid generation force-loads Layer 0's semantic-tokens.md (tokens) / diagram-type-selection.md (type mapping) / diagram-density-rules.md (budget) / taste-gate.md (checklist), and is auto-validated by `scripts/taste-gate.js`.

**Markdown mode (`--format md`):**

Emit an inline markdown report with this structure:

```
# Environment Health — <scan_date>

**Graded:** N 🟢 / N 🟡 / N 🔴 (6 areas) · **Observational:** Plugin Inventory, Context Budget, Trigger Collisions, Hook Complexity, Plugin Components

**Top lever:** <one sentence>

**Estimated startup load:** ~N tokens (X% of <window> window) — *estimate, run `/context` for ground truth*

## §1 Plugin & Skill Inventory ℹ️
<raw tables, orphan/7-day-grace notes, plugin-option keys>

## §2 Startup Context Budget ℹ️
<component breakdown, delegation references>

## §3 Skill Description Obesity <status>
<numbers, truncated entries, disable-model-invocation candidates, subagent preload totals>

## §4 Skill Body Size <status>
<4a at-rest, 4b post-compact — report separately>

## §5 Trigger Collisions ℹ️
<subagent-returned DUPLICATE/OVERLAP pairs, verbatim, no tier>

## §6 Hook Complexity ℹ️
<type breakdown, event collisions, inline-vs-file sources>

## §7 MCP Overview <status>
<server count, ENABLE_TOOL_SEARCH 5-value table, effective mode, proxy fallback>

## §8 CLAUDE.md & Memory Health <status>
<file list with scope/load_mode/compact_resilient, MEMORY.md capacity, nested lazy-loaded totals>

## §9 Skill Security Scan <status>
<findings list with confidence; safe/likely_safe collapsed; hook schema_issues as info notes>

## §10 Plugin Components ℹ️
<bin / monitors / lsp_servers / output_styles / channels per plugin>

## Recommendations
<grouped by severity, top lever promoted>
```

Cite sources inline where a threshold fires. Keep it under 200 lines.

**HTML mode (default, `--format html`):**

Read `${CLAUDE_PLUGIN_ROOT}/skills/context-health-visual/references/section-structure.md`
for the JSON schema. Then follow `${CLAUDE_PLUGIN_ROOT}/references/report-generation-workflow.md`
with these parameters:

| Parameter | Value |
|-----------|-------|
| `{output-path}` | `${CLAUDE_PLUGIN_DATA}/reports/<scan_date>-context-health-visual.html` |
| `{template-name}` | `context-health-visual.html` |
| `{skill-prefix}` | `env-health` |
| `{expected-sections}` | `10` |
| `{report-title}` | `"Environment Health — <scan_date>"` |
| `{aesthetic-hint}` | `"Dashboard"` |
| `{agent-prompt-data}` | The analyzed scan data, subagent collision results, computed tiers per area, top lever, and info notes. Pass the raw `scan.json` separately so the writer can reference exact numbers. |

The sections-data.json must set `metadata.report_type = "context-health-visual"` so
`render-sections.js` dispatches to the context-health-visual renderers (not the
plugin-visual ones).

**Privacy guard (both modes):** strip any raw file content before rendering. The
report emits counts, sizes, line numbers, and file paths — never CLAUDE.md body text,
MEMORY.md body text, API keys, or arbitrary file contents. Enforce this as a
pre-render pass: walk the sections-data.json tree and remove any field named `body`,
`content`, `raw`, `text` (excluding purposefully-set `text` fields in `info_notes` and
recommendation `action` strings, which contain only computed messages).

### Cleanup

Remove the temp directory:

```bash
rm -rf /tmp/env-health-<pid>
```

If the user enabled the `InstructionsLoaded` hook, remind them to revert it now.

## Gotchas

- **Skill description budget is 1% of context window, not 2%.** Earlier drafts used 2%
  / 16K chars. The official number (skills.md — "Skill descriptions are cut short") is
  1% scaling, 8,000-char fallback. Use the effective budget formula:
  `SLASH_COMMAND_TOOL_CHAR_BUDGET ?? max(8000, floor(context_window * 0.01))`.
- **Skill description loading is a 3-layer model, not a single number.** Per skills.md:
  (A) each entry's combined `description` + `when_to_use` is truncated at **1,536
  characters** — hard per-entry cap. (B) Total across all listing-included entries is
  capped at `effective_budget = SLASH_COMMAND_TOOL_CHAR_BUDGET ?? max(8000, floor(window
  × 0.01))`. When the total exceeds budget, every entry is **dynamically shortened**
  (keywords stripped). (C) Even below saturation, a few oversize entries can dominate.
  Earlier drafts cited "250 chars" — that number does not appear anywhere in the docs.
  §3 of the report evaluates all three axes separately. `disable-model-invocation: true`
  removes a skill from the listing entirely per the frontmatter table, so it contributes
  zero to the budget.
- **5K/25K skill body limit is POST-COMPACT, not at-rest.** The 5,000-tokens-per-skill
  / 25,000-total limit applies only to re-injection after `/compact`, and only for
  skills that were **invoked** in the session. The at-rest recommendation is separate:
  keep `SKILL.md` under 500 lines (skills.md tip). Report them as two distinct
  sections (§4a and §4b) — do not conflate.
- **Skill descriptions are NOT re-injected after compact.** Only invoked skills
  survive compaction. The always-loaded description budget vanishes after compact,
  which changes what "always-loaded cost" means mid-session. Mention this caveat in
  the report.
- **Auto-compaction can enter a thrashing state and halt.** Per how-claude-code-works.md:
  "If a single file or tool output is so large that context refills immediately after
  each summary, Claude Code stops auto-compacting after a few attempts and shows an
  error." The scan cannot detect thrashing directly, but it can surface its
  ingredients — large SKILL.md bodies, many rules without `paths:`, and large
  CLAUDE.md chains all amplify the risk. When all three co-occur, flag it in the
  report and link users to
  `https://code.claude.com/docs/en/troubleshooting#auto-compaction-stops-with-a-thrashing-error`.
- **Trigger collision uses a subagent, not inline orchestrator logic.** The
  `trigger-collision-inspector` subagent owns the entire comparison (Waza-style). Do
  NOT add Jaccard code in the scanner or do the comparison in the main orchestrator —
  both would bloat main-session context and duplicate the subagent's job. If accuracy
  becomes a problem, revise the subagent prompt before adding deterministic pre-filter
  stages (YAGNI).
- **Context budget is always-loaded only.** Don't count deferred items in the
  always-loaded budget unless `ENABLE_TOOL_SEARCH` is `auto` (with pressure) or
  `false`. Report deferred items separately so users see both views.
- **`/context` is ground truth, not the scan's estimate.** The scan uses public
  formulas but Claude Code's actual context accounting can drift per version. The
  report must say _"Estimated — run `/context` for ground truth"_ and optionally
  accept pasted `/context` output via `--paste-context`.
- **`InstructionsLoaded` hook is the file-level ground truth.** For users who want
  exact per-file instruction loading data, recommend temporarily enabling the
  `InstructionsLoaded` hook (hooks.md) to log which CLAUDE.md / rules / skills files
  actually loaded. Offered as `--use-instructions-loaded-hook`.
- **Skill body tokens are estimated (chars/4).** Actual tokenization varies. Flag as
  approximate.
- **MEMORY.md path varies by project.** The encoded path format can vary. The scan
  script tries multiple paths — if none match, report "no memory file found" rather
  than erroring.
- **prompt/agent hooks cost tokens per event.** Unlike command/http hooks,
  prompt/agent hook types invoke an LLM call each time they fire. This is a per-event
  runtime cost, not a startup cost.
- **`ENABLE_TOOL_SEARCH` changes the MCP cost model.** The default (`deferred`) means
  only tool names in context. `auto` may load schemas upfront if they fit in 10% of
  context. `false` always loads them. The scan reads this env var and adjusts the
  MCP budget line accordingly.
- **`claudeMdExcludes` and `--add-dir` CLAUDE.md loading.** Respect
  `claudeMdExcludes` (exclude matching paths from CLAUDE.md total) and
  `CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD=1` (include CLAUDE.md from `--add-dir`
  paths). Both affect the always-loaded budget.
- **Privacy.** The scan reads CLAUDE.md, MEMORY.md, and settings files, but the
  report must emit counts and sizes only — never file contents, API keys, or memory
  body text. Enforce as a pre-render guard that strips raw content fields before
  producing sections-data.json.
- **Context window size is not self-detectable from the scan.** The `node
  env-health-scan.js` subprocess has no way to know the current session's window size
  (200K vs 1M). Detect it from the active model ID (e.g. `claude-opus-4-6[1m]` →
  1000000) and pass via `--window-size=<N>`. Without this, percentage-of-window
  calculations default to 200K and will be wrong on 1M sessions.
- **Shell-level env vars only — child process inheritance.** The scan reads
  `SLASH_COMMAND_TOOL_CHAR_BUDGET`, `ENABLE_TOOL_SEARCH`,
  `CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD`, `CLAUDE_CODE_DISABLE_AUTO_MEMORY`
  from `process.env`. These are only visible to the Node subprocess if the user
  `export`ed them from their shell init. Env vars set only inside a Claude Code
  session (not exported before CC launched) are invisible. Surface this caveat next
  to any env-var-derived field.
- **CLAUDE.md walk scope: cwd → filesystem root, plus `~/.claude/CLAUDE.md`.** Per
  memory.md, Claude Code loads CLAUDE.md from every ancestor directory above cwd plus
  `~/.claude/CLAUDE.md`. The docs do NOT specify a `$HOME` boundary. The scan walks up
  to the filesystem root so that projects under `/tmp`, `/var`, or other non-home
  locations still get a complete ancestor chain. Scope is reported as one of
  `project-root` / `ancestor` / `ancestor-local` / `nested` / `local-root` / `user`.
- **Nested CLAUDE.md files are lazy-loaded and NOT re-injected after `/compact`.**
  Per memory.md, nested CLAUDE.md files (below cwd) load only when files in their
  subtree are read. Unlike project-root `./CLAUDE.md` / `./.claude/CLAUDE.md`, they
  don't survive compaction — only always-loaded project-root files are re-injected.
  The scan reports `load_mode` and `compact_resilient` per file, and keeps
  `nested_lines` / `nested_bytes` / `nested_est_tokens` separate from always-loaded
  totals so the report doesn't exaggerate startup load.
- **Observational areas never contribute to the tally.** §1 and §2 emit raw numbers
  and info-level notes only. They are counted separately from the graded tally. A
  report showing `0 critical` means zero critical among graded areas — observational
  areas may still have info-level observations worth surfacing.
- **Skill security scan uses heuristic confidence, not binary safe/unsafe.** Every
  finding is kept in the output — nothing is silently discarded. A `confidence` field
  adjusts how prominently findings are shown: `safe` / `likely_safe` findings are
  collapsed by default (temp-path cleanup, loopback-only calls, frontmatter metadata
  lines, and scanner self-references do not warrant loud alerts). Grade is driven only
  by `uncertain` / `suspicious` findings. When multiple heuristics apply to one finding,
  the most cautious level (lowest confidence) is used.
- **Self-exclusion by frontmatter `name:`, not by path.** The scanner skips the skill
  whose `name:` frontmatter field equals `context-health-visual`. Path-based exclusion
  would break across install locations (cache vs local). Scope is this skill only —
  other vision-powers skills (plugin-visual, doc-visual, fact-check, etc.) remain
  in-scope so any legitimate security findings surface.
- **Hook schema validation applies only to tool-gated events.** `PreToolUse` and
  `PostToolUse` entries are flagged when they lack a `matcher` field. Other events
  (`SessionStart`, `UserPromptSubmit`, `Stop`, etc.) don't use matchers — flagging
  them would be noise. This scope is hard-coded in `env-health-scan.js`; update the
  `MATCHER_EVENTS` set if future docs add more tool-gated event types.

## Reference Files

- `references/health-criteria.md` — Grading thresholds (cites every docs source) and
  recommendation templates
- `references/section-structure.md` — JSON schema for the 10-section HTML report
- `agents/trigger-collision-inspector.md` — Subagent spec for trigger collision
  detection (Waza-adapted)
- `scripts/env-health-scan.js` — Data collection script
- `../../references/report-generation-workflow.md` — Shared HTML generation pipeline
  (render → assemble → validate → log → open)
- `../../references/design-system/semantic-tokens.md` — Color and font semantic tokens
- `../../references/design-system/diagram-type-selection.md` — 13-type selection guide
- `../../references/design-system/diagram-density-rules.md` — Complexity budget per type
- `../../references/design-system/taste-gate.md` — Pre-output quality checklist
