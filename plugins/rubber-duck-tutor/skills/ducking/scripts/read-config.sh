#!/usr/bin/env bash
# duck: read a scalar value from <dir>/config.json.
#
# Usage: read-config.sh --data-dir <dir> <key> <default>
#
# Prints the config value for <key>, or <default> when the config file or
# the key itself is missing or the file fails to parse. Never exits non-zero -- the engine must never crash on a missing
# or broken config file (S7).
#
# `enabled` gets special handling: a naive `.enabled // default` (jq's `//`
# operator) treats JSON `false` as falsy, so it would silently turn an
# explicit `enabled: false` back into the default -- exactly the footgun
# this config dial exists to avoid. For that key, the raw value is compared
# against the literal strings "true"/"false" instead of relying on `//`.
# This mirrors hooks/lib.sh's duck__is_enabled, which the ship/plan hooks
# use directly by sourcing lib.sh; this script exists separately because
# engine.md is read by the model, which reaches config only via a Bash
# call into this scripts/ directory (same reasoning as log-gap.sh).
#
# --data-dir (absolute) is required: the Bash tool has no CLAUDE_PLUGIN_DATA, or
# another plugin's, so callers pass the path -- SKILL.md substitutes it, hooks
# export it. A relative value would drop files into the user's repo.

set -uo pipefail

[[ "${1:-}" == "--data-dir" && ( "${2:-}" == /* || "${2:-}" == [A-Za-z]:* ) ]] || { echo "read-config: usage: read-config.sh --data-dir <dir> <key> <default>" >&2; exit 2; }
DATA_DIR="$2"; shift 2

KEY="${1:?usage: read-config.sh --data-dir <dir> <key> <default>}"
DEFAULT="${2:-}"
CONFIG_FILE="$DATA_DIR/config.json"

[[ -f "$CONFIG_FILE" ]] || { echo "$DEFAULT"; exit 0; }

if [[ "$KEY" == "enabled" ]]; then
  if command -v jq &>/dev/null; then
    VALUE=$(jq -r '.enabled' "$CONFIG_FILE" 2>/dev/null)
  else
    VALUE=$(grep -oE '"enabled" *: *(true|false)' "$CONFIG_FILE" 2>/dev/null | head -1 | grep -oE '(true|false)$')
  fi
  case "$VALUE" in
    true|false) echo "$VALUE" ;;
    *) echo "$DEFAULT" ;;
  esac
  exit 0
fi

if command -v jq &>/dev/null; then
  VALUE=$(jq -r ".${KEY} // empty" "$CONFIG_FILE" 2>/dev/null)
else
  VALUE=$(grep -oE "\"$KEY\" *: *\"[^\"]*\"" "$CONFIG_FILE" 2>/dev/null | head -1 | sed "s/\"$KEY\" *: *\"//;s/\"$//")
fi

echo "${VALUE:-$DEFAULT}"
