# E2E Test Runner

Run E2E browser tests using natural language test definitions. Powered by Claude Code SDK and Playwright MCP.

## How It Works

1. Define tests as natural language steps in JSON
2. Run `/e2e-test your-tests.json`
3. Each test case gets its own Claude Code session + browser
4. Claude reads the page, decides what to click/type, and validates outcomes
5. Results are saved as Markdown + CTRF JSON reports

## Quick Start

```bash
# In Claude Code
/e2e-test tests/login.test.json
```

## Writing Tests

Tests are JSON arrays of test cases with natural language steps:

```json
[
    {
        "id": "login-test",
        "description": "Verify login flow",
        "steps": [
            { "id": 1, "description": "Navigate to https://app.example.com/login" },
            { "id": 2, "description": "Enter email: user@example.com" },
            { "id": 3, "description": "Enter password: mypassword" },
            { "id": 4, "description": "Click login button" },
            { "id": 5, "description": "Verify dashboard loads with welcome message" }
        ]
    }
]
```

No selectors needed. Claude uses AI to find and interact with elements.

## CLI Usage

The runner can also be used directly from the terminal:

```bash
npx tsx /path/to/plugin/scripts/runner/src/index.ts \
  --testsPath ./tests.json \
  --resultsPath ./results \
  --verbose
```

## Options

| Flag | Description | Default |
|------|-------------|---------|
| `-t, --testsPath` | Path to test JSON file | required |
| `-o, --resultsPath` | Output directory | `./e2e-results/<timestamp>` |
| `-v, --verbose` | Show all Claude messages | false |
| `-s, --screenshots` | Screenshot every step | false |
| `--maxTurns` | Max turns per test | 30 |
| `-m, --model` | Override Claude model | default |

## Requirements

- Node.js 18+
- Claude Code (logged in)
- Chromium (installed automatically by Playwright on first run)

## Output

Each test run produces:

- `test-summary.md` - Markdown report with pass/fail per step
- `ctrf-report.json` - CTRF format for CI integration
- `<test-id>/playwright/` - Playwright traces for debugging
- Screenshots on test step failures
