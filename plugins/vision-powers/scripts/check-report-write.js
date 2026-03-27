#!/usr/bin/env node
/**
 * PostToolUse hook: auto-validate when an HTML report is written.
 *
 * Called by hooks.json after any Write tool use. Checks if the written
 * file is a vision-powers report and, if so, runs basic structural
 * validation and returns feedback via additionalContext.
 *
 * Input: TOOL_INPUT env var (JSON with file_path field)
 * Output: JSON to stdout with optional additionalContext
 */

const fs = require("fs");
const path = require("path");
const os = require("os");

function main() {
  const toolInput = process.env.TOOL_INPUT;
  if (!toolInput) {
    console.log(JSON.stringify({}));
    return;
  }

  let input;
  try {
    input = JSON.parse(toolInput);
  } catch {
    console.log(JSON.stringify({}));
    return;
  }

  const filePath = input.file_path || "";

  // Only trigger for HTML files in the vision-powers reports directory
  if (!filePath.endsWith(".html") || !filePath.includes("vision-powers")) {
    console.log(JSON.stringify({}));
    return;
  }

  // Quick structural checks (not full validation — that's validate-report.js)
  const issues = [];
  try {
    const html = fs.readFileSync(filePath, "utf-8");

    // Check for unreplaced placeholders
    const sectionPlaceholders = html.match(/<!--\s*SECTION_\d+\b[^>]*-->/g);
    if (sectionPlaceholders) {
      issues.push(`${sectionPlaceholders.length} unreplaced section placeholder(s)`);
    }

    const metaPlaceholders = html.match(/<!--\s*(TITLE|FONT_LINK|CSS_VARIABLES|CHART_DATA)\s*-->/g);
    if (metaPlaceholders) {
      issues.push(`${metaPlaceholders.length} unreplaced metadata placeholder(s)`);
    }

    // Check for empty sections
    const sectionRegex = /<section[^>]*id="([^"]*)"[^>]*>([\s\S]*?)<\/section>/g;
    let match;
    let emptyCount = 0;
    while ((match = sectionRegex.exec(html)) !== null) {
      const textOnly = match[2].replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
      if (textOnly.length < 30) emptyCount++;
    }
    if (emptyCount > 0) {
      issues.push(`${emptyCount} section(s) with minimal content`);
    }
  } catch {
    // File not readable yet — skip
    console.log(JSON.stringify({}));
    return;
  }

  if (issues.length > 0) {
    console.log(JSON.stringify({
      additionalContext: `[vision-powers] Report quality warning: ${issues.join("; ")}. Run validate-report.js for full diagnostics.`
    }));
  } else {
    console.log(JSON.stringify({}));
  }
}

main();
