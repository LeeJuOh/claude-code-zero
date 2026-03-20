# Project Recap — Section Structure

This document defines the 8-section structure for project-recap HTML reports. The orchestrator reads this file and passes its content to the visual-report-writer agent, which renders each section using the HTML pattern snippets below.

All CSS classes (`.ve-card`, `.ve-card--hero`, `.ve-card--elevated`, `.ve-card--recessed`, depth tiers, status indicators) are defined in the shared `design-system/css-patterns.md`.

## Visual Language

| Color | Meaning | CSS Variable |
|-------|---------|-------------|
| Green | Working / stable / shipped | `var(--success)` |
| Blue | In progress / informational | `var(--info)` |
| Amber | Cognitive debt / needs attention | `var(--warning)` |
| Red | Broken / blocked / high severity | `var(--danger)` |

Use these consistently across all sections — status cards, architecture nodes, severity indicators, and Mermaid diagram elements.

## Zoom Levels

Reports follow a three-level information hierarchy. Depth tiers map to zoom levels:

| Level | Scan Time | Purpose |
|-------|-----------|---------|
| **L1 — Glance** | 30 seconds | What is this project + is it healthy? Enough to re-orient after time away |
| **L2 — Structure** | 2 minutes | Architecture, recent themes, key decisions — rebuild the mental model |
| **L3 — Detail** | As needed | Debt hotspots, next steps, supporting data — reference material |

Section mapping:
- **L1**: Section 1 (Project Identity), Section 5 (State of Things)
- **L2**: Section 2 (Architecture), Section 3 (Activity), Section 4 (Decisions)
- **L3**: Section 6 (Mental Model), Section 7 (Cognitive Debt), Section 8 (Next Steps)

---

## Section 1: Project Identity (Hero)

**Depth tier**: `.ve-card--hero`

The opening section. A current-state summary: what this project does, what stage it's at, and a scope overview. Not the README blurb — a living snapshot.

```html
<section id="project-identity" class="ve-card ve-card--hero" style="--i: 0">
  <h2>Project Identity</h2>
  <p class="hero-insight">{elevator pitch — one sentence for someone who forgot what they were building}</p>
  <div class="scope-summary">
    <span class="scope-badge">{version}</span>
    <span class="scope-badge">{project stage — e.g., "Active Development"}</span>
    <span class="scope-badge">{time window — e.g., "Last 2 weeks"}</span>
  </div>
  <div class="identity-details">
    <div class="identity-item">
      <span class="identity-label">Key Dependencies</span>
      <span class="identity-value">{top 3-5 dependencies}</span>
    </div>
    <div class="identity-item">
      <span class="identity-label">Primary Language</span>
      <span class="identity-value">{language}</span>
    </div>
    <div class="identity-item">
      <span class="identity-label">Contributors</span>
      <span class="identity-value">{contributor count in window}</span>
    </div>
  </div>
</section>
```

**Identity CSS** (add to inline styles):
```css
.identity-details { display: flex; flex-wrap: wrap; gap: 1.5rem; margin-top: 1.25rem; padding-top: 1.25rem; border-top: 1px solid var(--border); }
.identity-item { display: flex; flex-direction: column; gap: 0.25rem; }
.identity-label { font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; opacity: 0.6; }
.identity-value { font-size: 0.95rem; }
```

---

## Section 2: Architecture Snapshot (Elevated)

**Depth tier**: `.ve-card--elevated`

Mermaid system diagram of the project as it exists today. This is the visual anchor — use elevated container with accent-tinted background.

Focus on conceptual modules and their relationships, not every file. Label nodes with what they do, not just file names.

```html
<section id="architecture-snapshot" class="ve-card ve-card--elevated" style="--i: 1">
  <h2>Architecture Snapshot</h2>
  <div class="mermaid-wrap">
    <div class="mermaid-controls">
      <button onclick="zoomIn(this)">+</button>
      <button onclick="zoomOut(this)">-</button>
      <button onclick="zoomReset(this)">Reset</button>
      <button onclick="toggleFullscreen(this)">Fullscreen</button>
    </div>
    <pre class="mermaid">
graph TD
    classDef core fill:#e8f4fd,stroke:#3b82f6,stroke-width:2px
    classDef active fill:#d4edda,stroke:#28a745,stroke-width:2px
    classDef debt fill:#fff3cd,stroke:#ffc107,stroke-width:2px
    %% nodes and edges based on architecture analysis
    </pre>
  </div>
</section>
```

Use `classDef` with semi-transparent fills only. Never use `color:` in classDef. See `mermaid-patterns.md` for zoom/fullscreen implementation.

---

## Section 3: Recent Activity (Default)

**Depth tier**: `.ve-card` (default)

Human-readable narrative grouped by theme — not raw git log. Each theme gets a summary and timeline.

Group commits into themes: feature work, bug fixes, refactors, infrastructure. For each theme, provide a one-sentence summary of what happened and why it mattered.

```html
<section id="recent-activity" class="ve-card" style="--i: 2">
  <h2>Recent Activity</h2>

  <div class="activity-theme">
    <h3 class="activity-theme-title">
      <span class="activity-icon activity-icon--feature"></span>
      {theme name — e.g., "Feature Work"}
    </h3>
    <p class="activity-summary">{one-sentence summary of this theme}</p>
    <ul class="activity-timeline">
      <li class="activity-entry">
        <code class="activity-hash">{short hash}</code>
        <span class="activity-message">{commit message}</span>
        <time class="activity-date">{relative date}</time>
      </li>
      <!-- more entries -->
    </ul>
  </div>
  <!-- repeat for each theme -->
</section>
```

**Activity CSS** (add to inline styles):
```css
.activity-theme { margin-bottom: 1.5rem; }
.activity-theme-title { display: flex; align-items: center; gap: 0.5rem; font-size: 1.1rem; margin-bottom: 0.5rem; }
.activity-icon { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
.activity-icon--feature { background: var(--success); }
.activity-icon--bugfix { background: var(--danger); }
.activity-icon--refactor { background: var(--info); }
.activity-icon--infra { background: var(--warning); }
.activity-summary { font-style: italic; opacity: 0.8; margin-bottom: 0.75rem; }
.activity-timeline { list-style: none; padding: 0; display: flex; flex-direction: column; gap: 0.4rem; }
.activity-entry { display: grid; grid-template-columns: auto 1fr auto; gap: 0.75rem; align-items: baseline; font-size: 0.875rem; }
.activity-hash { font-family: var(--font-mono); font-size: 0.8rem; opacity: 0.6; }
.activity-date { font-size: 0.75rem; opacity: 0.5; white-space: nowrap; }
```

---

## Section 4: Decision Log (Default)

**Depth tier**: `.ve-card` (default)

Confidence-rated cards documenting design decisions from the time window.

Each decision card shows:
- Decision title
- Rationale (extracted from commit messages, plan docs, code patterns)
- Confidence level: **Confirmed** (green — explicitly documented), **Inferred** (blue — reasonable inference from code), **Uncertain** (amber — speculative)

```html
<section id="decision-log" class="ve-card" style="--i: 3">
  <h2>Decision Log</h2>
  <div class="decision-list">

    <div class="decision-card decision-card--confirmed">
      <div class="decision-confidence">Confirmed</div>
      <h4>{decision title}</h4>
      <p>{rationale and evidence}</p>
      <code class="decision-source">{source — commit message, plan doc, or code reference}</code>
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

**Decision CSS** (reuse from diff-visual section 9):
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

## Section 5: State of Things (Elevated)

**Depth tier**: `.ve-card--elevated`

KPI dashboard showing the current health of the project. Large hero numbers with color-coded status indicators.

```html
<section id="state-of-things" class="ve-card ve-card--elevated" style="--i: 4">
  <h2>State of Things</h2>
  <div class="kpi-grid">
    <div class="kpi-card kpi-card--success">
      <span class="kpi-value">{count}</span>
      <span class="kpi-label">Working</span>
    </div>
    <div class="kpi-card kpi-card--info">
      <span class="kpi-value">{count}</span>
      <span class="kpi-label">In Progress</span>
    </div>
    <div class="kpi-card kpi-card--danger">
      <span class="kpi-value">{count}</span>
      <span class="kpi-label">Broken</span>
    </div>
    <div class="kpi-card kpi-card--warning">
      <span class="kpi-value">{count}</span>
      <span class="kpi-label">Blocked</span>
    </div>
  </div>
  <div class="chart-container">
    <canvas id="state-chart"></canvas>
  </div>
  <div class="state-details">
    <details>
      <summary>Working — stable, shipped, tested</summary>
      <ul>
        <li>{item description}</li>
      </ul>
    </details>
    <details>
      <summary>In Progress — uncommitted work, open branches, active TODOs</summary>
      <ul>
        <li>{item description}</li>
      </ul>
    </details>
    <details>
      <summary>Broken — known bugs, failing tests, tech debt</summary>
      <ul>
        <li>{item description}</li>
      </ul>
    </details>
    <details>
      <summary>Blocked — waiting on input, dependencies, decisions</summary>
      <ul>
        <li>{item description}</li>
      </ul>
    </details>
  </div>
</section>
```

**KPI grid CSS** (reuse from diff-visual section 2):
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
```

---

## Section 6: Mental Model Essentials (Default)

**Depth tier**: `.ve-card` (default)

The 5-10 things you need to hold in your head to work on this project effectively. Each item is a card with a category badge.

```html
<section id="mental-model" class="ve-card" style="--i: 5">
  <h2>Mental Model Essentials</h2>
  <div class="mental-model-grid">

    <div class="mental-model-card">
      <span class="mental-model-badge mental-model-badge--invariant">Invariant</span>
      <h4>{title}</h4>
      <p>{what must always be true and why}</p>
    </div>

    <div class="mental-model-card">
      <span class="mental-model-badge mental-model-badge--coupling">Coupling</span>
      <h4>{title}</h4>
      <p>{things connected in non-obvious ways}</p>
    </div>

    <div class="mental-model-card">
      <span class="mental-model-badge mental-model-badge--gotcha">Gotcha</span>
      <h4>{title}</h4>
      <p>{common mistake or easy-to-forget requirement}</p>
    </div>

    <div class="mental-model-card">
      <span class="mental-model-badge mental-model-badge--convention">Convention</span>
      <h4>{title}</h4>
      <p>{naming convention or pattern the codebase follows}</p>
    </div>

  </div>
</section>
```

**Mental model CSS** (add to inline styles):
```css
.mental-model-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1rem; }
.mental-model-card { padding: 1rem 1.25rem; border-radius: 8px; background: var(--surface-1); border: 1px solid var(--border); }
.mental-model-card h4 { margin: 0.5rem 0 0.4rem 0; font-size: 0.95rem; }
.mental-model-badge { font-size: 0.65rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; padding: 0.15rem 0.5rem; border-radius: 4px; }
.mental-model-badge--invariant { background: color-mix(in srgb, var(--info) 15%, transparent); color: var(--info); }
.mental-model-badge--coupling { background: color-mix(in srgb, var(--warning) 15%, transparent); color: var(--warning); }
.mental-model-badge--gotcha { background: color-mix(in srgb, var(--danger) 15%, transparent); color: var(--danger); }
.mental-model-badge--convention { background: color-mix(in srgb, var(--success) 15%, transparent); color: var(--success); }
```

---

## Section 7: Cognitive Debt Hotspots (Default)

**Depth tier**: `.ve-card` (default)

Areas where understanding is weakest. Each hotspot card has a colored left border indicating severity.

Hotspot categories:
- Code changed recently but with no documented rationale
- Complex modules with no tests
- Areas with overlapping changes from multiple authors
- Files frequently modified but poorly understood

```html
<section id="cognitive-debt" class="ve-card" style="--i: 6">
  <h2>Cognitive Debt Hotspots</h2>
  <div class="debt-list">

    <div class="debt-card debt-card--high">
      <div class="debt-severity">High</div>
      <h4>{hotspot title}</h4>
      <p>{description of the understanding gap}</p>
      <p class="debt-suggestion">{concrete suggestion to reduce this debt}</p>
      <code class="debt-source">{file:line or module reference}</code>
    </div>

    <div class="debt-card debt-card--medium">
      <div class="debt-severity">Medium</div>
      <h4>{hotspot title}</h4>
      <p>{description}</p>
      <p class="debt-suggestion">{suggestion}</p>
    </div>

    <div class="debt-card debt-card--low">
      <div class="debt-severity">Low</div>
      <h4>{hotspot title}</h4>
      <p>{description}</p>
      <p class="debt-suggestion">{suggestion}</p>
    </div>

  </div>
</section>
```

**Debt CSS** (add to inline styles):
```css
.debt-list { display: flex; flex-direction: column; gap: 1rem; }
.debt-card { padding: 1rem 1.25rem; border-radius: 8px; border-left: 4px solid; background: var(--surface-1); }
.debt-card--high { border-color: var(--danger); }
.debt-card--medium { border-color: var(--warning); }
.debt-card--low { border-color: var(--info); }
.debt-severity { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 0.4rem; }
.debt-card--high .debt-severity { color: var(--danger); }
.debt-card--medium .debt-severity { color: var(--warning); }
.debt-card--low .debt-severity { color: var(--info); }
.debt-suggestion { font-style: italic; opacity: 0.85; margin-top: 0.5rem; }
.debt-source { display: block; font-size: 0.75rem; opacity: 0.6; margin-top: 0.5rem; }
```

---

## Section 8: Next Steps (Recessed)

**Depth tier**: `.ve-card--recessed`

Inferred next steps from recent activity, open TODOs, and project trajectory. Not prescriptive — shows where momentum was pointing. Collapsible for a clean default view.

```html
<section id="next-steps" class="ve-card ve-card--recessed" style="--i: 7">
  <h2>Next Steps</h2>
  <p class="next-steps-intro">{one-sentence summary of project trajectory}</p>
  <details open>
    <summary>Inferred from recent activity</summary>
    <ul>
      <li>{next step with rationale}</li>
    </ul>
  </details>
  <details>
    <summary>Open TODOs and FIXMEs</summary>
    <ul>
      <li><code>{file:line}</code> — {TODO content}</li>
    </ul>
  </details>
  <details>
    <summary>Unmerged branches</summary>
    <ul>
      <li><code>{branch-name}</code> — {inferred purpose}</li>
    </ul>
  </details>
</section>
```
