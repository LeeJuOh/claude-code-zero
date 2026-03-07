# CSS Patterns

Reusable CSS patterns for self-contained HTML reports. All reports use CSS custom properties for theming, support light/dark mode, and follow the depth tier hierarchy.

## Theme Setup

Define both light and dark palettes via custom properties. Pick colors from the approved palette in `anti-slop-rules.md` — never use violet/indigo defaults.

```css
:root {
  --font-body: 'Plus Jakarta Sans', system-ui, sans-serif;
  --font-mono: 'Azeret Mono', 'SF Mono', Consolas, monospace;

  --bg: #f8f9fa;
  --surface: #ffffff;
  --surface-elevated: #ffffff;
  --border: rgba(0, 0, 0, 0.08);
  --border-bright: rgba(0, 0, 0, 0.15);
  --text: #1a1a2e;
  --text-dim: #6b7280;
  --accent: #0891b2;
  --accent-dim: rgba(8, 145, 178, 0.1);

  /* Semantic accents for diagram elements and multi-category content */
  --node-a: #0891b2;
  --node-a-dim: rgba(8, 145, 178, 0.1);
  --node-b: #059669;
  --node-b-dim: rgba(5, 150, 105, 0.1);
  --node-c: #d97706;
  --node-c-dim: rgba(217, 119, 6, 0.1);

  /* Risk / status colors */
  --success: #16a34a;
  --warning: #d97706;
  --danger: #dc2626;
  --danger-high: #ef4444;

  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.04);
  --shadow-md: 0 2px 8px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04);
  --shadow-lg: 0 4px 20px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.04);
  --shadow-hero: 0 8px 32px rgba(0,0,0,0.12), 0 2px 4px rgba(0,0,0,0.06);
}

@media (prefers-color-scheme: dark) {
  :root {
    --bg: #0d1117;
    --surface: #161b22;
    --surface-elevated: #1c2333;
    --border: rgba(255, 255, 255, 0.06);
    --border-bright: rgba(255, 255, 255, 0.12);
    --text: #e6edf3;
    --text-dim: #8b949e;
    --accent: #22d3ee;
    --accent-dim: rgba(34, 211, 238, 0.12);
    --node-a: #22d3ee;
    --node-a-dim: rgba(34, 211, 238, 0.12);
    --node-b: #34d399;
    --node-b-dim: rgba(52, 211, 153, 0.12);
    --node-c: #fbbf24;
    --node-c-dim: rgba(251, 191, 36, 0.12);
    --success: #34d399;
    --warning: #fbbf24;
    --danger: #f87171;
    --danger-high: #ef4444;
    --shadow-sm: 0 1px 2px rgba(0,0,0,0.2);
    --shadow-md: 0 2px 8px rgba(0,0,0,0.3);
    --shadow-lg: 0 4px 20px rgba(0,0,0,0.3);
    --shadow-hero: 0 8px 32px rgba(0,0,0,0.4);
  }
}
```

These are **default values** — each report may override `--font-body`, `--font-mono`, `--accent`, and `--node-*` for its chosen font pairing and palette. See `font-system.md` for pairing options.

## Background Atmosphere

Flat backgrounds feel dead. Use ONE subtle pattern per report:

```css
/* Option A: Radial glow behind focal area */
body {
  background: var(--bg);
  background-image: radial-gradient(ellipse at 50% 0%, var(--accent-dim) 0%, transparent 60%);
}

/* Option B: Faint dot grid */
body {
  background-color: var(--bg);
  background-image: radial-gradient(circle, var(--border) 1px, transparent 1px);
  background-size: 24px 24px;
}

/* Option C: Diagonal subtle lines */
body {
  background-color: var(--bg);
  background-image: repeating-linear-gradient(
    -45deg, transparent, transparent 40px,
    var(--border) 40px, var(--border) 41px
  );
}

/* Option D: Gradient mesh (pick 2-3 positioned radials) */
body {
  background: var(--bg);
  background-image:
    radial-gradient(at 20% 20%, var(--node-a-dim) 0%, transparent 50%),
    radial-gradient(at 80% 60%, var(--node-b-dim) 0%, transparent 50%);
}
```

## Card Components

The fundamental building block. **NEVER use `.node` as a CSS class name** — Mermaid.js uses `.node` internally on SVG elements and page-level `.node` styles will break diagrams. Use `.ve-card` (namespaced).

```css
.ve-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 16px 20px;
  position: relative;
}

/* Colored accent border variants */
.ve-card--accent-a { border-left: 3px solid var(--node-a); }
.ve-card--accent-b { border-left: 3px solid var(--node-b); }
.ve-card--accent-c { border-left: 3px solid var(--node-c); }
```

### Depth Tiers

Use depth to signal visual importance. Surfaces whisper, don't shout — subtle lightness shifts (2-4%), not dramatic color changes.

```css
/* Hero: executive summaries, focal elements — demands attention */
.ve-card--hero {
  background: color-mix(in srgb, var(--surface) 92%, var(--accent) 8%);
  box-shadow: var(--shadow-hero);
  border-color: color-mix(in srgb, var(--border) 50%, var(--accent) 50%);
}

/* Elevated: KPIs, key sections, anything that should pop */
.ve-card--elevated {
  background: var(--surface-elevated);
  box-shadow: var(--shadow-md);
}

/* Default: standard content (plain .ve-card) */

/* Recessed: code blocks, secondary content, detail panels */
.ve-card--recessed {
  background: color-mix(in srgb, var(--bg) 70%, var(--surface) 30%);
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.06);
  border-color: var(--border);
}

/* Glass: special-occasion overlay (use sparingly) */
.ve-card--glass {
  background: color-mix(in srgb, var(--surface) 60%, transparent 40%);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-color: rgba(255, 255, 255, 0.1);
}
```

### Card Label

Monospace, uppercase, small — with colored dot indicator:

```css
.ve-card__label {
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  color: var(--node-a);
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.ve-card__label::before {
  content: '';
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: currentColor;
}
```

## Code Blocks

Code needs explicit whitespace preservation and height constraints:

```css
.code-block {
  font-family: var(--font-mono);
  font-size: 13px;
  line-height: 1.5;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 16px;
  overflow-x: auto;
  /* CRITICAL: preserve line breaks and indentation */
  white-space: pre-wrap;
  word-break: break-word;
}

/* Constrain height for long code */
.code-block--scroll {
  max-height: 400px;
  overflow-y: auto;
}
```

### Code File with Header

```css
.code-file {
  border: 1px solid var(--border);
  border-radius: 8px;
  overflow: hidden;
}
.code-file__header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--text-dim);
}
.code-file__body {
  font-family: var(--font-mono);
  font-size: 13px;
  line-height: 1.5;
  padding: 16px;
  background: var(--surface-elevated);
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 500px;
  overflow: auto;
}
```

## Side-by-Side Comparison Panels

For diff-review (before/after) and plan-review (current/planned):

```css
.comparison {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
.comparison > * {
  min-width: 0;
  overflow-wrap: break-word;
}
.comparison__label {
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 8px;
}
.comparison__before .comparison__label { color: var(--danger); }
.comparison__after .comparison__label { color: var(--success); }
/* Plan-review variants */
.comparison__current .comparison__label { color: var(--node-a); }
.comparison__planned .comparison__label { color: var(--node-b); }

@media (max-width: 768px) {
  .comparison { grid-template-columns: 1fr; }
}
```

## Tables

Real `<table>` elements (not CSS Grid pretending). Always wrap in `.table-wrapper`:

```css
.table-wrapper {
  overflow-x: auto;
  border: 1px solid var(--border);
  border-radius: 8px;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

thead {
  position: sticky;
  top: 0;
  z-index: 1;
}

th {
  background: var(--surface-elevated);
  font-weight: 600;
  text-align: left;
  padding: 10px 14px;
  border-bottom: 2px solid var(--border-bright);
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-dim);
}

td {
  padding: 10px 14px;
  border-bottom: 1px solid var(--border);
  vertical-align: top;
}

tr:nth-child(even) td {
  background: color-mix(in srgb, var(--surface) 97%, var(--bg) 3%);
}

tr:hover td {
  background: var(--accent-dim);
}

/* Right-align numeric columns */
td.num, th.num {
  text-align: right;
  font-variant-numeric: tabular-nums;
}
```

## Status Indicators

Colored dot indicators (no emoji):

```css
.status {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
}
.status::before {
  content: '';
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.status--success::before { background: var(--success); }
.status--warning::before { background: var(--warning); }
.status--danger::before { background: var(--danger); }
.status--info::before { background: var(--accent); }
.status--neutral::before { background: var(--text-dim); }
```

## Overflow Protection

```css
/* Every grid/flex child must be able to shrink */
.ve-card > *, .comparison > *, [class*="grid"] > * {
  min-width: 0;
}

/* Long text wraps instead of overflowing */
body {
  overflow-wrap: break-word;
}
```

### List markers: use absolute positioning, NEVER `display: flex` on `<li>`

```css
/* WRONG — causes overflow with inline code badges */
li { display: flex; }

/* RIGHT — text wraps normally */
li {
  padding-left: 14px;
  position: relative;
}
li::before {
  content: '›';
  position: absolute;
  left: 0;
}
```

### Lists inside bordered containers

Any `<ol>` or `<ul>` inside a bordered container needs `list-style-position: inside` or `padding-left: 2em` minimum.

## Collapsible Sections

```css
details.collapsible {
  border: 1px solid var(--border);
  border-radius: 8px;
  overflow: hidden;
}
details.collapsible summary {
  padding: 12px 16px;
  cursor: pointer;
  font-weight: 500;
  background: var(--surface);
  border-bottom: 1px solid transparent;
  transition: background 0.15s;
}
details.collapsible[open] summary {
  border-bottom-color: var(--border);
}
details.collapsible summary:hover {
  background: var(--accent-dim);
}
details.collapsible > :not(summary) {
  padding: 16px;
}
```

## Animations

Staggered fade-in on page load. Mix types for visual variety:

```css
/* Cards: fade up */
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
}

/* KPIs: fade + scale */
@keyframes fadeScale {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}

/* Stagger using CSS custom property */
.ve-card, .sec-head, .kpi-card {
  opacity: 0;
  animation: fadeUp 0.5s ease-out forwards;
  animation-delay: calc(var(--i, 0) * 60ms + 100ms);
}

.kpi-card {
  animation-name: fadeScale;
}

/* CRITICAL: Respect reduced motion preference */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
    animation-delay: 0ms !important;
  }
}
```

Assign `style="--i: 0"`, `style="--i: 1"`, etc. on sequential elements for stagger effect.

### Forbidden Animations

- Animated glowing box-shadows (`@keyframes glow`)
- Pulsing/breathing effects on static content
- Continuous animations after page load (except progress indicators)

## Link Styling

Never rely on browser default link colors. The default blue has poor contrast on dark backgrounds:

```css
a { color: var(--accent); text-decoration: underline; }
a:hover { color: var(--text); }
```

## Prose Page Elements

텍스트 강조 컴포넌트. 시각적 페이지 내에서 핵심 포인트를 강조하거나 맥락을 제공할 때 사용.

### Lead Paragraph
섹션 도입부에 사용. 일반 텍스트보다 크고 눈에 띄게:

```css
.lead {
  font-size: 1.25rem;
  line-height: 1.6;
  color: var(--text);
  opacity: 0.9;
  max-width: 720px;
}
```

### Pull Quote
핵심 인사이트를 크게 인용. 페이지당 최대 1개:

```css
.pull-quote {
  font-size: 1.5rem;
  font-style: italic;
  line-height: 1.4;
  border-left: 4px solid var(--accent);
  padding: 1rem 0 1rem 1.5rem;
  margin: 2rem 0;
  color: var(--text);
  opacity: 0.85;
}
```

### Callout Box
경고, 팁, 중요 참고사항:

```css
.callout {
  padding: 1rem 1.25rem;
  border-radius: 8px;
  border-left: 4px solid;
  margin: 1rem 0;
}
.callout--info { border-color: var(--accent); background: var(--accent-dim); }
.callout--warning { border-color: var(--warning); background: color-mix(in srgb, var(--warning) 8%, var(--surface)); }
.callout--danger { border-color: var(--danger); background: color-mix(in srgb, var(--danger) 8%, var(--surface)); }
.callout__title {
  font-weight: 600;
  font-size: 0.875rem;
  margin-bottom: 0.5rem;
}
```

## SVG Connectors

CSS Grid 아키텍처 레이아웃에서 카드 사이 화살표. 텍스트가 풍부한 카드(설명, 코드, 도구 목록)를 연결할 때 Mermaid 대신 사용.

**언제 쓰는가**: 카드 내용이 중요하고 풍부할 때 (CSS Grid + SVG Connector). 연결 토폴로지가 중요할 때는 Mermaid.

### Vertical Arrow

```html
<div class="connector-v">
  <svg viewBox="0 0 2 40" preserveAspectRatio="none">
    <line x1="1" y1="0" x2="1" y2="35" stroke="var(--border-bright)" stroke-width="2"/>
    <polygon points="0,35 1,40 2,35" fill="var(--accent)"/>
  </svg>
</div>
```

```css
.connector-v {
  display: flex;
  justify-content: center;
  padding: 4px 0;
}
.connector-v svg {
  width: 2px;
  height: 40px;
}
```

### Horizontal Arrow

```css
.connector-h {
  display: flex;
  align-items: center;
  padding: 0 4px;
}
.connector-h svg {
  width: 40px;
  height: 2px;
}
```

### Labeled Connector

```html
<div class="connector-v connector-v--labeled">
  <span class="connector-label">delegates</span>
  <svg viewBox="0 0 2 40" preserveAspectRatio="none">
    <line x1="1" y1="0" x2="1" y2="35" stroke="var(--border-bright)" stroke-width="2"/>
    <polygon points="0,35 1,40 2,35" fill="var(--accent)"/>
  </svg>
</div>
```

```css
.connector-label {
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--text-dim);
  text-transform: uppercase;
  letter-spacing: 1px;
}
```
