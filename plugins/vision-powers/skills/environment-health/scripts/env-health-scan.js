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

// ---------------------------------------------------------------------------
// Scanners reused from env-fit-scan.js
// ---------------------------------------------------------------------------

function scanInstalledPlugins(enabledPlugins) {
  const cacheBase = expandHome("~/.claude/plugins/cache");
  const allPluginJsons = findFiles(
    cacheBase,
    (full, name) => name === "plugin.json" && full.includes(".claude-plugin"),
  );

  const groups = deduplicateByPlugin(allPluginJsons, pluginNameFromCachePath);
  const plugins = [];

  for (const [name, pjPath] of Object.entries(groups).sort()) {
    if (!enabledPlugins.has(name)) continue;
    try {
      const data = JSON.parse(fs.readFileSync(pjPath, "utf-8"));
      plugins.push({ name, description: data.description || "" });
    } catch {
      plugins.push({ name, description: "" });
    }
  }
  return plugins;
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
      const content = fs.readFileSync(smdPath, "utf-8").slice(0, 2000);
      const fm = parseFrontmatter(content);
      if (!fm) continue;
      if (!fm.disabled) {
        totalChars += fm.description.length;
      } else {
        disabledCount++;
      }
      skills.push({
        plugin,
        skill,
        description: fm.description.slice(0, 300),
        desc_chars: fm.description.length,
        disabled: fm.disabled,
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
      const content = fs.readFileSync(cmdPath, "utf-8").slice(0, 2000);
      const fm = parseFrontmatter(content);
      if (!fm) {
        const firstPara = content.replace(/^---[\s\S]*?---\s*/, "").trim().split("\n\n")[0] || "";
        const desc = firstPara.slice(0, 300);
        totalChars += desc.length;
        commands.push({ plugin, command, description: desc, desc_chars: desc.length, disabled: false });
        continue;
      }
      if (!fm.disabled) {
        totalChars += fm.description.length;
      } else {
        disabledCount++;
      }
      commands.push({
        plugin,
        command,
        description: fm.description.slice(0, 300),
        desc_chars: fm.description.length,
        disabled: fm.disabled,
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

function scanContextMetrics() {
  const mcpNames = new Set();
  const mcpSources = {};
  const settingsFiles = [
    { path: expandHome("~/.claude/settings.json"), scope: "user" },
    { path: ".claude/settings.json", scope: "project" },
    { path: ".claude/settings.local.json", scope: "local" },
  ];
  for (const { path: sf, scope } of settingsFiles) {
    try {
      const data = JSON.parse(fs.readFileSync(sf, "utf-8"));
      for (const key of Object.keys(data.mcpServers || {})) {
        mcpNames.add(key);
        if (!mcpSources[key]) mcpSources[key] = scope;
      }
      for (const key of Object.keys(data.enabledMcpjsonServers || {})) {
        mcpNames.add(key);
        if (!mcpSources[key]) mcpSources[key] = scope;
      }
    } catch { /* skip */ }
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

/** Scan CLAUDE.md files: sizes, line counts, @imports.
 *  Walks from cwd up to $HOME (inclusive) collecting each CLAUDE.md along the way,
 *  plus ~/.claude/CLAUDE.md. Respects claudeMdExcludes from merged settings layers.
 */
function scanClaudeMd(excludeGlobs = []) {
  const home = os.homedir();
  const locations = [];
  const seen = new Set();

  const userGlobal = path.join(home, ".claude", "CLAUDE.md");
  if (!seen.has(userGlobal)) {
    locations.push({ path: userGlobal, scope: "user" });
    seen.add(userGlobal);
  }

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

/** Enhanced hook scanner: event-level detail, type classification, collision detection. */
function scanHookInventoryDetailed(enabledPlugins) {
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
  const groups = deduplicateByPlugin(hookFiles, pluginNameFromCachePath);
  for (const [plugin, hfPath] of Object.entries(groups).sort()) {
    if (!enabledPlugins.has(plugin)) continue;
    try {
      const data = JSON.parse(fs.readFileSync(hfPath, "utf-8"));
      processHooks(data, `plugin:${plugin}`);
    } catch { /* skip */ }
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
 * Scan environment variables and settings that affect context budget calculations.
 * Caveat: env vars set only inside a CC session (not exported before CC launched)
 * are NOT visible here.
 */
function scanEnvAndSettings() {
  const env = process.env;

  const descBudgetOverride = env.SLASH_COMMAND_TOOL_CHAR_BUDGET
    ? parseInt(env.SLASH_COMMAND_TOOL_CHAR_BUDGET, 10)
    : null;

  const enableToolSearch = env.ENABLE_TOOL_SEARCH || "deferred";

  const addDirClaudeMd = env.CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD === "1";

  const autoMemoryDisabled = env.CLAUDE_CODE_DISABLE_AUTO_MEMORY === "1";

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

function main() {
  const args = parseArgs();
  // Context window size must be passed in from SKILL.md orchestrator —
  // the Node subprocess cannot detect the session's active window size.
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
