#!/usr/bin/env python3
"""Update $CODEX_HOME/config.toml (default ~/.codex) with model and/or reasoning effort values.

Usage: apply-codex-config.py <model> <effort> [--run-flags model,effort]
       Empty string for either argument means "no change".
       --run-flags names the flags the caller's Codex command can take.

Values are written verbatim. Codex owns the list of valid models and effort
levels and judges them at runtime, so second-guessing here would only mean
calling a brand-new model or an account-gated one wrong — and any model name
this script knew would go stale the moment OpenAI ships the next one.

Both keys are top-level. TOML assigns every key below a [table] header to that
table, so the script reads and writes only above the first header: a key
appended at the end of the file would join the last table, and a same-named
key inside one (a legacy [profiles.x] table) is not the global value.

A project's own .codex/config.toml outranks the user config, so a value
written here can be silently ignored in that project. For each requested key
a project config sets, the script prints the run-time flag that outranks it
(when the caller can pass that flag) or a note saying the project value wins.

Stdout: Model: <before> -> <after> | Effort: <before> -> <after>
        Run flags: --model <m> --effort <e>     (only keys a project overrides)
        Note: <path> sets <key> = ... ...        (overrides no flag can beat)
"""
import os
import re
import shlex
import sys
import tempfile

RUN_FLAGS = {"model": "model", "effort": "model_reasoning_effort"}
TABLE_HEADER = re.compile(r"^\s*\[\[?[^\[\]]+\]\]?\s*(#.*)?$")
STRING_VALUE = re.compile(r"""^(?:"((?:[^"\\]|\\.)*)"|'([^']*)')(\s*#.*)?$""")


def top_level(lines):
    """Return (indices of top-level lines outside multi-line strings, index of
    the first table header or len(lines)). Skipping string bodies keeps a
    string that contains "[x]" or "model = ..." from reading as structure."""
    structural = set()
    delim = None
    for i, line in enumerate(lines):
        if delim:
            if line.count(delim) % 2:
                delim = None
            continue
        if TABLE_HEADER.match(line):
            return structural, i
        structural.add(i)
        if line.lstrip().startswith("#"):
            continue
        for q in ('"""', "'''"):
            if line.count(q) % 2:
                delim = q
                break
    return structural, len(lines)


def find_line(lines, key):
    """Return (index, value, trailing comment) of the top-level assignment."""
    k = re.escape(key)
    assign = re.compile(rf"""^\s*(?:{k}|"{k}"|'{k}')\s*=\s*(.*?)\s*$""")
    structural, end = top_level(lines)
    for i in sorted(structural):
        m = assign.match(lines[i])
        if m:
            s = STRING_VALUE.match(m.group(1))
            if s:
                value = s.group(1) if s.group(1) is not None else s.group(2)
                return i, value, s.group(3) or ""
            return i, m.group(1), ""
    return None, None, ""


def toml_string(value):
    return '"' + value.replace("\\", "\\\\").replace('"', '\\"') + '"'


def set_line(lines, key, value):
    i, _, comment = find_line(lines, key)
    new_line = f"{key} = {toml_string(value)}{comment}\n"
    if i is not None:
        lines[i] = new_line
        return
    structural, end = top_level(lines)
    # Right after the last top-level setting, so a comment introducing the
    # first table stays with it.
    at = end
    while at > 0 and at - 1 in structural and (
        not lines[at - 1].strip() or lines[at - 1].lstrip().startswith("#")
    ):
        at -= 1
    new = [new_line]
    if at == 0:
        # No top-level settings: below any leading comments (e.g. #:schema).
        at = end
        if end < len(lines):
            new.append("\n")
    if at > 0 and not lines[at - 1].endswith("\n"):
        lines[at - 1] += "\n"
    lines[at:at] = new


def check(original, lines, config_path, expected):
    """Parse before and after (tomllib, Python 3.11+) and confirm the edit
    changed nothing but the requested top-level keys, so a layout this script
    misreads fails here instead of being written. Skipped when tomllib is
    missing or can't read the original: Codex also accepts TOML 1.1 syntax
    (multi-line inline tables) that tomllib rejects, and Codex is the judge."""
    try:
        import tomllib
    except ImportError:
        return
    try:
        before = tomllib.loads("".join(original))
    except tomllib.TOMLDecodeError:
        return
    try:
        after = tomllib.loads("".join(lines))
    except tomllib.TOMLDecodeError:
        after = None
    if after != {**before, **expected}:
        # The file itself is fine; this script's line scan misread its layout.
        by_hand = "; ".join(f"{k} = {toml_string(v)}" for k, v in expected.items())
        fail(
            f"could not place the setting in {config_path} without disturbing its other contents. "
            f"Add it by hand above the first [table] header: {by_hand}"
        )


def root_markers(lines):
    """project_root_markers from the user config (tomllib, Python 3.11+),
    else Codex's default."""
    try:
        import tomllib

        markers = tomllib.loads("".join(lines)).get("project_root_markers")
    except Exception:
        markers = None
    if isinstance(markers, list) and all(isinstance(m, str) for m in markers):
        return markers
    return [".git"]


def project_configs(cwd, markers, user_config):
    """Project .codex/config.toml files, closest first. Codex walks up from the
    working directory to the project root (the nearest directory holding a
    root marker) and the closest file wins over the user config. Without a
    marker, only the working directory counts."""
    dirs, d = [], cwd
    while markers:
        dirs.append(d)
        if any(os.path.exists(os.path.join(d, m)) for m in markers):
            break
        parent = os.path.dirname(d)
        if parent == d:
            dirs = []
            break
        d = parent
    found = []
    for d in dirs or [cwd]:
        path = os.path.join(d, ".codex", "config.toml")
        if os.path.isfile(path) and os.path.realpath(path) != os.path.realpath(user_config):
            found.append(path)
    return found


def project_overrides(keys, paths):
    """{key: (path, value)} for each key the closest project config sets."""
    found = {}
    for path in paths:
        try:
            with open(path) as f:
                plines = f.readlines()
        except (UnicodeDecodeError, OSError):
            continue
        for key in keys:
            if key not in found:
                _, value, _ = find_line(plines, key)
                if value is not None:
                    found[key] = (path, value)
    return found


def fail(message):
    print(f"Error: {message} — leaving it untouched.", file=sys.stderr)
    sys.exit(1)


def fmt(before, after, requested):
    if not requested:
        return after or "(unset)"
    if before == after:
        return f'{after or "(unset)"} (unchanged)'
    return f'{before or "(unset)"} -> {after or "(unset)"}'


def main():
    args = sys.argv[1:]
    run_flags = set()
    if len(args) == 4 and args[2] == "--run-flags":
        run_flags = {f for f in args[3].split(",") if f}
        args = args[:2]
    if len(args) != 2 or not run_flags <= RUN_FLAGS.keys():
        print("Usage: apply-codex-config.py <model> <effort> [--run-flags model,effort]", file=sys.stderr)
        sys.exit(2)

    model = args[0].strip()
    effort_in = args[1].strip()

    codex_home = os.environ.get("CODEX_HOME") or os.path.expanduser("~/.codex")
    config_path = os.path.join(codex_home, "config.toml")
    os.makedirs(codex_home, exist_ok=True)
    try:
        with open(config_path) as f:
            lines = f.readlines()
    except FileNotFoundError:
        lines = []
    except (UnicodeDecodeError, OSError) as e:
        # Refuse rather than start from an empty file: the write below would
        # replace the whole config with two keys, and a config we cannot read
        # is precisely the one whose contents we have no right to discard.
        fail(f"cannot read {config_path} ({type(e).__name__}). Repair or move it, then re-run")

    _, before_model, _ = find_line(lines, "model")
    _, before_effort, _ = find_line(lines, "model_reasoning_effort")

    original = list(lines)
    expected = {}
    if model:
        set_line(lines, "model", model)
        expected["model"] = model
    if effort_in:
        set_line(lines, "model_reasoning_effort", effort_in)
        expected["model_reasoning_effort"] = effort_in

    if expected:
        check(original, lines, config_path, expected)
        fd, tmp = tempfile.mkstemp(dir=codex_home, prefix=".config.toml.")
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

    _, after_model, _ = find_line(lines, "model")
    _, after_effort, _ = find_line(lines, "model_reasoning_effort")

    print(
        f"Model: {fmt(before_model, after_model, bool(model))} | "
        f"Effort: {fmt(before_effort, after_effort, bool(effort_in))}"
    )

    overrides = project_overrides(
        expected, project_configs(os.getcwd(), root_markers(original), config_path)
    )
    passable = {RUN_FLAGS[f] for f in run_flags}
    flags = [
        f"--{f} {shlex.quote(expected[k])}"
        for f, k in RUN_FLAGS.items()
        if k in overrides and k in passable
    ]
    if flags:
        print("Run flags: " + " ".join(flags))
    for key, (path, value) in overrides.items():
        if key not in passable:
            print(
                f"Note: {path} sets {key} = {toml_string(value)}; Codex uses that instead "
                "in this project (when the project is trusted), and this command has no flag to override it."
            )


if __name__ == "__main__":
    main()
