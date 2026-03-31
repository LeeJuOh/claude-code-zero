# E2E Test Runner v2.0: ProofShot Pattern Integration

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign e2e-test-runner to use agent-browser (93% fewer tokens, built-in video), file-based state (no MCP server), dev server auto-detection, interactive HTML viewer, and visual regression diff.

**Architecture:** Replace Playwright MCP + MCP state server with agent-browser CLI. Runner manages browser lifecycle (open/record/close) around each Claude Code SDK session. Test plans are embedded in prompts; results written to JSON files. HTML viewer provides video playback with test timeline.

**Tech Stack:** agent-browser (peer dep, `agent-browser` on npm), @anthropic-ai/claude-code SDK, commander, zod, tsx

> **Path convention:** File paths in "Files to Create/Modify/Delete" and task headers are relative to the **plugin root** (`plugins/e2e-test-runner/`). Git commands use full **repo root** paths.

---

## File Structure

### Files to Delete
- `scripts/runner/src/mcp/test-state/server.ts`
- `scripts/runner/src/mcp/test-state/update-test-plan-tool-input.ts`

### Files to Create
- `scripts/runner/src/browser/agent-browser.ts` — agent-browser CLI wrapper (open, close, record, screenshot, diff)
- `scripts/runner/src/server/detect.ts` — Dev server framework detection from package.json
- `scripts/runner/src/artifacts/viewer.ts` — Standalone HTML viewer generator

### Files to Modify
- `scripts/runner/package.json` — Remove express, @modelcontextprotocol/sdk, @playwright/mcp, @types/express
- `scripts/runner/src/index.ts` — Remove MCPStateServer; add browser lifecycle, dev server, result file reading
- `scripts/runner/src/prompts/start-test.ts` — Remove MCP servers; use Bash-only session with plan in prompt
- `scripts/runner/src/prompts/system.ts` — Rewrite for agent-browser commands and file-based results
- `scripts/runner/src/utils/args.ts` — Add --run, --port, --url, --baseline, --headed flags
- `scripts/runner/src/utils/test-reporter.ts` — Add video/screenshot refs, HTML viewer output
- `skills/e2e-test/SKILL.md` — Update workflow, options, gotchas for new architecture
- `skills/e2e-test/references/test-schema.md` — Add baseUrl guidance for dev server detection
- `hooks/hooks.json` — Add agent-browser install check
- `README.md` — Update for new architecture (agent-browser, new CLI options, HTML viewer)

---

## Task 1: Slim Dependencies & Create agent-browser Wrapper

**Files:**
- Modify: `scripts/runner/package.json`
- Create: `scripts/runner/src/browser/agent-browser.ts`
- Delete: `scripts/runner/src/mcp/test-state/server.ts`
- Delete: `scripts/runner/src/mcp/test-state/update-test-plan-tool-input.ts`

- [ ] **Step 1: Update package.json**

Remove express, @modelcontextprotocol/sdk, @playwright/mcp, @types/express. Keep claude-code, commander, zod, tsx.

```json
{
  "name": "e2e-test-runner",
  "private": true,
  "type": "module",
  "dependencies": {
    "@anthropic-ai/claude-code": "^1.0.77",
    "@types/node": "^24.2.1",
    "commander": "^14.0.0",
    "tsx": "^4.19.0",
    "zod": "^4.0.17"
  }
}
```

- [ ] **Step 2: Create agent-browser wrapper**

Create `scripts/runner/src/browser/agent-browser.ts`:

```typescript
import { execFileSync } from "child_process";
import { logger } from "../utils/logger.ts";

class AgentBrowserError extends Error {
    constructor(command: string, cause: string) {
        super(`agent-browser ${command} failed: ${cause}`);
        this.name = "AgentBrowserError";
    }
}

function ab(args: string[], timeoutMs = 30_000): string {
    logger.debug(`agent-browser ${args.join(" ")}`);
    try {
        return execFileSync("agent-browser", args, {
            encoding: "utf-8",
            timeout: timeoutMs,
            stdio: ["pipe", "pipe", "pipe"],
        }).trim();
    } catch (error: any) {
        const msg = error.stderr?.toString().trim() || error.message;
        throw new AgentBrowserError(args.join(" "), msg);
    }
}

export function openBrowser(url: string, options?: { headed?: boolean }): string {
    const args = ["open", url];
    if (options?.headed) args.push("--headed");
    return ab(args, 60_000);
}

export function closeBrowser(): string {
    return ab(["close"]);
}

export function startRecording(outputPath: string): string {
    return ab(["record", "start", outputPath]);
}

export function stopRecording(): string {
    return ab(["record", "stop"], 60_000);
}

export function takeScreenshot(outputPath: string): string {
    return ab(["screenshot", outputPath]);
}

export function diffScreenshots(baseline: string, current: string, outputPath: string): string {
    return ab(["diff", "screenshot", baseline, current, outputPath]);
}

export function getConsoleErrors(): string {
    return ab(["errors"]);
}

export function getConsoleOutput(): string {
    return ab(["console"]);
}

export function isInstalled(): boolean {
    try {
        execFileSync("agent-browser", ["--version"], { encoding: "utf-8", stdio: "pipe" });
        return true;
    } catch {
        return false;
    }
}
```

- [ ] **Step 3: Delete MCP state server files**

```bash
rm -rf plugins/e2e-test-runner/scripts/runner/src/mcp
```

- [ ] **Step 4: Commit**

```bash
git add plugins/e2e-test-runner/scripts/runner/package.json \
  plugins/e2e-test-runner/scripts/runner/src/browser/agent-browser.ts
git rm -r plugins/e2e-test-runner/scripts/runner/src/mcp
git commit -m "refactor(e2e-test-runner): replace Playwright MCP deps with agent-browser wrapper"
```

---

## Task 2: Rewrite Test Session for agent-browser

**Files:**
- Modify: `scripts/runner/src/prompts/system.ts`
- Modify: `scripts/runner/src/prompts/start-test.ts`

- [ ] **Step 1: Rewrite system.ts**

Replace entire content of `scripts/runner/src/prompts/system.ts`:

```typescript
import type { TestCase } from "../types/test-case.ts";

interface SystemPromptOptions {
    screenshots: boolean;
    resultsPath: string;
    testId: string;
}

export const systemPrompt = (testCase: TestCase, options: SystemPromptOptions) =>
    `You are a software tester. Execute the test plan below using agent-browser commands in Bash.

## Test Plan

${JSON.stringify(testCase, null, 2)}

## agent-browser Commands

Use these Bash commands to interact with the browser (already open):

\`\`\`bash
agent-browser snapshot -i                      # See page with interactive element refs (@e1, @e2, ...)
agent-browser click @e<N>                       # Click element by ref
agent-browser fill @e<N> "text"                 # Fill input field
agent-browser press Enter                       # Press a key
agent-browser scroll down                       # Scroll down
agent-browser scroll up                         # Scroll up
agent-browser open <url>                        # Navigate to URL
agent-browser screenshot <path>.png             # Take screenshot
\`\`\`

## Execution Rules

1. Start by running \`agent-browser snapshot -i\` to see the current page state.
2. Execute each step in order. Use snapshots between actions to verify element refs.
3. After each step, determine pass or fail based on what you observe.
${
    options.screenshots
        ? "4. Take a screenshot after EVERY step: `agent-browser screenshot " +
          options.resultsPath +
          "/" +
          options.testId +
          "/step-<N>.png`"
        : "4. Take a screenshot when a step FAILS: `agent-browser screenshot " +
          options.resultsPath +
          "/" +
          options.testId +
          "/step-<N>-failed.png`"
}
5. Continue executing remaining steps even if one fails, unless the failure makes subsequent steps impossible.
6. Do NOT ask questions. Do NOT deviate from the plan.

## When Done

After executing ALL steps, write the results JSON to this exact path:

\`\`\`bash
cat > "${options.resultsPath}/${options.testId}/results.json" << 'RESULTS_EOF'
[
  {"id": 1, "status": "passed"},
  {"id": 2, "status": "failed", "error": "Description of what went wrong"}
]
RESULTS_EOF
\`\`\`

Each entry must have \`id\` (step number), \`status\` ("passed" or "failed"), and \`error\` (string, only for failed steps).
This file is critical — the test runner reads it to determine results.

## Security
- Do not share sensitive information (passwords, API keys, PII) in text output.
`;
```

- [ ] **Step 2: Rewrite start-test.ts**

Replace entire content of `scripts/runner/src/prompts/start-test.ts`:

```typescript
import { execFileSync } from "child_process";
import { systemPrompt } from "./system.ts";
import { query } from "@anthropic-ai/claude-code";
import type { TestCase } from "../types/test-case.ts";

interface StartTestOptions {
    maxTurns: number;
    model?: string;
    screenshots: boolean;
    resultsPath: string;
}

const claudePath = (() => {
    try {
        return execFileSync("which", ["claude"], { encoding: "utf8" }).trim();
    } catch {
        throw new Error("Claude not found on PATH. Make sure Claude Code is installed.");
    }
})();

export const startTest = (testCase: TestCase, options: StartTestOptions) => {
    return query({
        prompt: "Run `agent-browser snapshot -i` to see the current page, then execute the test plan.",
        options: {
            customSystemPrompt: systemPrompt(testCase, {
                screenshots: options.screenshots,
                resultsPath: options.resultsPath,
                testId: testCase.id,
            }),
            maxTurns: options.maxTurns,
            pathToClaudeCodeExecutable: claudePath,
            model: options.model,
            allowedTools: ["Bash", "Read", "Write"],
        },
    });
};
```

- [ ] **Step 3: Commit**

```bash
git add plugins/e2e-test-runner/scripts/runner/src/prompts/system.ts \
  plugins/e2e-test-runner/scripts/runner/src/prompts/start-test.ts
git commit -m "refactor(e2e-test-runner): rewrite session for agent-browser, remove MCP dependencies"
```

---

## Task 3: Add Dev Server Auto-Detection

**Files:**
- Create: `scripts/runner/src/server/detect.ts`
- Modify: `scripts/runner/src/utils/args.ts`

- [ ] **Step 1: Create detect.ts**

Create `scripts/runner/src/server/detect.ts`:

```typescript
import { execFileSync, spawn, type ChildProcess } from "child_process";
import { readFileSync, existsSync, createWriteStream } from "fs";
import { logger } from "../utils/logger.ts";

const FRAMEWORK_DETECTORS: Array<{
    name: string;
    detect: (pkg: any) => boolean;
    command: string;
    port: number;
}> = [
    { name: "Next.js", detect: (pkg) => !!(pkg.dependencies?.next || pkg.devDependencies?.next), command: "npm run dev", port: 3000 },
    { name: "Vite", detect: (pkg) => !!pkg.devDependencies?.vite, command: "npm run dev", port: 5173 },
    { name: "Remix", detect: (pkg) => !!pkg.dependencies?.["@remix-run/node"], command: "npm run dev", port: 3000 },
    { name: "Astro", detect: (pkg) => !!(pkg.dependencies?.astro || pkg.devDependencies?.astro), command: "npm run dev", port: 4321 },
    { name: "CRA", detect: (pkg) => !!pkg.dependencies?.["react-scripts"], command: "npm start", port: 3000 },
    { name: "Nuxt", detect: (pkg) => !!(pkg.dependencies?.nuxt || pkg.devDependencies?.nuxt), command: "npm run dev", port: 3000 },
    { name: "SvelteKit", detect: (pkg) => !!pkg.devDependencies?.["@sveltejs/kit"], command: "npm run dev", port: 5173 },
    { name: "Angular", detect: (pkg) => !!pkg.dependencies?.["@angular/core"], command: "npm start", port: 4200 },
];

export function detectFramework(): { name: string; command: string; port: number } | null {
    if (!existsSync("package.json")) return null;

    try {
        const pkg = JSON.parse(readFileSync("package.json", "utf-8"));
        for (const detector of FRAMEWORK_DETECTORS) {
            if (detector.detect(pkg)) {
                logger.info(`Detected framework: ${detector.name}`);
                return { name: detector.name, command: detector.command, port: detector.port };
            }
        }
        if (pkg.scripts?.dev) {
            return { name: "Unknown", command: "npm run dev", port: 3000 };
        }
    } catch {
        logger.debug("Failed to parse package.json for framework detection");
    }
    return null;
}

function isPortOpen(port: number): boolean {
    try {
        execFileSync("lsof", ["-i", `:${port}`, "-sTCP:LISTEN", "-t"], {
            encoding: "utf-8",
            stdio: "pipe",
        });
        return true;
    } catch {
        return false;
    }
}

export interface ServerHandle {
    process: ChildProcess | null;
    port: number;
    logPath: string | null;
}

export async function ensureDevServer(
    command: string,
    port: number,
    logPath?: string
): Promise<ServerHandle> {
    if (isPortOpen(port)) {
        logger.info(`Port ${port} already in use, skipping server start`);
        return { process: null, port, logPath: null };
    }

    const logStream = logPath ? createWriteStream(logPath, { flags: "a" }) : null;

    const proc = spawn("sh", ["-c", command], {
        cwd: process.cwd(),
        stdio: ["ignore", "pipe", "pipe"],
        detached: true,
    });

    if (logStream) {
        proc.stdout?.pipe(logStream);
        proc.stderr?.pipe(logStream);
    }

    proc.unref();

    const timeout = 60_000;
    const start = Date.now();
    while (Date.now() - start < timeout) {
        if (isPortOpen(port)) {
            return { process: proc, port, logPath: logPath || null };
        }
        await new Promise((r) => setTimeout(r, 1000));
    }

    throw new Error(`Dev server did not start within ${timeout / 1000}s on port ${port}`);
}

export function stopDevServer(handle: ServerHandle): void {
    if (handle.process?.pid) {
        try {
            process.kill(-handle.process.pid, "SIGTERM");
        } catch {
            logger.debug("Dev server process already stopped");
        }
    }
}
```

- [ ] **Step 2: Update args.ts with new CLI options**

Replace entire content of `scripts/runner/src/utils/args.ts`:

```typescript
import { readFileSync } from "fs";
import { testCaseSchema, type TestCase } from "../types/test-case.ts";
import z from "zod";
import { Command } from "commander";

interface CLIOptions {
    testsPath: string;
    resultsPath: string;
    verbose: boolean;
    maxTurns: number;
    screenshots: boolean;
    model?: string;
    run?: string;
    port?: number;
    url?: string;
    headed: boolean;
    baseline?: string;
}

const program = new Command()
    .requiredOption("-t, --testsPath <path>", "Path to the tests file")
    .option("-o, --resultsPath <path>", "Path to the results directory", `./e2e-results/${Date.now()}`)
    .option("-v, --verbose", "Verbose output, including all Claude Code messages.")
    .option("-s, --screenshots", "Take screenshots of the browser at each step.")
    .option("--maxTurns <turns>", "Maximum number of turns Claude Code can take for each test case.", "30")
    .option("-m, --model <model>", "The model to use for the test run.")
    .option("--run <command>", "Dev server start command (e.g. 'npm run dev'). Auto-detected if omitted.")
    .option("--port <port>", "Dev server port. If omitted, auto-detected from framework or defaults to 3000.")
    .option("--url <url>", "Override the URL to open instead of http://localhost:<port>.")
    .option("--headed", "Show the browser window (default: headless).")
    .option("--baseline <path>", "Path to baseline results for visual regression diff.")
    .parse(process.argv);

const args = program.opts<CLIOptions>();

const testCasesJson = readFileSync(args.testsPath, "utf8");
let testCases: TestCase[];
try {
    testCases = z.array(testCaseSchema).parse(JSON.parse(testCasesJson));
} catch (error) {
    console.error("Error parsing test cases from file.", error);
    process.exit(1);
}

const inputs: CLIOptions & { testCases: TestCase[] } = {
    ...args,
    maxTurns: Number(args.maxTurns),
    port: args.port ? Number(args.port) : undefined,
    testCases,
};

export { inputs };
```

- [ ] **Step 3: Commit**

```bash
git add plugins/e2e-test-runner/scripts/runner/src/server/detect.ts \
  plugins/e2e-test-runner/scripts/runner/src/utils/args.ts
git commit -m "feat(e2e-test-runner): add dev server auto-detection and new CLI options"
```

---

## Task 4: Rewrite Main Runner (index.ts)

**Files:**
- Modify: `scripts/runner/src/index.ts`

- [ ] **Step 1: Rewrite index.ts**

Replace entire content of `scripts/runner/src/index.ts`:

```typescript
import { mkdirSync, readFileSync, existsSync, readdirSync } from "fs";
import { inputs } from "./utils/args.ts";
import { startTest } from "./prompts/start-test.ts";
import { logger } from "./utils/logger.ts";
import { TestReporter } from "./utils/test-reporter.ts";
import {
    openBrowser,
    closeBrowser,
    startRecording,
    stopRecording,
    getConsoleErrors,
    diffScreenshots,
    isInstalled,
} from "./browser/agent-browser.ts";
import { detectFramework, ensureDevServer, stopDevServer, type ServerHandle } from "./server/detect.ts";
import z from "zod";

if (inputs.verbose) {
    logger.setLevel("debug");
}
logger.setLogFile(`${inputs.resultsPath}/debug.log`);

// Verify agent-browser is available
if (!isInstalled()) {
    logger.error(
        "agent-browser is not installed. Run: npm install -g agent-browser && agent-browser install"
    );
    process.exit(1);
}

// Start dev server: explicit --run, or auto-detect from package.json
let serverHandle: ServerHandle | null = null;
if (inputs.run) {
    logger.info(`Starting dev server: ${inputs.run}`);
    serverHandle = await ensureDevServer(
        inputs.run,
        inputs.port ?? 3000,
        `${inputs.resultsPath}/server.log`
    );
} else if (!inputs.url) {
    const detected = detectFramework();
    if (detected) {
        const port = inputs.port ?? detected.port;
        logger.info(`Auto-detected ${detected.name}, starting: ${detected.command} (port ${port})`);
        serverHandle = await ensureDevServer(
            detected.command,
            port,
            `${inputs.resultsPath}/server.log`
        );
    }
}
if (serverHandle) {
    logger.info(`Dev server ready on port ${serverHandle.port}`);
}

const reporter = new TestReporter();
const effectivePort = serverHandle?.port || inputs.port || 3000;

logger.info(`Detected ${inputs.testCases.length} test case(s).`);

const resultStepSchema = z.array(
    z.object({
        id: z.number(),
        status: z.enum(["passed", "failed"]),
        error: z.string().optional(),
    })
);

for (const testCase of inputs.testCases) {
    const startTime = new Date();
    const testDir = `${inputs.resultsPath}/${testCase.id}`;
    mkdirSync(testDir, { recursive: true });

    logger.info(`Starting test: ${testCase.id}`);

    // Determine the URL to open
    const baseUrl =
        inputs.url || testCase.baseUrl || `http://localhost:${effectivePort}`;

    // Open browser and start recording
    openBrowser(baseUrl, { headed: inputs.headed });
    const videoPath = `${testDir}/recording.webm`;
    let hasVideo = false;
    try {
        startRecording(videoPath);
        hasVideo = true;
    } catch (err) {
        logger.warn(`Recording failed to start: ${err}. Continuing without video.`);
    }

    // Run the Claude Code test session
    for await (const message of startTest(testCase, {
        maxTurns: inputs.maxTurns,
        model: inputs.model,
        screenshots: inputs.screenshots,
        resultsPath: inputs.resultsPath,
    })) {
        logger.debug("Claude Code message", {
            test_id: testCase.id,
            message: JSON.stringify(message),
        });
    }

    // Collect console errors
    let consoleErrors = "";
    try {
        consoleErrors = getConsoleErrors();
    } catch {
        logger.debug("Could not collect console errors");
    }

    // Stop recording and close browser
    if (hasVideo) {
        try {
            stopRecording();
        } catch {
            logger.debug("Recording was not active");
            hasVideo = false;
        }
    }
    try {
        closeBrowser();
    } catch {
        logger.debug("Browser was not open");
    }

    // Read results from file
    const resultsFile = `${testDir}/results.json`;
    let stepResults: z.infer<typeof resultStepSchema> = [];

    if (existsSync(resultsFile)) {
        try {
            const raw = JSON.parse(readFileSync(resultsFile, "utf-8"));
            stepResults = resultStepSchema.parse(raw);
        } catch (err) {
            logger.error(`Failed to parse results for ${testCase.id}: ${err}`);
        }
    } else {
        logger.warn(
            `No results file found for ${testCase.id}. Marking all steps as failed.`
        );
    }

    // Merge results into testCase
    for (const step of testCase.steps) {
        const result = stepResults.find((r) => r.id === step.id);
        if (result) {
            step.status = result.status;
            if (result.error) step.error = result.error;
        } else {
            step.status = "failed";
            step.error = "No result reported for this step";
        }
    }

    // Visual regression diff (if --baseline provided)
    if (inputs.baseline) {
        const baselineDir = `${inputs.baseline}/${testCase.id}`;
        if (existsSync(baselineDir)) {
            const currentScreenshots = existsSync(testDir)
                ? readdirSync(testDir).filter((f) => /^step-.*\.png$/.test(f))
                : [];

            for (const screenshot of currentScreenshots) {
                const baselinePath = `${baselineDir}/${screenshot}`;
                if (existsSync(baselinePath)) {
                    const diffPath = `${testDir}/diff-${screenshot}`;
                    try {
                        diffScreenshots(
                            baselinePath,
                            `${testDir}/${screenshot}`,
                            diffPath
                        );
                        logger.info(`Diff generated: ${diffPath}`);
                    } catch (err) {
                        logger.debug(`Diff failed for ${screenshot}: ${err}`);
                    }
                }
            }
        } else {
            logger.debug(
                `No baseline found for ${testCase.id}, skipping diff`
            );
        }
    }

    const endTime = new Date();
    reporter.addTestResult(testCase, startTime, endTime, {
        videoPath: hasVideo && existsSync(videoPath) ? videoPath : undefined,
        consoleErrors: consoleErrors || undefined,
    });

    const succeeded = testCase.steps.every((step) => step.status === "passed");
    logger.info(
        `Completed: ${testCase.id} - ${succeeded ? "PASSED" : "FAILED"}`
    );
}

reporter.saveResults(inputs.resultsPath);
logger.info(`Results saved to ${inputs.resultsPath}`);

// Stop dev server if we started it
if (serverHandle) {
    stopDevServer(serverHandle);
}
```

- [ ] **Step 2: Commit**

```bash
git add plugins/e2e-test-runner/scripts/runner/src/index.ts
git commit -m "refactor(e2e-test-runner): rewrite main runner with agent-browser lifecycle and file-based results"
```

---

## Task 5: Enhanced Test Reporter with Video & HTML Viewer

**Files:**
- Create: `scripts/runner/src/artifacts/viewer.ts`
- Modify: `scripts/runner/src/utils/test-reporter.ts`

- [ ] **Step 1: Create HTML viewer generator**

Create `scripts/runner/src/artifacts/viewer.ts`:

```typescript
import { readdirSync, existsSync } from "fs";
import { basename, join } from "path";

interface TestResultData {
    id: string;
    description: string;
    succeeded: boolean;
    durationSec: number;
    steps: Array<{
        id: number;
        description: string;
        status: string;
        error?: string;
    }>;
    videoPath?: string;
    screenshots: string[];
    consoleErrors?: string;
}

function escapeHtml(str: string): string {
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

export function generateViewer(results: TestResultData[]): string {
    const date = new Date().toISOString().replace("T", " ").slice(0, 19);
    const totalPassed = results.filter((r) => r.succeeded).length;
    const totalFailed = results.length - totalPassed;

    const testCardsHtml = results
        .map((test, i) => {
            const statusClass = test.succeeded ? "passed" : "failed";
            const statusIcon = test.succeeded ? "PASS" : "FAIL";

            const stepsHtml = test.steps
                .map((step) => {
                    const stepClass =
                        step.status === "passed"
                            ? "step-passed"
                            : step.status === "failed"
                              ? "step-failed"
                              : "step-pending";
                    return `<div class="step ${stepClass}">
                        <span class="step-id">#${step.id}</span>
                        <span class="step-desc">${escapeHtml(step.description)}</span>
                        <span class="step-status">${step.status.toUpperCase()}</span>
                        ${step.error ? `<div class="step-error">${escapeHtml(step.error)}</div>` : ""}
                    </div>`;
                })
                .join("\n");

            const videoHtml = test.videoPath
                ? `<div class="video-section">
                    <video src="./${test.id}/recording.webm" controls width="100%"></video>
                   </div>`
                : "";

            const screenshotsHtml =
                test.screenshots.length > 0
                    ? `<div class="screenshots-section">
                    <h4>Screenshots</h4>
                    <div class="screenshot-grid">
                        ${test.screenshots
                            .map(
                                (s) =>
                                    `<img src="./${test.id}/${basename(s)}" alt="${basename(s)}" loading="lazy" onclick="this.classList.toggle('expanded')">`
                            )
                            .join("\n")}
                    </div>
                   </div>`
                    : "";

            const consoleHtml = test.consoleErrors
                ? `<details class="console-section">
                    <summary>Console Errors</summary>
                    <pre>${escapeHtml(test.consoleErrors)}</pre>
                   </details>`
                : "";

            return `<div class="test-card ${statusClass}" id="test-${i}">
                <div class="test-header" onclick="this.parentElement.classList.toggle('collapsed')">
                    <span class="test-status">${statusIcon}</span>
                    <span class="test-id">${escapeHtml(test.id)}</span>
                    <span class="test-desc">${escapeHtml(test.description)}</span>
                    <span class="test-duration">${test.durationSec.toFixed(1)}s</span>
                </div>
                <div class="test-body">
                    ${videoHtml}
                    <div class="steps-section">${stepsHtml}</div>
                    ${screenshotsHtml}
                    ${consoleHtml}
                </div>
            </div>`;
        })
        .join("\n");

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>E2E Test Results</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace; background: #0d1117; color: #c9d1d9; padding: 24px; }
.header { margin-bottom: 24px; }
.header h1 { font-size: 24px; margin-bottom: 8px; }
.summary { display: flex; gap: 16px; margin-bottom: 24px; }
.summary-card { padding: 12px 20px; border-radius: 8px; background: #161b22; border: 1px solid #30363d; }
.summary-card.total { border-color: #58a6ff; }
.summary-card.pass { border-color: #3fb950; color: #3fb950; }
.summary-card.fail { border-color: #f85149; color: #f85149; }
.summary-card .num { font-size: 28px; font-weight: bold; }
.summary-card .label { font-size: 12px; opacity: 0.7; }
.test-card { background: #161b22; border: 1px solid #30363d; border-radius: 8px; margin-bottom: 12px; overflow: hidden; }
.test-card.passed { border-left: 4px solid #3fb950; }
.test-card.failed { border-left: 4px solid #f85149; }
.test-header { display: flex; align-items: center; gap: 12px; padding: 14px 16px; cursor: pointer; }
.test-header:hover { background: #1c2128; }
.test-status { font-weight: bold; font-size: 12px; padding: 2px 8px; border-radius: 4px; }
.passed .test-status { background: #0f2d16; color: #3fb950; }
.failed .test-status { background: #2d0f0f; color: #f85149; }
.test-id { font-weight: 600; }
.test-desc { flex: 1; opacity: 0.7; }
.test-duration { font-size: 13px; opacity: 0.5; }
.test-body { padding: 0 16px 16px; }
.collapsed .test-body { display: none; }
.step { display: flex; align-items: flex-start; gap: 8px; padding: 8px 12px; border-radius: 4px; margin: 4px 0; flex-wrap: wrap; }
.step-passed { background: #0f2d1633; }
.step-failed { background: #2d0f0f33; }
.step-pending { background: #30363d33; }
.step-id { font-weight: bold; min-width: 32px; }
.step-desc { flex: 1; }
.step-status { font-size: 11px; font-weight: bold; }
.step-error { width: 100%; margin-top: 4px; padding: 8px; background: #2d0f0f; border-radius: 4px; font-size: 13px; color: #f85149; }
.video-section { margin-bottom: 16px; }
.video-section video { border-radius: 8px; background: #000; }
.screenshots-section { margin-top: 12px; }
.screenshots-section h4 { margin-bottom: 8px; }
.screenshot-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 8px; }
.screenshot-grid img { width: 100%; border-radius: 4px; border: 1px solid #30363d; cursor: pointer; transition: transform 0.2s; }
.screenshot-grid img.expanded { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) scale(1); max-width: 95vw; max-height: 95vh; z-index: 100; border: 2px solid #58a6ff; }
.console-section { margin-top: 12px; }
.console-section summary { cursor: pointer; font-weight: 600; padding: 8px 0; }
.console-section pre { background: #0d1117; padding: 12px; border-radius: 4px; overflow-x: auto; font-size: 12px; max-height: 300px; overflow-y: auto; }
.meta { margin-top: 24px; font-size: 12px; opacity: 0.5; }
</style>
</head>
<body>
<div class="header">
    <h1>E2E Test Results</h1>
    <div class="meta">Generated: ${date}</div>
</div>
<div class="summary">
    <div class="summary-card total"><div class="num">${results.length}</div><div class="label">Total</div></div>
    <div class="summary-card pass"><div class="num">${totalPassed}</div><div class="label">Passed</div></div>
    <div class="summary-card fail"><div class="num">${totalFailed}</div><div class="label">Failed</div></div>
</div>
<div class="test-list">
${testCardsHtml}
</div>
</body>
</html>`;
}
```

- [ ] **Step 2: Update test-reporter.ts**

Replace entire content of `scripts/runner/src/utils/test-reporter.ts`:

```typescript
import { mkdirSync, writeFileSync, readdirSync, existsSync } from "fs";
import { join } from "path";
import type { TestCase } from "../types/test-case.ts";
import { generateViewer } from "../artifacts/viewer.ts";

interface TestResultMeta {
    videoPath?: string;
    consoleErrors?: string;
}

interface TestResult {
    testCase: TestCase;
    startTime: Date;
    endTime: Date;
    succeeded: boolean;
    meta: TestResultMeta;
}

export class TestReporter {
    private results: TestResult[] = [];

    addTestResult(
        testCase: TestCase,
        startTime: Date,
        endTime: Date,
        meta: TestResultMeta = {}
    ): void {
        const succeeded = testCase.steps.every(
            (step) => step.status === "passed"
        );
        this.results.push({ testCase, startTime, endTime, succeeded, meta });
    }

    generateCTRF() {
        const passed = this.results.filter((r) => r.succeeded).length;
        const failed = this.results.filter((r) => !r.succeeded).length;

        const tests = this.results.map((result) => ({
            name: result.testCase.description,
            status: result.succeeded ? "passed" : "failed",
            duration:
                result.endTime.getTime() - result.startTime.getTime(),
            start: result.startTime.getTime(),
            stop: result.endTime.getTime(),
            message:
                result.testCase.steps
                    .filter((s) => s.status !== "passed")
                    ?.map(
                        (s) =>
                            `[Step ${s.id}][Status: ${s.status}]${s.error ? `[Error: ${s.error}]` : ""}`
                    )
                    .join("\n") || undefined,
        }));

        return {
            reportFormat: "CTRF",
            specVersion: "0.0.0",
            results: {
                tool: { name: "e2e-test-runner", version: "2.0.0" },
                summary: {
                    tests: this.results.length,
                    passed,
                    failed,
                    pending: 0,
                    skipped: 0,
                    other: 0,
                    start:
                        this.results[0]?.startTime.getTime() || Date.now(),
                    stop:
                        this.results[this.results.length - 1]?.endTime.getTime() ||
                        Date.now(),
                },
                tests,
            },
        };
    }

    generateMarkdownSummary(): string {
        const passed = this.results.filter((r) => r.succeeded).length;
        const failed = this.results.length - passed;

        let md = "# E2E Test Results\n\n";
        md += `## Summary\n`;
        md += `- **Total**: ${this.results.length}\n`;
        md += `- **Passed**: ${passed}\n`;
        md += `- **Failed**: ${failed}\n\n`;
        md += `## Details\n\n`;

        for (const result of this.results) {
            const icon = result.succeeded ? "PASS" : "FAIL";
            const duration = (
                (result.endTime.getTime() - result.startTime.getTime()) /
                1000
            ).toFixed(1);

            md += `### ${icon} ${result.testCase.id}\n`;
            md += `**Duration**: ${duration}s | **Description**: ${result.testCase.description}\n`;
            if (result.meta.videoPath) {
                md += `**Video**: [recording.webm](./${result.testCase.id}/recording.webm)\n`;
            }
            md += "\n";

            md += `| Step | Description | Status |\n`;
            md += `|------|-------------|--------|\n`;

            for (const step of result.testCase.steps) {
                const stepIcon =
                    step.status === "passed"
                        ? "PASS"
                        : step.status === "failed"
                          ? "FAIL"
                          : "PENDING";
                md += `| ${step.id} | ${step.description} | ${stepIcon} |\n`;
                if (step.error) {
                    md += `| | Error: ${step.error} | |\n`;
                }
            }
            md += "\n";
        }

        return md;
    }

    saveResults(outputDir: string): void {
        mkdirSync(outputDir, { recursive: true });
        writeFileSync(
            `${outputDir}/ctrf-report.json`,
            JSON.stringify(this.generateCTRF(), null, 2)
        );
        writeFileSync(
            `${outputDir}/test-summary.md`,
            this.generateMarkdownSummary()
        );

        // Generate HTML viewer
        const viewerData = this.results.map((r) => {
            const testDir = join(outputDir, r.testCase.id);
            const screenshots = existsSync(testDir)
                ? readdirSync(testDir)
                      .filter((f) => /\.png$/.test(f))
                      .map((f) => join(testDir, f))
                : [];
            return {
                id: r.testCase.id,
                description: r.testCase.description,
                succeeded: r.succeeded,
                durationSec:
                    (r.endTime.getTime() - r.startTime.getTime()) / 1000,
                steps: r.testCase.steps.map((s) => ({
                    id: s.id,
                    description: s.description,
                    status: s.status || "pending",
                    error: s.error,
                })),
                videoPath: r.meta.videoPath,
                screenshots,
                consoleErrors: r.meta.consoleErrors,
            };
        });

        const html = generateViewer(viewerData);
        writeFileSync(`${outputDir}/report.html`, html);
    }
}
```

- [ ] **Step 3: Commit**

```bash
git add plugins/e2e-test-runner/scripts/runner/src/artifacts/viewer.ts \
  plugins/e2e-test-runner/scripts/runner/src/utils/test-reporter.ts
git commit -m "feat(e2e-test-runner): add interactive HTML viewer with video and screenshot support"
```

---

## Task 6: Update Plugin Files (SKILL.md, hooks, schema, README)

**Files:**
- Modify: `skills/e2e-test/SKILL.md`
- Modify: `hooks/hooks.json`
- Modify: `skills/e2e-test/references/test-schema.md`
- Modify: `README.md`

- [ ] **Step 1: Update hooks.json for agent-browser**

Replace entire content of `hooks/hooks.json`:

```json
{
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "diff -q \"${CLAUDE_PLUGIN_ROOT}/scripts/runner/package.json\" \"${CLAUDE_PLUGIN_DATA}/package.json\" >/dev/null 2>&1 || (cd \"${CLAUDE_PLUGIN_DATA}\" && cp \"${CLAUDE_PLUGIN_ROOT}/scripts/runner/package.json\" . && npm install --production 2>&1) || rm -f \"${CLAUDE_PLUGIN_DATA}/package.json\"",
            "timeout": 120000
          },
          {
            "type": "command",
            "command": "command -v agent-browser >/dev/null 2>&1 || echo '[e2e-test-runner] agent-browser not found. Install: npm install -g agent-browser && agent-browser install'",
            "timeout": 5000
          }
        ]
      }
    ]
  }
}
```

- [ ] **Step 2: Update SKILL.md**

Replace entire content of `skills/e2e-test/SKILL.md`:

```markdown
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
```

- [ ] **Step 3: Append dev server note to test-schema.md**

Add to the end of the existing `skills/e2e-test/references/test-schema.md`:

```markdown

## Dev Server Integration

If your test cases omit `baseUrl`, the runner uses `http://localhost:<port>` where port comes from:
1. `--port` CLI flag (explicit override)
2. Auto-detected port from framework detection (e.g., Vite → 5173, Next.js → 3000)
3. Fallback: 3000

For projects with a `package.json`, the runner auto-detects frameworks (Next.js, Vite, Remix, Astro, CRA, Nuxt, SvelteKit, Angular) and infers the correct port.
```

- [ ] **Step 4: Update README.md**

Update `README.md` in the plugin root to reflect the new architecture:
- Replace Playwright MCP references with agent-browser
- Update installation prerequisites (`agent-browser` instead of `@playwright/mcp`)
- Update CLI options table (add `--run`, `--port`, `--url`, `--headed`, `--baseline`)
- Update the architecture description (file-based results, no MCP state server)
- Mention HTML viewer and video recording capabilities

- [ ] **Step 5: Commit**

```bash
git add plugins/e2e-test-runner/skills/e2e-test/SKILL.md \
  plugins/e2e-test-runner/hooks/hooks.json \
  plugins/e2e-test-runner/skills/e2e-test/references/test-schema.md \
  plugins/e2e-test-runner/README.md
git commit -m "feat(e2e-test-runner): update skill, hooks, docs, and README for v2.0 agent-browser architecture"
```

---

## Task 7: Update Plugin Metadata & Validate

**Files:**
- Modify: `plugins/e2e-test-runner/.claude-plugin/plugin.json`
- Modify: `.claude-plugin/marketplace.json`

- [ ] **Step 1: Update plugin.json description**

Update description in `plugins/e2e-test-runner/.claude-plugin/plugin.json`:

```json
{
  "name": "e2e-test-runner",
  "description": "Run E2E browser tests using natural language test definitions powered by Claude Code SDK and agent-browser with video recording",
  "author": {
    "name": "LeeJuOh"
  },
  "repository": "https://github.com/leejuoh/claude-code-zero",
  "license": "MIT",
  "keywords": ["e2e", "testing", "agent-browser", "browser", "automation", "video"]
}
```

- [ ] **Step 2: Bump version in marketplace.json**

Update the e2e-test-runner entry version from `"0.1.0"` to `"0.2.0"` (minor: new features, architecture change).

- [ ] **Step 3: Validate plugin**

```bash
unset CLAUDECODE && claude plugin validate .
```

Expected: Validation passes with no errors.

- [ ] **Step 4: Commit**

```bash
git add plugins/e2e-test-runner/.claude-plugin/plugin.json \
  .claude-plugin/marketplace.json
git commit -m "chore(e2e-test-runner): bump to v0.2.0 with agent-browser architecture"
```

---

## Summary of Changes

| Before (v0.1.0) | After (v0.2.0) |
|---|---|
| Playwright MCP (~3000-5000 tokens/snapshot) | agent-browser (~200-400 tokens/snapshot) |
| MCP state server on port 3001 | File-based results (no port needed) |
| No video recording | Video recording per test case (.webm) |
| Markdown + CTRF output only | + Interactive HTML viewer with video |
| Manual dev server setup | Auto-detection + `--run` flag |
| No visual regression | `--baseline` flag for diff |
| 6 dependencies | 4 dependencies |
| ~20 allowed MCP tools per session | 3 allowed tools (Bash, Read, Write) |

## Dependencies Removed
- `@modelcontextprotocol/sdk`
- `@playwright/mcp`
- `express`
- `@types/express`

## New External Requirement
- `agent-browser` (global install: `npm install -g agent-browser && agent-browser install`)
