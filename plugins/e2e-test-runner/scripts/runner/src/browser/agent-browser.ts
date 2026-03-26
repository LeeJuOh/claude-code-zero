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
