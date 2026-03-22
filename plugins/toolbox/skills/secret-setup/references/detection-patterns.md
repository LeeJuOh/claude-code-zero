# Secret Detection Patterns

Regex patterns for scanning CLAUDE.md and project config for hardcoded secrets.

## Patterns

| Pattern | What it catches |
|---------|----------------|
| `sk-[a-zA-Z0-9_-]{20,}` | OpenAI / Anthropic API keys |
| `sk_(test\|live)_[a-zA-Z0-9]{20,}` | Stripe API keys |
| `(api[_-]?key\|api[_-]?secret\|access[_-]?token\|secret[_-]?key)\s*[:=]\s*["']?[A-Za-z0-9+/_.~-]{16,}` | Generic API key assignments |
| `(postgres\|postgresql\|mysql\|mongodb\|redis\|amqp\|rediss):\/\/[^\s"']+` | Database / message broker connection strings |
| `Bearer\s+[A-Za-z0-9._~+/=-]{20,}` | Bearer tokens |
| `(password\|passwd\|pwd)\s*[:=]\s*["']?[^\s"']{8,}` | Password assignments |
| `ghp_[A-Za-z0-9]{36,}\|github_pat_[A-Za-z0-9_]{22,}` | GitHub tokens |
| `xoxb-[0-9]+-[A-Za-z0-9]+\|xoxp-[0-9]+-[A-Za-z0-9]+` | Slack tokens |
| `AKIA[0-9A-Z]{16}` | AWS access key IDs |
| `[A-Za-z0-9/+=]{40}` | AWS secret access keys (flag only when adjacent to an AWS access key ID) |
| `https?://hooks\.slack\.com/[^\s"']+` | Slack webhook URLs |
| `[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}` | UUIDs (flag only if near key/token/secret context words) |

## Scan Targets

Search these files:

- `CLAUDE.md` (project root)
- `.claude/CLAUDE.md` (if exists)
- `.claude/settings.json` and `.claude/settings.local.json`
- Any `.claude/rules/*.md` files

## Notes

- Use Grep with each pattern against the scan targets.
- AWS secret keys (`[A-Za-z0-9/+=]{40}`) are high false-positive — only flag when adjacent to an `AKIA` access key ID.
- UUIDs are only suspicious when near context words like `key`, `token`, `secret`, `credential`.
- Present findings in a table with masked values so the user can confirm which are real secrets vs documentation examples.
