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
