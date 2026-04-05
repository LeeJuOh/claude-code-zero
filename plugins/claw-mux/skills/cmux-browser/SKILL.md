---
name: cmux-browser
description: "Browser automation with cmux embedded webviews (not Chrome/Chromium). Use when $CMUX_WORKSPACE_ID is set and you need to open sites, interact with pages, wait for state changes, or extract data. Snapshot/ref workflow for reliable element targeting."
allowed-tools: Bash, Read
---

# Browser Automation with cmux

Use this skill for browser tasks inside cmux webviews. Requires cmux environment (`$CMUX_WORKSPACE_ID`). Outside cmux, this skill's features are unavailable.

## Core Workflow

1. Open or target a browser surface.
2. Verify navigation with `get url` before waiting or snapshotting.
3. Snapshot (`--interactive`) to get fresh element refs.
4. Act with refs (`click`, `fill`, `type`, `select`, `press`).
5. Wait for state changes.
6. Re-snapshot after DOM/navigation changes.

```bash
cmux --json browser open https://example.com
# use returned surface ref, for example: surface:7

cmux browser surface:7 get url
cmux browser surface:7 wait --load-state complete --timeout-ms 15000
cmux browser surface:7 snapshot --interactive
cmux browser surface:7 fill e1 "hello"
cmux --json browser surface:7 click e2 --snapshot-after
cmux browser surface:7 snapshot --interactive
```

## Surface Targeting

```bash
# identify current context
cmux identify --json

# open routed to a specific topology target
cmux browser open https://example.com --workspace workspace:2 --window window:1 --json
```

Notes:
- CLI output defaults to short refs (`surface:N`, `pane:N`, `workspace:N`, `window:N`).
- UUIDs are still accepted on input; only request UUID output when needed (`--id-format uuids|both`).
- Keep using one `surface:N` per task unless you intentionally switch.

## Wait Support

```bash
cmux browser <surface> wait --selector "#ready" --timeout-ms 10000
cmux browser <surface> wait --text "Success" --timeout-ms 10000
cmux browser <surface> wait --url-contains "/dashboard" --timeout-ms 10000
cmux browser <surface> wait --load-state complete --timeout-ms 15000
cmux browser <surface> wait --function "document.readyState === 'complete'" --timeout-ms 10000
```

## Common Flows

### Form Submit

```bash
cmux --json browser open https://example.com/signup
cmux browser surface:7 get url
cmux browser surface:7 wait --load-state complete --timeout-ms 15000
cmux browser surface:7 snapshot --interactive
cmux browser surface:7 fill e1 "Jane Doe"
cmux browser surface:7 fill e2 "jane@example.com"
cmux --json browser surface:7 click e3 --snapshot-after
cmux browser surface:7 wait --url-contains "/welcome" --timeout-ms 15000
cmux browser surface:7 snapshot --interactive
```

### Clear an Input

```bash
cmux browser surface:7 fill e11 "" --snapshot-after --json
cmux browser surface:7 get value e11 --json
```

### Stable Agent Loop (Recommended)

```bash
# navigate -> verify -> wait -> snapshot -> action -> snapshot
cmux browser surface:7 get url
cmux browser surface:7 wait --load-state complete --timeout-ms 15000
cmux browser surface:7 snapshot --interactive
cmux --json browser surface:7 click e5 --snapshot-after
cmux browser surface:7 snapshot --interactive
```

If `get url` is empty or `about:blank`, navigate first instead of waiting on load state.

## Deep-Dive References

| Reference | When to Use |
|-----------|-------------|
| [$SKILL_DIR/references/commands.md]($SKILL_DIR/references/commands.md) | Full browser command mapping and quick syntax |
| [$SKILL_DIR/references/snapshot-refs.md]($SKILL_DIR/references/snapshot-refs.md) | Ref lifecycle and stale-ref troubleshooting |
| [$SKILL_DIR/references/authentication.md]($SKILL_DIR/references/authentication.md) | Login/OAuth/2FA patterns and state save/load |
| [$SKILL_DIR/references/session-management.md]($SKILL_DIR/references/session-management.md) | Multi-surface isolation and state persistence patterns |

## Ready-to-Use Templates

| Template | Description |
|----------|-------------|
| [$SKILL_DIR/templates/form-automation.sh]($SKILL_DIR/templates/form-automation.sh) | Snapshot/ref form fill loop |
| [$SKILL_DIR/templates/authenticated-session.sh]($SKILL_DIR/templates/authenticated-session.sh) | Login once, save/load state |
| [$SKILL_DIR/templates/capture-workflow.sh]($SKILL_DIR/templates/capture-workflow.sh) | Navigate + capture snapshots/screenshots |

## Limits (WKWebView)

These are not supported in cmux's embedded browser (WKWebView-based):
- Viewport emulation
- Offline emulation
- Trace/screencast recording
- Network route interception/mocking
- Low-level raw input injection

Use supported high-level commands (`click`, `fill`, `press`, `scroll`, `wait`, `snapshot`) instead.

## Gotchas

- WKWebView-based, not Chromium — viewport emulation, network interception, and trace/screencast recording are not supported. Don't attempt CDP-style commands.
- Element refs (`e1`, `e2`, ...) are invalidated on any DOM change — always re-snapshot after navigation, modal open/close, or mutating actions. Use `--snapshot-after` on click/fill to combine action + snapshot.
- `snapshot --interactive` can return `js_error` on complex pages — fall back to `get text body` or `get html body` for content extraction.
- `browser open` targets the workspace of the calling terminal (via `$CMUX_WORKSPACE_ID`), even if a different workspace is currently focused. Use `--workspace` to override.
- `goto` and `navigate` are aliases — both work for same-surface navigation.

## Troubleshooting

### `js_error` on `snapshot --interactive` or `eval`

Some complex pages can reject the JavaScript used for rich snapshots.

Recovery:

```bash
cmux browser surface:7 get url
cmux browser surface:7 get text body
cmux browser surface:7 get html body
```

- Use `get url` first to confirm the page actually navigated.
- Fall back to `get text body` or `get html body` when `snapshot --interactive` returns `js_error`.
- If the page is still failing, navigate to a simpler intermediate page, then retry.
