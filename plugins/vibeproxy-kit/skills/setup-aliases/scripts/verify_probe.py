#!/usr/bin/env python3
"""Verify a probe result against two independent sources of truth.

Layer 1 — merged-config cross-check. Reads ~/.cli-proxy-api/merged-config.yaml
and inspects oauth-excluded-models. For a probe claiming backend X, every
authenticated backend other than X must appear with a wildcard ["*"] entry,
and X itself must not. This catches the most common failure mode (user forgot
to disable a backend in the VibeProxy menu bar) deterministically and without
depending on the /v1/models response shape.

Layer 2 — per-model owned_by signature check. Each model in the probe's
response is compared against a fixed BACKEND_SIGNATURES table. Models whose
owned_by belongs to a different backend's signature are flagged as foreign
(probe rejected); models whose owned_by is unknown are collected for surfacing
to the user via AskUserQuestion rather than auto-rejected.

Note: The Plus fork's /v1/models handler only emits `type` when ModelInfo.Type
is non-empty. In practice, many provider registrations leave Type empty, so
owned_by is the primary signature field. `type` is only used as a secondary
tie-break when present.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from typing import Any

BACKEND_SIGNATURES: dict[str, dict[str, set[str]]] = {
    "codex":   {"owned_by": {"openai"},         "type": {"codex"}},
    "copilot": {"owned_by": {"github-copilot"}, "type": {"copilot"}},
    "gravity": {"owned_by": {"antigravity"},    "type": {"antigravity"}},
    "gemini":  {"owned_by": {"google"},         "type": {"gemini"}},
    "qwen":    {"owned_by": {"qwen"},           "type": {"qwen"}},
    "zai":     {"owned_by": {"zai"},            "type": {"zai"}},
}

# Inverse map: owned_by string → set of backend tokens that claim it.
# Used to decide whether a model is "foreign" to the claimed backend.
OWNED_BY_TO_TOKENS: dict[str, set[str]] = {}
for token, sig in BACKEND_SIGNATURES.items():
    for ob in sig["owned_by"]:
        OWNED_BY_TO_TOKENS.setdefault(ob, set()).add(token)


def _ensure_ruamel_yaml():
    try:
        from ruamel.yaml import YAML  # type: ignore
        return YAML
    except ImportError:
        pass
    import subprocess
    base = [sys.executable, "-m", "pip", "install", "--user", "ruamel.yaml"]
    try:
        subprocess.check_call(base, stdout=sys.stderr, stderr=sys.stderr)
    except subprocess.CalledProcessError:
        # PEP 668 (Homebrew Python 3.12+): retry with --break-system-packages.
        subprocess.check_call(
            base + ["--break-system-packages"], stdout=sys.stderr, stderr=sys.stderr,
        )
    from ruamel.yaml import YAML  # type: ignore
    return YAML


def load_yaml(path: str) -> dict[str, Any]:
    YAML = _ensure_ruamel_yaml()
    yaml_rt = YAML(typ="rt")
    with open(path, "r", encoding="utf-8") as fh:
        loaded = yaml_rt.load(fh)
    return dict(loaded) if loaded is not None else {}


def layer1(
    claimed_backend_token: str,
    claimed_channel_key: str,
    all_channel_keys: list[str],
    merged_config_path: str,
) -> dict[str, Any]:
    """Cross-check merged-config.yaml oauth-excluded-models."""
    result: dict[str, Any] = {
        "name": "merged_config_cross_check",
        "merged_config_path": merged_config_path,
        "claimed_channel_key": claimed_channel_key,
        "all_channel_keys": all_channel_keys,
        "expected_excluded": sorted(set(all_channel_keys) - {claimed_channel_key}),
        "actual_excluded_wildcarded": [],
        "pass": False,
        "reason": None,
    }

    if not os.path.isfile(merged_config_path):
        result["reason"] = (
            f"merged-config.yaml not found at {merged_config_path}. "
            "Layer 1 skipped — layer 2 alone must decide this probe. "
            "This usually means VibeProxy has not been launched since install."
        )
        result["pass"] = None
        return result

    try:
        root = load_yaml(merged_config_path)
    except Exception as exc:  # noqa: BLE001
        result["reason"] = (
            f"failed to parse merged-config.yaml: {type(exc).__name__}: {exc}"
        )
        return result

    excluded_raw = root.get("oauth-excluded-models") if isinstance(root, dict) else None
    if not isinstance(excluded_raw, dict):
        excluded_raw = {}

    wildcarded: list[str] = []
    for key, value in excluded_raw.items():
        if not isinstance(key, str):
            continue
        if isinstance(value, list) and "*" in value:
            wildcarded.append(key)
        elif value == "*":
            wildcarded.append(key)
    wildcarded_sorted = sorted(wildcarded)
    result["actual_excluded_wildcarded"] = wildcarded_sorted

    actual_set = set(wildcarded_sorted)
    expected_set = set(result["expected_excluded"])

    if claimed_channel_key in actual_set:
        result["reason"] = (
            f"'{claimed_channel_key}' is present in oauth-excluded-models with a wildcard, "
            f"but the probe claims this backend is the one currently enabled. "
            "VibeProxy menu bar appears to still have this backend disabled."
        )
        return result

    missing_excluded = expected_set - actual_set
    extra_excluded = actual_set - expected_set

    if missing_excluded:
        result["reason"] = (
            f"merged-config.yaml does not exclude {sorted(missing_excluded)}. "
            f"Only '{claimed_backend_token}' ({claimed_channel_key}) should be enabled — "
            "the other backends appear to still be active in the VibeProxy menu bar."
        )
        return result

    if extra_excluded:
        result["reason"] = (
            f"merged-config.yaml excludes {sorted(extra_excluded)}, which are not in the "
            "authenticated backend set we were asked to probe. The menu bar state is "
            "more restrictive than expected but does not invalidate this probe — "
            "layer 2 will confirm."
        )
        result["pass"] = True
        return result

    result["pass"] = True
    return result


def layer2(
    claimed_backend_token: str,
    probe_output: dict[str, Any],
) -> dict[str, Any]:
    """Check per-model owned_by/type signatures against claimed backend."""
    claimed_sig = BACKEND_SIGNATURES.get(claimed_backend_token)
    result: dict[str, Any] = {
        "name": "model_signature_check",
        "claimed_backend_token": claimed_backend_token,
        "known_signature": bool(claimed_sig),
        "total_models": 0,
        "matched_models": [],
        "foreign_models": [],
        "unknown_signatures": [],
        "pass": False,
        "reason": None,
    }

    if not claimed_sig:
        result["reason"] = (
            f"no signature table entry for backend token '{claimed_backend_token}'. "
            "Update BACKEND_SIGNATURES in verify_probe.py before probing this backend."
        )
        return result

    models = probe_output.get("models") or []
    if not isinstance(models, list):
        models = []
    result["total_models"] = len(models)

    if len(models) == 0:
        result["reason"] = (
            f"/v1/models returned 0 models for claimed backend '{claimed_backend_token}'. "
            "Either the backend is not actually authenticated, the menu bar has it "
            "disabled, or VibeProxy has not finished applying the toggle."
        )
        return result

    expected_owned_by = claimed_sig["owned_by"]
    expected_types = claimed_sig["type"]

    for model in models:
        if not isinstance(model, dict):
            continue
        model_id = model.get("id")
        owned_by = model.get("owned_by")
        model_type = model.get("type")
        record = {
            "id": model_id if isinstance(model_id, str) else None,
            "owned_by": owned_by if isinstance(owned_by, str) else None,
            "type": model_type if isinstance(model_type, str) else None,
        }

        if isinstance(owned_by, str):
            if owned_by in expected_owned_by:
                result["matched_models"].append(record)
                continue
            # Is owned_by a known OTHER backend's signature?
            other_tokens = OWNED_BY_TO_TOKENS.get(owned_by, set()) - {claimed_backend_token}
            if other_tokens:
                record["foreign_to"] = sorted(other_tokens)
                result["foreign_models"].append(record)
                continue
            # Owned_by is known to the universe but not to any backend — treat as unknown.
            result["unknown_signatures"].append(record)
            continue

        # owned_by missing — fall back to type if available.
        if isinstance(model_type, str):
            if model_type in expected_types:
                result["matched_models"].append(record)
                continue
            # type belongs to some other known backend?
            is_foreign = False
            for other_token, other_sig in BACKEND_SIGNATURES.items():
                if other_token == claimed_backend_token:
                    continue
                if model_type in other_sig["type"]:
                    record["foreign_to"] = [other_token]
                    result["foreign_models"].append(record)
                    is_foreign = True
                    break
            if is_foreign:
                continue
            result["unknown_signatures"].append(record)
            continue

        # Neither owned_by nor type present → unknown, not a mismatch.
        result["unknown_signatures"].append(record)

    if result["foreign_models"]:
        first = result["foreign_models"][0]
        result["reason"] = (
            f"probe claimed '{claimed_backend_token}' but the response contains "
            f"{len(result['foreign_models'])} model(s) owned by a different backend. "
            f"example: {first.get('id')} (owned_by={first.get('owned_by')}, "
            f"foreign_to={first.get('foreign_to')}). "
            "more than one backend appears to be enabled in the VibeProxy menu bar."
        )
        return result

    if not result["matched_models"]:
        result["reason"] = (
            f"no models in the probe response match '{claimed_backend_token}'s signature. "
            f"all models were either unknown or unclassifiable. "
            "check that the correct backend is toggled in VibeProxy."
        )
        return result

    result["pass"] = True
    return result


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--claimed", required=True, help="backend token being probed (codex|copilot|gravity|gemini)")
    parser.add_argument("--claimed-channel-key", required=True, help="VibeProxy config channel key for the claimed backend (codex|github-copilot|antigravity|gemini-cli)")
    parser.add_argument("--all-channel-keys", required=True, help="comma-separated list of all authenticated channel keys")
    parser.add_argument("--merged-config", default=os.path.expanduser("~/.cli-proxy-api/merged-config.yaml"))
    parser.add_argument("--probe-output", required=True, help="path to JSON output from probe_backend.sh")
    args = parser.parse_args()

    all_channel_keys = [k.strip() for k in args.all_channel_keys.split(",") if k.strip()]

    try:
        with open(args.probe_output, "r", encoding="utf-8") as fh:
            probe_output = json.load(fh)
    except (OSError, json.JSONDecodeError) as exc:
        json.dump(
            {
                "verdict": "reject",
                "reason": f"failed to load probe output {args.probe_output}: {exc}",
                "layer1": None,
                "layer2": None,
            },
            sys.stdout,
            indent=2,
        )
        print()
        return 1

    l1 = layer1(args.claimed, args.claimed_channel_key, all_channel_keys, args.merged_config)
    l2 = layer2(args.claimed, probe_output)

    if l1["pass"] is False:
        verdict = "reject"
        reason = l1["reason"]
    elif l2["pass"] is False:
        verdict = "reject"
        reason = l2["reason"]
    else:
        verdict = "warn" if l2["unknown_signatures"] else "pass"
        warn_reason = None
        if l2["unknown_signatures"]:
            unknown_ids = [m.get("id") for m in l2["unknown_signatures"][:5]]
            warn_reason = (
                f"{len(l2['unknown_signatures'])} model(s) have owned_by values not in "
                f"the known signature table. examples: {unknown_ids}. the probe is "
                "accepted but surface these to the user for confirmation before adding "
                "aliases that depend on them."
            )
        if l1["pass"] is None:
            warn_reason = (l1["reason"] + " | " + (warn_reason or "layer 2 passed."))
        reason = warn_reason

    out = {
        "verdict": verdict,
        "reason": reason,
        "claimed_backend_token": args.claimed,
        "claimed_channel_key": args.claimed_channel_key,
        "layer1": l1,
        "layer2": l2,
    }
    json.dump(out, sys.stdout, indent=2)
    print()
    return 0 if verdict != "reject" else 1


if __name__ == "__main__":
    sys.exit(main())
