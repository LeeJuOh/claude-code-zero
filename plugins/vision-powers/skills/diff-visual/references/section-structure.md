# Vision Diff — Section Structure

This document defines the 10-section structure for vision-diff HTML reports. The visual-report-writer agent reads this file and renders each section using the HTML pattern snippets below.

All CSS classes (`.ve-card`, `.ve-card--hero`, `.ve-card--elevated`, `.ve-card--recessed`, depth tiers, status indicators) are defined in the shared `design-system/css-patterns.md`.

## Visual Language

| Color | Meaning | CSS Variable |
|-------|---------|-------------|
| Red | Removed / deleted | `var(--danger)` |
| Green | Added / new | `var(--success)` |
| Yellow/Amber | Modified / changed | `var(--warning)` |
| Blue | Context / informational | `var(--info)` |

Use these consistently across all sections — file maps, comparison panels, status indicators, and Mermaid diagram nodes.

---

## Section 1: Executive Summary (Hero)

**Depth tier**: `.ve-card--hero`

The opening section. Provide a concise, high-level narrative of what this diff represents — the core insight in 2-3 sentences, followed by scope summary.

```html
<section id="executive-summary" class="ve-card ve-card--hero" style="--i: 0">
  <h2>Executive Summary</h2>
  <p class="hero-insight">{2-3 sentence insight about the diff's purpose and impact}</p>
  <div class="scope-summary">
    <span class="scope-badge">{scope — e.g., "feature/auth vs main"}</span>
    <span class="scope-badge">{commit count} commits</span>
    <span class="scope-badge">{file count} files changed</span>
  </div>
</section>
```

---

## Section 2: KPI Dashboard

**Depth tier**: `.ve-card--elevated`

Quantitative overview with stat cards and a Chart.js visualization.

**Stat cards** (grid layout):
- Lines added (+) — green
- Lines removed (−) — red
- Files changed — blue
- New modules — green
- Test files changed — blue
- Housekeeping ratio badge (% of changes that are refactoring/cleanup vs feature work)

**Chart**: Doughnut or horizontal bar showing breakdown by change type (feature, refactor, test, docs, config).

```html
<section id="kpi-dashboard" class="ve-card ve-card--elevated" style="--i: 1">
  <h2>KPI Dashboard</h2>
  <div class="kpi-grid">
    <div class="kpi-card kpi-card--success">
      <span class="kpi-value">+{lines_added}</span>
      <span class="kpi-label">Lines Added</span>
    </div>
    <div class="kpi-card kpi-card--danger">
      <span class="kpi-value">-{lines_removed}</span>
      <span class="kpi-label">Lines Removed</span>
    </div>
    <div class="kpi-card kpi-card--info">
      <span class="kpi-value">{files_changed}</span>
      <span class="kpi-label">Files Changed</span>
    </div>
    <!-- additional cards as needed -->
  </div>
  <!-- Housekeeping badges -->
  <div class="kpi-badges">
    <span class="badge badge--{success|danger}">CHANGELOG {Updated|Missing}</span>
    <span class="badge badge--{success|warning|danger}">Docs {OK|Needs Update|Missing}</span>
  </div>
  <div class="chart-container">
    <canvas id="change-breakdown-chart"></canvas>
  </div>
</section>
```

**KPI grid CSS** (add to inline styles):
```css
.kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 1rem; }
.kpi-card { padding: 1.25rem; border-radius: 12px; text-align: center; }
.kpi-value { display: block; font-size: 2rem; font-weight: 700; font-family: var(--font-mono); }
.kpi-label { display: block; font-size: 0.85rem; opacity: 0.7; margin-top: 0.25rem; }
.kpi-card--success { background: color-mix(in srgb, var(--success) 12%, var(--surface-1)); color: var(--success); }
.kpi-card--danger { background: color-mix(in srgb, var(--danger) 12%, var(--surface-1)); color: var(--danger); }
.kpi-card--info { background: color-mix(in srgb, var(--info) 12%, var(--surface-1)); color: var(--info); }
.kpi-card--warning { background: color-mix(in srgb, var(--warning) 12%, var(--surface-1)); color: var(--warning); }
.chart-container { max-width: 400px; margin: 1.5rem auto; }

.kpi-badges { display: flex; gap: 0.5rem; flex-wrap: wrap; margin-top: 1rem; }
.badge { padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 0.75rem; font-weight: 600; }
.badge--success { background: color-mix(in srgb, var(--success) 15%, var(--surface-1)); color: var(--success); }
.badge--warning { background: color-mix(in srgb, var(--warning) 15%, var(--surface-1)); color: var(--warning); }
.badge--danger { background: color-mix(in srgb, var(--danger) 15%, var(--surface-1)); color: var(--danger); }
```

---

## Section 3: Module Architecture

**Depth tier**: `.ve-card` (default)

Mermaid dependency graph showing the modules/files affected by this diff and their relationships.

- Highlight new modules (green fill), modified modules (yellow fill), deleted modules (red fill with dashed border)
- Show import/dependency arrows between affected modules
- Include key unchanged modules that connect to changed ones (grey fill)

```html
<section id="module-architecture" class="ve-card" style="--i: 2">
  <h2>Module Architecture</h2>
  <div class="mermaid-wrap">
    <div class="mermaid-controls">
      <button onclick="zoomIn(this)">+</button>
      <button onclick="zoomOut(this)">-</button>
      <button onclick="zoomReset(this)">Reset</button>
      <button onclick="toggleFullscreen(this)">Fullscreen</button>
    </div>
    <pre class="mermaid">
graph TD
    classDef added fill:#d4edda,stroke:#28a745,stroke-width:2px
    classDef modified fill:#fff3cd,stroke:#ffc107,stroke-width:2px
    classDef removed fill:#f8d7da,stroke:#dc3545,stroke-width:2px,stroke-dasharray:5
    classDef context fill:#e2e8f0,stroke:#94a3b8
    %% nodes and edges based on analysis data
    </pre>
  </div>
</section>
```

Use `classDef` with semi-transparent fills only. Never use `color:` in classDef. See `mermaid-patterns.md` for zoom/fullscreen implementation.

---

## Section 4: Feature Comparisons

**Depth tier**: `.ve-card` (default)

Side-by-side before/after panels for each major feature or behavioral change.

Each comparison shows the previous behavior/implementation on the left and the new behavior/implementation on the right. Include code snippets where they clarify the change.

```html
<section id="feature-comparisons" class="ve-card" style="--i: 3">
  <h2>Feature Comparisons</h2>

  <div class="comparison-pair">
    <h3>{feature name}</h3>
    <div class="comparison-grid">
      <div class="comparison-panel comparison-panel--before">
        <div class="comparison-label">Before</div>
        <p>{description of previous behavior}</p>
        <pre><code>{relevant code snippet — old}</code></pre>
      </div>
      <div class="comparison-panel comparison-panel--after">
        <div class="comparison-label">After</div>
        <p>{description of new behavior}</p>
        <pre><code>{relevant code snippet — new}</code></pre>
      </div>
    </div>
  </div>
  <!-- repeat for each feature -->
</section>
```

**Comparison CSS** (add to inline styles):
```css
.comparison-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
@media (max-width: 768px) { .comparison-grid { grid-template-columns: 1fr; } }
.comparison-panel { padding: 1rem; border-radius: 8px; border: 1px solid var(--border); }
.comparison-panel--before { background: color-mix(in srgb, var(--danger) 5%, var(--surface-1)); border-left: 3px solid var(--danger); }
.comparison-panel--after { background: color-mix(in srgb, var(--success) 5%, var(--surface-1)); border-left: 3px solid var(--success); }
.comparison-label { font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.5rem; }
.comparison-panel--before .comparison-label { color: var(--danger); }
.comparison-panel--after .comparison-label { color: var(--success); }
```

---

## Section 5: Flow Diagrams

**Depth tier**: `.ve-card` (default)

Mermaid sequence or flowchart diagrams showing new or changed lifecycles, pipelines, or data flows introduced by this diff.

Only include this section if the diff introduces or significantly modifies a flow/pipeline. For simple changes (e.g., variable renames, config tweaks), this section may be brief or note "No significant flow changes."

```html
<section id="flow-diagrams" class="ve-card" style="--i: 4">
  <h2>Flow Diagrams</h2>
  <div class="mermaid-wrap">
    <div class="mermaid-controls"><!-- zoom buttons --></div>
    <pre class="mermaid">
sequenceDiagram
    %% or flowchart TD — whichever fits the change
    %% diagram based on analysis data
    </pre>
  </div>
</section>
```

---

## Section 6: File Map

**Depth tier**: `.ve-card` (default)

Color-coded collapsible file tree showing all changed files organized by directory.

Each file shows its change status (added/modified/deleted) and line delta.

```html
<section id="file-map" class="ve-card" style="--i: 5">
  <h2>File Map</h2>
  <div class="file-tree">
    <details open>
      <summary class="dir-name">{directory}/</summary>
      <ul>
        <li class="file-entry file-entry--added">
          <span class="file-status">A</span>
          <span class="file-name">{filename}</span>
          <span class="file-delta file-delta--added">+{lines}</span>
        </li>
        <li class="file-entry file-entry--modified">
          <span class="file-status">M</span>
          <span class="file-name">{filename}</span>
          <span class="file-delta file-delta--modified">+{added} / -{removed}</span>
        </li>
        <li class="file-entry file-entry--deleted">
          <span class="file-status">D</span>
          <span class="file-name">{filename}</span>
          <span class="file-delta file-delta--deleted">-{lines}</span>
        </li>
      </ul>
    </details>
    <!-- repeat for each directory -->
  </div>
</section>
```

**File tree CSS** (add to inline styles):
```css
.file-tree { font-family: var(--font-mono); font-size: 0.875rem; }
.file-tree ul { list-style: none; padding-left: 1.25rem; margin: 0.25rem 0; }
.file-entry { display: flex; align-items: center; gap: 0.5rem; padding: 0.2rem 0; }
.file-status { width: 1.5rem; text-align: center; font-weight: 700; border-radius: 3px; font-size: 0.75rem; }
.file-entry--added .file-status { color: var(--success); }
.file-entry--modified .file-status { color: var(--warning); }
.file-entry--deleted .file-status { color: var(--danger); }
.file-delta { font-size: 0.75rem; opacity: 0.7; margin-left: auto; }
.dir-name { cursor: pointer; font-weight: 600; }
```

---

## Section 7: Test Coverage

**Depth tier**: `.ve-card` (default)

Summary of test changes: new tests, modified tests, and coverage impact.

If the diff includes no test changes, note this explicitly (e.g., "No test files changed in this diff").

```html
<section id="test-coverage" class="ve-card" style="--i: 6">
  <h2>Test Coverage</h2>
  <div class="table-wrapper">
    <table>
      <thead>
        <tr><th>Test File</th><th>Status</th><th>What It Tests</th></tr>
      </thead>
      <tbody>
        <tr>
          <td><code>{test-file-path}</code></td>
          <td><span class="status-dot status-dot--{added|modified}"></span> {Added|Modified}</td>
          <td>{brief description of what the test covers}</td>
        </tr>
      </tbody>
    </table>
  </div>
  <div class="coverage-note">
    <p>{assessment: Are the changes adequately tested? What's missing?}</p>
  </div>
</section>
```

---

## Section 8: Code Review

**Depth tier**: `.ve-card` (default), individual cards use `.ve-card--elevated`

Assessment cards in four categories: Good, Bad, Ugly, Questions.

- **Good**: Well-designed patterns, smart decisions, clean implementations
- **Bad**: Issues, anti-patterns, potential bugs, missed opportunities
- **Ugly**: Technical debt, workarounds, things that work but shouldn't
- **Questions**: Unclear intent, architectural questions, things that need clarification

Each card includes a title, explanation, and source reference (file:line or commit).

```html
<section id="code-review" class="ve-card" style="--i: 7">
  <h2>Code Review</h2>
  <div class="review-grid">

    <div class="review-category">
      <h3 class="review-category-title review-category-title--good">Good</h3>
      <div class="ve-card ve-card--elevated review-card">
        <h4>{title}</h4>
        <p>{explanation}</p>
        <code class="review-source">{file:line or commit}</code>
      </div>
      <!-- more cards -->
    </div>

    <div class="review-category">
      <h3 class="review-category-title review-category-title--bad">Bad</h3>
      <!-- cards -->
    </div>

    <div class="review-category">
      <h3 class="review-category-title review-category-title--ugly">Ugly</h3>
      <!-- cards -->
    </div>

    <div class="review-category">
      <h3 class="review-category-title review-category-title--questions">Questions</h3>
      <!-- cards -->
    </div>

  </div>
</section>
```

**Review CSS** (add to inline styles):
```css
.review-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.5rem; }
.review-category-title { font-size: 1rem; margin-bottom: 0.75rem; padding-bottom: 0.5rem; border-bottom: 2px solid; }
.review-category-title--good { border-color: var(--success); color: var(--success); }
.review-category-title--bad { border-color: var(--danger); color: var(--danger); }
.review-category-title--ugly { border-color: var(--warning); color: var(--warning); }
.review-category-title--questions { border-color: var(--info); color: var(--info); }
.review-card { margin-bottom: 0.75rem; }
.review-card h4 { margin: 0 0 0.5rem 0; font-size: 0.95rem; }
.review-source { display: block; font-size: 0.75rem; opacity: 0.6; margin-top: 0.5rem; }
```

---

## Section 9: Decision Log

**Depth tier**: `.ve-card` (default)

Confidence-rated cards documenting architectural and design decisions evident from the diff.

Each decision card shows:
- Decision title
- Rationale (extracted from commit messages, comments, or code patterns)
- Confidence level: **Confirmed** (green — explicitly documented), **Inferred** (blue — reasonable inference from code), **Uncertain** (amber — speculative)

```html
<section id="decision-log" class="ve-card" style="--i: 8">
  <h2>Decision Log</h2>
  <div class="decision-list">

    <div class="decision-card decision-card--confirmed">
      <div class="decision-confidence">Confirmed</div>
      <h4>{decision title}</h4>
      <p>{rationale and evidence}</p>
      <code class="decision-source">{source — commit message, comment, or code reference}</code>
    </div>

    <div class="decision-card decision-card--inferred">
      <div class="decision-confidence">Inferred</div>
      <h4>{decision title}</h4>
      <p>{rationale}</p>
    </div>

    <div class="decision-card decision-card--uncertain">
      <div class="decision-confidence">Uncertain</div>
      <h4>{decision title}</h4>
      <p>{observation and why it's unclear}</p>
    </div>

  </div>
</section>
```

**Decision CSS** (add to inline styles):
```css
.decision-list { display: flex; flex-direction: column; gap: 1rem; }
.decision-card { padding: 1rem 1.25rem; border-radius: 8px; border-left: 4px solid; background: var(--surface-1); }
.decision-card--confirmed { border-color: var(--success); }
.decision-card--inferred { border-color: var(--info); }
.decision-card--uncertain { border-color: var(--warning); }
.decision-confidence { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 0.4rem; }
.decision-card--confirmed .decision-confidence { color: var(--success); }
.decision-card--inferred .decision-confidence { color: var(--info); }
.decision-card--uncertain .decision-confidence { color: var(--warning); }
.decision-source { display: block; font-size: 0.75rem; opacity: 0.6; margin-top: 0.5rem; }
```

---

## Section 10: Re-entry Context

**Depth tier**: `.ve-card--recessed`

Collapsible section with information needed to understand and continue work on this codebase. Useful for onboarding or when returning after time away.

- **Invariants**: Rules or constraints that must be maintained
- **Coupling points**: Files/modules that are tightly coupled and must change together
- **Gotchas**: Non-obvious behaviors, edge cases, or traps in the changed code

```html
<section id="reentry-context" class="ve-card ve-card--recessed" style="--i: 9">
  <h2>Re-entry Context</h2>
  <details>
    <summary>Invariants</summary>
    <ul>
      <li>{invariant description}</li>
    </ul>
  </details>
  <details>
    <summary>Coupling Points</summary>
    <ul>
      <li><code>{file-a}</code> ↔ <code>{file-b}</code> — {why they're coupled}</li>
    </ul>
  </details>
  <details>
    <summary>Gotchas</summary>
    <ul>
      <li>{non-obvious behavior or edge case}</li>
    </ul>
  </details>
</section>
```
