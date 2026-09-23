#!/usr/bin/env node
/**
 * Configuration manager for vision-powers.
 *
 * Reads/writes user preferences to <data-dir>/config.json.
 *
 * Usage (--data-dir is required; pass "${CLAUDE_PLUGIN_DATA}" from SKILL.md):
 *   node config.js get [key] --data-dir <dir>          # Get a config value (or all if no key)
 *   node config.js set <key> <value> --data-dir <dir>  # Set a config value
 *   node config.js path --data-dir <dir>               # Print the config file path
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
 *   2 = usage error (including a missing --data-dir)
 */

const fs = require("fs");
const path = require("path");

// ---------------------------------------------------------------------------
// Config path resolution
// ---------------------------------------------------------------------------
// The caller passes the plugin data dir: SKILL.md substitutes ${CLAUDE_PLUGIN_DATA}, but the
// Bash tool's environment lacks that variable or holds another plugin's folder.
function takeDataDir(argv) {
  const i = argv.indexOf("--data-dir");
  const dir = i === -1 ? "" : argv[i + 1] || "";
  if (!dir || dir.startsWith("--")) {
    console.error("Error: --data-dir <plugin data dir> is required");
    process.exit(2);
  }
  argv.splice(i, 2);
  return dir;
}

let configPath;

function readConfig() {
  try {
    return JSON.parse(fs.readFileSync(configPath, "utf-8"));
  } catch {
    return {};
  }
}

function writeConfig(config) {
  const dir = path.dirname(configPath);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n");
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------
function main() {
  const argv = process.argv.slice(2);
  configPath = path.join(takeDataDir(argv), "config.json");
  const [command, key, ...rest] = argv;

  if (!command || command === "help") {
    console.error("Usage: node config.js <get|set|path> [key] [value] --data-dir <dir>");
    process.exit(2);
  }

  if (command === "path") {
    console.log(configPath);
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
      console.error("Usage: node config.js set <key> <value> --data-dir <dir>");
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
