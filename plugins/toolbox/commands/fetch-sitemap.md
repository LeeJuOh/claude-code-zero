---
description: Extract URLs from an XML sitemap with optional regex filtering
allowed-tools: Bash(curl *)
argument-hint: <url> [pattern]
disable-model-invocation: true
---

# Fetch Sitemap URLs

Extract URLs from an XML sitemap with optional regex filtering.

## Arguments

- `$0`: URL (required, must start with `http://` or `https://`)
  - If the URL ends with `.xml`, use it directly as the sitemap URL (backward compatible)
  - Otherwise, run the auto-discovery logic below
- `$1`: an extended regex pattern for filtering (optional)

If `$0` is empty, display the usage below and stop:

```
Usage: /fetch-sitemap <url> [pattern]

Examples:
  /fetch-sitemap https://kotlinlang.org/docs
  /fetch-sitemap https://example.com/sitemap.xml
  /fetch-sitemap https://example.com docs
  /fetch-sitemap https://example.com/sitemap.xml 'skills|hooks'
```

If `$0` does not start with `http://` or `https://`, inform the user that a valid URL is required and stop.

## Sitemap Auto-Discovery

When the URL does **not** end with `.xml`, automatically discover the sitemap by probing the following locations **one at a time, stopping as soon as one returns HTTP `200`** (do NOT run probes in parallel):

1. `{url}/sitemap.xml` — path-specific (e.g., `https://kotlinlang.org/docs/sitemap.xml`)
2. `{origin}/sitemap.xml` — site root (e.g., `https://kotlinlang.org/sitemap.xml`), where `{origin}` is the scheme + host of the URL
3. `{origin}/robots.txt` — fetch and parse for `Sitemap:` lines, use the first match

For each probe, check with:

```bash
curl -sfL --compressed --connect-timeout 5 --max-time 10 -o /dev/null -w '%{http_code}' <probe-url>
```

Use the first URL that returns HTTP `200`. If none of the probes succeed, report an error to the user and stop:

```
Could not auto-discover a sitemap for <url>. Try providing the direct sitemap XML URL instead.
```

When a sitemap is discovered (not passed directly), print which URL was found before proceeding:

```
Sitemap found: <discovered-url>
```

## Instructions

Run the following bash command to extract URLs from the sitemap:

```bash
curl -sfL --compressed --connect-timeout 10 --max-time 30 <sitemap-url> | grep -oE '<loc>[^<]+</loc>' | sed 's/<loc>//;s/<\/loc>//'
```

If a pattern is provided, pipe the result through `grep -E '<pattern>'` to filter:

```bash
curl -sfL --compressed --connect-timeout 10 --max-time 30 <sitemap-url> | grep -oE '<loc>[^<]+</loc>' | sed 's/<loc>//;s/<\/loc>//' | grep -E '<pattern>'
```

**curl flags explained:**
- `-s`: silent mode (no progress bar)
- `-f`: fail on HTTP errors (4xx/5xx) instead of returning the error page as content
- `-L`: follow redirects
- `--compressed`: handle gzip-compressed sitemaps
- `--connect-timeout 10`: connection timeout of 10 seconds
- `--max-time 30`: total operation timeout of 30 seconds

If the curl command fails (non-zero exit code), report the error clearly to the user (e.g., "Failed to fetch sitemap: connection timed out" or "Failed to fetch sitemap: HTTP 404").

## Output

1. Report the total number of URLs found first (include the filter pattern if one was used)
   - Example: "Found 47 URLs" or "Found 12 URLs matching pattern `en`"
2. Ask the user whether to save the results to a file
   - If yes: save to an appropriate filename (e.g., `sitemap-urls.txt`) and report the path
   - If no: display the URL list in a fenced code block. If there are more than 100 URLs, show only the first 50 and note the total count
3. If no URLs matched, inform the user that no results were found
4. If curl failed, report the error clearly (do not silently show "no results")

## Examples

- `/fetch-sitemap https://kotlinlang.org/docs` — auto-discover sitemap and list all URLs
- `/fetch-sitemap https://example.com/sitemap.xml` — use direct sitemap URL
- `/fetch-sitemap https://example.com docs` — auto-discover and filter URLs containing "docs"
- `/fetch-sitemap https://example.com/sitemap.xml 'skills|hooks'` — URLs matching "skills" or "hooks"
