#!/usr/bin/env python3
"""Build Verifier payload directories from the fixtures in evals/fixtures/.

The evals measure the Verifier (Claude), not Codex, so nothing here calls Codex:
`fixtures/codex/*.txt` are hand-written stand-ins for what Codex prints, and this
script feeds them through the real `scripts/prepare-verifier.py` so the payloads a
Verifier receives during an eval are built by the same code path as in production.

Payloads are run artefacts, not source, so they go to a workspace directory you
name (a scratchpad, say) and are never committed.

Usage:
  build-payloads.py --out-dir <workspace> [--only <eval-id> ...]

Output: one JSON object on stdout — `{"evals": {<eval-id>: {"payloads": [...],
"out_dir": ...}}}` — listing every payload file, in the order the Verifier should
be handed them.
"""
import argparse
import json
import os
import re
import shutil
import subprocess
import sys

EVALS_DIR = os.path.dirname(os.path.realpath(__file__))
PLUGIN_DIR = os.path.dirname(EVALS_DIR)
FIXTURES = os.path.join(EVALS_DIR, "fixtures")
REPO_FIXTURE = os.path.join(FIXTURES, "repo")
PREPARE = os.path.join(PLUGIN_DIR, "scripts", "prepare-verifier.py")

# `- [P2] Title — {REPO}/app/orders.py:4-6`, the line format Codex stamps.
REVIEW_ITEM_RE = re.compile(r"^- .+ — .+:\d+-\d+$")


def fixture(*parts):
    return os.path.join(FIXTURES, *parts)


def read(path):
    with open(path, encoding="utf-8") as f:
        return f.read()


def write(path, text):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write(text)
    return path


def materialize(text):
    """Point a fixture's `{REPO}` placeholders at the real fixture repo."""
    return text.replace("{REPO}", REPO_FIXTURE)


def prepare(*args):
    """Run prepare-verifier.py and return its stdout JSON, or die loudly."""
    proc = subprocess.run([sys.executable, PREPARE, *args], capture_output=True, text=True)
    if proc.returncode != 0:
        raise SystemExit(f"prepare-verifier.py failed ({proc.returncode}): {proc.stderr.strip()}")
    return json.loads(proc.stdout)


def git(repo, *args):
    subprocess.run(["git", "-C", repo, *args], check=True, capture_output=True, text=True)


def codex_json(work, name, text):
    """Wrap review text the way the codex-review skill stores a Codex run."""
    return write(os.path.join(work, f"{name}.json"), json.dumps({"codex": {"stdout": text}}))


def payload_paths(result):
    return [g["payload"] for g in result["groups"]]


def review_eval(eval_id, fixture_name, out_root):
    """One Codex review fixture -> one payload directory."""
    work = os.path.join(out_root, eval_id)
    text = materialize(read(fixture("codex", fixture_name)))
    result = prepare("--skill", "review", "--input", codex_json(work, "codex", text),
                     "--repo", REPO_FIXTURE, "--out-dir", os.path.join(work, "payload"))
    return {"out_dir": work, "payloads": payload_paths(result), "script_output": result}


def split_review_items(text):
    """Cut a multi-comment review into one single-comment review per finding.

    The Q17 comparison needs the same five findings once as a group of five and
    once as five separate runs; splitting here keeps both sides byte-identical
    apart from the grouping.
    """
    lines = text.splitlines()
    starts = [i for i, line in enumerate(lines) if REVIEW_ITEM_RE.match(line)]
    blocks = []
    for n, start in enumerate(starts):
        end = starts[n + 1] if n + 1 < len(starts) else len(lines)
        blocks.append("\n".join(lines[start:end]).rstrip())
    return [f"One issue found.\n\nReview comment:\n\n{block}\n" for block in blocks]


def group_comparison_eval(eval_id, out_root):
    """Q17: five findings as one group, and the same five as five groups."""
    work = os.path.join(out_root, eval_id)
    text = materialize(read(fixture("codex", "five-findings.txt")))

    together = prepare("--skill", "review", "--input", codex_json(os.path.join(work, "together"), "codex", text),
                       "--repo", REPO_FIXTURE, "--out-dir", os.path.join(work, "together", "payload"))
    apart = []
    for n, single in enumerate(split_review_items(text), start=1):
        sub = os.path.join(work, "apart", f"finding-{n}")
        apart.append(prepare("--skill", "review", "--input", codex_json(sub, "codex", single),
                             "--repo", REPO_FIXTURE, "--out-dir", os.path.join(sub, "payload")))
    return {
        "out_dir": work,
        "payloads": payload_paths(together) + [p for r in apart for p in payload_paths(r)],
        "together_payloads": payload_paths(together),
        "apart_payloads": [p for r in apart for p in payload_paths(r)],
        "script_output": {"together": together, "apart": apart},
    }


def research_eval(eval_id, topic_name, result_name, out_root):
    """A research topic + result pair -> one `doc` payload of paths."""
    work = os.path.join(out_root, eval_id)
    prompt_file = write(os.path.join(work, "topic.md"), materialize(read(fixture("research", topic_name))))
    result_file = write(os.path.join(work, "result.md"), materialize(read(fixture("research", result_name))))
    result = prepare("--mode", "doc", "--skill", "research", "--prompt-file", prompt_file,
                     "--result-file", result_file, "--out-dir", os.path.join(work, "payload"))
    return {"out_dir": work, "payloads": payload_paths(result), "script_output": result}


def rescue_diff_eval(eval_id, out_root):
    """Replay a Codex write run: seed repo -> snapshot -> after -> diff payload.

    `--mode diff` diffs two tree objects, so the fixture needs to be a real git
    repository; seed and after are committed nowhere, they only have to exist on
    disk at the right moment.
    """
    work = os.path.join(out_root, eval_id)
    repo = os.path.join(work, "repo")
    shutil.rmtree(repo, ignore_errors=True)
    shutil.copytree(fixture("rescue", "seed"), repo)
    git(repo, "init", "--quiet")
    git(repo, "config", "user.email", "evals@example.invalid")
    git(repo, "config", "user.name", "codex-advisor evals")
    git(repo, "add", "-A")
    git(repo, "commit", "--quiet", "-m", "seed")

    pre = subprocess.run([sys.executable, PREPARE, "snapshot", "--repo", repo],
                         capture_output=True, text=True, check=True).stdout.strip()
    for name in os.listdir(fixture("rescue", "after")):
        shutil.copyfile(fixture("rescue", "after", name), os.path.join(repo, name))

    prompt_file = write(os.path.join(work, "task.md"), read(fixture("rescue", "task.md")))
    result = prepare("--mode", "diff", "--pre", pre, "--prompt-file", prompt_file,
                     "--repo", repo, "--out-dir", os.path.join(work, "payload"))
    return {"out_dir": work, "payloads": payload_paths(result), "script_output": result}


BUILDERS = {
    "agreed": lambda out: review_eval("agreed", "agreed.txt", out),
    "no-such-function": lambda out: review_eval("no-such-function", "no-such-function.txt", out),
    "nuanced": lambda out: review_eval("nuanced", "nuanced.txt", out),
    "external-fact": lambda out: review_eval("external-fact", "external-fact.txt", out),
    "group-of-two": lambda out: review_eval("group-of-two", "group-of-two.txt", out),
    "rescue-diff": lambda out: rescue_diff_eval("rescue-diff", out),
    "research-sources": lambda out: research_eval("research-sources", "sources-topic.md", "sources-result.md", out),
    "research-coverage": lambda out: research_eval("research-coverage", "coverage-topic.md", "coverage-result.md", out),
    "group-comparison": lambda out: group_comparison_eval("group-comparison", out),
}


def main(argv):
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--out-dir", required=True, help="workspace for the built payloads (not committed)")
    parser.add_argument("--only", action="append", choices=sorted(BUILDERS), help="build just these evals")
    args = parser.parse_args(argv)

    out_root = os.path.abspath(args.out_dir)
    os.makedirs(out_root, exist_ok=True)
    wanted = args.only or sorted(BUILDERS)
    built = {eval_id: BUILDERS[eval_id](out_root) for eval_id in wanted}
    print(json.dumps({"out_dir": out_root, "evals": built}, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
