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
