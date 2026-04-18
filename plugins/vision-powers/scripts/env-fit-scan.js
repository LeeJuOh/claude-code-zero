#!/usr/bin/env node
/**
 * Environment Fit Scanner for vision-powers.
 *
 * Scans the user's Claude Code environment to collect data for the
 * Environment Fit Diagnosis in plugin-visual reports.
 *
 * Outputs a JSON object with sections:
 *   install_status, installed_plugins, installed_skills, local_skills,
 *   hook_inventory, context_metrics
 *
 * Usage:
 *   node env-fit-scan.js --plugin-name <name>
 *
 * Exit codes:
 *   0 = success (JSON on stdout)
 *   2 = usage error
 */

const fs = require("fs");
const path = require("path");
const os = require("os");

// ---------------------------------------------------------------------------
// Arg parsing
// ---------------------------------------------------------------------------
function parseArgs(argv) {
  const args = { pluginName: null };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--plugin-name" && argv[i + 1]) {
      args.pluginName = argv[i + 1];
      i++;
    }
  }
  return args;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Simple glob: expand ~ and return matching paths via fs */
function expandHome(p) {
  return p.startsWith("~") ? path.join(os.homedir(), p.slice(1)) : p;
}

/** Recursively find files matching a test function under a directory */
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

/** Deduplicate cache paths: keep latest mtime per plugin name */
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

/** Check if a file path is under any of the active install paths */
function isUnderActivePath(filePath, activePaths) {
  for (const ap of activePaths) {
    if (filePath.startsWith(ap)) return true;
  }
  return false;
}

/** Extract plugin name from a cache path like ~/.claude/plugins/cache/marketplace/pluginName/version/... */
function pluginNameFromCachePath(p) {
  const idx = p.indexOf("/cache/");
  if (idx === -1) return null;
  const parts = p.slice(idx + 7).split("/");
  return parts.length >= 2 ? parts[1] : null;
}

/** Parse YAML frontmatter from SKILL.md or command .md content (first 2000 chars) */
function parseFrontmatter(content) {
  const m = content.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!m) return null;
  const fm = m[1];

  // Description: multiline (> or |) or inline, or quoted
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

/** Load plugin enable/disable state by merging enabledPlugins across all settings scopes.
 *  Scopes are applied in order: user → project → local. Later scopes override earlier ones.
 *  Returns { enabled: Set<string>, disabled: Set<string> }. */
function getPluginStates() {
  const state = {}; // name → true/false, later scopes override
  const settingsFiles = [
    expandHome("~/.claude/settings.json"),   // user scope
    ".claude/settings.json",                  // project scope
    ".claude/settings.local.json",            // local scope
  ];
  for (const sf of settingsFiles) {
    try {
      const data = JSON.parse(fs.readFileSync(sf, "utf-8"));
      // Legacy: disabledPlugins array (processed first; enabledPlugins can override)
      for (const entry of data.disabledPlugins || []) {
        const name = String(entry).split("@")[0];
        if (name) state[name] = false;
      }
      // enabledPlugins dict: { "name@marketplace": true/false }
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

/** Load active install paths from installed_plugins.json */
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
// Scanners
// ---------------------------------------------------------------------------

function scanInstallStatus(pluginName) {
  const cacheBase = expandHome("~/.claude/plugins/cache");
  const allPluginJsons = findFiles(cacheBase, (full, name) => name === "plugin.json");
  for (const pj of allPluginJsons) {
    if (pluginNameFromCachePath(pj) === pluginName) {
      return "INSTALLED";
    }
  }
  return "NOT_INSTALLED";
}

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

  // Deduplicate by (plugin, skill) pair
  const groups = {};
  for (const smd of allSkills) {
    const pluginName = pluginNameFromCachePath(smd);
    if (!pluginName) continue;
    if (!enabledPlugins.has(pluginName)) continue;
    // Filter: only include skills under active install paths
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
    } catch {
      /* skip unreadable */
    }
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
        // Commands without frontmatter: first paragraph is the description
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

  // Scan skills/ directories (SKILL.md in subdirectories)
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

  // Scan commands/ directories (*.md files)
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

function scanHookInventory(enabledPlugins) {
  let total = 0;
  const typeCounts = { command: 0, http: 0, prompt: 0, agent: 0 };
  const projectHooks = [];
  const pluginHooks = [];

  // Project-local hooks
  try {
    const data = JSON.parse(fs.readFileSync(".claude/settings.local.json", "utf-8"));
    const hooks = data.hooks || {};
    for (const [event, entries] of Object.entries(hooks)) {
      const list = Array.isArray(entries) ? entries : [entries];
      for (const e of list) {
        total++;
        const t = (typeof e === "object" && e.type) ? e.type : "command";
        typeCounts[t] = (typeCounts[t] || 0) + 1;
      }
      projectHooks.push({ source: "project", event, count: list.length });
    }
  } catch {
    /* no local settings */
  }

  // Plugin hooks (deduplicated, filtered by enabled plugins)
  const cacheBase = expandHome("~/.claude/plugins/cache");
  const hookFiles = findFiles(cacheBase, (full, name) => name === "hooks.json" && full.includes("/hooks/"));
  const groups = deduplicateByPlugin(hookFiles, pluginNameFromCachePath);

  for (const [plugin, hfPath] of Object.entries(groups).sort()) {
    if (!enabledPlugins.has(plugin)) continue;
    try {
      const data = JSON.parse(fs.readFileSync(hfPath, "utf-8"));
      for (const [event, entries] of Object.entries(data)) {
        const list = Array.isArray(entries) ? entries : [entries];
        for (const e of list) {
          total++;
          const t = (typeof e === "object" && e.type) ? e.type : "command";
          typeCounts[t] = (typeCounts[t] || 0) + 1;
        }
        pluginHooks.push({ source: plugin, event, count: list.length });
      }
    } catch {
      /* skip */
    }
  }

  return {
    total,
    type_counts: typeCounts,
    project_hooks: projectHooks,
    plugin_hooks: pluginHooks,
  };
}

function scanContextMetrics() {
  const mcpNames = new Set();
  const settingsFiles = [
    expandHome("~/.claude/settings.json"),   // user scope
    ".claude/settings.json",                  // project scope
    ".claude/settings.local.json",            // local scope
  ];
  for (const sf of settingsFiles) {
    try {
      const data = JSON.parse(fs.readFileSync(sf, "utf-8"));
      for (const key of Object.keys(data.mcpServers || {})) mcpNames.add(key);
      for (const key of Object.keys(data.enabledMcpjsonServers || {})) mcpNames.add(key);
    } catch { /* skip */ }
  }
  return { mcp_servers: mcpNames.size };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
function main() {
  const args = parseArgs(process.argv);
  if (!args.pluginName) {
    console.error("Usage: node env-fit-scan.js --plugin-name <name>");
    process.exit(2);
  }

  const { enabled: enabledPlugins, disabled: disabledPlugins } = getPluginStates();
  const activeInstallPaths = getActiveInstallPaths();

  const result = {
    install_status: scanInstallStatus(args.pluginName),
    installed_plugins: scanInstalledPlugins(enabledPlugins),
    installed_skills: scanInstalledSkills(enabledPlugins, activeInstallPaths),
    installed_commands: scanInstalledCommands(enabledPlugins, activeInstallPaths),
    local_skills: scanLocalSkills(),
    hook_inventory: scanHookInventory(enabledPlugins),
    context_metrics: scanContextMetrics(),
    disabled_plugins: [...disabledPlugins],
  };

  console.log(JSON.stringify(result, null, 2));
}

main();
