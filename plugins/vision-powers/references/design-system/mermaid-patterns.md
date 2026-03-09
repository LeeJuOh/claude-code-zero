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

복잡한 다이어그램(10+ 노드)이 너무 작게 렌더링될 때 3가지 접근법:

| 방법 | 코드 | 장점 | 단점 |
|---|---|---|---|
| `transform: scale()` (기본) | `.mermaid { transform: scale(1.4); transform-origin: 0 0; }` | 표준 CSS, SVG 벡터 품질 무한 유지, 줌 컨트롤과 연동 | JS로 컨테이너 스크롤 영역 업데이트 필요 |
| `zoom` | `.mermaid { zoom: 1.4; }` | 간단, 컨테이너 크기 자동 조정 | 비표준 CSS, 고배율에서 품질 저하 |
| `fontSize` | `themeVariables: { fontSize: '20px' }` | 텍스트만 커짐, 레이아웃 자연스러움 | 노드 크기도 같이 커져 전체 다이어그램이 넓어질 수 있음 |

기본값 `transform: scale()`를 우선 사용. SVG 벡터 특성상 어떤 배율에서도 선명도가 유지됨.

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
