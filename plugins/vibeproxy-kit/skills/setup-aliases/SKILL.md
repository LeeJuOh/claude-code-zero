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
- `managed_shell_aliases`, `managed_model_aliases`, `shortcut_shell_aliases` — what the skill currently owns
- `backend_catalogs`, `partial_probe` — cached probe results and any aborted probe cycle
- `conflicts` — pre-existing `cc-*` entries that are not tracked in state (potential clashes)

Present a compact summary back to the user (do not dump raw JSON):

```
VibeProxy: installed ✓ | reachable ✓
Authenticated backends: codex, copilot, gravity, gemini (4/4)
Currently managed: 3 model aliases, 4 shell aliases, 1 shortcut
Manual conflicts detected: 0
State file: present (last probe 2 days ago)
```

If `partial_probe` is non-null, tell the user a previous run aborted mid-cycle and offer to resume or restart.

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

Tell the user which backends are available and how to authenticate each one:

> No backends are authenticated yet. VibeProxy supports these providers — each requires a paid subscription:
>
> | Backend | How to authenticate |
> |---------|---------------------|
> | **Codex** | Settings → Codex → Connect (OAuth) |
> | **GitHub Copilot** | Settings → GitHub Copilot → Connect (OAuth) |
> | **Antigravity** | Settings → Antigravity → Connect (OAuth) |
> | **Gemini** | Settings → Gemini → Connect (OAuth) |
> | **Qwen** | Settings → Qwen → Connect (OAuth) |
> | **Z.AI GLM** | Settings → Z.AI GLM → Add Account (API key) |
>
> Open VibeProxy Settings from the menu bar icon, authenticate at least one backend, then re-run `/setup-aliases`.

Stop here.

**Gate 4 — Missing backends the user wants** (some backends authenticated, user asks about others)

If the user mentions a specific backend that is not in `authenticated_backends`, tell them:

> `<backend>` is not authenticated yet. Open the VibeProxy menu bar → `<display_name>` → Sign in. Once authenticated, re-run `/setup-aliases` and it will appear in the backend list.

This gate does not block — continue to Phase 2 with the backends that are available, but surface the gap so the user knows.

## Phase 2 — Warn, then pick a mode

Before asking for the mode, warn the user once that Merge and Reset will temporarily disrupt their VibeProxy backend combination during the probe cycle. Active `claude` sessions may route through a different provider while the menu bar is toggled. Recommend running this skill only when they are not mid-work — there is no way to programmatically capture their current menu-bar combination and restore it.

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
2. **Toggle prompt.** Use `AskUserQuestion` to tell the user exactly what to do: *"In the VibeProxy menu bar, enable **only** `<display_name>` and disable every other backend (Codex, GitHub Copilot, Antigravity, Gemini). Click done when the menu bar reflects that state."* Wait for explicit confirmation.
3. **Probe.** Run `bash ${CLAUDE_PLUGIN_ROOT}/skills/setup-aliases/scripts/probe_backend.sh <token> > /tmp/vibeproxy_probe_<token>.json`
4. **Verify.** Run `python3 ${CLAUDE_PLUGIN_ROOT}/skills/setup-aliases/scripts/verify_probe.py --claimed <token> --claimed-channel-key <config_key> --all-channel-keys <comma-sep-list-of-all-authenticated-channel-keys> --probe-output /tmp/vibeproxy_probe_<token>.json > /tmp/vibeproxy_verify_<token>.json`
5. **Act on verdict.**
   - `pass` — accept this backend's catalog
   - `warn` — Layer 2 saw `unknown_signatures`; surface the specific model IDs to the user and ask whether to trust them before accepting
   - `reject` — show the `reason` from the verify output verbatim, re-issue the toggle prompt, and loop back to step 2. Do **not** accept a rejected probe under any circumstance.
6. **Persist partial probe on abort.** If the user aborts the cycle, write any completed backend catalogs into `${CLAUDE_PLUGIN_DATA}/config.json` under `partial_probe` with a timestamp, then exit cleanly. The next invocation will offer to resume.

After all selected backends are probed, tell the user to restore their preferred backend combination in the VibeProxy UI before continuing to model selection.

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

### Step 2: Auto-detect and present effort variants

Effort variants are NOT separate models in `/v1/models` — they are constructed by appending a parenthesized suffix to the base model name at request time (e.g., `gpt-5.4(high)`). Detection uses two sources:

1. **Probe data** — each model with `"thinking": true` in the probe output supports effort suffixes
2. **Effort levels map** — read `${CLAUDE_PLUGIN_ROOT}/skills/setup-aliases/references/effort-levels.md` for the full per-model, per-backend effort levels table

**Detection logic:**

1. For each selected model, check if `thinking: true` in probe data
2. If yes, look up the model ID + backend token in the effort levels map. **Normalize dots/hyphens before lookup** — Copilot uses dots (`claude-opus-4.6`) while direct API uses hyphens (`claude-opus-4-6`). The map uses dots for Copilot IDs and hyphens for Antigravity/Gemini IDs, matching how each backend reports them in `/v1/models`. If a probe returns a variant not in the map, try the other format before declaring a miss.
3. **Map hit** → automatically present the levels as a multi-select `AskUserQuestion`
4. **Map miss** (model has `thinking: true` but not in map after both formats tried) → tell the user: "This model supports effort levels but the available levels are unknown. What levels do you want to configure?" and let the user specify
5. If `thinking` is absent or false → no effort variants, use base model name as-is

**Do not skip effort detection.** If a model has `thinking: true`, always present effort selection — do not silently create only the base model alias.

For Antigravity models with budget-based thinking (no discrete levels): these work with numeric budget suffixes (e.g., `claude-opus-4-6-thinking(16384)`), not effort levels. Present them as base models without effort selection.

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

**`request_model` field:** For non-suffix base models with `fork: false`, set `request_model` to the alias name (e.g., `cc-gravity-opus46`). For effort-suffix models (e.g., `gpt-5.4(medium)`), set `request_model` to the original suffixed form. This field determines what the shell alias sends as `ANTHROPIC_MODEL` and what validation uses.

### Step 4: Shortcut aliases

Ask whether any selected versioned alias should also get a version-less shortcut (e.g. `cc-copilot-opus` → `cc-copilot-opus46`). Shortcuts are shell-level aliases whose target is the canonical alias name. Never make a shortcut the canonical name.

For effort variants, shortcut = effort token only: `cc-codex-med` → `cc-codex-gpt54-med`.

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

1. Quit VibeProxy from the menu bar
2. Enable **exactly** the backends you configured aliases for — no more, no less
3. Relaunch VibeProxy
4. Click done when the menu bar shows the configured combination

Do not skip this step. Do not proceed to validation before the user confirms.

## Phase 10 — Per-alias validation

Each validation call sends a real (billable) inference request. If the user has many aliases, warn them about the per-alias cost before proceeding.

**Critical: use the `request_model` value — the same model name the shell alias sends.** Because the plugin uses `fork: false` by default, the original upstream model name is replaced by the alias name in VibeProxy's registry. For non-suffix base models, this means the alias name (e.g., `cc-gravity-opus46`) is the routable name, not the original (e.g., `claude-opus-4-6-thinking`). For effort-suffix models (e.g., `gpt-5.4(medium)`), the original suffix form is still routable because VibeProxy parses the suffix at request time and resolves the base model.

For each canonical alias, use its `request_model` field (the value that goes into `ANTHROPIC_MODEL`):

```bash
curl -s -o /tmp/vp_val.json -w '%{http_code}\n' \
  -X POST http://localhost:8318/v1/chat/completions \
  -H 'content-type: application/json' \
  -d '{"model":"<REQUEST_MODEL>","max_tokens":16,"messages":[{"role":"user","content":"ping"}]}'
```

Where `<REQUEST_MODEL>` is the `request_model` field from `canonical_aliases` — for non-suffix base models this is the alias name (e.g., `cc-gravity-opus46`), for effort-suffix models this is the original suffix form (e.g., `gpt-5.4(medium)`).

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
- **`type` field is often absent.** The Plus fork only emits `type` when `ModelInfo.Type` is non-empty. In practice, `owned_by` is the primary Layer 2 signature field. `verify_probe.py` handles this, but know it when reading its output — do not insist on `type` matching.
- **Write state before touching config.yaml or ~/.zshrc.** If you crash between steps, a consistent state file with no matching writes is recoverable (next run detects drift). Writes without state are orphaned managed entries that nothing knows how to clean up.
- **Backup paths live in `${CLAUDE_PLUGIN_DATA}/backups/`, not next to the original files.** Keep them inside the plugin data directory so upgrades do not wipe them.
- **Never read `~/.cli-proxy-api/merged-config.yaml` until after the restart gate.** Before restart it is stale. The one exception is `verify_probe.py` during Phase 4 — that is intentional because the hot-reload path triggered by a menu-bar toggle regenerates merged-config in place, and Layer 1 reads exactly that regenerated state.
- **Do not preserve ambiguous shared model names.** If the user picks `gpt-5.4` from codex and also from copilot, generate `cc-codex-gpt54-high` and `cc-copilot-gpt54-high` as separate canonical aliases. Do not also create a bare `gpt-5.4` alias, because that re-introduces the routing-priority ambiguity the probe cycle was designed to avoid.
- **5xx is not a rollback trigger.** If the upstream provider is down, the alias is still correctly configured. Log and keep going.
- **Validate with `request_model`, not the upstream `name`.** With `fork: false`, the upstream model name is replaced by the alias name in VibeProxy's registry. For non-suffix base models, the alias name (e.g., `cc-gravity-opus46`) is the routable name — sending the original upstream name (e.g., `claude-opus-4-6-thinking`) will fail with "unknown provider". For effort-suffix models (e.g., `gpt-5.4(medium)`), the original suffix form is still routable because suffix parsing resolves the base model. Always use the `request_model` field from `canonical_aliases`.
- **`request_model` must match what VibeProxy sees after alias resolution.** When building `canonical_aliases`, set `request_model` to the alias name for non-suffix base models (because `fork: false` replaces the original name in the registry). For effort-suffix models like `gpt-5.4(medium)`, set `request_model` to the original suffix form (because suffix parsing happens before alias lookup and resolves the base model). The `model` field preserves the upstream name for documentation; `request_model` is what the shell actually sends.
- **Effort variants are suffix-parsed, not registered.** `gpt-5.4(high)` is not a separate model in VibeProxy's registry — it's `gpt-5.4` with a `(high)` suffix parsed at request time by the thinking layer. This means effort-variant aliases will never appear in `/v1/models` listings, and validating them requires sending the full suffixed name (e.g., `gpt-5.4(high)`) as the model in a chat-completions request.
- **Show ALL model families per backend.** Do not filter Copilot to only Claude models, or Codex to only GPT models. The same model (e.g., `gpt-5.4`) can appear in multiple backends with different effort levels or routing. Show everything the probe returns; let the user choose.

## Scripts

| File | Role |
| --- | --- |
| `scripts/discover.sh` | Read-only state snapshot → JSON |
| `scripts/probe_backend.sh <token>` | Single-backend `/v1/models` probe → JSON |
| `scripts/verify_probe.py` | Layer 1 (merged-config cross-check) + Layer 2 (owned_by/type signature check) → verdict JSON |
| `scripts/write_user_config.py` | ruamel.yaml merge writer for `~/.cli-proxy-api/config.yaml` → JSON with backup path |
| `scripts/write_zshrc.sh` | Marker-delimited block writer for `~/.zshrc` with generated `cc-list` → JSON with backup path |

All scripts accept JSON on stdin or CLI args and emit JSON on stdout. None of them make irreversible changes without first creating a backup under `${CLAUDE_PLUGIN_DATA}/backups/`.
