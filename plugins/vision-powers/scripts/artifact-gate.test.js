const assert = require('node:assert');
const { test } = require('node:test');
const fs = require('fs');
const path = require('path');
const os = require('os');
const {
  runArtifactGate,
  checkRawMarkdown,
  checkMermaidDensity,
  checkMermaidClassDef,
  checkForbiddenColors,
  checkAnchorHrefs,
  checkImageAlt,
  checkPlaceholders,
  checkGradientText,
  checkFontFallback,
} = require('./artifact-gate');

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
<img src="https://example.com/img.png" alt="external">
<img src="data:image/png;base64,iVBOR" alt="inline">
</body></html>`;
  withTempHtml(html, (file) => {
    const result = runArtifactGate(file);
    assert.strictEqual(result.ok, true);
  });
});

test('passes when local image exists', () => {
  const html = '<html><body><img src="logo.png" alt="logo"></body></html>';
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

// --- Check 4: Mermaid classDef colour traps (A1 + A2) ---

test('detects rgba()/rgb() in mermaid classDef', () => {
  const html = '<html><body><pre class="mermaid">flowchart TD\n  A --> B\n  classDef focal fill:rgba(0,0,0,.5),stroke:#1c1917</pre></body></html>';
  const violations = checkMermaidClassDef(html);
  assert.ok(violations.some(v => v.rule === 'mermaid-classdef-color-fn'));
});

test('detects color: in mermaid classDef', () => {
  const html = '<html><body><pre class="mermaid">flowchart TD\n  A --> B\n  classDef focal fill:#b5523a,color:#ffffff</pre></body></html>';
  const violations = checkMermaidClassDef(html);
  assert.ok(violations.some(v => v.rule === 'mermaid-classdef-color'));
});

test('clean classDef (fill/stroke hex only) passes', () => {
  const html = '<html><body><pre class="mermaid">flowchart TD\n  A --> B\n  classDef focal fill:#b5523a,stroke:#1c1917</pre></body></html>';
  assert.strictEqual(checkMermaidClassDef(html).length, 0);
});

// --- Check 5: Forbidden violet/fuchsia palette (A3) ---

test('detects forbidden violet hex', () => {
  const html = '<html><head><style>.x{color:#8B5CF6}</style></head><body>x</body></html>';
  const violations = checkForbiddenColors(html);
  assert.ok(violations.some(v => v.rule === 'forbidden-color'));
});

test('allows the sanctioned accent hex', () => {
  const html = '<html><head><style>.x{color:#b5523a}</style></head><body>x</body></html>';
  assert.strictEqual(checkForbiddenColors(html).length, 0);
});

test('exempts a forbidden hex quoted inside a verbatim code panel', () => {
  // A diff that ADDS the ban (e.g. the commit defining FORBIDDEN_HEXES) quotes
  // the hex as source; the report adopts no such colour.
  const html = '<html><body><pre><code class="language-js">'
    + 'const FORBIDDEN = [&#39;#8b5cf6&#39;, &#39;#7c3aed&#39;];'
    + '</code></pre></body></html>';
  assert.strictEqual(checkForbiddenColors(html).length, 0);
});

test('GATE-2: exempts a verbatim hex when attributes precede the class', () => {
  // Highlighters often emit other attributes before class
  // (`<code data-line="1" class="language-js">`). The exemption must still apply,
  // or verbatim code re-triggers a false forbidden-color violation.
  const html = '<html><body><pre><code data-line="1" class="language-js">'
    + 'const FORBIDDEN = [&#39;#8b5cf6&#39;];'
    + '</code></pre></body></html>';
  assert.strictEqual(checkForbiddenColors(html).length, 0);
});

test('still flags a forbidden hex in an inline style attribute', () => {
  const html = '<html><body><div style="color:#8b5cf6">x</div></body></html>';
  assert.ok(checkForbiddenColors(html).some(v => v.rule === 'forbidden-color'));
});

test('still flags a forbidden hex inside a mermaid diagram', () => {
  const html = '<html><body><pre class="mermaid">flowchart TD\n'
    + '  A:::p\n  classDef p fill:#d946ef</pre></body></html>';
  assert.ok(checkForbiddenColors(html).some(v => v.rule === 'forbidden-color'));
});

test('exemption is narrow: a bare <code> without language class is still scanned', () => {
  const html = '<html><body><code>#a78bfa</code></body></html>';
  assert.ok(checkForbiddenColors(html).some(v => v.rule === 'forbidden-color'));
});

// --- Check 6: Anchor href integrity (B1) ---

test('detects anchor without href', () => {
  const html = '<html><body><a>dead link</a></body></html>';
  assert.ok(checkAnchorHrefs(html).some(v => v.rule === 'anchor-href'));
});

test('detects placeholder hash href', () => {
  const html = '<html><body><a href="#">click</a></body></html>';
  assert.ok(checkAnchorHrefs(html).some(v => v.rule === 'anchor-href'));
});

test('exempts pure jump targets (id/name, no href)', () => {
  const html = '<html><body><a id="section-2"></a><a name="top"></a></body></html>';
  assert.strictEqual(checkAnchorHrefs(html).length, 0);
});

test('allows a real link', () => {
  const html = '<html><body><a href="https://example.com">go</a><a href="#section-2">jump</a></body></html>';
  // "#section-2" is a same-page jump (non-empty fragment) → allowed; only bare "#" fails.
  const v = checkAnchorHrefs(html);
  assert.strictEqual(v.length, 0);
});

// --- Check 7: Image alt text (B2) ---

test('detects img missing alt', () => {
  const html = '<html><body><img src="x.png"></body></html>';
  assert.ok(checkImageAlt(html).some(v => v.rule === 'image-alt'));
});

test('allows empty alt (decorative)', () => {
  const html = '<html><body><img src="divider.png" alt=""></body></html>';
  assert.strictEqual(checkImageAlt(html).length, 0);
});

// --- Check 8: Placeholder / scaffold leak (C1) ---

test('detects mustache placeholder', () => {
  const html = '<html><body><h1>{{ title }}</h1></body></html>';
  assert.ok(checkPlaceholders(html).some(v => v.rule === 'placeholder'));
});

test('detects lorem ipsum', () => {
  const html = '<html><body><p>Lorem ipsum dolor sit amet.</p></body></html>';
  assert.ok(checkPlaceholders(html).some(v => v.rule === 'placeholder'));
});

test('detects bracketed stub', () => {
  const html = '<html><body><p>Author: [YOUR NAME]</p></body></html>';
  assert.ok(checkPlaceholders(html).some(v => v.rule === 'placeholder'));
});

test('does NOT flag bare TODO in prose', () => {
  const html = '<html><body><p>This plugin should add a TODO list feature.</p></body></html>';
  assert.strictEqual(checkPlaceholders(html).length, 0);
});

test('exempts placeholder-looking text inside code blocks', () => {
  const html = '<html><body><pre>const tpl = "{{ name }}";</pre><code>lorem ipsum</code></body></html>';
  assert.strictEqual(checkPlaceholders(html).length, 0);
});

// --- Check 9: Gradient-clipped text ---

test('detects gradient-clipped text in a style block', () => {
  const html = `<html><head><style>.hero{background:linear-gradient(90deg,#b5523a,#2563eb);-webkit-background-clip:text;-webkit-text-fill-color:transparent}</style></head><body>x</body></html>`;
  assert.ok(checkGradientText(html).some(v => v.rule === 'gradient-text'));
});

test('detects gradient-clipped text in an inline style attribute', () => {
  const html = `<html><body><h1 style="background-clip: text; color: transparent">Title</h1></body></html>`;
  assert.ok(checkGradientText(html).some(v => v.rule === 'gradient-text'));
});

test('does NOT flag background-clip:text quoted inside a code block', () => {
  const html = `<html><body><pre>h1 { -webkit-background-clip: text; }</pre></body></html>`;
  assert.strictEqual(checkGradientText(html).length, 0);
});

test('clean styling without clipped text passes', () => {
  const html = `<html><head><style>.x{background:#b5523a;color:#fff}</style></head><body>x</body></html>`;
  assert.strictEqual(checkGradientText(html).length, 0);
});

// --- Check 10: Font-family fallback chain ---

test('detects a bare font-family with no generic fallback', () => {
  const html = `<html><head><style>body{font-family:Geist}</style></head><body>x</body></html>`;
  assert.ok(checkFontFallback(html).some(v => v.rule === 'font-fallback'));
});

test('passes a font-family that ends in a generic family', () => {
  const html = `<html><head><style>body{font-family:Geist, system-ui, sans-serif}</style></head><body>x</body></html>`;
  assert.strictEqual(checkFontFallback(html).length, 0);
});

test('passes a quoted family with a generic fallback', () => {
  const html = `<html><head><style>h1{font-family:"Instrument Serif", Georgia, serif}</style></head><body>x</body></html>`;
  assert.strictEqual(checkFontFallback(html).length, 0);
});

test('exempts @font-face which declares a font name, not a usage', () => {
  const html = `<html><head><style>@font-face{font-family:"Geist";src:url(geist.woff2)}body{font-family:Geist, sans-serif}</style></head><body>x</body></html>`;
  assert.strictEqual(checkFontFallback(html).length, 0);
});

test('trusts a var()-only font-family chain', () => {
  const html = `<html><head><style>body{font-family:var(--body-font)}</style></head><body>x</body></html>`;
  assert.strictEqual(checkFontFallback(html).length, 0);
});

test('flags a bare font-family in an inline style attribute', () => {
  const html = `<html><body><p style="font-family: Geist">hi</p></body></html>`;
  assert.ok(checkFontFallback(html).some(v => v.rule === 'font-fallback'));
});
