# vibeproxy-kit setup-aliases Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the VibeProxy alias setup (now the `setup-aliases` skill in the `vibeproxy-kit` plugin) as a state-aware alias manager that discovers current VibeProxy state, lets the user choose backend-specific aliases, rewrites only skill-managed config and shell blocks, and prevents implicit backend hopping.

**Architecture:** Split the current one-file shell setup into a read-only discovery script, a config writer, a zshrc writer, and a rewritten orchestration skill. Canonical aliases become backend-specific and versioned; optional shortcut shell aliases point at canonical aliases; the persisted config file becomes the primary source of truth for managed entries; validation checks only the managed switching surface and rolls back both files together on failure.

**Tech Stack:** Claude Code skill markdown, Bash, Python 3, VibeProxy local HTTP API, YAML file mutation with round-trip preservation, zsh alias blocks

---

## File structure

- Modify: `plugins/vibeproxy-kit/skills/setup-aliases/SKILL.md`
  - Rewrite the skill flow from one-shot bootstrap to discover → choose mode → choose aliases → apply → validate.
- Delete: `plugins/vibeproxy-kit/skills/setup-aliases/scripts/setup.sh`
  - Remove the fixed one-shot alias writer once replacement scripts exist.
- Create: `plugins/vibeproxy-kit/skills/setup-aliases/scripts/discover.sh`
  - Emit normalized JSON describing current VibeProxy state, available backends/models, managed aliases, generic-name visibility, and conflicts.
- Create: `plugins/vibeproxy-kit/skills/setup-aliases/scripts/write_user_config.py`
  - Read JSON from stdin, rewrite only skill-managed `oauth-model-alias` entries while preserving unrelated YAML, and support rollback backups.
- Create: `plugins/vibeproxy-kit/skills/setup-aliases/scripts/write_zshrc.sh`
  - Replace only the managed shell block, generate `cc-list`, add optional shortcut aliases, and keep manual aliases untouched.
- Create: `plugins/vibeproxy-kit/skills/setup-aliases/scripts/tests/test_write_user_config.py`
  - Verify merge/reset behavior, YAML preservation, managed-entry targeting, and generic-name policy in Python.
- Create: `plugins/vibeproxy-kit/skills/setup-aliases/scripts/tests/test_discover.sh`
  - Verify discovery JSON shape, managed/manual classification, and conflict detection.
- Create: `plugins/vibeproxy-kit/skills/setup-aliases/scripts/tests/test_write_zshrc.sh`
  - Verify marker replacement, canonical alias output, shortcut alias generation, and shortcut conflict handling.
- Modify: `docs/superpowers/specs/2026-04-11-setup-vibeproxy-redesign-design.md`
  - Only if implementation reveals a spec mismatch that must be corrected before merge.

---

### Task 1: Define persisted-state-first managed ownership

**Files:**
- Create: `plugins/vibeproxy-kit/skills/setup-aliases/scripts/tests/test_write_user_config.py`
- Create: `plugins/vibeproxy-kit/skills/setup-aliases/scripts/tests/test_discover.sh`
- Create: `plugins/vibeproxy-kit/skills/setup-aliases/scripts/write_user_config.py`
- Create: `plugins/vibeproxy-kit/skills/setup-aliases/scripts/discover.sh`

- [ ] **Step 1: Write a failing Python test for managed ownership priority**

```python
import json
import subprocess
import tempfile
from pathlib import Path


def test_reset_uses_persisted_state_before_cc_prefix_fallback():
    with tempfile.TemporaryDirectory() as tmp:
        tmp = Path(tmp)
        config_path = tmp / "config.yaml"
        state_path = tmp / "state.json"
        config_path.write_text(
            """
oauth-model-alias:
  codex:
    - name: "gpt-5.4(high)"
      alias: "cc-codex-gpt54-high"
    - name: "gpt-5.4(medium)"
      alias: "cc-user-custom"
""".strip()
        )
        state_path.write_text(json.dumps({
            "version": 1,
            "managed_model_aliases": [
                {"channel": "codex", "name": "gpt-5.4(high)", "alias": "cc-codex-gpt54-high"}
            ],
            "managed_shell_aliases": ["cc-codex-gpt54-high"]
        }))
        payload = {
            "mode": "reset",
            "config_path": str(config_path),
            "backup_path": str(config_path) + ".bak",
            "state_path": str(state_path),
            "managed_aliases": []
        }
        subprocess.run(
            ["python3", "plugins/vibeproxy-kit/skills/setup-aliases/scripts/write_user_config.py"],
            input=json.dumps(payload),
            text=True,
            check=True,
        )
        updated = config_path.read_text()
        assert 'cc-codex-gpt54-high' not in updated
        assert 'cc-user-custom' in updated
```

- [ ] **Step 2: Write a failing shell test for discovery conflict classification**

```bash
#!/usr/bin/env bash
set -euo pipefail

TMPDIR_ROOT="$(mktemp -d)"
trap 'rm -rf "$TMPDIR_ROOT"' EXIT

export HOME="$TMPDIR_ROOT/home"
mkdir -p "$HOME/.cli-proxy-api" "$HOME/.local/share/vibeproxy-kit"
cat > "$HOME/.local/share/vibeproxy-kit/config.json" <<'EOF'
{"version":1,"managed_shell_aliases":["cc-codex-gpt54-high"],"managed_model_aliases":[{"channel":"codex","name":"gpt-5.4(high)","alias":"cc-codex-gpt54-high"}]}
EOF
cat > "$HOME/.zshrc" <<'EOF'
alias cc-codex-gpt54-high='ANTHROPIC_MODEL=cc-codex-gpt54-high claude'
alias cc-copilot-opus46='custom-wrapper'
EOF
cat > "$HOME/.cli-proxy-api/config.yaml" <<'EOF'
oauth-model-alias:
  codex:
    - name: "gpt-5.4(high)"
      alias: "cc-codex-gpt54-high"
EOF

OUT="$TMPDIR_ROOT/out.json"
VIBEPROXY_KIT_STATE_PATH="$HOME/.local/share/vibeproxy-kit/config.json" \
VP_MODELS_JSON='{"data":[{"id":"gpt-5.4(high)","owned_by":"openai"}]}' \
  bash plugins/vibeproxy-kit/skills/setup-aliases/scripts/discover.sh > "$OUT"

python3 - <<'PY' "$OUT"
import json, sys
j = json.load(open(sys.argv[1]))
assert 'cc-codex-gpt54-high' in j['managed_shell_aliases']
assert any(c['alias'] == 'cc-copilot-opus46' for c in j['conflicts'])
PY
```

- [ ] **Step 3: Run the tests to verify they fail**

Run:
```bash
python3 -m pytest plugins/vibeproxy-kit/skills/setup-aliases/scripts/tests/test_write_user_config.py -k managed_ownership_priority -v && \
bash plugins/vibeproxy-kit/skills/setup-aliases/scripts/tests/test_discover.sh
```
Expected: FAIL because the scripts do not exist yet.

- [ ] **Step 4: Implement managed ownership helpers in both scripts**

```python
# write_user_config.py helper shape

def load_state(path_str: str | None) -> dict:
    if not path_str:
        return {"version": 1, "managed_model_aliases": [], "managed_shell_aliases": [], "shortcut_shell_aliases": []}
    path = Path(path_str).expanduser()
    if not path.exists():
        return {"version": 1, "managed_model_aliases": [], "managed_shell_aliases": [], "shortcut_shell_aliases": []}
    return json.loads(path.read_text())


def managed_alias_names(state: dict, existing_entries: list[dict]) -> set[str]:
    state_names = {item['alias'] for item in state.get('managed_model_aliases', [])}
    if state_names:
        return state_names
    return {item['alias'] for item in existing_entries if item['alias'].startswith('cc-')}
```

```bash
# discover.sh responsibility additions
# - read VIBEPROXY_KIT_STATE_PATH if present
# - classify aliases found in ~/.zshrc as managed only when they appear in persisted state
# - treat unmatched cc-* aliases as manual unless no persisted state exists
```

- [ ] **Step 5: Run the tests to verify they pass**

Run:
```bash
python3 -m pytest plugins/vibeproxy-kit/skills/setup-aliases/scripts/tests/test_write_user_config.py -k managed_ownership_priority -v && \
bash plugins/vibeproxy-kit/skills/setup-aliases/scripts/tests/test_discover.sh
```
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add plugins/vibeproxy-kit/skills/setup-aliases/scripts/discover.sh \
        plugins/vibeproxy-kit/skills/setup-aliases/scripts/write_user_config.py \
        plugins/vibeproxy-kit/skills/setup-aliases/scripts/tests/test_discover.sh \
        plugins/vibeproxy-kit/skills/setup-aliases/scripts/tests/test_write_user_config.py
git commit -m "feat: add managed ownership tracking for vibeproxy"
```

---

### Task 2: Implement discovery contract with explicit backend metadata

**Files:**
- Modify: `plugins/vibeproxy-kit/skills/setup-aliases/scripts/discover.sh` (extend skeleton from Task 1 with full contract)
- Modify: `plugins/vibeproxy-kit/skills/setup-aliases/scripts/tests/test_discover.sh`

- [ ] **Step 1: Extend the failing discovery test with backend and generic-name assertions**

```bash
cat > "$HOME/.cli-proxy-api/config.yaml" <<'EOF'
oauth-model-alias:
  github-copilot:
    - name: "claude-opus-4.6"
      alias: "cc-copilot-opus46"
      fork: false
EOF

OUT="$TMPDIR_ROOT/out.json"
VIBEPROXY_KIT_STATE_PATH="$HOME/.local/share/vibeproxy-kit/config.json" \
VP_MODELS_JSON='{"data":[{"id":"claude-opus-4.6","owned_by":"github-copilot"},{"id":"cc-copilot-opus46","owned_by":"github-copilot"}]}' \
  bash plugins/vibeproxy-kit/skills/setup-aliases/scripts/discover.sh > "$OUT"

python3 - <<'PY' "$OUT"
import json, sys
j = json.load(open(sys.argv[1]))
backend = next(b for b in j['backends'] if b['token'] == 'copilot')
assert backend['config_key'] == 'github-copilot'
assert 'claude-opus-4.6' in backend['models']
assert j['generic_shared_names_visible'] is True
assert 'vibeproxy_installed' in j
PY
```

- [ ] **Step 2: Run the discovery test to verify it fails**

Run: `bash plugins/vibeproxy-kit/skills/setup-aliases/scripts/tests/test_discover.sh`
Expected: FAIL until discovery emits the full contract.

- [ ] **Step 3: Implement the real discovery JSON contract**

```bash
# discover.sh output keys must include
# - vibeproxy_installed      (bool — /Applications/VibeProxy.app exists)
# - vibeproxy_reachable      (bool — localhost:8318 responds)
# - user_overlay_exists
# - has_managed_zsh_block
# - generic_shared_names_visible
# - backends[] with token/config_key/display_name/authenticated/models
# - managed_shell_aliases
# - managed_model_aliases
# - manual_shell_aliases
# - conflicts[]
```

```bash
# discover.sh MUST bootstrap ruamel.yaml before any downstream script runs.
# Place this near the top of discover.sh, after arg parsing:
if ! python3 -c "import ruamel.yaml" 2>/dev/null; then
  python3 -m pip install --user --quiet ruamel.yaml >/dev/null 2>&1 || {
    echo '{"error":"ruamel.yaml install failed","hint":"run: python3 -m pip install --user ruamel.yaml"}'
    exit 1
  }
fi
```

```python
# Python block inside discover.sh should map providers exactly as:
provider_map = {
    'openai': ('codex', 'codex', 'Codex'),
    'github-copilot': ('copilot', 'github-copilot', 'GitHub Copilot'),
    'antigravity': ('gravity', 'antigravity', 'Antigravity'),
    'google': ('gemini', 'gemini-cli', 'Gemini'),
}
```

- [ ] **Step 4: Run the discovery test to verify it passes**

Run: `bash plugins/vibeproxy-kit/skills/setup-aliases/scripts/tests/test_discover.sh`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add plugins/vibeproxy-kit/skills/setup-aliases/scripts/discover.sh \
        plugins/vibeproxy-kit/skills/setup-aliases/scripts/tests/test_discover.sh
git commit -m "feat: add explicit vibeproxy discovery contract"
```

---

### Task 3: Implement YAML-preserving config writer

**Files:**
- Modify: `plugins/vibeproxy-kit/skills/setup-aliases/scripts/write_user_config.py` (extend skeleton from Task 1 with yaml preservation)
- Modify: `plugins/vibeproxy-kit/skills/setup-aliases/scripts/tests/test_write_user_config.py`

- [ ] **Step 1: Add failing tests for YAML preservation and generic-name policy**

```python
def test_merge_preserves_unrelated_yaml_sections():
    config_text = """
openai-api-key: test-key
oauth-excluded-models:
  codex:
    - gpt-4.1
oauth-model-alias:
  codex:
    - name: \"gpt-5.4(high)\"
      alias: \"cc-codex-gpt54-high\"
""".strip()
    payload = {
        "mode": "merge",
        "state_path": None,
        "managed_aliases": [
            {"channel": "codex", "name": "gpt-5.4(medium)", "alias": "cc-codex-gpt54-med", "fork": False}
        ]
    }
    new_text, _ = run_writer(config_text, payload)
    assert 'openai-api-key: test-key' in new_text
    assert 'oauth-excluded-models:' in new_text
    assert 'cc-codex-gpt54-med' in new_text


def test_generic_name_is_not_preserved_by_default():
    config_text = """
oauth-model-alias:
  github-copilot:
    - name: \"claude-opus-4.6\"
      alias: \"cc-copilot-opus46\"
      fork: true
""".strip()
    payload = {
        "mode": "merge",
        "state_path": None,
        "managed_aliases": [
            {"channel": "github-copilot", "name": "claude-opus-4.6", "alias": "cc-copilot-opus46", "fork": False}
        ]
    }
    new_text, _ = run_writer(config_text, payload)
    assert 'fork: true' not in new_text
```

- [ ] **Step 2: Run the test file to verify it fails**

Run: `python3 -m pytest plugins/vibeproxy-kit/skills/setup-aliases/scripts/tests/test_write_user_config.py -v`
Expected: FAIL until the writer preserves unrelated YAML and handles `fork` explicitly.

- [ ] **Step 3: Implement round-trip YAML mutation instead of rebuilding the file from scratch**

```python
#!/usr/bin/env python3
import json
import shutil
import sys
from pathlib import Path

try:
    from ruamel.yaml import YAML
except ImportError as exc:
    raise SystemExit('ruamel.yaml is required for write_user_config.py') from exc


def ensure_mapping(root, key):
    value = root.get(key)
    if value is None:
        root[key] = {}
        value = root[key]
    return value


def remove_managed_entries(channel_entries, managed_names):
    kept = []
    for item in channel_entries:
        alias = item.get('alias')
        if alias not in managed_names:
            kept.append(item)
    channel_entries[:] = kept
```

```python
# writer responsibilities that must be implemented
# 1. load full YAML document
# 2. keep unrelated top-level keys untouched
# 3. remove only managed aliases for reset/merge replacement
# 4. write fork explicitly when payload item requests compatibility behavior
# 5. save backups before write
# 6. emit updated alias list as JSON to stdout
```

- [ ] **Step 4: Run the test file to verify it passes**

Run: `python3 -m pytest plugins/vibeproxy-kit/skills/setup-aliases/scripts/tests/test_write_user_config.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add plugins/vibeproxy-kit/skills/setup-aliases/scripts/write_user_config.py \
        plugins/vibeproxy-kit/skills/setup-aliases/scripts/tests/test_write_user_config.py
git commit -m "feat: preserve yaml while updating vibeproxy aliases"
```

---

### Task 4: Implement zshrc writer with shortcut conflict handling

**Files:**
- Create: `plugins/vibeproxy-kit/skills/setup-aliases/scripts/write_zshrc.sh`
- Modify: `plugins/vibeproxy-kit/skills/setup-aliases/scripts/tests/test_write_zshrc.sh`

- [ ] **Step 1: Add failing tests for shortcut and canonical conflict preservation**

```bash
# Case 1: shortcut alias conflict — manual cc-copilot-opus must survive
cat > "$ZSHRC" <<'EOF'
export PATH="$HOME/bin:$PATH"
alias cc-copilot-opus='manual-wrapper'
EOF

bash plugins/vibeproxy-kit/skills/setup-aliases/scripts/write_zshrc.sh < "$PAYLOAD"
grep -q "alias cc-copilot-opus='manual-wrapper'" "$ZSHRC"

# Case 2: canonical alias conflict — manual cc-copilot-opus46 must survive
# unless the payload explicitly marks it as resolved_overwrite=true
cat > "$ZSHRC" <<'EOF'
alias cc-copilot-opus46='custom-wrapper-for-canonical'
EOF

bash plugins/vibeproxy-kit/skills/setup-aliases/scripts/write_zshrc.sh < "$PAYLOAD_CANONICAL_CONFLICT"
grep -q "alias cc-copilot-opus46='custom-wrapper-for-canonical'" "$ZSHRC"
```

- [ ] **Step 2: Run the test file to verify it fails**

Run: `bash plugins/vibeproxy-kit/skills/setup-aliases/scripts/tests/test_write_zshrc.sh`
Expected: FAIL until shortcut aliases are filtered or skipped on conflict.

- [ ] **Step 3: Implement managed-block replacement with explicit shortcut conflict filtering**

```bash
#!/usr/bin/env bash
set -euo pipefail

PAYLOAD_FILE="$(mktemp)"
trap 'rm -f "$PAYLOAD_FILE"' EXIT
cat > "$PAYLOAD_FILE"

python3 - <<'PY' "$PAYLOAD_FILE"
import json, sys
from pathlib import Path

payload = json.loads(Path(sys.argv[1]).read_text())
zshrc_path = Path(payload['zshrc_path']).expanduser()
existing = zshrc_path.read_text() if zshrc_path.exists() else ''
manual_conflicts = set(payload.get('manual_shell_aliases', []))

# build marker block
# - always write canonical aliases
# - only write shortcut aliases not present in manual_conflicts
# - generate cc-list from canonical aliases plus surviving shortcuts
PY
```

- [ ] **Step 4: Run the test file to verify it passes**

Run: `bash plugins/vibeproxy-kit/skills/setup-aliases/scripts/tests/test_write_zshrc.sh`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add plugins/vibeproxy-kit/skills/setup-aliases/scripts/write_zshrc.sh \
        plugins/vibeproxy-kit/skills/setup-aliases/scripts/tests/test_write_zshrc.sh
git commit -m "feat: add safe zshrc alias writer"
```

---

### Task 5: Rewrite SKILL.md orchestration around the real contracts

**Files:**
- Modify: `plugins/vibeproxy-kit/skills/setup-aliases/SKILL.md`
- Delete: `plugins/vibeproxy-kit/skills/setup-aliases/scripts/setup.sh`

- [ ] **Step 1: Write the failing orchestration checklist**

```text
Expected skill behavior:
1. Run discovery first
2. Present Keep / Merge update / Reset and reconfigure
3. Ask backend questions from discovered enabled/authenticated backends
4. Ask model questions from discovered backend model lists
5. Ask whether to create shortcut shell aliases for versioned canonical aliases
6. Pass managed_aliases, shortcut_aliases, state_path, and manual conflict info to writers
7. Validate canonical aliases only
8. Refuse to treat generic shared names as the managed switching surface by default
```

- [ ] **Step 2: Verify the current skill fails this checklist**

Run: `Read plugins/vibeproxy-kit/skills/setup-aliases/SKILL.md`
Expected: Current file still describes a one-shot bootstrap flow and a single `setup.sh` script.

- [ ] **Step 3: Rewrite the skill with explicit question and payload stages**

```md
---
name: setup-aliases
description: "Configure or rebuild backend-specific VibeProxy aliases. Use when the user wants to set up, reset, or customize Claude Code aliases for Codex, Copilot, Antigravity, or Gemini through VibeProxy."
allowed-tools: Bash, AskUserQuestion, Read
---

# VibeProxy Alias Manager

1. Run `scripts/discover.sh` first.
2. If `vibeproxy_installed` is false, tell the user to download VibeProxy from the GitHub releases page (URL: `<VIBEPROXY_RELEASES_URL>` — fill in canonical URL) and install to `/Applications`. Stop.
3. If `vibeproxy_installed` is true but `vibeproxy_reachable` is false, tell the user to launch VibeProxy from the menu bar, then re-invoke the skill. Stop.
4. Summarize reachability, authenticated backends, managed aliases, generic shared-name visibility, and conflicts.
5. Ask the user to choose Keep, Merge update, or Reset and reconfigure.
6. If Keep is selected, report the current state and stop.
7. Ask which backends to configure using discovered backend tokens.
8. Ask which models to expose per backend using discovered model lists.
9. Ask which effort variants to expose when a model supports them.
10. Ask whether to add shortcut shell aliases for selected canonical versioned aliases.
11. Ask about each canonical and shortcut conflict before writing.
12. Send JSON to `write_user_config.py` with `mode`, `state_path`, `managed_aliases`, and `backup_path`.
13. Send JSON to `write_zshrc.sh` with `canonical_aliases`, `shortcut_aliases`, `manual_shell_aliases`, and `zshrc_path`.
14. **VibeProxy restart gate:** ask the user to quit VibeProxy from the menu bar and relaunch it. `merged-config.yaml` is only regenerated on app launch, so validation against `/v1/models` will fail until restart completes. Wait for user confirmation via `AskUserQuestion` before proceeding.
15. Re-fetch `/v1/models` and verify every canonical alias is present.
16. If validation fails, restore backups and report the exact canonical aliases that failed.

## Gotchas

- Running this skill disables VibeProxy's built-in Claude hyphen↔dot compatibility aliases for `github-copilot` (e.g. `claude-opus-4-6` → `claude-opus-4.6`). This is intentional — the managed surface is explicit `cc-*` aliases only. Direct calls with raw hyphenated model names will stop working after first run; use `cc-copilot-opus46` instead.
- `ruamel.yaml` is auto-installed by `discover.sh` on first run via `pip install --user`. If the install fails (air-gapped machine, locked Python), install manually: `python3 -m pip install --user ruamel.yaml`.
```

- [ ] **Step 4: Remove the obsolete fixed setup script**

```bash
git rm plugins/vibeproxy-kit/skills/setup-aliases/scripts/setup.sh
```

- [ ] **Step 5: Commit**

```bash
git add plugins/vibeproxy-kit/skills/setup-aliases/SKILL.md
git commit -m "feat: redesign vibeproxy-kit setup-aliases orchestration"
```

---

### Task 6: Validate full redesign against spec-critical edge cases

**Files:**
- Test: `plugins/vibeproxy-kit/skills/setup-aliases/scripts/tests/test_discover.sh`
- Test: `plugins/vibeproxy-kit/skills/setup-aliases/scripts/tests/test_write_user_config.py`
- Test: `plugins/vibeproxy-kit/skills/setup-aliases/scripts/tests/test_write_zshrc.sh`
- Modify: `plugins/vibeproxy-kit/skills/setup-aliases/SKILL.md` (only if validation reveals wording bugs)

- [ ] **Step 1: Run the automated tests**

```bash
bash plugins/vibeproxy-kit/skills/setup-aliases/scripts/tests/test_discover.sh && \
python3 -m pytest plugins/vibeproxy-kit/skills/setup-aliases/scripts/tests/test_write_user_config.py -v && \
bash plugins/vibeproxy-kit/skills/setup-aliases/scripts/tests/test_write_zshrc.sh
```

Expected: PASS

- [ ] **Step 2: Run plugin validation**

```bash
unset CLAUDECODE && claude plugin validate .
```

Expected: `Validation successful` or equivalent success output.

- [ ] **Step 3: Dry-run the skill manually against the local environment**

```text
Invoke /setup-aliases and confirm that:
- discovery summary matches current VibeProxy state
- mode selection appears
- canonical aliases use versioned backend-specific names
- shortcut aliases are optional, not canonical
- generic shared names are not presented as the managed switching surface
- validation checks canonical aliases only
```

- [ ] **Step 4: Reproduce and verify the backend-hop prevention case**

```text
From a backend-specific session, verify that the managed alias surface exposes canonical names such as `cc-copilot-opus46` and `cc-gravity-opus46` rather than relying on generic names such as `claude-opus-4.6`.
```

- [ ] **Step 5: Fix only the issues found during validation, then rerun the affected checks**

```bash
bash plugins/vibeproxy-kit/skills/setup-aliases/scripts/tests/test_discover.sh
python3 -m pytest plugins/vibeproxy-kit/skills/setup-aliases/scripts/tests/test_write_user_config.py -v
bash plugins/vibeproxy-kit/skills/setup-aliases/scripts/tests/test_write_zshrc.sh
unset CLAUDECODE && claude plugin validate .
```

Expected: all rerun checks PASS.

- [ ] **Step 6: Commit**

```bash
git add plugins/vibeproxy-kit/skills/setup-aliases/SKILL.md \
        plugins/vibeproxy-kit/skills/setup-aliases/scripts/discover.sh \
        plugins/vibeproxy-kit/skills/setup-aliases/scripts/write_user_config.py \
        plugins/vibeproxy-kit/skills/setup-aliases/scripts/write_zshrc.sh \
        plugins/vibeproxy-kit/skills/setup-aliases/scripts/tests/test_discover.sh \
        plugins/vibeproxy-kit/skills/setup-aliases/scripts/tests/test_write_zshrc.sh \
        plugins/vibeproxy-kit/skills/setup-aliases/scripts/tests/test_write_user_config.py
git commit -m "test: validate vibeproxy-kit setup-aliases redesign"
```

---

## Self-review

- **Spec coverage:** The plan now covers persisted-state-first managed ownership, backend-specific alias generation, optional shortcut aliases, reset/merge flows, YAML preservation, generic-name suppression, dynamic `cc-list`, rollback, validation, install detection with GitHub releases handoff, ruamel.yaml auto-bootstrap, canonical+shortcut conflict preservation, and the VibeProxy restart gate before validation.
- **Placeholder scan:** `<VIBEPROXY_RELEASES_URL>` in Task 5 Step 3 is a deliberate placeholder — implementer must fill in the canonical releases URL before commit. No other `TODO`/`TBD` markers remain.
- **Type consistency:** Canonical alias shape stays `cc-<backend>-<model-version>[-<effort>]`; shortcut aliases are shell-only; persisted state remains the primary managed-entry source; writer payloads consistently use `managed_aliases`, `channel`, `name`, `alias`, and optional `fork`.
