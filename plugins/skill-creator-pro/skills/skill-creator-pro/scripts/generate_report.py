#!/usr/bin/env python3
"""Generate an HTML report from description optimization loop output.

Takes the JSON output from run_loop.py and generates a visual HTML report
showing each description attempt with pass/fail for each test case.
"""

import argparse
import html
import json
import sys
from pathlib import Path


def generate_html(data: dict, auto_refresh: bool = False, skill_name: str = "") -> str:
    """Generate HTML report from loop output data."""
    history = data.get("history", [])
    title_prefix = html.escape(skill_name + " -- ") if skill_name else ""

    train_queries: list[dict] = []
    test_queries: list[dict] = []
    if history:
        for r in history[0].get("train_results", history[0].get("results", [])):
            train_queries.append({"query": r["query"], "should_trigger": r.get("should_trigger", True)})
        if history[0].get("test_results"):
            for r in history[0].get("test_results", []):
                test_queries.append({"query": r["query"], "should_trigger": r.get("should_trigger", True)})

    refresh_tag = '    <meta http-equiv="refresh" content="5">\n' if auto_refresh else ""

    parts = [f"""<!DOCTYPE html>
<html><head>
    <meta charset="utf-8">
{refresh_tag}    <title>{title_prefix}Description Optimization</title>
    <style>
        body {{ font: 14px/1.5 system-ui, sans-serif; margin: 0; padding: 20px; background: #faf9f5; color: #141413; }}
        h1 {{ font-size: 20px; }}
        .summary {{ background: #fff; padding: 15px; border-radius: 6px; margin-bottom: 20px; border: 1px solid #e8e6dc; }}
        .best {{ color: #788c5d; font-weight: bold; }}
        .table-container {{ overflow-x: auto; }}
        table {{ border-collapse: collapse; background: #fff; border: 1px solid #e8e6dc; font-size: 12px; min-width: 100%; }}
        th, td {{ padding: 8px; text-align: left; border: 1px solid #e8e6dc; }}
        th {{ background: #141413; color: #faf9f5; font-weight: 500; }}
        th.test-col {{ background: #6a9bcc; }}
        td.description {{ font-family: monospace; font-size: 11px; max-width: 400px; word-wrap: break-word; }}
        td.result {{ text-align: center; font-size: 16px; min-width: 40px; }}
        td.test-result {{ background: #f0f6fc; }}
        .pass {{ color: #788c5d; }} .fail {{ color: #c44; }}
        .rate {{ font-size: 9px; color: #b0aea5; display: block; }}
        .score {{ display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 11px; }}
        .score-good {{ background: #eef2e8; color: #788c5d; }}
        .score-ok {{ background: #fef3c7; color: #d97706; }}
        .score-bad {{ background: #fceaea; color: #c44; }}
        .best-row {{ background: #f5f8f2; }}
        th.positive-col {{ border-bottom: 3px solid #788c5d; }}
        th.negative-col {{ border-bottom: 3px solid #c44; }}
    </style>
</head><body>
    <h1>{title_prefix}Description Optimization</h1>
    <div class="summary">
        <p><strong>Original:</strong> {html.escape(data.get('original_description', 'N/A'))}</p>
        <p class="best"><strong>Best:</strong> {html.escape(data.get('best_description', 'N/A'))}</p>
        <p><strong>Best Score:</strong> {data.get('best_score', 'N/A')} | <strong>Iterations:</strong> {data.get('iterations_run', 0)}</p>
    </div>
    <div class="table-container">
    <table><thead><tr>
        <th>Iter</th><th>Train</th><th>Test</th><th>Description</th>
"""]

    for qinfo in train_queries:
        polarity = "positive-col" if qinfo["should_trigger"] else "negative-col"
        parts.append(f'        <th class="{polarity}">{html.escape(qinfo["query"][:50])}</th>\n')
    for qinfo in test_queries:
        polarity = "positive-col" if qinfo["should_trigger"] else "negative-col"
        parts.append(f'        <th class="test-col {polarity}">{html.escape(qinfo["query"][:50])}</th>\n')

    parts.append("    </tr></thead><tbody>\n")

    best_iter = None
    if history:
        if test_queries:
            best_iter = max(history, key=lambda h: h.get("test_passed") or 0).get("iteration")
        else:
            best_iter = max(history, key=lambda h: h.get("train_passed", h.get("passed", 0))).get("iteration")

    for h in history:
        iteration = h.get("iteration", "?")
        train_results = h.get("train_results", h.get("results", []))
        test_results = h.get("test_results", [])
        train_by_query = {r["query"]: r for r in train_results}
        test_by_query = {r["query"]: r for r in test_results} if test_results else {}

        def agg(results):
            correct = total = 0
            for r in results:
                runs = r.get("runs", 0)
                triggers = r.get("triggers", 0)
                total += runs
                correct += triggers if r.get("should_trigger", True) else (runs - triggers)
            return correct, total

        train_c, train_t = agg(train_results)
        test_c, test_t = agg(test_results)

        def sc(c, t):
            if t > 0:
                ratio = c / t
                return "score-good" if ratio >= 0.8 else ("score-ok" if ratio >= 0.5 else "score-bad")
            return "score-bad"

        row_class = "best-row" if iteration == best_iter else ""
        parts.append(f'    <tr class="{row_class}">')
        parts.append(f'<td>{iteration}</td>')
        parts.append(f'<td><span class="score {sc(train_c, train_t)}">{train_c}/{train_t}</span></td>')
        parts.append(f'<td><span class="score {sc(test_c, test_t)}">{test_c}/{test_t}</span></td>')
        parts.append(f'<td class="description">{html.escape(h.get("description", ""))}</td>')

        for qinfo in train_queries:
            r = train_by_query.get(qinfo["query"], {})
            icon = "\u2713" if r.get("pass", False) else "\u2717"
            css = "pass" if r.get("pass", False) else "fail"
            parts.append(f'<td class="result {css}">{icon}<span class="rate">{r.get("triggers",0)}/{r.get("runs",0)}</span></td>')

        for qinfo in test_queries:
            r = test_by_query.get(qinfo["query"], {})
            icon = "\u2713" if r.get("pass", False) else "\u2717"
            css = "pass" if r.get("pass", False) else "fail"
            parts.append(f'<td class="result test-result {css}">{icon}<span class="rate">{r.get("triggers",0)}/{r.get("runs",0)}</span></td>')

        parts.append("</tr>\n")

    parts.append("    </tbody></table></div>\n</body></html>")
    return "".join(parts)


def main():
    parser = argparse.ArgumentParser(description="Generate HTML report")
    parser.add_argument("input")
    parser.add_argument("-o", "--output", default=None)
    parser.add_argument("--skill-name", default="")
    args = parser.parse_args()

    data = json.load(sys.stdin) if args.input == "-" else json.loads(Path(args.input).read_text())
    html_output = generate_html(data, skill_name=args.skill_name)

    if args.output:
        Path(args.output).write_text(html_output)
    else:
        print(html_output)


if __name__ == "__main__":
    main()
