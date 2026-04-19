// scripts/parse-markdown.test.js
const assert = require('node:assert');
const { test } = require('node:test');
const { parseMarkdown } = require('./parse-markdown');

test('extracts H1 and H2 sections', () => {
  const input = `# Title\n\nIntro para.\n\n## Section A\n\nContent A.\n\n## Section B\n\nContent B.`;
  const result = parseMarkdown(input);
  assert.strictEqual(result.sections.length, 3);
  assert.strictEqual(result.sections[0].heading, 'Title');
  assert.strictEqual(result.sections[0].level, 1);
  assert.strictEqual(result.sections[1].heading, 'Section A');
  assert.strictEqual(result.sections[1].level, 2);
});

test('preserves code blocks inside sections', () => {
  const input = '## Section\n\n```js\nconst x = 1;\n```';
  const result = parseMarkdown(input);
  assert.strictEqual(result.sections[0].code_blocks.length, 1);
  assert.strictEqual(result.sections[0].code_blocks[0].lang, 'js');
  assert.match(result.sections[0].code_blocks[0].content, /const x = 1/);
});

test('detects existing mermaid blocks', () => {
  const input = '## Section\n\n```mermaid\ngraph TD\n  A --> B\n```';
  const result = parseMarkdown(input);
  assert.strictEqual(result.sections[0].existing_mermaid.length, 1);
  assert.match(result.sections[0].existing_mermaid[0], /graph TD/);
});

test('detects tables in sections', () => {
  const input = '## Section\n\n| A | B |\n|---|---|\n| 1 | 2 |';
  const result = parseMarkdown(input);
  assert.strictEqual(result.sections[0].has_table, true);
});

test('handles empty document gracefully', () => {
  const result = parseMarkdown('');
  assert.strictEqual(result.sections.length, 0);
});

test('falls back to one section when no headings', () => {
  const input = 'Just some text without headings.';
  const result = parseMarkdown(input);
  assert.strictEqual(result.sections.length, 1);
  assert.strictEqual(result.sections[0].heading, null);
  assert.match(result.sections[0].body, /Just some text/);
});
