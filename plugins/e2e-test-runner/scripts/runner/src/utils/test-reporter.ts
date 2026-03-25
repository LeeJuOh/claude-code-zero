import { mkdirSync, writeFileSync } from "fs";
import type { TestCase } from "../types/test-case.ts";

interface TestResult {
    testCase: TestCase;
    startTime: Date;
    endTime: Date;
    succeeded: boolean;
}

export class TestReporter {
    private results: TestResult[] = [];

    addTestResult(testCase: TestCase, startTime: Date, endTime: Date): void {
        const succeeded = testCase.steps.every((step) => step.status === "passed");
        this.results.push({ testCase, startTime, endTime, succeeded });
    }

    generateCTRF() {
        const passed = this.results.filter((r) => r.succeeded).length;
        const failed = this.results.filter((r) => !r.succeeded).length;

        const tests = this.results.map((result) => ({
            name: result.testCase.description,
            status: result.succeeded ? "passed" : "failed",
            duration: result.endTime.getTime() - result.startTime.getTime(),
            start: result.startTime.getTime(),
            stop: result.endTime.getTime(),
            message:
                result.testCase.steps
                    .filter((s) => s.status !== "passed")
                    ?.map((s) => `[Step ${s.id}][Status: ${s.status}]${s.error ? `[Error: ${s.error}]` : ""}`)
                    .join("\n") || undefined,
        }));

        return {
            reportFormat: "CTRF",
            specVersion: "0.0.0",
            results: {
                tool: { name: "e2e-test-runner", version: "1.0.0" },
                summary: {
                    tests: this.results.length,
                    passed,
                    failed,
                    pending: 0,
                    skipped: 0,
                    other: 0,
                    start: this.results[0]?.startTime.getTime() || Date.now(),
                    stop: this.results[this.results.length - 1]?.endTime.getTime() || Date.now(),
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
            const duration = ((result.endTime.getTime() - result.startTime.getTime()) / 1000).toFixed(1);

            md += `### ${icon} ${result.testCase.id}\n`;
            md += `**Duration**: ${duration}s | **Description**: ${result.testCase.description}\n\n`;

            md += `| Step | Description | Status |\n`;
            md += `|------|-------------|--------|\n`;

            for (const step of result.testCase.steps) {
                const stepIcon = step.status === "passed" ? "PASS" : step.status === "failed" ? "FAIL" : "PENDING";
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
        writeFileSync(`${outputDir}/ctrf-report.json`, JSON.stringify(this.generateCTRF(), null, 2));
        writeFileSync(`${outputDir}/test-summary.md`, this.generateMarkdownSummary());
    }
}
