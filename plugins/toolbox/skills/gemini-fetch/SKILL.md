---
name: gemini-fetch
description: Fetch web content from URLs using Gemini CLI when WebFetch fails or is blocked (403, rate-limited, bot-blocked sites). Use on "unable to fetch" errors or when user asks to fetch via Gemini.
allowed-tools: Bash(gemini *)
argument-hint: <url> [instruction]
---

# Gemini Fetch

Fetch web content from URLs that Claude Code's WebFetch can't access, using Gemini CLI as a proxy.

## How this skill is invoked

**Manual** (`/gemini-fetch <url> [instruction]`): URL comes from `$0`, optional instruction from `$1`.

**Auto-trigger** (WebFetch failure): The skill body is loaded as context. Extract the target URL from the conversation (the URL that WebFetch failed on) and any user instruction, then build the command yourself.

### Manual usage examples

```
/gemini-fetch https://www.reddit.com/r/ClaudeAI/hot
/gemini-fetch https://www.reddit.com/r/ClaudeAI/hot "list top 10 post titles with scores"
/gemini-fetch https://example.com/blocked-page "extract the main content as markdown"
```

If manually invoked without a URL, display the examples above and stop.

## Execution

Build and run the following command:

```bash
gemini -y -p "<prompt>" -o text 2>/dev/null
```

### Prompt construction

**Important:** Escape the URL for shell safety. Replace any single quotes in the URL with `'\''` before embedding it in the prompt.

If an instruction is provided:

```
Use run_shell_command to run: curl -sL -H 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' '<escaped-url>'
Then from the fetched content: <instruction>
```

If no instruction is provided:

```
Use run_shell_command to run: curl -sL -H 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' '<escaped-url>'
Then convert the fetched HTML to clean, readable markdown. Preserve structure (headings, lists, links, code blocks). Remove navigation, ads, footers, and boilerplate. Return only the main content.
```

### Timeout

Set a Bash timeout of 90 seconds (`timeout: 90000`). Gemini CLI startup + model invocation takes time.

## Output

Present the fetched content directly to the user. Do not add wrapper commentary — just show what Gemini returned.

If the output contains error messages (e.g., "503", "quota exceeded", "model unavailable"), report the error and suggest:
1. Retry after a moment
2. Try with a different instruction
3. Use the Reddit JSON API fallback if the URL is Reddit (see `/reddit-fetch` if available)

## Gotchas

- **Always use `-y` flag**: Without it, Gemini can't use `run_shell_command` and falls back to `google_web_search`, which returns search results instead of the actual page content.
- **`-o text` is essential**: Without it, output includes ANSI escape codes and interactive UI elements that pollute the result.
- **Stderr noise**: Gemini CLI prints keychain warnings and skill conflicts to stderr. `2>/dev/null` discards all of it cleanly.
- **Single quotes in URLs**: The curl command is wrapped in single quotes. If the URL itself contains `'`, replace each with `'\''` before embedding (standard shell escaping).
- **Rate limits**: Gemini CLI uses Google API quota. If you get quota errors, wait a minute before retrying.
- **Cloudflare-protected sites**: Sites like Medium use Cloudflare JS challenges that block curl even inside Gemini. Gemini will automatically fall back to `google_web_search` and reconstruct content from cached/mirrored sources. The result is accurate but may not be the exact original HTML — this is expected and usually good enough.
- **Not for bulk fetching**: Each invocation starts a new Gemini process. For multiple URLs, consider batching them in one prompt rather than calling this skill repeatedly.
