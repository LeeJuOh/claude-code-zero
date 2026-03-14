#!/usr/bin/env node
/**
 * Assemble an HTML report from a template, section files, and metadata.
 *
 * Usage:
 *   node assemble-report.js \
 *     --template path/to/template.html \
 *     --sections path/to/sections-dir/ \
 *     --metadata path/to/metadata.json \
 *     --output path/to/report.html
 */

const fs = require("fs");
const path = require("path");

const METADATA_KEYS = [
  "lang", "title", "font_link", "css_variables", "css_variables_dark",
  "mermaid_theme", "toc_content", "chart_data",
];

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i += 2) {
    const key = argv[i].replace(/^--/, "");
    args[key] = argv[i + 1];
  }
  return args;
}

function main() {
  const args = parseArgs(process.argv);
  const required = ["template", "sections", "metadata", "output"];
  for (const key of required) {
    if (!args[key]) {
      console.error(`Error: --${key} is required`);
      process.exit(1);
    }
  }

  for (const key of ["template", "sections", "metadata"]) {
    if (!fs.existsSync(args[key])) {
      console.error(`Error: ${key} not found: ${args[key]}`);
      process.exit(1);
    }
  }

  let html = fs.readFileSync(args.template, "utf-8");
  const metadata = JSON.parse(fs.readFileSync(args.metadata, "utf-8"));

  // Replace metadata placeholders
  for (const key of METADATA_KEYS) {
    const placeholder = `<!-- ${key.toUpperCase()} -->`;
    html = html.split(placeholder).join(metadata[key] || "");
  }

  // Replace section placeholders: <!-- SECTION_N: description -->
  const sectionFiles = fs.readdirSync(args.sections)
    .filter(f => /^section-\d+\.html$/.test(f))
    .sort((a, b) => {
      const na = parseInt(a.match(/\d+/)[0]);
      const nb = parseInt(b.match(/\d+/)[0]);
      return na - nb;
    });

  for (const file of sectionFiles) {
    const n = file.match(/section-(\d+)\.html/)[1];
    const content = fs.readFileSync(path.join(args.sections, file), "utf-8");
    const pattern = new RegExp(`<!--\\s*SECTION_${n}\\b[^>]*-->`, "g");
    html = html.replace(pattern, content);
  }

  // Check for unreplaced section placeholders
  const remaining = html.match(/<!--\s*SECTION_\d+\b[^>]*-->/g);
  if (remaining) {
    console.error(`Warning: ${remaining.length} unreplaced section placeholder(s):`);
    remaining.forEach(p => console.error(`  ${p}`));
  }

  // Write output
  const outputDir = path.dirname(args.output);
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(args.output, html, "utf-8");
  const lineCount = html.split("\n").length;
  console.log(`Assembled: ${args.output} (${lineCount} lines)`);
}

main();
