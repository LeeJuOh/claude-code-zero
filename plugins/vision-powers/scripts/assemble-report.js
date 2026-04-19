#!/usr/bin/env node
/**
 * Assemble an HTML report from a template, section files, metadata, and shared partials.
 *
 * Usage (directory mode — existing):
 *   node assemble-report.js \
 *     --template path/to/template.html \
 *     --sections path/to/sections-dir/ \
 *     --metadata path/to/metadata.json \
 *     --shared path/to/shared-dir/ \
 *     --output path/to/report.html
 *
 * Usage (JSON input mode — doc-visual):
 *   node assemble-report.js \
 *     --template path/to/doc-visual.html \
 *     --sections path/to/sections.json \
 *     --shared path/to/shared-dir/ \
 *     --output path/to/report.html \
 *     [--format html|md] \
 *     [--skill-prefix doc-visual]
 *
 * JSON input mode is triggered when --sections points to a .json file
 * or when --skill-prefix doc-visual is passed.
 * In JSON mode, --metadata is optional (meta comes from the JSON file).
 */

const fs = require("fs");
const path = require("path");

const METADATA_KEYS = [
  "lang", "title", "font_link", "css_variables", "css_variables_dark",
  "mermaid_theme", "toc_content", "chart_data",
];

// Maps shared filenames to their template placeholders
const SHARED_PLACEHOLDERS = {
  "feedback.css": "FEEDBACK_CSS",
  "shared.js": "SHARED_JS",
};

// Fallback budget limits for doc-visual diagram types
const FALLBACK_BUDGETS = {
  venn:     { maxCircles: 3 },
  pyramid:  { maxLayers: 6 },
  quadrant: { maxItems: 12 },
};

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i += 2) {
    const key = argv[i].replace(/^--/, "");
    args[key] = argv[i + 1];
  }
  return args;
}

/**
 * Replace {UPPER_CASE} curly-brace placeholders in html using the provided map.
 * Unrecognised placeholders are left as-is.
 */
function replaceCurly(html, map) {
  return html.replace(/\{([A-Z_][A-Z0-9_]*)\}/g, (m, key) => (key in map ? map[key] : m));
}

/**
 * Sanitize a filename basename: strip extension, collapse non-safe chars to hyphens.
 */
function sanitizeBasename(name) {
  return name
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "doc";
}

// ─── HTML escaping ────────────────────────────────────────────────────────────

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ─── doc-visual section renderer ─────────────────────────────────────────────

/**
 * Validate and optionally trim fallback data against per-type budgets.
 * Returns { ok, rule?, got?, truncated? }.
 */
function validateFallbackBudget(sec) {
  const t = sec.diagram_plan?.diagram_type;
  const budget = FALLBACK_BUDGETS[t];
  if (!budget) return { ok: true };
  const items = sec.fallback_data?.items || [];
  if (t === "venn" && items.length > budget.maxCircles) {
    return { ok: false, rule: "max-circles-exceeded", got: items.length };
  }
  if (t === "pyramid" && items.length > budget.maxLayers) {
    return { ok: false, rule: "max-layers-exceeded", got: items.length };
  }
  if (t === "quadrant" && items.length > budget.maxItems) {
    sec.fallback_data.items = items.slice(0, budget.maxItems);
    return { ok: true, truncated: true };
  }
  return { ok: true };
}

/**
 * Render a single section object to an HTML <section> block.
 *
 * NOTE: mermaid_code must NOT be HTML-escaped — the %%{init:{...}}%% braces
 * would become &#123; and break Mermaid parsing. taste-gate.js already
 * validated for dangerous chars, so we trust LLM-generated Mermaid as safe.
 */
function renderDocVisualSection(sec) {
  const heroAttr = sec.diagram_plan?.is_hero ? ' data-is-hero="true"' : "";
  const level = sec.level || 2;

  const budgetResult = validateFallbackBudget(sec);
  if (!budgetResult.ok) {
    console.error(
      `Warning: section "${sec.id}" fallback budget exceeded — ` +
      `${budgetResult.rule} (got ${budgetResult.got}). Diagram will be skipped.`
    );
  }

  const skipDiagram =
    sec.diagram_plan?.skip_diagram ||
    !sec.mermaid_code ||
    !budgetResult.ok;

  const diagHtml = skipDiagram
    ? ""
    : `<div class="mermaid-wrap"><div class="zoom-controls">` +
      `<button onclick="zoomDiagram(this,1.3)">+</button>` +
      `<button onclick="zoomDiagram(this,1/1.3)">−</button>` +
      `<button onclick="resetZoom(this)">↻</button>` +
      `<button onclick="toggleFullscreen(this)">⛶</button>` +
      `</div><pre class="mermaid">${sec.mermaid_code}</pre></div>`;

  return (
    `<section id="${escapeHtml(sec.id || "")}" class="doc-section depth-${level}"${heroAttr}>\n` +
    `  <h${level}>${escapeHtml(sec.heading || "")}</h${level}>\n` +
    `  <p class="summary">${escapeHtml(sec.summary || sec.body || "")}</p>\n` +
    `  ${diagHtml}\n` +
    `</section>`
  );
}

/**
 * Build a <nav class="toc"> block from the sections array.
 */
function buildToc(sections) {
  const items = sections
    .filter(s => s.heading)
    .map(s => `<li><a href="#${escapeHtml(s.id || "")}">${escapeHtml(s.heading)}</a></li>`)
    .join("\n    ");
  return `<nav class="toc"><p class="eyebrow">CONTENTS</p><ol>\n    ${items}\n  </ol></nav>`;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function main() {
  const args = parseArgs(process.argv);

  // Detect input mode before running required-arg checks
  const isJsonInput =
    (args.sections && args.sections.endsWith(".json")) ||
    (args["skill-prefix"] === "doc-visual");

  // In JSON mode, --metadata is optional
  const required = isJsonInput
    ? ["template", "sections", "output"]
    : ["template", "sections", "metadata", "output"];

  for (const key of required) {
    if (!args[key]) {
      console.error(`Error: --${key} is required`);
      process.exit(1);
    }
  }

  // Existence checks
  const existenceChecks = isJsonInput
    ? ["template", "sections"]
    : ["template", "sections", "metadata"];

  for (const key of existenceChecks) {
    if (!fs.existsSync(args[key])) {
      console.error(`Error: ${key} not found: ${args[key]}`);
      process.exit(1);
    }
  }

  // ─── JSON input mode (doc-visual) ──────────────────────────────────────────
  if (isJsonInput) {
    const inputData = JSON.parse(fs.readFileSync(args.sections, "utf-8"));
    const sections = inputData.sections || [];
    const meta = inputData.meta || {};

    // Optional external metadata file (for compatibility)
    let externalMeta = {};
    if (args.metadata && fs.existsSync(args.metadata)) {
      externalMeta = JSON.parse(fs.readFileSync(args.metadata, "utf-8"));
    }

    // Merge: external metadata wins over JSON-embedded meta for shared keys
    const effectiveMeta = Object.assign({}, meta, externalMeta);

    const format = args.format || "html";
    const timestamp = new Date().toISOString().replace("T", " ").slice(0, 19) + " UTC";

    // ── Markdown output mode ──────────────────────────────────────────────────
    if (format === "md") {
      const mdParts = sections.map(sec => {
        const hashes = "#".repeat(sec.level || 2);
        let block = `${hashes} ${sec.heading || ""}\n\n${sec.summary || sec.body || ""}`;
        if (!sec.diagram_plan?.skip_diagram && sec.mermaid_code) {
          block += `\n\n\`\`\`mermaid\n${sec.mermaid_code}\n\`\`\``;
        }
        return block;
      });

      const footer =
        `\n\n---\n\n` +
        `**원본**: ${effectiveMeta.source_path || ""}\n` +
        `**생성**: vision-powers doc-visual · ${timestamp}\n`;

      const mdContent = mdParts.join("\n\n") + footer;

      // Determine output path — change .html extension to .md if needed
      let outputPath = args.output;
      if (outputPath.endsWith(".html")) {
        outputPath = outputPath.slice(0, -5) + ".md";
      }

      const outputDir = path.dirname(outputPath);
      fs.mkdirSync(outputDir, { recursive: true });
      fs.writeFileSync(outputPath, mdContent.replace(/\r\n/g, "\n"), "utf-8");
      const lineCount = mdContent.split("\n").length;
      console.log(`Assembled (md): ${outputPath} (${lineCount} lines)`);

      recordAestheticHistory(args);
      return;
    }

    // ── HTML output mode ──────────────────────────────────────────────────────
    let html = fs.readFileSync(args.template, "utf-8");

    // Build structural tokens
    const sectionsHtml = sections.map(renderDocVisualSection).join("\n\n");
    const tocHtml = buildToc(sections);

    // Build token map from meta.tokens (keys like "paper" → TOKEN_PAPER)
    const tokens = effectiveMeta.tokens || {};
    const tokenMap = {};
    for (const [k, v] of Object.entries(tokens)) {
      // "paper-2" → TOKEN_PAPER_2, "accent-tint" → TOKEN_ACCENT_TINT, etc.
      const tokenKey = "TOKEN_" + k.toUpperCase().replace(/-/g, "_");
      tokenMap[tokenKey] = v;
    }

    // Structural tokens
    tokenMap.SECTIONS_HTML = sectionsHtml;
    tokenMap.TOC_HTML = tocHtml;
    tokenMap.DOC_TITLE = escapeHtml(effectiveMeta.title || "Document");
    tokenMap.SOURCE_PATH = escapeHtml(effectiveMeta.source_path || "");
    tokenMap.TIMESTAMP = timestamp;
    tokenMap.LANG = escapeHtml(effectiveMeta.lang || "en");
    tokenMap.COLOR_SCHEME = escapeHtml(effectiveMeta.color_scheme || "light");

    // Inject shared.js if provided
    if (args.shared && fs.existsSync(args.shared)) {
      const sharedJsPath = path.join(args.shared, "shared.js");
      if (fs.existsSync(sharedJsPath)) {
        tokenMap.SHARED_JS = `<script>\n${fs.readFileSync(sharedJsPath, "utf-8")}\n</script>`;
      }
    }
    if (!tokenMap.SHARED_JS) {
      tokenMap.SHARED_JS = "";
    }

    // Apply all curly-brace replacements
    html = replaceCurly(html, tokenMap);

    // Check for unreplaced {TOKEN_*} placeholders and warn
    const unreplacedTokens = html.match(/\{TOKEN_[A-Z0-9_]+\}/g);
    if (unreplacedTokens) {
      console.error(`Warning: ${unreplacedTokens.length} unreplaced token placeholder(s):`);
      unreplacedTokens.forEach(p => console.error(`  ${p}`));
    }

    // Normalize line endings to LF
    html = html.replace(/\r\n/g, "\n");

    // Write output
    const outputDir = path.dirname(args.output);
    fs.mkdirSync(outputDir, { recursive: true });
    fs.writeFileSync(args.output, html, "utf-8");
    const lineCount = html.split("\n").length;
    console.log(`Assembled: ${args.output} (${lineCount} lines)`);

    recordAestheticHistory(args);
    return;
  }

  // ─── Directory mode (existing behaviour — unchanged) ───────────────────────
  let html = fs.readFileSync(args.template, "utf-8");
  const metadata = JSON.parse(fs.readFileSync(args.metadata, "utf-8"));

  // Replace metadata placeholders
  for (const key of METADATA_KEYS) {
    const placeholder = `<!-- ${key.toUpperCase()} -->`;
    html = html.split(placeholder).join(metadata[key] || "");
  }

  // Replace shared partial placeholders
  if (args.shared && fs.existsSync(args.shared)) {
    for (const [filename, placeholder] of Object.entries(SHARED_PLACEHOLDERS)) {
      const filePath = path.join(args.shared, filename);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, "utf-8");
        const pattern = new RegExp(`<!--\\s*${placeholder}\\s*-->`, "g");
        html = html.replace(pattern, content);
      }
    }
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

  // Deduplicate preconnect links (font_link metadata may include them despite template already having them)
  const preconnectPattern = /<link\s+rel=["']preconnect["'][^>]*>/gi;
  const seen = new Set();
  html = html.replace(preconnectPattern, (match) => {
    const normalized = match.replace(/["']/g, '"').toLowerCase();
    if (seen.has(normalized)) return "";
    seen.add(normalized);
    return match;
  });

  // Normalize line endings to LF
  html = html.replace(/\r\n/g, "\n");

  // Write output
  const outputDir = path.dirname(args.output);
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(args.output, html, "utf-8");
  const lineCount = html.split("\n").length;
  console.log(`Assembled: ${args.output} (${lineCount} lines)`);

  recordAestheticHistory(args);
}

/**
 * Record the chosen palette/font to aesthetic-history.json (best-effort).
 * A failure here must never block the report from being delivered.
 */
function recordAestheticHistory(args) {
  try {
    const { spawnSync } = require("child_process");
    const rotationScript = path.join(__dirname, "aesthetic-rotation.js");
    const skillName = args["skill-prefix"] || args.skill || null;
    if (fs.existsSync(rotationScript) && args.metadata && fs.existsSync(args.metadata)) {
      const argsList = ["extract", "--metadata", args.metadata];
      if (skillName) argsList.push("--skill", skillName);
      spawnSync("node", [rotationScript, ...argsList], {
        stdio: ["ignore", "ignore", "inherit"],
      });
    }
  } catch {
    // swallow — history is a nice-to-have, not a contract
  }
}

main();
