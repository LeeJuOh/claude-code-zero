---
description: Extract URLs from an XML sitemap with optional regex filtering
allowed-tools: Bash(curl *)
argument-hint: <sitemap-url> [pattern]
---

# Fetch Sitemap URLs

Extract URLs from an XML sitemap with optional regex filtering.

## Arguments

Parse `$ARGUMENTS` as: `<sitemap-url> [pattern]`

- First argument: the sitemap XML URL (required, must start with `http://` or `https://`)
- Second argument: an extended regex pattern for filtering (optional)

If no arguments are provided, display the usage below and stop:

```
Usage: /fetch-sitemap <sitemap-url> [pattern]

Examples:
  /fetch-sitemap https://example.com/sitemap.xml
  /fetch-sitemap https://example.com/sitemap.xml en
  /fetch-sitemap https://example.com/sitemap.xml 'skills|hooks'
```

If the URL does not start with `http://` or `https://`, inform the user that a valid URL is required and stop.

## Instructions

Run the following bash command to extract URLs from the sitemap:

```bash
curl -sfL --compressed --connect-timeout 10 --max-time 30 <sitemap-url> | grep '<loc>' | sed 's/.*<loc>\(.*\)<\/loc>.*/\1/'
```

If a pattern is provided, pipe the result through `grep -E '<pattern>'` to filter:

```bash
curl -sfL --compressed --connect-timeout 10 --max-time 30 <sitemap-url> | grep '<loc>' | sed 's/.*<loc>\(.*\)<\/loc>.*/\1/' | grep -E '<pattern>'
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

- `/fetch-sitemap https://example.com/sitemap.xml` — list all URLs
- `/fetch-sitemap https://example.com/sitemap.xml en` — URLs containing "en"
- `/fetch-sitemap https://example.com/sitemap.xml 'skills|hooks'` — URLs matching "skills" or "hooks"
