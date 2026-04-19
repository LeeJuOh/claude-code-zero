// scripts/taste-gate.test.js
const assert = require('node:assert');
const { test } = require('node:test');
const { runTasteGate } = require('./taste-gate');

test('passes clean mermaid flowchart', () => {
  const mermaid = 'flowchart TD\n  A --> B\n  B --> C';
  const result = runTasteGate({ mermaid, type: 'flowchart' });
  assert.strictEqual(result.violations.length, 0);
  assert.strictEqual(result.ok, true);
});

test('detects rgba in classDef (case-insensitive)', () => {
  const mermaid = 'flowchart TD\n  A --> B\n  classDef hl fill:RGBA(181,82,58,0.2)';
  const result = runTasteGate({ mermaid, type: 'flowchart' });
  assert.ok(result.violations.some(v => v.rule === 'no-rgba-in-classdef'));
  assert.strictEqual(result.ok, false);
});

test('detects too many nodes', () => {
  let nodes = '';
  for (let i = 0; i < 12; i += 1) nodes += `  N${i}\n`;
  const mermaid = `flowchart TD\n${nodes}`;
  const result = runTasteGate({ mermaid, type: 'flowchart' });
  assert.ok(result.violations.some(v => v.rule === 'max-nodes-exceeded'));
});

test('detects too many arrows', () => {
  let arrows = '';
  for (let i = 0; i < 14; i += 1) arrows += `  X${i} --> Y${i}\n`;
  const mermaid = `flowchart TD\n${arrows}`;
  const result = runTasteGate({ mermaid, type: 'flowchart' });
  assert.ok(result.violations.some(v => v.rule === 'max-arrows-exceeded'));
});

test('detects br tag in stateDiagram', () => {
  const mermaid = 'stateDiagram-v2\n  A: Label<br/>Line2';
  const result = runTasteGate({ mermaid, type: 'state' });
  assert.ok(result.violations.some(v => v.rule === 'no-br-in-state'));
});

test('detects forbidden chars in sequenceDiagram message', () => {
  const mermaid = 'sequenceDiagram\n  A->>B: call({ foo: 1 })';
  const result = runTasteGate({ mermaid, type: 'sequence' });
  assert.ok(result.violations.some(v => v.rule === 'no-special-chars-in-sequence'));
});

test('detects sequence lifelines over budget (5)', () => {
  const mermaid = 'sequenceDiagram\n  participant A\n  participant B\n  participant C\n  participant D\n  participant E\n  participant F\n  A->>B: hi';
  const result = runTasteGate({ mermaid, type: 'sequence' });
  assert.ok(result.violations.some(v => v.rule === 'max-lifelines-exceeded'));
});

test('detects swimlane lanes over budget (5)', () => {
  const mermaid = 'flowchart LR\n  subgraph L1\n  end\n  subgraph L2\n  end\n  subgraph L3\n  end\n  subgraph L4\n  end\n  subgraph L5\n  end\n  subgraph L6\n  end';
  const result = runTasteGate({ mermaid, type: 'swimlane' });
  assert.ok(result.violations.some(v => v.rule === 'max-lanes-exceeded'));
});

test('detects color in classDef', () => {
  const mermaid = 'flowchart TD\n  A --> B\n  classDef x color:#fff,fill:#111';
  const result = runTasteGate({ mermaid, type: 'flowchart' });
  assert.ok(result.violations.some(v => v.rule === 'no-color-in-classdef'));
});

test('detects writing-mode vertical anywhere', () => {
  const mermaid = 'flowchart TD\n  A --> B\n  classDef v writing-mode:vertical-rl';
  const result = runTasteGate({ mermaid, type: 'flowchart' });
  assert.ok(result.violations.some(v => v.rule === 'no-vertical-writing-mode'));
});

test('reserved keyword (subgraph) is not counted as a node', () => {
  // subgraph/Frontend/Backend are structural keywords. The actual nodes are only A and B.
  // If countNodes regex also captures line-beginning keywords, maxNodes would false-positive.
  const mermaid = 'flowchart TD\n  subgraph Frontend\n    A[React]\n  end\n  subgraph Backend\n    B[API]\n  end\n  A --> B';
  const result = runTasteGate({ mermaid, type: 'flowchart' });
  assert.ok(!result.violations.some(v => v.rule === 'max-nodes-exceeded'),
    'subgraph/Frontend/Backend must not be counted as nodes');
});

test('sequence participant lines count only as lifelines (no node-counter interference)', () => {
  // The participant keyword is handled only by the lifeline counter.
  // For sequence type (no maxNodes field), countNodes must not be invoked.
  const mermaid = 'sequenceDiagram\n  participant A\n  participant B\n  A->>B: hi';
  const result = runTasteGate({ mermaid, type: 'sequence' });
  assert.strictEqual(result.ok, true);
});
