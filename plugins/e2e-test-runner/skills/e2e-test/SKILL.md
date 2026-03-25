---
name: e2e-test
description: "Run E2E browser tests from natural language JSON test files using Playwright. Use when asked to run e2e tests, browser tests, UI tests, end-to-end tests, or test a web application."
argument-hint: "[test-file.json or directory]"
disable-model-invocation: true
allowed-tools: Bash, Read, Write, Glob
---

# E2E Test Runner

Run browser E2E tests defined in natural language JSON files. Each test case gets its own Claude Code session and browser instance for full isolation.

## Quick Start

```bash
# Run a single test file
/e2e-test tests/login.test.json

# Run with options
/e2e-test tests/login.test.json --screenshots --verbose
```

## Workflow

1. Parse `$ARGUMENTS` to extract the test file path and any flags
2. Check that the runner dependencies are installed at `${CLAUDE_PLUGIN_DATA}/node_modules`. If not, run:
   ```bash
   cd "${CLAUDE_PLUGIN_DATA}" && cp "${CLAUDE_PLUGIN_ROOT}/scripts/runner/package.json" . && npm install --production 2>&1
   ```
3. Run the test runner:
   ```bash
   "${CLAUDE_PLUGIN_DATA}/node_modules/.bin/tsx" "${CLAUDE_PLUGIN_ROOT}/scripts/runner/src/index.ts" --testsPath <path> --resultsPath ./e2e-results [additional flags from $ARGUMENTS]
   ```
4. Read `./e2e-results/test-summary.md` and present the results to the user
5. If any tests failed, point out the screenshot and trace file locations

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

## Gotchas

- First run installs dependencies (~30s). Subsequent runs skip this.
- Each test case spawns a separate Claude Code session via the SDK, so **Claude login is required**.
- The runner starts a local MCP server on port 3001 for test state management. If that port is in use, the runner will fail.
- Playwright installs Chromium on first use. If missing, the runner will prompt to install it.
- Test results are saved to `./e2e-results/` by default. Each run creates a timestamped subdirectory.
