// scripts/taste-gate.js
'use strict';

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
  let depth = 0;
  let max = 0;
  for (const line of mermaid.split('\n')) {
    if (/^\s*subgraph\b/.test(line)) {
      depth += 1;
      if (depth > max) max = depth;
    } else if (/^\s*end\b/.test(line)) {
      depth = Math.max(0, depth - 1);
    }
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

function runTasteGate({ mermaid, type }) {
  const violations = [];

  if (/classDef[^\n]*r?gba?\s*\(/i.test(mermaid)) {
    violations.push({ rule: 'no-rgba-in-classdef', hint: 'Use 8-digit hex #RRGGBBAA instead' });
  }
  if (/classDef[^\n]*\bcolor\s*:/.test(mermaid)) {
    violations.push({ rule: 'no-color-in-classdef', hint: 'Let CSS overrides handle text via var(--text)' });
  }
  if (/writing-mode\s*:\s*vertical/i.test(mermaid)) {
    violations.push({ rule: 'no-vertical-writing-mode', hint: 'Vertical writing mode breaks SVG text measurement' });
  }
  if (type === 'state' && /<br\/?>/.test(mermaid)) {
    violations.push({ rule: 'no-br-in-state', hint: 'Use flowchart for multi-line state labels' });
  }
  if (type === 'sequence') {
    const messageLines = mermaid.split('\n').filter(l => /->>?/.test(l));
    for (const line of messageLines) {
      const afterColon = line.split(':').slice(1).join(':');
      if (/[{}\[\]<>&]/.test(afterColon)) {
        violations.push({ rule: 'no-special-chars-in-sequence', hint: 'Rewrite message as plain prose' });
        break;
      }
    }
  }

  const budget = DENSITY_BUDGETS[type] || { maxNodes: 9, maxArrows: 12 };

  if (budget.maxNodes != null) {
    const n = countNodes(mermaid);
    if (n > budget.maxNodes) violations.push({ rule: 'max-nodes-exceeded', hint: `${type} budget ${budget.maxNodes}, got ${n}` });
  }
  if (budget.maxArrows != null) {
    const n = countArrows(mermaid);
    if (n > budget.maxArrows) violations.push({ rule: 'max-arrows-exceeded', hint: `${type} arrows budget ${budget.maxArrows}, got ${n}` });
  }
  if (budget.maxLifelines != null) {
    const n = countLifelines(mermaid);
    if (n > budget.maxLifelines) violations.push({ rule: 'max-lifelines-exceeded', hint: `sequence lifelines budget ${budget.maxLifelines}, got ${n}` });
  }
  if (budget.maxLanes != null) {
    const n = countLanes(mermaid);
    if (n > budget.maxLanes) violations.push({ rule: 'max-lanes-exceeded', hint: `swimlane lanes budget ${budget.maxLanes}, got ${n}` });
  }
  if (budget.maxEntities != null) {
    const n = countEntities(mermaid);
    if (n > budget.maxEntities) violations.push({ rule: 'max-entities-exceeded', hint: `ER entities budget ${budget.maxEntities}, got ${n}` });
  }
  if (budget.maxLevels != null) {
    const n = maxNestedDepth(mermaid);
    if (n > budget.maxLevels) violations.push({ rule: 'max-levels-exceeded', hint: `nested levels budget ${budget.maxLevels}, got ${n}` });
  }
  if (budget.maxDepth != null) {
    const n = maxTreeDepth(mermaid);
    if (n > budget.maxDepth) violations.push({ rule: 'max-depth-exceeded', hint: `tree depth budget ${budget.maxDepth}, got ${n}` });
  }

  const accentMatches = (mermaid.match(/:::accent\b|class\s+\w+\s+accent/g) || []).length;
  if (accentMatches > 2) {
    violations.push({ rule: 'too-many-accents', hint: `accent on ${accentMatches} elements, max 2` });
  }

  return { ok: violations.length === 0, violations };
}

module.exports = { runTasteGate, DENSITY_BUDGETS };
