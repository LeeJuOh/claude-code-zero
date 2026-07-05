#!/usr/bin/env node
// Fills in CODEX_COMPANION_TRANSCRIPT_PATH when the Official Codex plugin's
// own SessionStart hook is disabled, so /codex-transfer works without
// --source even then. Rationale: docs/adr/0006-codex-advisor-conditional-transcript-hook.md
//
// Guard order (each a silent, fast exit — never add noise or block a session):
//   1. no CLAUDE_ENV_FILE -> nothing to persist into
//   2. env var already present -> Official plugin's hook got there first
//   3. no usable transcript_path on stdin -> nothing to write
//
// Env var name is hardcoded, not imported: plugins can't reach into another
// plugin's installed files. Source of truth: lib/claude-session-transfer.mjs:7
// in codex@openai-codex 1.0.5.
import fs from "node:fs";

const TRANSCRIPT_PATH_ENV = "CODEX_COMPANION_TRANSCRIPT_PATH";

function shellEscape(value) {
  return `'${String(value).replace(/'/g, `'"'"'`)}'`;
}

function main() {
  const envFile = process.env.CLAUDE_ENV_FILE;
  if (!envFile) {
    return;
  }

  let existing = "";
  try {
    existing = fs.readFileSync(envFile, "utf8");
  } catch {
    existing = "";
  }
  if (existing.includes(TRANSCRIPT_PATH_ENV)) {
    return;
  }

  const raw = fs.readFileSync(0, "utf8").trim();
  if (!raw) {
    return;
  }
  const input = JSON.parse(raw);
  const transcriptPath = input.transcript_path;
  if (!transcriptPath || !transcriptPath.endsWith(".jsonl")) {
    return;
  }

  fs.appendFileSync(envFile, `export ${TRANSCRIPT_PATH_ENV}=${shellEscape(transcriptPath)}\n`, "utf8");
}

try {
  main();
} catch {
  // Best-effort only — never fail the session over this.
}
