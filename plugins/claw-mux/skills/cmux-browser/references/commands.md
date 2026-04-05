# Command Reference (cmux Browser)

Maps common browser automation patterns to `cmux browser` commands.

## Core Command Groups

### Navigation

```bash
cmux browser open <url>                        # opens in caller's workspace (uses CMUX_WORKSPACE_ID)
cmux browser open <url> --workspace <id|ref>   # opens in a specific workspace
cmux browser <surface> goto|navigate <url>     # goto and navigate are aliases
cmux browser <surface> back|forward|reload
cmux browser <surface> get url|title
```

> **Workspace context:** `browser open` targets the workspace of the terminal where the command is run (via `CMUX_WORKSPACE_ID`), even if a different workspace is currently focused. Use `--workspace` to override.

### Snapshot and Inspection

```bash
cmux browser <surface> snapshot --interactive
cmux browser <surface> snapshot --interactive --compact --max-depth 3
cmux browser <surface> snapshot --selector "form#checkout" --interactive  # scope to element
cmux browser <surface> get text body
cmux browser <surface> get html body
cmux browser <surface> get value "#email"
cmux browser <surface> get attr "#email" --attr placeholder
cmux browser <surface> get count ".row"
cmux browser <surface> get box "#submit"
cmux browser <surface> get styles "#submit" --property color
cmux browser <surface> eval '<js>'
```

### Element Finding

Alternative to snapshot refs — find elements by semantic attributes:

```bash
cmux browser <surface> find role "button"
cmux browser <surface> find text "Submit"
cmux browser <surface> find label "Email address"
cmux browser <surface> find placeholder "Enter email"
cmux browser <surface> find testid "submit-btn"
cmux browser <surface> find first "li.item"
cmux browser <surface> find last "li.item"
cmux browser <surface> find nth "li.item" 3
```

### State Checking

```bash
cmux browser <surface> is visible <selector-or-ref>
cmux browser <surface> is enabled <selector-or-ref>
cmux browser <surface> is checked <selector-or-ref>
```

### Interaction

```bash
cmux browser <surface> click|dblclick|hover|focus <selector-or-ref>
cmux browser <surface> fill <selector-or-ref> [text]   # empty text clears
cmux browser <surface> type <selector-or-ref> <text>
cmux browser <surface> press|keydown|keyup <key>
cmux browser <surface> select <selector-or-ref> <value>
cmux browser <surface> check|uncheck <selector-or-ref>
cmux browser <surface> scroll [--selector <css>] [--dx <n>] [--dy <n>]
cmux browser <surface> scroll-into-view <selector-or-ref>
```

### Wait

```bash
cmux browser <surface> wait --selector "#ready" --timeout-ms 10000
cmux browser <surface> wait --text "Done" --timeout-ms 10000
cmux browser <surface> wait --url-contains "/dashboard" --timeout-ms 10000
cmux browser <surface> wait --load-state complete --timeout-ms 15000
cmux browser <surface> wait --function "document.readyState === 'complete'" --timeout-ms 10000
```

### Frames and Dialogs

```bash
# iframe navigation
cmux browser <surface> frame "iframe[name='checkout']"
cmux browser <surface> frame main                       # return to top-level

# dialog handling (alerts, confirms, prompts)
cmux browser <surface> dialog accept
cmux browser <surface> dialog accept "response text"
cmux browser <surface> dialog dismiss
```

### Session/State

```bash
cmux browser <surface> cookies get|set|clear ...
cmux browser <surface> storage local|session get|set|clear ...
cmux browser <surface> tab list|new|switch|close ...
cmux browser <surface> state save|load <path>
```

### Diagnostics

```bash
cmux browser <surface> console list|clear
cmux browser <surface> errors list|clear
cmux browser <surface> highlight <selector>
cmux browser <surface> screenshot [--out /path/to/file.png]
cmux browser <surface> download wait --timeout-ms 10000
```

### JavaScript Injection

```bash
cmux browser <surface> eval '<js>'
cmux browser <surface> addinitscript '<js>'    # runs on every page load
cmux browser <surface> addscript '<js>'
cmux browser <surface> addstyle '<css>'
```

## Agent Reliability Tips

- Use `--snapshot-after` on mutating actions to return a fresh post-action snapshot.
- Re-snapshot after navigation, modal open/close, or major DOM changes.
- Prefer short handles in outputs by default (`surface:N`, `pane:N`, `workspace:N`, `window:N`).
- Use `--id-format both` only when a UUID must be logged/exported.

## Known WKWebView Gaps (`not_supported`)

- `browser.viewport.set`
- `browser.geolocation.set`
- `browser.offline.set`
- `browser.trace.start|stop`
- `browser.network.route|unroute|requests`
- `browser.screencast.start|stop`
- `browser.input_mouse|input_keyboard|input_touch`
