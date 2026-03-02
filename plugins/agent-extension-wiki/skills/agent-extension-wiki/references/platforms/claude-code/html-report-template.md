# HTML Report Template

Style and structure guide for the report-writer agent. The agent generates a self-contained HTML file following this specification.

## External Dependencies (CDN only)

```html
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Azeret+Mono:wght@400;500&display=swap" rel="stylesheet">
<script src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js"></script>
```

## CSS Style Guide

### Base

```css
:root {
  --bg: #ffffff;
  --bg-secondary: #f8fafc;
  --surface: #ffffff;
  --surface-elevated: #ffffff;
  --surface-recessed: #f1f5f9;
  --text: #1e293b;
  --text-secondary: #64748b;
  --border: #e2e8f0;
  --accent: #0891b2;
  --accent-dim: rgba(8,145,178,0.08);
  --accent-text: #0e7490;
  --success: #16a34a;
  --warning: #ca8a04;
  --danger: #dc2626;
  --danger-high: #ea580c;
  --font-body: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-mono: 'Azeret Mono', ui-monospace, 'SFMono-Regular', monospace;
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.04);
  --shadow-md: 0 2px 8px rgba(0,0,0,0.06);
  --shadow-lg: 0 8px 24px rgba(0,0,0,0.08);
  --shadow-hero: 0 12px 32px rgba(0,0,0,0.10);
}
@media (prefers-color-scheme: dark) {
  :root {
    --bg: #0d1117;
    --bg-secondary: #161b22;
    --surface: #161b22;
    --surface-elevated: #1c2333;
    --surface-recessed: #0d1117;
    --text: #e6edf3;
    --text-secondary: #8b949e;
    --border: #30363d;
    --accent: #22d3ee;
    --accent-dim: rgba(34,211,238,0.08);
    --accent-text: #67e8f9;
    --success: #3fb950;
    --warning: #d29922;
    --danger: #f85149;
    --danger-high: #f0883e;
    --shadow-sm: 0 1px 2px rgba(0,0,0,0.2);
    --shadow-md: 0 2px 8px rgba(0,0,0,0.3);
    --shadow-lg: 0 8px 24px rgba(0,0,0,0.4);
    --shadow-hero: 0 12px 32px rgba(0,0,0,0.5);
  }
}
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  font-family: var(--font-body);
  color: var(--text);
  background: var(--bg-secondary);
  background-image: radial-gradient(circle at 1px 1px, var(--border) 1px, transparent 0);
  background-size: 24px 24px;
  line-height: 1.6;
}
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}
@media (prefers-reduced-motion: reduce) {
  @keyframes fadeUp { from { opacity: 1; transform: none; } to { opacity: 1; transform: none; } }
}
.container { max-width: 900px; margin: 0 auto; padding: 2rem 1rem; }
```

### Cards

```css
.card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  min-width: 0;
  box-shadow: var(--shadow-sm);
  animation: fadeUp 0.4s ease both;
  animation-delay: calc(var(--i, 0) * 0.06s);
}
.card--hero {
  background: var(--surface-elevated);
  box-shadow: var(--shadow-hero);
}
.card--elevated {
  background: var(--surface-elevated);
  box-shadow: var(--shadow-lg);
}
.card--recessed {
  background: var(--surface-recessed);
  box-shadow: none;
}
.card h2 {
  font-size: 1.25rem;
  font-weight: 700;
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid var(--accent);
}
```

### Risk Level Colors

```css
.risk-critical { color: var(--danger); font-weight: 700; }
.risk-high { color: var(--danger-high); font-weight: 600; }
.risk-medium { color: var(--warning); font-weight: 600; }
.risk-low { color: var(--success); }
```

### Tables

```css
.table-wrapper { overflow-x: auto; -webkit-overflow-scrolling: touch; margin-bottom: 1rem; }
table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
th {
  background: var(--surface-recessed);
  font-weight: 600;
  text-align: left;
  padding: 0.5rem 0.75rem;
  position: sticky;
  top: 0;
  z-index: 2;
}
td { padding: 0.5rem 0.75rem; border-bottom: 1px solid var(--border); }
tr:nth-child(even) { background: var(--accent-dim); }
tr:hover { background: var(--bg-secondary); }
```

### Navigation TOC

```css
.toc {
  position: sticky;
  top: 0;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  padding: 0.75rem 1rem;
  z-index: 100;
  display: flex;
  gap: 1rem;
  overflow-x: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
  justify-content: center;
}
.toc::-webkit-scrollbar { display: none; }
.toc a {
  color: var(--accent);
  text-decoration: none;
  font-size: 0.8rem;
  font-weight: 500;
  padding-bottom: 2px;
  white-space: nowrap;
  flex-shrink: 0;
}
.toc a:hover { text-decoration: underline; }
.toc a.active {
  color: var(--text);
  font-weight: 700;
  border-bottom: 2px solid var(--accent);
}
```

### Badges

```css
.badge {
  display: inline-block;
  padding: 0.125rem 0.5rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
}
.badge-skill { background: rgba(8,145,178,0.12); color: var(--accent-text); }
.badge-agent { background: rgba(202,138,4,0.12); color: var(--warning); }
.badge-hook { background: rgba(157,23,77,0.12); color: #ec4899; }
.badge-mcp { background: rgba(22,163,74,0.12); color: var(--success); }
.badge-lsp { background: rgba(55,48,163,0.12); color: #818cf8; }
.badge-command { background: rgba(107,33,168,0.12); color: #a78bfa; }
```

### Concept Terms

```css
.concept-term {
  position: relative;
  border-bottom: 1px dotted var(--text-secondary);
  cursor: default;
}
.concept-first {
  border-bottom-style: dashed;
  border-bottom-color: var(--accent);
}
.concept-help-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  color: var(--text-secondary);
  font-size: 0.6rem;
  font-weight: 700;
  cursor: pointer;
  margin-left: 2px;
  vertical-align: super;
  line-height: 1;
}
.concept-help-btn:hover {
  background: var(--accent);
  color: white;
  border-color: var(--accent);
}
.concept-popover {
  display: none;
  position: absolute;
  bottom: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
  width: 280px;
  background: var(--surface-elevated);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 0.75rem;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  z-index: 200;
  font-size: 0.8rem;
  line-height: 1.5;
}
.concept-popover.visible { display: block; }
.concept-popover[data-category="platform"] { border-top: 3px solid var(--accent); }
.concept-popover[data-category="config"] { border-top: 3px solid var(--text-secondary); }
.concept-popover[data-category="report"] { border-top: 3px solid var(--success); }
.concept-popover-category {
  font-size: 0.65rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.25rem;
}
.concept-popover-category.platform { color: var(--accent); }
.concept-popover-category.config { color: var(--text-secondary); }
.concept-popover-category.report { color: var(--success); }
.concept-popover-title {
  font-weight: 700;
  font-size: 0.85rem;
  margin-bottom: 0.25rem;
}
.concept-popover-body {
  color: var(--text-secondary);
  margin-bottom: 0.5rem;
}
.concept-popover-link {
  font-size: 0.75rem;
  color: var(--accent);
  text-decoration: none;
}
.concept-popover-link:hover { text-decoration: underline; }
```

### Section Intros

```css
.section-intro {
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin-bottom: 1rem;
  padding: 0.5rem 0.75rem;
  background: linear-gradient(135deg, var(--accent-dim) 0%, var(--bg-secondary) 100%);
  border-radius: 6px;
  border-left: 3px solid var(--accent);
  line-height: 1.6;
}
```

### At-a-Glance

```css
.at-a-glance {
  margin-bottom: 1rem;
  padding: 1rem;
  border-left: 3px solid var(--success);
  background: linear-gradient(135deg, rgba(22,163,74,0.06) 0%, var(--surface) 100%);
  border-radius: 0 8px 8px 0;
}
.glance-summary {
  font-size: 1rem;
  font-weight: 500;
  line-height: 1.7;
  color: var(--text);
  margin-bottom: 0.75rem;
}
.glance-features {
  list-style: none;
  padding: 0;
  margin-bottom: 0.75rem;
}
.glance-features li {
  padding: 0.25rem 0;
  padding-left: 1.25rem;
  position: relative;
  font-size: 0.9rem;
  color: var(--text);
}
.glance-features li::before {
  content: '→';
  position: absolute;
  left: 0;
  color: var(--success);
  font-weight: 700;
}
.summary-bullets {
  list-style: none;
  padding: 0;
  margin: 0;
  font-size: 0.85rem;
  color: var(--text-secondary);
  border-top: 1px solid var(--border);
  padding-top: 0.75rem;
}
.summary-bullets li {
  margin-bottom: 0.25rem;
}
.summary-bullets strong {
  color: var(--text);
}
```

### Component Cards

```css
.component-card {
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 0.75rem;
  background: var(--surface);
  min-width: 0;
}
.card-essentials {
  display: flex;
  align-items: baseline;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
}
.card-essentials .component-name {
  font-weight: 600;
  font-size: 0.95rem;
}
.card-essentials .component-purpose {
  font-size: 0.85rem;
  color: var(--text-secondary);
}
.card-details summary {
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 0.25rem 0;
}
.card-details summary:hover { color: var(--text); }
.card-details-content {
  font-size: 0.8rem;
  padding: 0.5rem 0;
  color: var(--text-secondary);
}
.card-details-content table {
  margin-top: 0.25rem;
}
```

### Security Context & Limitations

```css
.security-summary {
  margin-bottom: 1rem;
}
.risk-context {
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin-top: 0.5rem;
  line-height: 1.6;
}
.report-limitations {
  margin-top: 1rem;
  padding: 0.75rem 1rem;
  background: rgba(202,138,4,0.06);
  border: 1px solid rgba(202,138,4,0.2);
  border-radius: 6px;
  font-size: 0.8rem;
  color: var(--text-secondary);
  line-height: 1.6;
}
.report-limitations strong {
  color: var(--warning);
  font-size: 0.85rem;
}
.report-limitations ul {
  margin-top: 0.5rem;
  padding-left: 1.25rem;
}
.report-limitations li {
  margin-bottom: 0.25rem;
}
```

### Component Tabs

```css
.tab-container {
  margin-bottom: 1rem;
}
.tab-buttons {
  display: flex;
  border-bottom: 2px solid var(--border);
  gap: 0;
  margin-bottom: 1rem;
}
.tab-btn {
  padding: 0.5rem 1rem;
  border: none;
  background: none;
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--text-secondary);
  cursor: pointer;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  transition: color 0.2s, border-color 0.2s;
}
.tab-btn:hover {
  color: var(--text);
}
.tab-btn.active {
  color: var(--accent);
  border-bottom-color: var(--accent);
  font-weight: 600;
}
.tab-count {
  display: inline-block;
  background: var(--bg-secondary);
  color: var(--text-secondary);
  font-size: 0.7rem;
  padding: 0.1rem 0.4rem;
  border-radius: 9999px;
  margin-left: 0.3rem;
  font-weight: 600;
}
.tab-btn.active .tab-count {
  background: var(--accent-dim);
  color: var(--accent);
}
.tab-panel { min-width: 0; }
.tab-panel {
  display: none;
}
.tab-panel.active {
  display: block;
}
```

### Design Philosophy

```css
.design-philosophy {
  margin-bottom: 1.5rem;
}
.philosophy-item {
  background: linear-gradient(135deg, var(--accent-dim) 0%, var(--surface) 100%);
  border-left: 3px solid var(--accent);
  padding: 0.75rem 1rem;
  margin-bottom: 0.5rem;
  border-radius: 0 8px 8px 0;
}
.philosophy-name {
  font-weight: 700;
  font-size: 0.9rem;
  color: var(--text);
}
.philosophy-desc {
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin-top: 0.25rem;
}
```

### Plugin Profile

```css
.profile-inventory {
  margin-bottom: 1.5rem;
}
.inv-row {
  display: flex;
  align-items: center;
  margin-bottom: 0.4rem;
  gap: 0.75rem;
}
.inv-label {
  width: 140px;
  font-size: 0.85rem;
  font-weight: 500;
}
.inv-bar {
  height: 20px;
  background: var(--accent);
  border-radius: 4px;
  min-width: 4px;
  transition: width 0.3s;
}
.inv-count {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-secondary);
  width: 30px;
}
.profile-docs {
  margin-bottom: 1.5rem;
}
.doc-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
.doc-item {
  padding: 0.35rem 0.75rem;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 500;
  border: 1px solid var(--border);
}
.doc-item.pass {
  background: rgba(22,163,74,0.1);
  color: var(--success);
  border-color: rgba(22,163,74,0.2);
}
.doc-item.fail {
  background: rgba(220,38,38,0.06);
  color: var(--danger);
  border-color: rgba(220,38,38,0.2);
}
.profile-security {
  margin-bottom: 1.5rem;
}
.risk-badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 6px;
  font-weight: 700;
  font-size: 0.9rem;
}
.risk-badge.critical { background: rgba(220,38,38,0.1); color: var(--danger); }
.risk-badge.high { background: rgba(234,88,12,0.1); color: var(--danger-high); }
.risk-badge.medium { background: rgba(202,138,4,0.1); color: var(--warning); }
.risk-badge.low { background: rgba(22,163,74,0.1); color: var(--success); }
.risk-counts {
  display: inline-block;
  margin-left: 0.75rem;
  font-size: 0.85rem;
  color: var(--text-secondary);
}
.profile-meta {
  margin-bottom: 1.5rem;
  display: flex;
  gap: 2rem;
  font-size: 0.85rem;
  color: var(--text-secondary);
}
.profile-quality {
  margin-top: 1rem;
}
.check {
  padding: 0.25rem 0.5rem;
  font-size: 0.875rem;
}
.check.pass { color: var(--success); }
.check.fail { color: var(--danger); }
```

## Section Structure

### 1. Header

```html
<header class="card card--hero" style="text-align:center; border-left: 4px solid var(--accent); --i: 0;">
  <h1>{plugin-name}</h1>
  <p style="color:var(--text-secondary);">v{version} &bull; {author} &bull; {license}</p>
  <p style="font-size:0.8rem; color:var(--text-secondary); font-family: var(--font-mono);">Generated by Agent Extension Wiki &bull; {date}</p>
</header>
```

### 2. Plugin Overview

Between header and architecture. Blue left-border card with At-a-Glance summary, stat boxes, and metadata.

```html
<div class="card card--hero plugin-overview" style="--i: 1;">
  <h2>Plugin Overview</h2>

  <!-- At-a-Glance integrated area (replaces old .plugin-summary) -->
  <div class="at-a-glance">
    <p class="glance-summary">{at-a-glance sentence — non-technical}</p>
    <ul class="glance-features">
      <li>{feature 1}</li>
      <li>{feature 2}</li>
      <li>{feature 3}</li>
    </ul>
    <ul class="summary-bullets">
      <li><strong>What</strong>: {what}</li>
      <li><strong>How</strong>: {how}</li>
      <li><strong>Unique</strong>: {unique}</li>
    </ul>
  </div>

  <div class="overview-stats">
    <div class="stat-box"><div class="stat-number">{n}</div><div class="stat-label">Skills</div></div>
    <div class="stat-box"><div class="stat-number">{n}</div><div class="stat-label">Agents</div></div>
    <div class="stat-box"><div class="stat-number">{n}</div><div class="stat-label">Commands</div></div>
    <div class="stat-box"><div class="stat-number">{n}</div><div class="stat-label">Hooks</div></div>
  </div>
  <div class="overview-meta">
    <span><strong>Pattern:</strong> {orchestrator/standalone/library/hybrid}</span>
    <span><strong>Target Users:</strong> {target user description}</span>
  </div>
</div>
```

```css
.plugin-overview {
  border-left: 4px solid var(--accent);
}
.overview-stats {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
}
.stat-box {
  flex: 1;
  text-align: center;
  padding: 0.75rem;
  background: var(--surface-recessed);
  border-radius: 8px;
  border: 1px solid var(--border);
}
.stat-number {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--accent);
}
.stat-label {
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--text-secondary);
  text-transform: uppercase;
}
.overview-meta {
  display: flex;
  gap: 2rem;
  font-size: 0.85rem;
  color: var(--text-secondary);
}
```

### 3. Architecture

Includes section intro, design philosophy, component relationship diagram, data flow diagram, and workflow sequence diagrams.

```html
<div class="card" style="--i: 2;">
  <h2>Architecture</h2>
  <p class="section-intro">{translated section-intro — see default texts table}</p>
  <!-- design philosophy, diagrams, description follow -->
</div>
```

**Design philosophy block** (after section intro, before diagrams):

```html
<div class="design-philosophy">
  <div class="philosophy-item">
    <div class="philosophy-name">{Principle Name}</div>
    <div class="philosophy-desc">{1-2 sentence explanation}</div>
  </div>
  <!-- repeat for each principle (1-3) -->
</div>
```

Mermaid diagrams are wrapped in a clickable container with fullscreen overlay support:

```html
<div class="card" style="--i: 2;">
  <h2>Architecture</h2>
  <div class="design-philosophy">
    <!-- philosophy items -->
  </div>
  <div class="diagram-container" data-scale="1">
    <div class="diagram-zoom-controls">
      <button class="diagram-zoom-btn" onclick="inlineZoom(this.closest('.diagram-container'),1.2)" title="Zoom in">+</button>
      <button class="diagram-zoom-btn" onclick="inlineZoom(this.closest('.diagram-container'),0.8)" title="Zoom out">&minus;</button>
      <button class="diagram-zoom-btn" onclick="inlineZoom(this.closest('.diagram-container'),0)" title="Reset">&#x21bb;</button>
      <button class="diagram-zoom-btn" onclick="openDiagramOverlay(this.closest('.diagram-container'))" title="Fullscreen">&#x26F6;</button>
    </div>
    <div class="diagram-hint">Scroll to zoom &middot; Click fullscreen</div>
    <pre class="mermaid">
      graph TD
        S1["SKILL: name"] -->|delegates| A1["AGENT: name"]
    </pre>
  </div>
  <!-- Additional diagram-containers for data flow / sequence diagrams -->
  <p>{brief data flow description}</p>
</div>

<!-- Fullscreen overlay (once, at end of body) -->
<div class="diagram-overlay" id="diagramOverlay">
  <div class="overlay-controls">
    <button onclick="zoomDiagram(1.2)">+</button>
    <button onclick="zoomDiagram(0.8)">−</button>
    <button onclick="closeDiagramOverlay(event)">✕</button>
  </div>
  <div class="overlay-content" id="overlayContent"></div>
</div>
```

```css
.diagram-container {
  position: relative;
  padding: 1rem;
  border: 1px solid var(--border);
  border-radius: 8px;
  transition: box-shadow 0.2s;
  overflow: auto;
  margin-bottom: 1rem;
  cursor: grab;
}
.diagram-container:active { cursor: grabbing; }
.diagram-container:hover {
  box-shadow: var(--shadow-md);
}
.diagram-zoom-controls {
  position: absolute;
  top: 8px;
  right: 8px;
  display: flex;
  gap: 4px;
  z-index: 10;
  opacity: 0;
  transition: opacity 0.2s;
}
.diagram-container:hover .diagram-zoom-controls { opacity: 1; }
.diagram-zoom-btn {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text-secondary);
  font-size: 0.85rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.diagram-zoom-btn:hover {
  background: var(--accent-dim);
  color: var(--accent);
  border-color: var(--accent);
}
.mermaid .nodeLabel { font-family: var(--font-body); }
.mermaid .edgeLabel { font-family: var(--font-mono); font-size: 0.75rem; }
.diagram-hint {
  position: absolute;
  top: 8px;
  right: 12px;
  font-size: 0.7rem;
  color: var(--text-secondary);
  background: var(--bg-secondary);
  padding: 2px 8px;
  border-radius: 4px;
  opacity: 0;
  transition: opacity 0.2s;
}
.diagram-container:hover .diagram-hint {
  opacity: 1;
}
.diagram-overlay {
  display: none;
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.8);
  z-index: 1000;
  justify-content: center;
  align-items: center;
}
.diagram-overlay.active {
  display: flex;
}
.overlay-controls {
  position: fixed;
  top: 1rem;
  right: 1rem;
  display: flex;
  gap: 0.5rem;
  z-index: 1001;
}
.overlay-controls button {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  background: var(--surface);
  color: var(--text);
  font-size: 1.1rem;
  cursor: pointer;
  box-shadow: var(--shadow-md);
}
.overlay-controls button:hover {
  background: var(--bg-secondary);
}
.overlay-content {
  background: var(--surface);
  border-radius: 12px;
  padding: 2rem;
  max-width: 95vw;
  max-height: 90vh;
  overflow: hidden;
  cursor: grab;
  transform: translate(0px, 0px) scale(1);
}
```

### 4. Components

Component cards grouped by type with **tab UI**. Each type is a tab panel. Section intro at top, before tabs.

**Tab structure**:

```html
<div class="card" style="--i: 4;">
  <h2>Components</h2>
  <p class="section-intro">{translated section-intro — see default texts table}</p>
  <div class="tab-container">
    <div class="tab-buttons">
      <!-- Only include tabs for types with count > 0. Default active = type with most components -->
      <button class="tab-btn active" onclick="switchTab(this.closest('.tab-container'), 'skills')">
        Skills <span class="tab-count">{n}</span>
      </button>
      <button class="tab-btn" onclick="switchTab(this.closest('.tab-container'), 'agents')">
        Agents <span class="tab-count">{n}</span>
      </button>
      <button class="tab-btn" onclick="switchTab(this.closest('.tab-container'), 'commands')">
        Commands <span class="tab-count">{n}</span>
      </button>
      <button class="tab-btn" onclick="switchTab(this.closest('.tab-container'), 'hooks')">
        Hooks <span class="tab-count">{n}</span>
      </button>
      <!-- MCP/LSP tabs only if present -->
    </div>
    <div class="tab-panel active" data-tab="skills">
      <!-- Skills content: section-desc + tables + raw-data-viewer -->
    </div>
    <div class="tab-panel" data-tab="agents">
      <!-- Agents content with component-card pattern -->
    </div>
    <div class="tab-panel" data-tab="commands">
      <!-- Commands content -->
    </div>
    <div class="tab-panel" data-tab="hooks">
      <!-- Hooks content -->
    </div>
  </div>
</div>
```

Each tab panel shows:
- Badge with component type
- Name and purpose (1-line)
- Key attributes (tools, model, constraints)

**Component card pattern** (for Agents and Active Skills with notable features):

```html
<div class="component-card">
  <div class="card-essentials">
    <span class="badge badge-agent">Agent</span>
    <span class="component-name">{name}</span>
    <span class="component-purpose">— {purpose}</span>
  </div>
  <details class="card-details">
    <summary>Technical details</summary>
    <div class="card-details-content">
      <table>
        <tr><td><strong>Model</strong></td><td>{model}</td></tr>
        <tr><td><strong>Tools</strong></td><td>{tools}</td></tr>
        <tr><td><strong>maxTurns</strong></td><td>{n}</td></tr>
      </table>
    </div>
  </details>
  <!-- agent-delegation-trigger and raw-data-viewer follow as before -->
</div>
```

**Section descriptions**: Each component sub-section MUST include a `.section-desc` paragraph explaining the component type:

```css
.section-desc {
  font-size: 0.8rem;
  color: var(--text-secondary);
  margin-bottom: 1rem;
  padding: 0.5rem 0.75rem;
  background: var(--bg-secondary);
  border-radius: 6px;
  line-height: 1.5;
}
```

Required description texts per sub-section (translate to target language):

| Sub-section | Description |
|-------------|-------------|
| Active Skills | Skills with tool access, agent delegation, or hooks. Claude auto-triggers them or users invoke via `/name`. |
| Reference Skills | Pure knowledge documents. Claude reads them as context and applies guidelines. No tool access or side effects. |
| Commands | Legacy slash commands from `commands/` directory. Modern plugins use `skills/` instead. |
| Agents | Specialized sub-agents that Claude auto-delegates to. The `description` field determines when delegation occurs. |
| Hooks | Automations triggered by Claude Code lifecycle events (tool use, session start/end, etc.). |

**Agent delegation trigger block**: After each agent card, show the agent's `description` field verbatim:

```html
<div class="agent-delegation-trigger">
  <strong>Delegation trigger:</strong>
  <p>{agent description field verbatim, first 3 sentences}</p>
</div>
```

```css
.agent-delegation-trigger {
  font-size: 0.8rem;
  padding: 8px 12px;
  background: var(--bg-secondary);
  border-left: 3px solid var(--accent);
  border-radius: 4px;
  margin-top: 0.5rem;
  color: var(--text-secondary);
}
.agent-delegation-trigger strong {
  color: var(--text);
  font-size: 0.75rem;
  text-transform: uppercase;
}
```

**Raw data viewer**: Inside component cards for active skills and agents, include a collapsible frontmatter viewer:

```html
<details class="raw-data-viewer">
  <summary>View source (frontmatter)</summary>
  <pre><code>---
name: ...
description: ...
allowed-tools: ...
---</code></pre>
</details>
```

```css
.raw-data-viewer {
  margin-top: 0.75rem;
  border: 1px solid var(--border);
  border-radius: 6px;
  overflow: hidden;
}
.raw-data-viewer summary {
  padding: 0.5rem 0.75rem;
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--text-secondary);
  background: var(--bg-secondary);
  cursor: pointer;
}
.raw-data-viewer summary:hover {
  background: var(--accent-dim);
}
.raw-data-viewer pre {
  margin: 0;
  padding: 0.75rem;
  font-size: 0.75rem;
  font-family: var(--font-mono);
  background: var(--surface-recessed);
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 400px;
  overflow-y: auto;
  line-height: 1.5;
}
```

**Commands table**: Use Purpose + Arguments + Notable columns. Wrap in `.table-wrapper`:

```html
<div class="table-wrapper">
  <table>
    <thead><tr><th>Command</th><th>Purpose</th><th>Arguments</th><th>Notable</th></tr></thead>
    <tbody><tr><td>{name}</td><td>{description}</td><td>{argument-hint}</td><td>{redirect/model/etc.}</td></tr></tbody>
  </table>
</div>
```

### 5. Usage Guide

```html
<div class="card" style="--i: 3;">
  <h2>Usage</h2>
  <p class="section-intro">{translated section-intro — see default texts table}</p>
  <!-- Installation commands, prerequisites table, trigger phrases, when to use / not to use -->
</div>
```

### 6. Security Audit

Section intro at top, risk summary with context, permission matrix, findings, and analysis limitations disclaimer.

```html
<div class="card" style="--i: 5;">
  <h2>Security Audit</h2>
  <p class="section-intro">{translated section-intro — see default texts table}</p>

  <div class="security-summary">
    <span class="risk-badge {level}">{LEVEL}</span>
    <span class="risk-counts">{n}C / {n}H / {n}M / {n}L</span>
    <p class="risk-context">{1-2 sentence explanation of what this risk level means}</p>
  </div>

  <!-- Permission matrix table -->
  <!-- Findings as <details> blocks: -->
  <details>
    <summary><span class="risk-{level}">[{SEVERITY}]</span> #{n}: {Title}</summary>
    <p>{description}</p>
    <p><strong>Fix:</strong> {recommendation}</p>
  </details>

  <div class="report-limitations">
    <strong>{translated: Limitations of this analysis}</strong>
    <ul>
      <li>{translated: Static analysis only — runtime behavior is not verified}</li>
      <li>{translated: Actual network traffic from MCP servers is not inspected}</li>
      <li>{translated: Security vulnerabilities in dependency packages are outside scope}</li>
    </ul>
  </div>
</div>
```

### 7. Dependencies

```html
<div class="card" style="--i: 6;">
  <h2>Dependencies</h2>
  <p class="section-intro">{translated section-intro — see default texts table}</p>
  <!-- Tool dependencies, external dependencies, environment variables, model requirements — all as tables -->
</div>
```

### 8. Plugin Profile

Replaces the old Score Overview and Quality sections. Shows objective facts about the plugin.

```html
<div class="card" style="--i: 7;">
  <h2>Plugin Profile</h2>
  <p class="section-intro">{translated section-intro — see default texts table}</p>

  <h3>Component Inventory</h3>
  <div class="profile-inventory">
    <div class="inv-row">
      <span class="inv-label">Active Skills</span>
      <div class="inv-bar" style="width: {percentage}%"></div>
      <span class="inv-count">{n}</span>
    </div>
    <!-- repeat for each component type with count > 0 -->
  </div>

  <h3>Documentation</h3>
  <div class="profile-docs">
    <div class="doc-grid">
      <span class="doc-item pass">&#x2713; README.md</span>
      <span class="doc-item fail">&#x2717; CHANGELOG.md</span>
      <span class="doc-item pass">&#x2713; LICENSE</span>
      <!-- etc. -->
    </div>
  </div>

  <h3>Security Risk</h3>
  <div class="profile-security">
    <span class="risk-badge {level}">{LEVEL}</span>
    <span class="risk-counts">{n}C / {n}H / {n}M / {n}L</span>
  </div>

  <div class="profile-meta">
    <span><strong>Pattern:</strong> {pattern}</span>
    <span><strong>Target Users:</strong> {description}</span>
  </div>

  <h3>Quality Checklist</h3>
  <div class="profile-quality">
    <div class="check pass">&#x2713; {description}</div>
    <div class="check fail">&#x2717; {description} — {detail}</div>
  </div>
</div>
```

### 9. Footer

```html
<footer style="text-align:center; padding:2rem; color:var(--text-secondary); font-size:0.8rem;">
  Generated by Agent Extension Wiki &bull; {date}
</footer>
```

## JavaScript

### Mermaid Initialization

```html
<script>
  (function() {
    var isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    mermaid.initialize({
      startOnLoad: true,
      theme: 'base',
      securityLevel: 'loose',
      themeVariables: isDark ? {
        primaryColor: '#1c2333',
        primaryTextColor: '#e6edf3',
        primaryBorderColor: '#30363d',
        lineColor: '#8b949e',
        secondaryColor: '#161b22',
        tertiaryColor: '#0d1117',
        fontFamily: 'Plus Jakarta Sans, sans-serif',
        fontSize: '14px'
      } : {
        primaryColor: '#f0fdfa',
        primaryTextColor: '#1e293b',
        primaryBorderColor: '#e2e8f0',
        lineColor: '#64748b',
        secondaryColor: '#f8fafc',
        tertiaryColor: '#ffffff',
        fontFamily: 'Plus Jakarta Sans, sans-serif',
        fontSize: '14px'
      }
    });
  })();
</script>
```

### Concept Term Tooltips

The report-writer wraps concept terms in HTML like: `<span class="concept-term" data-concept="skill">Skill</span>`. The JS below finds each `[data-concept]` element, marks the first occurrence of each concept, and inserts a `?` help button with a popover.

```html
<script>
  // Concept definitions — translate "body" values to the target language at generation time.
  // Titles and links remain untranslated.
  var conceptData = {
    "skill": {
      "category": "platform",
      "title": "Skill",
      "body": "A knowledge module that teaches Claude how to handle specific tasks. Defined by a SKILL.md file inside a folder.",
      "link": "https://code.claude.com/docs/skills"
    },
    "agent": {
      "category": "platform",
      "title": "Agent",
      "body": "A specialized AI assistant. Claude delegates tasks to it and it runs independently in a separate context.",
      "link": "https://code.claude.com/docs/sub-agents"
    },
    "hook": {
      "category": "platform",
      "title": "Hook",
      "body": "An automation handler that reacts to agent lifecycle events (tool use, session start, etc.).",
      "link": "https://code.claude.com/docs/hooks"
    },
    "mcp-server": {
      "category": "platform",
      "title": "MCP Server",
      "body": "A bridge that connects to external services (DB, API, etc.). Adds new tools to Claude.",
      "link": "https://code.claude.com/docs/mcp"
    },
    "lsp-server": {
      "category": "platform",
      "title": "LSP Server",
      "body": "A language server providing real-time diagnostics, autocomplete, go-to-definition, etc. during code editing.",
      "link": "https://code.claude.com/docs/plugins-reference"
    },
    "command": {
      "category": "platform",
      "title": "Command",
      "body": "A slash command invoked by /name. Legacy approach — modern plugins should use Skills instead.",
      "link": "https://code.claude.com/docs/plugins"
    },
    "context-fork": {
      "category": "config",
      "title": "context: fork",
      "body": "A mode where a Skill runs in a separate Subagent session, isolated from the main conversation.",
      "link": "https://code.claude.com/docs/skills"
    },
    "allowed-tools": {
      "category": "config",
      "title": "allowed-tools",
      "body": "The list of tools a Skill/Agent is allowed to use. If unset, all tools are inherited.",
      "link": "https://code.claude.com/docs/plugins-reference"
    },
    "permission-mode": {
      "category": "config",
      "title": "permissionMode",
      "body": "How user approval is handled for tool execution. Options: default, acceptEdits, dontAsk, bypassPermissions, plan.",
      "link": "https://code.claude.com/docs/sub-agents"
    },
    "max-turns": {
      "category": "config",
      "title": "maxTurns",
      "body": "Maximum number of turns an Agent can perform. Automatically stops when exceeded.",
      "link": "https://code.claude.com/docs/sub-agents"
    },
    "plugin-profile": {
      "category": "report",
      "title": "Plugin Profile",
      "body": "A report section that summarizes the plugin's objective status — components, documentation, security, and quality.",
      "link": "#plugin-profile"
    },
    "orchestrator-pattern": {
      "category": "report",
      "title": "Orchestrator Pattern",
      "body": "A pattern this report uses to classify plugin architecture. Not an official platform term.",
      "link": "#plugin-profile"
    }
  };

  // Category labels — translate to the target language at generation time.
  var categoryLabels = {
    "platform": "Platform Feature",
    "config": "Config Value",
    "report": "Report Term"
  };

  document.addEventListener('DOMContentLoaded', function() {
    var seen = {};
    document.querySelectorAll('[data-concept]').forEach(function(el) {
      var id = el.getAttribute('data-concept');
      var def = conceptData[id];
      if (!def) return;

      if (!seen[id]) {
        seen[id] = true;
        el.classList.add('concept-first');

        // Create ? button
        var btn = document.createElement('span');
        btn.className = 'concept-help-btn';
        btn.textContent = '?';
        btn.setAttribute('aria-label', 'Show definition');

        // Create popover
        var popover = document.createElement('div');
        popover.className = 'concept-popover';
        popover.setAttribute('data-category', def.category);
        popover.innerHTML =
          '<div class="concept-popover-category ' + def.category + '">' + categoryLabels[def.category] + '</div>' +
          '<div class="concept-popover-title">' + def.title + '</div>' +
          '<div class="concept-popover-body">' + def.body + '</div>' +
          '<a class="concept-popover-link" href="' + def.link + '" target="_blank">Documentation →</a>';

        btn.addEventListener('click', function(e) {
          e.stopPropagation();
          // Close other popovers
          document.querySelectorAll('.concept-popover.visible').forEach(function(p) {
            if (p !== popover) p.classList.remove('visible');
          });
          popover.classList.toggle('visible');
        });

        el.style.position = 'relative';
        el.appendChild(btn);
        el.appendChild(popover);
      }
    });

    // Close popovers on outside click
    document.addEventListener('click', function() {
      document.querySelectorAll('.concept-popover.visible').forEach(function(p) {
        p.classList.remove('visible');
      });
    });
  });
</script>
```

**HTML wrapping guide for report-writer**: Wrap every occurrence of a concept term like this:

```html
<span class="concept-term" data-concept="skill">Skill</span>
```

The report-writer only needs to add the `data-concept` wrapper. The JS handles first-occurrence detection and popover insertion automatically.

### Component Tab Switching

```html
<script>
  function switchTab(container, tabName) {
    container.querySelectorAll('.tab-btn').forEach(function(btn) {
      btn.classList.remove('active');
      if (btn.textContent.toLowerCase().includes(tabName.toLowerCase()) ||
          btn.getAttribute('data-tab') === tabName) {
        btn.classList.add('active');
      }
    });
    container.querySelectorAll('.tab-panel').forEach(function(panel) {
      panel.classList.remove('active');
      if (panel.getAttribute('data-tab') === tabName) {
        panel.classList.add('active');
      }
    });
  }
</script>
```

### Inline Diagram Zoom

Each `.diagram-container` has `+`/`−`/reset/fullscreen buttons. Scroll-to-zoom is also supported.

```html
<script>
  function inlineZoom(container, factor) {
    var svg = container.querySelector('svg');
    if (!svg) return;
    var scale = parseFloat(container.dataset.scale) || 1;
    if (factor === 0) { scale = 1; } else { scale *= factor; }
    scale = Math.max(0.3, Math.min(scale, 4));
    container.dataset.scale = scale;
    svg.style.transform = 'scale(' + scale + ')';
    svg.style.transformOrigin = 'top left';
  }

  document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('.diagram-container').forEach(function(container) {
      container.addEventListener('wheel', function(e) {
        if (!e.ctrlKey && !e.metaKey) return;
        e.preventDefault();
        var factor = e.deltaY < 0 ? 1.1 : 0.9;
        inlineZoom(container, factor);
      }, { passive: false });
    });
  });
</script>
```

### Diagram Fullscreen Overlay with Pan + Zoom

```html
<script>
  let currentScale = 1;
  let panX = 0;
  let panY = 0;
  let isPanning = false;
  let startX = 0;
  let startY = 0;

  function openDiagramOverlay(container) {
    const svg = container.querySelector('svg');
    if (!svg) return;
    const overlay = document.getElementById('diagramOverlay');
    const content = document.getElementById('overlayContent');
    content.innerHTML = '';
    content.appendChild(svg.cloneNode(true));
    currentScale = 1;
    panX = 0;
    panY = 0;
    applyTransform();
    overlay.classList.add('active');
  }

  function closeDiagramOverlay(e) {
    if (e && e.target.closest('.overlay-content') && !e.target.closest('.overlay-controls button')) return;
    document.getElementById('diagramOverlay').classList.remove('active');
  }

  function applyTransform() {
    document.getElementById('overlayContent').style.transform =
      'translate(' + panX + 'px, ' + panY + 'px) scale(' + currentScale + ')';
  }

  function zoomDiagram(factor) {
    currentScale *= factor;
    currentScale = Math.max(0.3, Math.min(currentScale, 5));
    applyTransform();
  }

  // Mouse wheel zoom (cursor-relative)
  document.addEventListener('DOMContentLoaded', function() {
    var overlayContent = document.getElementById('overlayContent');
    if (!overlayContent) return;

    overlayContent.addEventListener('wheel', function(e) {
      e.preventDefault();
      var rect = overlayContent.getBoundingClientRect();
      var mouseX = e.clientX - rect.left;
      var mouseY = e.clientY - rect.top;
      var factor = e.deltaY < 0 ? 1.1 : 0.9;
      var newScale = currentScale * factor;
      newScale = Math.max(0.3, Math.min(newScale, 5));
      var ratio = newScale / currentScale;
      panX = mouseX - ratio * (mouseX - panX);
      panY = mouseY - ratio * (mouseY - panY);
      currentScale = newScale;
      applyTransform();
    }, { passive: false });

    // Mouse drag panning
    overlayContent.addEventListener('mousedown', function(e) {
      if (e.button !== 0) return;
      isPanning = true;
      startX = e.clientX - panX;
      startY = e.clientY - panY;
      overlayContent.style.cursor = 'grabbing';
      e.preventDefault();
    });

    document.addEventListener('mousemove', function(e) {
      if (!isPanning) return;
      panX = e.clientX - startX;
      panY = e.clientY - startY;
      applyTransform();
    });

    document.addEventListener('mouseup', function() {
      if (!isPanning) return;
      isPanning = false;
      overlayContent.style.cursor = 'grab';
    });

    // Double-click to reset
    overlayContent.addEventListener('dblclick', function() {
      currentScale = 1;
      panX = 0;
      panY = 0;
      applyTransform();
    });
  });

  // Escape to close overlay
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      document.getElementById('diagramOverlay').classList.remove('active');
    }
  });
</script>
```

### TOC Active Highlight

```html
<script>
  document.addEventListener('DOMContentLoaded', function() {
    var tocLinks = document.querySelectorAll('.toc a');
    var sections = [];
    tocLinks.forEach(function(link) {
      var id = link.getAttribute('href');
      if (id && id.startsWith('#')) {
        var section = document.querySelector(id);
        if (section) sections.push({ el: section, link: link });
      }
    });

    if (sections.length === 0) return;

    var observer = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          tocLinks.forEach(function(l) { l.classList.remove('active'); });
          var match = sections.find(function(s) { return s.el === entry.target; });
          if (match) match.link.classList.add('active');
        }
      });
    }, { rootMargin: '-20% 0px -70% 0px' });

    sections.forEach(function(s) { observer.observe(s.el); });
  });
</script>
```

### Collapsible Sections (optional enhancement)

The `<details>/<summary>` elements are natively collapsible. No extra JS needed for basic functionality.

## Multilingual Support

- Translate section headers (Plugin Overview, Architecture, Usage, Components, Security, Dependencies, Plugin Profile, etc.)
- Translate labels (Author, License, Risk, Pattern, Target Users, etc.)
- Keep untranslated: component names, file paths, tool names, severity levels (CRITICAL/HIGH/MEDIUM/LOW), Mermaid diagram content
- **What/How/Unique labels**: Keep in English. Translate only the description text
- **Section intro texts**: Translate to target language. Default Korean texts are in the section intro table below
- **Concept popover texts**: Translate the `body` values and `categoryLabels` in `conceptData` JS to the target language
- Use `<html lang="{code}">` with appropriate language code (ko, en, ja, etc.)

### Section Intro Default Texts

Translate these to the target language at generation time.

| Section | Default text (English) |
|---------|----------------------|
| Architecture | Shows how this plugin is structured internally. |
| Usage | How to install and use this plugin. |
| Components | Lists the skills, agents, commands, hooks, and other components that make up this plugin. |
| Security Audit | Audit results for permissions, tool usage, and security risks. |
| Dependencies | Lists tools, external services, environment variables, and other dependencies required by this plugin. |
| Plugin Profile | Summarizes the plugin's objective status — components, documentation, security, and quality. |

## Anti-Slop Guardrails

### Forbidden

- **Fonts**: Inter, system-ui as primary font. Always use `var(--font-body)` / `var(--font-mono)`.
- **Colors**: Hardcoded HEX values (`#dbeafe`, `#f0fdf4`, `#fffbeb`, etc.) for backgrounds or borders. Use CSS variables or `rgba()`.
- **Patterns**: `box-shadow` with literal `rgba(0,0,0,...)` — use `var(--shadow-*)` tokens instead.
- **Emoji**: No emoji anywhere in the report (headings, badges, labels, section intros).
- **Gradients**: No multi-color rainbow gradients. Only subtle `linear-gradient` with `var(--accent-dim)` or `rgba()`.

### Required

- All color values must work in both light and dark mode (CSS variables or `rgba()`).
- Cards must use appropriate depth tier: `card--hero` for header/overview, `card--elevated` for primary content, plain `.card` for standard, `card--recessed` for embedded code.
- Tables must be wrapped in `.table-wrapper` for overflow protection.
- Mermaid diagrams must use `theme: 'base'` with dark mode detection and `themeVariables`.
- Font stacks: `var(--font-body)` for text, `var(--font-mono)` for code/labels/metadata.
- Stagger animation: cards should include `style="--i: N"` for sequential fade-in.
