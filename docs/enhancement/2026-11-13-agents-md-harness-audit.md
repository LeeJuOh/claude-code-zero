# Prompt audit — AGENTS.md and the project harness (2026-11-13)

> Status: hunks 1-6 applied on 2026-11-13 (user approved). Flags F1-F5 are open. Line numbers refer to commit `562beb2`; open the line again before you edit.
> Method: `/claude-api prompt-audit` (Steps 0-6). The proposed diff is at the end of this document, one hunk per finding.

## Assumptions (Step 0)

- **Scope:** the repository's own agent configuration and the files it routes the agent to: `AGENTS.md`, `CLAUDE.md` (`@AGENTS.md` only), `CONTEXT-MAP.md`, `docs/INDEX.md`, `docs/reference/gotchas.md`, `docs/reference/readme-style.md`, `docs/release-workflow.md`. Plugins under `plugins/` are deliverables, not harness; they were audited on 2026-10-14.
- **Skipped:** `.claude/settings.json` and `.claude/settings.local.json` (settings and hook definitions can hold secrets, so they were not read; they are the only other harness files in `.claude/`). User-level files (`~/.claude/CLAUDE.md`, `~/.codex/AGENTS.md`, `~/.claude/rules/pstack-models.md`) are outside the project and were not audited.
- **Target model:** `claude-opus-5-5`, the model that ran this audit. No file pins a model.
- **Not model-facing:** the HTML comment at `AGENTS.md:3`. Block-level HTML comments in CLAUDE.md imports are stripped before the content reaches the model (official `memory.md`), so it is a maintainer note.
- **Docs checked** (downloaded 2026-11-13 from code.claude.com): `plugins/host-marketplace.md`, `plugins/marketplace-reference.md`, `plugins/manifest-reference.md` (what `plugins-reference.md` now serves), `plugins/components.md`, `plugins/loading.md`, `skills.md`, `memory.md`.
- **Verification:** `claude plugin validate .` was run once. It prints `No version specified` for all 10 plugins, so the claim at `AGENTS.md:43` is correct and is not a finding. All Group 2 findings below were checked against the repository or the docs listed above. No behavioral probe was run: the findings are factual, not behavioral.

## Summary

1. **`docs/release-workflow.md:3-9` (high):** the rename procedure breaks every existing install if an agent follows it. Official `host-marketplace.md` says a `name` change breaks `enabledPlugins` and needs a top-level `renames` map, or use `displayName` and keep `name`. The procedure also omits `plugin.json` `name`, which is the component namespace. And the agent does not read this section during a rename: `AGENTS.md:55` routes to this file only for a release or a tag. Proposed: move a corrected version into `gotchas.md`, which `AGENTS.md:7` makes required before any plugin change.
2. **`docs/reference/gotchas.md` is missing three documented facts (medium):** plugin agents also ignore `initialPrompt` (`components.md:314`); an `allowed-tools` grant clears at the user's next message (`skills.md:405`); and `${CLAUDE_PLUGIN_*}` is substituted only in skill, command, and agent content, not in reference files that are opened with Read or in hook output text (`manifest-reference.md:572`). The 2026-09-11 and 2026-10-14 audits each found one of the last two facts and recorded it only in their own reports.
3. **Two history notes in `gotchas.md` (medium):** a commit hash at :39 and "Moved out of `AGENTS.md`" at :3.

Counts: G1 dated prompt text 0 · G2 stale facts and conflicts 6 (+4 flags) · out of scope 1 flag · G3 tool descriptions not applicable · G4 request config not applicable.

Group 1 is clean. Every emphatic line in scope gives its reason (`gotchas.md:51`, `:59`, `AGENTS.md:25`), and no line steers thinking, suppresses updates, or bans formatting.

## Findings

| # | Location | Evidence | Pattern | Why obsolete | Confidence | Action |
|---|---|---|---|---|---|---|
| H1 | `docs/release-workflow.md:3-9` | "When renaming a plugin … 1. Update the `name` and `source` fields in `marketplace.json`. 2. Bump the version (at least minor) … 3. Update the `description`" | G2 volatile specifics; reachability | `host-marketplace.md` § Rename or remove a plugin: "changing it breaks every existing install"; use `displayName`, or add a `renames` map. `marketplace.json` has no `renames` key (keys: name, metadata, owner, plugins). All 10 `plugin.json` files set `name`, and `manifest-reference.md` § Metadata precedence says components are namespaced under the manifest name. `AGENTS.md:55` routes to this file only on "release or tag", so the agent does not read it during a rename. | High | `move` to `gotchas.md` § Marketplace + `rewrite` (hunk 1) |
| M1 | `docs/reference/gotchas.md:25` | "Plugin agents (`agents/*.md`) silently ignore `permissionMode`, `hooks`, and `mcpServers` frontmatter. To use them, the agent file must live in `.claude/agents/` or `~/.claude/agents/`." | G2 volatile specifics | `components.md:314` lists four ignored fields: `permissionMode`, `hooks`, `mcpServers`, `initialPrompt`. It also gives the in-plugin remedy for hooks and MCP servers: declare them as plugin hooks and MCP servers. | Medium | `rewrite` (hunk 2) |
| M2 | `docs/reference/gotchas.md:31` | "`allowed-tools` only pre-approves the listed tools; every tool stays callable" | G2 — missing contract fact | `skills.md:405`: the grant applies "during the turn that invokes this skill. The grant clears when you send your next message." A confirm-then-act skill loses its pre-approval after the user confirms. The 2026-10-14 audit (line 204) found that "gotchas.md does not record this yet". | Medium | `add` (hunk 3) |
| M3 | `docs/reference/gotchas.md:55` | "`${CLAUDE_PLUGIN_ROOT}` and `${CLAUDE_PLUGIN_DATA}` are substituted inline in skill and agent content and exported to hooks" | G2 — missing contract fact | `manifest-reference.md:572` limits inline substitution to "Skill, command, and agent content". A reference file that is opened with Read is not that content. The 2026-10-14 audit H2 found this bug in codex-advisor. The 2026-09-11 audit (line 102) measured that hook `additionalContext` is not substituted, and kept the line as "unanswered". | Medium | `add` (hunk 4) |
| M4 | `docs/reference/gotchas.md:39` | "(rubber-duck-tutor, fixed in `d0d3ba1`)" | G2 history narrative | The rule and the symptom ("spawned bash, sourced shared code, and parsed JSON on every `git status`") stay. The plugin name and the commit hash are archaeology that the model cannot act on. | Medium | `remove` the parenthetical (hunk 5) |
| M5 | `docs/reference/gotchas.md:3` | "Known traps discovered through real incidents. Moved out of `AGENTS.md` to keep the map thin — this file is …" | G1d migration-relative phrasing / G2 history | "Moved out of" is a diff against an older `AGENTS.md` that the model never sees. The second half of the line (what the file is for) is the live content. | Medium | `rewrite` (hunk 6) |
| F1 | `docs/reference/gotchas.md:27` | "Only the `agent` and `subagentStatusLine` keys are supported (official `plugins-reference.md`)." | G2 volatile specifics | The cited page now serves `manifest-reference.md` content, and neither that page, `components.md`, nor `loading.md` mentions a plugin-root `settings.json`. The citation is stale. The claim itself could not be confirmed or refuted. | Low | `flag` — find the current page, then fix the citation or the claim |
| F2 | `AGENTS.md:43` | "When both define it, `plugin.json` wins silently." | G2 volatile specifics | `marketplace-reference.md:89`: `plugin.json` takes precedence "and `claude plugin validate` warns" (`Entry declares version "x" but … plugin.json says "y"`). The install is silent, but validation is not. Small impact: no plugin sets both. | Low | `flag` |
| F3 | `docs/release-workflow.md:13` | "(v1.83.0 shipped codex-advisor 5.0.0; v1.83.1 shipped 5.0.2)" | G2 history narrative | It is an illustration of the tag rule, not a stale fact. It rots slowly. | Low | `flag` |
| F4 | `AGENTS.md:7` | "**Before any plugin change**, read `docs/reference/gotchas.md`." | G1d unenforced instruction | `AGENTS.md:60` ("Deterministic first") asks for checks in code. A hook could do this check (for example, a PreToolUse hook on Edit/Write under `plugins/` that injects or points to the file). `.claude/settings.json` was not read, so this audit cannot tell whether a hook already does it. | Low | `flag` |
| F5 | `.claude-plugin/marketplace.json` (no `renames` key) | `e2e-test-runner` removed in `e69be21` (2026-09-25); `agent-extension-wiki` last present before `133dd2b` (2026-03-03) | Outside scope (marketplace content, not prompt text); follows from H1 | `host-marketplace.md`: put a removed entry in `renames` mapped to `null`, so users who installed it do not get `Plugin "<name>" not found in marketplace`. | Low | `flag` — decide whether to add `{"e2e-test-runner": null, "agent-extension-wiki": null}` |

Keep-list notes (not findings):

- `AGENTS.md:25` "287 plugins, eli5 absent … 2282": this is the reason for the rule (keep-list 1).
- `AGENTS.md:31` and `gotchas.md:9` state the same component-location rule. They agree, so this is working redundancy (keep-list 8).
- `AGENTS.md:16` "This overrides skills that batch questions": a stated override, not a conflict.
- `AGENTS.md:45` "Bump … without asking": a scoped exception to `:13`, and it states its reason.
- `docs/INDEX.md:18` `handoff/` does not exist. `INDEX.md:5` defines it as a temporary slot, so it is a placeholder, not a stale path.
- `gotchas.md:59` HarnessKit incident: this is the symptom that the file's own header asks each entry to give.
- `release-workflow.md:17-23`: exact git commands for a fragile operation (keep-list 3).

## Proposed diff

Each hunk is one finding. Hunks 1-6 are Group 2 edits, so confirm each one before you apply it. No plugin file changes, so no version bump.

### Hunk 1 — H1 (move + rewrite)

```diff
--- a/docs/release-workflow.md
+++ b/docs/release-workflow.md
@@ -1,12 +1,5 @@
 # Release Workflow (Tagging on main)
 
-## Plugin Rename Handling
-
-When renaming a plugin (e.g., `extension-wiki` → `agent-extension-wiki`):
-
-1. Update the `name` and `source` fields in `marketplace.json`.
-2. Bump the version (at least minor) to signal the change.
-3. Update the `description` if scope has changed.
-
 ## Tagging on main
 
--- a/docs/reference/gotchas.md
+++ b/docs/reference/gotchas.md
@@ -21,2 +21,4 @@
 **source path** — `marketplace.json` `source` must start with `./` (local) or be a source object (external). `../` is not supported.
+
+**Renaming a plugin** — `name` is the key users have in `enabledPlugins` and the namespace of every component, so changing it breaks every existing install. To change only the label, set `displayName` in `plugin.json` and keep `name`. To change `name`: change it in both `plugin.json` and the `marketplace.json` entry (and `source` if the folder moves), add a top-level `renames` map (`"<old>": "<new>"`, or `null` for a removed plugin) so Claude Code migrates users, bump at least minor, and grep the repo for the old name (official `plugins/host-marketplace.md` § Rename or remove a plugin).
```

### Hunk 2 — M1 (rewrite)

```diff
--- a/docs/reference/gotchas.md
+++ b/docs/reference/gotchas.md
@@ -25 +25 @@
-**Plugin agent security** — Plugin agents (`agents/*.md`) silently ignore `permissionMode`, `hooks`, and `mcpServers` frontmatter. To use them, the agent file must live in `.claude/agents/` or `~/.claude/agents/`.
+**Plugin agent security** — Plugin agents (`agents/*.md`) silently ignore `permissionMode`, `hooks`, `mcpServers`, and `initialPrompt` frontmatter (official `plugins/components.md`). Declare hooks and MCP servers at the plugin level instead. `permissionMode` and `initialPrompt` work only when the agent file lives in `.claude/agents/` or `~/.claude/agents/`.
```

### Hunk 3 — M2 (add)

```diff
--- a/docs/reference/gotchas.md
+++ b/docs/reference/gotchas.md
@@ -31 +31 @@
-**allowed-tools is not a whitelist** — `allowed-tools` only pre-approves the listed tools; every tool stays callable (official `skills.md`). A skill that loads another skill declares `Skill(<name>)` so the load runs without a permission prompt mid-flow.
+**allowed-tools is not a whitelist** — `allowed-tools` only pre-approves the listed tools; every tool stays callable (official `skills.md`). A skill that loads another skill declares `Skill(<name>)` so the load runs without a permission prompt mid-flow. The grant clears when the user sends their next message, so a step that runs after the user confirms is no longer pre-approved.
```

### Hunk 4 — M3 (add)

```diff
--- a/docs/reference/gotchas.md
+++ b/docs/reference/gotchas.md
@@ -55 +55 @@
-**Plugin variables in the Bash tool** — `${CLAUDE_PLUGIN_ROOT}` and `${CLAUDE_PLUGIN_DATA}` are substituted inline in skill and agent content and exported to hooks, but they are absent from the Bash tool's environment (official `plugins-reference.md`). There `CLAUDE_PLUGIN_DATA` can even hold another plugin's folder. Write the placeholder in SKILL.md and pass the path to scripts as an argument; a script reading `process.env` / `os.environ` gets the wrong value.
+**Plugin variables in the Bash tool** — `${CLAUDE_PLUGIN_ROOT}` and `${CLAUDE_PLUGIN_DATA}` are substituted inline in skill, command, and agent content and exported to hooks, but they are absent from the Bash tool's environment (official `plugins-reference.md`). There `CLAUDE_PLUGIN_DATA` can even hold another plugin's folder. Reference files that are opened with Read and text that a hook returns (`additionalContext`) are not substituted either. Write the placeholder in SKILL.md and pass the path to scripts as an argument; a script reading `process.env` / `os.environ` gets the wrong value.
```

### Hunk 5 — M4 (remove)

```diff
--- a/docs/reference/gotchas.md
+++ b/docs/reference/gotchas.md
@@ -39 +39 @@
-**Narrow hooks with `if`** — `matcher` picks the tool; the handler's `if` rule (e.g. `"if": "Bash(git push *)"`) filters before the script spawns. A broad `Bash(git *)` spawned bash, sourced shared code, and parsed JSON on every `git status` (rubber-duck-tutor, fixed in `d0d3ba1`).
+**Narrow hooks with `if`** — `matcher` picks the tool; the handler's `if` rule (e.g. `"if": "Bash(git push *)"`) filters before the script spawns. A broad `Bash(git *)` spawns bash, sources shared code, and parses JSON on every `git status`.
```

### Hunk 6 — M5 (rewrite)

```diff
--- a/docs/reference/gotchas.md
+++ b/docs/reference/gotchas.md
@@ -3 +3 @@
-> Known traps discovered through real incidents. Moved out of `AGENTS.md` to keep the map thin — this file is the system of record for non-obvious failure modes.
+> System of record for non-obvious failure modes in plugin development, each found in a real incident.
```
