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
#       { "alias": "cc-codex-gpt54-high", "model": "gpt-5.4(high)", "request_model": "cc-codex-gpt54-high(high)", "label": "Codex · GPT-5.4 · high" }
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

if sys.version_info < (3, 9):
    sys.stderr.write(f"write_zshrc.sh: requires Python 3.9+, found {sys.version}\n")
    sys.exit(1)

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
        alias = entry.get("name") or entry.get("alias")
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
        alias = entry.get("name") or entry.get("alias")
        target = entry.get("target")
        if isinstance(alias, str) and isinstance(target, str):
            target_to_shortcuts.setdefault(target, []).append(alias)

    # Calculate column widths across all entries
    all_aliases_w: list[int] = [len("Alias")]
    all_models_w: list[int] = [len("Model")]
    all_shorts_w: list[int] = [len("Shortcut")]
    has_shortcuts = bool(target_to_shortcuts)
    for _, entries in backend_groups:
        for a, d in entries:
            all_aliases_w.append(len(a))
            all_models_w.append(len(d))
            shortcuts = target_to_shortcuts.get(a, [])
            if shortcuts:
                all_shorts_w.append(len(", ".join(shortcuts)))

    col_a = max(all_aliases_w) + 2  # padding after text
    col_m = max(all_models_w) + 2
    col_s = max(all_shorts_w)
    total_width = 2 + col_a + 3 + col_m + (3 + col_s if has_shortcuts else 0)

    lines.append("")
    lines.append("cc-list() {")

    for i, (backend, entries) in enumerate(backend_groups):
        # Backend separator — bold with blank lines
        sep = f"\u2500\u2500 {backend} "
        sep += "\u2500" * max(0, total_width - len(sep))
        lines.append(f"  printf '\\n\\033[1m%s\\033[0m\\n\\n' {shell_quote(sep)}")

        # Column header (per section, bold)
        if has_shortcuts:
            hdr = f"  {'Alias'.ljust(col_a)}\u2502 {'Model'.ljust(col_m)}\u2502 Shortcut"
        else:
            hdr = f"  {'Alias'.ljust(col_a)}\u2502 Model"
        lines.append(f"  printf '\\033[1m%s\\033[0m\\n' {shell_quote(hdr)}")

        # Separator line with box-drawing
        dash = '\u2500'
        if has_shortcuts:
            rule = f"  {dash * col_a}\u253c{dash * (col_m + 1)}\u253c{dash * (col_s + 1)}"
        else:
            rule = f"  {dash * col_a}\u253c{dash * (col_m + 1)}"
        lines.append(f"  printf '%s\\n' {shell_quote(rule)}")

        # Data rows
        for alias_name, model_desc in entries:
            shortcuts = target_to_shortcuts.get(alias_name, [])
            shortcut_str = ", ".join(shortcuts) if shortcuts else ""
            if has_shortcuts:
                if shortcut_str:
                    row_prefix = f"  {alias_name.ljust(col_a)}\u2502 {model_desc.ljust(col_m)}\u2502 "
                    lines.append(
                        f"  printf '%s\\033[36m%s\\033[0m\\n' "
                        f"{shell_quote(row_prefix)} {shell_quote(shortcut_str)}"
                    )
                else:
                    row = f"  {alias_name.ljust(col_a)}\u2502 {model_desc.ljust(col_m)}\u2502"
                    lines.append(f"  printf '%s\\n' {shell_quote(row)}")
            else:
                row = f"  {alias_name.ljust(col_a)}\u2502 {model_desc}"
                lines.append(f"  printf '%s\\n' {shell_quote(row)}")

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
        (e.get("name") or e.get("alias")) for e in shortcut_aliases if isinstance(e.get("name") or e.get("alias"), str)
    ],
}
json.dump(result, sys.stdout, indent=2)
print()
PY
