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
