# Agent Extension Visual — Section Structure

This document defines the 11-section HTML structure for plugin-visual reports. All CSS classes referenced below are pre-defined in the HTML template — do not add `<style>` blocks or inline styles except `style="--i: N"` for animation stagger.

**Class name rule**: Use ONLY the exact CSS class names shown in the HTML examples below. The template CSS is pre-built — inventing class names (e.g., `stat-row` instead of `kpi-grid`, `chart-wrap` instead of `chart-container`) will produce unstyled, broken layouts. Copy the class names verbatim from the examples.

---

## Section 1: Header (Hero)

**Depth**: `.ve-card--hero` | **Index**: `--i: 0`

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

Available variants: `.scope-badge--{critical|high|medium|low}`, `.risk-badge--{critical|high|medium|low}`

---

## Section 2: Plugin Overview

**Depth**: `.ve-card--elevated` | **Index**: `--i: 1`

At-a-glance summary with key features, what/how/unique breakdown, KPI stat cards, component chart, pattern and target users.

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
    <!-- more features -->
  </ul>
  <div class="kpi-grid">
    <div class="kpi-card kpi-card--info">
      <span class="kpi-value">{n}</span>
      <span class="kpi-label">Skills</span>
    </div>
    <!-- repeat for Agents, Commands, Hooks -->
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

Available variants: `.kpi-card--{success|danger|info|warning}`

---

## Section 3: Architecture

**Depth**: `.ve-card` (default) | **Index**: `--i: 2`

Plugin narrative block, design philosophy cards, and Mermaid diagrams (component relationships, data flow, workflow sequence, agent dispatch map).

```html
<section id="architecture" class="ve-card" style="--i: 2">
  <h2>Architecture</h2>
  <div class="narrative-block">
    <div class="narrative-item">
      <h4>Problem</h4>
      <p>{user pain point}</p>
    </div>
    <div class="narrative-item">
      <h4>Core Insight</h4>
      <p>{non-obvious understanding}</p>
    </div>
    <div class="narrative-item narrative-item--thesis">
      <h4>Design Thesis</h4>
      <p>{fundamental approach}</p>
    </div>
    <div class="narrative-item">
      <h4>Deliberate Constraints</h4>
      <p>{intentional refusals}</p>
    </div>
  </div>
  <h3>Design Philosophy</h3>
  <div class="philosophy-grid">
    <div class="philosophy-card">
      <h4>{Principle Name}</h4>
      <p>{2-3 sentence explanation}</p>
      <p class="philosophy-example"><em>Example:</em> {concrete codebase reference}</p>
    </div>
    <!-- more philosophy cards -->
  </div>
  <h3>Component Relationships</h3>
  <div class="mermaid-wrap">
    <div class="zoom-controls">
      <button class="zoom-btn zoom-in" title="Zoom in">+</button>
      <span class="zoom-level">140%</span>
      <button class="zoom-btn zoom-out" title="Zoom out">−</button>
      <button class="zoom-btn zoom-reset" title="Reset">&#8635;</button>
    </div>
    <pre class="mermaid">
graph TD
    classDef skill fill:#dbeafe26,stroke:#3b82f6,stroke-width:2px
    classDef agent fill:#d1fae526,stroke:#10b981,stroke-width:2px
    %% nodes and edges based on analysis data
    </pre>
  </div>
  <!-- Repeat mermaid-wrap pattern for: Data Flow (flowchart LR), Workflow Sequence (sequenceDiagram), Agent Dispatch Map (graph TD with classDef builtin) -->
</section>
```

Mermaid rules: Use `<pre class="mermaid">` (not `<div>`). In `classDef`, use 8-digit hex for fills (`fill:#0891b226`) — never `rgba()` (commas break Mermaid's parser). Never set `color:` in `classDef`. Wrap every diagram in `.mermaid-wrap` with `.zoom-controls`.

---

## Section 4: Feature Deep Dive

**Depth**: `.ve-card--elevated` | **Index**: `--i: 3`

Philosophy enforcement analysis — how design principles are made concrete in code, with implementation chains, practical scenarios, and a tutorial guide.

```html
<section id="feature-deep-dive" class="ve-card ve-card--elevated" style="--i: 3">
  <h2>Feature Deep Dive</h2>
  <p class="lead">How this plugin's design principles are enforced in code</p>
  <div class="mechanism-grid">
    <div class="mechanism-card">
      <h3>{Principle}: {How It's Enforced}</h3>
      <div class="why-matters">
        <strong>Why This Matters</strong>
        <p>{problem without this}</p>
      </div>
      <h4>Implementation Chain</h4>
      <ol class="mechanism-steps">
        <li>{step} → <a href="{url}" class="source-link">{file}</a></li>
        <!-- more steps -->
      </ol>
      <details>
        <summary>Code Pattern</summary>
        <pre><code>{snippet}</code></pre>
      </details>
      <div class="in-practice">
        <strong>In Practice</strong>
        <p>{real usage scenario}</p>
      </div>
      <div class="best-practice">
        <strong>Best Practice</strong>
        <p>{tip}</p>
      </div>
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
  <h3>Practical Guide</h3>
  <div class="tutorial-scenarios">
    <div class="tutorial-scenario">
      <h4>{Scenario Title}</h4>
      <div class="tutorial-steps">
        <div class="tutorial-step">
          <div class="step-user">
            <span class="step-number">1</span>
            <p>{what user does}</p>
          </div>
          <div class="step-hood">→ {what happens inside the plugin}</div>
        </div>
        <!-- more tutorial steps -->
      </div>
      <div class="tutorial-tips">
        <strong>Tips</strong>
        <ul><li>{best practice}</li></ul>
      </div>
    </div>
    <!-- more scenarios -->
  </div>
</section>
```

---

## Section 5: Environment Fit Diagnosis

**Depth**: `.ve-card--elevated` | **Index**: `--i: 4`

Standalone diagnosis of whether this plugin should be installed in the user's current environment. Verdict card, context budget analysis, dependency check, functional overlap, trigger collisions, hook impact, and component dependencies.

```html
<section id="environment-fit" class="ve-card ve-card--elevated" style="--i: 4">
  <h2>Environment Fit Diagnosis</h2>
  <div class="env-fit-verdict">
    <span class="risk-badge risk-badge--{low|medium|high|critical}">{RECOMMENDED|CONDITIONAL|REDUNDANT|CONFLICTING}</span>
    <p>{1-2 sentence verdict summary}</p>
  </div>
  <!-- Installation Status -->
  <div class="env-fit-item">
    <h4>Installation Status</h4>
    <p><span class="check-badge check-badge--{pass|fail}">{NEW|ALREADY_INSTALLED}</span> {detail}</p>
  </div>
  <!-- Context Budget Analysis -->
  <div class="env-fit-item">
    <h4>Context Budget</h4>
    <!-- Always-loaded vs Deferred visual bar -->
    <div class="context-budget-bar">
      <div class="budget-bar-segment budget-bar--always" style="width: {always_pct}%" title="Always-loaded: {always_tokens} tokens">
        <span class="budget-bar-label">Always-loaded: {always_tokens} tok</span>
      </div>
      <div class="budget-bar-segment budget-bar--deferred" style="width: {deferred_pct}%" title="Deferred: {deferred_tokens} tokens">
        <span class="budget-bar-label">Deferred: {deferred_tokens} tok</span>
      </div>
    </div>
    <div class="budget-breakdown">
      <div class="budget-breakdown-item">
        <span class="scope-badge scope-badge--info">Always-loaded</span>
        Skill descriptions ({n} items): ~{n} tok &middot;
        Rules ({n} always / {n} on-demand): ~{n} tok &middot;
        CLAUDE.md + @imports ({n} files): ~{n} tok
      </div>
      <div class="budget-breakdown-item">
        <span class="scope-badge scope-badge--low">Deferred</span>
        MCP tools ({n} servers): ~{n} tok &middot;
        Zero-cost skills: {n} &middot;
        On-demand rules: {n}
      </div>
    </div>
    <div class="table-wrapper">
      <table>
        <thead><tr><th>Resource</th><th>Current</th><th>Adding</th><th>Budget (200K)</th><th>Budget (1M)</th><th>Severity</th></tr></thead>
        <tbody>
          <tr>
            <td>Skill Descriptions</td>
            <td>{n} chars</td>
            <td>+{n} chars</td>
            <td>{n} / 16,000 chars ({x}%)</td>
            <td>{n} / ~80,000 chars ({x}%)</td>
            <td><span class="risk-badge risk-badge--{low|medium|high}">{severity}</span></td>
          </tr>
          <tr>
            <td>Rules (always-loaded)</td>
            <td>{n} rules</td>
            <td>+{n} rules</td>
            <td>~{n} tokens</td>
            <td>~{n} tokens</td>
            <td><span class="risk-badge risk-badge--{low|medium|high}">{severity}</span></td>
          </tr>
          <tr>
            <td>MCP Tools</td>
            <td>{n} servers</td>
            <td>+{n} servers</td>
            <td>~{n} / ~20,000 tokens ({x}%)</td>
            <td>~{n} / ~100,000 tokens ({x}%)</td>
            <td><span class="risk-badge risk-badge--{low|medium|high}">{severity}</span></td>
          </tr>
        </tbody>
      </table>
    </div>
    <p class="env-fit-note">{context budget notes — e.g. N skills use disable-model-invocation (zero always-on cost), N hooks may inject additionalContext, @import chain depth}</p>
  </div>
  <!-- Dependency Check (only if requirements exist) -->
  <div class="env-fit-item">
    <h4>Dependency Check — <span class="risk-badge risk-badge--{low|medium|high}">{READY|PARTIAL|ACTION_NEEDED}</span></h4>
    <div class="table-wrapper">
      <table>
        <thead><tr><th>Requirement</th><th>Type</th><th>Required</th><th>Status</th><th>Help</th></tr></thead>
        <tbody>
          <tr>
            <td>{name}</td>
            <td>{CLI / MCP / ENV / Plugin}</td>
            <td>{Required|Optional}</td>
            <td><span class="check-badge check-badge--{pass|fail}">{AVAILABLE|MISSING}</span></td>
            <td>{actionable help text}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
  <!-- Functional Overlap (only if findings exist) -->
  <div class="env-fit-item">
    <h4>Functional Overlap</h4>
    <div class="table-wrapper">
      <table>
        <thead><tr><th>This Plugin</th><th>Existing Skill</th><th>Classification</th><th>Detail</th></tr></thead>
        <tbody>
          <tr>
            <td>{analyzed-skill}</td>
            <td>{plugin:skill}</td>
            <td><span class="scope-badge scope-badge--{high|medium|low}">{DUPLICATE|OVERLAP|COMPLEMENT|UPGRADE}</span></td>
            <td>{explanation}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
  <!-- Trigger Collisions (only if HIGH or MEDIUM collisions exist) -->
  <div class="env-fit-item">
    <h4>Trigger Collisions</h4>
    <div class="table-wrapper">
      <table>
        <thead><tr><th>Severity</th><th>This Skill</th><th>Existing Skill</th><th>Collision</th></tr></thead>
        <tbody>
          <tr>
            <td><span class="risk-badge risk-badge--{high|medium}">{HIGH|MEDIUM}</span></td>
            <td>{analyzed-skill}</td>
            <td>{plugin:skill}</td>
            <td>{collision description}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
  <!-- Hook & Context Impact -->
  <div class="env-fit-item">
    <h4>Hook Impact</h4>
    <div class="table-wrapper">
      <table>
        <thead><tr><th>Metric</th><th>Current</th><th>Adding</th><th>Projected</th><th>Severity</th></tr></thead>
        <tbody>
          <tr><td>Hooks (command)</td><td>{n}</td><td>+{n}</td><td>{n}</td><td><span class="risk-badge risk-badge--{low|medium}">{severity}</span></td></tr>
          <tr><td>Hooks (prompt/agent)</td><td>{n}</td><td>+{n}</td><td>{n}</td><td><span class="risk-badge risk-badge--{low|medium}">{severity}</span></td></tr>
        </tbody>
      </table>
    </div>
  </div>
  <!-- Component Dependencies (only if cross-plugin refs exist) -->
  <div class="env-fit-item">
    <h4>Component Dependencies</h4>
    <div class="table-wrapper">
      <table>
        <thead><tr><th>Component</th><th>Depends On</th><th>Type</th><th>Status</th></tr></thead>
        <tbody>
          <tr>
            <td>{skill-or-agent-name}</td>
            <td>{plugin:skill or mcp-server}</td>
            <td>{Skill→Skill / Agent→Skill / Skill→MCP / Agent→MCP}</td>
            <td><span class="check-badge check-badge--{pass|fail}">{AVAILABLE|MISSING}</span></td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
  <!-- Scope Impact (only if scope_conflicts exist or appropriateness note) -->
  <div class="env-fit-item">
    <h4>Scope Impact</h4>
    <div class="scope-impact-grid">
      <div class="scope-impact-card">
        <h5><span class="scope-badge scope-badge--info">Global</span></h5>
        <ul>
          <li>{component}: {effect}</li>
        </ul>
      </div>
      <div class="scope-impact-card">
        <h5><span class="scope-badge scope-badge--warning">Workspace</span></h5>
        <ul>
          <li>{component}: {effect}</li>
        </ul>
      </div>
      <div class="scope-impact-card">
        <h5><span class="scope-badge scope-badge--danger">Project</span></h5>
        <ul>
          <li>{component}: {effect}</li>
        </ul>
      </div>
    </div>
    <p class="env-fit-note">{appropriateness assessment}</p>
  </div>
  <!-- Bundle Source (only if detected) -->
  <div class="env-fit-item">
    <h4>Installation Source</h4>
    <p><span class="scope-badge scope-badge--{info|success|warning}">{marketplace|local|github}</span> {identifier}</p>
  </div>
  <!-- Recommendations (only if not RECOMMENDED) -->
  <div class="env-fit-recommendations">
    <h4>Recommendations</h4>
    <ul>
      <li>{actionable recommendation}</li>
    </ul>
  </div>
</section>
```

---

## Section 6: Usage Guide

**Depth**: `.ve-card` (default) | **Index**: `--i: 5`

```html
<section id="usage-guide" class="ve-card" style="--i: 5">
  <h2>Usage Guide</h2>
  <h3>Installation</h3>
  <pre><code>{installation command}</code></pre>
  <h3>Prerequisites</h3>
  <div class="table-wrapper">
    <table>
      <thead><tr><th>Requirement</th><th>Details</th></tr></thead>
      <tbody><tr><td>{requirement}</td><td>{details}</td></tr></tbody>
    </table>
  </div>
  <h3>Key Components</h3>
  <ul><li><strong>{component-name}</strong> — {2-3 line summary}</li></ul>
  <div class="usage-guidance">
    <div class="usage-do">
      <h4>When to Use</h4>
      <ul><li>{use case}</li></ul>
    </div>
    <div class="usage-dont">
      <h4>When NOT to Use</h4>
      <ul><li>{anti-use case}</li></ul>
    </div>
  </div>
</section>
```

---

## Section 7: Components

**Depth**: `.ve-card` (default) | **Index**: `--i: 6`

Tab-based UI switching between component types. Tab JS and concept tooltip JS are pre-defined in the template.

```html
<section id="components" class="ve-card" style="--i: 6">
  <h2>Components</h2>
  <div class="tab-bar">
    <button class="tab-btn tab-btn--active" data-tab="skills">Skills ({n})</button>
    <button class="tab-btn" data-tab="agents">Agents ({n})</button>
    <button class="tab-btn" data-tab="commands">Commands ({n})</button>
    <button class="tab-btn" data-tab="rules">Rules ({n})</button>
    <button class="tab-btn" data-tab="hooks">Hooks ({n})</button>
    <button class="tab-btn" data-tab="mcp">MCP ({n})</button>
    <button class="tab-btn" data-tab="lsp">LSP ({n})</button>
  </div>
  <div class="tab-panel tab-panel--active" id="tab-skills">
    <h3>Active Skills</h3>
    <div class="component-card">
      <div class="card-essentials">
        <h4>{skill-name}</h4>
        <a href="{source-url}" class="source-link" target="_blank">{relative/path}</a>
        <p>{brief description}</p>
        <div class="table-wrapper">
          <table><tbody>
            <tr><td>Allowed Tools</td><td><code>{tools}</code></td></tr>
            <tr><td>Argument Hint</td><td>{hint}</td></tr>
            <tr><td>Auxiliary Files</td><td>{file list}</td></tr>
          </tbody></table>
        </div>
      </div>
      <details>
        <summary>Raw Content Excerpts</summary>
        <pre><code>{frontmatter and key sections}</code></pre>
      </details>
    </div>
    <!-- Reference Skills: same card structure -->
  </div>
  <!-- Repeat tab-panel pattern for: agents (model, maxTurns, permissionMode, tools), commands, rules (paths, always-loaded vs on-demand), hooks (event, matcher, script), mcp, lsp -->
</section>
```

Concept terms: Wrap platform-specific terms with `<span class="concept-term" data-concept="{id}">{term}</span>`. Populate the `conceptDefs` object in the template's script block via `chart_data` metadata.

---

## Section 8: Security Audit

**Depth**: `.ve-card` (default) | **Index**: `--i: 7`

```html
<section id="security-audit" class="ve-card" style="--i: 7">
  <h2>Security Audit</h2>
  <div class="risk-hero">
    <span class="risk-badge risk-badge--{level}">{CRITICAL|HIGH|MEDIUM|LOW}</span>
    <p>{1-sentence risk summary}</p>
  </div>
  <h3>Permission Matrix</h3>
  <div class="table-wrapper">
    <table>
      <thead><tr><th>Component</th><th>Tools</th><th>Scope</th><th>Risk</th></tr></thead>
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

---

## Section 9: Dependencies

**Depth**: `.ve-card` (default) | **Index**: `--i: 8`

Four sub-tables in collapsible `<details>` blocks.

```html
<section id="dependencies" class="ve-card" style="--i: 8">
  <h2>Dependencies</h2>
  <details open>
    <summary><strong>Tool Dependencies</strong></summary>
    <div class="table-wrapper">
      <table>
        <thead><tr><th>Tool</th><th>Used By</th><th>Purpose</th></tr></thead>
        <tbody><tr><td><code>{tool}</code></td><td>{component}</td><td>{purpose}</td></tr></tbody>
      </table>
    </div>
  </details>
  <!-- Repeat <details> for: External Dependencies (Dependency/Type/Required), Environment Variables (Variable/Purpose/Required), Model Requirements (Component/Model/Purpose) -->
</section>
```

---

## Section 10: Plugin Profile

**Depth**: `.ve-card--elevated` | **Index**: `--i: 9`

Component inventory, documentation checklist, security risk summary, pattern, target users, quality checklist, skill category distribution, and skill design quality assessment.

```html
<section id="plugin-profile" class="ve-card ve-card--elevated" style="--i: 9">
  <h2>Plugin Profile</h2>
  <h3>Component Inventory</h3>
  <div class="table-wrapper">
    <table>
      <thead><tr><th>Type</th><th>Count</th><th>Components</th></tr></thead>
      <tbody>
        <tr><td>Skills</td><td>{n}</td><td>{names}</td></tr>
        <!-- rows for: Agents, Commands, Hooks, MCP Servers, LSP Servers -->
      </tbody>
    </table>
  </div>
  <h3>Skill Category Distribution</h3>
  <div class="table-wrapper">
    <table>
      <thead><tr><th>Category</th><th>Count</th><th>Skills</th></tr></thead>
      <tbody>
        <tr>
          <td><span class="scope-badge scope-badge--{badge-variant}">{category name}</span></td>
          <td>{n}</td>
          <td>{comma-separated skill names}</td>
        </tr>
        <!-- repeat for each category with skills -->
      </tbody>
    </table>
  </div>
  <h3>Documentation Checklist</h3>
  <div class="table-wrapper">
    <table>
      <thead><tr><th>Item</th><th>Status</th><th>Notes</th></tr></thead>
      <tbody>
        <tr>
          <td>README.md</td>
          <td><span class="check-badge check-badge--{pass|fail}">{PASS|FAIL}</span></td>
          <td>{notes}</td>
        </tr>
        <!-- rows for: CHANGELOG.md, LICENSE, tests/, Usage examples -->
      </tbody>
    </table>
  </div>
  <h3>Security Risk</h3>
  <p>{security risk summary — 2-3 sentences}</p>
  <h3>Pattern & Target</h3>
  <p><strong>Primary Pattern:</strong> {pattern}</p>
  <p><strong>Target Users:</strong> {target users}</p>
  <h3>Quality Checklist</h3>
  <div class="table-wrapper">
    <table>
      <thead><tr><th>Criterion</th><th>Status</th><th>Details</th></tr></thead>
      <tbody>
        <tr>
          <td>{criterion name}</td>
          <td><span class="check-badge check-badge--{pass|fail}">{PASS|FAIL}</span></td>
          <td>{details}</td>
        </tr>
        <!-- more criteria rows -->
      </tbody>
    </table>
  </div>
  <h3>Skill Design Quality</h3>
  <div class="table-wrapper">
    <table>
      <thead><tr><th>Skill</th><th>Description</th><th>Disclosure</th><th>Gotchas</th><th>Scripts</th><th>Hooks</th><th>Maturity</th></tr></thead>
      <tbody>
        <tr>
          <td>{skill-name}</td>
          <td><span class="check-badge check-badge--{pass|fail}">{Good|Needs work}</span></td>
          <td><span class="check-badge check-badge--{pass|fail}">{Good|Needs work}</span></td>
          <td><span class="check-badge check-badge--{pass|fail}">{Yes|No}</span></td>
          <td><span class="check-badge check-badge--{pass|fail}">{Yes|No}</span></td>
          <td><span class="check-badge check-badge--{pass|fail}">{Yes|No}</span></td>
          <td><span class="check-badge check-badge--{pass|fail}">{Mature}</span></td>
        </tr>
        <!-- repeat for each active skill -->
      </tbody>
    </table>
  </div>
  <div class="env-fit-recommendations">
    <h4>Design Improvement Opportunities</h4>
    <ul>
      <li>{actionable recommendation}</li>
    </ul>
  </div>
</section>
```

---

## Section 11: Footer

**Depth**: `.ve-card--recessed` | **Index**: `--i: 10`

```html
<section id="footer" class="ve-card ve-card--recessed" style="--i: 10">
  <div class="footer-content">
    <p>Generated by <strong>Agent Extension Visual</strong></p>
    <p>{generation-date} &middot; v{version}</p>
  </div>
</section>
```
