---
status: accepted
---

# 0006 — codex-advisor ships a conditional SessionStart hook to keep the transcript env contract alive when the Official plugin is disabled

## Context

Official Codex plugin 1.0.5 added a `transfer` companion subcommand: it imports the current
Claude Code session transcript (`~/.claude/projects/<project>/<session-id>.jsonl`) into a
resumable Codex thread (`codex resume <id>`). The companion locates the transcript through a
single channel: the `CODEX_COMPANION_TRANSCRIPT_PATH` environment variable, planted at
SessionStart by the Official plugin's `session-lifecycle-hook.mjs` (it appends an
`export NAME='value'` line to `$CLAUDE_ENV_FILE`). Fallback: an explicit `--source <jsonl>` flag.

codex-advisor wraps every companion subcommand and its README promises **zero feature loss when
the Official plugin is disabled** (users disable it to de-duplicate the `/codex:*` command menu;
the companion binary is resolved and called directly). Disabling the Official plugin kills both
its `/codex:transfer` command *and* its SessionStart hook — so the env var is never planted and
transfer's auto-detection dies with it. Wrapping transfer therefore requires codex-advisor to
supply the transcript path itself in the disabled case.

The hard constraint: **the model cannot derive its own transcript path.** Claude Code does not
expose the session id to Bash or to the model's context; hooks are the only channel that
receives `transcript_path` (in their stdin JSON). Guessing by mtime in the project directory
breaks under concurrent sessions.

## Decision

Ship a thin `codex-transfer` skill whose execution is a single `transfer --json` call, plus
codex-advisor's **first hook**: a conditional SessionStart hook that keeps the env contract
alive regardless of the Official plugin's enable state.

Hook logic (fixed code, early-exit ordered):

1. `$CLAUDE_ENV_FILE` unset → exit 0 (env-file mechanism unavailable).
2. Env file already contains `CODEX_COMPANION_TRANSCRIPT_PATH` → exit 0 (the Official hook got
   there first — i.e., the plugin is enabled; ours is redundant).
3. Otherwise append `export CODEX_COMPANION_TRANSCRIPT_PATH='<transcript_path from stdin JSON>'`
   — the **same env name the Official plugin uses**, so the companion consumes it unchanged.
4. Never write to stdout (SessionStart stdout is injected into context; this keeps token cost 0).
   `timeout: 5`.

A start-order race can produce a duplicate export line (both hooks write). This is harmless:
same value, last export wins when the file is sourced.

## Considered options

- **Don't wrap transfer; revise the README's disable promise** ("keep the Official plugin
  enabled if you want transfer"). Rejected: retreats from the zero-loss promise that motivates
  codex-advisor's disable guidance in the first place, and leaves the only gap in the otherwise
  complete skill↔subcommand mapping.
- **Nonce self-identification instead of a hook** (skill plants a unique string via a Bash call,
  then greps the project's jsonl files for it — the only file containing the nonce is, by
  definition, the current session's transcript; pass it as `--source`). Works, and has zero
  always-on footprint. Rejected because the cleverness runs *in the model* on every use:
  LLM-improvised grep/quoting is a repeated failure surface, it depends on undocumented
  transcript-write internals and flush timing, and it contradicts the plugin's own
  do-not-improvise DNA (companion-usage.md exists to eliminate exactly this kind of per-use
  improvisation). A hook is ~15 lines of deterministic code that runs once per session.
- **Unconditional hook** (always append, no guard). Functionally fine — duplicates are harmless —
  but the guard costs one `grep` and removes the duplicate-write noise entirely.

## Consequences

- First hook in this plugin: its blast radius is **every session**, including sessions that
  never touch Codex. Mitigations: early-exit guards, no stdout, 5s timeout, no dependencies
  beyond reading stdin and appending one line.
- The wrapper now co-owns an upstream contract (the env var name). If upstream renames it, the
  compat re-verification pass (the same discipline that caught the 1.0.4→1.0.5 line-number
  drift) is the tripwire.
- Skill stays trivial (`transfer --json`), keeping all transcript-resolution logic out of
  LLM-executed instructions.
- Verified against CLI 2.1.201 (bundle + on-disk inspection): the env file lives at
  `~/.claude/session-env/<session-id>/<event>-hook-<n>.sh`, so `/clear` (which rotates the
  session id) always yields a fresh empty file — a stale pre-clear transcript path can never
  survive into guard 2.
- Same inspection: the env file appears to be per-hook (`-hook-<n>` suffix), so guard 2 may
  never actually see the Official hook's export; its real effect is preventing re-writes on
  same-session re-fires (e.g. compact). Either topology is safe — both hooks write the same
  value.
