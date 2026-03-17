# Vision Plan — Section Structure

This document defines the 9-section structure for vision-plan HTML reports. The visual-report-writer agent reads this file and renders each section using the HTML pattern snippets below.

All CSS classes (`.ve-card`, `.ve-card--hero`, `.ve-card--elevated`, `.ve-card--recessed`, depth tiers, status indicators) are defined in the shared `design-system/css-patterns.md`.

## Visual Language

| Color | Meaning | CSS Variable |
|-------|---------|-------------|
| Blue | Current state / existing | `var(--info)` |
| Green | Planned / proposed | `var(--success)` |
| Purple | Planned (alternative accent) | `var(--accent-b)` |
| Amber | Concern / needs attention | `var(--warning)` |
| Red | Gap / missing / risk | `var(--danger)` |

Use these consistently across all sections — architecture diagrams, status indicators, coverage badges, and Mermaid nodes.

## Zoom Levels

Reports follow a three-level information hierarchy. Depth tiers map to zoom levels:

| Level | Scan Time | Purpose |
|-------|-----------|---------|
| **L1 — Glance** | 30 seconds | Core insight + scope metrics — enough to decide if deeper reading is needed |
| **L2 — Structure** | 2 minutes | Architecture impact, risk landscape, and key findings |
| **L3 — Detail** | As needed | Per-file breakdowns, edge cases, rationale gaps — reference material |

Section mapping:
- **L1**: Section 1 (Plan Summary), Section 2 (Impact Dashboard)
- **L2**: Sections 3-4 (Architecture), Section 6 (Dependencies), Section 7 (Risk)
- **L3**: Section 5 (Change Breakdown), Section 8 (Plan Review), Section 9 (Understanding Gaps)

---

## Section 1: Plan Summary (Hero)

**Depth tier**: `.ve-card--hero`

The opening section. Provide a concise narrative of what the plan proposes — the core goal in 2-3 sentences, followed by scope and phase summary.

```html
<section id="plan-summary" class="ve-card ve-card--hero" style="--i: 0">
  <h2>Plan Summary</h2>
  <p class="hero-insight">{2-3 sentence summary of the plan's goal and approach}</p>
  <div class="scope-summary">
    <span class="scope-badge">{phase count} phases</span>
    <span class="scope-badge">{files to modify} files modified</span>
    <span class="scope-badge">{files to create} new files</span>
    <span class="scope-badge scope-badge--{risk-level}">{overall risk level}</span>
  </div>
</section>
```

---

## Section 2: Impact Dashboard

**Depth tier**: `.ve-card--elevated`

Quantitative overview of the plan's scope with stat cards and a Chart.js visualization.

**Stat cards** (grid layout):
- Files to modify — blue
- Files to create — green
- Files to delete — red
- Estimated lines of change — blue
- Completeness indicator (% of blast radius addressed by the plan) — green/amber/red

**Chart**: Doughnut showing breakdown by change category (feature, refactor, infrastructure, test, docs).

```html
<section id="impact-dashboard" class="ve-card ve-card--elevated" style="--i: 1">
  <h2>Impact Dashboard</h2>
  <div class="kpi-grid">
    <div class="kpi-card kpi-card--info">
      <span class="kpi-value">{files_to_modify}</span>
      <span class="kpi-label">Files to Modify</span>
    </div>
    <div class="kpi-card kpi-card--success">
      <span class="kpi-value">{files_to_create}</span>
      <span class="kpi-label">New Files</span>
    </div>
    <div class="kpi-card kpi-card--danger">
      <span class="kpi-value">{files_to_delete}</span>
      <span class="kpi-label">Files to Delete</span>
    </div>
    <div class="kpi-card kpi-card--completeness">
      <span class="kpi-value">{completeness}%</span>
      <span class="kpi-label">Blast Radius Coverage</span>
    </div>
  </div>
  <div class="chart-container">
    <canvas id="impact-chart"></canvas>
  </div>
</section>
```

**KPI CSS**: Same as vision-diff KPI grid (see `design-system/css-patterns.md`).

---

## Section 3: Current Architecture

**Depth tier**: `.ve-card` (default)

Mermaid diagram showing the **current** architecture of the subsystem(s) the plan will change.

- Show only modules/files relevant to the planned changes (not the entire codebase)
- Use blue fills for current components
- Label important relationships (imports, data flow, inheritance)

```html
<section id="current-architecture" class="ve-card" style="--i: 2">
  <h2>Current Architecture</h2>
  <div class="mermaid-wrap">
    <div class="mermaid-controls">
      <button onclick="zoomIn(this)">+</button>
      <button onclick="zoomOut(this)">-</button>
      <button onclick="zoomReset(this)">Reset</button>
      <button onclick="toggleFullscreen(this)">Fullscreen</button>
    </div>
    <pre class="mermaid">
graph TD
    classDef current fill:#dbeafe,stroke:#3b82f6,stroke-width:2px
    classDef untouched fill:#e2e8f0,stroke:#94a3b8
    %% nodes and edges based on analysis data
    </pre>
  </div>
</section>
```

---

## Section 4: Planned Architecture

**Depth tier**: `.ve-card` (default)

Mermaid diagram showing the **planned** architecture after the changes.

- Use the **same node IDs** as Section 3 where possible — this allows readers to visually diff the two diagrams
- Green fills for new components, purple fills for significantly modified components
- Dashed borders for components to be removed
- Label new relationships

```html
<section id="planned-architecture" class="ve-card" style="--i: 3">
  <h2>Planned Architecture</h2>
  <div class="mermaid-wrap">
    <div class="mermaid-controls"><!-- zoom buttons --></div>
    <pre class="mermaid">
graph TD
    classDef planned fill:#d1fae5,stroke:#10b981,stroke-width:2px
    classDef modified fill:#ede9fe,stroke:#8b5cf6,stroke-width:2px
    classDef removed fill:#fee2e2,stroke:#ef4444,stroke-width:2px,stroke-dasharray:5
    classDef unchanged fill:#e2e8f0,stroke:#94a3b8
    %% same node IDs as current architecture where applicable
    </pre>
  </div>
</section>
```

---

## Section 5: Change-by-Change Breakdown

**Depth tier**: `.ve-card` (default)

Side-by-side panels for each planned change: current state on the left, planned state on the right, with rationale below.

Group changes by phase if the plan defines phases.

```html
<section id="change-breakdown" class="ve-card" style="--i: 4">
  <h2>Change-by-Change Breakdown</h2>

  <!-- If plan has phases, wrap in phase groups -->
  <div class="phase-group">
    <h3>Phase {n}: {phase title}</h3>

    <div class="change-item">
      <h4><code>{file-path}</code> <span class="change-type change-type--{create|modify|delete}">{Create|Modify|Delete}</span></h4>
      <div class="comparison-grid">
        <div class="comparison-panel comparison-panel--current">
          <div class="comparison-label">Current</div>
          <p>{description of current state or "Does not exist"}</p>
        </div>
        <div class="comparison-panel comparison-panel--planned">
          <div class="comparison-label">Planned</div>
          <p>{description of planned state}</p>
        </div>
      </div>
      <div class="change-rationale">
        <strong>Rationale:</strong> {why this change is needed}
      </div>
    </div>
    <!-- more changes -->
  </div>
</section>
```

**Change-specific CSS** (add to inline styles):
```css
.comparison-panel--current { background: color-mix(in srgb, var(--info) 5%, var(--surface-1)); border-left: 3px solid var(--info); }
.comparison-panel--planned { background: color-mix(in srgb, var(--success) 5%, var(--surface-1)); border-left: 3px solid var(--success); }
.comparison-panel--current .comparison-label { color: var(--info); }
.comparison-panel--planned .comparison-label { color: var(--success); }
.change-type { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; padding: 0.15rem 0.5rem; border-radius: 4px; }
.change-type--create { background: color-mix(in srgb, var(--success) 15%, transparent); color: var(--success); }
.change-type--modify { background: color-mix(in srgb, var(--info) 15%, transparent); color: var(--info); }
.change-type--delete { background: color-mix(in srgb, var(--danger) 15%, transparent); color: var(--danger); }
.change-rationale { margin-top: 0.75rem; padding: 0.75rem; background: var(--surface-2); border-radius: 6px; font-size: 0.9rem; }
.phase-group { margin-bottom: 2rem; }
```

---

## Section 6: Dependency & Ripple Analysis

**Depth tier**: `.ve-card` (default)

Collapsible analysis of blast radius — files affected by the plan that may or may not be addressed.

Color-coded coverage status:
- **Covered** (green): Plan explicitly addresses this dependency
- **Likely missed** (amber): Affected file not mentioned in the plan
- **Gap** (red): Required coordinated change that plan omits

```html
<section id="dependency-analysis" class="ve-card" style="--i: 5">
  <h2>Dependency & Ripple Analysis</h2>

  <div class="ripple-summary">
    <span class="ripple-badge ripple-badge--covered">{n} covered</span>
    <span class="ripple-badge ripple-badge--missed">{n} likely missed</span>
    <span class="ripple-badge ripple-badge--gap">{n} gaps</span>
  </div>

  <details open>
    <summary>Covered Dependencies</summary>
    <ul class="ripple-list">
      <li class="ripple-item ripple-item--covered">
        <code>{file-path}</code> — {why it's affected and how the plan addresses it}
      </li>
    </ul>
  </details>

  <details open>
    <summary>Likely Missed</summary>
    <ul class="ripple-list">
      <li class="ripple-item ripple-item--missed">
        <code>{file-path}</code> — {why it's affected and what might need to change}
      </li>
    </ul>
  </details>

  <details open>
    <summary>Gaps</summary>
    <ul class="ripple-list">
      <li class="ripple-item ripple-item--gap">
        <code>{file-path}</code> — {what coordinated change is required}
      </li>
    </ul>
  </details>
</section>
```

**Ripple CSS** (add to inline styles):
```css
.ripple-summary { display: flex; gap: 0.75rem; margin-bottom: 1rem; flex-wrap: wrap; }
.ripple-badge { padding: 0.3rem 0.75rem; border-radius: 20px; font-size: 0.8rem; font-weight: 600; }
.ripple-badge--covered { background: color-mix(in srgb, var(--success) 15%, var(--surface-1)); color: var(--success); }
.ripple-badge--missed { background: color-mix(in srgb, var(--warning) 15%, var(--surface-1)); color: var(--warning); }
.ripple-badge--gap { background: color-mix(in srgb, var(--danger) 15%, var(--surface-1)); color: var(--danger); }
.ripple-list { list-style: none; padding: 0; }
.ripple-item { padding: 0.5rem 0.75rem; margin: 0.25rem 0; border-left: 3px solid; border-radius: 0 6px 6px 0; }
.ripple-item--covered { border-color: var(--success); background: color-mix(in srgb, var(--success) 3%, transparent); }
.ripple-item--missed { border-color: var(--warning); background: color-mix(in srgb, var(--warning) 3%, transparent); }
.ripple-item--gap { border-color: var(--danger); background: color-mix(in srgb, var(--danger) 3%, transparent); }
```

---

## Section 7: Risk Assessment

**Depth tier**: `.ve-card` (default)

Structured risk analysis covering multiple dimensions.

| Risk Dimension | What to Assess |
|---------------|---------------|
| Edge cases | Unhandled scenarios, boundary conditions |
| Assumptions | What the plan assumes but doesn't verify |
| Ordering | Phase ordering risks, intermediate breakage |
| Rollback | Can changes be reverted cleanly? |
| Cognitive complexity | How hard are the changes to understand and maintain? |

```html
<section id="risk-assessment" class="ve-card" style="--i: 6">
  <h2>Risk Assessment</h2>
  <div class="risk-grid">

    <div class="risk-card risk-card--{low|medium|high}">
      <div class="risk-header">
        <span class="risk-dimension">{dimension — e.g., Edge Cases}</span>
        <span class="risk-level risk-level--{low|medium|high}">{Low|Medium|High}</span>
      </div>
      <p>{assessment details}</p>
      <ul class="risk-items">
        <li>{specific risk item}</li>
      </ul>
    </div>
    <!-- more risk cards -->

  </div>
</section>
```

**Risk CSS** (add to inline styles):
```css
.risk-grid { display: flex; flex-direction: column; gap: 1rem; }
.risk-card { padding: 1rem 1.25rem; border-radius: 8px; border-left: 4px solid; background: var(--surface-1); }
.risk-card--low { border-color: var(--success); }
.risk-card--medium { border-color: var(--warning); }
.risk-card--high { border-color: var(--danger); }
.risk-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; }
.risk-dimension { font-weight: 600; }
.risk-level { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; padding: 0.15rem 0.5rem; border-radius: 4px; }
.risk-level--low { background: color-mix(in srgb, var(--success) 15%, transparent); color: var(--success); }
.risk-level--medium { background: color-mix(in srgb, var(--warning) 15%, transparent); color: var(--warning); }
.risk-level--high { background: color-mix(in srgb, var(--danger) 15%, transparent); color: var(--danger); }
.risk-items { margin: 0.5rem 0 0 1.25rem; font-size: 0.9rem; }
```

---

## Section 8: Plan Review

**Depth tier**: `.ve-card` (default), individual cards use `.ve-card--elevated`

Assessment cards in four categories: Good, Bad, Ugly, Questions.

- **Good**: Strengths of the plan — thorough coverage, smart decisions, good patterns
- **Bad**: Weaknesses — missing considerations, risky choices, incomplete analysis
- **Ugly**: Things that technically work but indicate deeper issues or tech debt
- **Questions**: Ambiguities, unclear rationale, things needing clarification

```html
<section id="plan-review" class="ve-card" style="--i: 7">
  <h2>Plan Review</h2>
  <div class="review-grid">

    <div class="review-category">
      <h3 class="review-category-title review-category-title--good">Good</h3>
      <div class="ve-card ve-card--elevated review-card">
        <h4>{title}</h4>
        <p>{explanation}</p>
      </div>
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

**Review CSS**: Same as vision-diff code review CSS.

---

## Section 9: Understanding Gaps

**Depth tier**: `.ve-card--recessed`

Dashboard of rationale gaps and cognitive complexity concerns.

**Rationale gaps**: Places where the plan makes a choice but doesn't explain why, or where the reasoning doesn't hold up against the codebase.

**Cognitive complexity**: Changes that are disproportionately hard to understand or review, potentially introducing maintenance burden.

```html
<section id="understanding-gaps" class="ve-card ve-card--recessed" style="--i: 8">
  <h2>Understanding Gaps</h2>

  <h3>Rationale Gaps</h3>
  <div class="gap-list">
    <div class="gap-card">
      <h4>{what's missing}</h4>
      <p>{why this gap matters — what could go wrong without this rationale}</p>
      <code class="gap-reference">{plan reference — section or step number}</code>
    </div>
  </div>

  <h3>Cognitive Complexity</h3>
  <div class="table-wrapper">
    <table>
      <thead>
        <tr><th>Change</th><th>Complexity</th><th>Concern</th></tr>
      </thead>
      <tbody>
        <tr>
          <td><code>{file or change description}</code></td>
          <td><span class="complexity-badge complexity-badge--{low|medium|high}">{Low|Medium|High}</span></td>
          <td>{why this is complex — many dependencies, subtle logic, etc.}</td>
        </tr>
      </tbody>
    </table>
  </div>
</section>
```

**Gap CSS** (add to inline styles):
```css
.gap-list { display: flex; flex-direction: column; gap: 0.75rem; margin-bottom: 1.5rem; }
.gap-card { padding: 1rem; border-radius: 8px; background: color-mix(in srgb, var(--warning) 5%, var(--surface-1)); border-left: 3px solid var(--warning); }
.gap-card h4 { margin: 0 0 0.4rem 0; font-size: 0.95rem; }
.gap-reference { display: block; font-size: 0.75rem; opacity: 0.6; margin-top: 0.5rem; }
.complexity-badge { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; padding: 0.15rem 0.5rem; border-radius: 4px; }
.complexity-badge--low { background: color-mix(in srgb, var(--success) 15%, transparent); color: var(--success); }
.complexity-badge--medium { background: color-mix(in srgb, var(--warning) 15%, transparent); color: var(--warning); }
.complexity-badge--high { background: color-mix(in srgb, var(--danger) 15%, transparent); color: var(--danger); }
```
