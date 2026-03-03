# Mermaid Patterns

Mermaid.js configuration, theming, zoom controls, and common gotchas for self-contained HTML reports.

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
    fontSize: '16px',
    fontFamily: 'var(--font-body)',
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
  zoom: 1.4;  /* Prevent complex diagrams from rendering too small */
}

/* CRITICAL: Force text colors to follow page scheme */
.mermaid .nodeLabel { color: var(--text) !important; font-family: var(--font-body) !important; font-size: 16px !important; }
.mermaid .edgeLabel { color: var(--text-dim) !important; background-color: var(--bg) !important; font-family: var(--font-mono) !important; font-size: 13px !important; }
.mermaid .edgeLabel rect { fill: var(--bg) !important; }
.mermaid .node rect, .mermaid .node circle, .mermaid .node polygon { stroke-width: 1.5px; }
.mermaid .edge-pattern-solid { stroke-width: 1.5px; }
```

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
    <button onclick="zoomDiagram(this, 1.2)" title="Zoom in">+</button>
    <button onclick="zoomDiagram(this, 0.8)" title="Zoom out">&minus;</button>
    <button onclick="resetZoom(this)" title="Reset zoom">&#8634;</button>
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

.mermaid-wrap { cursor: grab; }
.mermaid-wrap.is-panning { cursor: grabbing; user-select: none; }
```

### JavaScript

Place before `</body>`, after Mermaid import:

```javascript
var INITIAL_ZOOM = 1.4;

function zoomDiagram(btn, factor) {
  var wrap = btn.closest('.mermaid-wrap');
  var target = wrap.querySelector('.mermaid');
  var current = parseFloat(target.dataset.zoom || INITIAL_ZOOM);
  var next = Math.min(Math.max(current * factor, 0.5), 5);
  target.dataset.zoom = next;
  target.style.zoom = next;
}

function resetZoom(btn) {
  var wrap = btn.closest('.mermaid-wrap');
  var target = wrap.querySelector('.mermaid');
  target.dataset.zoom = INITIAL_ZOOM;
  target.style.zoom = INITIAL_ZOOM;
}

document.querySelectorAll('.mermaid-wrap').forEach(function(wrap) {
  // Ctrl/Cmd + scroll to zoom
  wrap.addEventListener('wheel', function(e) {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    var target = wrap.querySelector('.mermaid');
    var current = parseFloat(target.dataset.zoom || INITIAL_ZOOM);
    var factor = e.deltaY < 0 ? 1.1 : 0.9;
    var next = Math.min(Math.max(current * factor, 0.5), 5);
    target.dataset.zoom = next;
    target.style.zoom = next;
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
```

## Fullscreen Overlay

Optional fullscreen mode for complex diagrams:

```javascript
function toggleFullscreen(btn) {
  var wrap = btn.closest('.mermaid-wrap');
  wrap.classList.toggle('is-fullscreen');
  document.body.style.overflow = wrap.classList.contains('is-fullscreen') ? 'hidden' : '';
}
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

## classDef Rules

`classDef` values are static text inside `<pre>` — they can't use CSS variables or JS ternaries.

1. **NEVER set `color:` in classDef** — hardcodes text color that breaks in opposite scheme. Let CSS overrides handle text via `var(--text)`.

2. **Use semi-transparent fills (8-digit hex)** for node backgrounds. They layer over Mermaid's base theme, producing a tint that works in both modes:

```
classDef highlight fill:#b5761433,stroke:#b57614,stroke-width:2px
classDef muted fill:#7c6f6411,stroke:#7c6f6444,stroke-width:1px
```

Use `20`-`44` alpha for subtle, `55`-`77` for prominent.

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
