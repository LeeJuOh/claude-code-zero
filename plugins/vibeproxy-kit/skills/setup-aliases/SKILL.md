---
name: setup-aliases
description: "Discover, choose, and rewrite backend-specific VibeProxy cc-* aliases for Claude Code. Use when the user wants to set up, reset, reconfigure, inspect, or audit VibeProxy aliases for Codex, GitHub Copilot, Antigravity, Gemini, Qwen, or Z.AI GLM — including first-time setup, per-backend model selection, shortcut aliases, and rebuilding only the skill-managed pieces without clobbering manual edits."
allowed-tools:
  - Bash(bash *)
  - Bash(python3 *)
  - Bash(curl *)
  - Bash(mkdir *)
  - Bash(cp *)
  - Bash(mv *)
  - Bash(cat *)
  - Bash(rm *)
  - Bash(test *)
  - Bash(ls *)
  - Bash(source *)
  - Read
  - Write
---

# setup-aliases

State-aware orchestration for VibeProxy aliases. This skill owns exactly two surfaces:

1. the `vibeproxy-kit` managed block in `~/.zshrc`
2. the `oauth-model-alias` entries in `~/.cli-proxy-api/config.yaml` that it created

Everything else — unrelated YAML keys, unrelated shell aliases, user-authored alias entries — is preserved. The skill coordinates discovery, a guided per-backend probe cycle, writes, a VibeProxy restart gate, live validation, and transactional rollback on failure.

All five scripts in `${CLAUDE_PLUGIN_ROOT}/skills/setup-aliases/scripts/` emit JSON to stdout. Your job is to chain them together, surface decisions to the user via `AskUserQuestion`, and persist state to `${CLAUDE_PLUGIN_DATA}/config.json` before any write.

## Phase 1 — Discover

Run the read-only inspector and parse its JSON:

```bash
bash ${CLAUDE_PLUGIN_ROOT}/skills/setup-aliases/scripts/discover.sh > /tmp/vibeproxy_discover.json
```

Then read `/tmp/vibeproxy_discover.json`. Key fields:

- `vibeproxy_installed`, `vibeproxy_reachable` — see **Onboarding gates** below if either is false
- `user_overlay_exists`, `state_file_present` — determines whether we are first-run or rerun
- `authenticated_backends` — array of `{token, config_key, display_name, auth_files}`; see **Onboarding gates** below if empty or missing backends the user wants
- `claude_code_channel` — `{connected, account_count}`; see **Claude Code channel note** below
- `managed_shell_aliases`, `managed_model_aliases`, `shortcut_shell_aliases` — what the skill currently owns
- `backend_catalogs`, `partial_probe` — cached probe results and any aborted probe cycle
- `conflicts` — pre-existing `cc-*` entries that are not tracked in state (potential clashes)

Present a compact summary back to the user (do not dump raw JSON):

```
VibeProxy: installed ✓ | reachable ✓
Authenticated backends: codex, copilot, gravity, gemini (4/4)
Claude Code channel: not connected
Currently managed: 3 model aliases, 4 shell aliases, 1 shortcut
Manual conflicts detected: 0
State file: present (last probe 2 days ago)
```

If `partial_probe` is non-null, tell the user a previous run aborted mid-cycle and offer to resume or restart.

### Claude Code channel note

If `claude_code_channel.connected` is `false`, append the following informational note after the summary. This is **not a gate** — setup continues regardless.

> ℹ **Claude Code channel is not connected in VibeProxy.**
> Alias models work normally for main conversations. However, when `ANTHROPIC_BASE_URL` points to the proxy, Claude Code's internal requests also go through it — session title generation, `/advisor`, and sub-agents with `model: haiku/sonnet` all use raw Anthropic model IDs that have no matching provider in the proxy.
>
> Without the Claude Code channel, these internal calls will fail silently. Main conversations using alias models are not affected.
>
> VibeProxy's documentation notes that routing requests through OAuth tokens may carry account risk. Review their documentation before connecting any provider: https://github.com/automazeio/vibeproxy
>
> Note: The OAuth login flow uses port 3000 for the callback — if a dev server is running on that port, the login will fail silently.

If `claude_code_channel.connected` is `true`, show `Claude Code channel: connected (N accounts)` in the summary and skip the note.

### Onboarding gates

These gates run before Phase 2. If the user is fully set up (VibeProxy installed, running, and at least one backend authenticated), skip straight to Phase 2.

**Gate 1 — VibeProxy not installed** (`vibeproxy_installed: false`)

Tell the user:

> VibeProxy is not installed. It's a local HTTP proxy that lets Claude Code use models from Codex, GitHub Copilot, Antigravity, Gemini, Qwen, and Z.AI GLM through a unified endpoint.
>
> Install it from: **https://github.com/automazeio/vibeproxy** (macOS only)
>
> After installing, launch VibeProxy from `/Applications/VibeProxy.app` and come back here.

Stop here. Do not proceed to Phase 2.

**Gate 2 — VibeProxy not reachable** (`vibeproxy_installed: true`, `vibeproxy_reachable: false`)

Tell the user:

> VibeProxy is installed but not running. Launch it from the Applications folder or menu bar, then re-run `/setup-aliases`.

Stop here.

**Gate 3 — No authenticated backends** (`authenticated_backends` is empty)

Tell the user which backends are available and how to authenticate each one. Instruct them to authenticate **all** backends they subscribe to before coming back — not just one. The probe cycle configures backends one at a time, but authentication should be done upfront for all of them so the user doesn't have to re-run the skill each time they want to add another backend.

> No backends are authenticated yet. VibeProxy supports these providers — each requires a paid subscription:
>
> | Backend | How to authenticate |
> |---------|---------------------|
> | **Codex** | Settings → Codex → Connect (OAuth) |
> | **GitHub Copilot** | Settings → GitHub Copilot → Connect (OAuth) |
> | **Antigravity** | Settings → Antigravity → Connect (OAuth) |
> | **Gemini** | **CLI login required** (see below) |
> | **Qwen** | Settings → Qwen → Connect (OAuth) |
> | **Z.AI GLM** | Settings → Z.AI GLM → Add Account (API key) |
>
> Open VibeProxy Settings from the menu bar icon and authenticate **every backend you subscribe to**, then re-run `/setup-aliases`.
>
> **Gemini OAuth workaround:** The VibeProxy GUI cannot complete Gemini authentication — the OAuth flow succeeds in the browser but the account silently fails to register ([GitHub #286](https://github.com/automazeio/vibeproxy/issues/286), [#242](https://github.com/automazeio/vibeproxy/issues/242)). Use the CLI instead:
>
> ```bash
> /Applications/VibeProxy.app/Contents/Resources/cli-proxy-api-plus \
>   -login --config /Applications/VibeProxy.app/Contents/Resources/config.yaml
> ```
>
> When prompted for login mode, choose **1 (Code Assist)** for GCP projects or **2 (Google One)** for personal Google One AI Premium subscriptions. After CLI login completes, VibeProxy will detect the new auth file automatically.

Stop here.

**Gate 4 — Missing backends the user wants** (some backends authenticated, user asks about others)

If the user mentions a specific backend that is not in `authenticated_backends`, tell them:

> `<backend>` is not authenticated yet. Open the VibeProxy menu bar → `<display_name>` → Sign in. Once authenticated, re-run `/setup-aliases` and it will appear in the backend list.

This gate does not block — continue to Phase 2 with the backends that are available, but surface the gap so the user knows.

## Phase 2 — Warn, then pick a mode

Before asking for the mode, note that the probe cycle will temporarily toggle backends in the VibeProxy menu bar. Active `claude` sessions may route through a different provider while backends are toggled. Recommend running this skill when they are not mid-work.

Then ask via `AskUserQuestion`:

- **Keep** — inspect and report, no changes
- **Merge update** — preserve current setup, apply incremental changes (may reuse cached catalogs ≤ 7 days old)
- **Reset and reconfigure** — remove only skill-managed aliases and shell block, rebuild from scratch (always re-probes)

If the user chooses Keep, print the summary in more detail (including the currently managed canonical aliases and their models) and stop. No writes.

## Phase 3 — Backend selection

From `authenticated_backends`, ask the user via `AskUserQuestion` which backends they want to configure this run. Multi-select. Skip any backend that has no auth file — those are unreachable even if the user picks them.

## Phase 4 — Probe cycle

This is the most interaction-heavy phase. For each selected backend, in sequence:

1. **Reuse cache?** In Merge mode, if `backend_catalogs[<token>].probed_at` is within 7 days, offer the user the option to reuse instead of re-probing. Reset mode always re-probes. The user may override with "force refresh".
2. **Toggle prompt.** Use `AskUserQuestion` to tell the user: *"In the VibeProxy menu bar, disable all backends except `<display_name>`. Click done when only `<display_name>` is active."* Wait for explicit confirmation. **Do not** require a full quit-and-relaunch upfront — a menu bar toggle is sufficient in most cases. If the verify step (step 5) returns `reject` due to stale state, escalate to a full restart (see step 5).
3. **Probe.** Run `bash ${CLAUDE_PLUGIN_ROOT}/skills/setup-aliases/scripts/probe_backend.sh <token> > /tmp/vibeproxy_probe_<token>.json`
4. **Verify.** Run `python3 ${CLAUDE_PLUGIN_ROOT}/skills/setup-aliases/scripts/verify_probe.py --claimed <token> --claimed-channel-key <config_key> --all-channel-keys <comma-sep-list-of-all-authenticated-channel-keys> --probe-output /tmp/vibeproxy_probe_<token>.json > /tmp/vibeproxy_verify_<token>.json`
5. **Act on verdict.**
   - `pass` — accept this backend's catalog
   - `warn` — Layer 2 saw `unknown_signatures`; surface the specific model IDs to the user and ask whether to trust them before accepting
   - `reject` — show the `reason` from the verify output verbatim. On first rejection, escalate to a full restart: *"The menu bar toggle didn't refresh the registry. Quit VibeProxy completely, then relaunch with only `<display_name>` enabled."* Wait for confirmation, then loop back to step 3 (re-probe). Do **not** accept a rejected probe under any circumstance.
6. **Persist partial probe on abort.** If the user aborts the cycle, write any completed backend catalogs into `${CLAUDE_PLUGIN_DATA}/config.json` under `partial_probe` with a timestamp, then exit cleanly. The next invocation will offer to resume.

After all selected backends are probed, tell the user: *"Probing complete. Re-enable all the backends you just probed — turn every toggle back on in the VibeProxy menu bar."* Wait for confirmation before continuing to model selection.

## Phase 5 — Model, effort, and shortcut selection

### Step 1: Present ALL model families per backend

For each probed backend's catalog, present the model list grouped by family. **Show every model family available in the probe results — do not filter by provider expectations.** The same model (e.g., `gpt-5.4`) can appear in multiple backends (Codex AND Copilot); show it in both. Filter out only:
- Embedding models (`text-embedding-*`)
- Internal router models (`accounts/*/routers/*`)
- Legacy models the user is unlikely to want (gpt-3.5, gpt-4, gpt-4o variants unless nothing newer exists)

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

### Step 2: Auto-detect and present effort variants

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

### Step 3: Build canonical alias names

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

**`fork` field:** Omit the `fork` field (defaults to `false`). With `fork: false`, VibeProxy replaces the original model name in its registry with the alias name — the alias name itself becomes the routable model name. Only set `fork: true` if the user explicitly needs both the original model name and the alias to coexist as separate routes.

**`request_model` field:** Always set `request_model` to the alias name — never the original upstream model name. With `fork: false` (default), the original name no longer exists in VibeProxy's registry, so sending it will fail with "unknown provider". For effort-suffix models, the shell alias appends the effort suffix to the alias name:

- Base model: `request_model = cc-gravity-opus46` → shell sends `ANTHROPIC_MODEL=cc-gravity-opus46`
- Effort model: `request_model = cc-codex-gpt54-med` → shell sends `ANTHROPIC_MODEL=cc-codex-gpt54-med(medium)`

The `model` field preserves the upstream name for documentation only. `request_model` is what the shell actually sends and what validation tests.

### Step 4: Shortcut aliases (auto-generated)

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

## Phase 6 — Conflict resolution and migration

### First-run migration

When `state_file_present` is false and `conflicts` is non-empty, the user has pre-existing manual `cc-*` aliases that predate this skill. Before treating them as conflicts, offer a migration path:

1. Analyze each conflict entry — extract the model name and effort level from the existing alias definition in the zshrc backup (the old `ANTHROPIC_MODEL=...` value).
2. Present a summary: "You have N existing manual cc-* aliases. Would you like to migrate them into skill management? Migrated aliases will be recreated as shortcuts pointing to the new canonical names."
3. For each manual alias the user wants to migrate, create a shortcut alias mapping the old name to the new canonical name (e.g., `cc-codex-high` → `cc-codex-gpt54-high`). The old manual definition will be replaced by the managed block.
4. Manual aliases the user does NOT want to migrate remain as conflicts — handle per the conflict resolution below.

### Conflict resolution

From Phase 1's `conflicts` array (minus any migrated aliases) plus any new name collisions you can predict against the computed canonical aliases, ask the user per conflict via `AskUserQuestion`:

- Replace the pre-existing entry with the skill-managed version
- Rename the canonical alias to avoid the collision
- Skip this backend/model combination

Never silently overwrite a conflict.

## Phase 7 — Final review and confirm

Show the user a complete change summary before any write:

- canonical aliases to add (channel, model name, alias)
- shortcut aliases to add
- skill-managed entries to remove (from prior state)
- manual entries that will be preserved untouched
- backup paths that will be created under `${CLAUDE_PLUGIN_DATA}/backups/`

Wait for explicit "yes, apply" via `AskUserQuestion`. Any other answer is a no-op exit.

## Phase 8 — Persist state, then write files

Order matters. Write the state file **first** so a crash between steps leaves `${CLAUDE_PLUGIN_DATA}/config.json` consistent with what the user approved.

1. Write `${CLAUDE_PLUGIN_DATA}/config.json` with the new `managed_shell_aliases`, `managed_model_aliases`, `shortcut_shell_aliases`, the full `backend_catalogs` (including cached probes we did not refresh this run), and `partial_probe: null`.
2. Run `write_user_config.py` via bash heredoc. Capture `backup_path` from its JSON output. If `ok: false`, stop and report — no further writes.
3. Run `write_zshrc.sh`. Capture `backup_path` from its JSON output. If it fails, rollback `config.yaml` from its backup path before reporting.

```bash
cat <<JSON | python3 ${CLAUDE_PLUGIN_ROOT}/skills/setup-aliases/scripts/write_user_config.py
{"mode":"merge","config_path":"~/.cli-proxy-api/config.yaml","backup_dir":"${CLAUDE_PLUGIN_DATA}/backups","prior_managed_aliases":[...],"managed_aliases":[...]}
JSON
```

```bash
cat <<JSON | bash ${CLAUDE_PLUGIN_ROOT}/skills/setup-aliases/scripts/write_zshrc.sh
{"mode":"merge","zshrc_path":"~/.zshrc","backup_dir":"${CLAUDE_PLUGIN_DATA}/backups","proxy_url":"http://localhost:8318","canonical_aliases":[...],"shortcut_aliases":[...]}
JSON
```

## Phase 9 — Restart gate

`~/.cli-proxy-api/merged-config.yaml` is regenerated only when VibeProxy launches. Validation before the restart will read a stale routing table and produce false negatives. Use `AskUserQuestion` with these exact steps:

1. Quit VibeProxy completely from the menu bar
2. Relaunch VibeProxy
3. Enable **all** the backends you configured aliases for — turn every toggle on
4. Click done when all configured backends are active

Do not skip this step. Do not proceed to validation before the user confirms.

## Phase 10 — Per-alias validation

Each validation call sends a real (billable) inference request. If the user has many aliases, warn them about the per-alias cost before proceeding.

**Critical: use the `request_model` value — the same model name the shell alias sends.** With `fork: false` (default), the original upstream model name is replaced by the alias name in VibeProxy's registry. The alias name is the only routable name — sending the original upstream name (e.g., `claude-opus-4-6-thinking` or `gpt-5.4`) will fail with "unknown provider". For effort-suffix models, the shell alias sends the alias name with the effort suffix appended (e.g., `cc-codex-gpt54-med(medium)`), and VibeProxy parses the suffix at request time.

For each canonical alias, use its `request_model` field (the value that goes into `ANTHROPIC_MODEL`):

```bash
curl -s -o /tmp/vp_val.json -w '%{http_code}\n' \
  -X POST http://localhost:8318/v1/chat/completions \
  -H 'content-type: application/json' \
  -d '{"model":"<REQUEST_MODEL>","max_tokens":16,"messages":[{"role":"user","content":"ping"}]}'
```

Where `<REQUEST_MODEL>` is the `request_model` field from `canonical_aliases` — always alias-based (e.g., `cc-gravity-opus46` for base models, `cc-codex-gpt54-med(medium)` for effort models).

Use `max_tokens:16` — many models enforce a minimum of 16 tokens and reject lower values.

Interpret:

- **HTTP 200** — model resolves through routing, upstream accepted the request. Pass.
- **HTTP 4xx with "model not found"-shaped error** — model name is wrong or backend not active. Fail, trigger rollback.
- **HTTP 5xx** — upstream outage unrelated to skill correctness. Log and continue; do not rollback for 5xx.

Do **not** enumerate `/v1/models` to check existence. `/v1/models` uses a Last-Write-Wins registry that collapses same-named aliases from lower-priority backends into a single listing entry. Enumeration produces false negatives that trigger unnecessary rollbacks.

## Phase 11 — Success or rollback

On success, show the user the final `cc-list` output and tell them to `source ~/.zshrc`.

On any validation failure:

1. Restore `~/.cli-proxy-api/config.yaml` from `write_user_config.py`'s reported backup path
2. Restore `~/.zshrc` from `write_zshrc.sh`'s reported backup path
3. Keep `${CLAUDE_PLUGIN_DATA}/config.json` — it still reflects the user's approved selection and will re-identify managed entries on the next run
4. Report which canonical aliases failed and the exact HTTP status codes
5. Report the backup paths used
6. Stop

Transactional rollback is the default because shell aliases and model aliases form a coupled unit. Partial rollback leaves a broken intermediate state that is harder to reason about than a clean "pre-run" state.

## Gotchas

- **Discover never calls `/v1/models`.** If you find yourself wanting more info than `discover.sh` returns, that means you want a probe — run Phase 4 explicitly, do not hack it into Phase 1.
- **One backend at a time during probe.** If you ever call `probe_backend.sh` with more than one backend active in the VibeProxy UI, the Plus binary's registry collapses same-named models from lower-priority backends and you will get a silently truncated catalog. The verifier will catch this, but do not bypass it.
- **Toggle first, restart only on failure.** Menu bar toggles are usually sufficient for probe isolation — a full quit-and-relaunch is disruptive and only needed when merged-config fails to regenerate. Always try a toggle first; escalate to restart only when Layer 1 verification rejects the probe.
- **`type` field is often absent.** The Plus fork only emits `type` when `ModelInfo.Type` is non-empty. In practice, `owned_by` is the primary Layer 2 signature field. `verify_probe.py` handles this, but know it when reading its output — do not insist on `type` matching.
- **Write state before touching config.yaml or ~/.zshrc.** If you crash between steps, a consistent state file with no matching writes is recoverable (next run detects drift). Writes without state are orphaned managed entries that nothing knows how to clean up.
- **Backup paths live in `${CLAUDE_PLUGIN_DATA}/backups/`, not next to the original files.** Keep them inside the plugin data directory so upgrades do not wipe them.
- **Never read `~/.cli-proxy-api/merged-config.yaml` until after the restart gate.** Before restart it is stale. The one exception is `verify_probe.py` during Phase 4 — that is intentional because the hot-reload path triggered by a menu-bar toggle regenerates merged-config in place, and Layer 1 reads exactly that regenerated state.
- **Do not preserve ambiguous shared model names.** If the user picks `gpt-5.4` from codex and also from copilot, generate `cc-codex-gpt54-high` and `cc-copilot-gpt54-high` as separate canonical aliases. Do not also create a bare `gpt-5.4` alias, because that re-introduces the routing-priority ambiguity the probe cycle was designed to avoid.
- **5xx is not a rollback trigger.** If the upstream provider is down, the alias is still correctly configured. Log and keep going.
- **Validate with `request_model`, not the upstream `name`.** With `fork: false`, the original upstream model name is gone from VibeProxy's registry — the alias name is the only routable name. Sending the original name (e.g., `claude-opus-4-6-thinking` or `gpt-5.4`) will fail with "unknown provider". For effort models, the alias name with the effort suffix (e.g., `cc-codex-gpt54-med(medium)`) is routable because suffix parsing resolves the base alias. Always use the `request_model` field from `canonical_aliases`.
- **`request_model` is always alias-based.** Set `request_model` to the alias name for all models. For effort-suffix models, append the effort suffix to the alias name: `cc-codex-gpt54-med(medium)`, not `gpt-5.4(medium)`. The `model` field preserves the upstream name for documentation; `request_model` is what the shell actually sends.
- **Never add effort variants to budget-based models.** Antigravity's reasoning models (`claude-opus-4-6-thinking`, `claude-sonnet-4-6`) already have built-in thinking via numeric budget suffixes. Adding discrete effort levels (low/medium/high) on top creates invalid, unroutable aliases. Check the effort levels map for "budget-based" before offering effort selection.
- **Effort variants are suffix-parsed, not registered.** `cc-codex-gpt54-med(medium)` is not a separate model in VibeProxy's registry — it's `cc-codex-gpt54-med` with a `(medium)` suffix parsed at request time by the thinking layer. This means effort-variant aliases will never appear in `/v1/models` listings, and validating them requires sending the full suffixed name (e.g., `cc-codex-gpt54-med(medium)`) as the model in a chat-completions request.
- **Show ALL model families per backend.** Do not filter Copilot to only Claude models, or Codex to only GPT models. The same model (e.g., `gpt-5.4`) can appear in multiple backends with different effort levels or routing. Show everything the probe returns; let the user choose.
- **Gemini OAuth fails silently through the GUI.** The VibeProxy Settings UI triggers `-login` but cannot handle the interactive "Code Assist vs Google One" mode selection prompt, so the auth process completes in the browser but VibeProxy never registers the account. Always direct users to the CLI workaround: `/Applications/VibeProxy.app/Contents/Resources/cli-proxy-api-plus -login --config /Applications/VibeProxy.app/Contents/Resources/config.yaml`. This is a known upstream bug ([#286](https://github.com/automazeio/vibeproxy/issues/286), [#242](https://github.com/automazeio/vibeproxy/issues/242)).
- **Token expiration has no automatic re-authentication.** When an OAuth token expires and refresh fails after max retries, the proxy silently returns 502 for all requests through that credential. There is no auto-recovery — the user must re-authenticate manually in the VibeProxy menu bar (or via CLI). If a previously working alias suddenly returns 502 and the provider is not down, suggest the user check their auth status in VibeProxy Settings.
- **config.yaml changes hot-reload automatically.** After `write_user_config.py` updates `config.yaml`, CLIProxyAPIPlus detects the file change and reloads the config (including `oauth-model-alias` changes) without a full restart. The restart gate in Phase 7 is still required because `merged-config.yaml` regeneration may not always reflect alias changes until the next full server cycle.
- **OAuth callback uses port 3000.** When connecting the Claude Code channel (or Codex) in VibeProxy, the OAuth flow starts a temporary callback server on port 3000. If a dev server (Next.js, Vite, etc.) is occupying that port, the login will fail silently. Users should stop conflicting servers before authenticating.

## Scripts

| File | Role |
| --- | --- |
| `scripts/discover.sh` | Read-only state snapshot → JSON |
| `scripts/probe_backend.sh <token>` | Single-backend `/v1/models` probe → JSON |
| `scripts/verify_probe.py` | Layer 1 (merged-config cross-check) + Layer 2 (owned_by/type signature check) → verdict JSON |
| `scripts/write_user_config.py` | ruamel.yaml merge writer for `~/.cli-proxy-api/config.yaml` → JSON with backup path |
| `scripts/write_zshrc.sh` | Marker-delimited block writer for `~/.zshrc` with generated `cc-list` → JSON with backup path |

All scripts accept JSON on stdin or CLI args and emit JSON on stdout. None of them make irreversible changes without first creating a backup under `${CLAUDE_PLUGIN_DATA}/backups/`.
