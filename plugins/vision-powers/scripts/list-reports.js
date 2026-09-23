#!/usr/bin/env node
/**
 * List vision-powers reports with structured metadata.
 * Covers every persisted output: .html, .artifact.html, .md, .artifact.md.
 *
 * Usage:
 *   node list-reports.js --data-dir <dir> [--limit N]
 *
 * --data-dir is required; pass "${CLAUDE_PLUGIN_DATA}" from SKILL.md.
 * Uses <data-dir>/reports/ as the reports directory, unless <data-dir>/config.json
 * sets a custom reports_dir.
 *
 * Output: JSON with reports_dir, count, and reports array.
 *
 * Exit codes:
 *   0 = success (even if 0 reports found)
 *   2 = usage error (missing --data-dir)
 */

const fs = require("fs");
const path = require("path");

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

function getReportsDir(dataDir) {
  // Check config for custom reports_dir
  const configPath = path.join(dataDir, "config.json");

  try {
    const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    if (config.reports_dir) return config.reports_dir;
  } catch {
    // No config or invalid — use default
  }

  return path.join(dataDir, "reports");
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
  const dataDir = takeDataDir(args);
  let limit = 50;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--limit" && args[i + 1]) {
      limit = parseInt(args[i + 1], 10) || 50;
    }
  }

  const reportsDir = getReportsDir(dataDir);

  if (!fs.existsSync(reportsDir)) {
    console.log(JSON.stringify({ reports_dir: reportsDir, count: 0, reports: [] }));
    return;
  }

  const files = fs.readdirSync(reportsDir)
    .filter(f => f.endsWith(".html") || f.endsWith(".md"))
    .map(f => {
      const fullPath = path.join(reportsDir, f);
      const stat = fs.statSync(fullPath);
      const entry = {
        filename: f,
        path: fullPath,
        type: detectType(f),
        size_bytes: stat.size,
        size: formatSize(stat.size),
        mtime: stat.mtime.getTime(),
        date: formatDate(stat.mtime),
      };
      const sidecarPath = `${fullPath}.artifact.json`;
      try {
        const sidecar = JSON.parse(fs.readFileSync(sidecarPath, "utf-8"));
        if (sidecar.url) entry.artifact_url = sidecar.url;
      } catch {
        // No sidecar or invalid JSON — report has no artifact_url
      }
      return entry;
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
