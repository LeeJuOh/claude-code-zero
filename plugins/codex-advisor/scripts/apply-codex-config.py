#!/usr/bin/env python3
"""Update ~/.codex/config.toml with model and/or reasoning effort values.

Usage: apply-codex-config.py <model> <effort>
       Empty string for either argument means "no change".

Expands known aliases (spark -> gpt-5.3-codex-spark) before writing.
Advisory checks against ~/.codex/models_cache.json emit warnings but never
block — account-gated or newly released models may not be in the local cache.

When the requested model is found in the local cache, the effort value is
also validated against that model's `supported_reasoning_levels` and the
model's `default_reasoning_level` is reported when effort is left unset.

Stdout (one line): Model: <before> -> <after> | Effort: <before> -> <after>
Stderr: warnings only.
"""
import json
import os
import re
import sys
import tempfile

MODEL_ALIASES = {"spark": "gpt-5.3-codex-spark"}
# Codex `model_reasoning_effort` accepts these per the Responses API
# (see developers.openai.com/codex/config-reference). `none` is only valid
# for `plan_mode_reasoning_effort`. Per-model support is narrower — checked
# below against ~/.codex/models_cache.json.
STANDARD_EFFORTS = {"minimal", "low", "medium", "high", "xhigh"}


def find_line(lines, key):
    pat = re.compile(rf'^\s*{re.escape(key)}\s*=\s*"([^"]*)"')
    for i, line in enumerate(lines):
        if line.lstrip().startswith("#"):
            continue
        m = pat.match(line)
        if m:
            return i, m.group(1)
    return None, None


def set_line(lines, key, value):
    i, _ = find_line(lines, key)
    new_line = f'{key} = "{value}"\n'
    if i is not None:
        lines[i] = new_line
    else:
        if lines and not lines[-1].endswith("\n"):
            lines[-1] += "\n"
        lines.append(new_line)


def fmt(before, after, requested):
    if not requested:
        return after or "(unset)"
    if before == after:
        return f'{after or "(unset)"} (unchanged)'
    return f'{before or "(unset)"} -> {after or "(unset)"}'


def main():
    if len(sys.argv) != 3:
        print("Usage: apply-codex-config.py <model> <effort>", file=sys.stderr)
        sys.exit(2)

    model_in = sys.argv[1].strip()
    effort_in = sys.argv[2].strip()
    model = MODEL_ALIASES.get(model_in, model_in) if model_in else ""

    model_entry = None
    if model:
        cache_path = os.path.expanduser("~/.codex/models_cache.json")
        if os.path.isfile(cache_path):
            try:
                with open(cache_path) as f:
                    cache = json.load(f)
                for entry in cache.get("models", []):
                    if isinstance(entry, dict) and entry.get("slug") == model:
                        model_entry = entry
                        break
                if model_entry is None:
                    print(
                        f"Warning: model '{model}' not in local cache. "
                        "May be subscription-gated or new — saving anyway.",
                        file=sys.stderr,
                    )
            except (json.JSONDecodeError, OSError):
                pass

    if effort_in and effort_in not in STANDARD_EFFORTS:
        print(
            f"Warning: effort '{effort_in}' outside Codex `model_reasoning_effort` "
            f"set ({', '.join(sorted(STANDARD_EFFORTS))}) — saving anyway. "
            "(`none` is only valid for `plan_mode_reasoning_effort`.)",
            file=sys.stderr,
        )

    if effort_in and model_entry is not None:
        supported = {
            lvl.get("effort")
            for lvl in model_entry.get("supported_reasoning_levels", [])
            if isinstance(lvl, dict)
        }
        if supported and effort_in not in supported:
            print(
                f"Warning: model '{model}' supports effort levels "
                f"{sorted(s for s in supported if s)}, not '{effort_in}'. "
                "Codex CLI will reject at runtime if unsupported.",
                file=sys.stderr,
            )

    config_path = os.path.expanduser("~/.codex/config.toml")
    os.makedirs(os.path.dirname(config_path), exist_ok=True)
    try:
        with open(config_path) as f:
            lines = f.readlines()
    except FileNotFoundError:
        lines = []

    _, before_model = find_line(lines, "model")
    _, before_effort = find_line(lines, "model_reasoning_effort")

    if model:
        set_line(lines, "model", model)
    if effort_in:
        set_line(lines, "model_reasoning_effort", effort_in)

    if model or effort_in:
        dir_ = os.path.dirname(config_path)
        fd, tmp = tempfile.mkstemp(dir=dir_, prefix=".config.toml.")
        try:
            with os.fdopen(fd, "w") as f:
                f.writelines(lines)
            os.replace(tmp, config_path)
        except Exception:
            try:
                os.unlink(tmp)
            except OSError:
                pass
            raise

    _, after_model = find_line(lines, "model")
    _, after_effort = find_line(lines, "model_reasoning_effort")

    print(
        f"Model: {fmt(before_model, after_model, bool(model))} | "
        f"Effort: {fmt(before_effort, after_effort, bool(effort_in))}"
    )

    if model and not effort_in and model_entry is not None:
        default_eff = model_entry.get("default_reasoning_level")
        if default_eff and default_eff != after_effort:
            print(
                f"Note: '{model}' default_reasoning_level is '{default_eff}'. "
                f"Current `model_reasoning_effort` = '{after_effort or '(unset)'}'. "
                "Override with --effort if you want a different level.",
                file=sys.stderr,
            )


if __name__ == "__main__":
    main()
