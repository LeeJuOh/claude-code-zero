---
name: context-health-visual
description: >
  Diagnose Claude Code environment health — context budget, description obesity,
  trigger collisions, hooks, MCP, plugins, CLAUDE.md, memory, and skill-security scan.
  Use when asked to audit the environment, check context budget, review plugins,
  or scan installed skills for risky patterns.
argument-hint: "[--format html|md] [--lang <code>] [--use-instructions-loaded-hook] [--local (force a local file instead of publishing)]"
allowed-tools: Read, Glob, Grep, Agent, AskUserQuestion, Artifact, Skill(artifact-design), Bash(node *), Bash(open *), Bash(rm -rf /tmp/env-health-*)
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
| `--use-instructions-loaded-hook` | (flag) | off | Guide the user through temporarily enabling the `InstructionsLoaded` hook for file-level ground-truth data, then offer to revert it |
| `--local` | (flag) | off | Force the local design-system dashboard — capable HTML **publishes to an Artifact by default** |
| `--artifact` | (flag) | retained no-op alias | Already the default on capable HTML — kept so muscle memory / natural-language triggers don't break |

**Channel is decided by the shared contract**, not re-derived here — read
`${CLAUDE_PLUGIN_ROOT}/references/design-system/channel-decision.md` (SSOT, restates ADR 0009) for the
`(Format × capable) → channel` table, flag semantics, and the optimistic-try-then-regenerate rule.
The short version: **capable HTML publishes to a claude.ai Artifact by default**; `--local` forces the
local dashboard; `md` and non-capable sessions stay local. Both flags apply to `--format html` only;
`--artifact` combined with `--format md` is ignored and the normal markdown path runs. If `--local`
and `--artifact` are both signalled, `--local` wins. `--local` also triggers on natural-language
equivalents ("keep it local", "don't publish"); `--artifact` still triggers on "as an artifact",
"publish as a link", "share as a URL" — in whatever language the user writes.

**Config precedence.** Explicit this-turn signal > config > default. Before falling back to the
default, check stored preferences once: `node ${CLAUDE_PLUGIN_ROOT}/scripts/config.js get` (prints the
config as JSON, or `{}`). A `default_format` value replaces the `html` default. For the channel: an
**absent `artifact` key means artifact-first** (the default), `artifact: false` is a **persistent
force-local** (the config twin of `--local`), and `artifact: true` is explicit artifact-first. Anything
the user actually says this turn — a literal flag or a natural-language equivalent — always overrides
config; config only fills in when the request is silent on format/channel.

### Phase 1 — Data Collection

**Ground-truth prompt (always ask, first thing).** The whole point of this skill is an
accurate context budget, and `/context` is the only ground truth for startup load — the scan
can only estimate it. So before collecting anything, use `AskUserQuestion` to offer two paths:

- **Paste `/context` output (recommended)** — you'll parse the reported always-loaded token
  counts and use them to correct the estimate.
- **Proceed with the estimate** — the scan's public-formula estimate, carried with a caveat.

Ask this on **every run**. There's no flag and no stored preference gating it: the estimate is a
fallback, not the default path. Keep the question lean — one question, two options.

- If the user chooses paste: ask them to paste their `/context` output, parse the always-loaded
  token counts, and override the estimates in the report. Clear the estimate-caveat when you do.
- If the user skips, doesn't respond, or the session is headless (no interactive
  `AskUserQuestion`): proceed with the estimate and keep the caveat. This is the current default
  behavior.

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

- The `/context` paste correction is handled by the always-ask prompt at the top of this
  phase — not gated by any flag.
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

Mermaid diagrams follow the design system references: semantic-tokens.md (tokens) / diagram-type-selection.md (type mapping) / diagram-density-rules.md (budget) / artifact-gate.md (checklist). Validated by `scripts/artifact-gate.js`.

**Markdown mode (`--format md`):**

Emit an inline markdown report, and save the same content to
`${CLAUDE_PLUGIN_DATA}/reports/<scan_date>-context-health-visual.md` — the chat text is the
delivery, the file is the record that lets report-manager list and refine this report later.
Use this structure:

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

**HTML channel routing (default = Artifact).** For `--format html` the channel is decided by
`${CLAUDE_PLUGIN_ROOT}/references/design-system/channel-decision.md`: on a capable account the default
is the **Artifact channel** — go straight to "HTML mode — Artifact channel" below. Write the **local
design-system + Mermaid** dashboard (the section directly under this one) only when `--local` is in
play, or as the **non-capable regenerate fallback** after a publish attempt fails (see "Publish"). `md`
is unaffected — it stays local either way. `--local` coexists with the always-ask `/context` prompt and
`--use-instructions-loaded-hook`: those are ground-truth-data controls, orthogonal to the output
channel, so any combination is valid.

**HTML mode — local design-system channel (`--local` / non-capable fallback):**

Write the entire HTML file yourself — `<!DOCTYPE html>` to `</html>`. A self-contained single file with inline CSS and scripts. No templates, no intermediate JSON, no agent chains.

Output path: `${CLAUDE_PLUGIN_DATA}/reports/<scan_date>-context-health-visual.html`

**Dashboard structure** — the 10 diagnostic areas as sections:

| Section | Type | Content |
|---|---|---|
| §1 Plugin & Skill Inventory | ℹ️ observational | Tables, orphan notes, plugin-option keys |
| §2 Startup Context Budget | ℹ️ observational | Component breakdown with delegation references |
| §3 Skill Description Obesity | graded | Numbers, truncated entries, disable-model-invocation candidates |
| §4 Skill Body Size | graded | §4a at-rest + §4b post-compact, reported separately |
| §5 Trigger Collisions | ℹ️ observational | Subagent-returned DUPLICATE/OVERLAP pairs |
| §6 Hook Complexity | ℹ️ observational | Type breakdown, event collisions, inline-vs-file sources |
| §7 MCP Overview | graded | Server count, ENABLE_TOOL_SEARCH mode, proxy fallback |
| §8 CLAUDE.md & Memory Health | graded | File list with scope/load_mode, MEMORY.md capacity |
| §9 Skill Security Scan | graded | Findings with confidence, safe/likely_safe collapsed |
| §10 Plugin Components | ℹ️ observational | bin/monitors/lsp_servers/output_styles/channels per plugin |

Include a header with: graded tally (N 🟢 / N 🟡 / N 🔴), top lever (one sentence), estimated startup load.

While shaping the dashboard, watch for seven authoring reflexes that pass every mechanical gate and still flatten the output — summary-leak (a KPI label where the actual number/finding belongs), linear dump (sections stacked at equal weight with no proportion), forced diagram (a quadrant or timeline on data a table conveys better), generic label (a panel titled "Section 3" instead of what it diagnoses), uniform density (every status panel the same visual weight), empty decoration (a callout or icon carrying no signal), and accent overuse (more than 1–2 focal points per view). Read `${CLAUDE_PLUGIN_ROOT}/references/design-system/anti-slop-tells.md` for the full catalogue. They're named defaults to break, not design rules: layout and which area leads stay yours — the catalogue just flags the habits worth resisting.

**Diagrams**: Read these reference files for implementation:
- `${CLAUDE_PLUGIN_ROOT}/references/design-system/mermaid-patterns.md` — Mermaid syntax, theming, dark mode
- `${CLAUDE_PLUGIN_ROOT}/references/design-system/semantic-tokens.md` — Color/font roles, Mermaid themeVariables
- `${CLAUDE_PLUGIN_ROOT}/references/design-system/diagram-type-selection.md` — 13-type selection guide
- `${CLAUDE_PLUGIN_ROOT}/references/design-system/diagram-density-rules.md` — Complexity budgets

Key diagram rules:
1. Max 9 nodes, 12 arrows per diagram. Over budget → split
2. 1-2 focal accents only
3. No `rgba()` or `color:` in Mermaid classDef
4. Always `theme: 'base'` with themeVariables from semantic-tokens

**CSS essentials**: Write inline CSS. Must support:
- `prefers-color-scheme: dark` via CSS custom properties
- Korean font stack (CJK font in font-family)
- KPI cards for graded areas (colored borders: green/yellow/red)
- `transform: scale()` for Mermaid zoom
- `prefers-reduced-motion: reduce`
- Status indicators: colored dots via CSS, no emoji

**Validation**: After writing the HTML, run artifact-gate:
```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/artifact-gate.js <output-path>
```
If violations found: fix inline, max 2 retries.

**Visual self-audit (HTML only)**

The gate reads the HTML as *text* — it never sees the rendered dashboard. A quadrant or timeline can pass the density check and still render as an unreadable tangle; a long skill name or finding can clip at a panel edge; a graded tally that reads fine in source can flatten into a uniform grid of identical cards once styled. After the gate passes, **render the dashboard and look at it** before delivering:

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/render-report.js <output-path>
```

On success it prints a PNG path. **Read that PNG** (you read images multimodally) and scan it for what the text gate can't judge:

- **Density** — is any section a uniform wall of KPI cards or a table past its budget, or a diagram too dense to read?
- **Hierarchy** — does the section you judged load-bearing draw the eye first, or are all 10 sections the same weight? (see *uniform density* / *accent overuse* in anti-slop-tells.md)
- **Diagram integrity** — did a Mermaid quadrant/timeline/status diagram render as raw `<pre>` text or as crossing/overlapping edges?
- **Overflow** — does a panel, table, long skill name, or collision pair run past its container or off the page?

Fix what you see and re-render. **Cap at 2 audit passes** — if something still looks off after the second, ship with a one-line note to the user rather than looping. This catches gross breakage, not pixel-perfection.

**If Chrome is absent**, `render-report.js` exits `1` (non-zero). Skip the audit and tell the user it was skipped (e.g. "rendered-image check skipped: Chrome not found — set `CHROME_BIN` or install Chrome"). The report already passed the gate; the visual pass is an enhancement and **never blocks delivery**.

Full procedure, limits (fixed-height clipping, downscaling, render cost), and the rationale for *not* mechanizing this with a measurement script live in `${CLAUDE_PLUGIN_ROOT}/references/design-system/visual-self-audit.md`.

Then run `open <output-path>`.

**HTML mode — Artifact channel (default on a capable account)**

Same content decisions as the local design-system channel above (10-section dashboard structure,
graded/observational split, header tally + top lever, anti-slop-tells) — only the page's shape
and delivery mechanism change, because it ships inside Claude Code's official Artifacts feature
instead of as a local file.

**Before writing anything**, load the built-in `artifact-design` skill (Skill tool, skill name
`artifact-design`). This is a tool contract MUST, not a suggestion — it conditions you for the CSP
sandbox this page runs in, and skipping it is how a page ends up broken on publish.

Then write the page as a **fragment**, not a full document:
- No `<!DOCTYPE>`, `<html>`, `<head>`, or `<body>` tags — content only, starting from your first
  real element. The Artifact tool wraps the file in that skeleton at publish time.
- Set a concise `<title>` directly in the content — it names the artifact in the browser tab. Keep
  it stable across every republish of the same scan in this session.
- **Zero external requests** — the Artifact viewer's CSP blocks all of them. No Mermaid CDN
  `<script>`, no hotlinked images or fonts. Quadrant/timeline/status diagrams become inline SVG or
  HTML+CSS layouts instead (follow the artifact-design skill's guidance) — same diagram-type
  decision from `diagram-type-selection.md`, different rendering technique. `mermaid-patterns.md`'s
  CDN setup and `classDef` rules don't apply here.
- Support both themes: `@media (prefers-color-scheme: dark)` as the default signal, plus
  `:root[data-theme="dark"]` / `:root[data-theme="light"]` overrides — the artifact viewer's theme
  toggle stamps `data-theme` on the root and it must win in both directions.

**Watch KPI-card density here in particular** — 10 diagnostic sections (6 graded + 4
observational) packed into a narrower fragment than the local dashboard's full-width layout is the
likeliest place a card grid wraps awkwardly or a long finding/skill-name string clips. This is
exactly what this slice's local-vs-artifact comparison run is for (see the issue's S4 acceptance
criteria), not something to assume away here.

Save the fragment to
`${CLAUDE_PLUGIN_DATA}/reports/<scan_date>-context-health-visual.artifact.html` — a distinct
filename from the default channel's `<scan_date>-context-health-visual.html`, so the two never
collide or overwrite each other for the same scan.

Re-running this skill within the same conversation reuses that same path (as long as `scan_date`
is unchanged). Publishing to the same `file_path` again redeploys to the same URL instead of
minting a new one, so keep the `<title>` and `favicon` identical across those republishes (the
tool reads a changed favicon as a different page). If `${output-path}.artifact.json` already
exists from an earlier publish this session, read it first and reuse its `title`/`favicon`
verbatim.

**Validation**: run the gate in content-only mode instead of the full check:
```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/artifact-gate.js <output-path> --content-only
```
This checks only missing images, raw markdown leakage, anchor hrefs, image alt, and placeholders —
the facts that must survive regardless of who designed the page. Density/classDef/palette checks
don't apply: the built-in artifact-design skill owns the design layer on this channel (ADR 0007).

**Skip the visual self-audit (`render-report.js`) entirely on this channel.** The rendered picture
is the built-in artifact-design skill's responsibility here, not this skill's — there's no local
Chrome render loop to run before publishing.

**The privacy guard below still applies unchanged** — the pre-render strip of raw content fields
runs before writing the fragment exactly as it does for the default HTML and markdown channels.
Publishing to claude.ai doesn't change what's safe to include; it only changes the CSS/CDN
mechanics around it.

**Publish**, once the gate passes:
1. Publish with the `Artifact` tool: `file_path` = the fragment you saved, `favicon` = one or two
   emoji fitting a health/diagnostic theme (reused unchanged if a sidecar from this session already
   set one — see above), `description` = one sentence naming the scan date and top lever.
2. Record the publish so a later refine (even across sessions, once that lands) can find this URL:
   ```bash
   node ${CLAUDE_PLUGIN_ROOT}/scripts/write-artifact-sidecar.js --report <output-path> --url <artifact-url> --title <title> --favicon <favicon>
   ```
3. Report the URL to the user with one line — and on this skill in particular **never omit it**: the
   scan reads the user's environment, so disclosing that the result now lives on claude.ai is a
   privacy-relevant fact, not a nicety. Use the **canonical publish notice** (noun = *dashboard*):
   `Published to claude.ai — design is delegated to Claude's built-in Artifact renderer, so it differs
   from the local dashboard's look; run --local for the local design-system + Mermaid version.` This
   one line does double duty — it discloses the publish (the deliverable is now a URL, not a local
   file) **and** the design delegation. Phrase it in whatever language you're already replying in; the
   structure (published · delegated-design · `--local` escape hatch) is what's canonical, not the exact
   English words. (The report body still emits counts/paths only — the privacy guard below is
   unchanged; this notice is about disclosing the publish itself.)

**Fallback — non-capable session (regenerate, don't just open).** If the `Artifact` tool is
unavailable or the publish call fails, the session is non-capable. Don't guess at the specific cause
and don't ask before falling back. The fragment you published is a Mermaid-less, skeleton-less page
authored for the Artifact viewer — **do not `open` it** (that serves a broken, diagram-free page and
breaks ADR 0009 §3's promise of design-system + Mermaid on a non-capable session). Instead
**regenerate the full local design-system + Mermaid dashboard** ("HTML mode — local design-system
channel" above), run its full gate + visual self-audit (the all-channels privacy guard applies as
always), save to the `<scan_date>-context-health-visual.html` path, `open` it, and state the fallback
in one line (e.g. "Artifact publish unavailable — generated the local design-system dashboard
instead."). Cost = one regeneration, only on a non-capable session.

**Privacy guard (all channels):** strip any raw file content before rendering. The
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
  report must say _"Estimated — run `/context` for ground truth"_. Phase 1 always
  offers to accept pasted `/context` output to correct the estimate.
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

Read these as needed (not upfront):

| File | When to read |
|---|---|
| `references/health-criteria.md` | Phase 2 — grading thresholds and recommendation templates |
| `agents/trigger-collision-inspector.md` | Phase 2 — trigger collision detection subagent spec |
| `scripts/env-health-scan.js` | Phase 1 — data collection (execute, don't read) |
| `${CLAUDE_PLUGIN_ROOT}/references/design-system/mermaid-patterns.md` | Before writing any Mermaid diagram |
| `${CLAUDE_PLUGIN_ROOT}/references/design-system/semantic-tokens.md` | When setting up CSS/Mermaid theme |
| `${CLAUDE_PLUGIN_ROOT}/references/design-system/diagram-type-selection.md` | When deciding diagram type |
| `${CLAUDE_PLUGIN_ROOT}/references/design-system/diagram-density-rules.md` | When a diagram feels complex |
| `${CLAUDE_PLUGIN_ROOT}/references/design-system/anti-slop-tells.md` | While shaping content — to check you're not falling into a behavioral-slop reflex |
| `${CLAUDE_PLUGIN_ROOT}/references/design-system/visual-self-audit.md` | After the gate passes — the render-and-look loop (full procedure) |
