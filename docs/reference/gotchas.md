# Gotchas — Plugin Development

> Known traps discovered through real incidents. Moved out of `AGENTS.md` to keep the map thin — this file is the system of record for non-obvious failure modes.
>
> When adding a new gotcha, include **what fails** and **how it silently fails** so future agents can recognize the symptom.

## Loading & Discovery

**Component location** — `commands/`, `agents/`, `skills/`, `hooks/` belong in the **plugin root**, not inside `.claude-plugin/`. Placing them inside `.claude-plugin/` silently fails to load.

**Installed plugin isolation** — Installed plugins are cached copies. They cannot reference files outside their own directory. Paths relying on the surrounding repo will break after install.

**Plugin independence** — A plugin must never assume another plugin is installed. Don't route users to a specific plugin by name (e.g., "use claw-mo instead"); say "these features are unavailable outside this environment" and let the user's setup handle it. Cross-plugin dependencies create silent failures when one is uninstalled.

## Versioning & Marketplace

**source path** — `marketplace.json` `source` must start with `./` (local) or be a source object (external). `../` is not supported.

**Version priority** — If both `plugin.json` and `marketplace.json` define `version`, `plugin.json` wins silently. Local plugins: set version in `marketplace.json` only. External repo plugins: set version in `plugin.json` only.

**Version bump required** — Changing plugin code without bumping the version means existing users won't see the update — cached copies persist until the version changes.

**Plugin name format** — Names must be kebab-case only (lowercase, digits, hyphens). Spaces or brackets like `[Lab] my-plugin` fail validation. Use `lab-` prefix for experimental plugins.

## Plugin-Scope Silent Ignores

**Plugin agent security** — Plugin agents (`agents/*.md`) silently ignore `permissionMode`, `hooks`, and `mcpServers` frontmatter. Supported fields: `tools`, `disallowedTools`, `model`, `maxTurns`, `skills`, `memory`, `background`, `isolation`.

**Plugin settings.json** — Only the `agent` field is supported. `permissions`, `hooks`, and other settings are silently ignored.

**Skill allowed-tools** — Bare names and `Bash(command *)` command-scoped patterns work. `Write(path)` path-scoped does **not**. `$()` command substitution triggers a separate security prompt regardless of `allowed-tools`. Skills inherit parent `settings.json` permissions: `permissions.allow` is additive; `permissions.deny` overrides skill `allowed-tools` (deny > allow).

## Data & Artifacts

**Eval artifacts** — Results go in `plugins/<plugin-name>/.evals/` (gitignored). Never place eval artifacts in the plugin root — they get distributed with marketplace installs.

**Persistent data paths** — `${CLAUDE_PLUGIN_ROOT}` changes on update (cache dir wiped). Always use `${CLAUDE_PLUGIN_DATA}` for anything that must survive plugin upgrades. See official env-vars doc (`https://code.claude.com/docs/en/env-vars.md`).

## Research & Content

**Research double-check** — Always verify web search / LLM research results against actual code and READMEs in `references/` before writing into spec or design documents. Research outputs can fabricate product features entirely (confirmed incident: HarnessKit features were completely mischaracterized).
