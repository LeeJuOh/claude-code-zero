#!/usr/bin/env bash
set -euo pipefail

# probe_backend.sh — single-backend catalog probe.
# Called once per selected backend during the probe cycle. Expects VibeProxy
# to have exactly one backend enabled in the UI before invocation; the caller
# (SKILL.md) gates this with an AskUserQuestion confirmation.
#
# Usage: probe_backend.sh <claimed_backend_token>
# Emits a JSON object to stdout matching the design spec output contract.
# Exit status: 0 on success, non-zero on transport failure (caller decides
# whether to retry or ask the user to fix networking).

if [ $# -lt 1 ]; then
  echo "usage: probe_backend.sh <claimed_backend_token>" >&2
  exit 2
fi

CLAIMED="$1"
PROXY_URL="${VIBEPROXY_URL:-http://localhost:8318}"
MODELS_URL="${PROXY_URL%/}/v1/models"

if ! command -v curl >/dev/null 2>&1; then
  echo "probe_backend.sh: curl is required" >&2
  exit 3
fi

RESPONSE_FILE="$(mktemp -t vibeproxy_probe.XXXXXX)"
trap 'rm -f "$RESPONSE_FILE"' EXIT

HTTP_CODE=$(curl -sS --max-time 10 -H "User-Agent: claude-cli/1.0" -o "$RESPONSE_FILE" -w '%{http_code}' "$MODELS_URL" 2>/dev/null || echo "000")

if [ "$HTTP_CODE" != "200" ]; then
  {
    echo "probe_backend.sh: /v1/models returned HTTP $HTTP_CODE for $MODELS_URL"
    if [ -s "$RESPONSE_FILE" ]; then
      echo "body:"
      head -c 500 "$RESPONSE_FILE"
      echo
    fi
  } >&2
  exit 4
fi

python3 - "$CLAIMED" "$RESPONSE_FILE" <<'PY'
import json
import sys
from datetime import datetime, timezone

claimed, response_path = sys.argv[1:]

try:
    with open(response_path, "r", encoding="utf-8") as fh:
        body = json.load(fh)
except (json.JSONDecodeError, OSError) as exc:
    sys.stderr.write(f"probe_backend.sh: failed to parse /v1/models response: {exc}\n")
    sys.exit(5)

raw_models = body.get("data") if isinstance(body, dict) else None
if raw_models is None and isinstance(body, list):
    raw_models = body
if not isinstance(raw_models, list):
    raw_models = []

models = []
for m in raw_models:
    if not isinstance(m, dict):
        continue
    model_id = m.get("id")
    if not isinstance(model_id, str):
        continue
    entry = {"id": model_id}
    if isinstance(m.get("type"), str):
        entry["type"] = m["type"]
    if isinstance(m.get("owned_by"), str):
        entry["owned_by"] = m["owned_by"]
    if m.get("thinking") is True:
        entry["thinking"] = True
    models.append(entry)

out = {
    "claimed_backend_token": claimed,
    "probed_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    "models": models,
}
print(json.dumps(out, indent=2))
PY
