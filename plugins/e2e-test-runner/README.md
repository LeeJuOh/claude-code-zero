# E2E Test Runner

Run E2E browser tests using natural language test definitions. Powered by Claude Code SDK and agent-browser with built-in video recording.

## How It Works

1. Define tests as natural language steps in JSON
2. Run `/e2e-test your-tests.json`
3. Each test case gets its own Claude Code session + browser (via agent-browser)
4. Claude reads the page, decides what to click/type, and validates outcomes
5. Results are saved as Markdown + CTRF JSON + interactive HTML report with video

## Prerequisites

- Node.js 18+
- Claude Code (logged in)
- agent-browser (`npm install -g agent-browser && agent-browser install`)

## Quick Start

```bash
# In Claude Code
/e2e-test tests/login.test.json

# With dev server auto-start
/e2e-test tests/login.test.json --run "npm run dev" --screenshots

# Visual regression
/e2e-test tests/login.test.json --baseline ./e2e-results/1234567890
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

## Options

| Flag | Description | Default |
|------|-------------|---------|
| `-t, --testsPath` | Path to test JSON file | required |
| `-o, --resultsPath` | Output directory | `./e2e-results/<timestamp>` |
| `-v, --verbose` | Show all Claude messages | false |
| `-s, --screenshots` | Screenshot every step | false |
| `--maxTurns` | Max turns per test | 30 |
| `-m, --model` | Override Claude model | default |
| `--run` | Dev server start command | auto-detected |
| `--port` | Dev server port | auto-detected |
| `--url` | Override base URL | `http://localhost:<port>` |
| `--headed` | Show browser window | false (headless) |
| `--baseline` | Baseline results for visual diff | none |

## Architecture

- **agent-browser**: Token-efficient browser interaction (~200-400 tokens/snapshot vs ~3000-5000 with Playwright MCP)
- **File-based results**: Each test writes results to JSON files (no MCP state server needed)
- **Dev server detection**: Auto-detects Next.js, Vite, Remix, Astro, CRA, Nuxt, SvelteKit, Angular
- **Video recording**: Built-in `.webm` recording per test case
- **Visual regression**: `--baseline` flag for pixel-diff screenshots

## Output

Each test run produces:

- `test-summary.md` - Markdown report with pass/fail per step
- `ctrf-report.json` - CTRF format for CI integration
- `report.html` - Interactive HTML viewer with video playback and screenshots
- `<test-id>/recording.webm` - Video recording per test case
- `<test-id>/step-*.png` - Screenshots (on failure, or every step with `--screenshots`)
