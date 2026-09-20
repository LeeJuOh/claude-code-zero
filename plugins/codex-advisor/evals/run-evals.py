#!/usr/bin/env python3
"""Run the Verifier evals: one `claude -p` session per payload, output saved raw.

Each run launches a real headless session that spawns `codex-advisor:verifier`, so
the PreToolUse payload hook, the agent prompt, and `references/evaluation.md` are all
exercised exactly as a user would hit them. Grading is deliberately separate — this
script only records what came back, so a grading change never means re-running.

Usage:
  build-payloads.py --out-dir <ws>            # first: build the payloads
  run-evals.py --out-dir <ws> [--only <name> ...] [--jobs N]

Writes `<ws>/<eval-name>/runs/<payload-key>.json` per payload (the raw `claude -p`
JSON) and prints a summary index to stdout.
"""
import argparse
import concurrent.futures
import json
import os
import subprocess
import sys

EVALS_DIR = os.path.dirname(os.path.realpath(__file__))
PLUGIN_DIR = os.path.dirname(EVALS_DIR)
REPO_ROOT = os.path.dirname(os.path.dirname(PLUGIN_DIR))


def load_evals():
    with open(os.path.join(EVALS_DIR, "evals.json"), encoding="utf-8") as f:
        return json.load(f)


def payload_key(out_root, payload):
    """A short stable name for a payload path, e.g. `together-group-1`."""
    rel = os.path.relpath(payload, out_root)
    parts = [p for p in rel.split(os.sep) if p not in ("payload",)]
    return "-".join(parts)[: -len(".json")].replace(os.sep, "-")


def run_one(prompt_template, payload, dest):
    prompt = prompt_template.replace("{PAYLOAD}", payload)
    env = dict(os.environ)
    env.pop("CLAUDECODE", None)  # a nested session refuses to start
    proc = subprocess.run(
        ["claude", "-p", "--plugin-dir", os.path.join(".", "plugins", "codex-advisor"),
         "--allowedTools", "Agent", "--output-format", "json", prompt],
        cwd=REPO_ROOT, capture_output=True, text=True, env=env,
    )
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    with open(dest, "w", encoding="utf-8") as f:
        f.write(proc.stdout or json.dumps({"error": proc.stderr, "returncode": proc.returncode}))
    return {"payload": payload, "output": dest, "returncode": proc.returncode,
            "stderr": proc.stderr.strip()[-400:]}


def main(argv):
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--out-dir", required=True, help="the workspace build-payloads.py wrote to")
    parser.add_argument("--only", action="append", help="run just these eval names")
    parser.add_argument("--jobs", type=int, default=4, help="parallel sessions (default 4)")
    args = parser.parse_args(argv)

    out_root = os.path.abspath(args.out_dir)
    spec = load_evals()
    template = spec["prompt_template"]

    jobs = []
    for entry in spec["evals"]:
        name = entry["name"]
        if args.only and name not in args.only:
            continue
        eval_dir = os.path.join(out_root, name)
        payloads = sorted(
            os.path.join(root, f)
            for root, _, files in os.walk(eval_dir)
            for f in files
            if f.startswith("group-") and f.endswith(".json")
        )
        if not payloads:
            raise SystemExit(f"no payloads under {eval_dir} — run build-payloads.py first")
        for payload in payloads:
            key = payload_key(eval_dir, payload)
            jobs.append((name, key, payload, os.path.join(eval_dir, "runs", f"{key}.json")))

    results = {}
    with concurrent.futures.ThreadPoolExecutor(max_workers=args.jobs) as pool:
        futures = {pool.submit(run_one, template, payload, dest): (name, key)
                   for name, key, payload, dest in jobs}
        for future in concurrent.futures.as_completed(futures):
            name, key = futures[future]
            results.setdefault(name, {})[key] = future.result()
            print(f"done: {name}/{key}", file=sys.stderr)

    print(json.dumps({"out_dir": out_root, "runs": results}, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
