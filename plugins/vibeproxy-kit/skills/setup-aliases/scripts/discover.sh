#!/usr/bin/env bash
set -euo pipefail

# discover.sh — read-only state inspection for setup-aliases.
# Emits a single JSON blob to stdout. Never mutates any file or external state.
# Never calls /v1/models — per-backend catalogs are collected by probe_backend.sh
# during a separate probe cycle driven by the orchestrating SKILL.md.

VIBEPROXY_APP="/Applications/VibeProxy.app"
VIBEPROXY_BIN="${VIBEPROXY_APP}/Contents/Resources/cli-proxy-api-plus"
PROXY_URL="${VIBEPROXY_URL:-http://localhost:8318}"
USER_CONFIG="${HOME}/.cli-proxy-api/config.yaml"
AUTH_DIR="${HOME}/.cli-proxy-api"
ZSHRC="${HOME}/.zshrc"

STATE_DIR="${CLAUDE_PLUGIN_DATA:-${HOME}/.claude/plugins/data/vibeproxy-kit-claude-code-zero}"
STATE_FILE="${STATE_DIR}/config.json"

ZSH_MARK_BEGIN="# >>> vibeproxy-kit managed block >>>"
ZSH_MARK_END="# <<< vibeproxy-kit managed block <<<"

vibeproxy_installed=false
vibeproxy_reachable=false
user_overlay_exists=false
has_managed_zsh_block=false

if [ -f "$VIBEPROXY_BIN" ]; then vibeproxy_installed=true; fi
if [ -f "$USER_CONFIG" ]; then user_overlay_exists=true; fi

if command -v curl >/dev/null 2>&1; then
  code=$(curl -s --max-time 2 -o /dev/null -w '%{http_code}' "${PROXY_URL}/" 2>/dev/null || echo "000")
  case "$code" in
    200|301|302|400|404) vibeproxy_reachable=true ;;
  esac
fi

if [ -f "$ZSHRC" ] && grep -qF "$ZSH_MARK_BEGIN" "$ZSHRC" 2>/dev/null; then
  has_managed_zsh_block=true
fi

python3 - "$USER_CONFIG" "$AUTH_DIR" "$ZSHRC" "$STATE_FILE" \
         "$ZSH_MARK_BEGIN" "$ZSH_MARK_END" \
         "$vibeproxy_installed" "$vibeproxy_reachable" \
         "$user_overlay_exists" "$has_managed_zsh_block" <<'PY'
import json
import os
import re
import sys

(user_config_path, auth_dir, zshrc_path, state_file_path,
 zsh_mark_begin, zsh_mark_end,
 vibeproxy_installed_s, vibeproxy_reachable_s,
 user_overlay_exists_s, has_managed_zsh_block_s) = sys.argv[1:]


def as_bool(v: str) -> bool:
    return v == "true"


vibeproxy_installed = as_bool(vibeproxy_installed_s)
vibeproxy_reachable = as_bool(vibeproxy_reachable_s)
user_overlay_exists = as_bool(user_overlay_exists_s)
has_managed_zsh_block = as_bool(has_managed_zsh_block_s)

BACKENDS = [
    {"token": "codex",   "config_key": "codex",          "display_name": "Codex",          "auth_prefix": "codex-"},
    {"token": "copilot", "config_key": "github-copilot", "display_name": "GitHub Copilot", "auth_prefix": "github-copilot-"},
    {"token": "gravity", "config_key": "antigravity",    "display_name": "Antigravity",    "auth_prefix": "antigravity-"},
    {"token": "gemini",  "config_key": "gemini-cli",     "display_name": "Gemini",         "auth_prefix": "gemini-"},
]

home = os.path.expanduser("~")


def tildify(path: str) -> str:
    return path.replace(home, "~", 1) if path.startswith(home) else path


authenticated = []
try:
    auth_files = sorted(os.listdir(auth_dir)) if os.path.isdir(auth_dir) else []
except OSError:
    auth_files = []

for b in BACKENDS:
    prefix = b["auth_prefix"]
    matches = [
        f for f in auth_files
        if f.endswith(".json") and f.startswith(prefix)
    ]
    if not matches:
        continue
    authenticated.append({
        "token": b["token"],
        "config_key": b["config_key"],
        "display_name": b["display_name"],
        "auth_files": [tildify(os.path.join(auth_dir, f)) for f in matches],
    })

state = None
if os.path.isfile(state_file_path):
    try:
        with open(state_file_path, "r", encoding="utf-8") as fh:
            state = json.load(fh)
    except (json.JSONDecodeError, OSError):
        state = None

state_present = isinstance(state, dict)
state_managed_shell = set()
state_managed_model = []
state_shortcut_shell = []
state_backend_catalogs = {}
state_partial_probe = None
if state_present:
    raw_shell = state.get("managed_shell_aliases")
    if isinstance(raw_shell, list):
        state_managed_shell = {s for s in raw_shell if isinstance(s, str)}
    raw_model = state.get("managed_model_aliases")
    if isinstance(raw_model, list):
        state_managed_model = [e for e in raw_model if isinstance(e, dict)]
    raw_shortcut = state.get("shortcut_shell_aliases")
    if isinstance(raw_shortcut, list):
        state_shortcut_shell = [e for e in raw_shortcut if isinstance(e, dict)]
    raw_catalogs = state.get("backend_catalogs")
    if isinstance(raw_catalogs, dict):
        state_backend_catalogs = raw_catalogs
    state_partial_probe = state.get("partial_probe")

overlay_root = {}
overlay_load_error = None
if user_overlay_exists:
    try:
        try:
            from ruamel.yaml import YAML  # type: ignore
            yaml_rt = YAML(typ="rt")
            with open(user_config_path, "r", encoding="utf-8") as fh:
                loaded = yaml_rt.load(fh)
            if loaded is not None:
                overlay_root = dict(loaded)
        except ImportError:
            import yaml as pyyaml  # type: ignore
            with open(user_config_path, "r", encoding="utf-8") as fh:
                loaded = pyyaml.safe_load(fh)
            if isinstance(loaded, dict):
                overlay_root = loaded
    except Exception as exc:  # noqa: BLE001
        overlay_load_error = f"{type(exc).__name__}: {exc}"

overlay_model_aliases = []
oma = overlay_root.get("oauth-model-alias") if isinstance(overlay_root, dict) else None
if isinstance(oma, dict):
    for channel_key, entries in oma.items():
        if not isinstance(entries, list):
            continue
        for entry in entries:
            if not isinstance(entry, dict):
                continue
            name = entry.get("name")
            alias = entry.get("alias")
            if isinstance(name, str) and isinstance(alias, str):
                overlay_model_aliases.append({
                    "channel": str(channel_key),
                    "name": name,
                    "alias": alias,
                })

zsh_block_alias_names = []
if has_managed_zsh_block and os.path.isfile(zshrc_path):
    try:
        with open(zshrc_path, "r", encoding="utf-8") as fh:
            content = fh.read()
        block_pattern = re.compile(
            re.escape(zsh_mark_begin) + r"(.*?)" + re.escape(zsh_mark_end),
            re.DOTALL,
        )
        match = block_pattern.search(content)
        if match:
            block = match.group(1)
            for line in block.splitlines():
                alias_match = re.match(r"\s*alias\s+([A-Za-z0-9_\-]+)=", line)
                if alias_match:
                    zsh_block_alias_names.append(alias_match.group(1))
    except OSError:
        pass


def is_skill_alias(name: str) -> bool:
    return name.startswith("cc-")


managed_model_aliases = []
if state_present and state_managed_model:
    state_alias_names = {
        e.get("alias") for e in state_managed_model
        if isinstance(e.get("alias"), str)
    }
    for entry in overlay_model_aliases:
        if entry["alias"] in state_alias_names:
            managed_model_aliases.append(entry)
else:
    for entry in overlay_model_aliases:
        if is_skill_alias(entry["alias"]):
            managed_model_aliases.append(entry)

managed_shell_aliases = []
if state_present and state_managed_shell:
    for name in zsh_block_alias_names:
        if name in state_managed_shell and name not in managed_shell_aliases:
            managed_shell_aliases.append(name)
    for name in state_managed_shell:
        if name not in managed_shell_aliases:
            managed_shell_aliases.append(name)
else:
    for name in zsh_block_alias_names:
        if is_skill_alias(name) and name not in managed_shell_aliases:
            managed_shell_aliases.append(name)

conflicts = []
managed_aliases_set = {e["alias"] for e in managed_model_aliases}

if os.path.isfile(zshrc_path):
    try:
        with open(zshrc_path, "r", encoding="utf-8") as fh:
            full = fh.read()
        outside = re.sub(
            re.escape(zsh_mark_begin) + r".*?" + re.escape(zsh_mark_end),
            "",
            full,
            flags=re.DOTALL,
        )
        for match in re.finditer(
            r"^\s*alias\s+(cc-[A-Za-z0-9_\-]+)=", outside, re.MULTILINE
        ):
            conflicts.append({
                "alias": match.group(1),
                "source": "manual-shell-alias",
            })
    except OSError:
        pass

for entry in overlay_model_aliases:
    alias = entry["alias"]
    if alias.startswith("cc-") and alias not in managed_aliases_set:
        conflicts.append({
            "alias": alias,
            "source": f"manual-config-alias:{entry['channel']}",
        })

out = {
    "vibeproxy_installed": vibeproxy_installed,
    "vibeproxy_reachable": vibeproxy_reachable,
    "user_overlay_exists": user_overlay_exists,
    "has_managed_zsh_block": has_managed_zsh_block,
    "state_file_present": state_present,
    "state_file_path": tildify(state_file_path),
    "user_overlay_path": tildify(user_config_path),
    "zshrc_path": tildify(zshrc_path),
    "overlay_load_error": overlay_load_error,
    "authenticated_backends": authenticated,
    "managed_shell_aliases": managed_shell_aliases,
    "managed_model_aliases": managed_model_aliases,
    "shortcut_shell_aliases": state_shortcut_shell,
    "backend_catalogs": state_backend_catalogs,
    "partial_probe": state_partial_probe,
    "conflicts": conflicts,
}
print(json.dumps(out, indent=2))
PY
