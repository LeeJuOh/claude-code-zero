---
name: environment-health
description: "Diagnose Claude Code environment health: context, description obesity, trigger collisions, hooks, MCP, CLAUDE.md/memory. Graded + observational areas with actionable levers. Use for setup audits or when Claude feels slow."
argument-hint: "[--format=html|md] [--lang <code>] [--paste-context] [--use-instructions-loaded-hook]"
allowed-tools: Read, Glob, Grep, Agent, AskUserQuestion, Bash(node *), Bash(open *), Bash(rm -rf /tmp/env-health-*)
---

# Environment Health

Diagnose the user's Claude Code environment health. Outputs either an inline markdown
report or a self-contained interactive HTML dashboard. Covers 8 diagnostic areas — 6
graded against official thresholds, 2 observational (raw numbers, no tier).

## Trigger phrases

Invoke on requests like "audit my environment", "why does Claude feel slow", "check my
context budget", "am I hitting description truncation", "review my plugins", "show
environment health", "trigger collisions", "skill obesity", "run an environment
health check".

## Instructions

### Input Parsing

Parse these arguments:

| Flag | Values | Default | Meaning |
|------|--------|---------|---------|
| `--format` | `html` \| `md` | `html` | Output mode. `md` produces an inline markdown report; `html` generates a full dashboard |
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
node ${CLAUDE_PLUGIN_ROOT}/skills/environment-health/scripts/env-health-scan.js --window-size=<N>
```

The script writes a JSON blob to stdout with these sections:

- `scan_date`, `context_window_size`, `env_and_settings`
- `installed_plugins`, `disabled_plugins`
- `installed_skills`, `installed_commands`, `local_skills`
- `skill_bodies` (at-rest 500-line flag + post-compact 5K-token flag)
- `hook_inventory` (type counts, event collisions, `llm_hooks`)
- `context_metrics` (MCP server count + source scopes)
- `claude_md` (walks cwd → $HOME + `~/.claude/CLAUDE.md`, respects `claudeMdExcludes`)
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

Read `${CLAUDE_PLUGIN_ROOT}/skills/environment-health/references/health-criteria.md`
for the full threshold specification. Apply it as follows:

**Compute the effective description budget:**

```
effective_budget = env_and_settings.desc_budget_override
                ?? max(8000, floor(context_window_size * 0.01))
```

**Graded areas** (§3, §4a, §4b, §5, §6, §7, §8): classify into
🟢 healthy / 🟡 attention / 🔴 critical using the rules in `health-criteria.md`. Every
threshold you apply must cite its docs source.

**Observational areas** (§1 Plugin Inventory, §2 Startup Context Budget aggregate): do
NOT assign a tier. Emit raw numbers and info-level notes only. Delegate individual
component grading in §2 to the owner area per the status-delegation table.

**Trigger collisions (§5):** delegate to the `trigger-collision-inspector` subagent.
Build the input inventory by concatenating every installed skill and command
description, one per line:

```
[plugin-name] skill-name: description text
```

Invoke the subagent via the `Agent` tool with `subagent_type` set to
`trigger-collision-inspector`. The subagent returns `{total_descriptions_analyzed,
collisions: [...]}`. Status mapping:

- No collisions → 🟢 healthy
- 1-2 OVERLAP pairs → 🟡 attention
- ≥1 DUPLICATE OR 3+ OVERLAP → 🔴 critical

Do NOT implement Jaccard or pairwise comparison in the orchestrator or the scan
script. The subagent owns the entire comparison (direct adoption of Waza
`inspector-context.md:113`).

**Top lever computation:** rank possible actions by raw numeric impact (chars freed,
tokens saved) — not by severity — so observational areas can still surface a lever.
Examples:

- Adding `disable-model-invocation: true` to the N skills with the largest `desc_chars`
  that are user-invocable → frees `sum(desc_chars) chars (pct% of budget)`
- Trimming any entry over 250 chars → frees `chars - 250` per entry
- Moving body content of a 5K+ token SKILL.md to `references/` → removes it from both
  at-rest and compact budgets

Pick the single lever with the largest projected savings and promote it to the
header + recommendations top card.

### Phase 3 — Report Generation

**Markdown mode (`--format=md`):**

Emit an inline markdown report with this structure:

```
# Environment Health — <scan_date>

**Graded:** N 🟢 / N 🟡 / N 🔴 (6 areas) · **Observational:** Plugin Inventory, Context Budget

**Top lever:** <one sentence>

**Estimated startup load:** ~N tokens (X% of <window> window) — *estimate, run `/context` for ground truth*

## §1 Plugin & Skill Inventory ℹ️
<raw tables, info notes>

## §2 Startup Context Budget ℹ️
<component breakdown, delegation references>

## §3 Skill Description Obesity <status>
<numbers, truncated entries, disable-model-invocation candidates>

## §4 Skill Body Size <status>
<4a at-rest, 4b post-compact — report separately>

## §5 Trigger Collisions <status>
<collision pairs>

## §6 Hook Complexity <status>
<type breakdown, event collisions>

## §7 MCP Overview <status>
<server count, effective loading mode>

## §8 CLAUDE.md & Memory Health <status>
<file list, MEMORY.md capacity>

## Recommendations
<grouped by severity, top lever promoted>
```

Cite sources inline where a threshold fires. Keep it under 200 lines.

**HTML mode (default, `--format=html`):**

Read `${CLAUDE_PLUGIN_ROOT}/skills/environment-health/references/section-structure.md`
for the JSON schema. Then follow `${CLAUDE_PLUGIN_ROOT}/references/report-generation-workflow.md`
with these parameters:

| Parameter | Value |
|-----------|-------|
| `{output-path}` | `${CLAUDE_PLUGIN_DATA}/reports/<scan_date>-environment-health.html` |
| `{template-name}` | `environment-health.html` |
| `{skill-prefix}` | `env-health` |
| `{expected-sections}` | `8` |
| `{report-title}` | `"Environment Health — <scan_date>"` |
| `{aesthetic-hint}` | `"Dashboard"` |
| `{agent-prompt-data}` | The analyzed scan data, subagent collision results, computed tiers per area, top lever, and info notes. Pass the raw `scan.json` separately so the writer can reference exact numbers. |

The sections-data.json must set `metadata.report_type = "environment-health"` so
`render-sections.js` dispatches to the environment-health renderers (not the
agent-extension ones).

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
- **Per-entry description cap is 250 chars.** Descriptions longer than 250 characters
  are silently truncated in the listing regardless of total budget. Flag these as
  critical — Claude cannot see the tail, which affects triggering. Front-load the key
  use case.
- **5K/25K skill body limit is POST-COMPACT, not at-rest.** The 5,000-tokens-per-skill
  / 25,000-total limit applies only to re-injection after `/compact`, and only for
  skills that were **invoked** in the session. The at-rest recommendation is separate:
  keep `SKILL.md` under 500 lines (skills.md tip). Report them as two distinct
  sections (§4a and §4b) — do not conflate.
- **Skill descriptions are NOT re-injected after compact.** Only invoked skills
  survive compaction. The always-loaded description budget vanishes after compact,
  which changes what "always-loaded cost" means mid-session. Mention this caveat in
  the report.
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
- **CLAUDE.md loading walks parent directories.** Per memory.md, Claude Code loads
  CLAUDE.md from every ancestor directory from cwd up to `$HOME` (inclusive), plus
  `~/.claude/CLAUDE.md`. The scan walks that chain — scanning only cwd +
  `~/.claude/CLAUDE.md` undercounts the always-loaded CLAUDE.md budget on projects
  nested multiple levels deep inside home.
- **Observational areas never contribute to the tally.** §1 and §2 emit raw numbers
  and info-level notes only. They are counted separately from the graded tally. A
  report showing `0 critical` means zero critical among graded areas — observational
  areas may still have info-level observations worth surfacing.

## Reference Files

- `references/health-criteria.md` — Grading thresholds (cites every docs source) and
  recommendation templates
- `references/section-structure.md` — JSON schema for the 8-section HTML report
- `agents/trigger-collision-inspector.md` — Subagent spec for trigger collision
  detection (Waza-adapted)
- `scripts/env-health-scan.js` — Data collection script
- `../../references/report-generation-workflow.md` — Shared HTML generation pipeline
  (render → assemble → validate → log → open)
