# Environment Health — Grading Criteria

This reference defines the status tiers, thresholds, and recommendation mappings used by
the `environment-health` skill. Every graded threshold cites its source in the official
Claude Code docs — if a number has no official basis, the area is reported as
**observational** (raw data only, no 🟢/🟡/🔴 label).

## Area Types

| Area Type | Output | When Used |
|-----------|--------|-----------|
| **Graded** (6 areas) | 🟢 healthy / 🟡 attention / 🔴 critical + raw numbers | Area has at least one official threshold from Claude Code docs |
| **Observational** (2 areas) | ℹ️ raw numbers + breakdown only (no tier) | Area has no official threshold — grading would be invented |

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

- Total plugins enabled / disabled / stale in cache
- Total active skills / commands / agents
- Per-plugin component counts (sortable)
- List of plugin names still in cache but disabled in settings

**Info-level observations** (not severities): if stale plugins exist in cache, surface a
neutral `ℹ️` note in the recommendations section at info level. No severity assigned, no
tally contribution.

---

### 2. Startup Context Budget — Observational (no aggregate grading)

The scan estimates always-loaded tokens using public formulas. **These are estimates.**
The authoritative source is the `/context` command output (paste into report) or the
`InstructionsLoaded` hook (ground-truth file list). The skill must surface this caveat in
the report.

| Component | Token Cost Model | Source |
|-----------|-----------------|--------|
| System prompt | ~4,200 (illustrative) | context-window page sim |
| Auto memory (MEMORY.md) | bytes / 4, capped at first 200 lines or 25KB | memory page |
| Environment info | ~280 (illustrative) | context-window page sim |
| MCP tool names | ~120 baseline when deferred; see `ENABLE_TOOL_SEARCH` below | mcp page |
| Skill/command descriptions | post-truncation total_chars / 4 (respects 250-char cap + effective budget) | skills page |
| CLAUDE.md (all loaded scopes) | total_bytes / 4 | memory page |
| Rules without `paths:` | total_bytes / 4 | memory page |

**Environment variables that change the calculation** (scan reads these from
`env_and_settings`):

- `ENABLE_TOOL_SEARCH=auto` → MCP schemas load upfront if ≤10% of context. Add
  `~5,000 tokens × server_count` to MCP cost (estimate)
- `ENABLE_TOOL_SEARCH=false` → all MCP schemas loaded. Same add-on, but unconditional
- `CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD=1` → include CLAUDE.md files from
  `--add-dir` paths
- `claudeMdExcludes` (any settings layer) → exclude matching paths from CLAUDE.md total
- `CLAUDE_CODE_DISABLE_AUTO_MEMORY=1` → zero out MEMORY.md cost

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

### 3. Skill Description Obesity — Graded

**Official budget** ([skills.md — "Skill descriptions are cut short"](https://code.claude.com/docs/en/skills)):

> "The budget scales dynamically at **1% of the context window**, with a **fallback of
> 8,000 characters**."
>
> "each entry is capped at **250 characters** regardless of budget"
>
> "To raise the limit, set the `SLASH_COMMAND_TOOL_CHAR_BUDGET` environment variable"

**Effective budget formula** (scan uses this):

```
effective_budget = env.SLASH_COMMAND_TOOL_CHAR_BUDGET
                 ?? max(8000, floor(context_window * 0.01))
```

For a standard 200K window with no override: `max(8000, 2000) = 8000 chars`.
For a 1M window with no override: `max(8000, 10000) = 10000 chars`.

| Status | Condition |
|--------|-----------|
| 🟢 healthy | Total desc < 60% of effective budget AND no entries exceed 250-char cap |
| 🟡 attention | Total desc 60-90% of effective budget OR 1-2 entries over 250-char cap (truncated in listing) |
| 🔴 critical | Total desc ≥ 90% of effective budget OR 3+ entries truncated |

**Always report:**

- Total desc chars, effective budget, percentage
- List of entries over 250 chars (these are actively being truncated and Claude can't
  see the tail)
- Count of skills with `disable-model-invocation: true` (excluded from this budget
  entirely)

**Levers to suggest** (in priority order):

1. Add `disable-model-invocation: true` to skills users invoke manually (`/commit`,
   `/deploy`) — removes them from the auto-load listing entirely
2. Add `user-invocable: false` for background-knowledge skills that shouldn't be menu
   items
3. Shorten descriptions exceeding 250 chars — front-load the key use case in the first
   sentence

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

### 5. Trigger Collisions — Graded

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

| Status | Condition |
|--------|-----------|
| 🟢 healthy | Subagent returns no DUPLICATE or OVERLAP pairs |
| 🟡 attention | 1-2 OVERLAP pairs |
| 🔴 critical | ≥1 DUPLICATE pair OR 3+ OVERLAP pairs |

**Why subagent instead of inline LLM + Jaccard code:**

- Waza's approach is field-tested — don't reinvent
- Pairwise description data stays isolated in subagent context (no main-session token
  bloat)
- No deterministic code to maintain — the subagent prompt IS the spec
- Paraphrase collisions (e.g. `debug the build` vs `fix compilation errors`) are
  naturally caught by LLM reasoning without needing lexical pre-filter

**Trade-off accepted:** results are not deterministic across runs. If this becomes a
regression source (same environment grades differently on repeat scans), revisit with a
deterministic pre-filter stage — but do NOT add complexity preemptively (YAGNI).

---

### 6. Hook Complexity — Graded

No official thresholds exist for hook counts. The scan flags LLM-cost hooks
(prompt/agent types) because the docs explicitly call these out as different from
command/http.

| Status | Condition |
|--------|-----------|
| 🟢 healthy | No prompt/agent hooks AND no event collisions |
| 🟡 attention | 1-2 prompt/agent hooks (each invocation costs an LLM call) OR 1 event collision |
| 🔴 critical | 3+ prompt/agent hooks OR multiple event collisions (unpredictable ordering) |

Always report: total hook count, type breakdown, event collision list. Hook count alone
is not graded — a project can have 20 command hooks with zero runtime impact.

---

### 7. MCP Overview — Graded

Per [costs page](https://code.claude.com/docs/en/costs): MCP tool schemas are deferred
by default; prefer CLI alternatives for efficiency. No official thresholds for server
count exist.

The scan respects `ENABLE_TOOL_SEARCH`:

- `deferred` (default): only tool names in context (~120 baseline + small per-server
  overhead)
- `auto`: schemas load upfront if ≤10% of context
- `false`: all schemas loaded upfront

| Status | Condition |
|--------|-----------|
| 🟢 healthy | `ENABLE_TOOL_SEARCH` is deferred/auto AND total server count is reasonable (report raw number) |
| 🟡 attention | `ENABLE_TOOL_SEARCH=auto` AND schemas actually load (≤10% threshold met with pressure) |
| 🔴 critical | `ENABLE_TOOL_SEARCH=false` (all schemas always loaded) |

Always report: server count, source scopes, effective loading mode, estimated token
surface if non-deferred.

---

### 8. CLAUDE.md + Memory Health — Graded

**Official recommendation** ([memory.md](https://code.claude.com/docs/en/memory)):
"target under 200 lines per CLAUDE.md file". MEMORY.md: "The first 200 lines of
MEMORY.md, or the first 25KB, whichever comes first, are loaded".

| Status | Condition |
|--------|-----------|
| 🟢 healthy | All CLAUDE.md files ≤ 200 lines AND MEMORY.md ≤ 50% of 25KB cap |
| 🟡 attention | Any CLAUDE.md file 200-300 lines OR MEMORY.md 50-90% of cap |
| 🔴 critical | Any CLAUDE.md > 300 lines OR MEMORY.md at/over 25KB (tail is silently dropped) |

Content past the 25KB cap is silently dropped from context — the scan must warn when
MEMORY.md exceeds it.

---

## Overall Summary

**No single letter grade.** The report shows:

1. **Status tally** across the **6 graded areas**, with observational areas listed
   separately:
   e.g. `Graded: 5 🟢 / 1 🟡 / 0 🔴 (6 areas) · Observational: Plugin Inventory, Context Budget`.
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
