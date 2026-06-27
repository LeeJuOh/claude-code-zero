#!/usr/bin/env node
'use strict';

// extract-hunks.js — build-time grounding for structured code blocks (ADR 0005).
//
// The model must never retype changed code into a report: under token pressure it
// paraphrases, reflows, or mis-escapes, and a confidently-wrong diff is dangerous in
// a review. This script lifts the exact changed lines out of git, HTML-escapes them,
// and emits paste-ready <pre><code> blocks. The model only selects which file/range
// matters and writes the surrounding prose (summary, risk, annotation). Highlighting
// is left to runtime highlight.js (the language class is set here from the extension),
// never to pre-rendered spans — see references/design-system/structured-blocks.md.
//
// Usage:
//   extract-hunks.js <scope> <file> [line-range]     # runs `git diff <scope> -- <file>`
//   extract-hunks.js --stdin <file> [line-range]     # parses a unified diff from stdin
//   gh pr diff 123 | extract-hunks.js --stdin src/auth.ts 40-90
//
//   <scope>       any git diff expression: HEAD, main...feature, abc..def. A lone
//                 commit sha resolves to that commit's own change (`git show <sha>`).
//   <file>        path as it appears in the diff (new-side path for renames)
//   [line-range]  after-side lines to include, e.g. 40-90 or L40-L90. Omitted = all hunks.
//
// Flags:
//   --json        emit machine JSON instead of paste-ready HTML
//   --stdin       read the unified diff from stdin instead of invoking git
//
// Exit codes: 0 = success OR a safe empty/binary result (never crash the skill),
//             2 = usage error.

const { execFileSync } = require('child_process');

// --- HTML escaping (the verbatim guarantee) ---
// Only the five SGML-significant characters; everything else stays byte-for-byte so
// the code in the report is identical to the code in the repo.
function escapeHtml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// --- Language class from extension (highlight.js `language-*`) ---
// Set mechanically from the path so highlight.js never has to auto-detect (which
// mis-guesses short hunks). Unknown extensions get `plaintext` — still escaped and
// correct, just un-highlighted.
const EXT_LANG = {
  ts: 'typescript', tsx: 'tsx', mts: 'typescript', cts: 'typescript',
  js: 'javascript', jsx: 'javascript', mjs: 'javascript', cjs: 'javascript',
  py: 'python', rb: 'ruby', go: 'go', rs: 'rust', java: 'java', kt: 'kotlin',
  c: 'c', h: 'c', cc: 'cpp', cpp: 'cpp', hpp: 'cpp', cs: 'csharp', swift: 'swift',
  php: 'php', sh: 'bash', bash: 'bash', zsh: 'bash', sql: 'sql', graphql: 'graphql',
  json: 'json', yaml: 'yaml', yml: 'yaml', toml: 'ini', ini: 'ini', xml: 'xml',
  html: 'xml', css: 'css', scss: 'scss', less: 'less', md: 'markdown',
  prisma: 'prisma', proto: 'protobuf', dockerfile: 'dockerfile', tf: 'hcl',
};

function languageFor(file) {
  const base = file.split('/').pop() || file;
  if (base.toLowerCase() === 'dockerfile') return 'dockerfile';
  const ext = base.includes('.') ? base.split('.').pop().toLowerCase() : '';
  return EXT_LANG[ext] || 'plaintext';
}

// --- Parse an after-side line range like "40-90", "L40-L90", or "55" ---
function parseRange(spec) {
  if (!spec) return null;
  const m = /^L?(\d+)(?:\s*-\s*L?(\d+))?$/.exec(spec.trim());
  if (!m) return null;
  const start = parseInt(m[1], 10);
  const end = m[2] ? parseInt(m[2], 10) : start;
  return { start: Math.min(start, end), end: Math.max(start, end) };
}

// --- Unified-diff parser ---
// Splits a `git diff` blob into per-file entries, each with its hunks. For every
// hunk we reconstruct the BEFORE pane (context + removed lines) and the AFTER pane
// (context + added lines), stripping only the leading +/-/space marker. The text is
// otherwise untouched — this is what makes the block true-by-construction.
function parseUnifiedDiff(diff) {
  const files = [];
  const lines = diff.split('\n');
  let cur = null;
  let hunk = null;

  const closeHunk = () => {
    if (hunk && cur) cur.hunks.push(hunk);
    hunk = null;
  };
  const closeFile = () => {
    closeHunk();
    if (cur) files.push(cur);
    cur = null;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith('diff --git ')) {
      closeFile();
      cur = { oldPath: null, newPath: null, binary: false, hunks: [] };
      continue;
    }
    if (!cur) continue;

    if (line.startsWith('--- ')) {
      cur.oldPath = line.slice(4).replace(/^a\//, '').replace(/^"|"$/g, '');
      continue;
    }
    if (line.startsWith('+++ ')) {
      cur.newPath = line.slice(4).replace(/^b\//, '').replace(/^"|"$/g, '');
      continue;
    }
    if (/^Binary files /.test(line) || /^GIT binary patch/.test(line)) {
      cur.binary = true;
      continue;
    }
    if (line.startsWith('@@')) {
      closeHunk();
      // @@ -oldStart,oldLines +newStart,newLines @@ optional section heading
      const m = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@(.*)$/.exec(line);
      if (!m) { hunk = null; continue; }
      hunk = {
        oldStart: parseInt(m[1], 10),
        newStart: parseInt(m[3], 10),
        heading: (m[5] || '').trim(),
        before: [],
        after: [],
        // running line counters for range mapping
        _newLine: parseInt(m[3], 10),
        _oldLine: parseInt(m[1], 10),
        newEnd: parseInt(m[3], 10),
        oldEnd: parseInt(m[1], 10),
      };
      continue;
    }
    if (!hunk) continue;

    const marker = line[0];
    const text = line.slice(1);
    if (marker === '+') {
      hunk.after.push(text);
      hunk.newEnd = hunk._newLine;
      hunk._newLine++;
    } else if (marker === '-') {
      hunk.before.push(text);
      hunk.oldEnd = hunk._oldLine;
      hunk._oldLine++;
    } else if (marker === ' ') {
      hunk.before.push(text);
      hunk.after.push(text);
      hunk.newEnd = hunk._newLine;
      hunk.oldEnd = hunk._oldLine;
      hunk._newLine++;
      hunk._oldLine++;
    } else if (marker === '\\') {
      // "\ No newline at end of file" — metadata, not content.
      continue;
    } else {
      // Unknown line inside a hunk (shouldn't happen for well-formed diffs).
      continue;
    }
  }
  closeFile();
  return files;
}

// --- Resolve a file's diff text (from git or from a pre-supplied blob) ---
function getDiffForFile(scope, file, stdinDiff) {
  if (stdinDiff != null) return stdinDiff;
  // Scope may be one token (`HEAD`, `main...feature`, `abc..def`) or several
  // (`HEAD~3 HEAD`); split on whitespace so both reach git as separate args.
  const scopeArgs = scope ? scope.trim().split(/\s+/) : [];
  // A lone commit sha means "that commit's own change" — which is `git show
  // <sha>`, NOT `git diff <sha>`. `git diff <sha>` compares the commit to the
  // WORKING TREE, so once the file moves on it returns a cumulative/unrelated
  // diff that is confidently wrong. Resolve a bare sha via git show and treat
  // it as authoritative: the file's change in that commit, or nothing. Do NOT
  // fall back to git diff here — that resurrects the very bug. Ranges (a..b,
  // a...b — their dots fail the hex class) and refs (HEAD, branches) keep the
  // git diff path below.
  if (scopeArgs.length === 1 && /^[0-9a-f]{4,40}$/i.test(scopeArgs[0])) {
    const shown = tryGit(['show', '--format=', scopeArgs[0], '--', file]);
    return shown && shown.trim() ? shown : '';
  }
  const out = tryGit(['diff', ...scopeArgs, '--', file]);
  return out && out.trim() ? out : '';
}

function tryGit(args) {
  try {
    return execFileSync('git', args, { encoding: 'utf-8', maxBuffer: 64 * 1024 * 1024 });
  } catch (e) {
    return null;
  }
}

function readStdin() {
  try {
    return require('fs').readFileSync(0, 'utf-8');
  } catch (e) {
    return '';
  }
}

// --- Select hunks overlapping the requested after-side range ---
function hunkOverlapsRange(h, range) {
  if (!range) return true;
  const start = h.newStart;
  const end = h.newEnd;
  return start <= range.end && end >= range.start;
}

// --- Render one pane as a paste-ready highlight.js block ---
function renderPane(textLines, language) {
  const escaped = textLines.map(escapeHtml).join('\n');
  return `<pre><code class="language-${language}">${escaped}</code></pre>`;
}

function buildResult(file, diffText, range) {
  const parsed = parseUnifiedDiff(diffText);
  // Match by new-side path (renames keep the new path), else old path.
  const entry = parsed.find(f => f.newPath === file || f.oldPath === file) || parsed[0] || null;

  if (!entry) {
    return { file, language: languageFor(file), status: 'empty', hunks: [] };
  }
  if (entry.binary) {
    return { file, language: languageFor(file), status: 'binary', hunks: [] };
  }

  const language = languageFor(entry.newPath || file);
  const selected = entry.hunks.filter(h => hunkOverlapsRange(h, range));
  const hunks = selected.map(h => ({
    heading: h.heading,
    beforeRange: h.before.length ? `${h.oldStart}-${h.oldEnd}` : null,
    afterRange: h.after.length ? `${h.newStart}-${h.newEnd}` : null,
    beforeLines: h.before,
    afterLines: h.after,
  }));

  let status = 'ok';
  if (entry.hunks.length === 0) status = 'empty';
  else if (hunks.length === 0) status = 'no-match';

  return { file, language, status, hunks };
}

// --- Output renderers ---
function renderHtml(result) {
  const lines = [];
  const { file, language, status } = result;
  if (status === 'binary') {
    return `<!-- extract-hunks: ${file} is a binary file — no code to show. Note the change in prose instead. -->`;
  }
  if (status === 'empty') {
    return `<!-- extract-hunks: ${file} has no changes in this diff scope. -->`;
  }
  if (status === 'no-match') {
    return `<!-- extract-hunks: ${file} has changes, but none in the requested line range. Widen the range or omit it. -->`;
  }
  lines.push(`<!-- extract-hunks: ${file} | language-${language} | ${result.hunks.length} hunk(s). Paste the <pre><code> blocks into the split-diff columns; write the summary/annotations yourself. -->`);
  for (const h of result.hunks) {
    const oldR = h.beforeRange ? `old L${h.beforeRange}` : 'old —';
    const newR = h.afterRange ? `new L${h.afterRange}` : 'new —';
    const head = h.heading ? ` ${h.heading}` : '';
    lines.push(`<!-- hunk: ${oldR} / ${newR}${head} -->`);
    lines.push('<!-- BEFORE -->');
    lines.push(h.beforeLines.length ? renderPane(h.beforeLines, language)
      : '<!-- (no before lines — pure addition; consider annotated-code instead) -->');
    lines.push('<!-- AFTER -->');
    lines.push(h.afterLines.length ? renderPane(h.afterLines, language)
      : '<!-- (no after lines — pure deletion) -->');
  }
  return lines.join('\n');
}

function main() {
  const argv = process.argv.slice(2);
  const flags = new Set(argv.filter(a => a.startsWith('--')));
  const positional = argv.filter(a => !a.startsWith('--'));
  const asJson = flags.has('--json');
  const useStdin = flags.has('--stdin');

  let scope, file, rangeSpec;
  if (useStdin) {
    [file, rangeSpec] = positional;
  } else {
    [scope, file, rangeSpec] = positional;
  }

  if (!file) {
    process.stderr.write(
      'Usage:\n' +
      '  extract-hunks.js <scope> <file> [line-range]\n' +
      '  extract-hunks.js --stdin <file> [line-range]   (diff on stdin)\n' +
      '  [--json]  emit machine JSON instead of paste-ready HTML\n');
    process.exit(2);
  }

  const range = parseRange(rangeSpec);
  if (rangeSpec && !range) {
    process.stderr.write(`Bad line-range "${rangeSpec}" — use 40-90 or L40-L90.\n`);
    process.exit(2);
  }

  const stdinDiff = useStdin ? readStdin() : null;
  const diffText = getDiffForFile(scope, file, stdinDiff);
  const result = buildResult(file, diffText || '', range);

  if (asJson) {
    process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  } else {
    process.stdout.write(renderHtml(result) + '\n');
  }
  process.exit(0);
}

module.exports = {
  escapeHtml, languageFor, parseRange, parseUnifiedDiff, buildResult, renderHtml,
};

if (require.main === module) main();
