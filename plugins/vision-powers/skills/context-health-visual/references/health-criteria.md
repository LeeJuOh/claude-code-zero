# Environment Health — Grading Criteria

This reference defines the status tiers, thresholds, and recommendation mappings used by
the `context-health-visual` skill. Every graded threshold cites its source in the official
Claude Code docs — if a number has no official basis, the area is reported as
**observational** (raw data only, no 🟢/🟡/🔴 label).

## Area Types

| Area Type | Output | When Used |
|-----------|--------|-----------|
| **Graded** (5 areas — §3, §4a, §4b, §7, §8) | 🟢 healthy / 🟡 attention / 🔴 critical + raw numbers | Area has at least one official threshold from Claude Code docs |
| **Observational** (5 areas — §1, §2, §5, §6, §9) | ℹ️ raw numbers + breakdown only (no tier) | Area has no official threshold — grading would be invented |

**Tier definitions for graded areas:**

| Status | Meaning |
|--------|---------|
| 🟢 healthy | Below documented thresholds with headroom |
| 🟡 attention | Approaching a documented limit (≥70% of a cited budget) or 1 minor violation |
| 🔴 critical | At or over a documented limit, or a hard violation |

**Threshold rules:**

1. Every graded threshold MUST cite its source (`docs/en/<page>#<anchor>`)
2. If a number has no official basis, it is reported as **observational** — raw data only
3. Always include the raw number + percentage alongside any status emoji

---

## Per-Area Scoring

### 1. Plugin/Skill Inventory — Observational (no grading)

No official source defines a ceiling for plugin count or stale-cache tolerance. Per the
threshold rules, this area does NOT assign 🟢/🟡/🔴 — it reports raw numbers only. User
judgement applies.

**Always report** (raw, no status emoji):

- Total plugins enabled / disabled / stale in cache / **orphaned in cache** (separate
  count — old versions remaining on disk that no `installed_plugins.json` installPath
  points at). Per plugins-reference.md, Claude Code keeps old plugin versions in the
  cache for a **7-day grace period** after an update before cleaning them up.
- Total active skills / commands / agents
- Per-plugin component counts (sortable)
- Per-plugin option keys pulled from `pluginConfigs[<id>].options` — **keys only, no
  values** (plugins-reference.md notes options can carry sensitive data by design)
- List of plugin names still in cache but disabled in settings

**Info-level observations** (not severities): if stale or orphaned plugins exist in
cache, surface a neutral `ℹ️` note in the recommendations section at info level. No
severity assigned, no tally contribution. Orphans inside the 7-day window are a normal
artifact of recent updates — call that out so users don't rush to clean them up.

---

### 2. Startup Context Budget — Observational (no aggregate grading)

The scan estimates always-loaded tokens using public formulas. **These are estimates.**
The authoritative source is the `/context` command output (paste into report) or the
`InstructionsLoaded` hook (ground-truth file list). The skill must surface this caveat in
the report.

| Component | Token Cost Model | Source |
|-----------|-----------------|--------|
| System prompt | approximate (no published constant) — run `/context` for ground truth | context-window page |
| Auto memory (MEMORY.md) | bytes / 4, capped at first 200 lines or 25KB | memory page |
| Environment info | approximate (no published constant) — run `/context` for ground truth | context-window page |
| MCP tool names | varies with `ENABLE_TOOL_SEARCH` mode (see §7) — run `/context` for actual tokens | mcp page |
| Skill/command descriptions | post-truncation total_chars / 4 (respects 1,536 per-entry cap + effective budget) | skills page |
| CLAUDE.md (all loaded scopes) | total_bytes / 4 | memory page |
| Rules without `paths:` | total_bytes / 4 | memory page |

**Environment variables that change the calculation** (scan reads these from
`env_and_settings`):

- `ENABLE_TOOL_SEARCH` affects MCP schema loading mode — see §7 for the full 5-value
  table (`unset` / `true` / `auto` / `auto:<N>` / `false`) and proxy fallback. Schema
  token cost has **no published constant**; the scan reports the mode, and `/context`
  gives the actual tokens loaded
- `ANTHROPIC_BASE_URL` — when set to a non-first-party endpoint (not `anthropic.com`
  or `claude.com`), an unset `ENABLE_TOOL_SEARCH` flips from deferred to upfront
  (proxy fallback, per mcp.md)
- `CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD=1` → include CLAUDE.md files from
  `--add-dir` paths
- `claudeMdExcludes` (any settings layer) → exclude matching paths from CLAUDE.md total
- `CLAUDE_CODE_DISABLE_AUTO_MEMORY=1` → zero out MEMORY.md cost
- `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` → enables agent teams (info-level note
  only, no grading — see §9)

**Output — Observational (no aggregate grading):**

This area does NOT assign 🟢/🟡/🔴 to the aggregate startup load. The previous
5% / 10% thresholds were the scan's own invention without official basis, so they are
dropped per the threshold rules.

Instead, §2 operates as a **dashboard**:

1. Raw estimated startup load in tokens + percentage of the session's context window
2. Per-component breakdown (system prompt, memory, env info, MCP names, skill descs,
   CLAUDE.md, rules)
3. Relative weight of each component (for spotting the biggest lever — a purely
   descriptive observation, no severity)
4. Estimate caveat prominently displayed: _"Values are estimates. Run `/context` for
   ground truth."_

**Status delegation** — individual components with official thresholds are graded by the
area that owns them, not here:

| Component | Owner area | Official threshold |
|-----------|-----------|-------------------|
| CLAUDE.md size | §8 | 200-line target per file |
| Skill description total | §3 | 1% of window / 8K fallback |
| SKILL.md body at-rest | §4a | 500 lines per file |
| SKILL.md post-compact budget | §4b | 5K per skill / 25K total |
| MCP schema loading mode | §7 | `ENABLE_TOOL_SEARCH` behavior |
| MEMORY.md | §8 | 25KB / 200-line cap |

§2 **references** these gradings in the dashboard view (e.g. "CLAUDE.md is 58% of
startup load — graded 🔴 critical in §8") without duplicating the logic.

---

### 3. Skill Description Obesity — Graded (three axes)

Skill description loading has **three independent mechanisms** per `skills.md`. Each axis
is evaluated separately; the overall area grade is the worst status across the three.

**Official citations** (all from [skills.md](https://code.claude.com/docs/en/skills)):

> "the combined `description` and `when_to_use` text is truncated at **1,536 characters**
> in the skill listing to reduce context usage." (frontmatter reference)

> "each entry's combined text is capped at **1,536 characters** regardless of budget"
> (troubleshooting — "Skill descriptions are cut short")

> "The budget scales dynamically at **1% of the context window**, with a **fallback of
> 8,000 characters**."

> "To raise the limit, set the `SLASH_COMMAND_TOOL_CHAR_BUDGET` environment variable"

> "`disable-model-invocation: true` … Description not in context, full skill loads when
> you invoke" (frontmatter table)

**Effective budget formula:**

```
effective_budget = env.SLASH_COMMAND_TOOL_CHAR_BUDGET
                 ?? max(8000, floor(context_window * 0.01))
```

For a 200K window with no override: `max(8000, 2000) = 8000`.
For a 1M window with no override: `max(8000, 10000) = 10000`.

**Entries counted in the budget:** only skills/commands where
`disable-model-invocation: true` is NOT set. The docs explicitly state those skills are
excluded from the always-loaded listing.

#### Axis A — Per-entry hard cap (1,536-char truncation)

Any single entry whose combined `description` + `when_to_use` exceeds 1,536 characters is
silently truncated in the skill listing. Claude cannot see the tail, which degrades
triggering accuracy.

| Status | Condition |
|--------|-----------|
| 🟢 healthy | No entries over 1,536 chars |
| 🟡 attention | 1 entry over 1,536 chars |
| 🔴 critical | 2+ entries over 1,536 chars |

Report each over-cap entry with `{plugin, skill, combined_chars, overflow_chars}`.

#### Axis B — Total budget saturation

When the sum of combined text across all listing-included entries exceeds
`effective_budget`, every entry is dynamically shortened to fit. Shortening strips
keywords Claude needs to match requests.

| Status | Condition |
|--------|-----------|
| 🟢 healthy | Total combined chars < 70% of effective budget |
| 🟡 attention | Total combined chars 70–100% of effective budget (entries start being trimmed if any growth) |
| 🔴 critical | Total combined chars ≥ 100% of effective budget (all entries are being shortened right now) |

Rationale for 70%: `skills.md` documents budget saturation as a specific failure mode
("descriptions are shortened to fit the character budget, which can strip the keywords
Claude needs"). 70% is a lead-time buffer so users can act before actual truncation
begins — it's a watch threshold, not a documented limit. Raw percentage must always be
reported alongside the tier for transparency.

#### Axis C — Unbalanced consumption (observational)

Even below budget saturation, a few oversize entries can dominate the budget and push
other entries toward trimming. Report:

- The top 5 entries by `combined_chars`
- Each as a percentage of total combined chars
- Flag any entry consuming > 2× the average size (pure observation, no tier)

No official threshold defines "unbalanced", so axis C is **observational** — raw numbers
only, no 🟢/🟡/🔴 label.

**Always report** (for all three axes):

- Total combined chars, effective budget, budget source (env var override / 1% window /
  8K fallback), saturation percentage
- List of entries over 1,536 chars with their `combined_chars` and overflow amount
- Count of skills with `disable-model-invocation: true` (excluded from budget)
- Count of skills with `user-invocable: false` (still in Claude's listing but hidden from
  the `/` menu — no budget effect)

**Levers to suggest** (in priority order):

1. Add `disable-model-invocation: true` to listing-included skills the user invokes
   manually (`/commit`, `/deploy`, `/release`) — removes them from the budget entirely
   per the frontmatter table
2. Trim entries over 1,536 chars — the tail is currently being dropped and Claude can't
   see it
3. For skills with heavy `when_to_use` fields, consolidate examples into the skill body
   and keep only the tightest trigger in the frontmatter
4. Raise `SLASH_COMMAND_TOOL_CHAR_BUDGET` if genuine growth is needed (note: scales with
   context tokens spent on listings — diagnose, don't just raise)

---

### 4. Skill Body (at-rest) + Compact Resilience — Graded

**Two distinct concerns** — the original plan conflated them. Report them separately.

#### 4a. At-rest SKILL.md size (applies to ALL skills)

**Official recommendation** ([skills.md — "Add supporting files" tip](https://code.claude.com/docs/en/skills)):

> "Keep `SKILL.md` under 500 lines. Move detailed reference material to separate files."

| Status | Condition |
|--------|-----------|
| 🟢 healthy | All SKILL.md files ≤ 500 lines |
| 🟡 attention | 1-2 SKILL.md files over 500 lines |
| 🔴 critical | 3+ SKILL.md files over 500 lines |

#### 4b. Post-compact re-injection budget (applies only to INVOKED skills)

**Official behavior** ([skills.md — "Skill content lifecycle"](https://code.claude.com/docs/en/skills)):

> "Claude Code re-attaches the most recent invocation of each skill after the summary,
> **keeping the first 5,000 tokens of each**. Re-attached skills share a **combined
> budget of 25,000 tokens**."
>
> "Unlike the rest of the startup content, **skill descriptions are not re-injected
> after `/compact`**. Only skills you actually invoked get preserved."

This is a **latent risk**, not a current cost. A skill's body size only matters:

1. After a session compacts, AND
2. Only if the skill was invoked in the session

The scan cannot know future invocation patterns, so it reports this as a latent-risk
flag:

| Status | Condition |
|--------|-----------|
| 🟢 healthy | No skills exceed 5K tokens (safe under any invocation pattern) |
| 🟡 attention | 1-2 skills > 5K tokens (will be truncated to first 5K if invoked and session compacts) |
| 🔴 critical | 3+ skills > 5K tokens AND their combined size > 25K (guaranteed compact-budget loss if all invoked together) |

**Levers:** move reference content from SKILL.md body into `references/*.md` files
(loaded on-demand, not counted against either at-rest or compact budget).

---

### 5. Trigger Collisions — Observational (no grading)

**Adopted directly from Waza** (`references/Waza/skills/health/agents/inspector-context.md:113`):

> "Overlapping skill descriptions: compare all skill description fields pairwise. If two
> descriptions share >50% of their non-trivial keywords, flag with the overlapping pair;
> duplicate triggers cause misfired invocations."

**Architecture:** the orchestrator spawns a dedicated subagent
(`agents/trigger-collision-inspector.md`) with the raw description inventory pasted
inline. The subagent performs the pairwise comparison entirely in its own LLM reasoning
— no Jaccard/n-gram pre-filter, no separate LLM re-rank stage, no deterministic scoring
code. This matches Waza's proven approach and keeps main-session context overhead low
(the full description list lives only inside the subagent's context).

**Classifications the subagent returns:**

- **DUPLICATE**: essentially the same trigger intent, Claude picks unpredictably
  (e.g. `commit` vs `git-commit`)
- **OVERLAP**: shared keywords or overlapping scope with partial confusion risk
- **COMPLEMENT**: related but distinguishable — **not reported** as a collision

**Output — observational:** surface the subagent's DUPLICATE/OVERLAP pairs verbatim.
No 🟢/🟡/🔴 tier assignment — the prior "1-2 OVERLAP = 🟡, 3+ = 🔴" thresholds had no
official basis. DUPLICATE pairs carry a clear "Claude picks unpredictably" info note
because that failure mode IS documented in skills.md, but severity is not aggregated.

**Why subagent instead of inline LLM + Jaccard code:**

- Waza's approach is field-tested — don't reinvent
- Pairwise description data stays isolated in subagent context (no main-session token
  bloat)
- No deterministic code to maintain — the subagent prompt IS the spec
- Paraphrase collisions (e.g. `debug the build` vs `fix compilation errors`) are
  naturally caught by LLM reasoning without needing lexical pre-filter

**Trade-off accepted:** results are not deterministic across runs. If this becomes a
regression source, revisit with a deterministic pre-filter stage — but do NOT add
complexity preemptively (YAGNI).

---

### 6. Hook Complexity — Observational (no grading)

No official thresholds exist for hook counts, event collisions, or LLM-cost hook
counts. Per the threshold rules, this area does NOT assign 🟢/🟡/🔴.

**Always report** (raw, no status emoji):

- Total hook count
- Type breakdown (command / http / prompt / agent) — hooks.md calls prompt/agent types
  out as different from command/http because each invocation makes an LLM call. The
  report names this as a per-event runtime cost but does not grade it.
- Event collision list — when two hooks are registered on the same event/matcher
  combination, ordering is unpredictable per hooks.md. Surface the colliding entries
  verbatim; no severity assigned.
- **Inline vs file-based:** hooks declared inline in `plugin.json` (object form of the
  `hooks` field per plugins-reference.md) are counted alongside `hooks/hooks.json`
  files. A plugin can mix both, so totals reflect the union.

---

### 7. MCP Overview — Graded

Per [costs page](https://code.claude.com/docs/en/costs): MCP tool schemas are deferred
by default; prefer CLI alternatives for efficiency. No official thresholds for server
count exist — grading focuses on the loading mode, not the count.

**`ENABLE_TOOL_SEARCH` value table** (per mcp.md):

| Raw value | Effective mode | Threshold | Proxy fallback |
|-----------|----------------|-----------|----------------|
| `(unset)` | `deferred` (default) | — | If `ANTHROPIC_BASE_URL` is non-first-party (not `anthropic.com` / `claude.com`), flips to `upfront` |
| `true` | `deferred` (forced) | — | Not applied — explicit `true` overrides proxy fallback |
| `auto` | `auto` | 10% of context | Not applied |
| `auto:<N>` | `auto` | N% of context | Not applied |
| `false` | `upfront` | — | Not applied (already upfront) |

Any other value is reported verbatim with `effective_mode: "unknown"` so users can
spot typos (e.g. `off`, `enable`).

**Server sources counted in the inventory:**

- `settings.json` (user/project/local) `mcpServers` and `enabledMcpjsonServers`
- Plugin `.mcp.json` files (file-based)
- Plugin `mcpServers` field in `plugin.json` (inline, per plugins-reference.md) —
  these start automatically when the plugin is enabled and count toward the effective
  server list

| Status | Condition |
|--------|-----------|
| 🟢 healthy | Effective mode is `deferred` (default behavior, only tool names in context) |
| 🟡 attention | Effective mode is `auto` OR `deferred` was flipped to `upfront` via proxy fallback OR value is `unknown` (typo) |
| 🔴 critical | Effective mode is `upfront` via explicit `ENABLE_TOOL_SEARCH=false` (all schemas always loaded) |

Always report: raw value, effective mode, threshold (for `auto`), proxy-fallback flag,
server count, source scopes (`user` / `project` / `local` / `plugin:<name>` /
`plugin:<name> (inline)`). Token cost has no published constant — point users to
`/context` for ground truth.

---

### 8. CLAUDE.md + Memory Health — Graded

**Official recommendations** ([memory.md](https://code.claude.com/docs/en/memory)):

- "target under 200 lines per CLAUDE.md file" — single soft target, no harder tier
  documented
- MEMORY.md: "The first 200 lines of MEMORY.md, or the first 25KB, whichever comes
  first, are loaded" — the 25KB / 200-line cap is a **hard cap**; content past it is
  silently dropped from context
- **Per-compact re-injection** (memory.md, "Instructions seem lost after /compact"):
  project-root CLAUDE.md (cwd: `./CLAUDE.md` or `./.claude/CLAUDE.md`) is re-injected
  after `/compact`. **Nested CLAUDE.md** files (below cwd) load lazily when files in
  their subtree are read AND are NOT re-injected after compact. The scan flags them
  as `load_mode: lazy-loaded, compact_resilient: false`.

**CLAUDE.md tier** (soft target: 200 lines):

| Status | Condition |
|--------|-----------|
| 🟢 healthy | All always-loaded CLAUDE.md files ≤ 200 lines |
| 🟡 attention | Any always-loaded CLAUDE.md file > 200 lines (soft target exceeded) |

There is no documented critical tier for CLAUDE.md file size — the 200-line target is
the only explicit threshold. A previous draft assigned 🔴 at >300 lines; that was the
scan's own invention and has been removed. Extremely long always-loaded CLAUDE.md is
still actionable, but severity stays at 🟡 until the docs add a harder limit.

**MEMORY.md tier** (hard cap: 25KB / 200 lines — content past it silently dropped):

| Status | Condition |
|--------|-----------|
| 🟢 healthy | MEMORY.md ≤ 50% of 25KB cap |
| 🟡 attention | MEMORY.md 50-99% of 25KB cap |
| 🔴 critical | MEMORY.md at/over 25KB OR over 200 lines (tail is silently dropped) |

**CLAUDE.md walk scope.** The scan walks from cwd up to the filesystem root (no
`$HOME` boundary — the docs do not specify one, and users with cwd outside `$HOME`
would otherwise see zero files). It also loads `~/.claude/CLAUDE.md`. Nested files
below cwd are enumerated separately under `nested_lines` / `nested_bytes` /
`nested_est_tokens` and do not count toward the always-loaded total.

**Area grade** is the worse of the CLAUDE.md tier and the MEMORY.md tier.

---

### 9. Plugin Components — Observational (no grading)

Beyond skills/commands/agents/hooks/MCP, plugins can ship additional components per
[plugins-reference.md](https://code.claude.com/docs/en/plugins-reference):

- **`bin/`** — executables added to the Bash `PATH` when the plugin is enabled. A
  security-relevant surface: anything the Bash tool can invoke by name.
- **`monitors/monitors.json`** or inline `monitors` — background processes that run
  for the session's lifetime.
- **`.lsp.json`** or inline `lspServers` — LSP subprocesses (persistent).
- **`output-styles/`** — prompt-style overrides.
- **`channels`** (inline only in `plugin.json`) — MCP-bound message injection
  channels.

No official thresholds exist for any of these counts. The scan reports per-plugin and
aggregate totals; `agent_teams_enabled` adds an info note with the pointer to the
[costs page](https://code.claude.com/docs/en/costs) where agent teams' token impact is
documented ("expect significantly higher per-session token usage").

Always report: `{per_plugin: {<name>: {bin, monitors, lsp_servers, output_styles,
channels}}, totals: {...}}`. Observational — no tier assignment.

---

## Overall Summary

**No single letter grade.** The report shows:

1. **Status tally** across the **5 graded areas** (§3, §4a, §4b, §7, §8), with
   observational areas listed separately:
   e.g. `Graded: 4 🟢 / 1 🟡 / 0 🔴 (5 areas) · Observational: Plugin Inventory,
   Context Budget, Trigger Collisions, Hook Complexity, Plugin Components`.
   Observational areas never contribute to the tally — they emit raw data and
   info-level notes only.
2. **Top lever:** the single change with the largest projected savings, computed from
   raw numbers (not from severity)
   - e.g. _"Adding `disable-model-invocation: true` to `deploy`, `commit`, `release`
     frees ~840 chars (10.5%) from always-loaded description budget"_
3. **Raw context load estimate:** _"Estimated startup load ≈ 9,400 tokens (4.7% of 200K
   window)"_ — labeled as estimate, with pointer to `/context` for ground truth

**Why no letter grade** (documented for future maintainers):

- No official source defines A-F thresholds for environment overhead — any bucketing is
  invented
- Real 10+-plugin environments cluster in the middle, making letter grades
  uninformative
- Users want actionable levers and raw numbers, not a report card

---

## Recommendation Templates

For each graded area flagged 🟡 attention or 🔴 critical, generate actionable
recommendations. Observational areas (§1, §2) emit info-level notes only — no severity
assigned, no tally contribution.

| Area | Example Recommendation |
|------|----------------------|
| Description Obesity | "Add `disable-model-invocation: true` to skills X, Y (user-only invocation)" |
| Skill Body Size | "Skills A, B exceed 5K token compact cap — move reference content to bundled files" |
| Hook Complexity | "3 prompt/agent hooks detected (LLM call per event) — consider converting to command hooks" |
| CLAUDE.md Size | "CLAUDE.md is 342 lines — move specialized instructions to .claude/rules/ or skills" |
| MCP Overhead | "7 MCP servers configured — disable unused servers via /mcp, prefer CLI alternatives" |
| Trigger Collision | "Skills 'foo' and 'bar' have 78% description overlap — differentiate trigger phrases" |
