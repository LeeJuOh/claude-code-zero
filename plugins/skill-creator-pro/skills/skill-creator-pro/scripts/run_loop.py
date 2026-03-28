#!/usr/bin/env python3
"""Run the trigger evaluation + improvement loop.

Combines run_eval and improve_description in a loop, tracking history
and returning the best description found. Supports train/test split.
"""

import argparse
import json
import random
import sys
import tempfile
import time
import webbrowser
from pathlib import Path

import anthropic

from scripts.generate_report import generate_html
from scripts.improve_description import improve_description
from scripts.run_eval import find_project_root, run_trigger_eval
from scripts.utils import parse_skill_md


def split_trigger_set(trigger_set: list[dict], holdout: float, seed: int = 42) -> tuple[list[dict], list[dict]]:
    """Split trigger set into train and test, stratified by should_trigger."""
    random.seed(seed)
    positives = [e for e in trigger_set if e["should_trigger"]]
    negatives = [e for e in trigger_set if not e["should_trigger"]]
    random.shuffle(positives)
    random.shuffle(negatives)

    n_pos_test = max(1, int(len(positives) * holdout))
    n_neg_test = max(1, int(len(negatives) * holdout))

    test_set = positives[:n_pos_test] + negatives[:n_neg_test]
    train_set = positives[n_pos_test:] + negatives[n_neg_test:]
    return train_set, test_set


def optimization_loop(
    trigger_set: list[dict],
    skill_path: Path,
    description_override: str | None,
    num_workers: int,
    timeout: int,
    max_iterations: int,
    runs_per_query: int,
    trigger_threshold: float,
    holdout: float,
    model: str,
    verbose: bool,
    live_report_path: Path | None = None,
    log_dir: Path | None = None,
) -> dict:
    """Run the evaluation + improvement loop."""
    project_root = find_project_root()
    name, original_description, content = parse_skill_md(skill_path)
    current_description = description_override or original_description

    if holdout > 0:
        train_set, test_set = split_trigger_set(trigger_set, holdout)
        if verbose:
            print(f"Split: {len(train_set)} train, {len(test_set)} test", file=sys.stderr)
    else:
        train_set = trigger_set
        test_set = []

    client = anthropic.Anthropic()
    history = []
    exit_reason = "unknown"

    for iteration in range(1, max_iterations + 1):
        if verbose:
            print(f"\n{'='*60}\nIteration {iteration}/{max_iterations}\n{'='*60}", file=sys.stderr)

        all_queries = train_set + test_set
        t0 = time.time()
        all_results = run_trigger_eval(
            eval_set=all_queries,
            skill_name=name,
            description=current_description,
            num_workers=num_workers,
            timeout=timeout,
            project_root=project_root,
            runs_per_query=runs_per_query,
            trigger_threshold=trigger_threshold,
            model=model,
        )
        elapsed = time.time() - t0

        train_queries_set = {q["query"] for q in train_set}
        train_result_list = [r for r in all_results["results"] if r["query"] in train_queries_set]
        test_result_list = [r for r in all_results["results"] if r["query"] not in train_queries_set]

        train_passed = sum(1 for r in train_result_list if r["pass"])
        train_total = len(train_result_list)
        train_summary = {"passed": train_passed, "failed": train_total - train_passed, "total": train_total}
        train_results = {"results": train_result_list, "summary": train_summary}

        test_summary = None
        if test_set:
            test_passed = sum(1 for r in test_result_list if r["pass"])
            test_total = len(test_result_list)
            test_summary = {"passed": test_passed, "failed": test_total - test_passed, "total": test_total}

        history.append({
            "iteration": iteration,
            "description": current_description,
            "train_passed": train_summary["passed"],
            "train_failed": train_summary["failed"],
            "train_total": train_summary["total"],
            "train_results": train_results["results"],
            "test_passed": test_summary["passed"] if test_summary else None,
            "test_failed": test_summary["failed"] if test_summary else None,
            "test_total": test_summary["total"] if test_summary else None,
            "test_results": test_result_list if test_set else None,
            "passed": train_summary["passed"],
            "failed": train_summary["failed"],
            "total": train_summary["total"],
            "results": train_results["results"],
        })

        if live_report_path:
            partial = {
                "original_description": original_description,
                "best_description": current_description,
                "best_score": "in progress",
                "iterations_run": len(history),
                "holdout": holdout,
                "train_size": len(train_set),
                "test_size": len(test_set),
                "history": history,
            }
            live_report_path.write_text(generate_html(partial, auto_refresh=True, skill_name=name))

        if verbose:
            print(f"Train: {train_passed}/{train_total} ({elapsed:.1f}s)", file=sys.stderr)
            if test_summary:
                print(f"Test: {test_summary['passed']}/{test_summary['total']}", file=sys.stderr)

        if train_summary["failed"] == 0:
            exit_reason = f"all_passed (iteration {iteration})"
            break

        if iteration == max_iterations:
            exit_reason = f"max_iterations ({max_iterations})"
            break

        blinded_history = [{k: v for k, v in h.items() if not k.startswith("test_")} for h in history]
        new_description = improve_description(
            client=client,
            skill_name=name,
            skill_content=content,
            current_description=current_description,
            trigger_results=train_results,
            history=blinded_history,
            model=model,
            log_dir=log_dir,
            iteration=iteration,
        )

        if verbose:
            print(f"New description: {new_description}", file=sys.stderr)

        current_description = new_description

    if test_set:
        best = max(history, key=lambda h: h["test_passed"] or 0)
        best_score = f"{best['test_passed']}/{best['test_total']}"
    else:
        best = max(history, key=lambda h: h["train_passed"])
        best_score = f"{best['train_passed']}/{best['train_total']}"

    return {
        "exit_reason": exit_reason,
        "original_description": original_description,
        "best_description": best["description"],
        "best_score": best_score,
        "best_train_score": f"{best['train_passed']}/{best['train_total']}",
        "best_test_score": f"{best['test_passed']}/{best['test_total']}" if test_set else None,
        "final_description": current_description,
        "iterations_run": len(history),
        "holdout": holdout,
        "train_size": len(train_set),
        "test_size": len(test_set),
        "history": history,
    }


def main():
    parser = argparse.ArgumentParser(description="Run description optimization loop")
    parser.add_argument("--eval-set", required=True)
    parser.add_argument("--skill-path", required=True)
    parser.add_argument("--description", default=None)
    parser.add_argument("--num-workers", type=int, default=10)
    parser.add_argument("--timeout", type=int, default=30)
    parser.add_argument("--max-iterations", type=int, default=5)
    parser.add_argument("--runs-per-query", type=int, default=3)
    parser.add_argument("--trigger-threshold", type=float, default=0.5)
    parser.add_argument("--holdout", type=float, default=0.4)
    parser.add_argument("--model", required=True)
    parser.add_argument("--verbose", action="store_true")
    parser.add_argument("--report", default="auto")
    parser.add_argument("--results-dir", default=None)
    args = parser.parse_args()

    trigger_data = json.loads(Path(args.eval_set).read_text())
    skill_path = Path(args.skill_path)

    if not (skill_path / "SKILL.md").exists():
        print(f"Error: No SKILL.md at {skill_path}", file=sys.stderr)
        sys.exit(1)

    name, _, _ = parse_skill_md(skill_path)

    live_report_path = None
    if args.report != "none":
        if args.report == "auto":
            timestamp = time.strftime("%Y%m%d_%H%M%S")
            live_report_path = Path(tempfile.gettempdir()) / f"skill_desc_report_{skill_path.name}_{timestamp}.html"
        else:
            live_report_path = Path(args.report)
        live_report_path.write_text("<html><body><h1>Starting optimization...</h1><meta http-equiv='refresh' content='5'></body></html>")
        webbrowser.open(str(live_report_path))

    results_dir = None
    if args.results_dir:
        timestamp = time.strftime("%Y-%m-%d_%H%M%S")
        results_dir = Path(args.results_dir) / timestamp
        results_dir.mkdir(parents=True, exist_ok=True)

    log_dir = results_dir / "logs" if results_dir else None

    output = optimization_loop(
        trigger_set=trigger_data,
        skill_path=skill_path,
        description_override=args.description,
        num_workers=args.num_workers,
        timeout=args.timeout,
        max_iterations=args.max_iterations,
        runs_per_query=args.runs_per_query,
        trigger_threshold=args.trigger_threshold,
        holdout=args.holdout,
        model=args.model,
        verbose=args.verbose,
        live_report_path=live_report_path,
        log_dir=log_dir,
    )

    json_output = json.dumps(output, indent=2)
    print(json_output)
    if results_dir:
        (results_dir / "results.json").write_text(json_output)

    if live_report_path:
        live_report_path.write_text(generate_html(output, auto_refresh=False, skill_name=name))
        print(f"\nReport: {live_report_path}", file=sys.stderr)


if __name__ == "__main__":
    main()
