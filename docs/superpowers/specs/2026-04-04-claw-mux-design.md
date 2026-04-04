# claw-mux Plugin Design Spec

> cmux terminal integration plugin for Claude Code — topology control, browser automation, markdown viewer, notifications.

## Problem

cmux is a native macOS terminal for managing multiple AI coding agents. It provides a socket API, embedded browser, markdown viewer, notifications, and pane management — all accessible via the `cmux` CLI.

Claude Code doesn't know these capabilities exist. Without a plugin, Claude Code in cmux:
- Splits panes manually via keyboard shortcuts instead of programmatically
- Uses `claude-in-chrome` for browser tasks instead of the faster embedded browser
- Uses `claw-mo` for markdown viewing instead of native cmux panels
- Never sends notifications or updates sidebar metadata
- Doesn't leverage workspace topology for organizing parallel work

## Goal

Make Claude Code a first-class cmux citizen: automatically detect when running inside cmux, and use cmux-native tools for layout, browser automation, markdown display, and notifications.

## Scope

### Phase 1 (this spec)
- Core topology control (windows, workspaces, panes, surfaces)
- Notifications and sidebar metadata
- Browser automation (snapshot/ref workflow)
- Markdown viewer (live reload panels)
- Environment detection and coexistence with existing tools

### Phase 2 (future)
- Claude Code Teams orchestration (`cmux claude-teams`)
- SSH remote session patterns
- `cmux.json` custom command generation

## Architecture

### Plugin Structure

```
plugins/claw-mux/
  .claude-plugin/
    plugin.json
  skills/
    claw-mux/                     # Gateway + core
      SKILL.md
      references/
        handles-and-identify.md
        windows-workspaces.md
        panes-surfaces.md
        notifications.md          # New — not in cmux repo
    cmux-browser/                 # Browser automation
      SKILL.md
      references/
        commands.md
        snapshot-refs.md
        authentication.md
        session-management.md
      templates/
        form-automation.sh
        authenticated-session.sh
        capture-workflow.sh
    cmux-markdown/                # Markdown viewer
      SKILL.md
      references/
        commands.md
        live-reload.md
  README.md
```

### Skill Design

#### claw-mux (Gateway + Core)

**Trigger**: User requests terminal layout, pane splitting, notifications, progress display, or workspace management. Also triggers when automation needs deterministic placement in a multi-pane layout.

**Environment detection**: Check `$CMUX_WORKSPACE_ID` existence. If absent, skill advises that cmux features are unavailable and suggests standard alternatives.

**Body content**:
- Environment detection guidance
- `cmux identify --json` for caller context
- Core concepts: Window > Workspace > Pane > Surface hierarchy
- Fast start commands: list, new-workspace, new-split, move-surface, reorder-surface, trigger-flash
- Handle model: short refs (window:N, workspace:N, pane:N, surface:N)
- Notifications: `cmux notify --title "..." --body "..."`
- Sidebar metadata: `set-status` (pills with icon/color), `set-progress` (0.0-1.0 bar), `log` (leveled messages)
- Cross-references to cmux-browser and cmux-markdown skills

**References** (loaded on demand):
- `handles-and-identify.md` — Handle syntax, self-identify, caller targeting, UUID vs short refs
- `windows-workspaces.md` — Window/workspace lifecycle, create/focus/close, reorder/move
- `panes-surfaces.md` — Splits, surfaces, move/reorder, focus routing
- `notifications.md` — NEW content: notification CLI, OSC 777/99, sidebar metadata API, Claude Code hook integration patterns

**Content source**: cmux repo `skills/cmux/` adapted. `notifications.md` is new, synthesized from cmux official docs — API page (notification.create, set-status, set-progress, log commands) and Notifications page (CLI usage, OSC protocols, Claude Code hook examples).

#### cmux-browser (Browser Automation)

**Trigger**: User needs to open sites, interact with pages, wait for state changes, or extract data — specifically in cmux environment.

**Body content**:
- Core workflow: open → verify URL → wait → snapshot --interactive → act with refs → re-snapshot
- Surface targeting with workspace/window routing
- Wait patterns: --selector, --text, --url-contains, --load-state, --function
- Common flows: form submit, clear input, stable agent loop
- WKWebView limitations (no viewport/offline/trace/network interception)
- Troubleshooting: js_error recovery via get url/text/html fallback

**References** (loaded on demand):
- `commands.md` — Full command mapping (navigation, DOM interaction, inspection, JS eval, state management)
- `snapshot-refs.md` — Ref lifecycle, invalidation, best practices, stale ref troubleshooting
- `authentication.md` — Login/OAuth/2FA patterns, state save/load, cookie-based auth, token refresh
- `session-management.md` — Multi-surface isolation, state persistence, parallel task patterns

**Templates** (copy-paste starting points):
- `form-automation.sh` — Snapshot/ref form fill loop
- `authenticated-session.sh` — Login once, save/load state
- `capture-workflow.sh` — Navigate + capture snapshots/screenshots

**Content source**: cmux repo `skills/cmux-browser/` at ~95%. Changes: frontmatter description adds cmux environment condition, remove openai.yaml, update paths to use `$SKILL_DIR`. Dropped references: `video-recording.md` (niche, can add later), `proxy-support.md` (niche).

#### cmux-markdown (Markdown Viewer)

**Trigger**: User needs to display plans, documentation, or notes in a formatted panel alongside the terminal — specifically in cmux environment.

**Body content**:
- Core workflow: write .md file → `cmux markdown open plan.md` → auto-updates on disk change
- When to use: agent plans, documentation, changelogs, real-time notes
- Live file watching: works with direct writes, editor saves, atomic replacement, agent-generated files
- Agent integration: write plan → open → progressive updates
- Routing: default caller workspace, or target specific workspace/surface/window
- Rendering support: headings, code blocks, tables, lists, blockquotes, bold/italic, links, images, light/dark mode

**References** (loaded on demand):
- `commands.md` — Full syntax, path resolution, panel behavior, session persistence
- `live-reload.md` — DispatchSource watcher, atomic replace handling, 500ms retry, performance notes

**Content source**: cmux repo `skills/cmux-markdown/` at ~95%. Changes: frontmatter description adds cmux environment condition, remove openai.yaml, update paths.

### Coexistence with Existing Tools

| Scenario | cmux environment (`$CMUX_WORKSPACE_ID` set) | Non-cmux environment |
|----------|----------------------------------------------|---------------------|
| Browser automation | `cmux browser` (embedded WKWebView) | `claude-in-chrome` MCP |
| Markdown viewing | `cmux markdown open` (native panel) | `claw-mo` plugin |
| Pane management | `cmux new-split`, `cmux move-surface` | N/A (terminal doesn't support) |
| Notifications | `cmux notify`, `set-status`, `set-progress` | N/A (no equivalent) |

Each skill's SKILL.md includes a brief note: "Requires cmux environment (`$CMUX_WORKSPACE_ID`). Outside cmux, use [alternative]."

### Content Adaptation Strategy

The cmux repo (`references/cmux/skills/`) contains production-quality skills already written for end-users (not cmux developers). Adaptation is minimal:

1. **Frontmatter descriptions** — Add "in cmux environment" / "cmux" keywords for accurate triggering
2. **Environment detection** — Add `$CMUX_WORKSPACE_ID` check guidance to gateway skill
3. **Notifications/metadata** — New `notifications.md` reference file (not in cmux repo skills)
4. **Path updates** — Replace relative sibling links with `$SKILL_DIR` paths
5. **Remove** — openai.yaml files (Codex-specific), cross-skill relative links
6. **Keep as-is** — All reference files, templates, gotchas, troubleshooting

### Marketplace Registration

```json
{
  "name": "claw-mux",
  "source": "./plugins/claw-mux",
  "version": "1.0.0",
  "description": "cmux terminal integration: topology control, browser automation, markdown viewer, notifications",
  "tags": ["cmux", "terminal", "browser-automation"]
}
```

### Naming Convention

- Plugin name: `claw-mux` (follows `claw-` prefix convention from `claw-mo`)
- Gateway skill: `claw-mux` (matches plugin name)
- Specialized skills: `cmux-browser`, `cmux-markdown` (match cmux upstream names for traceability)

## Success Criteria

1. Claude Code auto-detects cmux environment and uses cmux-native tools
2. Pane splitting, browser automation, and markdown viewing work without user explaining cmux CLI
3. Outside cmux, existing tools (claude-in-chrome, claw-mo) continue working unaffected
4. Notifications and sidebar metadata are used for task progress reporting
5. `claude plugin validate .` passes
