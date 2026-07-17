#!/usr/bin/env python3
"""Update ~/.codex/config.toml with model and/or reasoning effort values.

Usage: apply-codex-config.py <model> <effort>
       Empty string for either argument means "no change".

Expands known aliases (spark -> gpt-5.3-codex-spark) before writing. Values are
otherwise written verbatim: Codex owns the list of valid models and effort
levels and judges them at runtime, so second-guessing here would only mean
calling a brand-new model or an account-gated one wrong.

Stdout (one line): Model: <before> -> <after> | Effort: <before> -> <after>
"""
import os
import re
import sys
import tempfile

MODEL_ALIASES = {"spark": "gpt-5.3-codex-spark"}


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

    config_path = os.path.expanduser("~/.codex/config.toml")
    os.makedirs(os.path.dirname(config_path), exist_ok=True)
    try:
        with open(config_path) as f:
            lines = f.readlines()
    except FileNotFoundError:
        lines = []
    except (UnicodeDecodeError, OSError) as e:
        # Refuse rather than start from an empty file: the write below would
        # replace the whole config with two keys, and a config we cannot read
        # is precisely the one whose contents we have no right to discard.
        print(
            f"Error: cannot read {config_path} ({type(e).__name__}). "
            "Repair or move it, then re-run — leaving it untouched.",
            file=sys.stderr,
        )
        sys.exit(1)

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


if __name__ == "__main__":
    main()
