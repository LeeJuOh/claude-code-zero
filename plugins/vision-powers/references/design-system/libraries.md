# External Libraries (CDN)

CDN libraries for self-contained HTML reports. Only include what the report actually needs — most reports need Mermaid and fonts at minimum.

## Mermaid.js v11 — Diagramming Engine

For flowcharts, sequence diagrams, ER diagrams, state machines, and mind maps. Mermaid handles layout — you handle theming.

### Standard (dagre layout)

```html
<script type="module">
  import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';
  mermaid.initialize({ startOnLoad: true, /* ... */ });
</script>
```

### With ELK layout

Required for `layout: 'elk'` — separate package, not bundled. Only import when actually needed (complex graphs with 10+ nodes).

```html
<script type="module">
  import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';
  import elkLayouts from 'https://cdn.jsdelivr.net/npm/@mermaid-js/layout-elk/dist/mermaid-layout-elk.esm.min.mjs';
  mermaid.registerLayoutLoaders(elkLayouts);
  mermaid.initialize({ startOnLoad: true, layout: 'elk', /* ... */ });
</script>
```

See `mermaid-patterns.md` for full theming and zoom configuration.

## Chart.js v4 — Data Visualizations

For bar charts, line charts, pie/doughnut charts in KPI dashboards. Overkill for static numbers — use pure CSS for simple progress bars.

```html
<script src="https://cdn.jsdelivr.net/npm/chart.js@4/dist/chart.umd.min.js"></script>
```

### Basic Usage

```html
<div class="chart-container">
  <canvas id="myChart" width="600" height="300"></canvas>
</div>

<script>
  const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const textColor = isDark ? '#8b949e' : '#6b7280';
  const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const fontFamily = getComputedStyle(document.documentElement)
    .getPropertyValue('--font-body').trim() || 'system-ui, sans-serif';

  new Chart(document.getElementById('myChart'), {
    type: 'bar',
    data: {
      labels: ['Label1', 'Label2', 'Label3'],
      datasets: [{
        label: 'Dataset',
        data: [45, 62, 78],
        backgroundColor: 'var(--accent-dim)',
        borderColor: 'var(--accent)',
        borderWidth: 1,
        borderRadius: 4,
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { labels: { color: textColor, font: { family: fontFamily } } },
      },
      scales: {
        x: { ticks: { color: textColor, font: { family: fontFamily } }, grid: { color: gridColor } },
        y: { ticks: { color: textColor, font: { family: fontFamily } }, grid: { color: gridColor } },
      }
    }
  });
</script>
```

### Chart Container CSS

```css
.chart-container {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 20px;
  position: relative;
}
.chart-container canvas {
  max-height: 300px;
}
```

Note: Chart.js uses resolved color values (not CSS variables) at render time. Read computed colors with `getComputedStyle()` or use conditional `isDark` values.

## highlight.js v11 — Syntax Highlighting

For readable code blocks with language-aware token coloring. Without this, code in reports looks like plain monospace text with no visual distinction between keywords, strings, comments, and operators.

### Theme-Aware Loading

Use media queries to load light/dark themes automatically:

```html
<!-- In <head> -->
<link rel="stylesheet" media="(prefers-color-scheme: light)" href="https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11/build/styles/github.min.css">
<link rel="stylesheet" media="(prefers-color-scheme: dark)" href="https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11/build/styles/github-dark-dimmed.min.css">

<!-- Before </body> -->
<script src="https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11/build/highlight.min.js"></script>
<script>hljs.highlightAll();</script>
```

### Integration with Report Theme

Override highlight.js backgrounds to keep code blocks consistent with the report's surface colors:

```css
/* highlight.js background → transparent; .code-block controls the container */
pre code.hljs { background: transparent; padding: 0; }
.code-block code { display: block; }
.code-file__body code.hljs { background: transparent; padding: 0; }
```

### Usage

Always specify the language on `<code>` elements for reliable highlighting:

```html
<pre class="code-block"><code class="language-typescript">
interface User {
  id: string;
  name: string;
}
</code></pre>
```

Common language values: `javascript`, `typescript`, `python`, `json`, `bash`, `html`, `css`, `go`, `rust`, `java`, `sql`.

**HTML-escape all code content** — `<` → `&lt;`, `>` → `&gt;`, `&` → `&amp;`. Unescaped tags break rendering.

**No conflict with Mermaid**: highlight.js only processes `<pre><code>` blocks, not bare `<pre class="mermaid">` elements.

## anime.js — Orchestrated Animations

Optional. Use when 10+ elements need a choreographed entrance sequence. For simpler reports, CSS `animation-delay` staggering is sufficient.

```html
<script src="https://cdn.jsdelivr.net/npm/animejs@3.2.2/lib/anime.min.js"></script>

<script>
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!prefersReduced) {
    anime({
      targets: '.ve-card',
      opacity: [0, 1],
      translateY: [20, 0],
      delay: anime.stagger(80, { start: 200 }),
      easing: 'easeOutCubic',
      duration: 500,
    });
  }
</script>
```

When using anime.js, set initial opacity to 0 in CSS:

```css
.ve-card { opacity: 0; }

@media (prefers-reduced-motion: reduce) {
  .ve-card { opacity: 1 !important; }
}
```

## Google Fonts — Typography

Always load with `display=swap`. See `semantic-tokens.md` for curated pairings.

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Azeret+Mono:wght@400;500&display=swap" rel="stylesheet">
```
