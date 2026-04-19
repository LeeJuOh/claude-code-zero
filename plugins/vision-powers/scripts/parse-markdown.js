// scripts/parse-markdown.js
'use strict';

function parseMarkdown(src) {
  if (!src || src.trim() === '') return { sections: [] };

  const lines = src.split('\n');
  const sections = [];
  let current = null;
  let inCodeBlock = false;
  let currentCode = null;
  let codeLang = '';

  const headingRegex = /^(#{1,3})\s+(.+)$/;
  const codeFenceRegex = /^```(\w*)/;
  const tableRegex = /^\|.+\|.*$/;
  const listRegex = /^\s*[-*+]\s+/;

  let sectionCounter = 0;
  const newSection = (heading, level) => {
    sectionCounter += 1;
    return {
      id: `sec-${sectionCounter}`,
      heading,
      level,
      body: '',
      code_blocks: [],
      existing_mermaid: [],
      has_table: false,
      has_list: false,
    };
  };

  for (const line of lines) {
    const fenceMatch = line.match(codeFenceRegex);
    if (fenceMatch && !inCodeBlock) {
      inCodeBlock = true;
      codeLang = fenceMatch[1];
      currentCode = '';
      continue;
    }
    if (fenceMatch && inCodeBlock) {
      inCodeBlock = false;
      if (!current) current = newSection(null, 0);
      if (codeLang === 'mermaid') {
        current.existing_mermaid.push(currentCode);
      } else {
        current.code_blocks.push({ lang: codeLang, content: currentCode });
      }
      currentCode = null;
      codeLang = '';
      continue;
    }
    if (inCodeBlock) {
      currentCode += (currentCode ? '\n' : '') + line;
      continue;
    }

    const hMatch = line.match(headingRegex);
    if (hMatch) {
      if (current) sections.push(current);
      current = newSection(hMatch[2].trim(), hMatch[1].length);
      continue;
    }

    if (!current) current = newSection(null, 0);

    if (tableRegex.test(line)) current.has_table = true;
    if (listRegex.test(line)) current.has_list = true;

    current.body += (current.body ? '\n' : '') + line;
  }

  if (current) sections.push(current);

  return { sections };
}

module.exports = { parseMarkdown };

if (require.main === module) {
  const fs = require('fs');
  const file = process.argv[2];
  if (!file) {
    console.error('Usage: parse-markdown.js <input-md-path>');
    process.exit(1);
  }
  if (!fs.existsSync(file)) {
    console.error(`Error: file not found: ${file}`);
    process.exit(1);
  }
  const src = fs.readFileSync(file, 'utf-8');
  process.stdout.write(JSON.stringify(parseMarkdown(src), null, 2) + '\n');
}
