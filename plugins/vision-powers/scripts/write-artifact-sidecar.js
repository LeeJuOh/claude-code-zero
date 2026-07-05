#!/usr/bin/env node
/**
 * Writes the artifact-publish sidecar next to a report file.
 *
 * A report published through the Artifact channel keeps its claude.ai URL,
 * title, and favicon in `<report-path>.artifact.json` alongside the report —
 * report-manager finds reports by scanning the folder (list-reports.js), so
 * the URL lives in the same filesystem, not a separate index (issue 007, S4.5).
 *
 * Usage:
 *   node write-artifact-sidecar.js --report <path> --url <url> [--title <title>] [--favicon <emoji>]
 *
 * Exit codes:
 *   0 = success
 *   2 = usage error
 */

const fs = require('fs');

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    if (argv[i].startsWith('--')) args[argv[i].slice(2)] = argv[i + 1];
  }
  return args;
}

function main() {
  const { report, url, title, favicon } = parseArgs(process.argv);
  if (!report || !url) {
    console.error('Usage: node write-artifact-sidecar.js --report <path> --url <url> [--title <title>] [--favicon <emoji>]');
    process.exit(2);
  }

  const sidecarPath = `${report}.artifact.json`;
  const sidecar = {
    url,
    title: title || null,
    favicon: favicon || null,
    published_at: new Date().toISOString(),
  };

  fs.writeFileSync(sidecarPath, JSON.stringify(sidecar, null, 2) + '\n');
  console.log(`Sidecar written: ${sidecarPath}`);
}

main();
