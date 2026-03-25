import { execFileSync } from "child_process";
import { systemPrompt } from "./system.ts";
import { query } from "@anthropic-ai/claude-code";
import { inputs } from "../utils/args.ts";
import type { TestCase } from "../types/test-case.ts";

const claudePath = (() => {
    try {
        return execFileSync("which", ["claude"], { encoding: "utf8" }).trim();
    } catch {
        throw new Error("Claude not found on PATH. Make sure Claude Code is installed.");
    }
})();

export const startTest = (testCase: TestCase) => {
    return query({
        prompt: "Query the test plan from mcp__e2e-state__get_test_plan MCP tool to get started.",
        options: {
            customSystemPrompt: systemPrompt(),
            maxTurns: inputs.maxTurns,
            pathToClaudeCodeExecutable: claudePath,
            model: inputs.model,
            mcpServers: {
                "e2e-playwright": {
                    command: "npx",
                    args: [
                        "@playwright/mcp@0.0.31",
                        "--output-dir",
                        `${inputs.resultsPath}/${testCase.id}/playwright`,
                        "--save-trace",
                        "--image-responses",
                        "omit",
                    ],
                },
                "e2e-state": {
                    type: "http" as const,
                    url: "http://localhost:3001/",
                    headers: {
                        "Content-Type": "application/json",
                    },
                },
            },
            allowedTools: [
                "mcp__e2e-playwright__browser_close",
                "mcp__e2e-playwright__browser_resize",
                "mcp__e2e-playwright__browser_console_messages",
                "mcp__e2e-playwright__browser_handle_dialog",
                "mcp__e2e-playwright__browser_evaluate",
                "mcp__e2e-playwright__browser_file_upload",
                "mcp__e2e-playwright__browser_install",
                "mcp__e2e-playwright__browser_press_key",
                "mcp__e2e-playwright__browser_type",
                "mcp__e2e-playwright__browser_navigate",
                "mcp__e2e-playwright__browser_navigate_back",
                "mcp__e2e-playwright__browser_navigate_forward",
                "mcp__e2e-playwright__browser_network_requests",
                "mcp__e2e-playwright__browser_snapshot",
                "mcp__e2e-playwright__browser_click",
                "mcp__e2e-playwright__browser_drag",
                "mcp__e2e-playwright__browser_hover",
                "mcp__e2e-playwright__browser_select_option",
                "mcp__e2e-playwright__browser_tab_list",
                "mcp__e2e-playwright__browser_tab_new",
                "mcp__e2e-playwright__browser_tab_select",
                "mcp__e2e-playwright__browser_tab_close",
                "mcp__e2e-playwright__browser_take_screenshot",
                "mcp__e2e-playwright__browser_wait_for",
                "mcp__e2e-state__get_test_plan",
                "mcp__e2e-state__update_test_step",
            ],
        },
    });
};
