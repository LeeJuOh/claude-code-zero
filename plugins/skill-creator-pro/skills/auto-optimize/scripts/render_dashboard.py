#!/usr/bin/env python3
"""Render the auto-optimize dashboard from results.json.

Usage: render_dashboard.py <results.json> <dashboard.html>

The data is inlined into the HTML, so the page works from file:// (a page
that fetches results.json is blocked there). While status is "running" the
page reloads itself every 10 seconds; re-run this script after each
experiment to refresh it.
"""

import html
import json
import os
import sys
import tempfile

COLORS = {"keep": "#2e9d5b", "discard": "#d64545", "baseline": "#3b74d1", "marginal": "#d6a72e"}


def esc(value):
    return html.escape(str(value))


def chart(experiments):
    width, height, pad = 640, 220, 32
    points = [(e.get("id", i), float(e.get("pass_rate", 0))) for i, e in enumerate(experiments)]
    if not points:
        return "<p>No experiments yet.</p>"
    span = max(len(points) - 1, 1)
    def xy(index, rate):
        x = pad + index * (width - 2 * pad) / span
        y = height - pad - rate * (height - 2 * pad) / 100
        return x, y
    coords = [xy(i, rate) for i, (_, rate) in enumerate(points)]
    line = " ".join(f"{x:.1f},{y:.1f}" for x, y in coords)
    dots = "".join(
        f'<circle cx="{x:.1f}" cy="{y:.1f}" r="4" fill="{COLORS.get(experiments[i].get("status"), "#888")}">'
        f"<title>#{esc(points[i][0])}: {points[i][1]:.1f}%</title></circle>"
        for i, (x, y) in enumerate(coords)
    )
    grid = "".join(
        f'<line x1="{pad}" x2="{width - pad}" y1="{xy(0, r)[1]:.1f}" y2="{xy(0, r)[1]:.1f}" class="grid"/>'
        f'<text x="4" y="{xy(0, r)[1] + 4:.1f}" class="axis">{r}%</text>'
        for r in (0, 50, 100)
    )
    return (
        f'<svg viewBox="0 0 {width} {height}" role="img" aria-label="Pass rate by experiment">'
        f'{grid}<polyline points="{line}" fill="none" class="line"/>{dots}</svg>'
    )


def per_eval_rows(experiments):
    totals, latest, previous = {}, {}, {}
    for i, exp in enumerate(experiments):
        for item in exp.get("per_eval") or []:
            name = item.get("name", "?")
            passed, total = item.get("passed", 0), item.get("total", 0) or 0
            agg = totals.setdefault(name, [0, 0])
            agg[0] += passed
            agg[1] += total
            ratio = passed / total if total else 0
            if i == len(experiments) - 1:
                latest[name] = ratio
            elif i == len(experiments) - 2:
                previous[name] = ratio
    rows = []
    for name, (passed, total) in sorted(totals.items(), key=lambda kv: kv[1][0] / (kv[1][1] or 1)):
        trend = "→"
        if name in latest and name in previous:
            trend = "↑" if latest[name] > previous[name] else "↓" if latest[name] < previous[name] else "→"
        rate = 100 * passed / total if total else 0
        rows.append(f"<tr><td>{esc(name)}</td><td>{passed}/{total}</td><td>{rate:.0f}%</td><td>{trend}</td></tr>")
    return "".join(rows)


def render(data):
    experiments = data.get("experiments") or []
    status = data.get("status", "running")
    running = status == "running"
    current = f"Running experiment {esc(data.get('current_experiment', len(experiments)))}…" if running else "Idle"
    bars = "".join(
        f'<span class="bar" style="background:{COLORS.get(e.get("status"), "#888")}" '
        f'title="#{esc(e.get("id", i))} {esc(e.get("status", ""))}"></span>'
        for i, e in enumerate(experiments)
    )
    table = "".join(
        f"<tr><td>{esc(e.get('id', i))}</td><td>{esc(e.get('score', ''))}/{esc(e.get('max_score', ''))}</td>"
        f"<td>{float(e.get('pass_rate', 0)):.1f}%</td>"
        f'<td><span class="tag" style="background:{COLORS.get(e.get("status"), "#888")}">{esc(e.get("status", ""))}</span></td>'
        f"<td>{esc(e.get('description', ''))}</td></tr>"
        for i, e in enumerate(experiments)
    )
    refresh = '<meta http-equiv="refresh" content="10">' if running else ""
    return f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8">{refresh}
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>auto-optimize: {esc(data.get('skill_name', ''))}</title>
<style>
:root {{ --bg:#fff; --fg:#1d1d1f; --muted:#6b6b70; --line:#e3e3e6; }}
@media (prefers-color-scheme: dark) {{ :root {{ --bg:#141416; --fg:#ececf0; --muted:#9a9aa2; --line:#2c2c31; }} }}
body {{ background:var(--bg); color:var(--fg); font:15px/1.5 system-ui, sans-serif; margin:0 auto; max-width:900px; padding:16px; }}
h1 {{ font-size:20px; margin:0 0 4px; }} h2 {{ font-size:16px; margin:24px 0 8px; }}
.muted, .axis {{ color:var(--muted); fill:var(--muted); font-size:12px; }}
.stats {{ display:flex; gap:24px; flex-wrap:wrap; }} .stats b {{ font-size:22px; display:block; }}
svg {{ width:100%; height:auto; }} .grid {{ stroke:var(--line); }} .line {{ stroke:var(--fg); stroke-width:2; }}
.bar {{ display:inline-block; width:14px; height:14px; margin-right:3px; border-radius:2px; }}
table {{ border-collapse:collapse; width:100%; }} td, th {{ border-bottom:1px solid var(--line); padding:6px 8px; text-align:left; vertical-align:top; }}
.tag {{ color:#fff; border-radius:4px; padding:1px 6px; font-size:12px; }}
.wrap {{ overflow-x:auto; }}
</style></head><body>
<h1>{esc(data.get('skill_name', 'auto-optimize'))}</h1>
<p class="muted">{current}</p>
<div class="stats">
<div><span class="muted">Baseline</span><b>{float(data.get('baseline_score') or 0):.1f}%</b></div>
<div><span class="muted">Best</span><b>{float(data.get('best_score') or 0):.1f}%</b></div>
<div><span class="muted">Experiments</span><b>{len(experiments)}</b></div>
<div><span class="muted">Consecutive discards</span><b>{esc(data.get('consecutive_discards', 0))}</b></div>
</div>
<h2>Pass rate</h2>{chart(experiments)}
<div>{bars}</div>
<p class="muted">green keep · red discard · blue baseline · yellow marginal</p>
<h2>Per eval (weakest first)</h2>
<div class="wrap"><table><tr><th>Eval</th><th>Passed</th><th>Rate</th><th>Trend</th></tr>{per_eval_rows(experiments)}</table></div>
<h2>Experiments</h2>
<div class="wrap"><table><tr><th>#</th><th>Score</th><th>Pass rate</th><th>Status</th><th>Change</th></tr>{table}</table></div>
</body></html>
"""


def main():
    if len(sys.argv) != 3:
        sys.exit("usage: render_dashboard.py <results.json> <dashboard.html>")
    src, out = sys.argv[1], sys.argv[2]
    if not out.endswith(".html"):
        sys.exit("output path must end in .html")
    with open(src, encoding="utf-8") as f:
        data = json.load(f)
    page = render(data)
    folder = os.path.dirname(os.path.abspath(out))
    fd, tmp = tempfile.mkstemp(dir=folder, suffix=".html")
    with os.fdopen(fd, "w", encoding="utf-8") as f:
        f.write(page)
    os.replace(tmp, out)
    print(out)


if __name__ == "__main__":
    main()
