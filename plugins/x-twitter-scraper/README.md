# x-twitter-scraper

> Xquik workflow guidance for public X/Twitter data, monitors, REST API usage, and remote MCP setup.

## Why

X/Twitter data tasks get messy fast: account handles, post IDs, keyword windows, API keys, monitors, and webhooks all need different setup. This plugin gives Claude Code a focused Xquik workflow skill so it can choose the narrowest public-data path, keep credentials out of output, and turn broad social-data requests into concrete REST or MCP steps.

## Quick Start

```shell
/plugin install x-twitter-scraper@claude-code-zero
/plugin enable x-twitter-scraper@claude-code-zero
```

Store your Xquik API key in your local secret store or an environment variable before making authenticated requests.

## Skill

| Skill | Description |
|-------|-------------|
| `x-twitter-scraper` | Plan Xquik REST API, remote MCP, search, profile lookup, monitoring, export, and webhook workflows |

## Usage

```text
Use x-twitter-scraper to plan a monitor for this X keyword.
Use x-twitter-scraper to fetch profile data through Xquik MCP.
Use x-twitter-scraper to design a webhook workflow for new posts.
```

## Links

- [Xquik](https://xquik.com)
- [Xquik Docs](https://docs.xquik.com)
- [x-twitter-scraper](https://github.com/Xquik-dev/x-twitter-scraper)

## License

MIT
