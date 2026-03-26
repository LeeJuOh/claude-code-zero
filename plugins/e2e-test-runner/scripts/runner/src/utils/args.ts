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
