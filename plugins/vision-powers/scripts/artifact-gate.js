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

// --- Check 2: Raw markdown remnants ---

function checkRawMarkdown(html) {
  const violations = [];
  const stripped = html
    .replace(/<pre[\s>][\s\S]*?<\/pre>/gi, '')
    .replace(/<code[\s>][\s\S]*?<\/code>/gi, '')
    .replace(/<script[\s>][\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s>][\s\S]*?<\/style>/gi, '');

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
  ];

  return { ok: violations.length === 0, violations };
}

module.exports = { runArtifactGate, checkMissingImages, checkRawMarkdown, checkMermaidDensity, DENSITY_BUDGETS };

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
