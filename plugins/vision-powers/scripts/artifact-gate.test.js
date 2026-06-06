const assert = require('node:assert');
const { test } = require('node:test');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { runArtifactGate, checkRawMarkdown, checkMermaidDensity } = require('./artifact-gate');

function withTempHtml(content, fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'artifact-gate-'));
  const file = path.join(dir, 'report.html');
  fs.writeFileSync(file, content);
  try { return fn(file, dir); }
  finally { fs.rmSync(dir, { recursive: true, force: true }); }
}

// --- Clean HTML ---

test('clean HTML passes all checks', () => {
  const html = `<!DOCTYPE html><html><head><title>Report</title></head>
<body><h1>Title</h1><p>Content here.</p>
<pre class="mermaid">flowchart TD\n  A --> B\n  B --> C</pre>
</body></html>`;
  withTempHtml(html, (file) => {
    const result = runArtifactGate(file);
    assert.strictEqual(result.ok, true);
    assert.strictEqual(result.violations.length, 0);
  });
});

// --- Check 1: Missing images ---

test('detects missing local image', () => {
  const html = '<html><body><img src="images/chart.png"></body></html>';
  withTempHtml(html, (file) => {
    const result = runArtifactGate(file);
    assert.ok(result.violations.some(v => v.rule === 'missing-image'));
  });
});

test('ignores external URLs and data URIs', () => {
  const html = `<html><body>
<img src="https://example.com/img.png">
<img src="data:image/png;base64,iVBOR">
</body></html>`;
  withTempHtml(html, (file) => {
    const result = runArtifactGate(file);
    assert.strictEqual(result.ok, true);
  });
});

test('passes when local image exists', () => {
  const html = '<html><body><img src="logo.png"></body></html>';
  withTempHtml(html, (file, dir) => {
    fs.writeFileSync(path.join(dir, 'logo.png'), 'fake');
    const result = runArtifactGate(file);
    assert.ok(!result.violations.some(v => v.rule === 'missing-image'));
  });
});

// --- Check 2: Raw markdown ---

test('detects markdown headings in HTML body', () => {
  const html = '<html><body><div>\n## This is markdown\n</div></body></html>';
  const violations = checkRawMarkdown(html);
  assert.ok(violations.some(v => v.rule === 'raw-markdown' && v.hint.includes('heading')));
});

test('detects markdown bold in HTML body', () => {
  const html = '<html><body><p>This is **bold text** here</p></body></html>';
  const violations = checkRawMarkdown(html);
  assert.ok(violations.some(v => v.rule === 'raw-markdown' && v.hint.includes('bold')));
});

test('detects code fences in HTML body', () => {
  const html = '<html><body><div>\n```javascript\nconst x = 1;\n```\n</div></body></html>';
  const violations = checkRawMarkdown(html);
  assert.ok(violations.some(v => v.rule === 'raw-markdown' && v.hint.includes('fence')));
});

test('does NOT flag markdown inside <pre> or <code> blocks', () => {
  const html = `<html><body>
<pre>## heading in pre is fine</pre>
<code>**bold in code is fine**</code>
</body></html>`;
  const violations = checkRawMarkdown(html);
  assert.strictEqual(violations.length, 0);
});

test('does NOT flag markdown inside <script> or <style> blocks', () => {
  const html = `<html>
<style>## not a heading { color: red }</style>
<script>const x = "**not bold**";</script>
<body><p>Clean</p></body></html>`;
  const violations = checkRawMarkdown(html);
  assert.strictEqual(violations.length, 0);
});

// --- Check 3: Mermaid density ---

test('passes clean mermaid in HTML', () => {
  const html = '<html><body><pre class="mermaid">flowchart TD\n  A --> B\n  B --> C</pre></body></html>';
  const violations = checkMermaidDensity(html);
  assert.strictEqual(violations.length, 0);
});

test('detects too many nodes in mermaid', () => {
  let nodes = '';
  for (let i = 0; i < 12; i++) nodes += `  N${i}\n`;
  const html = `<html><body><pre class="mermaid">flowchart TD\n${nodes}</pre></body></html>`;
  const violations = checkMermaidDensity(html);
  assert.ok(violations.some(v => v.rule === 'mermaid-density' && v.hint.includes('nodes')));
});

test('detects too many arrows in mermaid', () => {
  let arrows = '';
  for (let i = 0; i < 14; i++) arrows += `  X${i} --> Y${i}\n`;
  const html = `<html><body><pre class="mermaid">flowchart TD\n${arrows}</pre></body></html>`;
  const violations = checkMermaidDensity(html);
  assert.ok(violations.some(v => v.rule === 'mermaid-density' && v.hint.includes('arrows')));
});

test('detects sequence lifelines over budget', () => {
  const lines = Array.from({ length: 6 }, (_, i) => `  participant P${i}`).join('\n');
  const html = `<html><body><pre class="mermaid">sequenceDiagram\n${lines}\n  P0->>P1: hi</pre></body></html>`;
  const violations = checkMermaidDensity(html);
  assert.ok(violations.some(v => v.rule === 'mermaid-density' && v.hint.includes('lifelines')));
});

test('handles HTML entities in mermaid code', () => {
  const html = '<html><body><pre class="mermaid">flowchart TD\n  A --&gt; B\n  B --&gt; C</pre></body></html>';
  const violations = checkMermaidDensity(html);
  assert.strictEqual(violations.length, 0);
});

// --- Edge cases ---

test('file not found returns violation', () => {
  const result = runArtifactGate('/nonexistent/path/report.html');
  assert.strictEqual(result.ok, false);
  assert.ok(result.violations.some(v => v.rule === 'file-not-found'));
});

test('multiple violations from different checks', () => {
  let nodes = '';
  for (let i = 0; i < 12; i++) nodes += `  N${i}\n`;
  const html = `<html><body>
<img src="missing.png">
<div>\n## Markdown heading\n</div>
<pre class="mermaid">flowchart TD\n${nodes}</pre>
</body></html>`;
  withTempHtml(html, (file) => {
    const result = runArtifactGate(file);
    assert.strictEqual(result.ok, false);
    const rules = new Set(result.violations.map(v => v.rule));
    assert.ok(rules.has('missing-image'));
    assert.ok(rules.has('raw-markdown'));
    assert.ok(rules.has('mermaid-density'));
  });
});
