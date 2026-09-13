#!/usr/bin/env node
// PreToolUse(Agent): replaces a Verifier's prompt with its script-written payload.
// The main session that launches the Verifier is the author of the code under
// review, so a single line it adds to the prompt would undo the fresh context;
// an instruction cannot stop that, this hook can. Rationale: docs/adr/0012 and
// spec 016 D3 "Verifier payload".
//
// Contract:
//   - subagent_type is not the Verifier -> no output, exit 0 (other agents untouched)
//   - Verifier + one group-<id>.json path in the prompt + sha256 matches the
//     sibling manifest.json -> allow, prompt = file content, `model` removed
//     (the author must not pick a weaker reviewer), other fields kept
//   - anything else -> deny with a reason and exit 2. Exit 1, unparseable JSON,
//     and schema failures are non-blocking in Claude Code, so every error path
//     ends in a block. A hook timeout or disableAllHooks is outside this guarantee.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const VERIFIER_TYPES = new Set(["codex-advisor:verifier"]);
const PAYLOAD_FORMAT = "codex-advisor-verifier-payload/1";
// Quoted form allows spaces in the path; bare form stops at whitespace and brackets.
const PAYLOAD_PATH_RE =
  /(["'`])([^"'`\n]*?group-(?:\d+|all)\.json)\1|([^\s"'`()<>\[\]]*group-(?:\d+|all)\.json)(?![\w-]|\.\w)/g;

class Deny extends Error {}

function block(reason) {
  const output = {
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: `codex-advisor verifier-payload: ${reason}`,
    },
  };
  // writeSync: pipe writes can be async on some platforms and lost on exit.
  fs.writeSync(2, `codex-advisor verifier-payload: ${reason}\n`);
  fs.writeSync(1, `${JSON.stringify(output)}\n`);
  process.exitCode = 2;
}

function findPayloadPath(prompt, cwd) {
  const found = new Set();
  for (const match of prompt.matchAll(PAYLOAD_PATH_RE)) {
    const raw = match[2] ?? match[3];
    found.add(path.resolve(cwd, raw));
  }
  if (found.size === 0) {
    throw new Deny("no-payload-path: the prompt must name a group-<id>.json payload written by prepare-verifier.py");
  }
  if (found.size > 1) {
    throw new Deny(`multiple-payload-paths: one Verifier call takes one payload (${[...found].join(", ")})`);
  }
  return [...found][0];
}

function readManifest(payloadPath) {
  const manifestPath = path.join(path.dirname(payloadPath), "manifest.json");
  let raw;
  try {
    raw = fs.readFileSync(manifestPath, "utf8");
  } catch (error) {
    throw new Deny(`manifest-unreadable: ${manifestPath} (${error.code ?? error.message})`);
  }
  let manifest;
  try {
    manifest = JSON.parse(raw);
  } catch {
    throw new Deny(`manifest-malformed: ${manifestPath} is not valid JSON`);
  }
  const payloads = manifest?.payloads;
  const validPayloads =
    payloads !== null &&
    typeof payloads === "object" &&
    !Array.isArray(payloads) &&
    Object.values(payloads).every((hash) => typeof hash === "string" && /^[0-9a-f]{64}$/.test(hash));
  if (manifest?.format !== PAYLOAD_FORMAT || !validPayloads) {
    throw new Deny(`manifest-schema: ${manifestPath} does not match ${PAYLOAD_FORMAT}`);
  }
  return payloads;
}

function readPayload(payloadPath) {
  let bytes;
  try {
    bytes = fs.readFileSync(payloadPath);
  } catch (error) {
    if (error.code === "ENOENT") {
      throw new Deny(`payload-missing: ${payloadPath}`);
    }
    throw new Deny(`payload-unreadable: ${payloadPath} (${error.code ?? error.message})`);
  }
  const expected = readManifest(payloadPath)[path.basename(payloadPath)];
  if (expected === undefined) {
    throw new Deny(`payload-not-in-manifest: ${path.basename(payloadPath)}`);
  }
  const actual = crypto.createHash("sha256").update(bytes).digest("hex");
  if (actual !== expected) {
    throw new Deny(`hash-mismatch: ${payloadPath} changed after prepare-verifier.py wrote it`);
  }
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new Deny(`payload-not-utf8: ${payloadPath}`);
  }
}

function main() {
  let input;
  try {
    input = JSON.parse(fs.readFileSync(0, "utf8"));
  } catch {
    throw new Deny("stdin-malformed: hook input is not valid JSON");
  }
  const toolInput = input?.tool_input;
  if (toolInput === null || typeof toolInput !== "object" || Array.isArray(toolInput)) {
    throw new Deny("stdin-malformed: tool_input is not an object");
  }
  if (!VERIFIER_TYPES.has(toolInput.subagent_type)) {
    return;
  }
  if (typeof toolInput.prompt !== "string") {
    throw new Deny("no-payload-path: prompt is not a string");
  }

  const cwd = typeof input.cwd === "string" && input.cwd ? input.cwd : process.cwd();
  const payloadPath = findPayloadPath(toolInput.prompt, cwd);
  const content = readPayload(payloadPath);

  const { model: _dropped, ...kept } = toolInput;
  const output = {
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "allow",
      permissionDecisionReason: `codex-advisor: Verifier prompt replaced with ${payloadPath}`,
      updatedInput: { ...kept, prompt: content },
    },
  };
  fs.writeSync(1, `${JSON.stringify(output)}\n`);
}

try {
  main();
} catch (error) {
  block(error instanceof Deny ? error.message : `unexpected-error: ${error?.stack ?? error}`);
}
