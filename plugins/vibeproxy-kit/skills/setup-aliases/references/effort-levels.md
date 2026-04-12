# Effort Levels by Model and Backend

Effort variants are NOT separate models in `/v1/models` — they are constructed by appending a parenthesized suffix to the base model name at request time (e.g., `gpt-5.4(high)`).

## Codex / Copilot Backends

| Model ID | Levels (codex) | Levels (copilot) |
|---|---|---|
| `gpt-5` | `minimal`, `low`, `medium`, `high` | `low`, `medium`, `high` |
| `gpt-5.1` | `none`, `low`, `medium`, `high` | `none`, `low`, `medium`, `high` |
| `gpt-5.2` | `none`, `low`, `medium`, `high`, `xhigh` | `none`, `low`, `medium`, `high`, `xhigh` |
| `gpt-5.4` | `low`, `medium`, `high`, `xhigh` | `none`, `low`, `medium`, `high`, `xhigh` |
| `gpt-5.4-mini` | `low`, `medium`, `high`, `xhigh` | `none`, `low`, `medium`, `high`, `xhigh` |
| `claude-opus-4.6` | — | `low`, `medium`, `high` |
| `claude-sonnet-4.6` | — | `low`, `medium`, `high` |
| `claude-sonnet-4.5` | — | `low`, `medium`, `high` |
| `claude-opus-4.5` | — | `low`, `medium`, `high` |

## Antigravity / Gemini Backends

| Model ID | Levels (antigravity) | Levels (gemini-cli) |
|---|---|---|
| `claude-opus-4-6-thinking` | budget-based (no discrete levels) | — |
| `claude-sonnet-4-6` | budget-based (no discrete levels) | — |
| `gemini-3.1-pro-high` | `low`, `medium`, `high` | — |
| `gemini-3.1-pro-low` | `low`, `medium`, `high` | — |
| `gemini-3-pro-high` | `low`, `high` | — |
| `gemini-3-pro-low` | `low`, `high` | — |
| `gemini-3.1-pro-preview` | — | `low`, `medium`, `high` |
| `gemini-3-pro-preview` | — | `low`, `high` |

## Notes

- Copilot uses dots in model IDs (`claude-opus-4.6`), Antigravity/Gemini use hyphens (`claude-opus-4-6`). Normalize before lookup.
- Antigravity models with budget-based thinking (no discrete levels) use numeric budget suffixes (e.g., `claude-opus-4-6-thinking(16384)`), not effort levels. Present them as base models without effort selection.
- If a probe returns a model with `thinking: true` that is not in this table (after normalizing both dot/hyphen formats), surface it to the user and let them specify levels manually.
