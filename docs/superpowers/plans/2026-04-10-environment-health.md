# Environment Health Skill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an `environment-health` skill to vision-powers that diagnoses the user's Claude Code environment health — plugin/skill inventory, context budget, trigger collisions, hook complexity, MCP overhead, and CLAUDE.md/memory health — and outputs an interactive HTML dashboard or inline markdown report.

**Architecture:** Data collection via Node.js script (`env-health-scan.js`), orchestrated by SKILL.md that runs the script, analyzes results, and delegates HTML report generation to the existing vision-powers pipeline (visual-report-writer → render-sections.js → assemble-report.js). The scan script extends the existing `env-fit-scan.js` pattern but operates on the entire environment instead of evaluating one plugin.

**Tech Stack:** Node.js (scan script), Mermaid (diagrams), Chart.js (charts), HTML/CSS/JS (report template)

---

## Background & Research Summary

### Official Documentation Basis

All diagnostic criteria are grounded in official Claude Code docs:

| Source | Key Numbers |
|--------|-------------|
| [context-window](https://code.claude.com/docs/en/context-window) | Example startup load from page sim: System ~4.2K, memory ~680, env ~280, MCP names ~120, skill desc ~450, CLAUDE.md ~320+1,800 tokens. **Illustrative only — these are sim values, not fixed invariants** |
| [memory](https://code.claude.com/docs/en/memory) | MEMORY.md: first 200 lines or 25KB. CLAUDE.md: target under 200 lines. `claudeMdExcludes` setting (any settings layer) skips specific files. `CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD=1` loads CLAUDE.md from `--add-dir` paths |
| [skills](https://code.claude.com/docs/en/skills) | SKILL.md: keep under 500 lines (at-rest recommendation). Description: **250 chars/entry cap, front-loaded**. Desc total budget: **1% of context window, 8,000-char fallback** — raise via `SLASH_COMMAND_TOOL_CHAR_BUDGET`. Post-compact: 5K tokens/skill, 25K total shared, **invoked skills only** — descriptions are NOT re-injected |
| [costs](https://code.claude.com/docs/en/costs) | `/cost`, `/context`, `/mcp` commands. CLI > MCP for efficiency |
| [hooks](https://code.claude.com/docs/en/hooks) | 27 events. 4 types (command/http/prompt/agent). prompt/agent = LLM call cost. Output cap: 10K chars. Timeouts: cmd 600s, prompt 30s, agent 60s. **`InstructionsLoaded` hook** can log exactly which instruction files loaded — use as ground-truth option for auditing |
| [mcp](https://code.claude.com/docs/en/mcp) | `ENABLE_TOOL_SEARCH`: `auto` loads MCP schemas upfront if ≤10% of context, `false` loads all schemas. When not deferred, MCP token cost is NOT just `~120` baseline |

### Comparison with Waza /health

| Dimension | Waza /health | environment-health |
|-----------|-------------|-------------------|
| Purpose | Config correctness audit | Environment efficiency/obesity diagnosis |
| Output | Inline text tables | Interactive HTML dashboard + inline md |
| Context analysis | Qualitative | Quantitative (tokens, % of budget, scenarios) |
| Hook analysis | Schema validation | Complexity + LLM-cost hooks + event collision |
| Trigger collision detection | Subagent with pairwise lexical overlap (`inspector-context.md:113`) | **Adopted directly** (subagent with same approach) |
| Behavior patterns | Yes (conversation history) | No (out of scope) |
| Visual dashboard | No | Yes (Chart.js, Mermaid) |

**Adopted from Waza**:
- Layered framework concept (adapted for visualization)
- Severity classification approach
- **Trigger collision detection via subagent** — pairwise description comparison with lexical keyword overlap, delegated to a dedicated subagent. Direct adoption of the technique in `inspector-context.md:113` (">50% of non-trivial keywords"). See Task 5 for the subagent file.

**Not adopted**: behavior pattern audit (requires transcript access, different problem), MCP live check (too slow, available as `--live` opt-in later), project tiering (irrelevant to global environment health).

### 8 Diagnostic Areas

| # | Area | Checks | Data Source |
|---|------|--------|-------------|
| 1 | Plugin/Skill Inventory | Installed/active/disabled plugins, component counts per plugin | env-health-scan.js |
| 2 | Startup Context Budget | always-loaded items (skill desc, rules, CLAUDE.md) vs deferred (MCP tools), respects `ENABLE_TOOL_SEARCH` / `CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD` / `claudeMdExcludes` | script + CLAUDE.md file sizes |
| 3 | Skill Description Obesity | Total desc chars vs **1% budget (8K fallback)**, per-entry **250-char cap** violations, effective budget from `SLASH_COMMAND_TOOL_CHAR_BUDGET`, `disable-model-invocation` unused | script data |
| 4 | Skill Body (at-rest) + Compact Resilience | At-rest: SKILL.md files > 500 lines (official recommendation). Compact risk: estimated post-compact budget usage (5K/skill, 25K total, invoked-only) — reported as latent risk, not current cost | script scans SKILL.md bodies |
| 5 | Trigger Collisions | Skill pairs with similar descriptions that confuse Claude | LLM analysis of descriptions |
| 6 | Hook Complexity | Total hooks, type distribution (command/http vs prompt/agent), event collisions | script parses hooks.json + settings |
| 7 | MCP Overview | Server count, estimated token surface, deferred status | script reads settings.json scopes |
| 8 | CLAUDE.md + Memory Health | CLAUDE.md line count (200-line target), MEMORY.md size vs 25KB cap, @import chain | script reads files |

### Health Status — Graded vs Observational Areas

The plan originally used an A-F grading system. **This was dropped** because:
- No official source defines A-F thresholds for environment overhead — any bucketing is invented
- Real environments (~10+ plugins) concentrate in the middle, making letter grades uninformative
- Users want actionable levers and raw numbers, not a report card

**Two area types** — by design, only areas with official documented thresholds get graded. Areas without any official basis report raw data only (observational). This is a direct consequence of the threshold rules below.

| Area Type | Output | When Used |
|-----------|--------|-----------|
| **Graded** (6 areas) | 🟢 healthy / 🟡 attention / 🔴 critical + raw numbers | Area has at least one official threshold from Claude Code docs |
| **Observational** (2 areas) | ℹ️ raw numbers + breakdown only (no tier) | Area has no official threshold — grading would be invented |

**Tier definitions for graded areas**:

| Status | Meaning |
|--------|---------|
| 🟢 healthy | Below documented thresholds with headroom |
| 🟡 attention | Approaching a documented limit (≥70% of a cited budget) or 1 minor violation (e.g. 1 SKILL.md over 500 lines) |
| 🔴 critical | At or over a documented limit, or a hard violation (e.g. desc entry exceeds 250-char cap and is being truncated) |

**Graded areas** (have official thresholds): Skill Description Obesity (§3), Skill Body + Compact Resilience (§4), Trigger Collisions (§5), Hook Complexity (§6), MCP Overview (§7), CLAUDE.md + Memory Health (§8).

**Observational areas** (no official thresholds): Plugin/Skill Inventory (§1), Startup Context Budget aggregate (§2). Individual components of §2 are graded by the area that owns their official threshold (e.g. CLAUDE.md size is graded in §8, not §2). §2 references those gradings in its dashboard view but does not duplicate the grading logic.

**Threshold rules**:
1. Every graded threshold MUST cite its source (`docs/en/<page>#<anchor>`) in `health-criteria.md`
2. If a number has no official basis, it is reported as **observational** — raw data only, no 🟢/🟡/🔴 label
3. Always include the raw number + percentage alongside any status emoji

The overall report shows a summary line like: _"Graded: 5 🟢 / 1 🟡 / 0 🔴 (6 areas) · Observational: Plugin Inventory, Context Budget · Biggest lever: skill descriptions at 94% of effective budget."_

---

## File Structure

```
plugins/vision-powers/
├── skills/
│   └── environment-health/
│       ├── SKILL.md                              # CREATE — Main skill document
│       ├── scripts/
│       │   └── env-health-scan.js                # CREATE — Environment data collector
│       ├── agents/
│       │   └── trigger-collision-inspector.md    # CREATE — Subagent for trigger collision detection (Waza-adapted)
│       └── references/
│           ├── health-criteria.md                 # CREATE — Status tier criteria + recommendation mapping
│           └── section-structure.md               # CREATE — HTML section structure for 8 sections
├── templates/
│   └── environment-health.html                   # CREATE — HTML report template (8 sections)
├── .claude-plugin/plugin.json                    # MODIFY — Add keywords
├── README.md                                     # MODIFY — Add skill entry
└── (existing shared infra: scripts/render-sections.js, scripts/assemble-report.js,
     scripts/validate-report.js, references/design-system/*, shared/*, agents/visual-report-writer.md)
```

Also modify:
- `.claude-plugin/marketplace.json` → bump vision-powers version
- `plugins/vision-powers/scripts/render-sections.js` → add environment-health section renderer

---

## Task 1: Create `env-health-scan.js`

**Files:**
- Create: `plugins/vision-powers/skills/environment-health/scripts/env-health-scan.js`
- Reference: `plugins/vision-powers/scripts/env-fit-scan.js` (reuse helper patterns)

This is the core data collection script. It extends the existing `env-fit-scan.js` pattern but runs without `--plugin-name` (scans entire environment).

- [ ] **Step 1: Scaffold the script with shared helpers**

Copy utility functions from `env-fit-scan.js` that are needed:
- `expandHome()`, `findFiles()`, `deduplicateByPlugin()`, `mtime()`, `parseFrontmatter()`, `getPluginStates()`, `getActiveInstallPaths()`, `pluginNameFromCachePath()`

```javascript
#!/usr/bin/env node
/**
 * Environment Health Scanner for vision-powers.
 *
 * Scans the user's full Claude Code environment for health diagnostics.
 * Unlike env-fit-scan.js (single-plugin fitness), this scans everything.
 *
 * Usage:
 *   node env-health-scan.js [--json]
 *
 * Exit codes:
 *   0 = success (JSON on stdout)
 */

const fs = require("fs");
const path = require("path");
const os = require("os");

// --- Helpers (same as env-fit-scan.js) ---
function expandHome(p) {
  return p.startsWith("~") ? path.join(os.homedir(), p.slice(1)) : p;
}

function findFiles(dir, testFn, maxDepth = 6, depth = 0) {
  const results = [];
  if (depth > maxDepth) return results;
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return results; }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findFiles(full, testFn, maxDepth, depth + 1));
    } else if (testFn(full, entry.name)) {
      results.push(full);
    }
  }
  return results;
}

function deduplicateByPlugin(paths, getPluginName) {
  const groups = {};
  for (const p of paths) {
    const name = getPluginName(p);
    if (!name) continue;
    if (!groups[name] || mtime(p) > mtime(groups[name])) groups[name] = p;
  }
  return groups;
}

function mtime(p) {
  try { return fs.statSync(p).mtimeMs; } catch { return 0; }
}

function pluginNameFromCachePath(p) {
  const idx = p.indexOf("/cache/");
  if (idx === -1) return null;
  const parts = p.slice(idx + 7).split("/");
  return parts.length >= 2 ? parts[1] : null;
}

function parseFrontmatter(content) {
  const m = content.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!m) return null;
  const fm = m[1];
  let desc = "";
  const multiline = fm.match(/description:\s*[>|]\s*\n((?:[ \t]+.+\n?)+)/);
  if (multiline) {
    desc = multiline[1].split("\n").map(l => l.trim()).filter(Boolean).join(" ");
  } else {
    const quoted = fm.match(/description:\s*["'](.+?)["']/);
    const inline = fm.match(/description:\s*(.+)/);
    if (quoted) desc = quoted[1].trim();
    else if (inline) desc = inline[1].trim();
  }
  const disabled = /disable-model-invocation:\s*true/.test(fm);
  return { description: desc, disabled };
}

function getPluginStates() {
  const state = {};
  const settingsFiles = [
    expandHome("~/.claude/settings.json"),
    ".claude/settings.json",
    ".claude/settings.local.json",
  ];
  for (const sf of settingsFiles) {
    try {
      const data = JSON.parse(fs.readFileSync(sf, "utf-8"));
      for (const entry of data.disabledPlugins || []) {
        const name = String(entry).split("@")[0];
        if (name) state[name] = false;
      }
      if (data.enabledPlugins && typeof data.enabledPlugins === "object") {
        for (const [key, value] of Object.entries(data.enabledPlugins)) {
          const name = String(key).split("@")[0];
          if (name) state[name] = value;
        }
      }
    } catch { /* skip */ }
  }
  const enabled = new Set();
  const disabled = new Set();
  for (const [name, value] of Object.entries(state)) {
    if (value === false) disabled.add(name);
    else enabled.add(name);
  }
  return { enabled, disabled };
}

function getActiveInstallPaths() {
  const regPath = expandHome("~/.claude/plugins/installed_plugins.json");
  try {
    const data = JSON.parse(fs.readFileSync(regPath, "utf-8"));
    const paths = new Set();
    for (const entries of Object.values(data.plugins || {})) {
      for (const e of (Array.isArray(entries) ? entries : [entries])) {
        if (e.installPath) paths.add(e.installPath);
      }
    }
    return paths;
  } catch { return null; }
}

function isUnderActivePath(filePath, activePaths) {
  for (const ap of activePaths) {
    if (filePath.startsWith(ap)) return true;
  }
  return false;
}
```

- [ ] **Step 2: Implement scanners reused from env-fit-scan.js**

Reuse the existing scanner functions unchanged:
- `scanInstalledPlugins(enabledPlugins)` — returns `[{name, description}]`
- `scanInstalledSkills(enabledPlugins, activeInstallPaths)` — returns `{skills, total_desc_chars, disabled_count}`
- `scanInstalledCommands(enabledPlugins, activeInstallPaths)` — returns `{commands, total_desc_chars, disabled_count}`
- `scanLocalSkills()` — returns `{skills, total_desc_chars, disabled_count}`
- `scanHookInventory(enabledPlugins)` — returns `{total, type_counts, project_hooks, plugin_hooks}`
- `scanContextMetrics()` — returns `{mcp_servers}`

Copy these verbatim from `env-fit-scan.js` lines 182-476.

- [ ] **Step 3: Add new scanners unique to environment-health**

```javascript
// --- New Scanners ---

/**
 * Scan SKILL.md body sizes.
 * Reports TWO distinct concerns:
 *   (a) at-rest size — official "keep under 500 lines" recommendation
 *   (b) post-compact risk — latent, only matters if skill is invoked AND session compacts
 */
function scanSkillBodies(enabledPlugins, activeInstallPaths) {
  const cacheBase = expandHome("~/.claude/plugins/cache");
  const allSkills = findFiles(cacheBase, (full, name) => name === "SKILL.md");
  const groups = {};
  for (const smd of allSkills) {
    const pluginName = pluginNameFromCachePath(smd);
    if (!pluginName || !enabledPlugins.has(pluginName)) continue;
    if (activeInstallPaths && !isUnderActivePath(smd, activeInstallPaths)) continue;
    const parts = smd.split("/");
    const skillsIdx = parts.lastIndexOf("skills");
    if (skillsIdx === -1 || skillsIdx + 1 >= parts.length) continue;
    const skillName = parts[skillsIdx + 1];
    const key = `${pluginName}/${skillName}`;
    if (!groups[key] || mtime(smd) > mtime(groups[key])) groups[key] = smd;
  }

  const skills = [];
  let totalBodyChars = 0;
  for (const [key, smdPath] of Object.entries(groups).sort()) {
    const [plugin, skill] = key.split("/");
    try {
      const content = fs.readFileSync(smdPath, "utf-8");
      const bodyMatch = content.match(/^---[\s\S]*?---\s*\n([\s\S]*)$/);
      const body = bodyMatch ? bodyMatch[1] : content;
      const bodyChars = body.length;
      const bodyLines = body.split("\n").length;
      const estTokens = Math.round(bodyChars / 4);
      totalBodyChars += bodyChars;
      skills.push({
        plugin,
        skill,
        body_chars: bodyChars,
        body_lines: bodyLines,
        est_tokens: estTokens,
        // (a) at-rest: official recommendation from skills.md "Add supporting files" tip
        over_500_lines: bodyLines > 500,
        // (b) post-compact re-injection budget (only matters if invoked AND session compacts)
        post_compact_truncation_risk: estTokens > 5000,
      });
    } catch { /* skip */ }
  }

  const totalEstTokens = Math.round(totalBodyChars / 4);
  return {
    skills,
    total_body_chars: totalBodyChars,
    total_est_tokens: totalEstTokens,
    // at-rest counts
    over_500_lines_count: skills.filter(s => s.over_500_lines).length,
    // post-compact latent risk (only realized if all were invoked in one session)
    post_compact_risky_count: skills.filter(s => s.post_compact_truncation_risk).length,
    post_compact_total_over_25k: totalEstTokens > 25000,
  };
}

/** Scan CLAUDE.md files: sizes, line counts, @imports.
 *  Per memory.md, Claude Code loads CLAUDE.md from every ancestor directory from cwd up
 *  to and including $HOME. Walk that chain and collect each CLAUDE.md + .claude/CLAUDE.md
 *  + CLAUDE.local.md along the way. Respect claudeMdExcludes from merged settings layers.
 */
function scanClaudeMd(excludeGlobs = []) {
  const files = [];
  const home = os.homedir();
  const locations = [];
  const seen = new Set();

  // User-global
  const userGlobal = path.join(home, ".claude", "CLAUDE.md");
  if (!seen.has(userGlobal)) {
    locations.push({ path: userGlobal, scope: "user" });
    seen.add(userGlobal);
  }

  // Walk from cwd up to home (inclusive), collecting CLAUDE.md at each level
  let current = path.resolve(process.cwd());
  while (current && (current === home || current.startsWith(home + path.sep))) {
    for (const [relPath, scope] of [
      ["CLAUDE.md", "project"],
      [path.join(".claude", "CLAUDE.md"), "project"],
      ["CLAUDE.local.md", "local"],
    ]) {
      const full = path.join(current, relPath);
      if (!seen.has(full)) {
        locations.push({ path: full, scope });
        seen.add(full);
      }
    }
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }

  // Simple glob → regex for claudeMdExcludes (**, *, ?)
  function matchGlob(filePath, pattern) {
    const rx = new RegExp(
      "^" +
      pattern
        .replace(/[.+^${}()|[\]\\]/g, "\\$&")
        .replace(/\*\*/g, "___DS___")
        .replace(/\*/g, "[^/]*")
        .replace(/___DS___/g, ".*")
        .replace(/\?/g, ".") +
      "$"
    );
    return rx.test(filePath);
  }

  let totalLines = 0;
  let totalBytes = 0;
  const imports = [];
  const excluded = [];

  for (const loc of locations) {
    const isExcluded = excludeGlobs.some(g => matchGlob(loc.path, g));
    if (isExcluded) { excluded.push(loc.path); continue; }
    try {
      const content = fs.readFileSync(loc.path, "utf-8");
      const lines = content.split("\n").length;
      const bytes = Buffer.byteLength(content, "utf-8");
      totalLines += lines;
      totalBytes += bytes;

      // Extract @imports
      const importMatches = content.match(/@[\w.\/~-]+/g) || [];
      for (const imp of importMatches) {
        if (!imp.includes("/") && !imp.includes(".")) continue;
        imports.push({ from: loc.path, target: imp, scope: loc.scope });
      }

      files.push({
        path: loc.path,
        scope: loc.scope,
        lines,
        bytes,
        est_tokens: Math.round(bytes / 4),
        over_200_lines: lines > 200,
      });
    } catch { /* file doesn't exist, skip */ }
  }

  return {
    files,
    total_lines: totalLines,
    total_bytes: totalBytes,
    total_est_tokens: Math.round(totalBytes / 4),
    imports,
    excluded_by_settings: excluded,
  };
}

/** Scan rules directory */
function scanRules() {
  const rulesBases = [
    ".claude/rules",
    expandHome("~/.claude/rules"),
  ];

  const rules = [];
  let alwaysLoadedCount = 0;
  let onDemandCount = 0;
  let totalBytes = 0;

  for (const base of rulesBases) {
    const mdFiles = findFiles(base, (full, name) => name.endsWith(".md"), 3);
    for (const ruleFile of mdFiles) {
      try {
        const content = fs.readFileSync(ruleFile, "utf-8");
        const bytes = Buffer.byteLength(content, "utf-8");
        const hasPaths = /^---[\s\S]*?paths:/m.test(content.slice(0, 500));
        totalBytes += bytes;
        if (hasPaths) {
          onDemandCount++;
        } else {
          alwaysLoadedCount++;
        }
        rules.push({
          path: ruleFile,
          scope: base.startsWith(os.homedir()) ? "user" : "project",
          bytes,
          est_tokens: Math.round(bytes / 4),
          has_paths: hasPaths,
        });
      } catch { /* skip */ }
    }
  }

  return {
    rules,
    always_loaded: alwaysLoadedCount,
    on_demand: onDemandCount,
    total_bytes: totalBytes,
    total_est_tokens: Math.round(totalBytes / 4),
  };
}

/** Scan MEMORY.md health */
function scanMemory() {
  const memoryDir = expandHome("~/.claude/projects");
  // Find the memory directory for the current project
  const cwd = process.cwd();
  const encodedPath = cwd.replace(/\//g, "-");
  const possiblePaths = [
    path.join(memoryDir, encodedPath, "memory", "MEMORY.md"),
  ];

  // Also scan by listing directories that match
  try {
    const dirs = fs.readdirSync(memoryDir);
    for (const d of dirs) {
      const memPath = path.join(memoryDir, d, "memory", "MEMORY.md");
      if (!possiblePaths.includes(memPath)) possiblePaths.push(memPath);
    }
  } catch { /* skip */ }

  // Find the matching MEMORY.md
  for (const mp of possiblePaths) {
    try {
      const content = fs.readFileSync(mp, "utf-8");
      const lines = content.split("\n").length;
      const bytes = Buffer.byteLength(content, "utf-8");
      // Count topic files in the same directory
      const memDir = path.dirname(mp);
      let topicFiles = 0;
      try {
        topicFiles = fs.readdirSync(memDir).filter(f => f !== "MEMORY.md" && f.endsWith(".md")).length;
      } catch { /* skip */ }

      return {
        path: mp,
        lines,
        bytes,
        over_200_lines: lines > 200,
        over_25kb: bytes > 25600,
        pct_of_limit: Math.round((bytes / 25600) * 100),
        topic_files: topicFiles,
      };
    } catch { continue; }
  }

  return { path: null, lines: 0, bytes: 0, over_200_lines: false, over_25kb: false, pct_of_limit: 0, topic_files: 0 };
}

/** Enhanced hook scan with event-level detail and type classification */
function scanHookInventoryDetailed(enabledPlugins) {
  const eventCounts = {};
  const hookTypes = { command: 0, http: 0, prompt: 0, agent: 0 };
  const eventCollisions = []; // same event+matcher from multiple sources
  const allHookEntries = []; // for collision detection
  let total = 0;

  function processHooks(hooks, source) {
    if (!hooks || typeof hooks !== "object") return;
    // Handle both { "hooks": { "PreToolUse": [...] } } and { "PreToolUse": [...] }
    const hookMap = hooks.hooks || hooks;
    for (const [event, matchers] of Object.entries(hookMap)) {
      if (event === "description") continue;
      const list = Array.isArray(matchers) ? matchers : [matchers];
      for (const matcherGroup of list) {
        const matcher = matcherGroup.matcher || "*";
        const handlers = matcherGroup.hooks || [matcherGroup];
        const handlerList = Array.isArray(handlers) ? handlers : [handlers];
        for (const h of handlerList) {
          total++;
          const t = (typeof h === "object" && h.type) ? h.type : "command";
          hookTypes[t] = (hookTypes[t] || 0) + 1;
          eventCounts[event] = (eventCounts[event] || 0) + 1;
          allHookEntries.push({ event, matcher, source, type: t });
        }
      }
    }
  }

  // Project-local hooks (settings.local.json + settings.json)
  for (const sf of [".claude/settings.local.json", ".claude/settings.json"]) {
    try {
      const data = JSON.parse(fs.readFileSync(sf, "utf-8"));
      if (data.hooks) processHooks(data.hooks, "project");
    } catch { /* skip */ }
  }

  // User-global hooks
  try {
    const data = JSON.parse(fs.readFileSync(expandHome("~/.claude/settings.json"), "utf-8"));
    if (data.hooks) processHooks(data.hooks, "user");
  } catch { /* skip */ }

  // Plugin hooks
  const cacheBase = expandHome("~/.claude/plugins/cache");
  const hookFiles = findFiles(cacheBase, (full, name) => name === "hooks.json" && full.includes("/hooks/"));
  const groups = deduplicateByPlugin(hookFiles, pluginNameFromCachePath);
  for (const [plugin, hfPath] of Object.entries(groups).sort()) {
    if (!enabledPlugins.has(plugin)) continue;
    try {
      const data = JSON.parse(fs.readFileSync(hfPath, "utf-8"));
      processHooks(data, `plugin:${plugin}`);
    } catch { /* skip */ }
  }

  // Detect event collisions (same event+matcher from different sources)
  const collisionMap = {};
  for (const entry of allHookEntries) {
    const key = `${entry.event}|${entry.matcher}`;
    if (!collisionMap[key]) collisionMap[key] = [];
    collisionMap[key].push(entry.source);
  }
  for (const [key, sources] of Object.entries(collisionMap)) {
    const unique = [...new Set(sources)];
    if (unique.length > 1) {
      const [event, matcher] = key.split("|");
      eventCollisions.push({ event, matcher, sources: unique });
    }
  }

  return {
    total,
    type_counts: hookTypes,
    event_counts: eventCounts,
    event_collisions: eventCollisions,
    llm_hooks: hookTypes.prompt + hookTypes.agent,
  };
}

/**
 * Scan environment variables and settings that affect context budget calculations.
 * These values change how the scan's own formulas should behave.
 *
 * Caveat: this scan runs as a child `node` process. Env vars the user set in their
 * shell init (e.g. `export SLASH_COMMAND_TOOL_CHAR_BUDGET=...`) are inherited and
 * visible here. Env vars set only inside the Claude Code session (not exported from
 * the parent shell) will NOT be visible. The report must include a note like
 * _"Env-var-based overrides are read from the shell environment — set them in your
 * shell init to be visible to this scan."_ to avoid false negatives.
 */
function scanEnvAndSettings() {
  const env = process.env;

  // Effective skill description budget
  // Default: 1% of context window, fallback 8000 chars
  // Override: SLASH_COMMAND_TOOL_CHAR_BUDGET env var (shell-level only — see caveat)
  const descBudgetOverride = env.SLASH_COMMAND_TOOL_CHAR_BUDGET
    ? parseInt(env.SLASH_COMMAND_TOOL_CHAR_BUDGET, 10)
    : null;

  // MCP schema loading mode
  // auto: loads upfront if ≤10% of context, false: loads all, (unset/other): deferred
  const enableToolSearch = env.ENABLE_TOOL_SEARCH || "deferred";

  // CLAUDE.md from --add-dir
  const addDirClaudeMd = env.CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD === "1";

  // Auto memory disabled?
  const autoMemoryDisabled = env.CLAUDE_CODE_DISABLE_AUTO_MEMORY === "1";

  // claudeMdExcludes from merged settings layers
  const excludeGlobs = new Set();
  for (const sf of [
    expandHome("~/.claude/settings.json"),
    ".claude/settings.json",
    ".claude/settings.local.json",
  ]) {
    try {
      const data = JSON.parse(fs.readFileSync(sf, "utf-8"));
      for (const g of data.claudeMdExcludes || []) excludeGlobs.add(g);
    } catch { /* skip */ }
  }

  return {
    desc_budget_override: descBudgetOverride,
    enable_tool_search: enableToolSearch,
    add_dir_claude_md: addDirClaudeMd,
    auto_memory_disabled: autoMemoryDisabled,
    claude_md_excludes: [...excludeGlobs],
  };
}
```

- [ ] **Step 4: Implement main function and output**

```javascript
function parseArgs() {
  const args = {};
  for (const arg of process.argv.slice(2)) {
    const m = arg.match(/^--([^=]+)(?:=(.*))?$/);
    if (m) args[m[1]] = m[2] ?? true;
  }
  return args;
}

function main() {
  const args = parseArgs();
  // Context window size: the Node process cannot auto-detect the current Claude Code
  // session's window size — the SKILL.md orchestrator determines this from the active
  // model ID (e.g. `claude-opus-4-6[1m]` → 1000000, default → 200000) and passes it in.
  const contextWindowSize = parseInt(args["window-size"] || "200000", 10);

  const { enabled: enabledPlugins, disabled: disabledPlugins } = getPluginStates();
  const activeInstallPaths = getActiveInstallPaths();
  const envSettings = scanEnvAndSettings();

  const result = {
    scan_date: new Date().toISOString().slice(0, 10),
    context_window_size: contextWindowSize,
    env_and_settings: envSettings,
    installed_plugins: scanInstalledPlugins(enabledPlugins),
    disabled_plugins: [...disabledPlugins],
    installed_skills: scanInstalledSkills(enabledPlugins, activeInstallPaths),
    installed_commands: scanInstalledCommands(enabledPlugins, activeInstallPaths),
    local_skills: scanLocalSkills(),
    skill_bodies: scanSkillBodies(enabledPlugins, activeInstallPaths),
    hook_inventory: scanHookInventoryDetailed(enabledPlugins),
    context_metrics: scanContextMetrics(),
    claude_md: scanClaudeMd(envSettings.claude_md_excludes),
    rules: scanRules(),
    memory: scanMemory(),
  };

  console.log(JSON.stringify(result, null, 2));
}

main();
```

- [ ] **Step 5: Test the script manually**

Run: `node plugins/vision-powers/skills/environment-health/scripts/env-health-scan.js | head -100`
Expected: Valid JSON with all sections populated. Verify `installed_plugins` is non-empty, `skill_bodies` has `post_compact_truncation_risk` flags, `claude_md` has file entries with line counts, top-level `context_window_size` is present.

- [ ] **Step 6: Commit**

```bash
git add plugins/vision-powers/skills/environment-health/scripts/env-health-scan.js
git commit -m "feat(vision-powers): add env-health-scan.js for environment health diagnostics"
```

---

## Task 2: Create `health-criteria.md`

**Files:**
- Create: `plugins/vision-powers/skills/environment-health/references/health-criteria.md`

This reference file defines grading criteria, thresholds, and recommendation mappings. The SKILL.md will instruct Claude to read this for the analysis phase.

- [ ] **Step 1: Write the criteria document**

```markdown
# Environment Health — Grading Criteria

## Per-Area Scoring

### 1. Plugin/Skill Inventory — Observational (no grading)

No official source defines a ceiling for plugin count or stale-cache tolerance. Per the plan's threshold rules, this area does NOT assign 🟢/🟡/🔴 — it reports raw numbers only. User judgement applies.

**Always report** (raw, no status emoji):
- Total plugins enabled / disabled / stale in cache
- Total active skills / commands / agents
- Per-plugin component counts (sortable)
- List of plugin names still in cache but disabled in settings

**Info-level observations** (not severities): if stale plugins exist in cache, surface a neutral `ℹ️` note in the recommendations section at info level. No severity assigned, no tally contribution.

### 2. Startup Context Budget

The scan estimates always-loaded tokens using public formulas. **These are estimates.** The authoritative source is the `/context` command output (paste into report) or the `InstructionsLoaded` hook (ground-truth file list). The skill must surface this caveat in the report.

| Component | Token Cost Model | Source |
|-----------|-----------------|--------|
| System prompt | ~4,200 (illustrative) | context-window page sim |
| Auto memory (MEMORY.md) | bytes / 4, capped at first 200 lines or 25KB | memory page |
| Environment info | ~280 (illustrative) | context-window page sim |
| MCP tool names | ~120 baseline when deferred; see `ENABLE_TOOL_SEARCH` below | mcp page |
| Skill/command descriptions | post-truncation total_chars / 4 (respects 250-char cap + effective budget) | skills page |
| CLAUDE.md (all loaded scopes) | total_bytes / 4 | memory page |
| Rules without `paths:` | total_bytes / 4 | memory page |

**Environment variables that change the calculation** (scan reads these from `env_and_settings`):
- `ENABLE_TOOL_SEARCH=auto` → MCP schemas load upfront if ≤10% of context. Add `~5,000 tokens × server_count` to MCP cost (estimate)
- `ENABLE_TOOL_SEARCH=false` → all MCP schemas loaded. Same add-on, but unconditional
- `CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD=1` → include CLAUDE.md files from `--add-dir` paths
- `claudeMdExcludes` (any settings layer) → exclude matching paths from CLAUDE.md total
- `CLAUDE_CODE_DISABLE_AUTO_MEMORY=1` → zero out MEMORY.md cost

**Output — Observational (no aggregate grading)**

This area does NOT assign 🟢/🟡/🔴 to the aggregate startup load. The previous 5% / 10% thresholds were the scan's own invention without official basis, so they're dropped per the plan's threshold rules.

Instead, §2 operates as a **dashboard**:
1. Raw estimated startup load in tokens + percentage of the session's context window
2. Per-component breakdown (system prompt, memory, env info, MCP names, skill descs, CLAUDE.md, rules)
3. Relative weight of each component (for spotting the biggest lever — a purely descriptive observation, no severity)
4. Estimate caveat prominently displayed: _"Values are estimates. Run `/context` for ground truth."_

**Status delegation** — individual components with official thresholds are graded by the area that owns them, not here:

| Component | Owner area | Official threshold |
|-----------|-----------|-------------------|
| CLAUDE.md size | §8 | 200-line target per file |
| Skill description total | §3 | 1% of window / 8K fallback |
| SKILL.md body at-rest | §4a | 500 lines per file |
| SKILL.md post-compact budget | §4b | 5K per skill / 25K total |
| MCP schema loading mode | §7 | `ENABLE_TOOL_SEARCH` behavior |
| MEMORY.md | §8 | 25KB / 200-line cap |

§2 **references** these gradings in the dashboard view (e.g. "CLAUDE.md is 58% of startup load — graded 🔴 critical in §8") without duplicating the logic.

### 3. Skill Description Obesity

**Official budget** ([skills.md — "Skill descriptions are cut short"](https://code.claude.com/docs/en/skills)):

> "The budget scales dynamically at **1% of the context window**, with a **fallback of 8,000 characters**."
> "each entry is capped at **250 characters** regardless of budget"
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

**Always report**:
- Total desc chars, effective budget, percentage
- List of entries over 250 chars (these are actively being truncated and Claude can't see the tail)
- Count of skills with `disable-model-invocation: true` (excluded from this budget entirely)

**Levers to suggest** (in priority order):
1. Add `disable-model-invocation: true` to skills users invoke manually (`/commit`, `/deploy`) — removes them from the auto-load listing entirely
2. Add `user-invocable: false` for background-knowledge skills that shouldn't be menu items
3. Shorten descriptions exceeding 250 chars — front-load the key use case in the first sentence

### 4. Skill Body (at-rest) + Compact Resilience

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

> "Claude Code re-attaches the most recent invocation of each skill after the summary, **keeping the first 5,000 tokens of each**. Re-attached skills share a **combined budget of 25,000 tokens**."
> "Unlike the rest of the startup content, **skill descriptions are not re-injected after `/compact`**. Only skills you actually invoked get preserved."

This is a **latent risk**, not a current cost. A skill's body size only matters:
1. After a session compacts, AND
2. Only if the skill was invoked in the session

The scan cannot know future invocation patterns, so it reports this as a latent-risk flag:

| Status | Condition |
|--------|-----------|
| 🟢 healthy | No skills exceed 5K tokens (safe under any invocation pattern) |
| 🟡 attention | 1-2 skills > 5K tokens (will be truncated to first 5K if invoked and session compacts) |
| 🔴 critical | 3+ skills > 5K tokens AND their combined size > 25K (guaranteed compact-budget loss if all invoked together) |

**Levers**: move reference content from SKILL.md body into `references/*.md` files (loaded on-demand, not counted against either at-rest or compact budget).

### 5. Trigger Collisions

**Adopted directly from Waza** (`references/Waza/skills/health/agents/inspector-context.md:113`):

> "Overlapping skill descriptions: compare all skill description fields pairwise. If two descriptions share >50% of their non-trivial keywords, flag with the overlapping pair; duplicate triggers cause misfired invocations."

**Architecture**: the orchestrator spawns a dedicated subagent (`agents/trigger-collision-inspector.md`) with the raw description inventory pasted inline. The subagent performs the pairwise comparison entirely in its own LLM reasoning — no Jaccard/n-gram pre-filter, no separate LLM re-rank stage, no deterministic scoring code. This matches Waza's proven approach and keeps main-session context overhead low (the full description list lives only inside the subagent's context).

**Classifications the subagent returns**:
- **DUPLICATE**: essentially the same trigger intent, Claude picks unpredictably (e.g. `commit` vs `git-commit`)
- **OVERLAP**: shared keywords or overlapping scope with partial confusion risk
- **COMPLEMENT**: related but distinguishable — **not reported** as a collision

| Status | Condition |
|--------|-----------|
| 🟢 healthy | Subagent returns no DUPLICATE or OVERLAP pairs |
| 🟡 attention | 1-2 OVERLAP pairs |
| 🔴 critical | ≥1 DUPLICATE pair OR 3+ OVERLAP pairs |

**Why subagent instead of inline LLM + Jaccard code**:
- Waza's approach is field-tested — don't reinvent
- Pairwise description data stays isolated in subagent context (no main-session token bloat)
- No deterministic code to maintain — the subagent prompt IS the spec
- Paraphrase collisions (e.g. `debug the build` vs `fix compilation errors`) are naturally caught by LLM reasoning without needing lexical pre-filter

**Trade-off accepted**: results are not deterministic across runs. If this becomes a regression source (same environment grades differently on repeat scans), revisit with a deterministic pre-filter stage — but do NOT add complexity preemptively (YAGNI).

### 6. Hook Complexity

No official thresholds exist for hook counts. The scan flags LLM-cost hooks (prompt/agent types) because the docs explicitly call these out as different from command/http.

| Status | Condition |
|--------|-----------|
| 🟢 healthy | No prompt/agent hooks AND no event collisions |
| 🟡 attention | 1-2 prompt/agent hooks (each invocation costs an LLM call) OR 1 event collision |
| 🔴 critical | 3+ prompt/agent hooks OR multiple event collisions (unpredictable ordering) |

Always report: total hook count, type breakdown, event collision list. Hook count alone is not graded — a project can have 20 command hooks with zero runtime impact.

### 7. MCP Overview

Per [costs page](https://code.claude.com/docs/en/costs): MCP tool schemas are deferred by default; prefer CLI alternatives for efficiency. No official thresholds for server count exist.

The scan respects `ENABLE_TOOL_SEARCH`:
- `deferred` (default): only tool names in context (~120 baseline + small per-server overhead)
- `auto`: schemas load upfront if ≤10% of context
- `false`: all schemas loaded upfront

| Status | Condition |
|--------|-----------|
| 🟢 healthy | `ENABLE_TOOL_SEARCH` is deferred/auto AND total server count is reasonable (report raw number) |
| 🟡 attention | `ENABLE_TOOL_SEARCH=auto` AND schemas actually load (≤10% threshold met with pressure) |
| 🔴 critical | `ENABLE_TOOL_SEARCH=false` (all schemas always loaded) |

Always report: server count, source scopes, effective loading mode, estimated token surface if non-deferred.

### 8. CLAUDE.md + Memory Health

**Official recommendation** ([memory.md](https://code.claude.com/docs/en/memory)): "target under 200 lines per CLAUDE.md file". MEMORY.md: "The first 200 lines of MEMORY.md, or the first 25KB, whichever comes first, are loaded".

| Status | Condition |
|--------|-----------|
| 🟢 healthy | All CLAUDE.md files ≤ 200 lines AND MEMORY.md ≤ 50% of 25KB cap |
| 🟡 attention | Any CLAUDE.md file 200-300 lines OR MEMORY.md 50-90% of cap |
| 🔴 critical | Any CLAUDE.md > 300 lines OR MEMORY.md at/over 25KB (tail is silently dropped) |

Content past the 25KB cap is silently dropped from context — the scan must warn when MEMORY.md exceeds it.

## Overall Summary

**No single letter grade.** The report shows:

1. **Status tally** across the **6 graded areas**, with observational areas listed separately: e.g. `Graded: 5 🟢 / 1 🟡 / 0 🔴 (6 areas) · Observational: Plugin Inventory, Context Budget`. Observational areas never contribute to the tally — they emit raw data and info-level notes only.
2. **Top lever**: the single change with the largest projected savings, computed from raw numbers (not from severity)
   - e.g. _"Adding `disable-model-invocation: true` to `deploy`, `commit`, `release` frees ~840 chars (10.5%) from always-loaded description budget"_
3. **Raw context load estimate**: _"Estimated startup load ≈ 9,400 tokens (4.7% of 200K window)"_ — labeled as estimate, with pointer to `/context` for ground truth

**Why no letter grade** (documented for future maintainers):
- No official source defines A-F thresholds for environment overhead — any bucketing is invented
- Real 10+-plugin environments cluster in the middle, making letter grades uninformative
- Users want actionable levers and raw numbers, not a report card

## Recommendation Templates

For each graded area flagged 🟡 attention or 🔴 critical, generate actionable recommendations. Observational areas (§1, §2) emit info-level notes only — no severity assigned, no tally contribution.

| Area | Example Recommendation |
|------|----------------------|
| Description Obesity | "Add `disable-model-invocation: true` to skills X, Y (user-only invocation)" |
| Skill Body Size | "Skills A, B exceed 5K token compact cap — move reference content to bundled files" |
| Hook Complexity | "3 prompt/agent hooks detected (LLM call per event) — consider converting to command hooks" |
| CLAUDE.md Size | "CLAUDE.md is 342 lines — move specialized instructions to .claude/rules/ or skills" |
| MCP Overhead | "7 MCP servers configured — disable unused servers via /mcp, prefer CLI alternatives" |
| Trigger Collision | "Skills 'foo' and 'bar' have 78% description overlap — differentiate trigger phrases" |
```

- [ ] **Step 2: Commit**

```bash
git add plugins/vision-powers/skills/environment-health/references/health-criteria.md
git commit -m "feat(vision-powers): add health-criteria.md with grading thresholds and recommendations"
```

---

## Task 3: Create `section-structure.md`

**Files:**
- Create: `plugins/vision-powers/skills/environment-health/references/section-structure.md`

Defines the JSON data schema for the 8-section HTML report (used by render-sections.js).

- [ ] **Step 1: Write the section structure document**

Follow the same pattern as `agent-extension-visualizing/references/sections-data-schema.md` but with 8 sections tailored to environment health. The sections are:

1. **Header** — Health grade badge, scan date, environment summary
2. **Overview** — Plugin/skill counts chart, active vs disabled, component distribution
3. **Context Budget** — Always-loaded vs deferred breakdown, 200K/1M scenario bars
4. **Skill Health** — Description obesity gauge, body size distribution, compact cap warnings
5. **Trigger Analysis** — Collision pairs table, similarity scores, Mermaid overlap diagram
6. **Hook & MCP** — Hook event distribution chart, type breakdown, MCP server inventory
7. **CLAUDE.md & Memory** — File sizes, line counts, @import chain, MEMORY.md capacity gauge
8. **Recommendations** — Prioritized action items grouped by severity, estimated impact

```markdown
# Environment Health — JSON Data Schema

This document defines the JSON structure for `sections-data.json`.
The visual-report-writer outputs this file; `render-sections.js` converts it into HTML section files.

**Key principle**: Focus on content, not presentation. The render script handles all HTML structure and CSS classes.

---

## Top-level Structure

` ` `json
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
` ` `

## metadata (required)

| Field | Type | Description |
|-------|------|-------------|
| `lang` | string | Language code: "en", "ko", "ja", etc. |
| `title` | string | Report title, e.g. "Environment Health Report" |
| `font_link` | string | Google Fonts `<link>` tag |
| `css_variables` | string | CSS variable overrides |
| `css_variables_dark` | string | Dark mode overrides |
| `mermaid_theme` | string | Additional Mermaid themeVariables |

## sections.header

| Field | Type | Description |
|-------|------|-------------|
| `status_tally` | object | `{healthy: N, attention: N, critical: N, graded_total: 6, observational: ["Plugin Inventory", "Startup Context Budget"]}` — tally is for graded areas only; observational areas listed separately |
| `top_lever` | string | Single-sentence top action: "Adding `disable-model-invocation: true` to 3 skills frees 840 chars (10.5%) from desc budget" |
| `scan_date` | string | ISO date of scan |
| `estimate_caveat` | string | Fixed text: "Values are estimates. Run `/context` for ground truth." (hidden if `--paste-context` was used) |
| `summary` | string | 1-2 sentence overall assessment |
| `quick_stats` | object | `{plugins, skills, hooks, mcp_servers, est_startup_tokens, context_window_size}` |

## sections.overview

| Field | Type | Description |
|-------|------|-------------|
| `area_type` | string | Fixed: `"observational"` — §1 Plugin Inventory has no official thresholds |
| `chart_data` | object | Chart.js data: `{labels: ["Skills","Commands","Agents","Hooks","MCP"], datasets: [{data: [N,...]}]}` |
| `plugins` | array | `[{name, description, skill_count, command_count, enabled_state: "active"|"disabled"}]` (renamed from `status` to avoid confusion with health tiers — this is the plugin's enabled state, not a grading) |
| `totals` | object | `{active_plugins, disabled_plugins, stale_in_cache, total_skills, total_commands, local_skills}` |
| `info_notes` | array | `[{text, severity: "info"}]` — neutral observations (e.g. stale cache cleanup suggestion), never severity-flagged |

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

## sections.skill_health

| Field | Type | Description |
|-------|------|-------------|
| `description_budget` | object | `{total_chars, effective_budget, budget_source: "SLASH_COMMAND_TOOL_CHAR_BUDGET env"\|"1% of 200K"\|"8K fallback", pct, over_250_char_entries: [{plugin, skill, chars}], status}` |
| `at_rest_body_sizes` | object | `{skills: [{plugin, skill, body_lines, over_500: bool}], over_500_count, status}` — section 4a |
| `post_compact_risk` | object | `{skills_over_5k: [{plugin, skill, est_tokens}], total_est_tokens, would_exceed_25k: bool, status}` — section 4b, labeled as LATENT risk |
| `disable_model_invocation` | object | `{using_count, not_using: [{plugin, skill, desc_chars}]}` — skills that could benefit from the flag |

## sections.trigger_analysis

| Field | Type | Description |
|-------|------|-------------|
| `inspector` | string | Fixed: "trigger-collision-inspector subagent (Waza-style lexical pairwise)" |
| `total_descriptions_analyzed` | number | Count of skill descriptions passed to the subagent |
| `collisions` | array | `[{skill_a, skill_b, classification: "DUPLICATE"\|"OVERLAP", shared_keywords: [string], note}]` — COMPLEMENT pairs are not returned |
| `mermaid_diagram` | string | Mermaid graph showing collision clusters |
| `status` | string | "healthy" \| "attention" \| "critical" |

## sections.hooks_and_mcp

| Field | Type | Description |
|-------|------|-------------|
| `hooks` | object | `{total, type_counts: {command,http,prompt,agent}, event_counts: {}, event_collisions: [], llm_hooks, status}` |
| `mcp` | object | `{server_count, effective_mode: "deferred"\|"auto"\|"false", est_tokens, servers: [{name, source_scope}], status}` |
| `chart_data` | object | Chart.js data for hook type distribution |

## sections.claude_md_memory

| Field | Type | Description |
|-------|------|-------------|
| `claude_md` | object | `{files: [{path,scope,lines,bytes,over_200}], total_lines, total_tokens, imports: [{from,target}], excluded_by_settings: [paths], status}` |
| `memory` | object | `{path, lines, bytes, pct_of_limit, over_200_lines, over_25kb, topic_files, status}` |

## sections.recommendations

| Field | Type | Description |
|-------|------|-------------|
| `items` | array | `[{area, severity: "critical"\|"warning"\|"info", action, impact_estimate, current_value, target_value, docs_source}]` — sorted by severity, impact |
| `top_lever` | object | Single recommendation with largest projected savings, promoted to header |
| `summary` | string | 1-2 sentence recommendation summary |
```

- [ ] **Step 2: Commit**

```bash
git add plugins/vision-powers/skills/environment-health/references/section-structure.md
git commit -m "feat(vision-powers): add section-structure.md schema for environment-health reports"
```

---

## Task 4: Create HTML template

**Files:**
- Create: `plugins/vision-powers/templates/environment-health.html`
- Reference: `plugins/vision-powers/templates/project-recap.html` (closest pattern — 8 sections)

- [ ] **Step 1: Copy and adapt the project-recap template**

Copy `project-recap.html` as the base. Modify:
- Change section placeholder IDs from `{{SECTION_1}}` through `{{SECTION_8}}`
- Update template-specific CSS for 3-tier status badges (healthy / attention / critical) and observational markers
- Add gauge/progress bar CSS for capacity indicators
- Update the `<title>` placeholder to `{{TITLE}}`
- Keep all existing infrastructure: Mermaid, Chart.js, feedback system, zoom/pan, navigation

Key template-specific additions:
- Status badge CSS: 🟢 healthy (green), 🟡 attention (amber), 🔴 critical (red), ℹ️ observational (neutral gray) — NO letter grades
- Capacity gauge CSS: horizontal progress bars with color thresholds tied to the 3-tier status
- Area card CSS: per-area status indicators in section headers for graded areas; neutral info markers for observational areas (§1, §2)

```bash
cp plugins/vision-powers/templates/project-recap.html plugins/vision-powers/templates/environment-health.html
```

Then edit the copied file to adjust section count to 8 and add health-specific CSS.

- [ ] **Step 2: Test template has correct placeholders**

Run: `grep -c 'SECTION_' plugins/vision-powers/templates/environment-health.html`
Expected: 8 section placeholders (SECTION_1 through SECTION_8)

- [ ] **Step 3: Commit**

```bash
git add plugins/vision-powers/templates/environment-health.html
git commit -m "feat(vision-powers): add environment-health HTML template (8 sections)"
```

---

## Task 5: Create `trigger-collision-inspector` subagent

**Files:**
- Create: `plugins/vision-powers/skills/environment-health/agents/trigger-collision-inspector.md`
- Reference: `references/Waza/skills/health/agents/inspector-context.md:113` (source of the approach)

This subagent owns the entire trigger collision detection task. The main SKILL.md delegates to it with the raw skill description inventory pasted inline. The subagent performs pairwise lexical overlap comparison in its own LLM reasoning and returns only DUPLICATE/OVERLAP pairs. This is a direct adoption of Waza's approach — no Jaccard code, no pre-filter, no main-session comparison logic.

- [ ] **Step 1: Write the subagent file**

```markdown
---
name: trigger-collision-inspector
description: Detects skill description trigger collisions via pairwise lexical keyword overlap. Used by environment-health skill.
tools: Read
model: sonnet
---

# Trigger Collision Inspector

You are an auditor for Claude Code skill description collisions. You receive a list of skill descriptions (plugin, name, description text) and return pairs whose triggers may conflict.

## Method (adopted from Waza inspector-context.md:113)

Compare all skill description fields pairwise. For each pair, extract **non-trivial keywords** — meaningful nouns, verbs, and noun phrases, excluding stopwords ("the", "a", "use", "when", "for", "with") and boilerplate ("skill", "command", "tool").

For each pair:
1. If two descriptions share **>50% of their non-trivial keywords** AND convey essentially the same trigger intent → classify as **DUPLICATE**
2. If they share >50% of non-trivial keywords but address partially distinct scopes → classify as **OVERLAP**
3. Otherwise → do NOT return (including COMPLEMENT pairs)

Also catch **paraphrase collisions**: pairs that share near-zero literal keywords but clearly serve the same intent (e.g. `debug the build` vs `fix compilation errors`). Classify these as DUPLICATE if the intent matches, OVERLAP if the intent partially overlaps.

## Input format

A list of skills, one per line:
```
[plugin-name] skill-name: description text
```

## Output format

Return a JSON object:

```json
{
  "total_descriptions_analyzed": 27,
  "collisions": [
    {
      "skill_a": "plugin-a/commit",
      "skill_b": "plugin-b/git-commit",
      "classification": "DUPLICATE",
      "shared_keywords": ["commit", "git", "stage"],
      "note": "Both trigger on staging and committing current changes. Claude will pick unpredictably."
    }
  ]
}
```

If no collisions found, return `{"total_descriptions_analyzed": N, "collisions": []}`.

## Rules

- Never return COMPLEMENT pairs — the caller only wants problems
- Be conservative: if you are unsure whether a pair is a real collision, do NOT return it (false positives waste user attention more than false negatives)
- Stay within the description text. Do not read skill bodies, do not guess at implementation details
```

- [ ] **Step 2: Commit**

```bash
git add plugins/vision-powers/skills/environment-health/agents/trigger-collision-inspector.md
git commit -m "feat(vision-powers): add trigger-collision-inspector subagent (adapted from Waza)"
```

---

## Task 6: Update `render-sections.js`

**Files:**
- Modify: `plugins/vision-powers/scripts/render-sections.js`

The render script needs to know how to convert environment-health JSON sections into HTML. This task depends on Task 5 — the `trigger_analysis` section renderer consumes the subagent's DUPLICATE/OVERLAP output shape defined there.

- [ ] **Step 1: Read the current render-sections.js to understand the section renderer pattern**

Read the file to identify where new section types are registered. Each skill type has a section-rendering function that converts JSON data to HTML using predefined CSS classes.

- [ ] **Step 2: Add environment-health section renderers**

Add rendering functions for the 8 environment-health sections. Follow the existing pattern (e.g., how `project-recap` sections are rendered). Each renderer takes the section's JSON data and returns HTML string using the template's CSS classes.

Key renderers needed:
- `renderHealthHeader(data)` — status tally (graded 🟢/🟡/🔴 + observational split) + quick stats cards
- `renderHealthOverview(data)` — plugin table + component distribution chart (observational — no status badges)
- `renderContextBudget(data)` — stacked bar chart + always-loaded/deferred breakdown; references component-owner area statuses but does not grade the aggregate
- `renderSkillHealth(data)` — description gauge + body size table
- `renderTriggerAnalysis(data)` — collision pairs table + Mermaid diagram (consumes trigger-collision-inspector output from Task 5)
- `renderHooksAndMcp(data)` — hook distribution chart + MCP server list
- `renderClaudeMdMemory(data)` — file list + capacity gauge
- `renderRecommendations(data)` — prioritized action cards grouped by severity; observational info-notes rendered separately without severity

Detection: Prefer an explicit `metadata.report_type: "environment-health"` field in sections-data.json rather than inferring from section key names — explicit is less brittle than auto-detect by key presence.

- [ ] **Step 3: Test by creating a mock sections-data.json and running the script**

Create a minimal test JSON and run:
```bash
node plugins/vision-powers/scripts/render-sections.js --data /tmp/test-env-health.json --output /tmp/test-sections/
```
Expected: 8 section HTML files + metadata.json created.

- [ ] **Step 4: Commit**

```bash
git add plugins/vision-powers/scripts/render-sections.js
git commit -m "feat(vision-powers): add environment-health section renderers to render-sections.js"
```

---

## Task 7: Write SKILL.md

**Files:**
- Create: `plugins/vision-powers/skills/environment-health/SKILL.md`

- [ ] **Step 1: Write the complete SKILL.md**

```yaml
---
name: environment-health
description: "Diagnose Claude Code environment health: context, description obesity, trigger collisions, hooks, MCP, CLAUDE.md/memory. Graded + observational areas with actionable levers. Use for setup audits or when Claude feels slow."
argument-hint: "--format=html|md --lang=code [--paste-context] [--use-instructions-loaded-hook]"
allowed-tools: Read, Glob, Grep, Agent, AskUserQuestion, Bash(node *), Bash(open *), Bash(rm -rf /tmp/env-health-*)
---
```

**Description design notes**:
- Under 250 chars to avoid truncation in the `/skills` listing (the very problem this skill diagnoses)
- Front-loads WHAT (context budget, description obesity, etc.) + WHEN (setup audits, "Claude feels slow")
- Trigger phrases list was moved out of the description body into SKILL.md content (they don't need to be in the always-loaded portion)

SKILL.md body structure:

1. **Input Parsing** — format (html default, md), language, optional `--paste-context` and `--use-instructions-loaded-hook` flags
2. **Phase 1: Data Collection**
   - **Determine the current context window size** from the active model ID (Claude knows this from the session system prompt — e.g. `claude-opus-4-6[1m]` → 1000000 tokens, `claude-opus-4-6` → 200000). This cannot be auto-detected from the Node subprocess, so Claude derives it from its own session knowledge.
   - Run `node env-health-scan.js --window-size=<N>` to get JSON. Pass the detected window size via CLI flag so the scan records it in its output and downstream formulas (1% description budget, startup-load percentage) use the right denominator.
   - If `--paste-context`: ask user to paste `/context` output, use as ground truth to correct startup-load estimate
   - If `--use-instructions-loaded-hook`: guide user through temporarily enabling the `InstructionsLoaded` hook, parse its log for exact per-file loading data, then offer to revert the hook
3. **Phase 2: Analysis**
   - Compute effective skill description budget from `env_and_settings.desc_budget_override ?? max(8000, context_window_size * 0.01)`
   - For **graded areas** (§3-§8): classify into 🟢 / 🟡 / 🔴 using `health-criteria.md` rules (citing source for each threshold)
   - For **observational areas** (§1 Plugin Inventory, §2 Startup Context Budget aggregate): do NOT assign a tier. Emit raw numbers + breakdown + info-level observations only. Individual components of §2 with official thresholds are delegated to their owner area (see the status delegation table in health-criteria.md)
   - Trigger collisions: delegate to the `trigger-collision-inspector` subagent (Task 5) with the raw description inventory pasted inline. The subagent returns DUPLICATE/OVERLAP pairs only (no Jaccard code, no pre-filter — the subagent owns the entire comparison). Adopted directly from Waza `inspector-context.md:113`.
   - Compute "top lever" — the single change with largest projected savings, ranked by raw numeric impact (not by severity, so observational areas can still surface a lever)
4. **Phase 3: Report Generation**
   - **Markdown mode** (`--format=md`): inline report with per-area status emojis for graded areas, neutral info markers for observational areas, raw numbers, recommendations
   - **HTML mode** (default): follow `report-generation-workflow.md` — delegate to visual-report-writer with sections-data.json, render, assemble, validate
5. **Cleanup** — remove temp directories

Key design decisions in the body:
- **No letter grades.** Graded areas use a 3-tier status (healthy/attention/critical); observational areas (§1, §2) use raw numbers only with no tier. Every graded threshold cites its docs source.
- **Privacy**: scan data contains counts and sizes only. The report MUST NOT embed CLAUDE.md content, MEMORY.md body, API keys, or file contents. Explicitly strip before rendering.
- **Ground truth options**: the default scan uses estimates; users can sharpen with `--paste-context` (paste `/context` output) or `--use-instructions-loaded-hook` (temporary hook for exact instruction-file logging). Both are optional.
- Trigger collision analysis is done by a dedicated subagent (Waza-style), not by the script or by the main orchestrator. The subagent performs pairwise lexical overlap comparison in its own LLM reasoning. Description inventory lives only in the subagent's context — main session token overhead is minimal.
- The scan script does pure data collection; all interpretation is in SKILL.md instructions
- Markdown is the default for quick checks; HTML is opt-in via `--format=html`

Reference files from SKILL.md:
- `${CLAUDE_PLUGIN_ROOT}/skills/environment-health/references/health-criteria.md` — for grading criteria
- `${CLAUDE_PLUGIN_ROOT}/skills/environment-health/references/section-structure.md` — for HTML report schema
- Shared workflow: `${CLAUDE_PLUGIN_ROOT}/references/report-generation-workflow.md` — for HTML generation pipeline

Gotchas section (minimum):
- **Skill description budget is 1% of context window, not 2%**: Earlier versions of this plan used 2% / 16K chars fallback. The official number (skills.md — "Skill descriptions are cut short") is **1% scaling, 8,000-char fallback**. Use the effective budget formula: `SLASH_COMMAND_TOOL_CHAR_BUDGET ?? max(8000, floor(context_window * 0.01))`.
- **Per-entry description cap is 250 chars**: Descriptions longer than 250 characters are silently truncated in the listing regardless of total budget. Flag these as critical — Claude cannot see the tail, which affects triggering. Front-load the key use case.
- **5K/25K skill body limit is POST-COMPACT, not at-rest**: The 5,000-tokens-per-skill / 25,000-total limit applies only to re-injection after `/compact`, and only for skills that were **invoked** in the session. The at-rest recommendation is separate: **keep SKILL.md under 500 lines** (skills.md tip). Do not conflate these.
- **Skill descriptions are NOT re-injected after compact**: Only invoked skills survive compaction. The always-loaded description budget vanishes after compact, which changes what "always-loaded cost" means mid-session. The report should mention this caveat.
- **Trigger collision uses a subagent, not inline orchestrator logic**: The `trigger-collision-inspector` subagent owns the entire comparison (pairwise lexical overlap via LLM reasoning, Waza-style). Do NOT add Jaccard code in the scanner or do the comparison in the main orchestrator — both would bloat main-session context and duplicate the subagent's job. If accuracy is a concern in the future, revisit the subagent prompt before adding deterministic pre-filter stages (YAGNI).
- **Context budget is always-loaded only**: Don't count deferred items in the always-loaded budget unless `ENABLE_TOOL_SEARCH` is `auto` (with pressure) or `false`. Report deferred items separately so users see both views.
- **`/context` is ground truth, not the scan's estimate**: The scan uses public formulas but Claude Code's actual context accounting can drift per version. The report must say _"Estimated — run `/context` for ground truth"_ and optionally accept pasted `/context` output to correct estimates.
- **`InstructionsLoaded` hook is the file-level ground truth**: For users who want exact, per-file instruction loading data, recommend temporarily enabling the `InstructionsLoaded` hook (hooks.md) to log which CLAUDE.md / rules / skills files actually loaded. Offer as an opt-in `--use-instructions-loaded-hook` flag.
- **Skill body tokens are estimated (chars/4)**: Actual tokenization varies. Flag this as approximate.
- **MEMORY.md path varies by project**: The encoded path format can vary. The scan script tries multiple paths — if none match, report "no memory file found" rather than erroring.
- **prompt/agent hooks cost tokens per event**: Unlike command/http hooks, prompt and agent hook types invoke an LLM call each time they fire. This is a per-event runtime cost, not a startup cost.
- **`ENABLE_TOOL_SEARCH` changes MCP cost model**: The default (`deferred`) means only tool names in context. `auto` may load schemas upfront if they fit in 10% of context. `false` always loads them. The scan reads this env var and adjusts the MCP budget line accordingly.
- **`claudeMdExcludes` and `--add-dir` CLAUDE.md loading**: Respect `claudeMdExcludes` (exclude matching paths from CLAUDE.md total) and `CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD=1` (include CLAUDE.md from `--add-dir` paths). Both affect the always-loaded budget.
- **Privacy**: The scan reads CLAUDE.md, MEMORY.md, and settings files, but the report must emit counts and sizes only — never file contents, API keys, or memory body text. Enforce this as a pre-render guard: the rendering pipeline must strip any raw content field before producing sections-data.json.
- **Context window size is not self-detectable from the scan**: The `node env-health-scan.js` subprocess has no way to know the current session's window size (200K vs 1M). The SKILL.md orchestrator detects this from the active model ID (e.g. `claude-opus-4-6[1m]` → 1000000) and passes it via `--window-size=<N>`. Without this, percentage-of-window calculations default to 200K and will be wrong on 1M sessions.
- **Shell-level env vars only — child process inheritance**: The scan reads `SLASH_COMMAND_TOOL_CHAR_BUDGET`, `ENABLE_TOOL_SEARCH`, `CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD`, `CLAUDE_CODE_DISABLE_AUTO_MEMORY` from `process.env`. These are only visible to the Node subprocess if the user `export`ed them from their shell init. Env vars set only inside a Claude Code session (not exported before CC launched) are invisible. The report must surface this caveat next to any env-var-derived field so users know to second-guess false negatives.
- **CLAUDE.md loading walks parent directories**: Per memory.md, Claude Code loads CLAUDE.md from every ancestor directory from cwd up to `$HOME` (inclusive), plus `~/.claude/CLAUDE.md`. The scan must walk that chain and sum them — scanning only cwd + `~/.claude/CLAUDE.md` undercounts the always-loaded CLAUDE.md budget on projects nested multiple levels deep inside home.
- **Observational areas never contribute to the tally**: §1 (Plugin Inventory) and §2 (Startup Context Budget aggregate) emit raw numbers + info-level notes only. They are counted separately from the graded tally. A report showing `0 critical` means zero critical among graded areas — observational areas may still have info-level observations worth surfacing.

- [ ] **Step 2: Commit**

```bash
git add plugins/vision-powers/skills/environment-health/SKILL.md
git commit -m "feat(vision-powers): add environment-health skill for environment diagnostics"
```

---

## Task 8: Update plugin metadata and README

**Files:**
- Modify: `plugins/vision-powers/.claude-plugin/plugin.json`
- Modify: `plugins/vision-powers/README.md`
- Modify: `.claude-plugin/marketplace.json`

- [ ] **Step 1: Update plugin.json keywords**

Add `"health"`, `"environment"`, `"diagnostics"`, `"context"`, `"optimization"` to the keywords array.

- [ ] **Step 2: Update plugin.json description**

Add "environment health diagnostics" to the description.

- [ ] **Step 3: Update README.md**

Add `environment-health` to the skill table in README.md, following the existing pattern.

- [ ] **Step 4: Bump version in marketplace.json**

Bump vision-powers version from `2.13.0` to `2.14.0` (minor — new feature).

- [ ] **Step 5: Validate**

Run: `unset CLAUDECODE && claude plugin validate .`
Expected: Validation passes.

- [ ] **Step 6: Commit**

```bash
git add plugins/vision-powers/.claude-plugin/plugin.json plugins/vision-powers/README.md .claude-plugin/marketplace.json
git commit -m "feat(vision-powers): register environment-health skill (v2.14.0)"
```

---

## Task 9: Manual smoke test

**Files:** None (testing only)

- [ ] **Step 1: Run the skill with --format md**

```bash
claude --plugin-dir ./plugins/vision-powers
```

Then type: `/environment-health --format md`

Expected: Inline markdown report with 8 diagnostic areas, per-area grades, overall grade, and actionable recommendations.

- [ ] **Step 2: Verify scan data accuracy**

Cross-check the report's plugin count against `claude plugin list`, skill count against `/skills`, and MCP server count against `/mcp`.

- [ ] **Step 3: Run with HTML output**

Type: `/environment-health`

Expected: HTML report generated at `${CLAUDE_PLUGIN_DATA}/reports/YYYY-MM-DD-environment-health.html`, opens in browser, 8 sections rendered with charts and grades.

- [ ] **Step 4: Test edge cases**

- Run in a directory with no `.claude/` (no project-level settings)
- Run with all plugins disabled (empty environment)
- Run with `--lang ko` (Korean output)

---

## Implementation Notes

### What can be reused from existing vision-powers infrastructure

| Component | Reuse Status |
|-----------|-------------|
| `scripts/assemble-report.js` | As-is |
| `scripts/validate-report.js` | As-is |
| `scripts/log-report.js` | As-is |
| `scripts/config.js` | As-is |
| `agents/visual-report-writer.md` | As-is (JSON mode) |
| `agents/coherence-reviewer.md` | As-is (optional --verify) |
| `references/design-system/*` | As-is |
| `references/report-generation-workflow.md` | As-is |
| `shared/*` | As-is |
| `scripts/render-sections.js` | Extend (add environment-health renderers) |

### What is new

| Component | Purpose |
|-----------|---------|
| `skills/environment-health/SKILL.md` | Skill document |
| `skills/environment-health/scripts/env-health-scan.js` | Data collector |
| `skills/environment-health/agents/trigger-collision-inspector.md` | Subagent for trigger collision detection (Waza-adapted) |
| `skills/environment-health/references/health-criteria.md` | Status tier criteria |
| `skills/environment-health/references/section-structure.md` | JSON schema for sections |
| `templates/environment-health.html` | HTML report template |

### Dependencies on external state

- `~/.claude/plugins/cache/` — plugin installation cache
- `~/.claude/plugins/installed_plugins.json` — active install paths
- `~/.claude/settings.json` + `.claude/settings.json` + `.claude/settings.local.json` — hooks, MCP, plugin states
- `~/.claude/projects/*/memory/MEMORY.md` — auto memory
- `.claude/rules/*.md` — project rules
