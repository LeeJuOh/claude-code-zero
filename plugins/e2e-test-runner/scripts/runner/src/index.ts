import { MCPStateServer } from "./mcp/test-state/server.ts";
import { inputs } from "./utils/args.ts";
import { startTest } from "./prompts/start-test.ts";
import { logger } from "./utils/logger.ts";
import { TestReporter } from "./utils/test-reporter.ts";

if (inputs.verbose) {
    logger.setLevel("debug");
}
logger.setLogFile(`${inputs.resultsPath}/debug.log`);

const server = new MCPStateServer(3001);
await server.start();

const reporter = new TestReporter();

logger.info(`Detected ${inputs.testCases.length} test case(s).`);

for (const testCase of inputs.testCases) {
    const startTime = new Date();
    logger.info(`Starting test: ${testCase.id}`);
    server.setTestState(testCase);

    for await (const message of startTest(testCase)) {
        logger.debug("Claude Code message", {
            test_id: testCase.id,
            message: JSON.stringify(message),
        });
    }

    const testState = server.getState();
    if (!testState) {
        logger.error(`Test state not found for '${testCase.id}'`);
        throw new Error(`Test state not found for '${testCase.id}'`);
    }

    const endTime = new Date();
    reporter.addTestResult(testState, startTime, endTime);

    const succeeded = testState.steps.every((step) => step.status === "passed");
    logger.info(`Completed: ${testCase.id} - ${succeeded ? "PASSED" : "FAILED"}`);
}

reporter.saveResults(inputs.resultsPath);
logger.info(`Results saved to ${inputs.resultsPath}`);

await server.stop();
