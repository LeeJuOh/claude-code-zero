#!/usr/bin/env node
/**
 * Report history logger for vision-powers.
 *
 * Appends an entry to ${CLAUDE_PLUGIN_DATA}/reports.log (or fallback path)
 * each time a report is generated.
 *
 * Usage:
 *   node log-report.js --path <report-path> --type <report-type> --title <title>
 *   node log-report.js --list [--limit N]
 *
 * Exit codes:
 *   0 = success
 *   2 = usage error
 */

const fs = require("fs");
const path = require("path");
const os = require("os");

function getLogPath() {
  const pluginData = process.env.CLAUDE_PLUGIN_DATA;
  if (pluginData) {
    return path.join(pluginData, "reports.log");
  }
  // Fallback should not happen in practice — CLAUDE_PLUGIN_DATA is always set for installed plugins
  return path.join(os.homedir(), ".claude-code-zero", "vision-powers", "reports.log");
}

function parseArgs(argv) {
  const args = { action: "log", reportPath: null, type: null, title: null, limit: 20 };
  for (let i = 2; i < argv.length; i++) {
    switch (argv[i]) {
      case "--path": args.reportPath = argv[++i]; break;
      case "--type": args.type = argv[++i]; break;
      case "--title": args.title = argv[++i]; break;
      case "--list": args.action = "list"; break;
      case "--limit": args.limit = parseInt(argv[++i], 10) || 20; break;
    }
  }
  return args;
}

function logReport(args) {
  if (!args.reportPath || !args.type) {
    console.error("Usage: node log-report.js --path <path> --type <type> --title <title>");
    process.exit(2);
  }

  const logPath = getLogPath();
  fs.mkdirSync(path.dirname(logPath), { recursive: true });

  const entry = {
    timestamp: new Date().toISOString(),
    path: args.reportPath,
    type: args.type,
    title: args.title || path.basename(args.reportPath),
  };

  fs.appendFileSync(logPath, JSON.stringify(entry) + "\n");
  console.log(`Logged: ${entry.type} — ${entry.title}`);
}

function listReports(args) {
  const logPath = getLogPath();
  let lines;
  try {
    lines = fs.readFileSync(logPath, "utf-8").trim().split("\n").filter(Boolean);
  } catch {
    console.log("No report history found.");
    return;
  }

  const entries = lines
    .map(line => { try { return JSON.parse(line); } catch { return null; } })
    .filter(Boolean)
    .slice(-args.limit);

  if (entries.length === 0) {
    console.log("No report history found.");
    return;
  }

  console.log(JSON.stringify(entries, null, 2));
}

function main() {
  const args = parseArgs(process.argv);
  if (args.action === "list") {
    listReports(args);
  } else {
    logReport(args);
  }
}

main();
