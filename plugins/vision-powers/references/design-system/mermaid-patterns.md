# Mermaid Patterns

Mermaid.js configuration, theming, zoom controls, and common gotchas for self-contained HTML reports.

**Scope — local / md channel only (a rendering technique, not the diagram layer).** Since ADR 0009, Mermaid renders diagrams only on the **local design-system channel** and in `--format md` fences. It is **not** used on the Artifact channel (the default for capable HTML), whose built-in `artifact-design` renderer draws diagrams as inline SVG / HTML+CSS — CDN-free and CSP-safe. Reach for this file only when authoring a local report or a non-capable fallback. *Which* diagram type to draw is a channel-agnostic decision that lives in `diagram-type-selection.md`; this file only governs *how* Mermaid draws it locally. See `channel-decision.md` and ADR 0009.

## CDN Import

### Standard (dagre layout)

```html
<script type="module">
  import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';

  const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  mermaid.initialize({
    startOnLoad: true,
    theme: 'base',
    look: 'classic',
    themeVariables: { /* see Deep Theming below */ }
  });
</script>
```

### With ELK Layout (complex graphs)

ELK is a separate package — without importing it, `layout: 'elk'` silently falls back to dagre. Only import when needed (adds significant bundle weight).

```html
<script type="module">
  import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';
  import elkLayouts from 'https://cdn.jsdelivr.net/npm/@mermaid-js/layout-elk/dist/mermaid-layout-elk.esm.min.mjs';

  mermaid.registerLayoutLoaders(elkLayouts);

  const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  mermaid.initialize({
    startOnLoad: true,
    layout: 'elk',
    theme: 'base',
    look: 'classic',
    themeVariables: { /* see Deep Theming below */ }
  });
</script>
```

## Deep Theming

Always use `theme: 'base'` — the only theme where all `themeVariables` are fully customizable. Built-in themes (`default`, `dark`, `forest`, `neutral`) ignore most variable overrides.

```javascript
const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

mermaid.initialize({
  startOnLoad: true,
  theme: 'base',
  look: 'classic',
  themeVariables: {
    primaryColor: isDark ? '#134e4a' : '#ccfbf1',
    primaryBorderColor: isDark ? '#14b8a6' : '#0d9488',
    primaryTextColor: isDark ? '#f0fdfa' : '#134e4a',
    secondaryColor: isDark ? '#1e293b' : '#f0fdf4',
    secondaryBorderColor: isDark ? '#059669' : '#16a34a',
    secondaryTextColor: isDark ? '#f1f5f9' : '#1e293b',
    tertiaryColor: isDark ? '#27201a' : '#fef3c7',
    tertiaryBorderColor: isDark ? '#d97706' : '#f59e0b',
    tertiaryTextColor: isDark ? '#fef3c7' : '#27201a',
    lineColor: isDark ? '#64748b' : '#94a3b8',
    fontSize: '20px',
    fontFamily: getComputedStyle(document.documentElement).getPropertyValue('--font-body').trim() || 'system-ui, sans-serif',
    noteBkgColor: isDark ? '#1e293b' : '#fefce8',
    noteTextColor: isDark ? '#f1f5f9' : '#1e293b',
    noteBorderColor: isDark ? '#fbbf24' : '#d97706',
  }
});
```

**FORBIDDEN in themeVariables**: `#8b5cf6`, `#7c3aed`, `#a78bfa` (violet/indigo), `#d946ef` (fuchsia). Use teal, slate, amber, emerald, or colors from your report's palette.

Adapt the palette to match the report's chosen accent colors — the teal/slate example above is just a starting point.

## Dark Mode Detection

Mermaid initializes once and cannot reactively switch themes. Read preference at load time:

```javascript
const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
// Use isDark to select light/dark values in themeVariables
```

CSS overrides on `.mermaid-wrap` and page elements still respond to `prefers-color-scheme` normally — only Mermaid SVG internals are static.

## CSS Overrides

Force node/edge text to follow the page's color scheme. Without these, `classDef` `color:` values hardcode a single color that breaks in the opposite scheme.

```css
.mermaid-wrap {
  position: relative;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 32px 24px;
  overflow: auto;
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
  scrollbar-width: thin;
  scrollbar-color: var(--border) transparent;
}
.mermaid-wrap::-webkit-scrollbar { width: 6px; height: 6px; }
.mermaid-wrap::-webkit-scrollbar-track { background: transparent; }
.mermaid-wrap::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }

.mermaid-wrap .mermaid {
  transform: scale(1.4);
  transform-origin: 0 0;
}

/* CRITICAL: Force text colors to follow page scheme */
.mermaid .nodeLabel { color: var(--text) !important; font-family: var(--font-body) !important; font-size: 16px !important; }
.mermaid .edgeLabel { color: var(--text-dim) !important; background-color: var(--bg) !important; font-family: var(--font-mono) !important; font-size: 13px !important; }
.mermaid .edgeLabel rect { fill: var(--bg) !important; }
.mermaid .node rect, .mermaid .node circle, .mermaid .node polygon { stroke-width: 1.5px; }
.mermaid .edge-pattern-solid { stroke-width: 1.5px; }
```

### Scaling Options

Three approaches when complex diagrams (10+ nodes) render too small:

| Method | Code | Pros | Cons |
|---|---|---|---|
| `transform: scale()` (default) | `.mermaid { transform: scale(1.4); transform-origin: 0 0; }` | Standard CSS, infinite SVG vector quality, integrates with zoom controls | Requires JS to update container scroll area |
| `zoom` | `.mermaid { zoom: 1.4; }` | Simple, container size adjusts automatically | Non-standard CSS, quality degrades at high magnification |
| `fontSize` | `themeVariables: { fontSize: '20px' }` | Only text grows, natural layout | Node sizes also grow, may widen the entire diagram |

Prefer `transform: scale()` by default. SVG vector graphics maintain sharpness at any scale.

### Size Variants

```css
.mermaid-wrap--compact { min-height: 200px; }
.mermaid-wrap--tall { min-height: 600px; }
```

## Zoom Controls

Add to every `.mermaid-wrap` container.

### HTML

```html
<div class="mermaid-wrap">
  <div class="zoom-controls">
    <button onclick="zoomDiagram(this, 1.3)" title="Zoom in">+</button>
    <button onclick="zoomDiagram(this, 1/1.3)" title="Zoom out">&minus;</button>
    <button onclick="resetZoom(this)" title="Reset zoom">&#8634;</button>
    <span class="zoom-level">140%</span>
    <button onclick="toggleFullscreen(this)" title="Fullscreen">&#x26F6;</button>
  </div>
  <pre class="mermaid">
    graph TD
      A --> B
  </pre>
</div>
```

### CSS

```css
.zoom-controls {
  position: absolute;
  top: 8px;
  right: 8px;
  display: flex;
  align-items: center;
  gap: 2px;
  z-index: 10;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 2px;
}
.zoom-controls button {
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  color: var(--text-dim);
  font-family: var(--font-mono);
  font-size: 14px;
  cursor: pointer;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s ease, color 0.15s ease;
}
.zoom-controls button:hover {
  background: var(--border);
  color: var(--text);
}
.zoom-level {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--text-dim);
  min-width: 40px;
  text-align: center;
  user-select: none;
}

.mermaid-wrap { cursor: grab; }
.mermaid-wrap.is-panning { cursor: grabbing; user-select: none; }
```

### JavaScript

Place before `</body>`, after Mermaid import:

```javascript
var INITIAL_ZOOM = 1.4;

function applyZoom(wrap, level) {
  var target = wrap.querySelector('.mermaid');
  target.dataset.zoom = level;
  target.style.transform = 'scale(' + level + ')';
  // Update scroll area to match scaled SVG size
  var svg = target.querySelector('svg');
  if (svg) {
    var rect = svg.getBoundingClientRect();
    target.style.width = (rect.width / level * level) + 'px';
    target.style.height = (rect.height / level * level) + 'px';
  }
  // Update zoom level indicator
  var indicator = wrap.querySelector('.zoom-level');
  if (indicator) indicator.textContent = Math.round(level * 100) + '%';
}

function zoomDiagram(btn, factor) {
  var wrap = btn.closest('.mermaid-wrap');
  var target = wrap.querySelector('.mermaid');
  var current = parseFloat(target.dataset.zoom || INITIAL_ZOOM);
  var next = Math.min(Math.max(current * factor, 0.3), 30);
  applyZoom(wrap, next);
}

function resetZoom(btn) {
  var wrap = btn.closest('.mermaid-wrap');
  applyZoom(wrap, INITIAL_ZOOM);
}

document.querySelectorAll('.mermaid-wrap').forEach(function(wrap) {
  // Ctrl/Cmd + scroll to zoom
  wrap.addEventListener('wheel', function(e) {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    var target = wrap.querySelector('.mermaid');
    var current = parseFloat(target.dataset.zoom || INITIAL_ZOOM);
    var factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
    var next = Math.min(Math.max(current * factor, 0.3), 30);
    applyZoom(wrap, next);
  }, { passive: false });

  // Click-and-drag panning
  var startX, startY, scrollLeft, scrollTop;
  wrap.addEventListener('mousedown', function(e) {
    if (e.target.closest('.zoom-controls')) return;
    wrap.classList.add('is-panning');
    startX = e.pageX - wrap.offsetLeft;
    startY = e.pageY - wrap.offsetTop;
    scrollLeft = wrap.scrollLeft;
    scrollTop = wrap.scrollTop;
  });
  wrap.addEventListener('mousemove', function(e) {
    if (!wrap.classList.contains('is-panning')) return;
    e.preventDefault();
    wrap.scrollLeft = scrollLeft - (e.pageX - wrap.offsetLeft - startX);
    wrap.scrollTop = scrollTop - (e.pageY - wrap.offsetTop - startY);
  });
  document.addEventListener('mouseup', function() {
    wrap.classList.remove('is-panning');
  });
});

// Initial zoom: apply scroll area sizing after Mermaid renders SVGs
document.querySelectorAll('.mermaid').forEach(function(el) {
  new MutationObserver(function(mutations, obs) {
    if (el.querySelector('svg')) {
      var wrap = el.closest('.mermaid-wrap');
      if (wrap) applyZoom(wrap, INITIAL_ZOOM);
      obs.disconnect();
    }
  }).observe(el, { childList: true });
});

// Keyboard zoom: + / - keys when a mermaid-wrap is hovered
document.addEventListener('keydown', function(e) {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
  var wrap = document.querySelector('.mermaid-wrap:hover');
  if (!wrap) return;
  if (e.key === '+' || e.key === '=') {
    e.preventDefault();
    var target = wrap.querySelector('.mermaid');
    var current = parseFloat(target.dataset.zoom || INITIAL_ZOOM);
    applyZoom(wrap, Math.min(current * 1.3, 30));
  } else if (e.key === '-') {
    e.preventDefault();
    var target = wrap.querySelector('.mermaid');
    var current = parseFloat(target.dataset.zoom || INITIAL_ZOOM);
    applyZoom(wrap, Math.max(current / 1.3, 0.3));
  }
});
```

## Fullscreen Overlay

Optional fullscreen mode for complex diagrams:

```javascript
function toggleFullscreen(btn) {
  var wrap = btn.closest('.mermaid-wrap');
  wrap.classList.toggle('is-fullscreen');
  document.body.style.overflow = wrap.classList.contains('is-fullscreen') ? 'hidden' : '';
}

// ESC key closes fullscreen
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    var fs = document.querySelector('.mermaid-wrap.is-fullscreen');
    if (fs) {
      fs.classList.remove('is-fullscreen');
      document.body.style.overflow = '';
    }
  }
});
```

```css
.mermaid-wrap.is-fullscreen {
  position: fixed;
  inset: 0;
  z-index: 1000;
  border-radius: 0;
  min-height: 100dvh;
}
```

## ELK Layout

All templates use ELK (Eclipse Layout Kernel) as the default renderer for flowcharts. ELK produces cleaner vertical layouts than dagre, especially for complex graphs with 10+ nodes and subgraphs.

The ELK module is imported alongside Mermaid in the template:

```html
<script type="module">
  import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';
  import elkLayouts from 'https://cdn.jsdelivr.net/npm/@mermaid-js/layout-elk/dist/mermaid-layout-elk.esm.min.mjs';
  mermaid.registerLayoutLoaders(elkLayouts);
  mermaid.initialize({
    startOnLoad: true, theme: 'base', look: 'classic',
    securityLevel: 'loose',
    flowchart: { defaultRenderer: 'elk' },
    themeVariables: { /* ... */ }
  });
</script>
```

ELK only applies to flowchart/graph diagrams. Other diagram types (sequence, ER, state, etc.) use their own renderers and are unaffected.

## Click Events

Mermaid nodes can be made clickable to enable in-report navigation. Templates use `securityLevel: 'loose'` which enables this.

### Section Anchor Links

Link diagram nodes to report sections:

```
graph TD
  A["Skills"] --> B["Agents"]
  A --> C["Hooks"]

  click A "#components"
  click B "#architecture"
  click C "#security-audit"
```

The `#section-id` must match a `<section id="...">` in the report. Clicking the node scrolls to that section.

### Source File Links

When source context is available, link nodes to source files:

```
click SkillNode "https://github.com/owner/repo/blob/main/skills/my-skill/SKILL.md"
click AgentNode "file:///path/to/agents/my-agent.md"
```

### CSS

The template includes hover styles for clickable nodes:

```css
.mermaid .clickable { cursor: pointer; transition: filter 0.2s ease; }
.mermaid .clickable:hover { filter: brightness(1.15); }
```

## classDef Rules

`classDef` values are static text inside `<pre>` — they can't use CSS variables or JS ternaries.

1. **NEVER set `color:` in classDef** — hardcodes text color that breaks in opposite scheme. Let CSS overrides handle text via `var(--text)`.

2. **NEVER use `rgba()` or `rgb()` in classDef** — Mermaid's parser uses commas as property separators, so `fill:rgba(8,145,178,0.15)` gets split into `fill:rgba(8` / `145` / `178` / `0.15)` causing the entire diagram to fail. This is the single most common cause of broken Mermaid diagrams.

3. **Use 8-digit hex (`#RRGGBBAA`) for semi-transparent fills.** They layer over Mermaid's base theme, producing a tint that works in both modes:

```
classDef highlight fill:#b5761433,stroke:#b57614,stroke-width:2px
classDef muted fill:#7c6f6411,stroke:#7c6f6444,stroke-width:1px
```

Common alpha values: `11` (~7%), `22` (~13%), `33` (~20%), `44` (~27%), `55` (~33%), `77` (~47%).

**Quick conversion reference:**

| rgba alpha | 8-digit hex suffix |
|---|---|
| 0.07 | `11` |
| 0.13 | `22` |
| 0.15 | `26` |
| 0.20 | `33` |
| 0.27 | `44` |

## Diagram Authoring Rules

### Layout Direction

Prefer `TD` (top-down) over `LR` (left-to-right). LR spreads horizontally and scales text down unreadably with many nodes.

| Direction | Use when | Avoid when |
|---|---|---|
| `TD` | Complex diagrams, 5+ nodes, hierarchies | Simple A→B→C linear flows |
| `LR` | Simple linear flows, 3-4 nodes | Many branches, complex graphs |

### Node Count

Max 15-20 nodes per diagram. Beyond that, use `subgraph` blocks or split into multiple diagrams.

### Special Characters

Quote labels containing parentheses, colons, brackets, slashes:

```
CMD["/gallery command"] --> SRV["Server: main"]
```

### Arrow Styles

| Arrow | Meaning | Use for |
|---|---|---|
| `-->` | Solid | Primary flow |
| `-.->` | Dotted | Optional, async, fallback |
| `==>` | Thick | Critical path |
| `--x` | Cross | Rejected, blocked |
| `-->&#124;label&#124;` | Labeled | Decision branches |

### stateDiagram-v2 Limitations

Avoid `<br/>`, parentheses in labels, multiple colons. Use flowchart instead for complex labels.

### Sequence Diagram Messages

Must be plain text. Curly braces `{}`, square brackets `[]`, angle brackets `<>`, and `&` break the parser. Write human-readable descriptions:

```
%% WRONG
A->>B: web_search({ queries: [...] })

%% RIGHT
A->>B: Call web_search with queries
```

---

## 13-Type Syntax Reference

Minimum complete example for each type. In production diagrams you **must** prepend the `%%{init}%%` block from Layer 0 semantic-tokens.md.

### architecture
```
flowchart TD
  subgraph Frontend
    UI[React UI]
  end
  subgraph Backend
    API[API Server]
    DB[(Postgres)]
  end
  UI --> API
  API --> DB
```

### sequence
```
sequenceDiagram
  participant U as User
  participant A as App
  participant D as DB
  U->>A: Login request
  A->>D: Query user
  D-->>A: User record
  A-->>U: Session token
```
(do not use `{}[]<>&` in messages)

### state
```
stateDiagram-v2
  [*] --> Idle
  Idle --> Running: start
  Running --> Done: complete
  Running --> Failed: error
```
(do not use `<br/>` in labels)

### ER
```
erDiagram
  USER ||--o{ ORDER : places
  ORDER ||--|{ LINE_ITEM : contains
  USER {
    string name
    string email
  }
```

### timeline
```
timeline
  title 2026 Roadmap
  Q1 : Foundation : Auth
  Q2 : API v2 : Migration
  Q3 : Mobile
```

### swimlane
```
flowchart LR
  subgraph Frontend
    A[Submit form]
  end
  subgraph Backend
    B[Validate]
    C[Write DB]
  end
  subgraph Ops
    D[Alert]
  end
  A --> B --> C --> D
```

### quadrant
```
quadrantChart
  title Priorities
  x-axis Low --> High Effort
  y-axis Low --> High Impact
  quadrant-1 Do Now
  quadrant-2 Schedule
  quadrant-3 Drop
  quadrant-4 Delegate
  Auth: [0.3, 0.8]
  Dashboard: [0.7, 0.4]
```

### nested
```
flowchart TD
  subgraph Organization
    subgraph Team_A
      A1[Member 1]
      A2[Member 2]
    end
    subgraph Team_B
      B1[Member 3]
    end
  end
```

### tree
```
flowchart TD
  Root --> ChildA
  Root --> ChildB
  ChildA --> LeafA1
  ChildA --> LeafA2
  ChildB --> LeafB1
```

### layer stack
```
flowchart TD
  subgraph L4 ["L4: Application"]
    App
  end
  subgraph L3 ["L3: Framework"]
    Framework
  end
  subgraph L2 ["L2: Runtime"]
    Runtime
  end
  subgraph L1 ["L1: OS"]
    OS
  end
```

### venn (fallback — inline SVG)

Not supported by Mermaid. Write a 3-circle overlap SVG inline:

```html
<svg viewBox="0 0 300 200">
  <circle cx="110" cy="100" r="70" fill="#b5523a" opacity="0.3"/>
  <circle cx="190" cy="100" r="70" fill="#2563eb" opacity="0.3"/>
  <circle cx="150" cy="130" r="70" fill="#57534e" opacity="0.3"/>
</svg>
```

### pyramid / funnel (fallback — Chart.js)

Not supported by Mermaid. Chart.js horizontal bar with descending values:

```js
new Chart(ctx, {
  type: 'bar',
  data: {
    labels: ['Visitors', 'Signups', 'Active', 'Paying'],
    datasets: [{ data: [10000, 1500, 600, 150], backgroundColor: '#b5523a' }]
  },
  options: { indexAxis: 'y', plugins: { legend: { display: false } } }
});
```
