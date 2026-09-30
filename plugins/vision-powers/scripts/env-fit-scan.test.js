const assert = require('node:assert');
const { test } = require('node:test');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');

// A fake HOME, project folder, and PATH, so the scan sees only what the test writes.
function withSandbox(fn) {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'env-fit-scan-')));
  const home = path.join(root, 'home');
  const project = path.join(root, 'project');
  const bin = path.join(root, 'bin');
  for (const dir of [home, project, bin, path.join(home, '.claude')]) fs.mkdirSync(dir, { recursive: true });
  try { return fn({ home, project, bin }); }
  finally { fs.rmSync(root, { recursive: true, force: true }); }
}

function runScan({ home, project, bin }, args, extraEnv = {}) {
  const out = execFileSync(process.execPath, [path.join(__dirname, 'env-fit-scan.js'), '--plugin-name', 'target', ...args], {
    cwd: project,
    env: { HOME: home, PATH: bin, ...extraEnv },
  });
  return JSON.parse(out.toString());
}

function writeJson(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data));
}

test('exits 2 without --plugin-name', () => {
  assert.throws(
    () => execFileSync('node', [path.join(__dirname, 'env-fit-scan.js')], { stdio: 'pipe' }),
    (err) => err.status === 2,
  );
});

test('no --requirement gives an empty requirements list', () => {
  withSandbox((box) => {
    assert.deepStrictEqual(runScan(box, []).requirements, []);
  });
});

test('CLI requirement is AVAILABLE only when an executable is on PATH', () => {
  withSandbox((box) => {
    const tool = path.join(box.bin, 'mytool');
    fs.writeFileSync(tool, '#!/bin/sh\n');
    fs.chmodSync(tool, 0o755);
    fs.writeFileSync(path.join(box.bin, 'notexec'), '');
    const result = runScan(box, ['--requirement', 'CLI:mytool', '--requirement', 'CLI:notexec', '--requirement', 'CLI:absent']);
    assert.deepStrictEqual(result.requirements.map((r) => r.status), ['AVAILABLE', 'MISSING', 'MISSING']);
  });
});

test('MCP requirement reads ~/.claude.json user and local scope and project .mcp.json', () => {
  withSandbox((box) => {
    writeJson(path.join(box.home, '.claude.json'), {
      mcpServers: { userserver: {} },
      projects: { [box.project]: { mcpServers: { localserver: {} } }, '/other/project': { mcpServers: { otherserver: {} } } },
    });
    writeJson(path.join(box.project, '.mcp.json'), { mcpServers: { projectserver: {} } });
    // The old, unofficial location must not count.
    writeJson(path.join(box.home, '.claude', '.mcp.json'), { mcpServers: { legacyserver: {} } });
    writeJson(path.join(box.home, '.claude', 'settings.json'), { mcpServers: { settingsserver: {} } });

    const names = ['userserver', 'localserver', 'projectserver', 'otherserver', 'legacyserver', 'settingsserver'];
    const result = runScan(box, names.flatMap((n) => ['--requirement', `MCP:${n}`]));
    assert.deepStrictEqual(
      result.requirements.map((r) => `${r.name}=${r.status}`),
      ['userserver=AVAILABLE', 'localserver=AVAILABLE', 'projectserver=AVAILABLE',
        'otherserver=MISSING', 'legacyserver=MISSING', 'settingsserver=MISSING'],
    );
    assert.strictEqual(result.context_metrics.mcp_servers, 3);
  });
});

test('MCP requirement counts servers from enabled plugins only', () => {
  withSandbox((box) => {
    const cache = path.join(box.home, '.claude', 'plugins', 'cache', 'mkt');
    const onPath = path.join(cache, 'on-plugin', '1.0.0');
    const offPath = path.join(cache, 'off-plugin', '1.0.0');
    writeJson(path.join(onPath, '.mcp.json'), { mcpServers: { fromplugin: {} } });
    writeJson(path.join(onPath, '.claude-plugin', 'plugin.json'), { name: 'on-plugin', mcpServers: { inlineserver: {} } });
    writeJson(path.join(offPath, '.mcp.json'), { mcpServers: { fromdisabled: {} } });
    writeJson(path.join(box.home, '.claude', 'plugins', 'installed_plugins.json'), {
      plugins: { 'on-plugin@mkt': [{ installPath: onPath }], 'off-plugin@mkt': [{ installPath: offPath }] },
    });
    writeJson(path.join(box.home, '.claude', 'settings.json'), {
      enabledPlugins: { 'on-plugin@mkt': true, 'off-plugin@mkt': false },
    });

    const result = runScan(box, ['--requirement', 'MCP:fromplugin', '--requirement', 'MCP:inlineserver', '--requirement', 'MCP:fromdisabled']);
    assert.deepStrictEqual(result.requirements.map((r) => r.status), ['AVAILABLE', 'AVAILABLE', 'MISSING']);
  });
});

test('ENV, Plugin, and unknown-type requirements', () => {
  withSandbox((box) => {
    writeJson(path.join(box.home, '.claude', 'settings.json'), {
      enabledPlugins: { 'helper@mkt': true, 'off@mkt': false },
    });
    const result = runScan(box, [
      '--requirement', 'ENV:MY_TOKEN', '--requirement', 'ENV:NOT_SET',
      '--requirement', 'Plugin:helper', '--requirement', 'Plugin:off', '--requirement', 'Plugin:absent',
      '--requirement', 'Other:x',
    ], { MY_TOKEN: 'secret' });
    assert.deepStrictEqual(
      result.requirements.map((r) => r.status),
      ['SET', 'UNSET', 'AVAILABLE', 'MISSING', 'MISSING', 'UNKNOWN_TYPE'],
    );
    // The value of an ENV requirement never appears in the output.
    assert.ok(!JSON.stringify(result).includes('secret'));
  });
});
