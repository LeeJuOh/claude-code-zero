---
name: setup-aliases
description: "Discover, choose, and rewrite backend-specific VibeProxy cc-* aliases for Claude Code. Use when the user wants to set up, reset, reconfigure, inspect, or audit VibeProxy aliases for Codex, GitHub Copilot, Antigravity, or Gemini — including first-time setup, per-backend model selection, shortcut aliases, and rebuilding only the skill-managed pieces without clobbering manual edits."
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

- `vibeproxy_installed`, `vibeproxy_reachable` — bail early with an install/launch hint if either is false
- `user_overlay_exists`, `state_file_present` — determines whether we are first-run or rerun
- `authenticated_backends` — array of `{token, config_key, display_name, auth_files}`; only these backends can be configured
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

## Phase 2 — Warn, then pick a mode

Before asking for the mode, warn the user once that Merge and Reset will temporarily disrupt their VibeProxy backend combination during the probe cycle. Recommend running this skill only when they are not mid-work — there is no way to programmatically capture their current menu-bar combination and restore it.

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

For each probed backend's catalog, present the model list via `AskUserQuestion` and let the user pick. Filter the list to what is reasonable for Claude Code usage (claude-shaped, gpt-shaped, gemini-pro-shaped).

For each selected model, check if the name carries an effort hint. Known patterns:

- Codex `gpt-5.4`, `gpt-5.4(low)`, `gpt-5.4(medium)`, `gpt-5.4(high)`, `gpt-5.4(xhigh)` — the suffix IS the model name variant, not a separate parameter
- Copilot `claude-opus-4.6(low|medium|high)` — same convention
- Antigravity / Gemini — usually no effort variants

If variants exist, ask the user which variants to expose as separate aliases. Map each chosen variant to a canonical alias name using the convention:

`cc-<backend-token>-<model-version>[-<effort>]`

Backend token in the alias comes from the spec table:

| `authenticated_backends[].token` | alias token |
| --- | --- |
| `codex` | `codex` |
| `copilot` | `copilot` |
| `gravity` | `gravity` |
| `gemini` | `gemini` |

Model token rules: strip dots and dashes from the version (`gpt-5.4` → `gpt54`, `claude-opus-4.6` → `opus46`, `claude-sonnet-4.6` → `sonnet46`, `gemini-2.5-pro` → `gemini25pro`). Effort tokens are `low`, `med`, `high`, `max`.

Finally ask whether any selected versioned alias should also get a shortcut (e.g. `cc-copilot-opus` pointing at `cc-copilot-opus46`). Shortcuts are shell-level aliases whose target is the canonical alias name, so they expand at command-line parse time. Never make a shortcut the canonical name.

## Phase 6 — Conflict resolution

From Phase 1's `conflicts` array plus any new name collisions you can predict against the computed canonical aliases, ask the user per conflict via `AskUserQuestion`:

- Rename the canonical alias
- Delete the pre-existing entry
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

For each canonical alias, issue a minimal chat-completions request and check the status code:

```bash
curl -s -o /tmp/vp_val.json -w '%{http_code}\n' \
  -X POST http://localhost:8318/v1/chat/completions \
  -H 'content-type: application/json' \
  -d '{"model":"<alias>","max_tokens":1,"messages":[{"role":"user","content":"ping"}]}'
```

Interpret:

- **HTTP 200** — alias resolves through routing, upstream accepted the request. Pass.
- **HTTP 4xx with "model not found"-shaped error** — alias is missing or misconfigured. Fail, trigger rollback.
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

## Scripts

| File | Role |
| --- | --- |
| `scripts/discover.sh` | Read-only state snapshot → JSON |
| `scripts/probe_backend.sh <token>` | Single-backend `/v1/models` probe → JSON |
| `scripts/verify_probe.py` | Layer 1 (merged-config cross-check) + Layer 2 (owned_by/type signature check) → verdict JSON |
| `scripts/write_user_config.py` | ruamel.yaml merge writer for `~/.cli-proxy-api/config.yaml` → JSON with backup path |
| `scripts/write_zshrc.sh` | Marker-delimited block writer for `~/.zshrc` with generated `cc-list` → JSON with backup path |

All scripts accept JSON on stdin or CLI args and emit JSON on stdout. None of them make irreversible changes without first creating a backup under `${CLAUDE_PLUGIN_DATA}/backups/`.
