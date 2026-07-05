# claude-code-zero

[English](README.md) | [한국어](README.ko.md)

> A plugin marketplace I built from what I needed while using Claude Code.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Claude Code Plugin Marketplace](https://img.shields.io/badge/Claude_Code-Plugin_Marketplace-orange)](https://github.com/LeeJuOh/claude-code-zero)

<div align="center">

<video src="https://github.com/user-attachments/assets/abb70886-6f82-474c-a956-3c89b77c4ae5" width="600" controls></video>

</div>

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

Installs SKILL.md files via the [skills CLI](https://github.com/vercel-labs/skills). Quick, no marketplace registration needed — but **hooks, agents, MCP servers, and scripts are not included**. Plugins that depend on hooks (worktree-plus, rubber-duck-tutor, claw-mo, codex-advisor) or agents (vision-powers, codex-advisor) will have reduced functionality.

```shell
npx skills add LeeJuOh/claude-code-zero
```

### Verify

Run `/plugin` and check the **Installed** tab.

## Plugins

### [codex-advisor](plugins/codex-advisor/README.md)

**Problem:** Codex outputs look confident but hallucinate citations and miss edge cases. You won't catch it by reading alone.

**Solution:** Claude independently re-verifies every Codex response — without seeing source code until after Codex returns. Five-way classification (Agreed / Disputed / Nuanced / False Positive / Uncited) so you know exactly what to trust.

`codex-review` · `codex-adversarial` · `codex-rescue` · `codex-verify` · `codex-research` · `codex-transfer` · `codex-status` · `codex-result` · `codex-cancel` · `codex-setup`

---

### [vision-powers](plugins/vision-powers/README.md)

**Problem:** Complex analysis buried in terminal text — architecture, security issues, git diffs all lose structure. Impossible to share with teammates.

**Solution:** Turns the analysis into a shareable report — your pick of a self-contained interactive HTML file (Mermaid diagrams + Chart.js dashboards) or portable Markdown for PRs and chat. Audits plugins (local, installed, or GitHub), git diffs, and markdown docs. Before delivering, Claude renders the report and reads it back as an image to catch diagrams that broke in layout.

`plugin-visual` · `diff-visual` · `doc-visual` · `fact-check` · `context-health-visual` · `report-manager`

---

### [skill-creator-pro](plugins/skill-creator-pro/README.md)

**Problem:** Building a skill that triggers when it should and actually helps is trial and error — no way to measure trigger accuracy, no structured improvement loop, no benchmark to tell you if a change helped.

**Solution:** Anthropic's official skill-creator coaching loop — draft, test against real prompts, review side-by-side baseline-vs-with-skill diffs, improve — plus a description-trigger optimizer and an HTML benchmark viewer. `auto-optimize` adds a hands-off hill-climbing pass for skills that already mostly work.

`skill-creator-pro` · `auto-optimize`

---

### [worktree-plus](plugins/worktree-plus/README.md)

**Problem:** Claude Code's built-in worktree leaves your gitignored files behind — `.env`, local config, local-only docs — so the project won't run; it doesn't track state, and can delete uncommitted work on removal.

**Solution:** `.worktreeinclude` copies the small, irreplaceable files (`.env`, local docs) into each worktree; `.worktreelink` symlinks the big, branch-invariant ones (downloaded assets, shared caches) at zero disk cost. Safety guard blocks removal if uncommitted changes or unpushed commits exist. Audit trail in `.worktree.log`.

`worktree-config` · auto-hooks on WorktreeCreate/Remove

---

### [notebooklm-connector](plugins/notebooklm-connector/README.md)

**Problem:** Your research lives in NotebookLM but querying it means context-switching, copy-pasting, and burning tokens on ungrounded answers.

**Solution:** Chrome automation queries NotebookLM directly from Claude Code. Source-grounded answers with automatic follow-up rounds (default 3) to fill coverage gaps. Per-project notebook registry.

`notebooklm-manager` (query · add · list · search · enable/disable · remove)

---

### [claw-mo](plugins/claw-mo/README.md)

**Problem:** mo markdown viewer is powerful but tedious to configure — port numbers, watch patterns, fsnotify drops files silently.

**Solution:** Per-project config with auto-sync hook. Every time Claude writes or edits a markdown file, it appears in mo automatically. Group-based organization, full-text search, Mermaid + KaTeX + Shiki rendering.

`claw-mo-setup` · `claw-mo-up` · `claw-mo-down` · `claw-mo-open` · `claw-mo-manage`

---

### [claw-mux](plugins/claw-mux/README.md)

**Problem:** Claude Code is trapped in a single terminal pane. Can't send commands to other panes, read their output, or orchestrate parallel workflows.

**Solution:** Full cmux integration — split layouts, send commands to any pane, read screen output, automate WKWebView browsers, and report progress via sidebar primitives (status / progress bar / leveled logs).

`claw-mux` · `cmux-browser` · `cmux-markdown`

---

### [toolbox](plugins/toolbox/README.md)

**Problem:** WebFetch gets blocked by bot detection. Session context vanishes between conversations. Secrets end up hardcoded. References drift out of sync.

**Solution:** Five focused utilities — Gemini fallback (auto-triggers on WebFetch failure), resumption-ordered handoff docs, secret extraction with auto-load hooks, sitemap discovery, and reference sync.

`gemini-fetch` · `handoff` · `secret-setup` · `fetch-sitemap` · `sync-references`

---

### [rubber-duck-tutor](plugins/rubber-duck-tutor/README.md)

**Problem:** Passively accepting AI-generated code leads to 17% worse comprehension. You merge code you don't truly understand.

**Solution:** Rubber duck questioning across 5 development phases — asks you to explain what the code does before you ship it. Hint ladder guides without revealing answers. Auto-suggests review at plan creation, PR, and git push.

`duck` · `duck-design` · `duck-plan` · `duck-verify` · `duck-review` · `duck-orient`

---

### [vibeproxy-kit](plugins/vibeproxy-kit/README.md)

**Problem:** Wiring VibeProxy manually (OAuth, aliases, config.yaml, shell edits) is error-prone. State is unclear — which backend is actually responding?

**Solution:** Explicit state management with backup/rollback. Per-backend isolation probe tells you exactly which model handles each alias. Pre-existing alias migration with Keep / Merge / Reset modes.

`setup-aliases` · `cc-list`

---

## Lab Plugins

Experimental. May require specific environments or have limited stability.

### [e2e-test-runner](plugins/e2e-test-runner/README.md)

**Problem:** E2E tests require brittle selectors and page objects. They break on every UI change and take forever to write.

**Solution:** Write tests in natural language JSON. Claude reads the page, decides what to click, and validates outcomes. Video recording per test, visual regression via pixel-diff, and auto-detects your dev server (Next / Vite / Remix / Astro / and more).

`e2e-test`

---

## Plugin Management

```shell
/plugin disable <plugin-name>@claude-code-zero    # Disable
/plugin enable <plugin-name>@claude-code-zero     # Re-enable
/plugin update <plugin-name>@claude-code-zero     # Update to latest
/plugin uninstall <plugin-name>@claude-code-zero  # Uninstall
```

## License

[MIT License](LICENSE)
