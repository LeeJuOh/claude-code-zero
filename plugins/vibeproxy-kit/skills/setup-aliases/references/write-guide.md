# Phase 8 — Persist state, then write files

Order matters. Write the state file **first** so a crash between steps leaves `${CLAUDE_PLUGIN_DATA}/config.json` consistent with what the user approved.

## State file schema (mandatory)

`${CLAUDE_PLUGIN_DATA}/config.json` uses the **same field names as `write_user_config.py` stdin** so it can be passed through verbatim — never transform between state and script input. Schema:

```json
{
  "managed_shell_aliases": ["cc-codex-gpt54-high", "cc-codex-gpt55-max"],
  "managed_model_aliases": [
    {
      "channel": "codex",
      "name": "gpt-5.4",
      "alias": "cc-codex-gpt54-high",
      "request_model": "cc-codex-gpt54-high(high)",
      "effort_value": "high",
      "label": "Codex · GPT-5.4 · high"
    }
  ],
  "managed_payload_overrides": [
    {"alias": "cc-codex-gpt54-high", "protocol": "codex", "params": {"reasoning.effort": "high"}}
  ],
  "shortcut_shell_aliases": [
    {"name": "cc-cx-gpt-high", "target": "cc-codex-gpt55-high"}
  ],
  "backend_catalogs": {"codex": {"probed_at": "...", "model_count": 9}},
  "partial_probe": null
}
```

Field meanings:

| Field | Meaning | Used by |
|---|---|---|
| `managed_model_aliases[].channel` | VibeProxy config key (e.g., `codex`, `github-copilot`, `antigravity`, `gemini-cli`) | `write_user_config.py` `prior_managed_aliases` |
| `managed_model_aliases[].name` | **Upstream model name** (e.g., `gpt-5.4`, `claude-opus-4.6`). Not the alias. | `write_user_config.py` |
| `managed_model_aliases[].alias` | **Alias name** the user types (e.g., `cc-codex-gpt54-high`) | `write_user_config.py`, alias filter in Phase 5 |
| `managed_model_aliases[].request_model` | Value sent in `ANTHROPIC_MODEL` (alias plus `(level)` suffix for effort variants) | `write_zshrc.sh`, Phase 10 validation |
| `managed_model_aliases[].effort_value` | Optional. Server-side `reasoning.effort` for codex/copilot effort variants. `null` for base models. | Phase 5 `payload.override` build |
| `managed_model_aliases[].label` | Display string for `cc-list` grouping (e.g., `Codex · GPT-5.4 · high`) | `write_zshrc.sh` |

`name` and `alias` are **inverses**: `name` is the upstream provider's model ID; `alias` is the routable name that VibeProxy serves. Confusing them silently corrupts the merge — `write_user_config.py` filters entries that lack the `alias` field, so a state entry with `name="cc-codex-..."` and no `alias` field is treated as malformed and ignored. The result is a no-op write while everything looks fine.

## Write order

1. Write `${CLAUDE_PLUGIN_DATA}/config.json` matching the schema above. Include the full `backend_catalogs` (including cached probes we did not refresh this run) and `partial_probe: null`. The `managed_payload_overrides` array tracks every `payload.override` block the skill writes so it can be cleaned up on the next reset/merge — orphans are not recoverable without it.
2. Build the `write_user_config.py` stdin payload by **passing `discover.managed_model_aliases` directly as `prior_managed_aliases`** — both use the same shape. Do not re-derive from raw state file content. Capture `backup_path` from its JSON output. If `ok: false`, stop and report — no further writes. The script writes both `oauth-model-alias` entries and `payload.override` blocks atomically into the same backup-protected save.
3. Run `write_zshrc.sh`. Capture `backup_path` from its JSON output. If it fails, rollback `config.yaml` from its backup path before reporting.

```bash
cat <<JSON | python3 ${CLAUDE_PLUGIN_ROOT}/skills/setup-aliases/scripts/write_user_config.py
{
  "mode": "merge",
  "config_path": "~/.cli-proxy-api/config.yaml",
  "backup_dir": "${CLAUDE_PLUGIN_DATA}/backups",
  "prior_managed_aliases": [...],
  "managed_aliases": [...],
  "prior_managed_payload_overrides": [...],
  "managed_payload_overrides": [
    {"alias": "cc-codex-gpt54-high", "protocol": "codex", "params": {"reasoning.effort": "high"}}
  ]
}
JSON
```

```bash
cat <<JSON | bash ${CLAUDE_PLUGIN_ROOT}/skills/setup-aliases/scripts/write_zshrc.sh
{"mode":"merge","zshrc_path":"~/.zshrc","backup_dir":"${CLAUDE_PLUGIN_DATA}/backups","proxy_url":"http://localhost:8318","canonical_aliases":[...],"shortcut_aliases":[...]}
JSON
```
