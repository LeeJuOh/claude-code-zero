import { appendFileSync, mkdirSync } from "fs";
import { dirname } from "path";

const LOG_LEVELS = { debug: 0, info: 1, warn: 2, error: 3 } as const;
type LogLevel = keyof typeof LOG_LEVELS;

let currentLevel: LogLevel = "info";
let logFilePath: string | null = null;

function setLevel(level: LogLevel) {
    currentLevel = level;
}

function setLogFile(path: string) {
    logFilePath = path;
    mkdirSync(dirname(path), { recursive: true });
}

function log(level: LogLevel, message: string, meta?: Record<string, unknown>) {
    if (LOG_LEVELS[level] < LOG_LEVELS[currentLevel]) return;

    const timestamp = new Date().toISOString();
    const metaStr = meta ? ` ${JSON.stringify(meta)}` : "";
    const line = `[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}`;

    if (level === "error") {
        console.error(line);
    } else {
        console.log(line);
    }

    if (logFilePath) {
        appendFileSync(logFilePath, line + "\n");
    }
}

export const logger = {
    debug: (msg: string, meta?: Record<string, unknown>) => log("debug", msg, meta),
    info: (msg: string, meta?: Record<string, unknown>) => log("info", msg, meta),
    warn: (msg: string, meta?: Record<string, unknown>) => log("warn", msg, meta),
    error: (msg: string, meta?: Record<string, unknown>) => log("error", msg, meta),
    setLevel,
    setLogFile,
};
