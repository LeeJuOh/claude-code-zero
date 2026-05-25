# claw-mo

Manage [mo](https://github.com/k1LoW/mo) markdown viewer sessions from Claude Code.

`cmux markdown open` is simple but can't render Mermaid diagrams, KaTeX math, or Shiki syntax highlighting. [mo](https://github.com/k1LoW/mo) handles all of those in the browser — but using it by hand means remembering port numbers, retyping watch patterns every time, herding groups, and checking whether the server is already running.

This plugin saves per-project config and organizes files into groups so every daily action comes down to one command. Full-text search across watched docs (`/_/api/search?q=…`, group-scoped with context snippets), a cross-project dashboard of every running/stopped mo server, and zero-setup quick-open for one-off files (`/claw-mo-open path/to/file.md` auto-assigns a port and starts mo if no config exists). In cmux, it opens in a browser panel right next to your terminal and reuses an existing surface on the same port instead of stacking duplicate tabs.

## Prerequisites

- [mo](https://github.com/k1LoW/mo): `brew install k1LoW/tap/mo`
- (Optional) [cmux](https://cmux.dev): opens mo in a browser panel next to your terminal

## Install

```shell
/plugin install claw-mo@claude-code-zero
```

## Quick Start

```
/claw-mo-setup     <- once: configure which .md files to watch, grouped
/claw-mo-up        <- start server + open browser
                      (thereafter autosync picks up Claude-written files; run this again
                       only to recover a silent fsnotify miss or restart mo)
```

## How It Works in Practice

**First-time setup** (`/claw-mo-setup`): scans your project for markdown files, groups them by directory (docs, plans, specs, etc.), and saves the config. Shows file counts before accepting broad patterns so you don't accidentally load thousands of vendored markdown files.

**Daily use** (`/claw-mo-up`): restarts the mo server by default whenever one is already running on this project's port. mo preserves the session across restarts but forces a fresh filesystem scan, which is the reliable fix for "docs exist on disk but don't show up in the sidebar" — `fsnotify` can silently miss file creation events under load or on new subdirectories. If the running session's patterns don't match saved config (someone edited runtime-only, or config changed), it instead clears and rebuilds from saved config. Pass `--reuse` if you explicitly want to skip the restart.

**Ad-hoc viewing** (`/claw-mo-open path/to/file.md`): adds a file to the running server and opens the browser directly on that file (deep-link via `?file=<id>`), without touching your saved config. If no config exists yet, it auto-assigns a port, starts mo, and writes a minimal config — the project is usable in one command without running `/claw-mo-setup` first. You can also pipe markdown in:

```
some-tool --format md | /claw-mo-open -
```

Ad-hoc changes are intentionally temporary — the next `/claw-mo-up` will reconcile the runtime back to saved config unless you persist the change through `/claw-mo-manage` or `/claw-mo-setup`. If the runtime has drifted from saved config, `/claw-mo-open` detects it before mutating and asks whether to resync first.

**Cross-project management** (`/claw-mo-manage`): dashboard of every configured project plus any manually-started mo servers, with running/stopped state at a glance. Highlights sync mismatches in groups or watch patterns, and lets you add/remove patterns, close individual files, refresh (rescan), stop servers, or reset sessions interactively. Pattern removal uses `mo --unwatch` and file closing uses `mo --close` — the officially supported CLI paths.

**Full-text search**: mo exposes `/_/api/search?q=<query>` (group-scoped, with `limit` and surrounding context). Combine it with tab-grouping to find "that one paragraph about X" across hundreds of watched docs without opening files.

**Shutdown** (`/claw-mo-down`): stops the server for the current project. Checks `mo --status --json` first so you get an accurate "was actually running" message instead of a silent no-op.

## Autosync

Once mo is running, claw-mo installs a `PostToolUse` hook that fires on `Write|Edit|MultiEdit`. If the written file is `.md` and inside a project with a claw-mo config, the hook POSTs it to mo's HTTP API — no restart, no `/claw-mo-up`. Addition is idempotent on the mo side (dedup by absolute path), so the hook is safe to fire on every edit.

External-editor writes still rely on mo's own `fsnotify` watcher (which handles the common case). Autosync exists to cover the one Claude Code-specific gap: a doc Claude itself just wrote should be visible immediately, not "after you remember to hit `/claw-mo-up`."

Opt out per project in `/claw-mo-manage` → Server control → Toggle autosync. The hook rereads config on every fire, so toggling is live.

## Commands

| Command | Description |
|---------|-------------|
| `/claw-mo-up [--reuse]` | Restart or start the server (restart is the default — forces fresh fs scan), then open/reuse browser |
| `/claw-mo-down` | Stop the server for the current project (verifies actual running state) |
| `/claw-mo-setup` | Configure groups, watch patterns, and port |
| `/claw-mo-open <path \| - \| --stdin> [--group name]` | Add a file, directory, or piped content to mo and deep-link to it |
| `/claw-mo-manage` | Interactive management: status, patterns, groups, refresh, close files, reset, stop |

## Configuration

Generated by `setup`. Stored per-project in `${CLAUDE_PLUGIN_DATA}/config.json`:

```json
{
  "/path/to/project": {
    "port": 6342,
    "groups": {
      "docs": ["docs/**/*.md"],
      "plans": ["plans/*.md"],
      "default": ["*.md"]
    }
  }
}
```

- **port**: auto-assigned from a hash of the project path (6300-6399), overridable in setup
- **groups**: group name → watch glob patterns. Each group becomes a separate tab in mo

## Why `claw-mo-up` Restarts By Default

mo uses `fsnotify` to watch directories for new markdown files. On macOS under load, or when a new subdirectory appears outside the watched tree, events can be dropped silently — mo keeps running but doesn't see the new files. Previously this plugin would quietly "reuse" a running session whenever the configured pattern set matched live state, which hid those drops.

`mo --restart` is cheap (<1 second), preserves the session (files, groups, watch patterns all come back), and re-initializes the watcher with a fresh scan. That's the tradeoff: a brief interruption every time you run `/claw-mo-up` in exchange for never wondering whether your docs are actually showing up. Pass `--reuse` if you're certain the running session is fine and want to skip the restart.

With autosync on, routine new-file visibility for Claude-written files doesn't rely on fsnotify at all — the hook POSTs directly. `mo --restart` remains the recovery path for genuine fsnotify drops (new subdirectories, external-editor bursts, OS pressure).
