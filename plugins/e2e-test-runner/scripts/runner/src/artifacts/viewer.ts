import { basename } from "path";

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
