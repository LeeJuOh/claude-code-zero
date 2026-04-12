# Video Recording

Status and alternatives for capturing browser automation evidence in cmux.

## Current Status

`cmux browser` does not expose a built-in video recording command.

Why: cmux browser automation runs on WKWebView, and agent-browser style recording is Chrome/CDP-specific.

## Recommended Alternatives

### 1. Step Screenshots

```bash
cmux browser surface:7 screenshot > /tmp/step1.b64
cmux browser surface:7 click e3 --snapshot-after --json
cmux browser surface:7 screenshot > /tmp/step2.b64
```

### 2. Snapshot Timeline

```bash
cmux browser surface:7 snapshot --interactive > /tmp/snap-1.txt
cmux browser surface:7 click e3 --snapshot-after --json > /tmp/action-1.json
cmux browser surface:7 snapshot --interactive > /tmp/snap-2.txt
```

### 3. macOS Window Capture (external)

Use an external screen recorder if full-motion capture is required.

## Best Practices

1. Capture snapshot before and after each mutating action.
2. Add `--snapshot-after` on clicks/fills/types that change state.
3. Keep artifacts grouped by timestamp/run id.
