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
