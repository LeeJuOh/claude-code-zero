# claude-code-zero

[English](README.md) | [한국어](README.ko.md)

> A plugin marketplace I built from what I needed while using Claude Code.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Claude Code Plugin Marketplace](https://img.shields.io/badge/Claude_Code-Plugin_Marketplace-orange)](https://github.com/LeeJuOh/claude-code-zero)

https://github.com/user-attachments/assets/ed8ac080-06c1-41f3-a70d-1800d3fa5713

## Install

### Option A — Plugin Marketplace (recommended)

Full install: skills, hooks, agents, MCP servers, scripts — everything the plugin ships.

```shell
# 1. Add the marketplace (once)
/plugin marketplace add LeeJuOh/claude-code-zero

# 2. Install a plugin
/plugin install <plugin-name>@claude-code-zero
```

Or from the terminal:

```shell
claude plugin add <plugin-name>@claude-code-zero
```

### Option B — npx skills (skills only)

Use the [skills CLI](https://github.com/vercel-labs/skills) to install skills on their own. For features that need plugin hooks or agents, use the marketplace installation above.

```shell
npx skills add LeeJuOh/claude-code-zero
```

### Verify

Run `/plugin` and check the **Installed** tab.

## Featured plugins

### [codex-advisor](plugins/codex-advisor/README.md)

When an agent reviews its own patch, it already knows what the author meant. Ask Codex for a second review, then have a fresh verifier check its findings against the code. Start with `/codex-review` to see which findings hold up.

Skills · `codex-review` · `codex-adversarial` · `codex-rescue` · `codex-verify` · `codex-research` · `codex-transfer` · `codex-status` · `codex-result` · `codex-cancel` · `codex-setup`

### [one-minute-pr](plugins/one-minute-pr/README.md)

Agent-written pull requests and merge requests were so long that I struggled to find what I needed to review. I built `one-minute-pr` to keep the description short and show why the change matters, what it affects, and how it was checked.

Skills · `one-minute-pr`

### [worktree-plus](plugins/worktree-plus/README.md)

A new worktree has your branch's code, but it may still need a local `.env` file before the app can start. Choose which files to copy and which caches to share. When you remove the worktree, the hook checks for work you still need to save or push.

Skills · `worktree-setup`

### [vision-powers](plugins/vision-powers/README.md)

A diff shows which lines changed. To review an unfamiliar system, you may first need to see who calls the changed code. `diff-visual` traces that path and explains the patch alongside the actual code. You can also turn a plugin or a Markdown document into a report with diagrams.

Skills · `diff-visual` · `plugin-visual` · `doc-visual` · `fact-check` · `report-manager`

### [skill-creator-pro](plugins/skill-creator-pro/README.md)

Does the agent pick your skill for the right request? Does the skill improve the result? Test the description against sample requests, then run the same task with and without the skill and compare the outputs side by side.

Skills · `skill-creator-pro` · `auto-optimize`

## Other tools

### [toolbox](plugins/toolbox/README.md)

When you resume work in a new session, `handoff` records the decisions, open questions, and files to read first. The other tools move secrets out of configuration files, list URLs from a sitemap, and update local reference repositories.

Skills · `fetch-sitemap` · `handoff` · `secret-setup` · `sync-references`

### [notebooklm-connector](plugins/notebooklm-connector/README.md)

Ask a question about a NotebookLM notebook while you work in Claude Code. The connector opens the notebook in Chrome and brings the answer and its citations back to the conversation, so you can check a source without copying the exchange between apps.

Skills · `notebooklm-manager`

## Experimental plugins

- [claw-mo](plugins/claw-mo/README.md) · Preview Markdown files as Claude edits them.
- [claw-mux](plugins/claw-mux/README.md) · Run commands and read output in other cmux panes.
- [vibeproxy-kit](plugins/vibeproxy-kit/README.md) · Set up VibeProxy aliases and check which backend answers.
- [rubber-duck-tutor](plugins/rubber-duck-tutor/README.md) · Answer questions about the code you are about to ship.

## Plugin Management

```shell
/plugin disable <plugin-name>@claude-code-zero    # Disable
/plugin enable <plugin-name>@claude-code-zero     # Re-enable
/plugin update <plugin-name>@claude-code-zero     # Update to latest
/plugin uninstall <plugin-name>@claude-code-zero  # Uninstall
```

## License

[MIT License](LICENSE)
