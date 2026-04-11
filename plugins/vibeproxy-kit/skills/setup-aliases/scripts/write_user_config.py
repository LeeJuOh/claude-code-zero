#!/usr/bin/env python3
"""Safe YAML merge writer for ~/.cli-proxy-api/config.yaml.

Reads a JSON payload from stdin with the schema documented in the design spec
under `scripts/write_user_config.py`. Writes only the skill-managed
`oauth-model-alias` entries and preserves every other key, list entry, and
comment in the user overlay via ruamel.yaml round-trip.

Rollback is the orchestrator's responsibility — this script only returns the
backup path it created so the orchestrator can restore it if validation fails.
"""

from __future__ import annotations

import json
import os
import shutil
import sys
from datetime import datetime, timezone
from typing import Any


def load_payload() -> dict[str, Any]:
    try:
        payload = json.load(sys.stdin)
    except json.JSONDecodeError as exc:
        raise SystemExit(f"write_user_config.py: invalid JSON on stdin: {exc}")
    if not isinstance(payload, dict):
        raise SystemExit("write_user_config.py: stdin payload must be a JSON object")
    return payload


def expand(path: str) -> str:
    return os.path.expanduser(path)


def ensure_dir(path: str) -> None:
    os.makedirs(path, exist_ok=True)


def timestamp_suffix() -> str:
    return datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")


def alias_key(channel: str, alias: str) -> tuple[str, str]:
    return (channel, alias)


def main() -> int:
    payload = load_payload()

    mode = payload.get("mode")
    if mode not in ("merge", "reset"):
        raise SystemExit("write_user_config.py: mode must be 'merge' or 'reset'")

    config_path = expand(payload.get("config_path") or "~/.cli-proxy-api/config.yaml")
    backup_dir = expand(payload.get("backup_dir") or os.path.join(
        os.environ.get("CLAUDE_PLUGIN_DATA", os.path.expanduser("~/.claude/plugins/data/vibeproxy-kit-claude-code-zero")),
        "backups",
    ))
    managed_aliases = payload.get("managed_aliases") or []
    prior_managed_aliases = payload.get("prior_managed_aliases") or []

    if not isinstance(managed_aliases, list):
        raise SystemExit("write_user_config.py: managed_aliases must be an array")
    if not isinstance(prior_managed_aliases, list):
        raise SystemExit("write_user_config.py: prior_managed_aliases must be an array")

    try:
        from ruamel.yaml import YAML
        from ruamel.yaml.comments import CommentedMap, CommentedSeq
    except ImportError as exc:
        raise SystemExit(
            f"write_user_config.py: ruamel.yaml is required ({exc}). "
            "Install with `pip install --user ruamel.yaml`."
        )

    yaml = YAML(typ="rt")
    yaml.preserve_quotes = True
    yaml.indent(mapping=2, sequence=4, offset=2)

    if os.path.isfile(config_path):
        with open(config_path, "r", encoding="utf-8") as fh:
            root = yaml.load(fh)
        if root is None:
            root = CommentedMap()
    else:
        root = CommentedMap()

    if not isinstance(root, CommentedMap):
        raise SystemExit(
            f"write_user_config.py: {config_path} does not parse as a YAML mapping at the top level"
        )

    ensure_dir(os.path.dirname(config_path))

    if os.path.isfile(config_path):
        ensure_dir(backup_dir)
        backup_path = os.path.join(
            backup_dir,
            f"config.yaml.{timestamp_suffix()}.bak",
        )
        shutil.copy2(config_path, backup_path)
    else:
        backup_path = None

    oma = root.get("oauth-model-alias")
    if oma is None or not isinstance(oma, CommentedMap):
        oma = CommentedMap()
        root["oauth-model-alias"] = oma

    prior_keys: set[tuple[str, str]] = set()
    for entry in prior_managed_aliases:
        if not isinstance(entry, dict):
            continue
        channel = entry.get("channel")
        alias = entry.get("alias")
        if isinstance(channel, str) and isinstance(alias, str):
            prior_keys.add(alias_key(channel, alias))

    new_entries: dict[str, list[dict[str, Any]]] = {}
    new_keys: set[tuple[str, str]] = set()
    for entry in managed_aliases:
        if not isinstance(entry, dict):
            continue
        channel = entry.get("channel")
        name = entry.get("name")
        alias = entry.get("alias")
        if not (isinstance(channel, str) and isinstance(name, str) and isinstance(alias, str)):
            continue
        record: dict[str, Any] = {"name": name, "alias": alias}
        if entry.get("fork") is True:
            record["fork"] = True
        new_entries.setdefault(channel, []).append(record)
        new_keys.add(alias_key(channel, alias))

    removed: list[dict[str, str]] = []
    added: list[dict[str, str]] = []
    unchanged: list[dict[str, str]] = []

    channels_to_touch = set(new_entries.keys()) | {k for k, _ in prior_keys}

    for channel in list(channels_to_touch):
        existing_list = oma.get(channel)
        if existing_list is None:
            existing_list_seq: Any = CommentedSeq()
        elif isinstance(existing_list, list):
            existing_list_seq = existing_list
        else:
            existing_list_seq = CommentedSeq()

        kept: list[Any] = []
        for item in existing_list_seq:
            if not isinstance(item, dict):
                kept.append(item)
                continue
            item_alias = item.get("alias")
            item_name = item.get("name")
            if not isinstance(item_alias, str) or not isinstance(item_name, str):
                kept.append(item)
                continue
            key = alias_key(channel, item_alias)

            if mode == "reset":
                if key in prior_keys:
                    removed.append({"channel": channel, "name": item_name, "alias": item_alias})
                    continue
                kept.append(item)
                continue

            if key in prior_keys and key not in new_keys:
                removed.append({"channel": channel, "name": item_name, "alias": item_alias})
                continue
            if key in new_keys:
                desired = next(
                    (e for e in new_entries.get(channel, []) if e["alias"] == item_alias),
                    None,
                )
                if desired is None:
                    kept.append(item)
                    continue
                if item_name == desired["name"] and bool(item.get("fork")) == bool(desired.get("fork")):
                    unchanged.append({"channel": channel, "name": item_name, "alias": item_alias})
                    kept.append(item)
                else:
                    removed.append({"channel": channel, "name": item_name, "alias": item_alias})
                continue
            kept.append(item)

        unchanged_aliases = {u["alias"] for u in unchanged if u["channel"] == channel}
        for desired in new_entries.get(channel, []):
            if desired["alias"] in unchanged_aliases:
                continue
            record = CommentedMap()
            record["name"] = desired["name"]
            record["alias"] = desired["alias"]
            if desired.get("fork") is True:
                record["fork"] = True
            kept.append(record)
            added.append({
                "channel": channel,
                "name": desired["name"],
                "alias": desired["alias"],
            })

        if kept:
            new_seq = CommentedSeq()
            for item in kept:
                new_seq.append(item)
            oma[channel] = new_seq
        else:
            if channel in oma:
                del oma[channel]

    if len(oma) == 0:
        if "oauth-model-alias" in root:
            del root["oauth-model-alias"]

    ensure_dir(os.path.dirname(config_path))
    tmp_path = config_path + ".tmp"
    with open(tmp_path, "w", encoding="utf-8") as fh:
        yaml.dump(root, fh)
    os.replace(tmp_path, config_path)

    result = {
        "ok": True,
        "mode": mode,
        "config_path": config_path,
        "backup_path": backup_path,
        "added": added,
        "removed": removed,
        "unchanged": unchanged,
    }
    json.dump(result, sys.stdout, indent=2)
    print()
    return 0


if __name__ == "__main__":
    sys.exit(main())
