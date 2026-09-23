# AGENTS.md

<!-- Source of truth for this repository; CLAUDE.md imports it. Keep it a map: detail lives in docs/ (docs/INDEX.md), non-obvious traps in docs/reference/gotchas.md. -->

Personal marketplace for Claude Code plugins. Plugins are developed under `plugins/` and released through `.claude-plugin/marketplace.json`.

- **Before any plugin change**, read `docs/reference/gotchas.md`.
- **Specs and issues** live in `docs/specs/` and `docs/issues/`, paired by number from 011.
- **Anything else in `docs/`**: `docs/INDEX.md`.

## Working with the user

- Act on a proposal only after the user approves it; a report or plan you present is not approval.
- During a grilling session, record plan changes as tasks in the spec or issue doc, and implement them after the session.
- Remove exactly the layer the user names; ask before extending a removal to other layers.
- Ask one question at a time, short and in plain words, with your recommended answer. This overrides skills that batch questions.
- Before rejecting an option, weigh its strongest variant.

## Official Claude Code Docs

When creating a plugin or component, changing a schema, or reviewing a spec or issue that cites official docs: fetch `https://code.claude.com/docs/llms.txt`, then the page as `https://code.claude.com/docs/en/<page>.md`, and verify each cited number against the source. Doc-internal tables may hold invented or outdated values.

When a change depends on Codex behavior (codex-advisor, vibeproxy-kit): fetch `https://learn.chatgpt.com/docs/llms.txt`.

**Large structured files: download and parse.** WebFetch summarizes through a model and returns wrong numbers on big JSON/CSV (a 1.5 MB `marketplace.json` came back as "287 plugins, eli5 absent" — `curl` + parse gave 2282 and present). Anything over a few hundred KB: `curl -sL <url> -o <file>` then `jq`/`python` on the file.

## Plugin Development

Skill authoring and evals: `/skill-creator-pro`. Registration, README, validation: follow the Workflow below.

Components (`commands/`, `skills/`, `agents/`, `hooks/`) live at the **plugin root**, not inside `.claude-plugin/`.

### Workflow

1. **Implement** under `plugins/<plugin-name>/`.
2. **Document** — if behavior changed, update the plugin's `README.md` (style: `docs/reference/readme-style.md`) and the `description` in both `plugin.json` and `marketplace.json`, so both list exactly the current features.
3. **Register** a new plugin in `.claude-plugin/marketplace.json`.
4. **Bump** the plugin's version in the same commit (see Versioning).
5. **Validate** — `claude plugin validate .` passes.

### Versioning

- Local (`./` source) plugins carry their version in `marketplace.json` only; external (GitHub source) plugins in `plugin.json` only. When both define it, `plugin.json` wins silently. So `claude plugin validate` warns `No version specified` for every local plugin — expected.
- SemVer: patch = fixes/tweaks, minor = features/renames, major = breaking interface changes.
- Bump in the commit that changes the plugin, without asking. Installed users keep their cached copy until the version changes.

## references/ · wiki/

Tracked symlinks into sibling repos: `references/` → `../references` (external repos, read-only — read, benchmark, mine for patterns); `wiki/` → `../llm-wiki/wiki` (edit it from the llm-wiki repo, where its AGENTS.md applies).

## Git Workflow

- Work on `develop`; `main` receives only `--no-ff` merges at release.
- Commit messages: English, 1–2 concise sentences on the core change.
- **When the user asks to release or tag**, follow `docs/release-workflow.md`.

## Coding Style

- **Language** — All plugin deliverables in English (SKILL.md, agent.md, README.md, comments, descriptions, code). Development conversation (plans, discussions, questions) in Korean.
- **Deterministic first** — put anything checkable in code (hooks, scripts) rather than prompt instructions.
