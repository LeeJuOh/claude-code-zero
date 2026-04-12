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

    # Group canonical aliases by backend (extracted from label "Backend · Model · Effort")
    backend_groups: list[tuple[str, list[tuple[str, str]]]] = []
    seen_backends: dict[str, int] = {}
    for entry in canonical_aliases:
        alias = entry.get("alias")
        label = entry.get("label") or ""
        if not isinstance(alias, str):
            continue
        parts = label.split(" \u00b7 ", 1)
        backend = parts[0].strip() if parts else "Other"
        model_desc = parts[1].strip() if len(parts) > 1 else label
        if backend not in seen_backends:
            seen_backends[backend] = len(backend_groups)
            backend_groups.append((backend, []))
        backend_groups[seen_backends[backend]][1].append((alias, model_desc))

    # Build reverse map: canonical alias → list of shortcut names
    target_to_shortcuts: dict[str, list[str]] = {}
    for entry in shortcut_aliases:
        alias = entry.get("alias")
        target = entry.get("target")
        if isinstance(alias, str) and isinstance(target, str):
            target_to_shortcuts.setdefault(target, []).append(alias)

    all_names: list[str] = []
    all_descs: list[str] = []
    for _, entries in backend_groups:
        for a, d in entries:
            all_names.append(a)
            all_descs.append(d)
    if not all_names:
        all_names.append("")
        all_descs.append("")

    col1 = max(len(n) for n in all_names) + 2
    col2 = max(len(d) for d in all_descs) + 2
    has_shortcuts = bool(target_to_shortcuts)
    hdr_alias = "Alias"
    hdr_model = "Model"
    hdr_short = "Shortcut"
    rule_width = 2 + col1 + col2 + (len(hdr_short) + 4 if has_shortcuts else 0)

    lines.append("")
    lines.append("cc-list() {")

    # Column header — once at the top
    if has_shortcuts:
        hdr_line = f"  {hdr_alias.ljust(col1)}{hdr_model.ljust(col2)}{hdr_short}"
    else:
        hdr_line = f"  {hdr_alias.ljust(col1)}{hdr_model}"
    lines.append(f"  printf '\\033[1m%s\\033[0m\\n' {shell_quote(hdr_line)}")

    first_group = True
    for backend, entries in backend_groups:
        if not first_group:
            lines.append("  echo")
        # Backend separator — bold with padding
        sep = f"\u2500\u2500 {backend} "
        sep += "\u2500" * max(0, rule_width - len(sep))
        lines.append(f"  printf '\\033[1m%s\\033[0m\\n' {shell_quote(sep)}")
        first_group = False
        for alias_name, model_desc in entries:
            shortcuts = target_to_shortcuts.get(alias_name, [])
            shortcut_str = ", ".join(shortcuts) if shortcuts else ""
            padded_alias = alias_name.ljust(col1)
            padded_desc = model_desc.ljust(col2)
            if shortcut_str:
                lines.append(
                    f"  printf '  %s%s\\033[36m%s\\033[0m\\n' "
                    f"{shell_quote(padded_alias)} {shell_quote(padded_desc)} {shell_quote(shortcut_str)}"
                )
            else:
                lines.append(
                    f"  printf '  %s%s\\n' "
                    f"{shell_quote(padded_alias)} {shell_quote(model_desc)}"
                )

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
