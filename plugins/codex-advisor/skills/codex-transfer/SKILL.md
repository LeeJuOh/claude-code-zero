---
name: codex-transfer
description: "Hand off the current Claude Code session to Codex as a resumable thread, then continue outside Claude."
disable-model-invocation: true
argument-hint: "[--source PATH] [--json]"
allowed-tools: ["Bash(${CLAUDE_PLUGIN_ROOT}/scripts/*)", "AskUserQuestion"]
---

# Codex Session Transfer

One-way handoff. Unlike every other codex-advisor skill, there is **no
double-check phase** — once the transfer completes, work continues in
Codex outside Claude Code, so there is nothing left here to classify.
The wrapper's job is whitelisting, error taxonomy, and disable-parity —
not verification.

## Phase 1: Analyze

**Whitelist for this skill:** `--source <path>`, `--json`. Nothing else
— transfer has no prompt, so there is no focus text or model/effort to
route.

- `--source <path>` — explicit Claude session `.jsonl` to import. Optional; when omitted the companion falls back to the `CODEX_COMPANION_TRANSCRIPT_PATH` env var, which codex-advisor's own SessionStart hook (`hooks/session-start.mjs`) sets automatically — whether or not the Official plugin itself is enabled.
- `--json` — when the user passes this, show them the raw JSON payload in Phase 3 instead of the friendly summary: add `--show-json` to the script call. This is independent of the `--json` the script always passes to the companion, which is for our own parsing.
- **Unrecognized token** (any other flag, or free-standing text) → `AskUserQuestion`. Transfer has no positional argument — the companion silently discards anything it doesn't recognize as `--source`/`--cwd`/`--json` (`handleTransfer` destructures only `options`, never `positionals`), so passing it through would do nothing rather than corrupt a prompt. Still don't forward it: ask what the user meant. If it looks like a task description, suggest `/codex-rescue` instead — transfer moves the whole session, it doesn't run a task.

## Phase 2: Invoke

Single synchronous call — no `--wait`/`--background`, no Pattern A/B.
The companion's own import timeout is 2 minutes
(`EXTERNAL_AGENT_IMPORT_TIMEOUT_MS` in `lib/codex.mjs`), so give the
Bash tool call itself a `timeout` comfortably above that (e.g.
`150000`) — a shorter tool-side timeout could kill the process right at
the companion's own deadline and mask its real error message.

```bash
"${CLAUDE_PLUGIN_ROOT}/scripts/codex-job.sh" transfer
```

Add `--source "<literal path from Phase 1>"` if the user supplied one, as
its own quoted argument — never interpolated into a larger string — and
`--show-json` if they passed `--json`. The script prints `THREAD_ID=` and
`RESUME_COMMAND=` from the companion's JSON (then the raw payload with
`--show-json`), or `transfer failed:` and the companion's stderr.

## Phase 3: Report

- User did **not** pass `--json`: show a short summary. Reproduce
  `resumeCommand` **verbatim, in its own code span** — never paraphrase
  or reconstruct the `codex resume <id>` string by hand from the
  thread ID:

  ```markdown
  Session transferred to Codex.

  Codex session ID: <THREAD_ID>
  Resume it with: `codex resume <THREAD_ID>`

  This Claude Code session is done — the conversation continues in Codex from here.
  ```

- User passed `--json`: show the raw payload the script printed instead.

## Errors

Full table: `${CLAUDE_PLUGIN_ROOT}/references/companion-usage.md §6`. Highlights:

- **`Could not identify the current Claude transcript...`** — no env, no `--source`. This codex-advisor's own SessionStart hook (`hooks/session-start.mjs`) sets `CODEX_COMPANION_TRANSCRIPT_PATH` automatically in normal environments regardless of whether the Official plugin is enabled, so this shouldn't fire there. It's expected only where `CLAUDE_ENV_FILE` itself isn't supported — tell the user to pass `--source <path-to-claude-jsonl>` directly in that case.
- **`Codex can import Claude sessions only from ...`** — resolved path is outside `~/.claude/projects/`. Show the exact path from the error, don't guess a fix.
- **`Timed out waiting for Codex to finish importing...`** — 2-minute internal cap hit. Don't silently retry; if the user retries manually and the same file/content was already imported, the ledger returns the same thread ID instead of a duplicate — that repeat is normal, not a second failure.
- **`Unknown subcommand: transfer`** — the resolved companion is older than 1.0.5 (transfer didn't exist yet). Tell the user to update the Official Codex plugin.
- **`Codex CLI is not installed or is missing required runtime support.`** — the companion resolved fine but the `codex` binary it shells out to isn't on `PATH`. Not transfer-specific. Direct to `npm install -g @openai/codex`, then `/codex-setup`.

## Gotchas

- **No `--model`/`--effort`/`--wait`/`--background`.** None of those concepts apply — transfer carries no prompt and always runs synchronously.
- **Don't reconstruct `resumeCommand` yourself.** Use the exact string the companion returned, even though it's predictable (`codex resume <threadId>`) — if the companion ever changes its resume invocation, a hand-built string would silently go stale while the field would not.
- **This is the last thing this skill does.** Don't offer follow-up double-checks, don't suggest re-running verification — there is no artifact left in Claude's hands to check.
