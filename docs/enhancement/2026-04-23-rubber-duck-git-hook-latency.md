# rubber-duck-tutor git hook latency issue

> Date: 2026-04-23
> Status: resolved on 2026-04-28
> Scope: `plugins/rubber-duck-tutor/hooks/`
>
> **Resolution:** `hooks.json` now uses `Bash(git push)` + `Bash(git push *)` instead of `Bash(git *)`. Same narrowing applied to `gh pr create` and `glab mr create`. Inline regex kept as defense for compound commands (`npm test && git push`). README updated — earlier wording incorrectly listed commit/merge as triggers.

## Summary

`rubber-duck-tutor` currently registers a PostToolUse Bash hook for `Bash(git *)`, but the hook script only does useful work for `git push`.

That means ordinary git commands such as `git status`, `git diff`, `git add`, and `git commit` still pay the hook startup cost on every Bash execution. The script exits quickly for non-push commands, but not before spawning `bash`, sourcing shared hook code, reading stdin, and parsing JSON.

In practice this makes simple git operations feel slower than they should, especially when combined with unrelated skill loading or other tool-chain overhead in the same turn.

## Evidence

### Broad matcher

`plugins/rubber-duck-tutor/hooks/hooks.json` registers the push checker like this:

- `PostToolUse` matcher: `Bash`
- hook condition: `if: "Bash(git *)"`
- command: `bash ${CLAUDE_PLUGIN_ROOT}/hooks/post-push.sh`

Relevant lines:

- `plugins/rubber-duck-tutor/hooks/hooks.json:19-24`

### Narrow behavior hidden behind a broader trigger

`post-push.sh` immediately loads shared hook code, then inspects the Bash command and exits unless it contains `git push`.

Relevant lines:

- `plugins/rubber-duck-tutor/hooks/post-push.sh:10-18`

### Per-invocation bootstrap cost

Before the early exit, the script does all of the following:

- sources `lib.sh`
- reads full hook JSON from stdin
- parses fields via `jq` when available
- extracts session metadata for rate-limiting decisions

Relevant lines:

- `plugins/rubber-duck-tutor/hooks/lib.sh:17-27`
- `plugins/rubber-duck-tutor/hooks/lib.sh:35-55`

## Quick benchmark

Local script-only benchmark in this repo, measured on 2026-04-23:

- simulated `git status`: about `0.026s` per invocation
- simulated `git push origin develop`: about `0.038s` per invocation

This is not end-to-end Claude runtime latency. It only measures the hook script path, so the real user-visible delay can be higher once tool orchestration and other session work are included.

## Reproduction

1. Enable `rubber-duck-tutor`.
2. Run ordinary git commands in a Claude session, for example `git status` or `git commit`.
3. Observe that the PostToolUse Bash hook still fires because the filter is `Bash(git *)`.
4. The hook prints the status message `duck: checking for git push...` and then exits after inspecting the command.

## Root cause

The hook is filtered too broadly at registration time.

Current design:

- event filter matches every `git *` Bash command
- command-specific check for `git push` happens inside `post-push.sh`

This shape is backwards for performance. The expensive discrimination happens after process startup instead of before hook dispatch.

## Impact

- Adds avoidable latency to all git Bash commands, not just `git push`
- Makes `git commit` feel slower even when no duck suggestion should appear
- Obscures the real source of delay because the hook exits silently for non-push commands
- Scales badly if more git-scoped hooks are added with the same pattern

## Recommended fixes

### Preferred

Narrow the hook condition in `hooks.json` so the command only runs for actual push commands.

Examples to validate against Claude hook matcher syntax:

- `Bash(git push *)`
- `Bash(git push*)`

If command-pattern matching is limited, use the narrowest supported expression rather than `git *`.

### Fallback

If the hook matcher cannot express `git push` precisely:

- split push detection into a lighter-weight wrapper with near-zero startup cost
- avoid sourcing `lib.sh` until after a cheap first-pass command check
- move shared heavy work behind the `git push` branch only

## Follow-up

- Validate the narrow matcher against Claude Code hook syntax before changing plugin behavior
- After the matcher is tightened, re-measure `git status` and `git commit`
- If latency still feels high, inspect other PostToolUse Bash hooks and any skill auto-loading in the same workflow
