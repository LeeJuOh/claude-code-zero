# Phase 5 — Model, effort, and shortcut selection

## Step 1: Present ALL model families per backend

For each probed backend's catalog, present the model list grouped by family. **Show every model family available in the probe results — do not filter by provider expectations.** The same model (e.g., `gpt-5.4`) can appear in multiple backends (Codex AND Copilot); show it in both. Filter out only:
- Embedding models (`text-embedding-*`)
- Internal router models (`accounts/*/routers/*`)
- Legacy models the user is unlikely to want (gpt-3.5, gpt-4, gpt-4o variants unless nothing newer exists)
- **Skill-managed `cc-*` aliases from prior runs.** With `fork: false` (default), VibeProxy replaces the upstream model name in its registry with the alias name, so the probe response surfaces entries like `cc-codex-gpt54-med` instead of (or alongside) the real `gpt-5.4`. Drop any model whose `id` is present in `discover.managed_model_aliases[].alias` — these are not real models and selecting them creates self-referential aliases. The real upstream models are still authoritative; reuse them by name.

Group into families:
- **Claude models** — `claude-opus-*`, `claude-sonnet-*`, `claude-haiku-*`
- **GPT models** — `gpt-5*` (skip gpt-4* and gpt-3* unless no gpt-5 exists)
- **Gemini models** — `gemini-*-pro-*`, `gemini-*-flash` (skip `*-lite` and `*-image` variants)
- **Other** — `grok-*`, `gpt-oss-*` (show but don't push)

Use one multi-select `AskUserQuestion` per backend with all families mixed in.

**Antigravity Gemini presets:** Antigravity exposes the same Gemini model (e.g., Gemini 3.1 Pro) under two names with different thinking intensity presets: `gemini-3.1-pro-high` (aggressive thinking) and `gemini-3.1-pro-low` (conservative thinking). These are **not separate models** — present them as one model with a preset sub-selection:

- Show "Gemini 3.1 Pro" once, with preset options (high / low / both)
- If only one preset selected: alias is `cc-gravity-g31pro-{effort}` (no preset suffix)
- If both presets selected: aliases are `cc-gravity-g31pro-hi-{effort}` / `cc-gravity-g31pro-lo-{effort}`

## Step 2: Auto-detect and present effort variants

Effort variants are NOT separate models in `/v1/models` — they are constructed by appending a parenthesized suffix to the base model name at request time (e.g., `gpt-5.4(high)`). Detection uses two sources:

1. **Probe data** — each model with `"thinking": true` in the probe output supports effort suffixes
2. **Effort levels map** — read `${CLAUDE_PLUGIN_ROOT}/skills/setup-aliases/references/effort-levels.md` for the full per-model, per-backend effort levels table

**Pre-filter — skip budget-based models:** Before running detection, check the effort levels map for any model marked "budget-based (no discrete levels)" (e.g., Antigravity's `claude-opus-4-6-thinking`, `claude-sonnet-4-6`). These use numeric budget suffixes (e.g., `claude-opus-4-6-thinking(16384)`), not discrete effort levels. **Exclude them from effort selection entirely** — present as base models only, even if `thinking: true` in probe data. Do not show effort UI for them.

**Detection logic (remaining models only):**

1. For each selected model, check if `thinking: true` in probe data
2. If yes, look up the model ID + backend token in the effort levels map. **Normalize dots/hyphens before lookup** — Copilot uses dots (`claude-opus-4.6`) while direct API uses hyphens (`claude-opus-4-6`). The map uses dots for Copilot IDs and hyphens for Antigravity/Gemini IDs, matching how each backend reports them in `/v1/models`. If a probe returns a variant not in the map, try the other format before declaring a miss.
3. **Map hit** → automatically present the levels as a multi-select `AskUserQuestion`
4. **Map miss** (model has `thinking: true` but not in map after both formats tried) → tell the user: "This model supports effort levels but the available levels are unknown. What levels do you want to configure?" and let the user specify
5. If `thinking` is absent or false → no effort variants, use base model name as-is

**Do not skip effort detection.** If a non-budget-based model has `thinking: true`, always present effort selection — do not silently create only the base model alias.

## Step 3: Build canonical alias names

Map each selected model+effort combination to a canonical alias name:

`cc-<backend-token>-<model-token>[-<effort>]`

**Backend token table:**

| `authenticated_backends[].token` | alias token |
| --- | --- |
| `codex` | `codex` |
| `copilot` | `copilot` |
| `gravity` | `gravity` |
| `gemini` | `gemini` |
| `qwen` | `qwen` |
| `zai` | `zai` |

**Model token rules:** Strip dots from version numbers but **preserve hyphens between semantic segments**:
- `gpt-5.4` → `gpt54`
- `claude-opus-4.6` → `opus46`
- `claude-sonnet-4.6` → `sonnet46`
- `gemini-2.5-pro` → `gemini25-pro`  (preserve `-pro` as semantic qualifier)
- `gemini-3.1-pro-high` → `gemini31-pro`  (drop `-high`/`-low` — those go in effort slot or are baked in)
- `claude-opus-4-6-thinking` → `opus46`  (drop `-thinking` — implicit in antigravity)

**Effort tokens:** `low`, `med`, `high`, `max` (maps from `xhigh` → `max`).

**Effort value mapping (alias token → params value for `payload.override`):**

| Alias token | `reasoning.effort` value |
| --- | --- |
| `low` | `low` |
| `med` | `medium` |
| `high` | `high` |
| `max` | `xhigh` |

For each effort-suffix alias, attach an `effort_value` field so Phase 8 can build the matching `payload.override` block. Base-model aliases (no effort token) get no `effort_value` and no override. The translator's default is `effort=medium` — without a server-side override, callers that bypass the shell alias (IDE direct, scripts not setting `ANTHROPIC_MODEL`) silently drop to medium regardless of the alias name.

**Protocol mapping (backend + model family → `payload.override` protocol):**

| Backend | Model family | Protocol | Status |
| --- | --- | --- | --- |
| `codex` | gpt-5.x | `codex` | byte-level verified (research §9.2) |
| `copilot` | gpt-5.x | `codex` | shares codex executor — first-use validation |
| `copilot` | claude-opus / claude-sonnet | `claude` | claude executor — first-use validation |
| `gravity`, `gemini`, `qwen`, `zai` | any | (no override) | shell-suffix only; server override out of scope |

For backends outside scope B (gravity, gemini, qwen, zai), do NOT emit `payload.override` blocks even if the model has discrete effort levels — that path is unverified.

**`fork` field:** Omit the `fork` field (defaults to `false`). With `fork: false`, VibeProxy replaces the original model name in its registry with the alias name — the alias name itself becomes the routable model name. Only set `fork: true` if the user explicitly needs both the original model name and the alias to coexist as separate routes.

**`request_model` field:** Always set `request_model` to the alias name — never the original upstream model name. With `fork: false` (default), the original name no longer exists in VibeProxy's registry, so sending it will fail with "unknown provider". For effort-suffix models, append the `(level)` suffix to the alias name inside `request_model` itself — `write_zshrc.sh` plugs the value verbatim into `ANTHROPIC_MODEL=`, so the suffix must already be there.

- Base model: `request_model = cc-gravity-opus46` → shell sends `ANTHROPIC_MODEL=cc-gravity-opus46`
- Effort model: `request_model = cc-codex-gpt54-med(medium)` → shell sends `ANTHROPIC_MODEL=cc-codex-gpt54-med(medium)`

The `model` field preserves the upstream name for documentation only. `request_model` is what the shell actually sends and what validation tests. For codex/copilot effort aliases the matching `payload.override` block also injects `reasoning.effort` server-side; the shell suffix is redundant safety, not a substitute. For gravity/gemini/qwen/zai there is no override — the suffix is the only effort signal.

## Step 4: Shortcut aliases (auto-generated)

Shortcuts are automatically generated from a fixed convention — **do not ask the user via `AskUserQuestion`**. Shortcuts are shell-level aliases whose target is the canonical alias name. Never make a shortcut the canonical name.

**Convention:** `cc-{2char-backend}-{model}-{effort}`

| Backend | 2-char token |
| --- | --- |
| codex | `cx` |
| copilot | `cp` |
| gravity (Antigravity) | `ag` |
| gemini | `gm` |
| qwen | `qw` |
| zai | `za` |

**Model token:** Version-free latest model name — `opus`, `sonnet`, `gpt`, `gemini-pro` (not `g31pro`).

**Examples:**

| Shortcut | Canonical | Description |
| --- | --- | --- |
| `cc-cx-gpt-med` | `cc-codex-gpt54-med` | Codex gpt-5.4 medium |
| `cc-cp-opus-high` | `cc-copilot-opus46-high` | Copilot opus 4.6 high |
| `cc-cp-sonnet-low` | `cc-copilot-sonnet46-low` | Copilot sonnet 4.6 low |
| `cc-cp-gpt-max` | `cc-copilot-gpt54-max` | Copilot gpt-5.4 xhigh |
| `cc-ag-opus` | `cc-gravity-opus46` | Antigravity opus (budget-based, no effort) |
| `cc-ag-gemini-pro-low` | `cc-gravity-g31pro-low` | Antigravity Gemini 3.1 Pro low |
| `cc-gm-gemini-pro-low` | `cc-gemini-g31pro-low` | Gemini 3.1 Pro preview low |

Generate shortcuts for every canonical alias. If a shortcut collides with another shortcut or canonical alias, skip it and log a warning.
