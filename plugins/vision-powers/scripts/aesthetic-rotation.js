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

const TOKEN_SETS = [
  {
    id: "warm-stone", scheme: "light",
    tokens: { paper:"#faf7f2", "paper-2":"#f2ede4", ink:"#1c1917", muted:"#57534e", soft:"#78716c", rule:"rgba(28,25,23,0.12)", accent:"#b5523a", "accent-tint":"rgba(181,82,58,0.08)", link:"#2563eb" },
    fonts: { title:"'Instrument Serif', serif", body:"'Geist', sans-serif", mono:"'Geist Mono', monospace" },
  },
  { id:"cool-slate", scheme:"light",
    tokens: { paper:"#f1f5f9", "paper-2":"#e2e8f0", ink:"#0f172a", muted:"#475569", soft:"#64748b", rule:"rgba(15,23,42,0.12)", accent:"#0369a1", "accent-tint":"rgba(3,105,161,0.10)", link:"#2563eb" },
    fonts: { title:"'Instrument Serif', serif", body:"'Geist', sans-serif", mono:"'Geist Mono', monospace" },
  },
  { id:"editorial-ink", scheme:"light",
    tokens: { paper:"#fafaf9", "paper-2":"#f5f5f4", ink:"#18181b", muted:"#52525b", soft:"#71717a", rule:"rgba(24,24,27,0.12)", accent:"#7c2d12", "accent-tint":"rgba(124,45,18,0.10)", link:"#1d4ed8" },
    fonts: { title:"'Instrument Serif', serif", body:"'Geist', sans-serif", mono:"'Geist Mono', monospace" },
  },
  { id:"blueprint", scheme:"light",
    tokens: { paper:"#eff6ff", "paper-2":"#dbeafe", ink:"#1e3a8a", muted:"#3730a3", soft:"#4338ca", rule:"rgba(30,58,138,0.12)", accent:"#dc2626", "accent-tint":"rgba(220,38,38,0.10)", link:"#1d4ed8" },
    fonts: { title:"'Instrument Serif', serif", body:"'Geist', sans-serif", mono:"'Geist Mono', monospace" },
  },
  { id:"warm-stone-dark", scheme:"dark",
    tokens: { paper:"#1c1917", "paper-2":"#292524", ink:"#faf7f2", muted:"#a8a29e", soft:"#78716c", rule:"rgba(250,247,242,0.12)", accent:"#d6724a", "accent-tint":"rgba(214,114,74,0.10)", link:"#60a5fa" },
    fonts: { title:"'Instrument Serif', serif", body:"'Geist', sans-serif", mono:"'Geist Mono', monospace" },
  },
  { id:"cool-slate-dark", scheme:"dark",
    tokens: { paper:"#0f172a", "paper-2":"#1e293b", ink:"#f1f5f9", muted:"#94a3b8", soft:"#64748b", rule:"rgba(241,245,249,0.12)", accent:"#38bdf8", "accent-tint":"rgba(56,189,248,0.10)", link:"#60a5fa" },
    fonts: { title:"'Instrument Serif', serif", body:"'Geist', sans-serif", mono:"'Geist Mono', monospace" },
  },
];

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

function cmdPick(args) {
  const file = resolveHistoryPath(args);
  const entries = readHistory(file);
  const preferScheme = args.scheme || null;
  const recentIds = new Set(entries.slice(-3).map(e => e.set_id).filter(Boolean));
  const pool = TOKEN_SETS.filter(s => !preferScheme || s.scheme === preferScheme);
  const fresh = pool.filter(s => !recentIds.has(s.id));
  const list = fresh.length ? fresh : pool;
  const chosen = list[Math.floor(Math.random() * list.length)];
  const entry = {
    at: new Date().toISOString(),
    skill: args.skill || null,
    set_id: chosen.id,
    accent: chosen.tokens.accent,
    body_font: normalizeFont(chosen.fonts.body),
    heading_font: normalizeFont(chosen.fonts.title),
    mono_font: normalizeFont(chosen.fonts.mono),
  };
  if (args.record !== "false") {
    entries.push(entry);
    writeHistory(file, entries.slice(-MAX_ENTRIES));
  }
  process.stdout.write(JSON.stringify(chosen));
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
    case "pick":
      return cmdPick(args);
    default:
      console.error("Usage: aesthetic-rotation.js <recent|record|extract|pick> [flags]");
      process.exit(1);
  }
}

main();

module.exports = { TOKEN_SETS, resolveHistoryPath, readHistory, writeHistory, cmdRecent, cmdRecord, cmdExtract, cmdPick };
