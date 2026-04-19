# context-health-visual Absorb `toolbox/health` — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL — use `superpowers:executing-plans` or
> `superpowers:subagent-driven-development` to run this task-by-task. Steps use
> checkbox (`- [ ]`) syntax.

**Goal:** Absorb two features from `toolbox/health` (skill security scan + hook
schema validation) into `vision-powers/context-health-visual`, delete `toolbox/health`
entirely, and update all README/marketplace surfaces.

**Status:** Planning complete. Implementation deferred to next session.

> **Review note (2026-04-19):** Revalidated after vision-powers v4.0.0 landed.
> Version strategy bumped to `4.0.0 → 4.1.0`, marketplace description handling
> clarified (append to existing 6-skill list, don't rewrite), and
> `CHANGELOG.md` update added to the file list + checklist. Core absorb work
> still untouched; all gotchas and target files remain valid.

---

## Background & Decision Context

### Comparison between two skills

| Scope | `toolbox/health` (v1.5.0) | `vision-powers/context-health-visual` |
|---|---|---|
| Trigger | `disable-model-invocation: true` (manual) | Auto-triggered + explicit phrases |
| Data collection | Inline bash block + jsonl conversation extraction | Node scanner `env-health-scan.js` |
| Verdict basis | Project tier (Simple/Standard/Complex) | Docs-cited thresholds (1%, 1,536, 5K/25K, etc.) |
| Output | Inline markdown with 🔴/🟡/🟢 | HTML dashboard (default), md option |
| Scope | **User environment audit** | **User environment audit** (same scope) |

Both are user-environment scope. They differ in *axis* — `health` is a
6-layer qualitative audit with tier calibration; `context-health-visual` is a
quantitative docs-cited diagnostic.

### Origin

`toolbox/health` is a **fork of `Waza/health`** (external repo in
`references/Waza/`). Same 6-layer framework, same tier system, same two-agent
architecture, same stop condition phrasing. Waza is at v3.10.0 (more mature); the
toolbox copy is v1.5.0.

### 8 unique features of `health` vs `context-health-visual`

| # | Feature | Absorb? |
|---|---|---|
| 1 | Skill security scan (6 pattern categories) | ✅ **Yes** |
| 2 | Hook schema validation | ✅ **Yes** |
| 3 | 3-layer defense consistency | ❌ No — grep-based, high false-positive rate |
| 4 | Conversation-based behavior audit (jsonl) | ❌ No — privacy-sensitive, expensive, requires subagent, conflicts with "counts/sizes only" privacy rule |
| 5 | Project tier (Simple/Standard/Complex) | ❌ No — dropped in favor of docs-cited thresholds |
| 6 | `CLAUDE.md` content quality (build/test commands, Verification section) | ❌ No — subjective, body-bloat risk |
| 7 | allowedTools hygiene (sudo, stale migrations) | ❌ No — defer to separate skill; partially overlaps with §9 plugin components |
| 8 | verifiers layer / `HANDOFF.md` / `rules/` content quality | ❌ No — structural opinions, body-bloat risk |

Also considered but **rejected**:
- **MCP Live Check** (Waza-unique, not in toolbox): requires runtime MCP tool
  invocation — needs arbitrary `allowed-tools` expansion, has side-effect risk
  (auth popups, rate limits), and is architecturally a different kind of check
  (live integration vs static analysis). Deferred; could be a separate skill
  (`/mcp-ping`) later.

### Why these 2 features fit

Both are **pure static analysis** — file reads + regex/JSON checks. This matches
`context-health-visual`'s design philosophy (scan → analyze → report) and does
not require new permissions or privacy gates.

---

## Files to Modify / Create / Delete

### Modify

- `plugins/vision-powers/skills/context-health-visual/scripts/env-health-scan.js`
  - Add `scanSkillSecurity(enabledPlugins, activeInstallPaths)` — returns
    `{scanned_count, findings, skills_with_findings, counts_by_severity,
    counts_by_category}`
  - Extend `scanHookInventoryDetailed` to track `schema_issues`:
    missing matcher on `PreToolUse`/`PostToolUse`, missing `command` on
    command-type hooks, unknown `type` values
  - Wire `skill_security` into the main result object
- `plugins/vision-powers/skills/context-health-visual/SKILL.md`
  - Document new checks in Phase 2 analysis
  - Add Gotchas: security scan false-positive handling (see "Gotchas discovered
    in session" below)
- `plugins/vision-powers/skills/context-health-visual/references/section-structure.md`
  - Insert new section `skill_security` at **§9** (immediately before
    Recommendations). **Renumber** existing `§9 Recommendations` → `§10`. Shape:
    `{area_type: "graded", status, scanned_count, counts_by_severity,
    counts_by_category, findings: [{plugin, skill, category, severity,
    confidence, line_number, excerpt}]}`
  - Extend `hooks_and_mcp.hooks` with `schema_issues` array and
    `schema_issue_counts` object (§7 stays **observational** — see
    health-criteria.md guidance below)
- `plugins/vision-powers/skills/context-health-visual/references/health-criteria.md`
  - Document grading for the new §9 Skill Security Scan:
    - Grade counts only findings with `confidence: uncertain` or `suspicious`
      (collapsed-by-default `safe`/`likely_safe` findings don't drive the grade).
    - 🟢 no qualifying findings
    - 🟡 only `obfuscation` / `safety_override` qualifying findings
    - 🔴 any `prompt_injection` / `data_exfil` / `destructive` /
      `hardcoded_credential` qualifying finding
    - Note: grading is not docs-cited (this is a security baseline check, not a
      performance threshold — the area-type exception is documented inline)
  - Hook schema issues (in §7 Hooks & MCP): **§7 stays observational.** Do not
    promote to graded. Rationale: there is no docs-cited threshold for hook
    count/shape — consistent with the existing grading philosophy. Render
    schema issues as info/warning notes beside the hook counts; they do not
    contribute to a 🟢/🟡/🔴 verdict.
- `plugins/vision-powers/README.md`
  - Extend `context-health-visual` row to mention **skill security scan** and
    **hook schema validation**
- `plugins/toolbox/README.md`
  - Remove `health` row from Features table
  - Update the "Only `gemini-fetch` and `sync-references` auto-trigger..." sentence
    to reflect removed skill
  - Remove `/health` from Usage section
- `README.md` (repo root)
  - Update toolbox description in "Plugins › Release-ready" table: change "Six
    small skills" → "Five small skills" and remove the audit/security-scan
    mention
- `.claude-plugin/marketplace.json`
  - `toolbox`: bump version (see Version Strategy below), description unchanged
    (generic already)
  - `vision-powers`: bump minor version (4.0.0 → 4.1.0). Current description
    already lists 6 skills (`doc-visual, diff-visual, plugin-visual,
    context-health-visual, fact-check, report-manager`) — **keep the existing
    list intact** and append a phrase mentioning skill security scan + hook
    schema validation for `context-health-visual`. Do not rewrite from the
    pre-v4 description in this plan's first draft.
- `plugins/vision-powers/.claude-plugin/plugin.json`
  - Description mirrors marketplace.json
  - Add keywords: `security-scan`, `hook-validation`
- `plugins/vision-powers/CHANGELOG.md`
  - Add `## 4.1.0 — <date>` entry above the existing `4.0.0` entry. Sections:
    `### Added` (skill security scan, hook schema validation),
    `### Removed` (note that the separate `toolbox/health` skill is retired and
    partially absorbed here), `### Tested against` (current Claude Code version)

### Delete

- `plugins/toolbox/skills/health/` — entire directory

### Create (optional)

- A short entry in `docs/INDEX.md` and/or `docs/reference/gotchas.md` noting that
  `toolbox/health` was retired and its functionality partially absorbed into
  `context-health-visual` — helps future maintainers who grep for `/health`.

---

## Gotchas Discovered in Session

### 1. Security scan has noisy false positives

Initial implementation test against current environment surfaced 18 critical
findings, most of which were false positives:

- `Bash(rm -rf /tmp/plugin-visual-*)` in `allowed-tools:` frontmatter — scoped
  tempdir cleanup, not destructive
- `curl -s -X POST "http://localhost:$PORT/..."` in `claw-mo` — local API call,
  not data exfiltration
- `grep -inE '(you are now|pretend you are|...)'` in `toolbox/health` itself —
  scanner *describing* a pattern, not *using* one
- Documentation bullets inside SKILL.md that enumerate patterns (Waza-style
  security audit docs)

**Decision: annotate-only, never hard-exclude.** Every finding stays in the
output; heuristics only adjust a `confidence` field. This preserves audit
transparency — nothing silently disappears, and the report UI can collapse
low-risk findings by default.

Each finding carries a `confidence` enum: `safe` | `likely_safe` | `uncertain`
| `suspicious`. Heuristics that promote a finding toward `safe` / `likely_safe`:

a. **Temp-path annotation** — path starts with `/tmp/`, `/var/folders/`,
   `/var/tmp/` → `confidence: safe` (benign cleanup is the common case, but a
   path-traversal variant like `/tmp/../../etc` is still shown).

b. **Loopback-host annotation** — target is `localhost`, `127.0.0.1`,
   `0.0.0.0` → `confidence: safe` (local-only traffic).

c. **YAML-frontmatter annotation** — line is `allowed-tools:`, `matcher:`, or
   similar metadata → `confidence: safe` (declaration, not execution).

d. **Scanner-self-reference annotation** — line contains `grep -`, `ripgrep`,
   `re.compile`, or similar detection constructs → `confidence: likely_safe`
   (meta-mention — describing a pattern, not using it).

When multiple heuristics apply to a single finding, take the **lowest confidence
level** (most cautious). Example: a line matching both (a) `/tmp/` and (d)
`grep -` resolves to `likely_safe`, not `safe`.

Rendering contract for the report:
- `safe` and `likely_safe` → collapsed by default, surfaced via "show N low-risk
  findings" toggle.
- `uncertain` → shown with neutral styling.
- `suspicious` (no mitigating heuristic applied) → shown prominently with
  severity color.

### 2. Self-reference — context-health-visual's own SKILL.md triggers

Because `context-health-visual` documents its own security categories in
Gotchas, its own SKILL.md body will get flagged.

**Decision: explicit self-exclude by skill name.** The scanner skips any skill
where the frontmatter `name:` value equals `context-health-visual`. Scope is
**this skill only** — other `vision-powers` skills (plugin-visual, doc-visual,
fact-check, etc.) remain in-scope so legitimate findings surface if they ever
documenting security patterns. If that happens later, handle per-skill rather
than widening to the whole plugin.

### 3. Local skill detection path

The scanner handles `~/.claude/plugins/cache/<marketplace>/<plugin>/...` but
local skills live under `.claude/skills/` and `~/.claude/skills/`. Make sure
both are scanned — local installs are the highest-risk surface (hand-edited,
copy-pasted from internet).

### 4. Hook schema — matcher semantics vary by event

Not all events support matchers. `PreToolUse` / `PostToolUse` match tool names
(`Edit|Write`). `SessionStart` / `UserPromptSubmit` / `Stop` etc. don't use
matchers. Flag missing matcher ONLY for tool-gated events to avoid noise.

Per hooks.md, the full list of tool-matcher events is: `PreToolUse`,
`PostToolUse`. (If the docs add more tool-gated events later, update this
list.)

### 5. Settings.local.json may not exist

If the project has no `settings.local.json`, that's normal. Don't flag empty
hook inventory as an issue.

### 6. `toolbox/health` is a `Waza/health` fork — possibly useful signal

Waza v3.10.0 has extra features that toolbox copy lacks:
- **MCP Live Check** (Step 1b) — deferred for this plan
- **Fallback logic** (agent failure → local analysis)
- **Separate agent files** (cleaner structure)

If we later decide to build a `/mcp-ping` or similar, Waza's Step 1b is the
reference.

---

## Version Strategy

- **`toolbox`**: 1.13.0 → **1.14.0** (minor bump)
  - Rationale: removing `/health` is technically breaking for users who typed
    that command directly, but the functionality moves to `context-health-visual`
    which is already in the marketplace. Realistic user impact is low.
  - **Alternative:** major bump (2.0.0) if strict semver preferred. Note in
    release notes either way: "`/health` retired, see
    `vision-powers:context-health-visual` for the replacement."
- **`vision-powers`**: 4.0.0 → **4.1.0** (minor bump)
  - New functionality: skill security scan, hook schema validation. Backward
    compatible — existing report structure extended, not broken.
  - Note: v4.0.0 (2026-04-19) landed independently — `doc-visual` added,
    `plan-visual` + `project-recap-visual` removed, Layer 0 design system
    restructured. This plan's absorb work was not part of v4.0.

---

## Implementation Checklist

### Scanner (env-health-scan.js)

- [ ] Add `scanSkillSecurity()` with 6 pattern categories (prompt_injection,
      data_exfil, destructive, hardcoded_credential, obfuscation, safety_override)
- [ ] Attach a `confidence` enum (`safe | likely_safe | uncertain |
      suspicious`) to every finding; never hard-delete
- [ ] Implement heuristics: temp-path → `safe`, loopback → `safe`,
      frontmatter line → `safe`, scanner-self-reference → `likely_safe`
- [ ] When multiple heuristics apply, take the lowest (most cautious)
      confidence level
- [ ] Skip scanning `context-health-visual` itself (self-exclude by skill
      `name:` frontmatter value)
- [ ] Include local skills (`~/.claude/skills/`, `./.claude/skills/`) in the
      scan
- [ ] Extend `scanHookInventoryDetailed`: track missing matcher on
      PreToolUse/PostToolUse, missing command on command hooks, unknown types
- [ ] Wire `skill_security` into main result object
- [ ] Smoke test: `node env-health-scan.js --window-size=200000` outputs valid
      JSON with both new fields

### SKILL.md & references

- [ ] Insert §9 `skill_security` in `section-structure.md`; renumber existing
      `§9 Recommendations` → `§10`
- [ ] Extend `hooks_and_mcp.hooks` schema with `schema_issues` /
      `schema_issue_counts`
- [ ] Add §9 grading to `health-criteria.md` (document the docs-source
      exception — area graded on confidence-filtered findings, not thresholds)
- [ ] Document §7 hook schema issues as observational notes (not graded)
- [ ] Update SKILL.md Phase 2 to reference new sections
- [ ] Add new Gotchas to SKILL.md: false-positive handling, self-exclusion,
      matcher-event scope

### README & marketplace

- [ ] `plugins/vision-powers/README.md` — extend context-health-visual row
- [ ] `plugins/vision-powers/.claude-plugin/plugin.json` — update description +
      keywords
- [ ] `plugins/toolbox/README.md` — remove health row, fix Usage section, fix
      "auto-trigger" sentence
- [ ] `README.md` — fix toolbox row ("Six small skills" → "Five small skills",
      remove audit mention)
- [ ] `.claude-plugin/marketplace.json` — bump both plugin versions
      (toolbox `1.13.0 → 1.14.0`, vision-powers `4.0.0 → 4.1.0`) + append
      security-scan/hook-validation phrase to vision-powers description (keep
      existing 6-skill list intact)
- [ ] `plugins/vision-powers/CHANGELOG.md` — add `4.1.0` entry above existing
      `4.0.0` entry

### Deletion

- [ ] `rm -rf plugins/toolbox/skills/health`

### Validation

- [ ] `unset CLAUDECODE && claude plugin validate .` — both plugins pass
- [ ] Run `context-health-visual` end-to-end in a test session; verify both new
      sections render in HTML and markdown modes
- [ ] Spot-check security findings: expect zero false positives in a clean
      environment, known patterns surface correctly in a seeded test

---

## Out-of-Scope (Not Doing)

- 3-layer defense consistency check
- Conversation-based behavior audit (jsonl)
- Project tier calibration
- CLAUDE.md content quality heuristics
- allowedTools hygiene
- `rules/` / `HANDOFF.md` / `verifiers` checks
- MCP Live Check (could be a separate `/mcp-ping` skill later)
- Migration tool / deprecation shim for `/health` users (marketplace users will
  see it disappear on next update; release notes suffice)

---

## Session Handoff Notes

- Conversation summary and all decisions live in this plan document.
- Current `env-health-scan.js` is unchanged from pre-session state (any
  experimental edits were reverted).
- Next session should start by re-reading this plan + the two source files
  (`references/Waza/skills/health/SKILL.md` and the original
  `plugins/toolbox/skills/health/SKILL.md` for regex patterns), then proceed
  through the checklist.
- Original `toolbox/health/SKILL.md` is still on disk until the deletion step —
  useful as a reference for exact regex patterns.
