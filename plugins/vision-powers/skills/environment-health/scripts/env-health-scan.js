#!/usr/bin/env node
/**
 * Environment Health Scanner for vision-powers.
 *
 * Scans the user's full Claude Code environment for health diagnostics.
 * Unlike env-fit-scan.js (single-plugin fitness), this scans everything.
 *
 * Usage:
 *   node env-health-scan.js [--window-size=<N>]
 *
 * Exit codes:
 *   0 = success (JSON on stdout)
 */

const fs = require("fs");
const path = require("path");
const os = require("os");

// ---------------------------------------------------------------------------
// Helpers (reused from env-fit-scan.js)
// ---------------------------------------------------------------------------

function expandHome(p) {
  return p.startsWith("~") ? path.join(os.homedir(), p.slice(1)) : p;
}

function findFiles(dir, testFn, maxDepth = 6, depth = 0) {
  const results = [];
  if (depth > maxDepth) return results;
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return results;
  }
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
    if (!groups[name] || mtime(p) > mtime(groups[name])) {
      groups[name] = p;
    }
  }
  return groups;
}

function mtime(p) {
  try {
    return fs.statSync(p).mtimeMs;
  } catch {
    return 0;
  }
}

function isUnderActivePath(filePath, activePaths) {
  for (const ap of activePaths) {
    if (filePath.startsWith(ap)) return true;
  }
  return false;
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

  function extractField(name) {
    const multiline = fm.match(new RegExp(`^${name}:\\s*[>|]\\s*\\n((?:[ \\t]+.+\\n?)+)`, "m"));
    if (multiline) {
      return multiline[1].split("\n").map(l => l.trim()).filter(Boolean).join(" ");
    }
    const quoted = fm.match(new RegExp(`^${name}:\\s*["'](.+?)["']`, "m"));
    if (quoted) return quoted[1].trim();
    const inline = fm.match(new RegExp(`^${name}:\\s*(.+)`, "m"));
    if (inline) return inline[1].trim();
    return "";
  }

  const desc = extractField("description");
  const whenToUse = extractField("when_to_use");
  const disabled = /disable-model-invocation:\s*true/.test(fm);
  const userInvocable = /user-invocable:\s*false/.test(fm) ? false : true;

  // Scan agent frontmatter for preload skills (subagent-driven): `skills: [a, b]` or
  // multi-line list. Captures skill names so the orchestrator can size preload cost.
  const preloadSkills = [];
  const skillsInline = fm.match(/^skills:\s*\[([^\]]*)\]/m);
  if (skillsInline) {
    for (const s of skillsInline[1].split(",")) {
      const cleaned = s.trim().replace(/^["']|["']$/g, "");
      if (cleaned) preloadSkills.push(cleaned);
    }
  } else {
    const skillsBlock = fm.match(/^skills:\s*\n((?:[ \t]+-[ \t]+.+\n?)+)/m);
    if (skillsBlock) {
      for (const line of skillsBlock[1].split("\n")) {
        const cleaned = line.trim().replace(/^-\s*/, "").replace(/^["']|["']$/g, "").trim();
        if (cleaned) preloadSkills.push(cleaned);
      }
    }
  }

  return {
    description: desc,
    when_to_use: whenToUse,
    combined_chars: desc.length + whenToUse.length,
    disabled,
    user_invocable: userInvocable,
    preload_skills: preloadSkills,
  };
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

// ---------------------------------------------------------------------------
// Scanners reused from env-fit-scan.js
// ---------------------------------------------------------------------------

/**
 * Resolve the current plugin.json for each enabled plugin using
 * installed_plugins.json installPath as ground truth.
 *
 * Per plugins-reference.md, old versions stay in cache for 7 days as orphans.
 * mtime-latest is unreliable (downgrades look like orphans; branch installs collide).
 * installPath is authoritative — we only accept plugin.json under one of those paths.
 *
 * Returns { plugins, orphan_count }. A plugin is "orphaned" when its cache exists
 * but no plugin.json was found under any active installPath.
 */
function scanInstalledPlugins(enabledPlugins, activeInstallPaths) {
  const cacheBase = expandHome("~/.claude/plugins/cache");
  const allPluginJsons = findFiles(
    cacheBase,
    (full, name) => name === "plugin.json" && full.includes(".claude-plugin"),
  );

  // Group by plugin name, keeping only entries under active installPaths when known.
  const groups = {};
  const orphanCandidates = new Set();
  for (const pj of allPluginJsons) {
    const name = pluginNameFromCachePath(pj);
    if (!name) continue;
    if (activeInstallPaths && activeInstallPaths.size > 0) {
      if (!isUnderActivePath(pj, activeInstallPaths)) {
        orphanCandidates.add(name);
        continue;
      }
    }
    if (!groups[name] || mtime(pj) > mtime(groups[name])) groups[name] = pj;
  }

  const plugins = [];
  for (const [name, pjPath] of Object.entries(groups).sort()) {
    if (!enabledPlugins.has(name)) continue;
    try {
      const data = JSON.parse(fs.readFileSync(pjPath, "utf-8"));
      plugins.push({
        name,
        description: data.description || "",
        version: data.version || null,
        manifest_path: pjPath,
      });
    } catch {
      plugins.push({ name, description: "", version: null, manifest_path: pjPath });
    }
  }

  // An orphan is a plugin whose cache copy exists outside active installPaths AND
  // which has no active copy either. Pure bookkeeping — doesn't affect counts.
  const orphans = [...orphanCandidates].filter(n => !groups[n]);
  return { plugins, orphan_count: orphans.length, orphans };
}

function scanInstalledSkills(enabledPlugins, activeInstallPaths) {
  const cacheBase = expandHome("~/.claude/plugins/cache");
  const allSkills = findFiles(cacheBase, (full, name) => name === "SKILL.md");

  const groups = {};
  for (const smd of allSkills) {
    const pluginName = pluginNameFromCachePath(smd);
    if (!pluginName) continue;
    if (!enabledPlugins.has(pluginName)) continue;
    if (activeInstallPaths && !isUnderActivePath(smd, activeInstallPaths)) continue;
    const parts = smd.split("/");
    const skillsIdx = parts.lastIndexOf("skills");
    if (skillsIdx === -1 || skillsIdx + 1 >= parts.length) continue;
    const skillName = parts[skillsIdx + 1];
    const key = `${pluginName}/${skillName}`;
    if (!groups[key] || mtime(smd) > mtime(groups[key])) {
      groups[key] = smd;
    }
  }

  let totalChars = 0;
  let disabledCount = 0;
  const skills = [];

  for (const [key, smdPath] of Object.entries(groups).sort()) {
    const [plugin, skill] = key.split("/");
    try {
      const content = fs.readFileSync(smdPath, "utf-8").slice(0, 4000);
      const fm = parseFrontmatter(content);
      if (!fm) continue;
      // Combined description + when_to_use is what the listing budget/cap operates on
      // per skills.md. disable-model-invocation: true removes the entry from the listing
      // entirely, so it contributes zero to the budget.
      if (!fm.disabled) {
        totalChars += fm.combined_chars;
      } else {
        disabledCount++;
      }
      skills.push({
        plugin,
        skill,
        description: fm.description.slice(0, 300),
        desc_chars: fm.description.length,
        when_to_use_chars: fm.when_to_use.length,
        combined_chars: fm.combined_chars,
        disabled: fm.disabled,
        user_invocable: fm.user_invocable,
      });
    } catch { /* skip */ }
  }

  return { skills, total_desc_chars: totalChars, disabled_count: disabledCount };
}

function scanInstalledCommands(enabledPlugins, activeInstallPaths) {
  const cacheBase = expandHome("~/.claude/plugins/cache");
  const allCmds = findFiles(cacheBase, (full, name) =>
    name.endsWith(".md") && full.includes("/commands/"),
  );

  const groups = {};
  for (const cmd of allCmds) {
    const pluginName = pluginNameFromCachePath(cmd);
    if (!pluginName) continue;
    if (!enabledPlugins.has(pluginName)) continue;
    if (activeInstallPaths && !isUnderActivePath(cmd, activeInstallPaths)) continue;
    const cmdName = path.basename(cmd, ".md");
    const key = `${pluginName}/${cmdName}`;
    if (!groups[key] || mtime(cmd) > mtime(groups[key])) {
      groups[key] = cmd;
    }
  }

  let totalChars = 0;
  let disabledCount = 0;
  const commands = [];

  for (const [key, cmdPath] of Object.entries(groups).sort()) {
    const [plugin, command] = key.split("/");
    try {
      const content = fs.readFileSync(cmdPath, "utf-8").slice(0, 4000);
      const fm = parseFrontmatter(content);
      if (!fm) {
        const firstPara = content.replace(/^---[\s\S]*?---\s*/, "").trim().split("\n\n")[0] || "";
        const desc = firstPara.slice(0, 300);
        totalChars += desc.length;
        commands.push({
          plugin, command, description: desc,
          desc_chars: desc.length, when_to_use_chars: 0, combined_chars: desc.length,
          disabled: false, user_invocable: true,
        });
        continue;
      }
      if (!fm.disabled) {
        totalChars += fm.combined_chars;
      } else {
        disabledCount++;
      }
      commands.push({
        plugin,
        command,
        description: fm.description.slice(0, 300),
        desc_chars: fm.description.length,
        when_to_use_chars: fm.when_to_use.length,
        combined_chars: fm.combined_chars,
        disabled: fm.disabled,
        user_invocable: fm.user_invocable,
      });
    } catch { /* skip */ }
  }

  return { commands, total_desc_chars: totalChars, disabled_count: disabledCount };
}

function scanLocalSkills() {
  const skillBases = [
    path.resolve(".claude/skills"),
    expandHome("~/.claude/skills"),
  ];
  const cmdBases = [
    path.resolve(".claude/commands"),
    expandHome("~/.claude/commands"),
  ];

  let totalChars = 0;
  let disabledCount = 0;
  const skills = [];

  for (const base of skillBases) {
    let entries;
    try {
      entries = fs.readdirSync(base, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const smdPath = path.join(base, entry.name, "SKILL.md");
      try {
        const content = fs.readFileSync(smdPath, "utf-8").slice(0, 2000);
        const fm = parseFrontmatter(content);
        if (!fm) continue;
        if (!fm.disabled) {
          totalChars += fm.description.length;
        } else {
          disabledCount++;
        }
        skills.push({
          skill: entry.name,
          type: "skill",
          description: fm.description.slice(0, 300),
          desc_chars: fm.description.length,
          disabled: fm.disabled,
        });
      } catch { /* skip */ }
    }
  }

  for (const base of cmdBases) {
    let entries;
    try {
      entries = fs.readdirSync(base, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith(".md")) continue;
      const cmdPath = path.join(base, entry.name);
      try {
        const content = fs.readFileSync(cmdPath, "utf-8").slice(0, 2000);
        const fm = parseFrontmatter(content);
        const cmdName = entry.name.replace(/\.md$/, "");
        if (!fm) {
          const firstPara = content.trim().split("\n\n")[0] || "";
          const desc = firstPara.slice(0, 300);
          totalChars += desc.length;
          skills.push({ skill: cmdName, type: "command", description: desc, desc_chars: desc.length, disabled: false });
          continue;
        }
        if (!fm.disabled) {
          totalChars += fm.description.length;
        } else {
          disabledCount++;
        }
        skills.push({
          skill: cmdName,
          type: "command",
          description: fm.description.slice(0, 300),
          desc_chars: fm.description.length,
          disabled: fm.disabled,
        });
      } catch { /* skip */ }
    }
  }

  return { skills, total_desc_chars: totalChars, disabled_count: disabledCount };
}

/**
 * Collect MCP server declarations from:
 *   - user/project/local settings.json (mcpServers, enabledMcpjsonServers)
 *   - plugin .mcp.json files (file-based)
 *   - plugin.json inline `mcpServers` field (inline, per plugins-reference.md)
 *
 * Plugin-scoped MCP servers count toward the effective server list too — they're
 * started automatically when the plugin is enabled.
 */
function scanContextMetrics(enabledPlugins, activeInstallPaths, pluginManifests) {
  const mcpNames = new Set();
  const mcpSources = {};

  function addServer(name, scope) {
    if (!name) return;
    mcpNames.add(name);
    if (!mcpSources[name]) mcpSources[name] = scope;
  }

  // settings.json layers
  for (const { path: sf, scope } of [
    { path: expandHome("~/.claude/settings.json"), scope: "user" },
    { path: ".claude/settings.json", scope: "project" },
    { path: ".claude/settings.local.json", scope: "local" },
  ]) {
    try {
      const data = JSON.parse(fs.readFileSync(sf, "utf-8"));
      for (const key of Object.keys(data.mcpServers || {})) addServer(key, scope);
      for (const key of Object.keys(data.enabledMcpjsonServers || {})) addServer(key, scope);
    } catch { /* skip */ }
  }

  // Plugin file-based .mcp.json
  const cacheBase = expandHome("~/.claude/plugins/cache");
  const mcpFiles = findFiles(cacheBase, (full, name) => name === ".mcp.json");
  for (const mf of mcpFiles) {
    const plugin = pluginNameFromCachePath(mf);
    if (!plugin || !enabledPlugins.has(plugin)) continue;
    if (activeInstallPaths && activeInstallPaths.size > 0 && !isUnderActivePath(mf, activeInstallPaths)) continue;
    try {
      const data = JSON.parse(fs.readFileSync(mf, "utf-8"));
      for (const key of Object.keys(data.mcpServers || data || {})) addServer(key, `plugin:${plugin}`);
    } catch { /* skip */ }
  }

  // Plugin inline mcpServers (from plugin.json)
  for (const manifest of (pluginManifests || [])) {
    const inline = manifest.data && manifest.data.mcpServers;
    if (inline && typeof inline === "object" && !Array.isArray(inline) && typeof inline !== "string") {
      for (const key of Object.keys(inline)) addServer(key, `plugin:${manifest.name} (inline)`);
    }
  }

  const servers = [...mcpNames].map(name => ({ name, source_scope: mcpSources[name] || "unknown" }));
  return { mcp_servers: mcpNames.size, servers };
}

// ---------------------------------------------------------------------------
// New scanners for environment-health
// ---------------------------------------------------------------------------

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
        over_500_lines: bodyLines > 500,
        post_compact_truncation_risk: estTokens > 5000,
      });
    } catch { /* skip */ }
  }

  const totalEstTokens = Math.round(totalBodyChars / 4);
  return {
    skills,
    total_body_chars: totalBodyChars,
    total_est_tokens: totalEstTokens,
    over_500_lines_count: skills.filter(s => s.over_500_lines).length,
    post_compact_risky_count: skills.filter(s => s.post_compact_truncation_risk).length,
    post_compact_total_over_25k: totalEstTokens > 25000,
  };
}

/**
 * Scan CLAUDE.md files.
 *
 * Per memory.md ("How CLAUDE.md files load"):
 *   - Walks up the directory tree from cwd. We walk to filesystem root — no $HOME
 *     boundary, because the docs don't require one and users with cwd outside $HOME
 *     (e.g. /tmp, /var) otherwise see zero files.
 *   - Also loads ~/.claude/CLAUDE.md (user-scope).
 *   - Nested CLAUDE.md files below cwd are *discovered* but load lazily when files
 *     in those subdirectories are read. We enumerate them up to depth 3 and flag
 *     them separately so the report can distinguish always-loaded vs lazy-loaded.
 *
 * Per memory.md ("Instructions seem lost after /compact"):
 *   - Project-root CLAUDE.md (at cwd: `./CLAUDE.md` or `./.claude/CLAUDE.md`) is
 *     re-injected after /compact.
 *   - Nested CLAUDE.md files are NOT re-injected automatically.
 *   - User-scope and ancestor-scope are not explicitly addressed; we conservatively
 *     mark only the cwd-level project-root files as compact_resilient: true.
 */
function scanClaudeMd(excludeGlobs = []) {
  const home = os.homedir();
  const cwd = path.resolve(process.cwd());
  const locations = [];
  const seen = new Set();

  function addLoc(full, scope, loadMode, compactResilient) {
    if (seen.has(full)) return;
    seen.add(full);
    locations.push({ path: full, scope, load_mode: loadMode, compact_resilient: compactResilient });
  }

  // User-global (~/.claude/CLAUDE.md)
  addLoc(path.join(home, ".claude", "CLAUDE.md"), "user", "always-loaded", false);

  // Project root at cwd: survives compact per docs
  addLoc(path.join(cwd, "CLAUDE.md"), "project-root", "always-loaded", true);
  addLoc(path.join(cwd, ".claude", "CLAUDE.md"), "project-root", "always-loaded", true);
  addLoc(path.join(cwd, "CLAUDE.local.md"), "local-root", "always-loaded", true);

  // Ancestor walk: walk to filesystem root (no $HOME boundary)
  let current = cwd;
  while (true) {
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
    addLoc(path.join(current, "CLAUDE.md"), "ancestor", "always-loaded", false);
    addLoc(path.join(current, ".claude", "CLAUDE.md"), "ancestor", "always-loaded", false);
    addLoc(path.join(current, "CLAUDE.local.md"), "ancestor-local", "always-loaded", false);
  }

  // Nested (subdirectories below cwd): lazy-loaded, not re-injected after compact
  const SKIP_DIRS = new Set(["node_modules", ".git", "dist", "build", ".venv", "venv", "__pycache__"]);
  function walkNested(dir, depth) {
    if (depth > 3) return;
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (entry.name.startsWith(".") && entry.name !== ".claude") continue;
      if (SKIP_DIRS.has(entry.name)) continue;
      const sub = path.join(dir, entry.name);
      addLoc(path.join(sub, "CLAUDE.md"), "nested", "lazy-loaded", false);
      addLoc(path.join(sub, ".claude", "CLAUDE.md"), "nested", "lazy-loaded", false);
      walkNested(sub, depth + 1);
    }
  }
  walkNested(cwd, 0);

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

  const files = [];
  let alwaysLoadedLines = 0;
  let alwaysLoadedBytes = 0;
  let nestedLines = 0;
  let nestedBytes = 0;
  const imports = [];
  const excluded = [];

  for (const loc of locations) {
    const isExcluded = excludeGlobs.some(g => matchGlob(loc.path, g));
    if (isExcluded) { excluded.push(loc.path); continue; }
    try {
      const content = fs.readFileSync(loc.path, "utf-8");
      const lines = content.split("\n").length;
      const bytes = Buffer.byteLength(content, "utf-8");
      if (loc.load_mode === "always-loaded") {
        alwaysLoadedLines += lines;
        alwaysLoadedBytes += bytes;
      } else {
        nestedLines += lines;
        nestedBytes += bytes;
      }

      const importMatches = content.match(/@[\w.\/~-]+/g) || [];
      for (const imp of importMatches) {
        if (!imp.includes("/") && !imp.includes(".")) continue;
        imports.push({ from: loc.path, target: imp, scope: loc.scope });
      }

      files.push({
        path: loc.path,
        scope: loc.scope,
        load_mode: loc.load_mode,
        compact_resilient: loc.compact_resilient,
        lines,
        bytes,
        est_tokens: Math.round(bytes / 4),
        over_200_lines: lines > 200,
      });
    } catch { /* file doesn't exist, skip */ }
  }

  return {
    files,
    total_lines: alwaysLoadedLines,
    total_bytes: alwaysLoadedBytes,
    total_est_tokens: Math.round(alwaysLoadedBytes / 4),
    nested_lines: nestedLines,
    nested_bytes: nestedBytes,
    nested_est_tokens: Math.round(nestedBytes / 4),
    imports,
    excluded_by_settings: excluded,
  };
}

/** Scan rules directories (.claude/rules + ~/.claude/rules). */
function scanRules() {
  const rulesBases = [
    { path: ".claude/rules", scope: "project" },
    { path: expandHome("~/.claude/rules"), scope: "user" },
  ];

  const rules = [];
  let alwaysLoadedCount = 0;
  let onDemandCount = 0;
  let totalBytes = 0;

  for (const { path: base, scope } of rulesBases) {
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
          scope,
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

/** Scan MEMORY.md for the current project. */
function scanMemory() {
  const memoryBase = expandHome("~/.claude/projects");
  const cwd = process.cwd();
  const encodedPath = cwd.replace(/\//g, "-");
  const possiblePaths = [
    path.join(memoryBase, encodedPath, "memory", "MEMORY.md"),
  ];

  try {
    const dirs = fs.readdirSync(memoryBase);
    for (const d of dirs) {
      const memPath = path.join(memoryBase, d, "memory", "MEMORY.md");
      if (!possiblePaths.includes(memPath)) possiblePaths.push(memPath);
    }
  } catch { /* skip */ }

  for (const mp of possiblePaths) {
    try {
      const content = fs.readFileSync(mp, "utf-8");
      const lines = content.split("\n").length;
      const bytes = Buffer.byteLength(content, "utf-8");
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

  return {
    path: null,
    lines: 0,
    bytes: 0,
    over_200_lines: false,
    over_25kb: false,
    pct_of_limit: 0,
    topic_files: 0,
  };
}

/**
 * Enhanced hook scanner.
 *
 * Hook sources (all merged):
 *   - settings.json (user/project/local)
 *   - plugin hooks/hooks.json (file-based)
 *   - plugin.json inline `hooks` field (inline — plugins-reference.md allows
 *     string, array, OR object for this field; scan only object-form inline defs)
 */
function scanHookInventoryDetailed(enabledPlugins, activeInstallPaths, pluginManifests) {
  const eventCounts = {};
  const hookTypes = { command: 0, http: 0, prompt: 0, agent: 0 };
  const eventCollisions = [];
  const allHookEntries = [];
  let total = 0;

  function processHooks(hooks, source) {
    if (!hooks || typeof hooks !== "object") return;
    const hookMap = hooks.hooks || hooks;
    for (const [event, matchers] of Object.entries(hookMap)) {
      if (event === "description") continue;
      const list = Array.isArray(matchers) ? matchers : [matchers];
      for (const matcherGroup of list) {
        const matcher = (matcherGroup && matcherGroup.matcher) || "*";
        const handlers = (matcherGroup && matcherGroup.hooks) || [matcherGroup];
        const handlerList = Array.isArray(handlers) ? handlers : [handlers];
        for (const h of handlerList) {
          total++;
          const t = (h && typeof h === "object" && h.type) ? h.type : "command";
          hookTypes[t] = (hookTypes[t] || 0) + 1;
          eventCounts[event] = (eventCounts[event] || 0) + 1;
          allHookEntries.push({ event, matcher, source, type: t });
        }
      }
    }
  }

  for (const sf of [".claude/settings.local.json", ".claude/settings.json"]) {
    try {
      const data = JSON.parse(fs.readFileSync(sf, "utf-8"));
      if (data.hooks) processHooks(data.hooks, "project");
    } catch { /* skip */ }
  }

  try {
    const data = JSON.parse(fs.readFileSync(expandHome("~/.claude/settings.json"), "utf-8"));
    if (data.hooks) processHooks(data.hooks, "user");
  } catch { /* skip */ }

  const cacheBase = expandHome("~/.claude/plugins/cache");
  const hookFiles = findFiles(cacheBase, (full, name) => name === "hooks.json" && full.includes("/hooks/"));
  for (const hfPath of hookFiles) {
    const plugin = pluginNameFromCachePath(hfPath);
    if (!plugin || !enabledPlugins.has(plugin)) continue;
    if (activeInstallPaths && activeInstallPaths.size > 0 && !isUnderActivePath(hfPath, activeInstallPaths)) continue;
    try {
      const data = JSON.parse(fs.readFileSync(hfPath, "utf-8"));
      processHooks(data, `plugin:${plugin}`);
    } catch { /* skip */ }
  }

  // Inline hooks from plugin.json. `hooks` field can be string (path), array (paths),
  // or object (inline config). Only object form is inline — we only process that shape.
  for (const manifest of (pluginManifests || [])) {
    const inline = manifest.data && manifest.data.hooks;
    if (inline && typeof inline === "object" && !Array.isArray(inline) && typeof inline !== "string") {
      processHooks(inline, `plugin:${manifest.name} (inline)`);
    }
  }

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
 * Scan plugin-level components beyond skills/commands/agents/hooks/MCP:
 *   - bin/            → executables added to Bash PATH (security-relevant surface)
 *   - monitors/       → background processes running for session lifetime
 *   - .lsp.json       → LSP subprocesses (persistent)
 *   - output-styles/  → prompt-style overrides
 *   - channels (plugin.json) → MCP-bound message injection channels
 *
 * Respects installPath active-copy gating. Reports per-plugin and aggregate counts.
 */
function scanPluginComponents(enabledPlugins, activeInstallPaths, pluginManifests) {
  const perPlugin = {};
  const totals = { bin: 0, monitors: 0, lsp_servers: 0, output_styles: 0, channels: 0 };

  function bump(name, key, delta) {
    if (!perPlugin[name]) perPlugin[name] = { bin: 0, monitors: 0, lsp_servers: 0, output_styles: 0, channels: 0 };
    perPlugin[name][key] = (perPlugin[name][key] || 0) + delta;
    totals[key] += delta;
  }

  for (const manifest of (pluginManifests || [])) {
    const { name, manifestPath, data } = manifest;
    if (!enabledPlugins.has(name)) continue;
    const pluginRoot = path.dirname(path.dirname(manifestPath)); // strip .claude-plugin/

    // bin/
    try {
      const binEntries = fs.readdirSync(path.join(pluginRoot, "bin"), { withFileTypes: true });
      const execs = binEntries.filter(e => e.isFile()).length;
      if (execs > 0) bump(name, "bin", execs);
    } catch { /* no bin/ */ }

    // monitors — monitors/monitors.json (default) OR inline `monitors` field in plugin.json
    let monitorsCount = 0;
    const monitorsField = data && data.monitors;
    if (Array.isArray(monitorsField)) {
      monitorsCount = monitorsField.length;
    } else {
      const monitorsPath = typeof monitorsField === "string"
        ? path.join(pluginRoot, monitorsField)
        : path.join(pluginRoot, "monitors", "monitors.json");
      try {
        const arr = JSON.parse(fs.readFileSync(monitorsPath, "utf-8"));
        if (Array.isArray(arr)) monitorsCount = arr.length;
      } catch { /* skip */ }
    }
    if (monitorsCount > 0) bump(name, "monitors", monitorsCount);

    // LSP servers — .lsp.json (default) OR inline `lspServers` field in plugin.json
    let lspCount = 0;
    const lspInline = data && data.lspServers;
    if (lspInline && typeof lspInline === "object" && !Array.isArray(lspInline) && typeof lspInline !== "string") {
      lspCount = Object.keys(lspInline).length;
    } else {
      const lspPath = typeof lspInline === "string"
        ? path.join(pluginRoot, lspInline)
        : path.join(pluginRoot, ".lsp.json");
      try {
        const obj = JSON.parse(fs.readFileSync(lspPath, "utf-8"));
        lspCount = Object.keys(obj || {}).length;
      } catch { /* skip */ }
    }
    if (lspCount > 0) bump(name, "lsp_servers", lspCount);

    // output-styles
    try {
      const entries = fs.readdirSync(path.join(pluginRoot, "output-styles"), { withFileTypes: true });
      const styles = entries.filter(e => e.isFile() && e.name.endsWith(".md")).length;
      if (styles > 0) bump(name, "output_styles", styles);
    } catch { /* no output-styles/ */ }

    // channels (only inline, no file fallback per plugins-reference.md)
    const channels = Array.isArray(data && data.channels) ? data.channels.length : 0;
    if (channels > 0) bump(name, "channels", channels);
  }

  return { per_plugin: perPlugin, totals };
}

/**
 * Scan subagent frontmatter for preloaded skills.
 *
 * Per sub-agents.md: "Subagents with preloaded skills work differently — the full
 * skill content is injected at startup." So a subagent with N preload skills incurs
 * a startup cost proportional to those skill bodies (not descriptions).
 */
function scanSubagentPreloads(enabledPlugins, activeInstallPaths) {
  const cacheBase = expandHome("~/.claude/plugins/cache");
  const agentFiles = findFiles(cacheBase, (full, name) =>
    name.endsWith(".md") && full.includes("/agents/"),
  );

  // Dedup per plugin/agent
  const groups = {};
  for (const af of agentFiles) {
    const plugin = pluginNameFromCachePath(af);
    if (!plugin || !enabledPlugins.has(plugin)) continue;
    if (activeInstallPaths && activeInstallPaths.size > 0 && !isUnderActivePath(af, activeInstallPaths)) continue;
    const agentName = path.basename(af, ".md");
    const key = `${plugin}/${agentName}`;
    if (!groups[key] || mtime(af) > mtime(groups[key])) groups[key] = af;
  }

  const agents = [];
  let totalPreloaded = 0;
  for (const [key, af] of Object.entries(groups).sort()) {
    try {
      const content = fs.readFileSync(af, "utf-8").slice(0, 4000);
      const fm = parseFrontmatter(content);
      if (!fm) continue;
      if (fm.preload_skills && fm.preload_skills.length > 0) {
        const [plugin, agent] = key.split("/");
        agents.push({ plugin, agent, preload_skills: fm.preload_skills });
        totalPreloaded += fm.preload_skills.length;
      }
    } catch { /* skip */ }
  }

  return { agents_with_preload: agents, total_preloaded_skills: totalPreloaded };
}

/**
 * Scan per-plugin options from settings (`pluginConfigs[<id>].options`).
 * Reports keys only — never values (may contain sensitive tokens by design).
 */
function scanPluginOptions() {
  const perPlugin = {};
  for (const sf of [
    expandHome("~/.claude/settings.json"),
    ".claude/settings.json",
    ".claude/settings.local.json",
  ]) {
    try {
      const data = JSON.parse(fs.readFileSync(sf, "utf-8"));
      const cfg = data.pluginConfigs || {};
      for (const [pluginId, entry] of Object.entries(cfg)) {
        if (!entry || typeof entry !== "object") continue;
        const opts = entry.options || {};
        const shortName = String(pluginId).split("@")[0];
        if (!perPlugin[shortName]) perPlugin[shortName] = new Set();
        for (const key of Object.keys(opts)) perPlugin[shortName].add(key);
      }
    } catch { /* skip */ }
  }
  const result = {};
  for (const [name, keys] of Object.entries(perPlugin)) {
    result[name] = [...keys];
  }
  return { per_plugin: result, total_plugins_with_options: Object.keys(result).length };
}

/**
 * Scan environment variables and settings that affect context budget calculations.
 * Caveat: env vars set only inside a CC session (not exported before CC launched)
 * are NOT visible here.
 */
/**
 * Normalize ENABLE_TOOL_SEARCH per official mcp.md value table:
 *   (unset)  -> deferred (+ upfront fallback if ANTHROPIC_BASE_URL is non-first-party)
 *   true     -> deferred (forced, survives proxy fallback)
 *   auto     -> threshold mode at 10%
 *   auto:<N> -> threshold mode at N%
 *   false    -> upfront (all MCP schemas always loaded)
 * Anything unrecognized is reported verbatim so users can spot typos.
 */
function normalizeEnableToolSearch(rawValue, baseUrl) {
  const isFirstPartyBase = !baseUrl
    || /(^|\.)anthropic\.com(\/|$)/.test(baseUrl)
    || /(^|\.)claude\.com(\/|$)/.test(baseUrl);

  if (rawValue === undefined || rawValue === "") {
    return {
      raw: null,
      effective_mode: isFirstPartyBase ? "deferred" : "upfront",
      threshold_pct: null,
      proxy_fallback_applied: !isFirstPartyBase,
      note: isFirstPartyBase
        ? "unset → deferred (default)"
        : "unset + non-first-party ANTHROPIC_BASE_URL → upfront fallback",
    };
  }

  const lowered = String(rawValue).toLowerCase();
  if (lowered === "true") {
    return {
      raw: rawValue, effective_mode: "deferred", threshold_pct: null,
      proxy_fallback_applied: false,
      note: "true → deferred (forced, overrides proxy fallback)",
    };
  }
  if (lowered === "false") {
    return {
      raw: rawValue, effective_mode: "upfront", threshold_pct: null,
      proxy_fallback_applied: false,
      note: "false → all MCP schemas loaded upfront",
    };
  }
  if (lowered === "auto") {
    return {
      raw: rawValue, effective_mode: "auto", threshold_pct: 10,
      proxy_fallback_applied: false,
      note: "auto → schemas load upfront if ≤10% of context",
    };
  }
  const autoCustom = lowered.match(/^auto:(\d+)$/);
  if (autoCustom) {
    const pct = parseInt(autoCustom[1], 10);
    return {
      raw: rawValue, effective_mode: "auto", threshold_pct: pct,
      proxy_fallback_applied: false,
      note: `auto:${pct} → schemas load upfront if ≤${pct}% of context`,
    };
  }
  return {
    raw: rawValue, effective_mode: "unknown", threshold_pct: null,
    proxy_fallback_applied: false,
    note: `Unrecognized value: ${rawValue}`,
  };
}

function scanEnvAndSettings() {
  const env = process.env;

  const descBudgetOverride = env.SLASH_COMMAND_TOOL_CHAR_BUDGET
    ? parseInt(env.SLASH_COMMAND_TOOL_CHAR_BUDGET, 10)
    : null;

  const anthropicBaseUrl = env.ANTHROPIC_BASE_URL || null;
  const toolSearch = normalizeEnableToolSearch(env.ENABLE_TOOL_SEARCH, anthropicBaseUrl);

  const addDirClaudeMd = env.CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD === "1";
  const autoMemoryDisabled = env.CLAUDE_CODE_DISABLE_AUTO_MEMORY === "1";
  const agentTeamsEnabled = env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS === "1";

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
    enable_tool_search: toolSearch,
    anthropic_base_url: anthropicBaseUrl,
    add_dir_claude_md: addDirClaudeMd,
    auto_memory_disabled: autoMemoryDisabled,
    agent_teams_enabled: agentTeamsEnabled,
    claude_md_excludes: [...excludeGlobs],
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function parseArgs() {
  const args = {};
  for (const arg of process.argv.slice(2)) {
    const m = arg.match(/^--([^=]+)(?:=(.*))?$/);
    if (m) args[m[1]] = m[2] ?? true;
  }
  return args;
}

/** Collect plugin.json data once and reuse across scanners that need manifest content. */
function collectPluginManifests(enabledPlugins, activeInstallPaths) {
  const cacheBase = expandHome("~/.claude/plugins/cache");
  const allPluginJsons = findFiles(
    cacheBase,
    (full, name) => name === "plugin.json" && full.includes(".claude-plugin"),
  );
  const groups = {};
  for (const pj of allPluginJsons) {
    const name = pluginNameFromCachePath(pj);
    if (!name || !enabledPlugins.has(name)) continue;
    if (activeInstallPaths && activeInstallPaths.size > 0 && !isUnderActivePath(pj, activeInstallPaths)) continue;
    if (!groups[name] || mtime(pj) > mtime(groups[name])) groups[name] = pj;
  }
  const manifests = [];
  for (const [name, pjPath] of Object.entries(groups)) {
    try {
      const data = JSON.parse(fs.readFileSync(pjPath, "utf-8"));
      manifests.push({ name, manifestPath: pjPath, data });
    } catch { /* skip */ }
  }
  return manifests;
}

function main() {
  const args = parseArgs();
  // Context window size must be passed in from SKILL.md orchestrator —
  // the Node subprocess cannot detect the session's active window size.
  const contextWindowSize = parseInt(args["window-size"] || "200000", 10);

  const { enabled: enabledPlugins, disabled: disabledPlugins } = getPluginStates();
  const activeInstallPaths = getActiveInstallPaths();
  const envSettings = scanEnvAndSettings();
  const pluginManifests = collectPluginManifests(enabledPlugins, activeInstallPaths);

  const result = {
    scan_date: new Date().toISOString().slice(0, 10),
    context_window_size: contextWindowSize,
    env_and_settings: envSettings,
    installed_plugins: scanInstalledPlugins(enabledPlugins, activeInstallPaths),
    disabled_plugins: [...disabledPlugins],
    installed_skills: scanInstalledSkills(enabledPlugins, activeInstallPaths),
    installed_commands: scanInstalledCommands(enabledPlugins, activeInstallPaths),
    local_skills: scanLocalSkills(),
    skill_bodies: scanSkillBodies(enabledPlugins, activeInstallPaths),
    hook_inventory: scanHookInventoryDetailed(enabledPlugins, activeInstallPaths, pluginManifests),
    context_metrics: scanContextMetrics(enabledPlugins, activeInstallPaths, pluginManifests),
    plugin_components: scanPluginComponents(enabledPlugins, activeInstallPaths, pluginManifests),
    subagent_preloads: scanSubagentPreloads(enabledPlugins, activeInstallPaths),
    plugin_options: scanPluginOptions(),
    claude_md: scanClaudeMd(envSettings.claude_md_excludes),
    rules: scanRules(),
    memory: scanMemory(),
  };

  console.log(JSON.stringify(result, null, 2));
}

main();
