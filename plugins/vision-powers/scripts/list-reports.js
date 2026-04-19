#!/usr/bin/env node
/**
 * List vision-powers reports with structured metadata.
 *
 * Usage:
 *   node list-reports.js [--limit N]
 *
 * Uses $CLAUDE_PLUGIN_DATA/reports/ as the reports directory.
 * Falls back to config.json for custom reports_dir if set.
 *
 * Output: JSON with reports_dir, count, and reports array.
 *
 * Exit codes:
 *   0 = success (even if 0 reports found)
 */

const fs = require("fs");
const path = require("path");
const os = require("os");

function getReportsDir() {
  const pluginData = process.env.CLAUDE_PLUGIN_DATA;

  // Check config for custom reports_dir
  const configPath = pluginData
    ? path.join(pluginData, "config.json")
    : path.join(os.homedir(), ".claude-code-zero", "vision-powers", "config.json");

  try {
    const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    if (config.reports_dir) return config.reports_dir;
  } catch {
    // No config or invalid — use default
  }

  if (pluginData) return path.join(pluginData, "reports");
  return path.join(os.homedir(), ".claude-code-zero", "vision-powers", "reports");
}

function detectType(filename) {
  if (filename.includes("-diff-visual")) return "diff-visual";
  if (filename.includes("-doc-visual")) return "doc-visual";
  if (filename.includes("-report")) return "plugin-visual";
  if (filename.includes("-context-health-visual")) return "context-health-visual";
  return "unknown";
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes}B`;
  return `${Math.round(bytes / 1024)}KB`;
}

function formatDate(mtime) {
  const d = new Date(mtime);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function main() {
  const args = process.argv.slice(2);
  let limit = 50;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--limit" && args[i + 1]) {
      limit = parseInt(args[i + 1], 10) || 50;
    }
  }

  const reportsDir = getReportsDir();

  if (!fs.existsSync(reportsDir)) {
    console.log(JSON.stringify({ reports_dir: reportsDir, count: 0, reports: [] }));
    return;
  }

  const files = fs.readdirSync(reportsDir)
    .filter(f => f.endsWith(".html"))
    .map(f => {
      const fullPath = path.join(reportsDir, f);
      const stat = fs.statSync(fullPath);
      return {
        filename: f,
        path: fullPath,
        type: detectType(f),
        size_bytes: stat.size,
        size: formatSize(stat.size),
        mtime: stat.mtime.getTime(),
        date: formatDate(stat.mtime),
      };
    })
    .sort((a, b) => b.mtime - a.mtime)
    .slice(0, limit);

  const result = {
    reports_dir: reportsDir,
    count: files.length,
    reports: files.map((f, i) => ({ index: i + 1, ...f })),
  };

  console.log(JSON.stringify(result, null, 2));
}

main();
