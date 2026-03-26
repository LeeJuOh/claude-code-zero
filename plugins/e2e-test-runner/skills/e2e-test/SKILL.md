---
name: e2e-test
description: "Run E2E browser tests from natural language JSON test files using agent-browser. Use when asked to run e2e tests, browser tests, UI tests, end-to-end tests, or test a web application."
argument-hint: "[test-file.json] [--run 'npm run dev'] [--screenshots] [--baseline ./prev-results]"
disable-model-invocation: true
allowed-tools: Bash, Read, Write, Glob
---

# E2E Test Runner

Run browser E2E tests defined in natural language JSON files. Each test case gets its own Claude Code session and browser instance for full isolation. Uses agent-browser for token-efficient interaction with built-in video recording.

## Quick Start

```bash
# Run tests (dev server already running)
/e2e-test tests/login.test.json

# Auto-start dev server, take screenshots
/e2e-test tests/login.test.json --run "npm run dev" --port 3000 --screenshots

# Visual regression against baseline
/e2e-test tests/login.test.json --baseline ./e2e-results/1234567890
```

## Workflow

1. Parse `$ARGUMENTS` to extract the test file path and any flags
2. Check that the runner dependencies are installed at `${CLAUDE_PLUGIN_DATA}/node_modules`. If not, run:
   ```bash
   cd "${CLAUDE_PLUGIN_DATA}" && cp "${CLAUDE_PLUGIN_ROOT}/scripts/runner/package.json" . && npm install --production 2>&1
   ```
3. Verify agent-browser is installed:
   ```bash
   command -v agent-browser >/dev/null 2>&1 || { echo "agent-browser not found. Install: npm install -g agent-browser && agent-browser install"; exit 1; }
   ```
4. Run the test runner:
   ```bash
   "${CLAUDE_PLUGIN_DATA}/node_modules/.bin/tsx" "${CLAUDE_PLUGIN_ROOT}/scripts/runner/src/index.ts" --testsPath <path> --resultsPath ./e2e-results [additional flags from $ARGUMENTS]
   ```
5. Read `./e2e-results/test-summary.md` and present the results to the user
6. If `./e2e-results/report.html` exists, mention it for detailed interactive viewing
7. If any tests failed, point out screenshot and video locations

## Test File Format

For how to write test files, see [references/test-schema.md](references/test-schema.md).

## CLI Options

| Flag | Description |
|------|-------------|
| `--testsPath, -t` | Path to the JSON test file (required) |
| `--resultsPath, -o` | Output directory for results (default: `./e2e-results/<timestamp>`) |
| `--verbose, -v` | Include all Claude Code messages in output |
| `--screenshots, -s` | Take screenshots at every step (not just failures) |
| `--maxTurns` | Max Claude Code interactions per test (default: 30) |
| `--model, -m` | Override the Claude model |
| `--run <command>` | Dev server start command (e.g. `npm run dev`) |
| `--port <port>` | Dev server port (auto-detected from framework, fallback: 3000) |
| `--url <url>` | Override the URL to open (instead of http://localhost:port) |
| `--headed` | Show the browser window (default: headless) |
| `--baseline <path>` | Baseline results directory for visual regression diff |

## Gotchas

- **agent-browser required**: Install globally: `npm install -g agent-browser && agent-browser install`. Without it, the runner exits immediately.
- First run installs runner dependencies (~30s). Subsequent runs skip this.
- Each test case spawns a separate Claude Code session via the SDK, so **Claude login is required**.
- Video recordings are saved as `.webm` files per test case. They play natively in browsers.
- If `--run` is omitted and `--url` is not set, the runner auto-detects the framework from `package.json` and starts the appropriate dev server. Use `--run` to override.
- The dev server is killed when tests complete. If the port is already in use, the existing server is used instead.
- Test results are saved to `./e2e-results/` by default. Each run creates a timestamped subdirectory.
- The interactive HTML report (`report.html`) includes embedded video playback and expandable test details.
- For visual regression (`--baseline`), screenshots are compared pixel-by-pixel. Diff images are saved as `diff-step-*.png`.
