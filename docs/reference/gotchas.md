# Gotchas — Plugin Development

> Known traps discovered through real incidents. Moved out of `AGENTS.md` to keep the map thin — this file is the system of record for non-obvious failure modes.
>
> When adding a new gotcha, include **what fails** and **how it silently fails** so future agents can recognize the symptom.

## Loading & Discovery

**Component location** — `commands/`, `agents/`, `skills/`, `hooks/` belong in the **plugin root**, not inside `.claude-plugin/`. Placing them inside `.claude-plugin/` silently fails to load.

## Self-contained plugins

**Installed plugin isolation** — Installed plugins are cached copies. They cannot reference files outside their own directory. Paths relying on the surrounding repo will break after install.

**Plugin independence** — A plugin works with no other plugin installed. When a feature is unavailable, say "these features are unavailable outside this environment" rather than routing users to a specific plugin by name (e.g., "use claw-mo instead") — cross-plugin assumptions fail silently once the other plugin is uninstalled. A genuine hard dependency goes in `plugin.json` `dependencies` (official `plugins-reference.md`), which installs it.

**Plugin scope** — A plugin ships only the knowledge its own features use. Repo conventions, other plugins' details, and whole reference docs ride into every install and go stale unseen.

## Marketplace

**source path** — `marketplace.json` `source` must start with `./` (local) or be a source object (external). `../` is not supported.

## Plugin-Scope Silent Ignores

**Plugin agent security** — Plugin agents (`agents/*.md`) silently ignore `permissionMode`, `hooks`, and `mcpServers` frontmatter. To use them, the agent file must live in `.claude/agents/` or `~/.claude/agents/`.

**Plugin settings.json** — Only the `agent` and `subagentStatusLine` keys are supported (official `plugins-reference.md`). `permissions`, `hooks`, and other settings are silently ignored.

**Skill allowed-tools** — Bare names and `Bash(command *)` command-scoped patterns work. `Write(path)` path-scoped does **not**. `$()` command substitution triggers a separate security prompt regardless of `allowed-tools`. Skills inherit parent `settings.json` permissions: `permissions.allow` is additive; `permissions.deny` overrides skill `allowed-tools` (deny > allow).

**allowed-tools is not a whitelist** — `allowed-tools` only pre-approves the listed tools; every tool stays callable (official `skills.md`). A skill that loads another skill declares `Skill(<name>)` so the load runs without a permission prompt mid-flow.

## Hooks & scripts

**jq defaults swallow `false`** — `.key // default` treats JSON `false` like `null`, so a boolean set to `false` silently reads as the default. Compare booleans raw: `if .key == null then default else .key end`.

**`set -u` and plugin variables** — Under `set -u`, an unguarded `${CLAUDE_PLUGIN_ROOT}` aborts the whole hook when the variable is unset. Guard it: `[[ -n "${CLAUDE_PLUGIN_ROOT:-}" ]]`.

**Narrow hooks with `if`** — `matcher` picks the tool; the handler's `if` rule (e.g. `"if": "Bash(git push *)"`) filters before the script spawns. A broad `Bash(git *)` spawned bash, sourced shared code, and parsed JSON on every `git status` (rubber-duck-tutor, fixed in `d0d3ba1`).

## Testing

**Local plugin copy** — `claude --plugin-dir ./plugins/<plugin-name>` loads the working copy, and it takes precedence over an installed marketplace copy of the same plugin for that session (official `plugins.md`), so the marketplace version can stay enabled. Managed settings that force-enable or force-disable the plugin still win. Without the flag, an ordinary session runs the installed copy — when it is older than the repo, the Skill tool silently executes the old logic.

**`node --test` takes files** — `node --test <dir>` treats the directory as a module and reports a false "fail 1". Pass the test file paths.

**Headless writes** — A `claude -p` run that must write files needs `--permission-mode acceptEdits`, and the prompt should say the edits are approved; otherwise the run ends without the file.

## Data & Artifacts

**Eval artifacts** — Results go in `plugins/<plugin-name>/.evals/` (gitignored). Never place eval artifacts in the plugin root — they get distributed with marketplace installs.

**Persistent data paths** — `${CLAUDE_PLUGIN_ROOT}` is wiped on update. Anything that must survive upgrades, and also temp files and outputs, goes in `${CLAUDE_PLUGIN_DATA}` rather than the CWD (the user's project).

**Plugin variables in the Bash tool** — `${CLAUDE_PLUGIN_ROOT}` and `${CLAUDE_PLUGIN_DATA}` are substituted inline in skill and agent content and exported to hooks, but they are absent from the Bash tool's environment (official `plugins-reference.md`). There `CLAUDE_PLUGIN_DATA` can even hold another plugin's folder. Write the placeholder in SKILL.md and pass the path to scripts as an argument; a script reading `process.env` / `os.environ` gets the wrong value.

## Research & Content

**Research double-check** — Always verify web search / LLM research results against actual code and READMEs in `references/` before writing into spec or design documents. Research outputs can fabricate product features entirely (confirmed incident: HarnessKit features were completely mischaracterized). The same goes for rules in internal docs: check a FORBIDDEN-style rule against `references/` before enforcing it in code.
