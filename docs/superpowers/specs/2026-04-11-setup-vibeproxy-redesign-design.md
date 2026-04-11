# vibeproxy-kit setup-aliases redesign design

## Goal

Redesign `plugins/vibeproxy-kit/skills/setup-aliases/` from a one-shot bootstrap helper into a state-aware VibeProxy alias manager that supports:

- first-time setup
- merge updates when the current setup should be adjusted in place
- reset-and-reconfigure when the user wants to rebuild only the skill-managed pieces from scratch
- backend-specific aliases for the same upstream family, such as separate Codex and Copilot aliases for GPT-5.4
- per-user model, effort, and optional shortcut-alias customization instead of a fixed alias list

## Constraints and verified facts

- VibeProxy user overlay lives at `~/.cli-proxy-api/config.yaml`; `merged-config.yaml` is regenerated and must not be edited directly.
- The deterministic split between Codex and Copilot aliases for the same upstream model has been empirically verified after restart using test aliases and successful HTTP 200 responses.
- `oauth-model-alias` is configured per channel in `config.yaml` and is the mechanism this skill uses to expose user-selected backend-specific aliases.
- Touching the `github-copilot` channel in the user overlay can suppress the Plus fork's auto-injected compatibility aliases. This redesign does **not** treat those compatibility aliases as mandatory output. The authoritative output is the alias set the user selected during setup.
- The skill must preserve unrelated user configuration and must not assume it owns the entire `config.yaml` or `~/.zshrc`.
- Persistent state must live under `${CLAUDE_PLUGIN_DATA}`.
- Changes to `~/.cli-proxy-api/config.yaml` do not take effect until VibeProxy is quit from the menu bar and relaunched. `merged-config.yaml` is regenerated only on app launch, so any runtime validation must happen after an explicit restart gate, not immediately after the file write.
- `/v1/models` returns one `owned_by` and one `type` per model as a Last-Write-Wins projection of the Plus binary's model registry, not a static per-backend capability list. The registry stores models in a `map[modelID]*ModelRegistration`, so when two backends register the same model ID (e.g. both `codex` and `github-copilot` exposing `gpt-5.4`), the second registration overwrites `registration.Info` with its own metadata and the list endpoint reads only that overwritten `Info` — the lower-priority copy's `owned_by`/`type` is invisible to `/v1/models` even though it is still fully configured and routable. Building a per-backend model catalog therefore requires probing each backend in isolation with only that backend enabled in the VibeProxy UI, which forces the excluded backends to unregister their clients so no overwrite can happen.

## Design decisions

### 1. Ownership model

The skill owns only two surfaces:

1. the `vibeproxy-kit` managed block in `~/.zshrc`
2. the `oauth-model-alias` entries in `~/.cli-proxy-api/config.yaml` that were created by this skill

The skill does not own unrelated shell aliases, unrelated YAML sections, or user-authored aliases outside its managed namespace.

### 2. Managed item identification

Managed entries are identified with two layers:

1. `${CLAUDE_PLUGIN_DATA}/config.json` as the primary source of truth for what the skill last created
2. the naming convention `cc-<backend>-<model-version>[-<effort>]` as the fallback recovery heuristic

This avoids relying on YAML comment preservation and keeps reset behavior deterministic even when saved state is partially missing.

### 3. Naming convention

Canonical aliases use the format:

`cc-<backend>-<model-version>[-<effort>]`

Examples:

- `cc-codex-gpt54`
- `cc-codex-gpt54-low`
- `cc-codex-gpt54-med`
- `cc-codex-gpt54-high`
- `cc-codex-gpt54-max`
- `cc-copilot-gpt54-high`
- `cc-copilot-opus46`
- `cc-copilot-sonnet46`
- `cc-gravity-opus46`
- `cc-gemini25pro`

Backend token mapping:

| Alias token | Display label | VibeProxy config channel key |
| --- | --- | --- |
| `codex` | Codex | `codex` |
| `copilot` | GitHub Copilot | `github-copilot` |
| `gravity` | Antigravity | `antigravity` |
| `gemini` | Gemini | `gemini-cli` |

Model token rules:

- versioned models include their version in the alias token
- examples: `gpt54`, `opus46`, `sonnet46`, `gemini25pro`
- effort tokens remain `low`, `med`, `high`, `max`

Effort is appended only when the selected backend/model combination actually exposes effort variants.

Optional shortcut aliases are allowed when the user explicitly asks for them. In that case, the shortcut is a **shell-level convenience alias** that points at a canonical versioned alias rather than replacing the canonical name.

Example:

- canonical alias: `cc-copilot-opus46`
- optional shortcut shell alias: `cc-copilot-opus`

This keeps the generated VibeProxy model aliases explicit while still allowing shorter commands when the user wants them.

### 4. Config management granularity

The skill manages `oauth-model-alias` at the alias-entry level, not at the full channel level.

This means:

- merge mode adds, updates, or removes only skill-managed alias entries
- reset mode removes only skill-managed alias entries before recreating them
- user-authored alias entries in the same channel are preserved

This is intentionally more conservative than channel-wide rewrite because users may already have their own aliases under `codex`, `github-copilot`, `antigravity`, or `gemini-cli`.

### 5. Operating modes

The skill supports three user-visible modes:

1. **Keep** — inspect and report current state without changes
2. **Merge update** — default mode; preserve current setup and apply incremental changes
3. **Reset and reconfigure** — remove only skill-managed aliases and skill-managed shell block, then rebuild from scratch

Reset is scoped only to skill-managed pieces. It does not wipe the full user overlay.

### 6. Conflict policy

If an alias name already exists and would conflict with a skill-generated alias, the skill must ask the user what to do for that specific conflict.

No silent overwrite is allowed.

## `oauth-model-alias` structure

`oauth-model-alias` is a per-channel mapping in `config.yaml`.

Each entry has:

- `name`: the upstream model ID exposed by that backend
- `alias`: the client-visible alias this skill wants to expose
- `fork` (optional): when `true`, keep the original model ID available and also add the alias as an extra model name

Example:

```yaml
oauth-model-alias:
  codex:
    - name: "gpt-5.4(high)"
      alias: "cc-codex-gpt54-high"
  github-copilot:
    - name: "gpt-5.4(high)"
      alias: "cc-copilot-gpt54-high"
    - name: "claude-opus-4.6"
      alias: "cc-copilot-opus46"
  antigravity:
    - name: "claude-opus-4-6-thinking"
      alias: "cc-gravity-opus46"
  gemini-cli:
    - name: "gemini-2.5-pro"
      alias: "cc-gemini25pro"
```

Default behavior for this redesign is to generate the user-selected canonical aliases only. `fork: true` is optional and should be used only when the user explicitly wants to keep the original model name visible alongside the alias.

## Backend switching policy

For models selected through this skill, the redesign should prevent implicit backend hopping caused by ambiguous shared model names.

The intended behavior is:

- implicit switching is not allowed
- explicit switching is allowed

A user should be able to switch intentionally between backend-specific aliases such as `cc-copilot-opus46` and `cc-gravity-opus46`, but the managed setup should avoid preserving ambiguous generic names such as `claude-opus-4.6`, `claude-opus-4-6`, or `gpt-5.4` when those names would allow the active backend to change without the user's intent.

For selected models, the canonical managed output is the backend-specific alias set generated by this skill. Generic shared model names are not treated as part of the managed output by default. This keeps backend routing explicit in both shell entrypoints and in-session `/model` switching.

## Backend catalog discovery

Because `/v1/models` returns one `owned_by` per model reflecting current routing priority (not a static per-backend capability list), the skill cannot derive per-backend model catalogs from a single call. The same upstream model name such as `claude-opus-4.6` may legitimately exist under multiple backends, but `/v1/models` collapses it into whichever backend currently holds routing priority. The lower-priority copy is invisible to the listing even though it is still configured.

The skill therefore builds the per-backend catalog through a guided probe cycle:

1. Scan `~/.cli-proxy-api/*.json` to determine which backends are authenticated.
2. Ask the user which of those authenticated backends to configure aliases for.
3. For each selected backend, in sequence:
   1. Instruct the user via `AskUserQuestion` to toggle the VibeProxy menu bar so that **only** that backend is enabled and all others are disabled.
   2. Wait for explicit confirmation.
   3. Call `/v1/models` and treat the entire response body as that backend's catalog.
   4. Store the catalog keyed by backend token.
4. After all selected backends have been probed, ask the user to restore their preferred backend combination in the VibeProxy UI before proceeding to model selection.

### Probe disruption

The probe cycle is destructive to the user's working backend combination. The skill cannot read VibeProxy UI state programmatically, so it cannot automatically capture the original combination and restore it. The skill must acknowledge this in its opening summary and recommend running `setup-aliases` when the user is not mid-work.

### Probe caching

Probe results may be cached in `${CLAUDE_PLUGIN_DATA}/config.json` under a `backend_catalogs` key with a per-backend `probed_at` timestamp. Mode-specific behavior:

- **Keep mode** — never probes. Displays only what can be read from local state (state file, `config.yaml`, `~/.zshrc`, auth files).
- **Merge update** — may reuse a cached catalog for up to 7 days. The user may force a refresh via an explicit option.
- **Reset and reconfigure** — always re-probes to rebuild the catalog from scratch, because reset mode is the intended path for detecting backend-side model changes.

### Partial probe resumption

If the user aborts the probe cycle mid-way, the skill writes any completed backend catalogs to `${CLAUDE_PLUGIN_DATA}/config.json` under a `partial_probe` key alongside a timestamp and the list of backends already probed. On the next invocation the skill may offer to resume from the partial catalog rather than restart the full cycle.

## Architecture

The redesigned skill is split into four parts.

### SKILL.md

Acts as the orchestration layer. Owns everything that requires cross-step coordination or user interaction; the shell and Python scripts own only deterministic single-purpose operations.

Responsibilities:

- invoke `scripts/discover.sh` and parse its JSON output
- explain current state and warn about probe disruption before any mode selection
- ask for mode selection (Keep / Merge update / Reset and reconfigure)
- orchestrate the backend catalog probe cycle: toggle prompts via `AskUserQuestion`, sequential `probe_backend.sh` invocations, per-backend cache freshness decisions, partial-probe persistence on abort
- gather backend, model, effort, and optional shortcut-alias preferences against the probed catalogs
- detect and handle per-alias conflict decisions
- show a final change summary before any mutation and wait for explicit confirmation
- write the persisted state file **before** invoking either writer
- invoke `write_user_config.py` and `write_zshrc.sh` with fully resolved payloads (no conflict-resolution flags inside writer payloads; conflicts are pre-filtered here)
- collect backup paths returned by each writer for rollback coordination
- run the VibeProxy restart gate (quit, enable exactly the configured backends, relaunch, confirm)
- run per-alias HTTP validation and coordinate transactional rollback on failure

### `scripts/discover.sh`

Read-only state inspection script that emits normalized JSON to stdout. Never calls `/v1/models` and never mutates any file or external state. Safe to invoke repeatedly.

Responsibilities:

- verify VibeProxy installation (`/Applications/VibeProxy.app` exists) and reachability (`localhost:8318` responds)
- scan `~/.cli-proxy-api/*.json` to detect authenticated backends
- read persisted state from `${CLAUDE_PLUGIN_DATA}/config.json` if it exists
- inspect existing `~/.cli-proxy-api/config.yaml` for `oauth-model-alias` entries
- inspect the managed block in `~/.zshrc` for existing managed shell aliases
- cross-reference persisted state against on-disk entries to classify each alias as managed, manual, or conflict
- identify potential manual conflicts for skill-generated alias names

Per-backend model catalogs are **not** the responsibility of this script. They are collected by a separate probe cycle (see the Backend catalog discovery section) and composed by the orchestrating skill.

Output contract:

```json
{
  "vibeproxy_installed": true,
  "vibeproxy_reachable": true,
  "user_overlay_exists": true,
  "has_managed_zsh_block": true,
  "authenticated_backends": [
    { "token": "codex",   "config_key": "codex",          "display_name": "Codex",          "auth_file": "~/.cli-proxy-api/codex.json" },
    { "token": "copilot", "config_key": "github-copilot", "display_name": "GitHub Copilot", "auth_file": "~/.cli-proxy-api/github-copilot.json" },
    { "token": "gravity", "config_key": "antigravity",    "display_name": "Antigravity",    "auth_file": "~/.cli-proxy-api/antigravity.json" },
    { "token": "gemini",  "config_key": "gemini-cli",     "display_name": "Gemini",         "auth_file": "~/.cli-proxy-api/gemini-cli.json" }
  ],
  "managed_shell_aliases": ["cc-codex-gpt54-high", "cc-copilot-opus46"],
  "managed_model_aliases": [
    { "channel": "codex",          "name": "gpt-5.4(high)",   "alias": "cc-codex-gpt54-high" },
    { "channel": "github-copilot", "name": "claude-opus-4.6", "alias": "cc-copilot-opus46" }
  ],
  "conflicts": [
    { "alias": "cc-copilot-opus46", "source": "manual-shell-alias" }
  ]
}
```

Note: `authenticated_backends` lists only the backends with credentials on disk. Whether each backend is **currently enabled** in the VibeProxy UI cannot be determined programmatically and is not part of this contract.

### `scripts/probe_backend.sh`

Single-backend catalog probe. Called once per selected backend during the probe cycle. Expects VibeProxy to have exactly one backend enabled in the UI before invocation; the orchestrating skill gates this with an `AskUserQuestion` confirmation.

Responsibilities:

- call `/v1/models` once
- parse the response body
- emit a JSON object containing the backend token the caller claims to have enabled, a `probed_at` timestamp, and the full model list as reported by VibeProxy

The script itself does not decide whether the probe is valid. The orchestrating skill verifies each probe result against two independent sources of truth before accepting it into the backend catalog:

**Verification layer 1 — merged-config cross-check.** Before recording the probe result, read `~/.cli-proxy-api/merged-config.yaml` and inspect `oauth-excluded-models`. For a probe claiming backend `X`, every authenticated backend other than `X` must appear in `oauth-excluded-models` with a wildcard `["*"]` entry, and `X` itself must not. If the exclusion set does not match, the user toggled the wrong backends in the VibeProxy menu bar and the probe is rejected. This layer does not depend on the `/v1/models` response shape and catches the most common failure mode (user forgot to disable a backend) deterministically.

**Verification layer 2 — per-model signature check.** Each model in the `/v1/models` response carries both `type` (backend family label) and `owned_by` (vendor label) fields emitted by the Plus binary's model registry. The orchestrator maintains a fixed signature table:

| claimed backend token | expected `type` | expected `owned_by` |
| --- | --- | --- |
| `codex` | `codex` | `openai` |
| `copilot` | `copilot` | `github-copilot` |
| `gravity` | `antigravity` | `antigravity` |
| `gemini` | `gemini` | `google` |

If any model in the response carries a `type` or `owned_by` value belonging to a different backend's signature, the probe contains leaked models from a backend that was supposed to be disabled, and the probe is rejected. Models with `type` or `owned_by` values not present in the table are treated as unknown (new Plus provider the skill does not yet know about) and surfaced to the user via `AskUserQuestion` rather than auto-rejected; accepted unknowns are persisted under `backend_catalogs.<token>.unknown_signatures` for future table updates.

On rejection, the orchestrator explains which layer failed and which specific backend or model triggered it, then re-issues the `AskUserQuestion` toggle prompt. The probe script itself is re-invoked only after the user confirms a corrected toggle state.

Because the probe cycle forces exactly one backend to be enabled in VibeProxy at a time, `/v1/models` routing-priority collapse cannot happen during probing — the disabled backends are wildcarded out of `oauth-excluded-models` and have no candidate models to route to, so the returned catalog reflects the claimed backend's true model list in full, including models whose upstream names collide with other backends' offerings.

Output contract:

```json
{
  "claimed_backend_token": "copilot",
  "probed_at": "2026-04-11T09:42:17Z",
  "models": [
    { "id": "gpt-5.4",           "type": "copilot", "owned_by": "github-copilot" },
    { "id": "gpt-5.4(high)",     "type": "copilot", "owned_by": "github-copilot" },
    { "id": "claude-opus-4.6",   "type": "copilot", "owned_by": "github-copilot" },
    { "id": "claude-sonnet-4.6", "type": "copilot", "owned_by": "github-copilot" }
  ]
}
```

The `models` array preserves `type` and `owned_by` per entry so the orchestrator can run the signature check without re-issuing `/v1/models`. Entries missing either field are passed through unchanged; the signature check treats absent fields as "unknown" rather than mismatches.

### `scripts/write_user_config.py`

Safe YAML merge writer for `~/.cli-proxy-api/config.yaml`.

Responsibilities:

- load existing user overlay
- remove skill-managed alias entries in reset mode
- merge updated alias entries in merge mode
- preserve unrelated YAML sections
- preserve user-authored alias entries in the same channels
- create timestamped backups before modification
- support rollback on validation failure

Input contract:

- read JSON from stdin
- write only skill-managed `oauth-model-alias` entries

Example input:

```json
{
  "mode": "merge",
  "config_path": "~/.cli-proxy-api/config.yaml",
  "backup_path": "~/.cli-proxy-api/config.yaml.bak",
  "managed_aliases": [
    {
      "channel": "codex",
      "name": "gpt-5.4(high)",
      "alias": "cc-codex-gpt54-high"
    },
    {
      "channel": "github-copilot",
      "name": "claude-opus-4.6",
      "alias": "cc-copilot-opus46"
    }
  ]
}
```

### `scripts/write_zshrc.sh`

Managed block writer for `~/.zshrc`.

Responsibilities:

- replace only the skill-managed block
- support reset by removing and recreating the managed block
- leave unrelated aliases untouched
- generate `cc-list` from the actual selected aliases
- optionally add shortcut shell aliases that point to canonical aliases
- create a backup or restorable snapshot before modification
- support rollback on validation failure

## Persisted state

`${CLAUDE_PLUGIN_DATA}/config.json` is the skill's source of truth for what it last created and for cached backend catalogs collected during the probe cycle.

Schema:

```json
{
  "version": 1,
  "managed_shell_aliases": [
    "cc-codex-gpt54-high",
    "cc-copilot-opus46",
    "cc-copilot-opus"
  ],
  "managed_model_aliases": [
    { "channel": "codex",          "name": "gpt-5.4(high)",   "alias": "cc-codex-gpt54-high" },
    { "channel": "github-copilot", "name": "claude-opus-4.6", "alias": "cc-copilot-opus46" }
  ],
  "shortcut_shell_aliases": [
    { "alias": "cc-copilot-opus", "target": "cc-copilot-opus46" }
  ],
  "backend_catalogs": {
    "codex":   { "probed_at": "2026-04-11T09:40:12Z", "models": ["gpt-5.4", "gpt-5.4(high)"] },
    "copilot": { "probed_at": "2026-04-11T09:42:17Z", "models": ["gpt-5.4", "claude-opus-4.6", "claude-sonnet-4.6"] }
  },
  "partial_probe": null
}
```

Field semantics:

- `managed_shell_aliases`, `managed_model_aliases`, `shortcut_shell_aliases` — the authoritative list of entries this skill last committed to `config.yaml` and `~/.zshrc`. These drive ownership classification on the next run (state takes precedence over `cc-*` prefix heuristic). An **empty array** with the state file present means the skill last ran and is managing nothing — not the same as a missing state file, in which case the skill falls back to the prefix heuristic.
- `backend_catalogs` — per-backend probe results keyed by backend token. `probed_at` is the ISO 8601 timestamp at which the catalog was collected. Used by Merge mode to skip re-probing backends whose catalog is still fresh (≤7 days by default).
- `partial_probe` — non-null only when the user aborted a probe cycle mid-way. Contains the backends completed and a timestamp, and lets the next invocation offer to resume rather than restart the full cycle. Cleared once the probe cycle runs to completion.

## Runtime flow

1. Run read-only discovery via `scripts/discover.sh` (no `/v1/models` call, no file writes)
2. Present a short state summary and warn the user that Merge and Reset modes will temporarily disrupt their VibeProxy backend combination during the probe cycle
3. Ask the user to choose one of:
   - Keep
   - Merge update
   - Reset and reconfigure
4. If Keep is selected, report the current state from discovery output and stop
5. Ask the user which of the `authenticated_backends` they want to configure aliases for
6. Run the backend catalog probe cycle:
   - For each selected backend, instruct the user via `AskUserQuestion` to enable **only** that backend in the VibeProxy menu bar, wait for confirmation, call `scripts/probe_backend.sh` with the backend token as the claimed identity, and store the resulting catalog
   - Merge mode may reuse a cached catalog from `${CLAUDE_PLUGIN_DATA}/config.json` up to 7 days old for backends whose cache is still valid; the user may force a refresh
   - Reset mode always re-probes every selected backend
   - If the user aborts mid-cycle, persist any completed catalogs under `partial_probe` in state and exit cleanly
7. Ask for model selection per backend using the probe-assembled catalogs
8. Ask for effort variants where the selected backend/model combination exposes them
9. Ask whether any selected versioned aliases should also get shortcut shell aliases without version suffixes
10. Detect naming conflicts against existing shell and config entries and ask the user per conflict
11. Show a final change summary including canonical aliases, shortcut aliases, deletions, preserved manual entries, and backup paths. Wait for explicit confirmation before any write.
12. Persist the chosen configuration to `${CLAUDE_PLUGIN_DATA}/config.json` **before** touching `config.yaml` or `~/.zshrc`, so a crash between steps leaves the state file consistent with what the user approved
13. Write `~/.cli-proxy-api/config.yaml`
14. Write the managed `~/.zshrc` block
15. Restart gate: instruct the user via `AskUserQuestion` to quit VibeProxy from the menu bar, ensure **exactly** the backends they just configured aliases for are enabled in the UI, relaunch VibeProxy, and confirm. `merged-config.yaml` is regenerated only on app launch, so validation before this step will read a stale routing table and produce false negatives.
16. Validate each managed canonical alias by issuing a minimal `POST /v1/chat/completions` with `max_tokens: 1` and the alias as the `model` field. Success = HTTP 200. HTTP 4xx (e.g. model not found) means the alias is missing or misconfigured — trigger rollback. HTTP 5xx is treated as an upstream problem unrelated to skill correctness — log and continue. Do **not** enumerate `/v1/models` to validate alias existence; routing priority collapses same-named aliases from lower-priority backends out of the listing and produces false negatives for alias sets that are actually configured correctly.
17. Ensure generic shared model names are not presented as the managed switching surface for selected models unless the user explicitly requested compatibility behavior
18. On validation failure, rollback both `config.yaml` and the managed `~/.zshrc` block together from the backups written in steps 13–14, report which canonical aliases failed, and leave the user in the pre-run state. Rollback coordination is the orchestrating skill's responsibility, not either writer's.

## UX expectations

When existing setup is detected, the skill should lead with a compact summary rather than dumping raw config.

The summary should include:

- VibeProxy reachability
- detected backends
- number of managed aliases currently present
- presence of user overlay
- count of possible manual conflicts

The skill should then move immediately to mode selection.

This keeps the experience useful for users who already have a partial setup and want either a careful update or a clean rebuild of only the managed pieces.

## Validation and failure handling

### Validation method

Validation issues one minimal `POST /v1/chat/completions` per managed canonical alias, with `max_tokens: 1` and the alias as the `model` field. An HTTP 200 response means the alias resolves through VibeProxy's routing table and the upstream backend accepted the request. HTTP 4xx with a "model not found"–shaped error means the alias is missing from the rebuilt `merged-config.yaml` or mis-spelled, and the validation fails for that alias. HTTP 5xx indicates an upstream outage unrelated to this skill's correctness and is logged but not treated as a validation failure.

Validation **must not** enumerate `/v1/models` to check alias existence. `/v1/models` returns one `owned_by` per model reflecting current routing priority, which means two correctly configured aliases that share the same upstream name under different backends will collapse into a single listing entry. The lower-priority alias appears to be missing even though it is fully configured and routable. Enumeration-based validation therefore produces false negatives that trigger unnecessary rollbacks.

### Rollback

The default failure strategy is transactional full rollback.

If validation fails after writing:

- rollback `~/.cli-proxy-api/config.yaml` to the backup state created in runtime-flow step 13
- rollback the managed `~/.zshrc` block to the backup state created in runtime-flow step 14
- the state file written in runtime-flow step 12 is **kept** on rollback, because it still reflects the user's approved selection and is needed to re-identify managed entries on the next invocation
- report which canonical aliases failed validation and the exact HTTP status codes
- report where backups were written
- leave the user in the pre-run state for `config.yaml` and `~/.zshrc`

Rollback coordination is the orchestrating skill's responsibility, not either writer's. Each writer is responsible only for creating a restorable backup before mutation and for exposing the backup path back to the orchestrator. If one writer succeeds and the other fails mid-apply, the orchestrator is responsible for rolling back the succeeded side from the returned backup path.

Transactional rollback is preferable to partial rollback because the shell alias block and model alias config form a coupled unit. Leaving one side updated and the other rolled back creates a broken and confusing intermediate state.

## `cc-list` format

`cc-list` should be generated from the actual selected aliases and use a fixed description column start.

Example:

```text
cc-codex-gpt54-high      Codex · GPT-5.4 · high
cc-copilot-gpt54-high    Copilot · GPT-5.4 · high
cc-copilot-opus46        Copilot · Claude Opus 4.6
cc-copilot-opus          Shortcut → cc-copilot-opus46
cc-gravity-opus46        Antigravity · Claude Opus 4.6
cc-gemini25pro           Gemini · 2.5 Pro
```

## Out of scope

The redesign does not attempt to:

- programmatically toggle VibeProxy UI providers
- own the full `config.yaml`
- rewrite unrelated shell aliases
- preserve all preexisting Copilot compatibility aliases unless the user explicitly asks for them
- infer every possible nickname beyond the selected alias naming rules and optional user-requested shortcuts

## Success criteria

The redesign is successful if:

1. a fresh user can create a working alias set through guided questions
2. an existing user can choose merge update without losing unrelated config
3. an existing user can choose reset and reconfigure without wiping unrelated config
4. GPT-5.4 aliases can be generated separately for Codex and Copilot
5. versioned aliases are the canonical output format
6. optional shortcut shell aliases can be added on top of canonical aliases when the user explicitly asks for them
7. `cc-list` output is aligned and readable for all generated aliases
8. validation failure restores both config and shell state automatically
