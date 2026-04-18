#!/usr/bin/env node
/**
 * Validate an assembled HTML report for structural issues.
 *
 * Checks (errors — fail on any):
 *   1. Unreplaced section placeholders (<!-- SECTION_N -->)
 *   2. Unreplaced metadata placeholders (<!-- TITLE -->, etc.)
 *   3. Section content — every <section> must have meaningful text
 *   4. Mermaid blocks — diagram keyword, stub size, parser-breakers (rgba/color in classDef,
 *      unquoted special chars, invalid subgraph class, stateDiagram br/parens,
 *      sequenceDiagram message specials)
 *   5. Chart.js — data arrays must not be empty
 *   6. Empty inline elements — detects blank <li>, <p>, <td> tags in sections
 *
 * Warnings (do not fail, but surface for agent attention):
 *   W1. Generic diagram labels — standalone "Component"/"Data"/"Service"/etc.
 *       in graph/flowchart node labels (see anti-slop-rules.md §Generic Diagram Labels)
 *
 * Usage:
 *   node validate-report.js <report.html> [--expected-sections N]
 *
 * Exit codes:
 *   0 = all error checks passed (warnings may still be printed)
 *   1 = one or more errors found
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

    // Detect diagram type for type-specific checks
    const firstKeyword = (content.match(validKeywords) || [""])[0];
    const isStateDiagram = /^stateDiagram/.test(firstKeyword);
    const isSequenceDiagram = /^sequenceDiagram/.test(firstKeyword);

    // Deep syntax checks for common parser-breaking patterns
    const lines = content.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const ln = i + 1;

      // classDef with rgba() — commas break Mermaid's parser
      if (/classDef\s/.test(line) && /rgba?\s*\(/.test(line)) {
        issues.push(`Mermaid #${count} L${ln}: rgba() in classDef breaks parser, use 8-digit hex`);
      }

      // classDef with color: — unsupported property
      if (/classDef\s/.test(line) && /\bcolor\s*:/.test(line)) {
        issues.push(`Mermaid #${count} L${ln}: color: in classDef unsupported, remove it`);
      }

      // Unquoted special characters in node labels
      const nodeLabel = line.match(/\w+\[([^\]"'][^\]]*)\]/);
      if (nodeLabel && /[(){}:;/\\<>&]/.test(nodeLabel[1])) {
        issues.push(`Mermaid #${count} L${ln}: unquoted special chars in node label, wrap in quotes`);
      }

      // Spaces inside relationship label delimiters
      if (/--[->]?\|\s+"/.test(line) || /"\s+\|/.test(line)) {
        issues.push(`Mermaid #${count} L${ln}: spaces inside |"label"| delimiters`);
      }

      // classDef applied to subgraph declaration
      if (/subgraph\s.*:::/.test(line)) {
        issues.push(`Mermaid #${count} L${ln}: classDef on subgraph is invalid syntax`);
      }

      // stateDiagram-v2: <br/> and parentheses in labels break the parser
      if (isStateDiagram) {
        if (/<br\s*\/?>/i.test(line)) {
          issues.push(`Mermaid #${count} L${ln}: <br/> in stateDiagram breaks parser, use flowchart instead`);
        }
        const stateLabel = line.match(/state\s+"([^"]+)"/);
        if (stateLabel && /[()]/.test(stateLabel[1])) {
          issues.push(`Mermaid #${count} L${ln}: parentheses in stateDiagram label break parser`);
        }
      }

      // sequenceDiagram: { } [ ] < > & in message text break the parser
      if (isSequenceDiagram) {
        const seqMsg = line.match(/^\s*[\w\-]+\s*(?:->|-->|->>|-->>|-x|--x|-\)|--\))\s*[\w\-]+\s*:\s*(.+)$/);
        if (seqMsg && /[{}\[\]<>&]/.test(seqMsg[1])) {
          issues.push(`Mermaid #${count} L${ln}: special chars in sequenceDiagram message break parser, use plain text`);
        }
      }
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

// Generic diagram label warnings — standalone category words that teach nothing.
// Sourced from anti-slop-rules.md §Generic Diagram Labels.
// Only applied to graph/flowchart blocks; stateDiagram/sequenceDiagram have different
// label semantics (state names, participant aliases) where single-word labels are normal.
function checkGenericLabels(html) {
  const warnings = [];
  const forbidden = new Set([
    "Component", "Components",
    "Data", "Payload",
    "API", "Endpoint",
    "Service", "Module",
    "Database", "DB",
    "Event", "Message",
    "Process", "Step",
  ]);
  const mermaidRegex = /<pre\s+class="mermaid">([\s\S]*?)<\/pre>/g;
  let blockIdx = 0;
  let m;
  while ((m = mermaidRegex.exec(html)) !== null) {
    blockIdx++;
    const content = m[1];
    if (!/^\s*(graph|flowchart)\b/m.test(content)) continue;
    const lines = content.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const labelRe = /[\[\(\{]+\s*"?([A-Za-z][A-Za-z]*)"?\s*[\]\)\}]+/g;
      let lm;
      while ((lm = labelRe.exec(line)) !== null) {
        const label = lm[1].trim();
        if (forbidden.has(label)) {
          warnings.push(`Mermaid #${blockIdx} L${i + 1}: generic label "${label}" standing alone — use a concrete identifier (see anti-slop-rules.md §Generic Diagram Labels)`);
        }
      }
    }
  }
  return warnings;
}

function checkEmptyElements(html) {
  const issues = [];
  // Extract feature-deep-dive section specifically — highest risk for empty content
  const sectionMatch = html.match(/<section[^>]*id="feature-deep-dive"[^>]*>([\s\S]*?)<\/section>/);
  if (!sectionMatch) return issues;

  const sectionHtml = sectionMatch[1];

  // Count empty inline elements: <li></li>, <p></p>, <td></td> (whitespace-only counts as empty)
  const emptyTags = sectionHtml.match(/<(li|p|td)>\s*<\/\1>/g);
  if (emptyTags && emptyTags.length > 0) {
    issues.push(`Section "feature-deep-dive" has ${emptyTags.length} empty element(s) (${emptyTags.slice(0, 3).join(", ")}${emptyTags.length > 3 ? "..." : ""})`);
  }

  // Check for arrow-only step-hood divs: <div class="step-hood">&rarr; </div>
  const emptyHoods = sectionHtml.match(/<div\s+class="step-hood">\s*&rarr;\s*<\/div>/g);
  if (emptyHoods && emptyHoods.length > 0) {
    issues.push(`Section "feature-deep-dive" has ${emptyHoods.length} empty tutorial step description(s)`);
  }

  return issues;
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

  // 6. Empty inline elements
  allIssues.push(...checkEmptyElements(html));

  // 7. Expected section count (optional)
  if (args.expectedSections && sections.count !== args.expectedSections) {
    allIssues.push(`Expected ${args.expectedSections} sections, found ${sections.count}`);
  }

  // Warnings — surface, but don't fail the run
  const warnings = checkGenericLabels(html);

  // Report
  console.log(`Validated: ${args.reportPath}`);
  console.log(`Sections: ${sections.count} | Mermaid: ${mermaid.count} | Charts: ${charts.count}`);

  if (warnings.length > 0) {
    console.log(`Warnings: ${warnings.length}`);
    warnings.forEach((w, i) => console.log(`  ! ${i + 1}. ${w}`));
  }

  if (allIssues.length === 0) {
    console.log(`Result: PASS${warnings.length > 0 ? " (with warnings)" : ""}`);
    process.exit(0);
  } else {
    console.log(`Result: FAIL — ${allIssues.length} issue(s):`);
    allIssues.forEach((issue, i) => console.log(`  ${i + 1}. ${issue}`));
    process.exit(1);
  }
}

main();
