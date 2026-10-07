#!/usr/bin/env python3
"""Prepare Verifier payloads for codex-advisor's double-check.

This script handles facts only: it cuts Codex output into findings, checks that
each cited file:line exists, groups findings, snapshots trees, and writes the
payload files a Verifier subagent receives. It makes no judgment — whether a
finding is right is the Verifier's call, never this script's and never the main
session's. The main session only passes paths in and reads the JSON out, so it
never has to read source or reword a finding.

Usage:
  prepare-verifier.py snapshot --repo <root>
      Print the tree SHA of the whole working tree (tracked + untracked,
      .gitignore respected) without touching the real index.

  prepare-verifier.py --skill review|adversarial|rescue --input <codex.json>
                      --repo <root> --out-dir <dir> [--ref <reviewed ref>]
      Default mode. review/adversarial: extract findings, check citations,
      group by file, one payload per ok group. rescue (read-only): the whole
      rawOutput becomes one payload (group "all"). --ref enables the
      worktree-drift check (pass HEAD for a branch review; omit for a
      working-tree review).

  prepare-verifier.py --mode doc --skill verify|research --prompt-file <p>
                      --result-file <r> [--document <d>] --out-dir <dir>
      One payload holding paths only (no document or prompt text).

  prepare-verifier.py --mode diff --pre <tree> --prompt-file <p>
                      --repo <root> --out-dir <dir>
      Snapshot the tree after the run, write `git diff <pre> <post>` to a file,
      and one payload holding the diff path and prompt path.

Output: one JSON object on stdout (the snapshot action prints a bare SHA).
Every payload file is listed with its sha256 in <out-dir>/manifest.json; the
plugin's PreToolUse hook refuses a payload whose hash does not match.

Exit codes: 0 ok · 2 bad usage, unreadable input, or git failure ·
3 parse_error (Codex output no longer matches the known format) ·
4 no_output (Codex returned nothing to judge).
On any non-zero exit stdout is empty and no file is written.
"""
import argparse
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile

SCRIPT_DIR = os.path.dirname(os.path.realpath(__file__))
RULES_PATH = os.path.join(os.path.dirname(SCRIPT_DIR), "references", "evaluation.md")

PAYLOAD_FORMAT = "codex-advisor-verifier-payload/1"

# Group caps (spec 016 Q17): compromise values, not quality-proven numbers.
GROUP_MAX_FINDINGS = 5
GROUP_MAX_CHARS = 6000

# Codex review text format, stamped by codex-rs/protocol/src/review_format.rs.
REVIEW_HEADER_MULTI = "Full review comments:"
REVIEW_HEADER_ONE = "Review comment:"
REVIEW_FALLBACK = "Reviewer failed to output a response."
REVIEW_ITEM_RE = re.compile(r"^- (?P<title>.+) — (?P<path>.+):(?P<start>\d+)-(?P<end>\d+)$")

# The payload names the section of the rules file that applies; the rules
# themselves live only in references/evaluation.md.
TASKS = {
    "findings": "Judge every item in `items` per the \"Code findings\" section of the rules file. "
                "Return exactly one verdict per item id.",
    "whole": "Judge `codex_output` per the \"Prose results\" section of the rules file. "
             "Split it into items and assign ids yourself.",
    "doc": "Judge the Codex result per the \"Prose results\" section of the rules file. "
           "Read the files named here; split the result into items and assign ids yourself.",
    "diff": "Judge the diff against the task in `prompt_file` per the \"Rescue diff\" section of "
            "the rules file. Split the task into requirements and assign ids yourself.",
}


class Fail(Exception):
    def __init__(self, code, kind, message):
        super().__init__(message)
        self.code = code
        self.kind = kind


def git(repo, *args, env=None, ok_codes=(0,)):
    try:
        proc = subprocess.run(
            ["git", "-C", repo, *args],
            capture_output=True,
            text=True,
            env=env,
        )
    except OSError as e:
        raise Fail(2, "git_error", f"cannot run git: {e}")
    if proc.returncode not in ok_codes:
        raise Fail(2, "git_error", f"git {' '.join(args)} failed ({proc.returncode}): {proc.stderr.strip()}")
    return proc


# ---------------------------------------------------------------- extraction


def load_json(path):
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except (OSError, UnicodeDecodeError, json.JSONDecodeError) as e:
        raise Fail(2, "invalid_input", f"cannot read JSON from {path}: {e}")


def extract_adversarial(data):
    if not isinstance(data, dict):
        raise Fail(3, "parse_error", "adversarial output is not a JSON object")
    result = data.get("result")
    if isinstance(result, dict) and isinstance(result.get("findings"), list):
        findings = []
        for raw in result["findings"]:
            if not isinstance(raw, dict):
                raise Fail(3, "parse_error", "adversarial finding is not an object")
            findings.append({
                "raw": raw,
                "file": raw.get("file"),
                "line_start": raw.get("line_start"),
                "line_end": raw.get("line_end"),
                "severity": raw.get("severity"),
            })
        return findings
    if result is None:
        raw_output = data.get("rawOutput")
        if not isinstance(raw_output, str) or not raw_output.strip():
            raise Fail(4, "no_output", "adversarial review returned no output")
        raise Fail(3, "parse_error", f"adversarial output did not parse: {data.get('parseError')}")
    raise Fail(3, "parse_error", "adversarial `result.findings` is missing or not a list")


def parse_review_text(text):
    """Cut Codex review text into findings.

    Zero findings is normal: the formatter then prints only the overall
    explanation, with no header and no item lines. Anything else that does not
    fit the format is a parse_error — never silently "uncited".
    """
    if not text.strip() or text.strip() == REVIEW_FALLBACK:
        raise Fail(4, "no_output", "Codex review returned no output")

    lines = [line[:-1] if line.endswith("\r") else line for line in text.split("\n")]
    header_idx = None
    for i, line in enumerate(lines):
        if line in (REVIEW_HEADER_MULTI, REVIEW_HEADER_ONE):
            header_idx = i

    if header_idx is None:
        if any(REVIEW_ITEM_RE.match(line) for line in lines):
            raise Fail(3, "parse_error", "review item lines found without a findings header")
        return []

    items = []
    current = None
    after_separator = False
    for line in lines[header_idx + 1:]:
        m = REVIEW_ITEM_RE.match(line)
        if m:
            current = {
                "title": m.group("title"),
                "path": m.group("path"),
                "start": int(m.group("start")),
                "end": int(m.group("end")),
                "body": [],
            }
            items.append(current)
            after_separator = False
        elif line.startswith("  ") and current is not None and not after_separator:
            current["body"].append(line[2:])
        elif line.strip() == "":
            after_separator = current is not None
        else:
            raise Fail(3, "parse_error", f"unexpected line in review findings block: {line[:80]!r}")

    if not items:
        raise Fail(3, "parse_error", "review findings header present but no item lines")
    header = lines[header_idx]
    if (header == REVIEW_HEADER_ONE) != (len(items) == 1):
        raise Fail(3, "parse_error", f"review header {header!r} does not match {len(items)} item(s)")

    findings = []
    for item in items:
        raw = {
            "title": item["title"],
            "body": "\n".join(item["body"]),
            "location": f"{item['path']}:{item['start']}-{item['end']}",
        }
        findings.append({
            "raw": raw,
            "file": item["path"],
            "line_start": item["start"],
            "line_end": item["end"],
            "severity": None,
        })
    return findings


def extract_review(data):
    codex = data.get("codex") if isinstance(data, dict) else None
    if not isinstance(codex, dict) or not isinstance(codex.get("stdout"), str):
        raise Fail(3, "parse_error", "review output has no `codex.stdout` string")
    return parse_review_text(codex["stdout"])


def extract_rescue_output(data):
    raw = None
    if isinstance(data, dict):
        stored = data.get("storedJob")
        if isinstance(stored, dict) and isinstance(stored.get("result"), dict):
            raw = stored["result"].get("rawOutput")
        elif "rawOutput" in data:
            raw = data["rawOutput"]
        else:
            raise Fail(3, "parse_error", "rescue result has no `storedJob.result.rawOutput`")
    else:
        raise Fail(3, "parse_error", "rescue result is not a JSON object")
    if not isinstance(raw, str) or not raw.strip():
        raise Fail(4, "no_output", "Codex task returned no output")
    return raw


# ------------------------------------------------------------ citation check


def to_repo_relative(repo, path):
    """Return the repo-relative path, or None when the path is outside the repo."""
    candidate = path if os.path.isabs(path) else os.path.join(repo, path)
    candidate = os.path.normpath(candidate)
    for root in {os.path.normpath(repo), os.path.realpath(repo)}:
        if candidate.startswith(root + os.sep):
            return os.path.relpath(candidate, root)
    return None


def count_lines(path):
    with open(path, "rb") as f:
        data = f.read()
    if not data:
        return 0
    return data.count(b"\n") + (0 if data.endswith(b"\n") else 1)


def is_line_number(value):
    return isinstance(value, int) and not isinstance(value, bool)


def check_citation(repo, finding):
    """Return (file, line_start, line_end, status, file_lines)."""
    file = finding["file"]
    start = finding["line_start"]
    end = finding["line_end"]
    if not isinstance(file, str) or not file.strip() or not is_line_number(start):
        shown = file if isinstance(file, str) and file.strip() else None
        return shown, start if is_line_number(start) else None, end if is_line_number(end) else None, "uncited", None
    if not is_line_number(end):
        end = start
    rel = to_repo_relative(repo, file.strip())
    if rel is None:
        return file.strip(), start, end, "missing", None
    full = os.path.join(repo, rel)
    if not os.path.isfile(full):
        return rel, start, end, "missing", None
    total = count_lines(full)
    if start < 1 or end < start or end > total:
        return rel, start, end, "missing", total
    return rel, start, end, "ok", total


def finding_chars(raw):
    return sum(len(v) for v in raw.values() if isinstance(v, str))


def assign_groups(checked):
    """Group ok findings by file, capped by count and size; ids in first-seen order."""
    by_file = {}
    for f in checked:
        if f["status"] == "ok":
            by_file.setdefault(f["file"], []).append(f)
    groups = []
    for members in by_file.values():
        members.sort(key=lambda f: (f["line_start"], f["line_end"], f["index"]))
        current, chars = [], 0
        for f in members:
            size = finding_chars(f["raw"])
            if current and (len(current) == GROUP_MAX_FINDINGS or chars + size > GROUP_MAX_CHARS):
                groups.append(current)
                current, chars = [], 0
            current.append(f)
            chars += size
        if current:
            groups.append(current)
    for group_id, members in enumerate(groups, start=1):
        for f in members:
            f["group_id"] = group_id
    return groups


# ------------------------------------------------------------------- writing


def payload_bytes(payload):
    return (json.dumps(payload, ensure_ascii=False, indent=2) + "\n").encode("utf-8")


def prepare_out_dir(out_dir):
    if os.path.exists(out_dir):
        if not os.path.isdir(out_dir) or os.listdir(out_dir):
            raise Fail(2, "invalid_input", f"--out-dir must be a new or empty directory: {out_dir}")


def write_outputs(out_dir, payloads, extra_files=()):
    """Write payload files, extra files, then the manifest. Returns manifest path."""
    os.makedirs(out_dir, exist_ok=True)
    manifest = {"format": PAYLOAD_FORMAT, "payloads": {}}
    for name, data in extra_files:
        with open(os.path.join(out_dir, name), "wb") as f:
            f.write(data)
    for name, payload in payloads:
        data = payload_bytes(payload)
        with open(os.path.join(out_dir, name), "wb") as f:
            f.write(data)
        manifest["payloads"][name] = hashlib.sha256(data).hexdigest()
    manifest_path = os.path.join(out_dir, "manifest.json")
    with open(manifest_path, "wb") as f:
        f.write(payload_bytes(manifest))
    return manifest_path


def base_payload(mode, skill):
    return {
        "format": PAYLOAD_FORMAT,
        "mode": mode,
        "skill": skill,
        "task": TASKS[mode],
        "rules": RULES_PATH,
    }


def require_file(path, flag):
    if not path or not os.path.isfile(path):
        raise Fail(2, "invalid_input", f"{flag} is not a file: {path}")
    return os.path.abspath(path)


# --------------------------------------------------------------------- modes


def run_findings(args):
    for flag in ("input", "repo", "out_dir"):
        if not getattr(args, flag):
            raise Fail(2, "usage", f"--{flag.replace('_', '-')} is required")
    if args.skill not in ("review", "adversarial", "rescue"):
        raise Fail(2, "usage", "default mode needs --skill review|adversarial|rescue")
    repo = os.path.abspath(args.repo)
    if not os.path.isdir(repo):
        raise Fail(2, "invalid_input", f"--repo is not a directory: {repo}")
    out_dir = os.path.abspath(args.out_dir)
    prepare_out_dir(out_dir)
    data = load_json(args.input)

    if args.skill == "rescue":
        raw_output = extract_rescue_output(data)
        payload = base_payload("whole", "rescue")
        payload["repo_root"] = repo
        payload["codex_output"] = raw_output
        manifest = write_outputs(out_dir, [("group-all.json", payload)])
        return {
            "mode": "findings",
            "skill": "rescue",
            "worktree_drift": [],
            "findings": [],
            "groups": [{"group_id": "all", "status": "whole",
                        "payload": os.path.join(out_dir, "group-all.json")}],
            "manifest": manifest,
        }

    extracted = extract_review(data) if args.skill == "review" else extract_adversarial(data)

    if args.ref:
        git(repo, "rev-parse", "--verify", "--quiet", f"{args.ref}^{{commit}}")

    checked = []
    for index, f in enumerate(extracted, start=1):
        file, start, end, status, total = check_citation(repo, f)
        checked.append({
            "index": index,
            "id": f"F{index}",
            "file": file,
            "line_start": start,
            "line_end": end,
            "status": status,
            "reason": None,
            "file_lines": total,
            "severity": f["severity"],
            "raw": f["raw"],
            "group_id": None,
        })

    drift = []
    if args.ref:
        cache = {}
        for f in checked:
            if f["status"] == "uncited" or to_repo_relative(repo, f["file"]) is None:
                continue
            if f["file"] not in cache:
                proc = git(repo, "diff", "--quiet", args.ref, "--", f["file"], ok_codes=(0, 1))
                cache[f["file"]] = proc.returncode == 1
            if cache[f["file"]]:
                f["status"] = "unverifiable"
                f["reason"] = "worktree-drift"
        drift = sorted(name for name, changed in cache.items() if changed)

    groups = assign_groups(checked)
    payloads = []
    group_entries = []
    for group_id, members in enumerate(groups, start=1):
        name = f"group-{group_id}.json"
        payload = base_payload("findings", args.skill)
        payload["repo_root"] = repo
        payload["items"] = [
            {
                "id": f["id"],
                "severity": f["severity"],
                "citation": {"file": f["file"], "line_start": f["line_start"], "line_end": f["line_end"]},
                "existence": {"status": "ok", "file_lines": f["file_lines"]},
                "finding": f["raw"],
            }
            for f in members
        ]
        payloads.append((name, payload))
        group_entries.append({
            "group_id": group_id,
            "finding_ids": [f["id"] for f in members],
            "payload": os.path.join(out_dir, name),
        })

    manifest = write_outputs(out_dir, payloads)
    return {
        "mode": "findings",
        "skill": args.skill,
        "worktree_drift": drift,
        "findings": [
            {key: f[key] for key in ("index", "id", "file", "line_start", "line_end", "status", "reason", "group_id")}
            for f in checked
        ],
        "groups": group_entries,
        "manifest": manifest,
    }


def run_doc(args):
    if args.skill not in ("verify", "research"):
        raise Fail(2, "usage", "--mode doc needs --skill verify|research")
    if not args.out_dir:
        raise Fail(2, "usage", "--out-dir is required")
    prompt_file = require_file(args.prompt_file, "--prompt-file")
    result_file = require_file(args.result_file, "--result-file")
    document = require_file(args.document, "--document") if args.document else None
    out_dir = os.path.abspath(args.out_dir)
    prepare_out_dir(out_dir)

    payload = base_payload("doc", args.skill)
    payload["prompt_file"] = prompt_file
    if document:
        payload["document"] = document
    payload["codex_result"] = result_file
    manifest = write_outputs(out_dir, [("group-all.json", payload)])
    return {
        "mode": "doc",
        "skill": args.skill,
        "groups": [{"group_id": "all", "payload": os.path.join(out_dir, "group-all.json")}],
        "manifest": manifest,
    }


def snapshot_tree(repo):
    """Write the whole working tree to a tree object using a throwaway index.

    The real index is copied to a temp file outside the working tree (inside,
    `git add -A` would pick the copy up) so the user's staging area is never
    touched.
    """
    toplevel = os.path.realpath(git(repo, "rev-parse", "--show-toplevel").stdout.strip())
    index_path = git(repo, "rev-parse", "--git-path", "index").stdout.strip()
    if not os.path.isabs(index_path):
        index_path = os.path.join(repo, index_path)
    tmp_dir = tempfile.mkdtemp(prefix="codex-advisor-index-")
    try:
        if os.path.realpath(tmp_dir).startswith(toplevel + os.sep):
            raise Fail(2, "invalid_input", f"temp directory is inside the working tree: {tmp_dir}")
        tmp_index = os.path.join(tmp_dir, "index")
        if os.path.isfile(index_path):
            shutil.copyfile(index_path, tmp_index)
        env = dict(os.environ, GIT_INDEX_FILE=tmp_index)
        git(repo, "add", "-A", env=env)
        return git(repo, "write-tree", env=env).stdout.strip()
    finally:
        shutil.rmtree(tmp_dir, ignore_errors=True)


def run_diff(args):
    for flag in ("pre", "repo", "out_dir"):
        if not getattr(args, flag):
            raise Fail(2, "usage", f"--{flag.replace('_', '-')} is required")
    prompt_file = require_file(args.prompt_file, "--prompt-file")
    repo = os.path.abspath(args.repo)
    out_dir = os.path.abspath(args.out_dir)
    prepare_out_dir(out_dir)
    git(repo, "rev-parse", "--verify", "--quiet", f"{args.pre}^{{tree}}")

    post = snapshot_tree(repo)
    diff = git(repo, "diff", "--no-color", "--no-ext-diff", args.pre, post).stdout
    diff_name = "rescue.diff"
    diff_path = os.path.join(out_dir, diff_name)

    payload = base_payload("diff", "rescue")
    payload["repo_root"] = repo
    payload["prompt_file"] = prompt_file
    payload["diff"] = diff_path
    manifest = write_outputs(out_dir, [("group-all.json", payload)],
                             extra_files=[(diff_name, diff.encode("utf-8"))])
    return {
        "mode": "diff",
        "skill": "rescue",
        "pre_tree": args.pre,
        "post_tree": post,
        "diff": diff_path,
        "diff_empty": diff == "",
        "groups": [{"group_id": "all", "payload": os.path.join(out_dir, "group-all.json")}],
        "manifest": manifest,
    }


def main(argv):
    if argv and argv[0] == "snapshot":
        parser = argparse.ArgumentParser(prog="prepare-verifier.py snapshot")
        parser.add_argument("--repo", required=True)
        args = parser.parse_args(argv[1:])
        print(snapshot_tree(os.path.abspath(args.repo)))
        return

    parser = argparse.ArgumentParser(prog="prepare-verifier.py")
    parser.add_argument("--mode", choices=["findings", "doc", "diff"], default="findings")
    parser.add_argument("--skill", choices=["review", "adversarial", "rescue", "verify", "research"])
    parser.add_argument("--input")
    parser.add_argument("--repo")
    parser.add_argument("--out-dir")
    parser.add_argument("--ref")
    parser.add_argument("--prompt-file")
    parser.add_argument("--result-file")
    parser.add_argument("--document")
    parser.add_argument("--pre")
    args = parser.parse_args(argv)

    runner = {"findings": run_findings, "doc": run_doc, "diff": run_diff}[args.mode]
    result = runner(args)
    sys.stdout.write(json.dumps(result, ensure_ascii=False, indent=2) + "\n")


if __name__ == "__main__":
    try:
        main(sys.argv[1:])
    except Fail as e:
        print(f"{e.kind}: {e}", file=sys.stderr)
        sys.exit(e.code)
