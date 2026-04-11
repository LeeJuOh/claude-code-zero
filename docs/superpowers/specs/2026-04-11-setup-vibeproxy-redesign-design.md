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

## Architecture

The redesigned skill is split into four parts.

### SKILL.md

Acts as the orchestration layer.

Responsibilities:

- explain current state
- ask for mode selection
- gather backend, model, effort, and optional shortcut-alias preferences
- handle per-alias conflict decisions
- summarize pending changes before apply
- run validation and report rollback if needed

### `scripts/discover.sh`

Read-only discovery script that emits normalized JSON to stdout.

Responsibilities:

- verify VibeProxy availability
- fetch `/v1/models`
- detect authenticated backends from `~/.cli-proxy-api/*.json`
- inspect existing `~/.cli-proxy-api/config.yaml`
- inspect the managed block in `~/.zshrc`
- identify existing managed aliases and potential manual conflicts

Output contract:

```json
{
  "vibeproxy_reachable": true,
  "user_overlay_exists": true,
  "has_managed_zsh_block": true,
  "backends": [
    {
      "token": "codex",
      "config_key": "codex",
      "display_name": "Codex",
      "authenticated": true,
      "models": ["gpt-5.4", "gpt-5.4(high)"]
    },
    {
      "token": "copilot",
      "config_key": "github-copilot",
      "display_name": "GitHub Copilot",
      "authenticated": true,
      "models": ["gpt-5.4", "claude-opus-4.6", "claude-sonnet-4.6"]
    },
    {
      "token": "gravity",
      "config_key": "antigravity",
      "display_name": "Antigravity",
      "authenticated": true,
      "models": ["claude-opus-4-6-thinking"]
    },
    {
      "token": "gemini",
      "config_key": "gemini-cli",
      "display_name": "Gemini",
      "authenticated": true,
      "models": ["gemini-2.5-pro"]
    }
  ],
  "managed_shell_aliases": ["cc-codex-gpt54-high", "cc-copilot-opus46"],
  "managed_model_aliases": [
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
  ],
  "conflicts": [
    {
      "alias": "cc-copilot-opus46",
      "source": "manual-shell-alias"
    }
  ]
}
```

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

`${CLAUDE_PLUGIN_DATA}/config.json` is the skill's source of truth for what it last created.

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
  ],
  "shortcut_shell_aliases": [
    {
      "alias": "cc-copilot-opus",
      "target": "cc-copilot-opus46"
    }
  ]
}
```

## Runtime flow

1. Run discovery
2. Present a short state summary
3. Ask the user to choose one of:
   - Keep
   - Merge update
   - Reset and reconfigure
4. Confirm that every backend the user wants to use is enabled in the VibeProxy UI
5. Ask for backend selection
6. Ask for model selection per backend
7. Ask for effort variants where applicable
8. Ask whether any selected versioned aliases should also get shortcut shell aliases without version suffixes
9. Detect naming conflicts and ask per conflict
10. Show a final change summary including canonical aliases, shortcut aliases, deletions, preserved manual entries, and backup paths
11. Persist the chosen configuration to `${CLAUDE_PLUGIN_DATA}/config.json`
12. Write `config.yaml`
13. Write the managed `~/.zshrc` block
14. Validate the resulting canonical aliases against `/v1/models`
15. Ensure generic shared model names are not presented as the managed switching surface for selected models unless the user explicitly requested compatibility behavior
16. On failure, rollback both config and shell changes together and report the failure clearly

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

The default failure strategy is transactional full rollback.

If validation fails after writing:

- rollback `~/.cli-proxy-api/config.yaml` to the backup state
- rollback the managed `~/.zshrc` block to the backup state
- report which canonical alias checks failed
- report where backups were written
- leave the user in the pre-run state

This is preferable to partial rollback because the shell alias block and model alias config form a coupled unit. Leaving one side updated and the other rolled back creates a broken and confusing intermediate state.

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
