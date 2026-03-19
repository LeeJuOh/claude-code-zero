#!/usr/bin/env node
/**
 * Validate an assembled HTML report for structural issues.
 *
 * Checks:
 *   1. Unreplaced section placeholders (<!-- SECTION_N -->)
 *   2. Unreplaced metadata placeholders (<!-- TITLE -->, etc.)
 *   3. Section content — every <section> must have meaningful text
 *   4. Mermaid blocks — must contain a valid diagram-type keyword
 *   5. Chart.js — data arrays must not be empty
 *
 * Usage:
 *   node validate-report.js <report.html> [--expected-sections N]
 *
 * Exit codes:
 *   0 = all checks passed
 *   1 = one or more issues found
 *   2 = usage / file error
 */

const fs = require("fs");

// ---------------------------------------------------------------------------
// Arg parsing
// ---------------------------------------------------------------------------
function parseArgs(argv) {
  const args = { reportPath: null, expectedSections: null };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--expected-sections" && argv[i + 1]) {
      args.expectedSections = parseInt(argv[i + 1], 10);
      i++;
    } else if (!argv[i].startsWith("-")) {
      args.reportPath = argv[i];
    }
  }
  return args;
}

// ---------------------------------------------------------------------------
// Validators
// ---------------------------------------------------------------------------

function checkSectionPlaceholders(html) {
  const matches = html.match(/<!--\s*SECTION_\d+\b[^>]*-->/g);
  if (matches) {
    return matches.map(m => `Unreplaced section placeholder: ${m}`);
  }
  return [];
}

function checkMetadataPlaceholders(html) {
  const keys = [
    "LANG", "TITLE", "FONT_LINK", "CSS_VARIABLES", "CSS_VARIABLES_DARK",
    "MERMAID_THEME", "TOC_CONTENT", "CHART_DATA", "FEEDBACK_CSS", "SHARED_JS",
  ];
  const issues = [];
  for (const key of keys) {
    const pattern = new RegExp(`<!--\\s*${key}\\s*-->`, "g");
    const matches = html.match(pattern);
    if (matches) {
      issues.push(`Unreplaced metadata placeholder: <!-- ${key} --> (${matches.length}x)`);
    }
  }
  return issues;
}

function checkSectionContent(html) {
  const issues = [];
  const sectionRegex = /<section[^>]*id="([^"]*)"[^>]*>([\s\S]*?)<\/section>/g;
  const sections = [];
  let match;
  while ((match = sectionRegex.exec(html)) !== null) {
    sections.push({ id: match[1], content: match[2] });
  }

  if (sections.length === 0) {
    issues.push("No <section> elements found in the report");
    return { issues, count: 0 };
  }

  for (const s of sections) {
    const textOnly = s.content.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
    if (textOnly.length < 30) {
      issues.push(`Section "${s.id}" has minimal content (${textOnly.length} chars of text)`);
    }
  }

  return { issues, count: sections.length };
}

function checkMermaid(html) {
  const issues = [];
  const mermaidRegex = /<pre\s+class="mermaid">([\s\S]*?)<\/pre>/g;
  let count = 0;
  let match;

  const validKeywords =
    /^(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|erDiagram|gantt|pie|gitgraph|mindmap|timeline|journey|block-beta|sankey-beta|xychart-beta|quadrantChart|C4Context|C4Container|C4Component|C4Deployment|requirementDiagram|zenuml|packet-beta|architecture-beta)/m;

  while ((match = mermaidRegex.exec(html)) !== null) {
    count++;
    const content = match[1].trim();
    if (!validKeywords.test(content)) {
      issues.push(`Mermaid block #${count} missing a valid diagram-type keyword`);
    }
    if (content.length < 20) {
      issues.push(`Mermaid block #${count} appears to be a stub (${content.length} chars)`);
    }
  }

  return { issues, count };
}

function checkChartJs(html) {
  const issues = [];
  const chartMatches = html.match(/new\s+Chart\s*\(/g);
  const count = chartMatches ? chartMatches.length : 0;

  if (count > 0) {
    const emptyData = html.match(/data:\s*\[\s*\]/g);
    if (emptyData) {
      issues.push(`Chart.js: ${emptyData.length} empty data array(s) found`);
    }
  }

  return { issues, count };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
function main() {
  const args = parseArgs(process.argv);

  if (!args.reportPath) {
    console.error("Usage: node validate-report.js <report.html> [--expected-sections N]");
    process.exit(2);
  }

  if (!fs.existsSync(args.reportPath)) {
    console.error(`Error: file not found: ${args.reportPath}`);
    process.exit(2);
  }

  const html = fs.readFileSync(args.reportPath, "utf-8");
  const allIssues = [];

  // 1. Section placeholders
  allIssues.push(...checkSectionPlaceholders(html));

  // 2. Metadata placeholders
  allIssues.push(...checkMetadataPlaceholders(html));

  // 3. Section content
  const sections = checkSectionContent(html);
  allIssues.push(...sections.issues);

  // 4. Mermaid diagrams
  const mermaid = checkMermaid(html);
  allIssues.push(...mermaid.issues);

  // 5. Chart.js
  const charts = checkChartJs(html);
  allIssues.push(...charts.issues);

  // 6. Expected section count (optional)
  if (args.expectedSections && sections.count !== args.expectedSections) {
    allIssues.push(`Expected ${args.expectedSections} sections, found ${sections.count}`);
  }

  // Report
  console.log(`Validated: ${args.reportPath}`);
  console.log(`Sections: ${sections.count} | Mermaid: ${mermaid.count} | Charts: ${charts.count}`);

  if (allIssues.length === 0) {
    console.log("Result: PASS");
    process.exit(0);
  } else {
    console.log(`Result: FAIL — ${allIssues.length} issue(s):`);
    allIssues.forEach((issue, i) => console.log(`  ${i + 1}. ${issue}`));
    process.exit(1);
  }
}

main();
