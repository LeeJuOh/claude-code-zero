# e2e-test-runner

> Write browser tests in plain English. No selectors, no page objects — just describe what to do.

## Why

Traditional E2E testing requires selectors, page objects, and framework-specific APIs. Tests break when UI changes. Writing them takes longer than the feature they test.

This plugin uses Claude Code SDK and agent-browser to run tests defined as natural language steps in JSON. Claude reads the page, decides what to click and type, and validates outcomes — producing an interactive HTML report with video recording.

## Features

| Feature | Description |
|---------|-------------|
| Natural language steps | Define tests as JSON with plain English descriptions — no selectors needed |
| Video recording | Built-in `.webm` recording per test case |
| Visual regression | `--baseline` flag for pixel-diff screenshot comparison |
| Dev server detection | Auto-detects Next.js, Vite, Remix, Astro, CRA, Nuxt, SvelteKit, Angular |
| Multiple output formats | HTML report with video, Markdown summary, CTRF JSON for CI |

## Prerequisites

- **Node.js** 18+
- **agent-browser** (`npm install -g agent-browser && agent-browser install`)
- **Claude Code** (logged in)

## Install

```shell
/plugin install e2e-test-runner@claude-code-zero
```

## Usage

```
/e2e-test tests/login.test.json
/e2e-test tests/login.test.json --run "npm run dev" --screenshots
/e2e-test tests/login.test.json --baseline ./e2e-results/1234567890
```

Test file format:
```json
[
    {
        "id": "login-test",
        "description": "Verify login flow",
        "steps": [
            { "id": 1, "description": "Navigate to https://app.example.com/login" },
            { "id": 2, "description": "Enter email: user@example.com" },
            { "id": 3, "description": "Click login button" },
            { "id": 4, "description": "Verify dashboard loads with welcome message" }
        ]
    }
]
```

## License

MIT
