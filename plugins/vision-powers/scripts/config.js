#!/usr/bin/env node
/**
 * Configuration manager for vision-powers.
 *
 * Reads/writes user preferences to ${CLAUDE_PLUGIN_DATA}/config.json
 * (falls back to ~/.claude-code-zero/vision-powers/config.json if CLAUDE_PLUGIN_DATA is not set).
 *
 * Usage:
 *   node config.js get [key]          # Get a config value (or all if no key)
 *   node config.js set <key> <value>  # Set a config value
 *   node config.js path               # Print the config file path
 *
 * Supported keys:
 *   default_language  — Default output language (e.g., "ko", "en", "ja")
 *   default_format    — Default report format ("html" or "md") when --format isn't given
 *   aesthetic         — Preferred aesthetic (Blueprint, Editorial, Paper-ink, Monochrome)
 *   auto_open         — Auto-open report in browser after generation (true/false)
 *   artifact          — Channel preference for HTML reports (see below)
 *   reports_dir       — Custom reports output directory
 *
 * The `artifact` key (channel default; SSOT = references/design-system/channel-decision.md + ADR 0009):
 *   absent  → interpret as artifact-first — capable HTML publishes to a claude.ai Artifact by default
 *             (flipped from pre-0009, where absent meant off). This store has no default logic; the
 *             "absent = artifact-first" interpretation lives in each skill's Format table, not here.
 *   false   → persistent force-local (the config twin of the `--local` flag); skills render locally.
 *   true    → explicitly artifact-first (same as absent).
 * A this-turn `--local`/`--artifact` signal always overrides this config value.
 *
 * Exit codes:
 *   0 = success
 *   1 = key not found (for get)
 *   2 = usage error
 */

const fs = require("fs");
const path = require("path");
const os = require("os");

// ---------------------------------------------------------------------------
// Config path resolution
// ---------------------------------------------------------------------------
function getConfigPath() {
  // Prefer CLAUDE_PLUGIN_DATA if set (stable across plugin updates)
  const pluginData = process.env.CLAUDE_PLUGIN_DATA;
  if (pluginData) {
    return path.join(pluginData, "config.json");
  }
  // Fallback should not happen in practice — CLAUDE_PLUGIN_DATA is always set for installed plugins
  return path.join(os.homedir(), ".claude-code-zero", "vision-powers", "config.json");
}

function readConfig() {
  const configPath = getConfigPath();
  try {
    return JSON.parse(fs.readFileSync(configPath, "utf-8"));
  } catch {
    return {};
  }
}

function writeConfig(config) {
  const configPath = getConfigPath();
  const dir = path.dirname(configPath);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n");
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------
function main() {
  const [,, command, key, ...rest] = process.argv;

  if (!command || command === "help") {
    console.error("Usage: node config.js <get|set|path> [key] [value]");
    process.exit(2);
  }

  if (command === "path") {
    console.log(getConfigPath());
    return;
  }

  if (command === "get") {
    const config = readConfig();
    if (!key) {
      // Print all config
      if (Object.keys(config).length === 0) {
        console.log("{}");
      } else {
        console.log(JSON.stringify(config, null, 2));
      }
      return;
    }
    if (key in config) {
      console.log(config[key]);
    } else {
      process.exit(1);
    }
    return;
  }

  if (command === "set") {
    if (!key || rest.length === 0) {
      console.error("Usage: node config.js set <key> <value>");
      process.exit(2);
    }
    const value = rest.join(" ");
    const config = readConfig();
    // Parse booleans
    if (value === "true") config[key] = true;
    else if (value === "false") config[key] = false;
    else config[key] = value;
    writeConfig(config);
    console.log(`Set ${key} = ${config[key]}`);
    return;
  }

  console.error(`Unknown command: ${command}`);
  process.exit(2);
}

main();
