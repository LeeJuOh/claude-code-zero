'use strict';

const assert = require('node:assert');
const { test } = require('node:test');
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const SCRIPT = path.join(__dirname, 'extract-hunks.js');

// Build a throwaway repo whose file changes across TWO commits, so that
// `git show <sha1>` (the commit's own change) and `git diff <sha1>` (commit vs
// working tree) diverge — the exact condition that exposes the bare-sha bug.
function withTwoCommitRepo(fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'extract-hunks-'));
  const git = (...args) => execFileSync('git', args, { cwd: dir, encoding: 'utf-8' }).trim();
  const file = 'sample.js';
  try {
    git('init', '-q');
    git('config', 'user.email', 'test@example.com');
    git('config', 'user.name', 'Test');
    git('config', 'commit.gpgsign', 'false');

    fs.writeFileSync(path.join(dir, file), 'const x = "ALPHA";\n');
    git('add', file);
    git('commit', '-q', '-m', 'add sample with ALPHA');
    const sha1 = git('rev-parse', 'HEAD');

    fs.writeFileSync(path.join(dir, file), 'const x = "BETA";\n');
    git('add', file);
    git('commit', '-q', '-m', 'change ALPHA to BETA');
    const sha2 = git('rev-parse', 'HEAD');

    return fn({ dir, file, sha1, sha2 });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function runJson(cwd, ...args) {
  const out = execFileSync('node', [SCRIPT, '--json', ...args], { cwd, encoding: 'utf-8' });
  return JSON.parse(out);
}

test('bare sha resolves to that commit\'s own change, not commit-vs-worktree', () => {
  withTwoCommitRepo(({ dir, file, sha1 }) => {
    const result = runJson(dir, sha1, file);
    assert.strictEqual(result.status, 'ok');
    const after = result.hunks.flatMap(h => h.afterLines).join('\n');
    const before = result.hunks.flatMap(h => h.beforeLines).join('\n');
    // sha1 INTRODUCED the file with ALPHA (new file → no before-side lines).
    assert.ok(after.includes('ALPHA'), 'after-side should show the line sha1 added');
    assert.strictEqual(before, '', 'a new file in sha1 has no before-side');
    // The bug showed git diff <sha1> vs working tree (BETA) — must not leak in.
    assert.ok(!after.includes('BETA') && !before.includes('BETA'),
      'must not surface the later/worktree content (the bare-sha bug)');
  });
});

test('a sha range keeps the git diff path (commit-to-commit)', () => {
  withTwoCommitRepo(({ dir, file, sha1, sha2 }) => {
    const result = runJson(dir, `${sha1}..${sha2}`, file);
    assert.strictEqual(result.status, 'ok');
    const before = result.hunks.flatMap(h => h.beforeLines).join('\n');
    const after = result.hunks.flatMap(h => h.afterLines).join('\n');
    assert.ok(before.includes('ALPHA'), 'range before-side is sha1 content');
    assert.ok(after.includes('BETA'), 'range after-side is sha2 content');
  });
});

test('stdin diff takes precedence over any scope token', () => {
  withTwoCommitRepo(({ dir, file, sha1 }) => {
    const diff = [
      `diff --git a/${file} b/${file}`,
      'index 000..111 100644',
      `--- a/${file}`,
      `+++ b/${file}`,
      '@@ -1 +1 @@',
      '-const x = "OLD";',
      '+const x = "FROM_STDIN";',
      '',
    ].join('\n');
    const out = execFileSync('node', [SCRIPT, '--stdin', '--json', file], {
      cwd: dir, input: diff, encoding: 'utf-8',
    });
    const result = JSON.parse(out);
    const after = result.hunks.flatMap(h => h.afterLines).join('\n');
    assert.ok(after.includes('FROM_STDIN'), 'stdin content wins, git is never consulted');
  });
});
