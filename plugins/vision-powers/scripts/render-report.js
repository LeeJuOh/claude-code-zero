#!/usr/bin/env node
/**
 * Render a vision-powers HTML report to PNG via headless Chrome.
 * Used by the report-generation workflow for Agent self-audit — Claude
 * reads the PNG to visually verify the rendered output (Mermaid
 * diagrams, layout, charts) before delivering to the user.
 *
 * Uses direct Chrome headless invocation rather than Puppeteer to
 * avoid the ~170MB browser-binary install. Requires the user to have
 * Chrome or Chromium installed.
 *
 * Usage:
 *   node render-report.js <report.html> [--out <path>] [--width N] [--height N] [--wait MS]
 *
 * Options:
 *   --out     Output PNG path. Defaults to $CLAUDE_PLUGIN_DATA/cache/audit-<ts>.png
 *   --width   Viewport width (default 1440)
 *   --height  Viewport height (default 8000 — covers most reports)
 *   --wait    Virtual time budget in ms (default 12000 — lets Mermaid CDN load + render)
 *
 * Exit codes:
 *   0 = success (absolute PNG path printed to stdout)
 *   1 = render failed (Chrome not found, crash, or no PNG produced)
 *   2 = usage / file error
 *
 * Chrome discovery:
 *   CHROME_BIN env var overrides auto-discovery.
 *   macOS: /Applications/Google Chrome.app, /Applications/Chromium.app
 *   Linux: google-chrome-stable, google-chrome, chromium-browser, chromium (via PATH)
 */

const fs = require("fs");
const path = require("path");
const os = require("os");
const child_process = require("child_process");

function findChrome() {
  if (process.env.CHROME_BIN && fs.existsSync(process.env.CHROME_BIN)) {
    return process.env.CHROME_BIN;
  }

  if (process.platform === "darwin") {
    const candidates = [
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      "/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary",
      "/Applications/Chromium.app/Contents/MacOS/Chromium",
    ];
    for (const c of candidates) if (fs.existsSync(c)) return c;
    return null;
  }

  if (process.platform === "linux") {
    const names = ["google-chrome-stable", "google-chrome", "chromium-browser", "chromium"];
    for (const n of names) {
      const r = child_process.spawnSync("which", [n]);
      if (r.status === 0) {
        const p = r.stdout.toString().trim();
        if (p && fs.existsSync(p)) return p;
      }
    }
    return null;
  }

  // Windows or other — user must set CHROME_BIN
  return null;
}

function parseArgs(argv) {
  const args = { reportPath: null, out: null, width: 1440, height: 8000, waitMs: 12000 };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--out" && argv[i + 1]) args.out = argv[++i];
    else if (a === "--width" && argv[i + 1]) args.width = parseInt(argv[++i], 10);
    else if (a === "--height" && argv[i + 1]) args.height = parseInt(argv[++i], 10);
    else if (a === "--wait" && argv[i + 1]) args.waitMs = parseInt(argv[++i], 10);
    else if (!a.startsWith("-")) args.reportPath = a;
  }
  return args;
}

function resolveOutPath(explicit) {
  if (explicit) return path.resolve(explicit);
  const dataDir = process.env.CLAUDE_PLUGIN_DATA
    ? path.join(process.env.CLAUDE_PLUGIN_DATA, "cache")
    : path.join(os.tmpdir(), "vision-powers");
  fs.mkdirSync(dataDir, { recursive: true });
  return path.join(dataDir, `audit-${Date.now()}.png`);
}

function main() {
  const args = parseArgs(process.argv);

  if (!args.reportPath) {
    console.error("Usage: node render-report.js <report.html> [--out <path>] [--width N] [--height N] [--wait MS]");
    process.exit(2);
  }

  const absReport = path.resolve(args.reportPath);
  if (!fs.existsSync(absReport)) {
    console.error(`Error: file not found: ${absReport}`);
    process.exit(2);
  }

  const chrome = findChrome();
  if (!chrome) {
    console.error("Error: Chrome/Chromium not found.");
    console.error("Install Google Chrome, or set CHROME_BIN to your browser binary.");
    console.error("macOS: https://www.google.com/chrome/");
    console.error("Linux: apt install google-chrome-stable  |  apt install chromium-browser");
    process.exit(1);
  }

  const outPath = resolveOutPath(args.out);

  // --virtual-time-budget advances Chrome's internal clock so Mermaid/Chart.js
  // async render completes deterministically. Without it, screenshots fire
  // before CDN scripts finish and Mermaid blocks render as raw <pre> text.
  const chromeArgs = [
    "--headless=new",
    "--hide-scrollbars",
    "--disable-gpu",
    "--no-sandbox",
    "--disable-dev-shm-usage",
    `--virtual-time-budget=${args.waitMs}`,
    `--window-size=${args.width},${args.height}`,
    `--screenshot=${outPath}`,
    `file://${absReport}`,
  ];

  const result = child_process.spawnSync(chrome, chromeArgs, {
    timeout: args.waitMs + 20000,
    stdio: ["ignore", "pipe", "pipe"],
  });

  if (result.error) {
    console.error(`Failed to launch Chrome: ${result.error.message}`);
    process.exit(1);
  }

  if (result.status !== 0) {
    console.error(`Chrome exited with status ${result.status}`);
    const stderr = result.stderr ? result.stderr.toString().trim() : "";
    if (stderr) console.error(stderr);
    process.exit(1);
  }

  if (!fs.existsSync(outPath)) {
    console.error("Chrome exited OK but no PNG was produced.");
    process.exit(1);
  }

  console.log(outPath);
  process.exit(0);
}

main();
