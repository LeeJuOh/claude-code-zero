# Vision Diff — Section Structure

7-section structure for diff-visual HTML reports. The orchestrator reads this file and passes its content to the visual-report-writer agent.

## Section Mapping

**New 7-section order**: SECTION_1 Overview · SECTION_2 File Map · SECTION_3 Architecture Impact · SECTION_4 Change Classification · SECTION_5 Dependency Shift · SECTION_6 New Components · SECTION_7 Hot Spots

| Section | Diagram type | Depth |
|---|---|---|
| 1 Overview | stat cards (text) | L1 |
| 2 File Map | Mermaid tree/nested | L2 |
| 3 Architecture Impact | Mermaid architecture flowchart | L2 |
| 4 Change Classification | Chart.js horizontal bar (pyramid style) | L2 |
| 5 Dependency Shift | Mermaid side-by-side subgraph | L2 |
| 6 New Components | Mermaid architecture | L3 |
| 7 Hot Spots | Mermaid quadrantChart | L3 |

---

## Section 1: Overview

Stat cards + 2-3 sentence narrative. No diagram — data density comes from cards.

```html
<section id="overview" class="ve-card ve-card--hero" style="--i: 0">
  <h2>Overview</h2>
  <p class="hero-insight">{2-3 sentence summary of what this diff represents}</p>
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
    <div class="kpi-card kpi-card--info">
      <span class="kpi-value">{commits}</span>
      <span class="kpi-label">Commits</span>
    </div>
  </div>
</section>
```

---

## Section 2: File Map

Mermaid tree/nested diagram of changed files grouped by directory. Color-code by status (added/modified/deleted) using semantic tokens.

```html
<section id="file-map" class="ve-card" style="--i: 1">
  <h2>File Map</h2>
  <div class="mermaid-wrap">
    <div class="mermaid-controls">
      <button onclick="zoomDiagram(this,1.3)">+</button>
      <button onclick="zoomDiagram(this,1/1.3)">−</button>
      <button onclick="resetZoom(this)">↻</button>
      <button onclick="toggleFullscreen(this)">⛶</button>
    </div>
    <pre class="mermaid">
%%{init: {'theme': 'base', 'themeVariables': {'primaryColor': '{accent}', 'primaryBorderColor': '{ink}', 'lineColor': '{muted}', 'primaryTextColor': '{ink}', 'secondaryColor': '{paper-2}', 'fontFamily': 'Geist, sans-serif'}}}%%
flowchart TD
  %% tree of changed files — added nodes use classDef added, modified classDef modified, deleted classDef deleted
  classDef added fill:{accent-tint},stroke:{accent}
  classDef modified fill:{paper-2},stroke:{muted}
  classDef deleted fill:{paper-2},stroke:{muted},stroke-dasharray:4
    </pre>
  </div>
</section>
```

---

## Section 3: Architecture Impact

Mermaid architecture diagram showing module-level impact. Highlight new (accent), modified (muted border), deleted (dashed muted).

```html
<section id="architecture-impact" class="ve-card" style="--i: 2">
  <h2>Architecture Impact</h2>
  <p>{1-2 paragraph narrative of architecture changes}</p>
  <div class="mermaid-wrap">
    <div class="mermaid-controls">
      <button onclick="zoomDiagram(this,1.3)">+</button>
      <button onclick="zoomDiagram(this,1/1.3)">−</button>
      <button onclick="resetZoom(this)">↻</button>
      <button onclick="toggleFullscreen(this)">⛶</button>
    </div>
    <pre class="mermaid">
%%{init: {'theme': 'base', 'themeVariables': {'primaryColor': '{accent}', 'primaryBorderColor': '{ink}', 'lineColor': '{muted}', 'primaryTextColor': '{ink}', 'secondaryColor': '{paper-2}', 'fontFamily': 'Geist, sans-serif'}}}%%
flowchart TD
  %% module nodes with classDef
  classDef new fill:{accent-tint},stroke:{accent},stroke-width:2px
  classDef changed fill:{paper-2},stroke:{muted}
  classDef removed fill:{paper-2},stroke:{muted},stroke-dasharray:4
    </pre>
  </div>
</section>
```

---

## Section 4: Change Classification

Chart.js horizontal bar (pyramid style) showing percentage breakdown by category. Categories: feature, refactor, test, docs, config.

```html
<section id="change-classification" class="ve-card" style="--i: 3">
  <h2>Change Classification</h2>
  <div style="max-width: 480px; margin: 0 auto;">
    <canvas id="change-classification-chart"></canvas>
  </div>
  <script>
    new Chart(document.getElementById('change-classification-chart'), {
      type: 'bar',
      data: {
        labels: ['Feature', 'Refactor', 'Test', 'Docs', 'Config'],
        datasets: [{
          data: [{feature_%}, {refactor_%}, {test_%}, {docs_%}, {config_%}],
          backgroundColor: '{accent}'
        }]
      },
      options: {
        indexAxis: 'y',
        plugins: { legend: { display: false } },
        scales: { x: { max: 100, ticks: { callback: v => v + '%' } } }
      }
    });
  </script>
</section>
```

---

## Section 5: Dependency Shift

Side-by-side Mermaid subgraphs showing before/after dependency state for the most impacted module.

```html
<section id="dependency-shift" class="ve-card" style="--i: 4">
  <h2>Dependency Shift</h2>
  <div class="mermaid-wrap">
    <div class="mermaid-controls">
      <button onclick="zoomDiagram(this,1.3)">+</button>
      <button onclick="zoomDiagram(this,1/1.3)">−</button>
      <button onclick="resetZoom(this)">↻</button>
      <button onclick="toggleFullscreen(this)">⛶</button>
    </div>
    <pre class="mermaid">
%%{init: {'theme': 'base', 'themeVariables': {'primaryColor': '{accent}', 'lineColor': '{muted}', 'primaryTextColor': '{ink}', 'fontFamily': 'Geist, sans-serif'}}}%%
flowchart LR
  subgraph Before
    %% old dependency graph (top 5 nodes max)
  end
  subgraph After
    %% new dependency graph (top 5 nodes max)
  end
    </pre>
  </div>
</section>
```

---

## Section 6: New Components

Architecture diagram focused exclusively on newly added modules/components, their responsibilities, and how they connect to existing code.

Skip or note "No new components" if the diff has no new modules.

```html
<section id="new-components" class="ve-card" style="--i: 5">
  <h2>New Components</h2>
  <div class="mermaid-wrap">
    <div class="mermaid-controls">
      <button onclick="zoomDiagram(this,1.3)">+</button>
      <button onclick="zoomDiagram(this,1/1.3)">−</button>
      <button onclick="resetZoom(this)">↻</button>
      <button onclick="toggleFullscreen(this)">⛶</button>
    </div>
    <pre class="mermaid">
%%{init: {'theme': 'base', 'themeVariables': {'primaryColor': '{accent}', 'primaryBorderColor': '{ink}', 'lineColor': '{muted}', 'primaryTextColor': '{ink}', 'secondaryColor': '{paper-2}', 'fontFamily': 'Geist, sans-serif'}}}%%
flowchart TD
  classDef newModule fill:{accent-tint},stroke:{accent},stroke-width:2px
  %% new components only
    </pre>
  </div>
</section>
```

---

## Section 7: Hot Spots

Mermaid quadrantChart plotting changed files by impact (y-axis) vs change frequency (x-axis). Top 12 files max.

```html
<section id="hot-spots" class="ve-card" style="--i: 6">
  <h2>Hot Spots</h2>
  <div class="mermaid-wrap">
    <div class="mermaid-controls">
      <button onclick="zoomDiagram(this,1.3)">+</button>
      <button onclick="zoomDiagram(this,1/1.3)">−</button>
      <button onclick="resetZoom(this)">↻</button>
      <button onclick="toggleFullscreen(this)">⛶</button>
    </div>
    <pre class="mermaid">
%%{init: {'theme': 'base', 'themeVariables': {'primaryColor': '{accent}', 'primaryBorderColor': '{ink}', 'lineColor': '{muted}', 'primaryTextColor': '{ink}', 'fontFamily': 'Geist, sans-serif'}}}%%
quadrantChart
  title File Hot Spots (impact vs frequency)
  x-axis Low Change Frequency --> High Change Frequency
  y-axis Low Impact --> High Impact
  quadrant-1 Watch
  quadrant-2 Critical
  quadrant-3 Stable
  quadrant-4 Churn
  %% file data points: FileName: [x, y]
    </pre>
  </div>
</section>
```
