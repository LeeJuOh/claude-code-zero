#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const DENSITY_BUDGETS = {
  flowchart:    { maxNodes: 9, maxArrows: 12 },
  architecture: { maxNodes: 9, maxArrows: 12 },
  sequence:     { maxLifelines: 5 },
  state:        { maxNodes: 9, maxArrows: 12 },
  ER:           { maxEntities: 8 },
  timeline:     { maxNodes: 9 },
  swimlane:     { maxLanes: 5 },
  quadrant:     { maxItems: 12 },
  nested:       { maxLevels: 6 },
  tree:         { maxDepth: 4 },
  layer:        { maxLayers: 6 },
  venn:         { maxCircles: 3 },
  pyramid:      { maxLayers: 6 },
};

// --- Mermaid density helpers (carried from taste-gate.js) ---

function countNodes(mermaid) {
  const nodeIds = new Set();
  const re = /^\s*([A-Za-z_]\w*)(?:\[|\{|\(|$|\s+-->|\s+\.->|\s+==>)/gm;
  for (const m of mermaid.matchAll(re)) nodeIds.add(m[1]);
  return nodeIds.size;
}

function countArrows(mermaid) {
  return (mermaid.match(/-->|\.->|==>|-\.->/g) || []).length;
}

function countLifelines(mermaid) {
  return (mermaid.match(/^\s*participant\s+\w+/gm) || []).length;
}

function countLanes(mermaid) {
  return (mermaid.match(/^\s*subgraph\s+/gm) || []).length;
}

function countEntities(mermaid) {
  const ids = new Set();
  for (const m of mermaid.matchAll(/^\s*([A-Z_][A-Z_0-9]*)\s*(?:\{|\|\|--|\}o--|\|\|\.\.|o\|--)/gm)) {
    ids.add(m[1]);
  }
  return ids.size;
}

function maxNestedDepth(mermaid) {
  let depth = 0, max = 0;
  for (const line of mermaid.split('\n')) {
    if (/^\s*subgraph\b/.test(line)) { depth++; if (depth > max) max = depth; }
    else if (/^\s*end\b/.test(line)) { depth = Math.max(0, depth - 1); }
  }
  return max;
}

function maxTreeDepth(mermaid) {
  const edges = [];
  for (const m of mermaid.matchAll(/(\w+)\s*-->\s*(\w+)/g)) edges.push([m[1], m[2]]);
  if (edges.length === 0) return 0;
  const children = new Map();
  const hasParent = new Set();
  for (const [p, c] of edges) {
    if (!children.has(p)) children.set(p, []);
    children.get(p).push(c);
    hasParent.add(c);
  }
  const roots = [...new Set(edges.map(([p]) => p))].filter(n => !hasParent.has(n));
  const walk = (n, d, seen = new Set()) => {
    if (seen.has(n)) return d;
    seen.add(n);
    const kids = children.get(n) || [];
    if (kids.length === 0) return d;
    return Math.max(...kids.map(k => walk(k, d + 1, seen)));
  };
  return Math.max(0, ...roots.map(r => walk(r, 1)));
}

function detectMermaidType(code) {
  const first = code.trim().split('\n')[0].toLowerCase();
  if (first.startsWith('flowchart') || first.startsWith('graph')) return 'flowchart';
  if (first.startsWith('sequencediagram')) return 'sequence';
  if (first.startsWith('statediagram')) return 'state';
  if (first.startsWith('erdiagram')) return 'ER';
  if (first.startsWith('timeline')) return 'timeline';
  if (first.startsWith('quadrantchart')) return 'quadrant';
  return 'flowchart';
}

// --- Check 1: Missing images ---

function checkMissingImages(html, htmlDir) {
  const violations = [];
  const imgRe = /<img[^>]+src=["']([^"']+)["']/gi;
  for (const m of html.matchAll(imgRe)) {
    const src = m[1];
    if (src.startsWith('data:') || src.startsWith('http://') || src.startsWith('https://')) continue;
    const resolved = path.resolve(htmlDir, src);
    if (!fs.existsSync(resolved)) {
      violations.push({ rule: 'missing-image', hint: `Referenced image not found: ${src}` });
    }
  }
  return violations;
}

// --- Shared: strip regions where prose-level rules don't apply ---

function stripCodeRegions(html) {
  return html
    .replace(/<pre[\s>][\s\S]*?<\/pre>/gi, '')
    .replace(/<code[\s>][\s\S]*?<\/code>/gi, '')
    .replace(/<script[\s>][\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s>][\s\S]*?<\/style>/gi, '');
}

// --- Check 2: Raw markdown remnants ---

function checkRawMarkdown(html) {
  const violations = [];
  const stripped = stripCodeRegions(html);

  const headings = stripped.match(/^\s*#{1,6}\s+\S/gm);
  if (headings) {
    violations.push({ rule: 'raw-markdown', hint: `${headings.length} markdown heading(s) in HTML body` });
  }

  const bold = stripped.match(/\*\*[^*]+\*\*/g);
  if (bold) {
    violations.push({ rule: 'raw-markdown', hint: `${bold.length} markdown bold pattern(s) in HTML body` });
  }

  const fences = stripped.match(/^```/gm);
  if (fences) {
    violations.push({ rule: 'raw-markdown', hint: `${fences.length} markdown code fence(s) in HTML body` });
  }

  return violations;
}

// --- Check 3: Mermaid density ---

function checkMermaidDensity(html) {
  const violations = [];
  const mermaidRe = /<pre\s+class=["']mermaid["'][^>]*>([\s\S]*?)<\/pre>/gi;
  let idx = 0;
  for (const m of html.matchAll(mermaidRe)) {
    idx++;
    const code = m[1].replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
    const type = detectMermaidType(code);
    const budget = DENSITY_BUDGETS[type] || { maxNodes: 9, maxArrows: 12 };

    const checks = [
      [budget.maxNodes, countNodes, 'nodes'],
      [budget.maxArrows, countArrows, 'arrows'],
      [budget.maxLifelines, countLifelines, 'lifelines'],
      [budget.maxLanes, countLanes, 'lanes'],
      [budget.maxEntities, countEntities, 'entities'],
      [budget.maxLevels, maxNestedDepth, 'nested levels'],
      [budget.maxDepth, maxTreeDepth, 'depth'],
    ];

    for (const [limit, counter, label] of checks) {
      if (limit != null) {
        const n = counter(code);
        if (n > limit) {
          violations.push({ rule: 'mermaid-density', hint: `Diagram #${idx} (${type}): ${n} ${label}, budget ${limit}` });
        }
      }
    }
  }
  return violations;
}

// --- Shared: extract decoded Mermaid source blocks ---

function extractMermaidBlocks(html) {
  const blocks = [];
  const mermaidRe = /<pre\s+class=["']mermaid["'][^>]*>([\s\S]*?)<\/pre>/gi;
  for (const m of html.matchAll(mermaidRe)) {
    blocks.push(m[1].replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&'));
  }
  return blocks;
}

// --- Check 4: Mermaid classDef colour traps (A1 + A2) ---
// rgb()/rgba() silently break the Mermaid parser, and an explicit `color:` in a
// classDef overrides our CSS dark-mode token so the node text turns unreadable in
// one of the two schemes. Both are declared FORBIDDEN in semantic-tokens.md and
// artifact-gate.md, but were previously left to authoring discipline — i.e. a wish.

function checkMermaidClassDef(html) {
  const violations = [];
  let idx = 0;
  for (const code of extractMermaidBlocks(html)) {
    idx++;
    for (const line of code.split('\n')) {
      if (!/\bclassDef\b/.test(line)) continue;
      if (/\brgba?\s*\(/i.test(line)) {
        violations.push({ rule: 'mermaid-classdef-color-fn', hint: `Diagram #${idx}: rgb()/rgba() in classDef breaks the Mermaid parser — use 8-digit hex #RRGGBBAA` });
      }
      if (/(?:^|[,\s])color\s*:/i.test(line)) {
        violations.push({ rule: 'mermaid-classdef-color', hint: `Diagram #${idx}: 'color:' in classDef overrides dark-mode tokens — set node text via a CSS .nodeLabel override instead` });
      }
    }
  }
  return violations;
}

// --- Check 5: Forbidden violet/fuchsia palette (A3) ---
// The violet/fuchsia family is the LLM-default "AI purple" that semantic-tokens.md
// bans as a palette colour. Exact-hex match keeps false positives at zero; the
// substring test also catches 8-digit (alpha) variants. hsl()/oklch() purple
// detection is deliberately deferred to a later pass.

const FORBIDDEN_HEXES = ['#8b5cf6', '#7c3aed', '#a78bfa', '#d946ef'];

function checkForbiddenColors(html) {
  const violations = [];
  const lower = html.toLowerCase();
  for (const hex of FORBIDDEN_HEXES) {
    if (lower.includes(hex)) {
      violations.push({ rule: 'forbidden-color', hint: `Violet/fuchsia palette colour ${hex} is the AI-default accent banned by semantic-tokens.md` });
    }
  }
  return violations;
}

// --- Check 6: Anchor href integrity (B1) ---
// CONTEXT.md names link-href as a gate check. A dead anchor (no href, empty, or
// "#") is a broken affordance the model can leave behind. Pure jump targets that
// carry an id/name but no href are legitimate and exempt.

function checkAnchorHrefs(html) {
  const violations = [];
  for (const m of html.matchAll(/<a\b([^>]*)>/gi)) {
    const attrs = m[1];
    const href = /href\s*=\s*["']([^"']*)["']/i.exec(attrs);
    if (!href) {
      if (!/\b(?:id|name)\s*=/i.test(attrs)) {
        violations.push({ rule: 'anchor-href', hint: `<a> without href — dead link or missing target` });
      }
      continue;
    }
    const val = href[1].trim();
    if (val === '' || val === '#') {
      violations.push({ rule: 'anchor-href', hint: `<a href="${val}"> is a placeholder link` });
    }
  }
  return violations;
}

// --- Check 7: Image alt text (B2) ---
// CONTEXT.md names image-alt as a gate check: an <img> with no alt attribute is
// invisible to screen readers and reads as a hastily-dropped asset. An empty
// alt="" is a valid choice for decorative images, so only a missing attribute fails.

function checkImageAlt(html) {
  const violations = [];
  for (const m of html.matchAll(/<img\b([^>]*)>/gi)) {
    if (!/\balt\s*=/i.test(m[1])) {
      const src = /src\s*=\s*["']([^"']*)["']/i.exec(m[1]);
      violations.push({ rule: 'image-alt', hint: `<img> missing alt attribute${src ? `: ${src[1]}` : ''}` });
    }
  }
  return violations;
}

// --- Check 8: Placeholder / scaffold leak (C1) ---
// Template scaffolding the model forgot to fill — mustache tokens, lorem ipsum,
// or bracketed stubs — is content the report promised but never delivered. Bare
// "TODO"/"FIXME" are intentionally NOT matched: vision-powers reports legitimately
// discuss source code that contains them. Code regions are stripped so quoted
// source stays exempt.

function checkPlaceholders(html) {
  const violations = [];
  const body = stripCodeRegions(html);
  if (/\{\{[^}]*\}\}/.test(body)) {
    violations.push({ rule: 'placeholder', hint: `Unfilled mustache placeholder ({{ ... }}) left in output` });
  }
  if (/lorem ipsum/i.test(body)) {
    violations.push({ rule: 'placeholder', hint: `Lorem ipsum filler text left in output` });
  }
  if (/\[(?:placeholder|todo|fixme|your[\s_][^\]]*|insert\b[^\]]*)\]/i.test(body)) {
    violations.push({ rule: 'placeholder', hint: `Bracketed placeholder stub left in output` });
  }
  return violations;
}

// --- Main ---

function runArtifactGate(htmlPath) {
  if (!fs.existsSync(htmlPath)) {
    return { ok: false, violations: [{ rule: 'file-not-found', hint: `File not found: ${htmlPath}` }] };
  }
  const html = fs.readFileSync(htmlPath, 'utf-8');
  const htmlDir = path.dirname(htmlPath);

  const violations = [
    ...checkMissingImages(html, htmlDir),
    ...checkRawMarkdown(html),
    ...checkMermaidDensity(html),
    ...checkMermaidClassDef(html),
    ...checkForbiddenColors(html),
    ...checkAnchorHrefs(html),
    ...checkImageAlt(html),
    ...checkPlaceholders(html),
  ];

  return { ok: violations.length === 0, violations };
}

module.exports = {
  runArtifactGate,
  checkMissingImages,
  checkRawMarkdown,
  checkMermaidDensity,
  checkMermaidClassDef,
  checkForbiddenColors,
  checkAnchorHrefs,
  checkImageAlt,
  checkPlaceholders,
  DENSITY_BUDGETS,
};

if (require.main === module) {
  const htmlPath = process.argv[2];
  if (!htmlPath) {
    console.error('Usage: artifact-gate.js <html-file-path>');
    process.exit(2);
  }
  const result = runArtifactGate(htmlPath);
  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  process.exit(result.ok ? 0 : 1);
}
