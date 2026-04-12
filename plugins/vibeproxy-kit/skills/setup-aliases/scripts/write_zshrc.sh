#!/usr/bin/env bash
set -euo pipefail

# write_zshrc.sh — managed block writer for ~/.zshrc.
# Replaces only the vibeproxy-kit managed block between its markers. Unrelated
# aliases, functions, and exports are left untouched. Generates the cc-list
# helper from the selected canonical and shortcut aliases.
#
# Reads a JSON payload from stdin with this schema:
#
#   {
#     "mode": "merge" | "reset",
#     "zshrc_path": "~/.zshrc",
#     "backup_dir": "...",
#     "proxy_url": "http://localhost:8318",
#     "canonical_aliases": [
#       { "alias": "cc-codex-gpt54-high", "model": "gpt-5.4(high)", "request_model": "cc-codex-gpt54-high", "label": "Codex · GPT-5.4 · high" }
#     ],
#     "shortcut_aliases": [
#       { "alias": "cc-copilot-opus", "target": "cc-copilot-opus46", "label": "Shortcut → cc-copilot-opus46" }
#     ]
#   }
#
# Emits JSON to stdout:
#   { "ok": true, "backup_path": "...", "aliases_written": [...], "shortcuts_written": [...] }

PAYLOAD_JSON=$(cat)
export PAYLOAD_JSON

python3 - <<'PY'
import json
import os
import re
import shutil
import sys
from datetime import datetime, timezone

MARK_BEGIN = "# >>> vibeproxy-kit managed block >>>"
MARK_END = "# <<< vibeproxy-kit managed block <<<"

raw = os.environ.get("PAYLOAD_JSON", "")
try:
    payload = json.loads(raw)
except json.JSONDecodeError as exc:
    sys.stderr.write(f"write_zshrc.sh: invalid JSON on stdin: {exc}\n")
    sys.exit(1)

mode = payload.get("mode")
if mode not in ("merge", "reset"):
    sys.stderr.write("write_zshrc.sh: mode must be 'merge' or 'reset'\n")
    sys.exit(1)

zshrc_path = os.path.expanduser(payload.get("zshrc_path") or "~/.zshrc")
backup_dir = os.path.expanduser(
    payload.get("backup_dir")
    or os.path.join(
        os.environ.get(
            "CLAUDE_PLUGIN_DATA",
            os.path.expanduser("~/.claude/plugins/data/vibeproxy-kit-claude-code-zero"),
        ),
        "backups",
    )
)
proxy_url = payload.get("proxy_url") or "http://localhost:8318"
canonical_aliases = payload.get("canonical_aliases") or []
shortcut_aliases = payload.get("shortcut_aliases") or []

if not isinstance(canonical_aliases, list):
    sys.stderr.write("write_zshrc.sh: canonical_aliases must be an array\n")
    sys.exit(1)
if not isinstance(shortcut_aliases, list):
    sys.stderr.write("write_zshrc.sh: shortcut_aliases must be an array\n")
    sys.exit(1)


def ensure_dir(path: str) -> None:
    if path:
        os.makedirs(path, exist_ok=True)


def stamp() -> str:
    return datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")


def build_block() -> str:
    if mode == "reset" and not canonical_aliases and not shortcut_aliases:
        return ""
    if not canonical_aliases and not shortcut_aliases:
        return ""

    lines: list[str] = [MARK_BEGIN]
    lines.append(f"_VP_PROXY='ANTHROPIC_BASE_URL={proxy_url}'")
    if canonical_aliases:
        lines.append("")
        lines.append("# canonical aliases")
    for entry in canonical_aliases:
        alias = entry.get("alias")
        model = entry.get("request_model") or entry.get("model") or alias
        if not isinstance(alias, str) or not isinstance(model, str):
            continue
        lines.append(f"alias {alias}=\"$_VP_PROXY ANTHROPIC_MODEL={model} claude\"")
    if shortcut_aliases:
        lines.append("")
        lines.append("# shortcut aliases")
    for entry in shortcut_aliases:
        alias = entry.get("alias")
        target = entry.get("target")
        if not isinstance(alias, str) or not isinstance(target, str):
            continue
        lines.append(f"alias {alias}='{target}'")

    list_rows: list[tuple[str, str]] = []
    for entry in canonical_aliases:
        alias = entry.get("alias")
        label = entry.get("label") or ""
        if isinstance(alias, str):
            list_rows.append((alias, label if isinstance(label, str) else ""))
    for entry in shortcut_aliases:
        alias = entry.get("alias")
        target = entry.get("target")
        label = entry.get("label") or (f"Shortcut → {target}" if target else "Shortcut")
        if isinstance(alias, str):
            list_rows.append((alias, label if isinstance(label, str) else ""))

    if list_rows:
        width = max(len(row[0]) for row in list_rows)
        col_start = max(width + 4, 25)
        lines.append("")
        lines.append("cc-list() {")
        for alias_name, label in list_rows:
            padded = alias_name.ljust(col_start)
            lines.append(f"  printf '%s%s\\n' {shell_quote(padded)} {shell_quote(label)}")
        lines.append("}")

    lines.append(MARK_END)
    return "\n".join(lines) + "\n"


def shell_quote(value: str) -> str:
    return "'" + value.replace("'", "'\\''") + "'"


new_block = build_block()

if os.path.isfile(zshrc_path):
    with open(zshrc_path, "r", encoding="utf-8") as fh:
        original = fh.read()
else:
    original = ""

ensure_dir(os.path.dirname(backup_dir))
ensure_dir(backup_dir)
if original:
    backup_path = os.path.join(backup_dir, f"zshrc.{stamp()}.bak")
    shutil.copy2(zshrc_path, backup_path)
else:
    backup_path = None

block_pattern = re.compile(
    re.escape(MARK_BEGIN) + r".*?" + re.escape(MARK_END) + r"\n?",
    re.DOTALL,
)

had_block = bool(block_pattern.search(original))

if new_block:
    if had_block:
        updated = block_pattern.sub(new_block, original, count=1)
    else:
        sep = "" if original.endswith("\n") or not original else "\n"
        if original:
            updated = original + sep + "\n" + new_block
        else:
            updated = new_block
else:
    if had_block:
        updated = block_pattern.sub("", original, count=1).rstrip() + "\n"
    else:
        updated = original

if not updated.endswith("\n"):
    updated += "\n"

ensure_dir(os.path.dirname(zshrc_path))
tmp_path = zshrc_path + ".tmp"
with open(tmp_path, "w", encoding="utf-8") as fh:
    fh.write(updated)
os.replace(tmp_path, zshrc_path)

result = {
    "ok": True,
    "mode": mode,
    "zshrc_path": zshrc_path,
    "backup_path": backup_path,
    "had_existing_block": had_block,
    "aliases_written": [
        e.get("alias") for e in canonical_aliases if isinstance(e.get("alias"), str)
    ],
    "shortcuts_written": [
        e.get("alias") for e in shortcut_aliases if isinstance(e.get("alias"), str)
    ],
}
json.dump(result, sys.stdout, indent=2)
print()
PY
