#!/usr/bin/env node
/**
 * Track palette + font-pairing choices across report runs so each new report
 * can avoid the last N combinations. Without this, every report made by the
 * same skill tends to converge on the same look, violating the "vary every
 * time" principle from the original visual-explainer skill.
 *
 * History lives at ${CLAUDE_PLUGIN_DATA}/aesthetic-history.json (or the path
 * passed via --history). Entries are appended and capped at 20 most-recent.
 *
 * Usage:
 *   node aesthetic-rotation.js recent [--n 3] [--history PATH]
 *     Prints a JSON array of the N most-recent entries (newest last). Safe to
 *     embed in an orchestrator prompt as the "avoid these combinations" list.
 *
 *   node aesthetic-rotation.js record --accent HEX --body-font NAME [--heading-font NAME] [--mono-font NAME] [--skill NAME] [--history PATH]
 *     Appends the current choice with a timestamp.
 *
 *   node aesthetic-rotation.js extract --metadata PATH [--history PATH] [--skill NAME]
 *     Reads metadata.json emitted by the visual-report-writer, pulls the
 *     accent and font values out of `css_variables`, and records them. Called
 *     automatically by assemble-report.js after each successful assembly.
 */

const fs = require("fs");
const path = require("path");

const MAX_ENTRIES = 20;
const DEFAULT_RECENT = 3;

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 2; i < argv.length; i++) {
    const tok = argv[i];
    if (tok.startsWith("--")) {
      const key = tok.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith("--")) {
        args[key] = true;
      } else {
        args[key] = next;
        i++;
      }
    } else {
      args._.push(tok);
    }
  }
  return args;
}

function resolveHistoryPath(args) {
  if (args.history) return args.history;
  const dataRoot = process.env.CLAUDE_PLUGIN_DATA;
  if (!dataRoot) {
    const fallback = path.join(
      process.env.HOME || "",
      ".claude",
      "plugins",
      "data",
      "vision-powers",
    );
    return path.join(fallback, "aesthetic-history.json");
  }
  return path.join(dataRoot, "aesthetic-history.json");
}

function readHistory(file) {
  if (!fs.existsSync(file)) return [];
  try {
    const raw = fs.readFileSync(file, "utf-8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeHistory(file, entries) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(entries, null, 2), "utf-8");
}

function normalizeFont(name) {
  if (!name || typeof name !== "string") return null;
  const first = name
    .replace(/['"]/g, "")
    .split(",")[0]
    .trim();
  return first || null;
}

function normalizeHex(hex) {
  if (!hex || typeof hex !== "string") return null;
  const m = hex.trim().match(/#?([0-9a-fA-F]{3,8})/);
  if (!m) return null;
  let value = m[1].toLowerCase();
  if (value.length === 3) {
    value = value
      .split("")
      .map((c) => c + c)
      .join("");
  }
  if (value.length === 6 || value.length === 8) return `#${value}`;
  return null;
}

function cmdRecent(args) {
  const n = parseInt(args.n, 10) || DEFAULT_RECENT;
  const file = resolveHistoryPath(args);
  const entries = readHistory(file);
  const recent = entries.slice(-n);
  process.stdout.write(JSON.stringify(recent));
}

function cmdRecord(args) {
  const accent = normalizeHex(args.accent);
  const body = normalizeFont(args["body-font"]);
  if (!accent || !body) {
    console.error("Error: --accent and --body-font are required");
    process.exit(1);
  }
  const file = resolveHistoryPath(args);
  const entries = readHistory(file);
  entries.push({
    at: new Date().toISOString(),
    skill: args.skill || null,
    accent,
    body_font: body,
    heading_font: normalizeFont(args["heading-font"]),
    mono_font: normalizeFont(args["mono-font"]),
  });
  const trimmed = entries.slice(-MAX_ENTRIES);
  writeHistory(file, trimmed);
  process.stdout.write(JSON.stringify({ recorded: true, total: trimmed.length }));
}

function extractFromCssVariables(css) {
  if (!css || typeof css !== "string") return {};
  const find = (key) => {
    const re = new RegExp(`--${key}\\s*:\\s*([^;]+);`);
    const m = css.match(re);
    return m ? m[1].trim() : null;
  };
  return {
    accent: find("accent"),
    body_font: find("font-body"),
    heading_font: find("font-heading"),
    mono_font: find("font-mono"),
  };
}

function cmdExtract(args) {
  if (!args.metadata) {
    console.error("Error: --metadata PATH is required");
    process.exit(1);
  }
  if (!fs.existsSync(args.metadata)) {
    console.error(`Error: metadata file not found: ${args.metadata}`);
    process.exit(1);
  }
  let metadata;
  try {
    metadata = JSON.parse(fs.readFileSync(args.metadata, "utf-8"));
  } catch (err) {
    console.error(`Error: failed to parse metadata JSON: ${err.message}`);
    process.exit(1);
  }
  const extracted = extractFromCssVariables(metadata.css_variables || "");
  const accent = normalizeHex(extracted.accent);
  const body = normalizeFont(extracted.body_font);
  if (!accent || !body) {
    // Not an error — some templates may not expose these via css_variables.
    // Emit a quiet stderr note so callers can see it during verbose runs.
    console.error(
      "aesthetic-rotation: skipped record (accent or body font missing from css_variables)",
    );
    process.stdout.write(JSON.stringify({ recorded: false, reason: "missing-fields" }));
    return;
  }
  const file = resolveHistoryPath(args);
  const entries = readHistory(file);
  entries.push({
    at: new Date().toISOString(),
    skill: args.skill || null,
    accent,
    body_font: body,
    heading_font: normalizeFont(extracted.heading_font),
    mono_font: normalizeFont(extracted.mono_font),
  });
  const trimmed = entries.slice(-MAX_ENTRIES);
  writeHistory(file, trimmed);
  process.stdout.write(JSON.stringify({ recorded: true, total: trimmed.length, entry: trimmed[trimmed.length - 1] }));
}

function main() {
  const args = parseArgs(process.argv);
  const sub = args._[0];
  switch (sub) {
    case "recent":
      return cmdRecent(args);
    case "record":
      return cmdRecord(args);
    case "extract":
      return cmdExtract(args);
    default:
      console.error("Usage: aesthetic-rotation.js <recent|record|extract> [flags]");
      process.exit(1);
  }
}

main();
