# Agent Extension Visual — Section Structure

This document defines the 10-section structure for agent-extension-visual HTML reports. The visual-report-writer agent reads this file and renders each section using the HTML pattern snippets below.

All CSS classes (`.ve-card`, `.ve-card--hero`, `.ve-card--elevated`, `.ve-card--recessed`, depth tiers, status indicators) are defined in the shared `design-system/css-patterns.md`.

## Visual Language

| Color | Meaning | CSS Variable |
|-------|---------|-------------|
| Red | Critical risk | `var(--danger)` |
| Orange | High risk | `var(--danger-high)` |
| Amber | Medium risk / Warning | `var(--warning)` |
| Green | Low risk / Pass | `var(--success)` |
| Blue | Info / Context | `var(--info)` |

Use these consistently across all sections — risk badges, status indicators, severity markers, and Mermaid diagram nodes.

---

## Section 1: Header (Hero)

**Depth tier**: `.ve-card--hero`

The opening section. Show plugin identity, version, author, generation date, and overall risk badge.

```html
<section id="header" class="ve-card ve-card--hero" style="--i: 0">
  <h1>{plugin-name}</h1>
  <p class="hero-subtitle">Agent Extension Visual Report</p>
  <div class="scope-summary">
    <span class="scope-badge">v{version}</span>
    <span class="scope-badge">{author}</span>
    <span class="scope-badge">{generation-date}</span>
    <span class="scope-badge scope-badge--{risk-level}">{risk-level} Risk</span>
  </div>
  <div class="table-wrapper">
    <table class="meta-table">
      <tbody>
        <tr><td>Author</td><td>{author}</td></tr>
        <tr><td>License</td><td>{license}</td></tr>
        <tr><td>Keywords</td><td>{keywords}</td></tr>
        <tr><td>Risk Level</td><td><span class="risk-badge risk-badge--{level}">{CRITICAL|HIGH|MEDIUM|LOW}</span></td></tr>
      </tbody>
    </table>
  </div>
</section>
```

**Risk badge CSS** (add to inline styles):
```css
.meta-table { width: auto; }
.meta-table td:first-child { font-weight: 600; padding-right: 2rem; white-space: nowrap; }
.risk-badge { font-size: 0.75rem; font-weight: 700; text-transform: uppercase; padding: 0.2rem 0.6rem; border-radius: 4px; letter-spacing: 0.05em; }
.risk-badge--critical { background: color-mix(in srgb, var(--danger) 15%, transparent); color: var(--danger); }
.risk-badge--high { background: color-mix(in srgb, var(--danger-high, var(--danger)) 15%, transparent); color: var(--danger-high, var(--danger)); }
.risk-badge--medium { background: color-mix(in srgb, var(--warning) 15%, transparent); color: var(--warning); }
.risk-badge--low { background: color-mix(in srgb, var(--success) 15%, transparent); color: var(--success); }
```

---

## Section 2: Plugin Overview

**Depth tier**: `.ve-card--elevated`

At-a-glance summary with key features, what/how/unique breakdown, KPI stat cards (component counts), and a Chart.js doughnut for component distribution. Include pattern and target users.

```html
<section id="plugin-overview" class="ve-card ve-card--elevated" style="--i: 1">
  <h2>Plugin Overview</h2>

  <div class="overview-summary">
    <p class="hero-insight">{at-a-glance summary — 2-3 sentences}</p>
    <div class="what-how-unique">
      <div class="whu-item"><strong>What:</strong> {what the plugin does}</div>
      <div class="whu-item"><strong>How:</strong> {how it works}</div>
      <div class="whu-item"><strong>Unique:</strong> {what makes it different}</div>
    </div>
  </div>

  <h3>Key Features</h3>
  <ul class="feature-list">
    <li>{feature 1}</li>
    <li>{feature 2}</li>
    <!-- more features -->
  </ul>

  <div class="kpi-grid">
    <div class="kpi-card kpi-card--info">
      <span class="kpi-value">{n}</span>
      <span class="kpi-label">Skills</span>
    </div>
    <div class="kpi-card kpi-card--info">
      <span class="kpi-value">{n}</span>
      <span class="kpi-label">Agents</span>
    </div>
    <div class="kpi-card kpi-card--info">
      <span class="kpi-value">{n}</span>
      <span class="kpi-label">Commands</span>
    </div>
    <div class="kpi-card kpi-card--info">
      <span class="kpi-value">{n}</span>
      <span class="kpi-label">Hooks</span>
    </div>
  </div>
  <div class="chart-container">
    <canvas id="component-chart"></canvas>
  </div>

  <div class="pattern-target">
    <p><strong>Pattern:</strong> {primary pattern}</p>
    <p><strong>Target Users:</strong> {target user description}</p>
  </div>
</section>
```

**KPI grid CSS** (add to inline styles):
```css
.kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 1rem; margin: 1.5rem 0; }
.kpi-card { padding: 1.25rem; border-radius: 12px; text-align: center; }
.kpi-value { display: block; font-size: 2rem; font-weight: 700; font-family: var(--font-mono); }
.kpi-label { display: block; font-size: 0.85rem; opacity: 0.7; margin-top: 0.25rem; }
.kpi-card--success { background: color-mix(in srgb, var(--success) 12%, var(--surface-1)); color: var(--success); }
.kpi-card--danger { background: color-mix(in srgb, var(--danger) 12%, var(--surface-1)); color: var(--danger); }
.kpi-card--info { background: color-mix(in srgb, var(--info) 12%, var(--surface-1)); color: var(--info); }
.kpi-card--warning { background: color-mix(in srgb, var(--warning) 12%, var(--surface-1)); color: var(--warning); }
.chart-container { max-width: 400px; margin: 1.5rem auto; }
.what-how-unique { display: flex; flex-direction: column; gap: 0.5rem; margin: 1rem 0; }
.whu-item { padding: 0.5rem 0.75rem; background: var(--surface-1); border-radius: 6px; }
.pattern-target { margin-top: 1.5rem; padding: 1rem; background: var(--surface-1); border-radius: 8px; }
```

---

## Section 3: Architecture

**Depth tier**: `.ve-card` (default)

Design philosophy list, followed by Mermaid diagrams: component relationship graph, data flow, and workflow sequence.

```html
<section id="architecture" class="ve-card" style="--i: 2">
  <h2>Architecture</h2>

  <h3>Design Philosophy</h3>
  <ul class="philosophy-list">
    <li>{principle 1}</li>
    <li>{principle 2}</li>
    <!-- more principles -->
  </ul>

  <h3>Component Relationships</h3>
  <div class="mermaid-wrap">
    <div class="mermaid-controls">
      <button onclick="zoomIn(this)">+</button>
      <button onclick="zoomOut(this)">-</button>
      <button onclick="zoomReset(this)">Reset</button>
      <button onclick="toggleFullscreen(this)">Fullscreen</button>
    </div>
    <pre class="mermaid">
graph TD
    classDef skill fill:#dbeafe,stroke:#3b82f6,stroke-width:2px
    classDef agent fill:#d1fae5,stroke:#10b981,stroke-width:2px
    classDef hook fill:#fef3c7,stroke:#f59e0b,stroke-width:2px
    %% nodes and edges based on analysis data
    </pre>
  </div>

  <h3>Data Flow</h3>
  <div class="mermaid-wrap">
    <div class="mermaid-controls"><!-- zoom buttons --></div>
    <pre class="mermaid">
flowchart LR
    %% data flow based on analysis data
    </pre>
  </div>

  <h3>Workflow Sequence</h3>
  <div class="mermaid-wrap">
    <div class="mermaid-controls"><!-- zoom buttons --></div>
    <pre class="mermaid">
sequenceDiagram
    %% sequence based on analysis data
    </pre>
  </div>
</section>
```

Use `classDef` with semi-transparent fills only. Never use `color:` in classDef. See `mermaid-patterns.md` for zoom/fullscreen implementation.

---

## Section 4: Feature Deep Dive

**Depth tier**: `.ve-card--elevated`

Core mechanisms analysis — how the plugin's key features work internally, with reusable patterns and a primary workflow walkthrough.

```html
<section id="feature-deep-dive" class="ve-card ve-card--elevated" style="--i: 3">
  <h2>Feature Deep Dive</h2>
  <p class="lead">Core implementation mechanisms — reusable patterns for plugin development</p>

  <div class="mechanism-grid">
    <div class="mechanism-card">
      <div class="mechanism-header">
        <span class="mechanism-number">01</span>
        <h3>{mechanism name}</h3>
      </div>
      <p class="mechanism-enables"><strong>Enables:</strong> {user-facing capability}</p>
      <h4>How it works</h4>
      <ol class="mechanism-steps">
        <li>{step 1}</li>
        <li>{step 2}</li>
        <!-- more steps -->
      </ol>
      <h4>Key Files</h4>
      <ul><li><a href="{source-url}" class="source-link">{relative/path}</a></li></ul>
      <details>
        <summary>Code Pattern</summary>
        <pre><code>{core code/config pattern}</code></pre>
      </details>
      <p class="mechanism-reuse"><strong>Reuse:</strong> {how to adapt for other plugins}</p>
    </div>
    <!-- more mechanism cards -->
  </div>

  <h3>Primary Workflow Walkthrough</h3>
  <div class="workflow-trace">
    <div class="trace-step">
      <span class="trace-number">1</span>
      <div class="trace-content">
        <strong>{step title}</strong>
        <p>{description}</p>
        <a href="{source-url}" class="source-link">{file}</a>
      </div>
    </div>
    <!-- more trace steps -->
  </div>

  <!-- Annotated workflow sequence diagram -->
  <div class="mermaid-wrap">
    <div class="zoom-controls"><!-- zoom buttons --></div>
    <pre class="mermaid">
sequenceDiagram
    %% annotated workflow sequence based on analysis data
    </pre>
  </div>
</section>
```

**Mechanism CSS** (add to inline styles):
```css
.mechanism-grid { display: flex; flex-direction: column; gap: 1.5rem; margin: 1.5rem 0; }
.mechanism-card { padding: 1.25rem; border: 1px solid var(--border); border-radius: 10px; background: var(--surface); }
.mechanism-header { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.75rem; }
.mechanism-number { font-family: var(--font-mono); font-size: 1.5rem; font-weight: 700; color: var(--accent); opacity: 0.6; }
.mechanism-enables { font-size: 0.95rem; color: var(--text-dim); margin-bottom: 1rem; }
.mechanism-steps { padding-left: 1.5rem; margin: 0.5rem 0 1rem; }
.mechanism-steps li { margin-bottom: 0.4rem; }
.mechanism-reuse { font-size: 0.9rem; padding: 0.75rem; background: color-mix(in srgb, var(--accent) 6%, var(--surface)); border-radius: 6px; margin-top: 0.75rem; }
.workflow-trace { display: flex; flex-direction: column; gap: 0; margin: 1.5rem 0; }
.trace-step { display: flex; gap: 1rem; padding: 1rem 0; border-bottom: 1px solid var(--border); }
.trace-step:last-child { border-bottom: none; }
.trace-number { font-family: var(--font-mono); font-size: 1.25rem; font-weight: 700; color: var(--accent); min-width: 2rem; text-align: center; }
.trace-content { flex: 1; }
.trace-content strong { display: block; margin-bottom: 0.25rem; }
.trace-content p { font-size: 0.9rem; color: var(--text-dim); margin: 0 0 0.25rem; }
.source-link { font-family: var(--font-mono); font-size: 0.8rem; color: var(--accent); text-decoration: none; }
.source-link:hover { text-decoration: underline; }
.source-link::after { content: ' \2197'; font-size: 0.7em; }
```

---

## Section 5: Usage Guide

**Depth tier**: `.ve-card` (default)

Installation command, prerequisites table, key components summary, and when to use / when NOT to use guidance.

```html
<section id="usage-guide" class="ve-card" style="--i: 4">
  <h2>Usage Guide</h2>

  <h3>Installation</h3>
  <pre><code>{installation command}</code></pre>

  <h3>Prerequisites</h3>
  <div class="table-wrapper">
    <table>
      <thead>
        <tr><th>Requirement</th><th>Details</th></tr>
      </thead>
      <tbody>
        <tr><td>{requirement}</td><td>{details}</td></tr>
      </tbody>
    </table>
  </div>

  <h3>Key Components</h3>
  <ul>
    <li><strong>{component-name}</strong> — {2-3 line summary}</li>
    <!-- more components -->
  </ul>

  <div class="usage-guidance">
    <div class="usage-do">
      <h4>When to Use</h4>
      <ul>
        <li>{use case 1}</li>
        <li>{use case 2}</li>
      </ul>
    </div>
    <div class="usage-dont">
      <h4>When NOT to Use</h4>
      <ul>
        <li>{anti-use case 1}</li>
        <li>{anti-use case 2}</li>
      </ul>
    </div>
  </div>
</section>
```

**Usage guidance CSS** (add to inline styles):
```css
.usage-guidance { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-top: 1rem; }
@media (max-width: 768px) { .usage-guidance { grid-template-columns: 1fr; } }
.usage-do { padding: 1rem; border-radius: 8px; border-left: 3px solid var(--success); background: color-mix(in srgb, var(--success) 5%, var(--surface-1)); }
.usage-dont { padding: 1rem; border-radius: 8px; border-left: 3px solid var(--danger); background: color-mix(in srgb, var(--danger) 5%, var(--surface-1)); }
.usage-do h4 { color: var(--success); margin: 0 0 0.5rem 0; }
.usage-dont h4 { color: var(--danger); margin: 0 0 0.5rem 0; }
```

---

## Section 6: Components

**Depth tier**: `.ve-card` (default)

Tab UI switching between component types: Skills, Agents, Commands, Hooks, MCP, LSP. Each tab contains a table of components. Skills tab distinguishes active vs reference skills and shows auxiliary files. Agents tab shows purpose, model, and constraints.

Each component has a `.card-essentials` summary visible by default, with raw content excerpts in a collapsible `<details>`.

Each component card includes a `.source-link` element linking to the original file — `file://` for local/installed sources, GitHub web URL for GitHub sources. The orchestrator provides `source_type`, `source_base`, and `github_url` (if applicable) in the analysis data.

Concept terms are wrapped with `<span class="concept-term" data-concept="{id}">` for JS-driven tooltip display.

```html
<section id="components" class="ve-card" style="--i: 5">
  <h2>Components</h2>

  <div class="tab-bar">
    <button class="tab-btn tab-btn--active" data-tab="skills">Skills ({n})</button>
    <button class="tab-btn" data-tab="agents">Agents ({n})</button>
    <button class="tab-btn" data-tab="commands">Commands ({n})</button>
    <button class="tab-btn" data-tab="hooks">Hooks ({n})</button>
    <button class="tab-btn" data-tab="mcp">MCP ({n})</button>
    <button class="tab-btn" data-tab="lsp">LSP ({n})</button>
  </div>

  <div class="tab-panel tab-panel--active" id="tab-skills">
    <!-- Active Skills -->
    <h3>Active Skills</h3>
    <div class="component-card">
      <div class="card-essentials">
        <h4>{skill-name}</h4>
        <a href="{source-url}" class="source-link" target="_blank">{relative/path}</a>
        <p>{brief description}</p>
        <div class="table-wrapper">
          <table>
            <tbody>
              <tr><td>Allowed Tools</td><td><code>{tools}</code></td></tr>
              <tr><td>Argument Hint</td><td>{hint}</td></tr>
              <tr><td>Auxiliary Files</td><td>{file list}</td></tr>
            </tbody>
          </table>
        </div>
      </div>
      <details>
        <summary>Raw Content Excerpts</summary>
        <pre><code>{frontmatter and key sections}</code></pre>
      </details>
    </div>
    <!-- Reference Skills -->
    <h3>Reference Skills</h3>
    <!-- same card structure -->
  </div>

  <div class="tab-panel" id="tab-agents">
    <div class="component-card">
      <div class="card-essentials">
        <h4>{agent-name}</h4>
        <a href="{source-url}" class="source-link" target="_blank">{relative/path}</a>
        <p>{purpose}</p>
        <div class="table-wrapper">
          <table>
            <tbody>
              <tr><td>Model</td><td>{model}</td></tr>
              <tr><td>Max Turns</td><td>{maxTurns}</td></tr>
              <tr><td>Permission Mode</td><td>{permissionMode}</td></tr>
              <tr><td>Tools</td><td><code>{tools}</code></td></tr>
            </tbody>
          </table>
        </div>
      </div>
      <details>
        <summary>Raw Content Excerpts</summary>
        <pre><code>{frontmatter and key sections}</code></pre>
      </details>
    </div>
  </div>

  <div class="tab-panel" id="tab-commands">
    <!-- command cards with same structure -->
  </div>

  <div class="tab-panel" id="tab-hooks">
    <!-- hook cards: event type, matcher, script path -->
  </div>

  <div class="tab-panel" id="tab-mcp">
    <!-- MCP server cards: server name, command, args, env -->
  </div>

  <div class="tab-panel" id="tab-lsp">
    <!-- LSP server cards: language, command, args -->
  </div>
</section>
```

**Tab UI CSS** (add to inline styles):
```css
.tab-bar { display: flex; gap: 0; border-bottom: 2px solid var(--border); margin-bottom: 1.5rem; overflow-x: auto; }
.tab-btn { padding: 0.6rem 1.2rem; border: none; background: none; cursor: pointer; font-size: 0.85rem; font-weight: 600; color: var(--text-muted); border-bottom: 2px solid transparent; margin-bottom: -2px; white-space: nowrap; transition: color 0.2s, border-color 0.2s; }
.tab-btn:hover { color: var(--text); }
.tab-btn--active { color: var(--accent); border-bottom-color: var(--accent); }
.tab-panel { display: none; }
.tab-panel--active { display: block; }
.component-card { margin-bottom: 1.5rem; padding: 1rem; border: 1px solid var(--border); border-radius: 8px; }
.card-essentials h4 { margin: 0 0 0.5rem 0; }
```

**Tab UI JS** (add to inline script):
```js
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const tabId = btn.dataset.tab;
    btn.closest('section').querySelectorAll('.tab-btn').forEach(b => b.classList.remove('tab-btn--active'));
    btn.closest('section').querySelectorAll('.tab-panel').forEach(p => p.classList.remove('tab-panel--active'));
    btn.classList.add('tab-btn--active');
    document.getElementById('tab-' + tabId).classList.add('tab-panel--active');
  });
});
```

**Concept-term tooltip CSS + JS**:
```css
.concept-term { border-bottom: 1px dotted var(--text-muted); cursor: help; position: relative; }
.concept-tooltip { position: absolute; bottom: 100%; left: 50%; transform: translateX(-50%); background: var(--surface-3, var(--surface-2)); color: var(--text); padding: 0.5rem 0.75rem; border-radius: 6px; font-size: 0.8rem; max-width: 280px; white-space: normal; box-shadow: var(--shadow-md); z-index: 100; pointer-events: none; }
```

```js
// Concept definitions — the agent populates this from analysis data
const conceptDefs = {
  // e.g., "orchestrator": "A skill that coordinates sub-agents to complete a multi-phase task",
  // "permissionMode": "Controls how the agent handles tool approval — acceptEdits, dontAsk, etc."
};

document.querySelectorAll('.concept-term').forEach(el => {
  el.addEventListener('mouseenter', () => {
    const id = el.dataset.concept;
    const def = conceptDefs[id];
    if (!def) return;
    const tip = document.createElement('div');
    tip.className = 'concept-tooltip';
    tip.textContent = def;
    el.appendChild(tip);
  });
  el.addEventListener('mouseleave', () => {
    const tip = el.querySelector('.concept-tooltip');
    if (tip) tip.remove();
  });
});
```

---

## Section 7: Security Audit

**Depth tier**: `.ve-card` (default)

Risk level hero badge, permission matrix table, and security findings cards with severity indicators.

```html
<section id="security-audit" class="ve-card" style="--i: 6">
  <h2>Security Audit</h2>

  <div class="risk-hero">
    <span class="risk-badge risk-badge--{level}">{CRITICAL|HIGH|MEDIUM|LOW}</span>
    <p>{1-sentence risk summary}</p>
  </div>

  <h3>Permission Matrix</h3>
  <div class="table-wrapper">
    <table>
      <thead>
        <tr><th>Component</th><th>Tools</th><th>Scope</th><th>Risk</th></tr>
      </thead>
      <tbody>
        <tr>
          <td>{component-name}</td>
          <td><code>{tools list}</code></td>
          <td>{scope description}</td>
          <td><span class="risk-badge risk-badge--{level}">{level}</span></td>
        </tr>
      </tbody>
    </table>
  </div>

  <h3>Findings</h3>
  <div class="findings-list">
    <div class="finding-card finding-card--{critical|high|medium|low}">
      <div class="finding-severity">{CRITICAL|HIGH|MEDIUM|LOW}</div>
      <h4>{finding title}</h4>
      <p>{finding description}</p>
      <code class="finding-source">{component or file reference}</code>
    </div>
    <!-- more findings -->
  </div>

  <div class="audit-disclaimer">
    <p><em>This security audit is automated and may not capture all risks. Manual review is recommended for production deployments.</em></p>
  </div>
</section>
```

**Security CSS** (add to inline styles):
```css
.risk-hero { display: flex; align-items: center; gap: 1rem; margin-bottom: 1.5rem; padding: 1rem; background: var(--surface-1); border-radius: 8px; }
.risk-hero .risk-badge { font-size: 1rem; padding: 0.4rem 1rem; }
.findings-list { display: flex; flex-direction: column; gap: 0.75rem; }
.finding-card { padding: 1rem 1.25rem; border-radius: 8px; border-left: 4px solid; background: var(--surface-1); }
.finding-card--critical { border-color: var(--danger); }
.finding-card--high { border-color: var(--danger-high, var(--danger)); }
.finding-card--medium { border-color: var(--warning); }
.finding-card--low { border-color: var(--success); }
.finding-severity { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 0.4rem; }
.finding-card--critical .finding-severity { color: var(--danger); }
.finding-card--high .finding-severity { color: var(--danger-high, var(--danger)); }
.finding-card--medium .finding-severity { color: var(--warning); }
.finding-card--low .finding-severity { color: var(--success); }
.finding-source { display: block; font-size: 0.75rem; opacity: 0.6; margin-top: 0.5rem; }
.audit-disclaimer { margin-top: 1.5rem; padding: 0.75rem 1rem; background: var(--surface-1); border-radius: 6px; font-size: 0.85rem; opacity: 0.8; }
```

---

## Section 8: Dependencies

**Depth tier**: `.ve-card` (default)

Four sub-tables: Tool dependencies, External dependencies, Environment variables, Model requirements. Use `<details>` for collapsing long sections.

```html
<section id="dependencies" class="ve-card" style="--i: 7">
  <h2>Dependencies</h2>

  <details open>
    <summary><strong>Tool Dependencies</strong></summary>
    <div class="table-wrapper">
      <table>
        <thead>
          <tr><th>Tool</th><th>Used By</th><th>Purpose</th></tr>
        </thead>
        <tbody>
          <tr><td><code>{tool}</code></td><td>{component}</td><td>{purpose}</td></tr>
        </tbody>
      </table>
    </div>
  </details>

  <details open>
    <summary><strong>External Dependencies</strong></summary>
    <div class="table-wrapper">
      <table>
        <thead>
          <tr><th>Dependency</th><th>Type</th><th>Required</th></tr>
        </thead>
        <tbody>
          <tr><td><code>{dependency}</code></td><td>{CLI / API / Library}</td><td>{Yes / Optional}</td></tr>
        </tbody>
      </table>
    </div>
  </details>

  <details open>
    <summary><strong>Environment Variables</strong></summary>
    <div class="table-wrapper">
      <table>
        <thead>
          <tr><th>Variable</th><th>Purpose</th><th>Required</th></tr>
        </thead>
        <tbody>
          <tr><td><code>{VAR_NAME}</code></td><td>{purpose}</td><td>{Yes / Optional}</td></tr>
        </tbody>
      </table>
    </div>
  </details>

  <details open>
    <summary><strong>Model Requirements</strong></summary>
    <div class="table-wrapper">
      <table>
        <thead>
          <tr><th>Component</th><th>Model</th><th>Purpose</th></tr>
        </thead>
        <tbody>
          <tr><td>{component}</td><td>{model}</td><td>{why this model is needed}</td></tr>
        </tbody>
      </table>
    </div>
  </details>
</section>
```

---

## Section 9: Plugin Profile

**Depth tier**: `.ve-card--elevated`

Comprehensive quality assessment: component inventory table, documentation checklist (PASS/FAIL badges), security risk summary, primary pattern, target users, and quality checklist.

```html
<section id="plugin-profile" class="ve-card ve-card--elevated" style="--i: 8">
  <h2>Plugin Profile</h2>

  <h3>Component Inventory</h3>
  <div class="table-wrapper">
    <table>
      <thead>
        <tr><th>Type</th><th>Count</th><th>Components</th></tr>
      </thead>
      <tbody>
        <tr><td>Skills</td><td>{n}</td><td>{names}</td></tr>
        <tr><td>Agents</td><td>{n}</td><td>{names}</td></tr>
        <tr><td>Commands</td><td>{n}</td><td>{names}</td></tr>
        <tr><td>Hooks</td><td>{n}</td><td>{names}</td></tr>
        <tr><td>MCP Servers</td><td>{n}</td><td>{names}</td></tr>
        <tr><td>LSP Servers</td><td>{n}</td><td>{names}</td></tr>
      </tbody>
    </table>
  </div>

  <h3>Documentation Checklist</h3>
  <div class="table-wrapper">
    <table>
      <thead>
        <tr><th>Item</th><th>Status</th><th>Notes</th></tr>
      </thead>
      <tbody>
        <tr>
          <td>README.md</td>
          <td><span class="check-badge check-badge--{pass|fail}">{PASS|FAIL}</span></td>
          <td>{notes}</td>
        </tr>
        <tr>
          <td>CHANGELOG.md</td>
          <td><span class="check-badge check-badge--{pass|fail}">{PASS|FAIL}</span></td>
          <td>{notes}</td>
        </tr>
        <tr>
          <td>LICENSE</td>
          <td><span class="check-badge check-badge--{pass|fail}">{PASS|FAIL}</span></td>
          <td>{notes}</td>
        </tr>
        <!-- more checklist items -->
      </tbody>
    </table>
  </div>

  <h3>Security Risk</h3>
  <p>{security risk summary from auditor — 2-3 sentences}</p>

  <h3>Pattern & Target</h3>
  <p><strong>Primary Pattern:</strong> {pattern}</p>
  <p><strong>Target Users:</strong> {target users}</p>

  <h3>Quality Checklist</h3>
  <div class="table-wrapper">
    <table>
      <thead>
        <tr><th>Criterion</th><th>Status</th><th>Details</th></tr>
      </thead>
      <tbody>
        <tr>
          <td>{criterion name}</td>
          <td><span class="check-badge check-badge--{pass|fail}">{PASS|FAIL}</span></td>
          <td>{details}</td>
        </tr>
        <!-- more criteria -->
      </tbody>
    </table>
  </div>
</section>
```

**Check badge CSS** (add to inline styles):
```css
.check-badge { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; padding: 0.15rem 0.5rem; border-radius: 4px; letter-spacing: 0.05em; }
.check-badge--pass { background: color-mix(in srgb, var(--success) 15%, transparent); color: var(--success); }
.check-badge--fail { background: color-mix(in srgb, var(--danger) 15%, transparent); color: var(--danger); }
```

---

## Section 10: Footer

**Depth tier**: `.ve-card--recessed`

Generation metadata: tool name, date, version.

```html
<section id="footer" class="ve-card ve-card--recessed" style="--i: 9">
  <div class="footer-content">
    <p>Generated by <strong>Agent Extension Visual</strong></p>
    <p>{generation-date} &middot; v{version}</p>
  </div>
</section>
```

**Footer CSS** (add to inline styles):
```css
.footer-content { text-align: center; font-size: 0.85rem; opacity: 0.7; }
.footer-content p { margin: 0.25rem 0; }
```
