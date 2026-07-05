const assert = require('node:assert');
const { test } = require('node:test');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');

function withReportsDir(fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'list-reports-'));
  try { return fn(dir); }
  finally { fs.rmSync(dir, { recursive: true, force: true }); }
}

function runListReports(reportsDir) {
  const out = execFileSync('node', [path.join(__dirname, 'list-reports.js')], {
    env: { ...process.env, CLAUDE_PLUGIN_DATA: reportsDir },
  });
  return JSON.parse(out.toString());
}

test('report with an artifact sidecar surfaces artifact_url', () => {
  withReportsDir((base) => {
    const reportsDir = path.join(base, 'reports');
    fs.mkdirSync(reportsDir);
    const reportPath = path.join(reportsDir, '2026-07-06-example-doc-visual.html');
    fs.writeFileSync(reportPath, '<html></html>');
    fs.writeFileSync(`${reportPath}.artifact.json`, JSON.stringify({
      url: 'https://claude.ai/code/artifact/abc123',
      title: 'Example',
      favicon: '📄',
      published_at: '2026-07-06T00:00:00.000Z',
    }));

    const result = runListReports(base);
    assert.strictEqual(result.count, 1);
    assert.strictEqual(result.reports[0].artifact_url, 'https://claude.ai/code/artifact/abc123');
  });
});

test('report with no sidecar has no artifact_url field', () => {
  withReportsDir((base) => {
    const reportsDir = path.join(base, 'reports');
    fs.mkdirSync(reportsDir);
    fs.writeFileSync(path.join(reportsDir, '2026-07-06-example-doc-visual.html'), '<html></html>');

    const result = runListReports(base);
    assert.strictEqual(result.count, 1);
    assert.strictEqual('artifact_url' in result.reports[0], false);
  });
});

test('a plain markdown report is listed alongside html', () => {
  withReportsDir((base) => {
    const reportsDir = path.join(base, 'reports');
    fs.mkdirSync(reportsDir);
    fs.writeFileSync(path.join(reportsDir, '2026-07-06-example-doc-visual.md'), '# Report');
    fs.writeFileSync(path.join(reportsDir, '2026-07-06-example-doc-visual.html'), '<html></html>');

    const result = runListReports(base);
    assert.strictEqual(result.count, 2);
    const names = result.reports.map(r => r.filename).sort();
    assert.deepStrictEqual(names, [
      '2026-07-06-example-doc-visual.html',
      '2026-07-06-example-doc-visual.md',
    ]);
  });
});

test('a published .artifact.md surfaces artifact_url, its sidecar is not listed as a report', () => {
  withReportsDir((base) => {
    const reportsDir = path.join(base, 'reports');
    fs.mkdirSync(reportsDir);
    const reportPath = path.join(reportsDir, '2026-07-06-example-doc-visual.artifact.md');
    fs.writeFileSync(reportPath, '# Report');
    fs.writeFileSync(`${reportPath}.artifact.json`, JSON.stringify({
      url: 'https://claude.ai/code/artifact/md-456',
      title: 'Example md',
      favicon: '📄',
      published_at: '2026-07-06T00:00:00.000Z',
    }));

    const result = runListReports(base);
    assert.strictEqual(result.count, 1);
    assert.strictEqual(result.reports[0].filename, '2026-07-06-example-doc-visual.artifact.md');
    assert.strictEqual(result.reports[0].artifact_url, 'https://claude.ai/code/artifact/md-456');
  });
});

test('report with a malformed sidecar is ignored, not a crash', () => {
  withReportsDir((base) => {
    const reportsDir = path.join(base, 'reports');
    fs.mkdirSync(reportsDir);
    const reportPath = path.join(reportsDir, '2026-07-06-example-doc-visual.html');
    fs.writeFileSync(reportPath, '<html></html>');
    fs.writeFileSync(`${reportPath}.artifact.json`, '{ not valid json');

    const result = runListReports(base);
    assert.strictEqual(result.count, 1);
    assert.strictEqual('artifact_url' in result.reports[0], false);
  });
});
