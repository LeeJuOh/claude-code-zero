#!/usr/bin/env node
/**
 * Render sections-data.json into section HTML files + metadata.json.
 *
 * This script is the single source of truth for CSS class names. The LLM
 * produces structured JSON data; this script produces the HTML with correct
 * class names hardcoded. This eliminates the entire class of bugs where the
 * LLM invents wrong class names (stat-row instead of kpi-grid, etc.).
 *
 * Usage:
 *   node render-sections.js --data <sections-data.json> --output <sections-dir>
 *
 * Input:  sections-data.json (written by visual-report-writer in JSON mode)
 * Output: section-1.html through section-11.html + metadata.json
 */

const fs = require("fs");
const path = require("path");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function esc(s) {
  if (s == null) return "";
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function raw(s) {
  return s == null ? "" : String(s);
}

function sourceLink(relPath, ctx) {
  if (!ctx || !relPath) return "";
  const url = ctx.type === "github" && ctx.github_url
    ? `${ctx.github_url}/${relPath}`
    : `file://${ctx.base}/${relPath}`;
  return `<a href="${esc(url)}" class="source-link" target="_blank">${esc(relPath)}</a>`;
}

function riskBadge(level) {
  const l = String(level).toLowerCase();
  return `<span class="risk-badge risk-badge--${esc(l)}">${esc(String(level).toUpperCase())}</span>`;
}

function checkBadge(status) {
  const s = String(status).toLowerCase();
  const variant = s === "pass" || s === "available" || s === "ready" || s === "yes" || s === "good" ? "pass" : "fail";
  return `<span class="check-badge check-badge--${variant}">${esc(status)}</span>`;
}

function scopeBadge(text, variant) {
  const v = variant ? ` scope-badge--${esc(String(variant).toLowerCase())}` : "";
  return `<span class="scope-badge${v}">${esc(text)}</span>`;
}

// ---------------------------------------------------------------------------
// Section renderers
// ---------------------------------------------------------------------------

function renderHeader(d) {
  const rl = String(d.risk_level || "low").toLowerCase();
  return `<section id="header" class="ve-card ve-card--hero" style="--i: 0">
  <h1>${esc(d.plugin_name)}</h1>
  <p class="hero-subtitle">${esc(d.subtitle || "Agent Extension Visual Report")}</p>
  <div class="scope-summary">
    <span class="scope-badge">v${esc(d.version)}</span>
    <span class="scope-badge">${esc(d.author)}</span>
    <span class="scope-badge">${esc(d.date)}</span>
    <span class="scope-badge scope-badge--${esc(rl)}">${esc(String(d.risk_level).toUpperCase())} Risk</span>
  </div>
  <div class="table-wrapper">
    <table class="meta-table">
      <tbody>
        <tr><td>Author</td><td>${esc(d.author)}</td></tr>
        <tr><td>License</td><td>${esc(d.license)}</td></tr>
        <tr><td>Keywords</td><td>${esc(d.keywords)}</td></tr>
        <tr><td>Risk Level</td><td>${riskBadge(d.risk_level)}</td></tr>
      </tbody>
    </table>
  </div>
</section>`;
}

function renderOverview(d) {
  const features = (d.features || []).map(f => `    <li>${esc(f)}</li>`).join("\n");
  const kpis = (d.kpis || []).map(k =>
    `    <div class="kpi-card kpi-card--${esc(k.variant || "info")}">
      <span class="kpi-value">${esc(k.value)}</span>
      <span class="kpi-label">${esc(k.label)}</span>
    </div>`
  ).join("\n");

  return `<section id="plugin-overview" class="ve-card ve-card--elevated" style="--i: 1">
  <h2>${esc(d.heading || "Plugin Overview")}</h2>
  <div class="overview-summary">
    <p class="hero-insight">${esc(d.summary)}</p>
    <div class="what-how-unique">
      <div class="whu-item"><strong>What:</strong> ${esc(d.what)}</div>
      <div class="whu-item"><strong>How:</strong> ${esc(d.how)}</div>
      <div class="whu-item"><strong>Unique:</strong> ${esc(d.unique)}</div>
    </div>
  </div>
  <h3>Key Features</h3>
  <ul class="feature-list">
${features}
  </ul>
  <div class="kpi-grid">
${kpis}
  </div>
  <div class="chart-container">
    <canvas id="component-chart"></canvas>
  </div>
  <div class="pattern-target">
    <p><strong>Pattern:</strong> ${esc(d.pattern)}</p>
    <p><strong>Target Users:</strong> ${esc(d.target_users)}</p>
  </div>
</section>`;
}

function renderMermaidWrap(title, mermaidCode, size) {
  const sizeClass = size === "compact" ? " mermaid-wrap--compact" : size === "tall" ? " mermaid-wrap--tall" : "";
  return `  <h3>${esc(title)}</h3>
  <div class="mermaid-wrap${sizeClass}">
    <div class="zoom-controls">
      <button class="zoom-btn zoom-in" title="Zoom in">+</button>
      <span class="zoom-level">140%</span>
      <button class="zoom-btn zoom-out" title="Zoom out">&minus;</button>
      <button class="zoom-btn zoom-reset" title="Reset">&#8635;</button>
    </div>
    <pre class="mermaid">
${raw(mermaidCode)}
    </pre>
  </div>`;
}

function renderArchitecture(d) {
  const narrativeItems = [];
  if (d.narrative) {
    const n = d.narrative;
    if (n.problem) narrativeItems.push(`    <div class="narrative-item">
      <h4>Problem</h4>
      <p>${esc(n.problem)}</p>
    </div>`);
    if (n.core_insight) narrativeItems.push(`    <div class="narrative-item">
      <h4>Core Insight</h4>
      <p>${esc(n.core_insight)}</p>
    </div>`);
    if (n.design_thesis) narrativeItems.push(`    <div class="narrative-item narrative-item--thesis">
      <h4>Design Thesis</h4>
      <p>${esc(n.design_thesis)}</p>
    </div>`);
    if (n.constraints) narrativeItems.push(`    <div class="narrative-item">
      <h4>Deliberate Constraints</h4>
      <p>${esc(n.constraints)}</p>
    </div>`);
  }

  const philosophyCards = (d.philosophy || []).map(p =>
    `    <div class="philosophy-card">
      <h4>${esc(p.name)}</h4>
      <p>${esc(p.description)}</p>
      <p class="philosophy-example"><em>Example:</em> ${esc(p.example)}</p>
    </div>`
  ).join("\n");

  const diagrams = (d.diagrams || []).map(dg =>
    renderMermaidWrap(dg.title, dg.mermaid, dg.size)
  ).join("\n");

  return `<section id="architecture" class="ve-card" style="--i: 2">
  <h2>${esc(d.heading || "Architecture")}</h2>
  <div class="narrative-block">
${narrativeItems.join("\n")}
  </div>
  <h3>Design Philosophy</h3>
  <div class="philosophy-grid">
${philosophyCards}
  </div>
${diagrams}
</section>`;
}

function renderFeatureDeepDive(d, srcCtx) {
  const mechanisms = (d.mechanisms || []).map(m => {
    const steps = (m.steps || []).map(s => {
      const link = s.source_link ? " &rarr; " + sourceLink(s.source_link.path, srcCtx) : "";
      return `        <li>${esc(s.text)}${link}</li>`;
    }).join("\n");

    const codePat = m.code_pattern
      ? `      <details>
        <summary>Code Pattern</summary>
        <pre class="code-block"><code class="language-${esc(m.code_pattern.language || "text")}">${esc(m.code_pattern.code)}</code></pre>
      </details>`
      : "";

    return `    <div class="mechanism-card">
      <h3>${esc(m.title)}</h3>
      <div class="why-matters">
        <strong>Why This Matters</strong>
        <p>${esc(m.why_matters)}</p>
      </div>
      <h4>Implementation Chain</h4>
      <ol class="mechanism-steps">
${steps}
      </ol>
${codePat}
      <div class="in-practice">
        <strong>In Practice</strong>
        <p>${esc(m.in_practice)}</p>
      </div>
      <div class="best-practice">
        <strong>Best Practice</strong>
        <p>${esc(m.best_practice)}</p>
      </div>
    </div>`;
  }).join("\n");

  const trace = (d.workflow_trace || []).map((t, i) => {
    const link = t.source_link ? sourceLink(t.source_link.path, srcCtx) : "";
    return `    <div class="trace-step">
      <span class="trace-number">${i + 1}</span>
      <div class="trace-content">
        <strong>${esc(t.title)}</strong>
        <p>${esc(t.description)}</p>
        ${link}
      </div>
    </div>`;
  }).join("\n");

  const scenarios = (d.tutorial_scenarios || []).map(s => {
    const steps = (s.steps || []).map((st, i) =>
      `        <div class="tutorial-step">
          <div class="step-user">
            <span class="step-number">${i + 1}</span>
            <p>${esc(st.user_action)}</p>
          </div>
          <div class="step-hood">&rarr; ${esc(st.behind_scenes)}</div>
        </div>`
    ).join("\n");
    const tips = (s.tips || []).map(t => `          <li>${esc(t)}</li>`).join("\n");
    return `    <div class="tutorial-scenario">
      <h4>${esc(s.title)}</h4>
      <div class="tutorial-steps">
${steps}
      </div>
      <div class="tutorial-tips">
        <strong>Tips</strong>
        <ul>
${tips}
        </ul>
      </div>
    </div>`;
  }).join("\n");

  return `<section id="feature-deep-dive" class="ve-card ve-card--elevated" style="--i: 3">
  <h2>${esc(d.heading || "Feature Deep Dive")}</h2>
  <p class="lead">${esc(d.lead || "How this plugin's design principles are enforced in code")}</p>
  <div class="mechanism-grid">
${mechanisms}
  </div>
  <h3>Primary Workflow Walkthrough</h3>
  <div class="workflow-trace">
${trace}
  </div>
  <h3>Practical Guide</h3>
  <div class="tutorial-scenarios">
${scenarios}
  </div>
</section>`;
}

function renderEnvironmentFit(d) {
  if (!d) return `<section id="environment-fit" class="ve-card ve-card--elevated" style="--i: 4">
  <h2>Environment Fit Diagnosis</h2>
  <p>No environment fit data available.</p>
</section>`;

  const verdictLevel = { RECOMMENDED: "low", CONDITIONAL: "medium", REDUNDANT: "high", CONFLICTING: "critical" };
  const vl = verdictLevel[d.verdict] || "low";

  let parts = [];

  // Verdict
  parts.push(`  <div class="env-fit-verdict">
    ${riskBadge(d.verdict)}
    <p>${esc(d.verdict_summary)}</p>
  </div>`);

  // Installation status
  if (d.installation_status) {
    const is = d.installation_status;
    parts.push(`  <div class="env-fit-item">
    <h4>Installation Status</h4>
    <p>${checkBadge(is.status)} ${esc(is.detail)}</p>
  </div>`);
  }

  // Context budget
  if (d.context_budget && d.context_budget.rows && d.context_budget.rows.length > 0) {
    const rows = d.context_budget.rows.map(r =>
      `          <tr>
            <td>${esc(r.resource)}</td>
            <td>${esc(r.current)}</td>
            <td>${esc(r.adding)}</td>
            <td>${esc(r.budget_200k)}</td>
            <td>${esc(r.budget_1m)}</td>
            <td>${riskBadge(r.severity)}</td>
          </tr>`
    ).join("\n");
    const note = d.context_budget.note
      ? `\n    <p class="env-fit-note">${esc(d.context_budget.note)}</p>`
      : "";
    parts.push(`  <div class="env-fit-item">
    <h4>Context Budget</h4>
    <div class="table-wrapper">
      <table>
        <thead><tr><th>Resource</th><th>Current</th><th>Adding</th><th>Budget (200K)</th><th>Budget (1M)</th><th>Severity</th></tr></thead>
        <tbody>
${rows}
        </tbody>
      </table>
    </div>${note}
  </div>`);
  }

  // Dependency check
  if (d.dependency_check && d.dependency_check.items && d.dependency_check.items.length > 0) {
    const dc = d.dependency_check;
    const rows = dc.items.map(i =>
      `          <tr>
            <td>${esc(i.name)}</td>
            <td>${esc(i.type)}</td>
            <td>${esc(i.required ? "Required" : "Optional")}</td>
            <td>${checkBadge(i.status)}</td>
            <td>${esc(i.help)}</td>
          </tr>`
    ).join("\n");
    parts.push(`  <div class="env-fit-item">
    <h4>Dependency Check &mdash; ${riskBadge(dc.status || dc.severity)}</h4>
    <div class="table-wrapper">
      <table>
        <thead><tr><th>Requirement</th><th>Type</th><th>Required</th><th>Status</th><th>Help</th></tr></thead>
        <tbody>
${rows}
        </tbody>
      </table>
    </div>
  </div>`);
  }

  // Functional overlap
  if (d.overlap && d.overlap.length > 0) {
    const rows = d.overlap.map(o =>
      `          <tr>
            <td>${esc(o.this_skill)}</td>
            <td>${esc(o.existing_skill)}</td>
            <td>${scopeBadge(o.classification, o.classification.toLowerCase())}</td>
            <td>${esc(o.detail)}</td>
          </tr>`
    ).join("\n");
    parts.push(`  <div class="env-fit-item">
    <h4>Functional Overlap</h4>
    <div class="table-wrapper">
      <table>
        <thead><tr><th>This Plugin</th><th>Existing Skill</th><th>Classification</th><th>Detail</th></tr></thead>
        <tbody>
${rows}
        </tbody>
      </table>
    </div>
  </div>`);
  }

  // Trigger collisions
  if (d.trigger_collisions && d.trigger_collisions.length > 0) {
    const rows = d.trigger_collisions.map(t =>
      `          <tr>
            <td>${riskBadge(t.severity)}</td>
            <td>${esc(t.this_skill)}</td>
            <td>${esc(t.existing_skill)}</td>
            <td>${esc(t.description)}</td>
          </tr>`
    ).join("\n");
    parts.push(`  <div class="env-fit-item">
    <h4>Trigger Collisions</h4>
    <div class="table-wrapper">
      <table>
        <thead><tr><th>Severity</th><th>This Skill</th><th>Existing Skill</th><th>Collision</th></tr></thead>
        <tbody>
${rows}
        </tbody>
      </table>
    </div>
  </div>`);
  }

  // Hook impact
  if (d.hook_impact && d.hook_impact.rows && d.hook_impact.rows.length > 0) {
    const rows = d.hook_impact.rows.map(r =>
      `          <tr><td>${esc(r.metric)}</td><td>${esc(r.current)}</td><td>${esc(r.adding)}</td><td>${esc(r.projected)}</td><td>${riskBadge(r.severity)}</td></tr>`
    ).join("\n");
    parts.push(`  <div class="env-fit-item">
    <h4>Hook Impact</h4>
    <div class="table-wrapper">
      <table>
        <thead><tr><th>Metric</th><th>Current</th><th>Adding</th><th>Projected</th><th>Severity</th></tr></thead>
        <tbody>
${rows}
        </tbody>
      </table>
    </div>
  </div>`);
  }

  // Component dependencies
  if (d.component_deps && d.component_deps.length > 0) {
    const rows = d.component_deps.map(c =>
      `          <tr>
            <td>${esc(c.component)}</td>
            <td>${esc(c.depends_on)}</td>
            <td>${esc(c.type)}</td>
            <td>${checkBadge(c.status)}</td>
          </tr>`
    ).join("\n");
    parts.push(`  <div class="env-fit-item">
    <h4>Component Dependencies</h4>
    <div class="table-wrapper">
      <table>
        <thead><tr><th>Component</th><th>Depends On</th><th>Type</th><th>Status</th></tr></thead>
        <tbody>
${rows}
        </tbody>
      </table>
    </div>
  </div>`);
  }

  // Recommendations
  if (d.recommendations && d.recommendations.length > 0) {
    const items = d.recommendations.map(r => `      <li>${esc(r)}</li>`).join("\n");
    parts.push(`  <div class="env-fit-recommendations">
    <h4>Recommendations</h4>
    <ul>
${items}
    </ul>
  </div>`);
  }

  return `<section id="environment-fit" class="ve-card ve-card--elevated" style="--i: 4">
  <h2>${esc(d.heading || "Environment Fit Diagnosis")}</h2>
${parts.join("\n")}
</section>`;
}

function renderUsageGuide(d) {
  const prereqs = (d.prerequisites || []).map(p =>
    `        <tr><td>${esc(p.requirement)}</td><td>${esc(p.details)}</td></tr>`
  ).join("\n");
  const components = (d.key_components || []).map(c =>
    `    <li><strong>${esc(c.name)}</strong> &mdash; ${esc(c.summary)}</li>`
  ).join("\n");
  const whenUse = (d.when_to_use || []).map(u => `      <li>${esc(u)}</li>`).join("\n");
  const whenNot = (d.when_not_to_use || []).map(u => `      <li>${esc(u)}</li>`).join("\n");

  return `<section id="usage-guide" class="ve-card" style="--i: 5">
  <h2>${esc(d.heading || "Usage Guide")}</h2>
  <h3>Installation</h3>
  <pre class="code-block"><code>${esc(d.installation_cmd)}</code></pre>
  <h3>Prerequisites</h3>
  <div class="table-wrapper">
    <table>
      <thead><tr><th>Requirement</th><th>Details</th></tr></thead>
      <tbody>
${prereqs}
      </tbody>
    </table>
  </div>
  <h3>Key Components</h3>
  <ul>
${components}
  </ul>
  <div class="usage-guidance">
    <div class="usage-do">
      <h4>When to Use</h4>
      <ul>
${whenUse}
      </ul>
    </div>
    <div class="usage-dont">
      <h4>When NOT to Use</h4>
      <ul>
${whenNot}
      </ul>
    </div>
  </div>
</section>`;
}

function renderComponentCard(c, srcCtx) {
  const link = c.source_path ? sourceLink(c.source_path, srcCtx) : "";
  const metaRows = (c.meta || []).map(m =>
    `            <tr><td>${esc(m.label)}</td><td><code>${esc(m.value)}</code></td></tr>`
  ).join("\n");
  const metaTable = metaRows
    ? `        <div class="table-wrapper">
          <table><tbody>
${metaRows}
          </tbody></table>
        </div>` : "";
  const rawContent = c.raw_content
    ? `\n      <details>
        <summary>Raw Content Excerpts</summary>
        <pre class="code-block"><code>${esc(c.raw_content)}</code></pre>
      </details>` : "";

  return `    <div class="component-card">
      <div class="card-essentials">
        <h4>${esc(c.name)}</h4>
        ${link}
        <p>${esc(c.description)}</p>
${metaTable}
      </div>${rawContent}
    </div>`;
}

function renderComponents(d, srcCtx) {
  const tabs = [
    { key: "skills", label: "Skills", items: [] },
    { key: "agents", label: "Agents", items: d.agents || [] },
    { key: "commands", label: "Commands", items: d.commands || [] },
    { key: "hooks", label: "Hooks", items: d.hooks || [] },
    { key: "mcp", label: "MCP", items: d.mcp || [] },
    { key: "lsp", label: "LSP", items: d.lsp || [] },
  ];

  // Skills: merge active + reference
  const skillsData = d.skills || {};
  const activeSkills = skillsData.active || [];
  const refSkills = skillsData.reference || [];
  tabs[0].items = [...activeSkills, ...refSkills];

  const tabBtns = tabs.map((t, i) =>
    `    <button class="tab-btn${i === 0 ? " tab-btn--active" : ""}" data-tab="${t.key}">${t.label} (${t.items.length})</button>`
  ).join("\n");

  const tabPanels = tabs.map((t, i) => {
    const cards = t.items.map(c => renderComponentCard(c, srcCtx)).join("\n");
    const activeClass = i === 0 ? " tab-panel--active" : "";
    let content = cards;

    // Skills tab: separate active and reference
    if (t.key === "skills" && refSkills.length > 0) {
      const activePart = activeSkills.map(c => renderComponentCard(c, srcCtx)).join("\n");
      const refPart = refSkills.map(c => renderComponentCard(c, srcCtx)).join("\n");
      content = `    <h3>Active Skills</h3>\n${activePart}`;
      if (refSkills.length > 0) {
        content += `\n    <h3>Reference Skills</h3>\n${refPart}`;
      }
    }

    return `  <div class="tab-panel${activeClass}" id="tab-${t.key}">
${content}
  </div>`;
  }).join("\n");

  return `<section id="components" class="ve-card" style="--i: 6">
  <h2>${esc(d.heading || "Components")}</h2>
  <div class="tab-bar">
${tabBtns}
  </div>
${tabPanels}
</section>`;
}

function renderSecurityAudit(d) {
  const matrix = (d.permission_matrix || []).map(r =>
    `        <tr>
          <td>${esc(r.component)}</td>
          <td><code>${esc(r.tools)}</code></td>
          <td>${esc(r.scope)}</td>
          <td>${riskBadge(r.risk)}</td>
        </tr>`
  ).join("\n");

  const findings = (d.findings || []).map(f =>
    `    <div class="finding-card finding-card--${esc(String(f.severity).toLowerCase())}">
      <div class="finding-severity">${esc(String(f.severity).toUpperCase())}</div>
      <h4>${esc(f.title)}</h4>
      <p>${esc(f.description)}</p>
      <code class="finding-source">${esc(f.source)}</code>
    </div>`
  ).join("\n");

  return `<section id="security-audit" class="ve-card" style="--i: 7">
  <h2>${esc(d.heading || "Security Audit")}</h2>
  <div class="risk-hero">
    ${riskBadge(d.risk_level)}
    <p>${esc(d.risk_summary)}</p>
  </div>
  <h3>Permission Matrix</h3>
  <div class="table-wrapper">
    <table>
      <thead><tr><th>Component</th><th>Tools</th><th>Scope</th><th>Risk</th></tr></thead>
      <tbody>
${matrix}
      </tbody>
    </table>
  </div>
  <h3>Findings</h3>
  <div class="findings-list">
${findings}
  </div>
  <div class="audit-disclaimer">
    <p><em>This security audit is automated and may not capture all risks. Manual review is recommended for production deployments.</em></p>
  </div>
</section>`;
}

function renderDependencies(d) {
  function depTable(title, headers, rows, open) {
    if (!rows || rows.length === 0) return "";
    const ths = headers.map(h => `<th>${esc(h)}</th>`).join("");
    const trs = rows.map(r => {
      const tds = r.map(c => `<td>${c.startsWith("<") ? c : esc(c)}</td>`).join("");
      return `          <tr>${tds}</tr>`;
    }).join("\n");
    return `  <details${open ? " open" : ""}>
    <summary><strong>${esc(title)}</strong></summary>
    <div class="table-wrapper">
      <table>
        <thead><tr>${ths}</tr></thead>
        <tbody>
${trs}
        </tbody>
      </table>
    </div>
  </details>`;
  }

  const tools = depTable("Tool Dependencies", ["Tool", "Used By", "Purpose"],
    (d.tools || []).map(t => [`<code>${esc(t.tool)}</code>`, t.used_by, t.purpose]), true);
  const external = depTable("External Dependencies", ["Dependency", "Type", "Required"],
    (d.external || []).map(e => [e.name, e.type, e.required ? "Required" : "Optional"]), false);
  const envVars = depTable("Environment Variables", ["Variable", "Purpose", "Required"],
    (d.env_vars || []).map(e => [e.variable, e.purpose, e.required ? "Required" : "Optional"]), false);
  const models = depTable("Model Requirements", ["Component", "Model", "Purpose"],
    (d.models || []).map(m => [m.component, m.model, m.purpose]), false);

  return `<section id="dependencies" class="ve-card" style="--i: 8">
  <h2>${esc(d.heading || "Dependencies")}</h2>
${[tools, external, envVars, models].filter(Boolean).join("\n")}
</section>`;
}

function renderPluginProfile(d) {
  const inventory = (d.inventory || []).map(r =>
    `        <tr><td>${esc(r.type)}</td><td>${esc(r.count)}</td><td>${esc(r.names)}</td></tr>`
  ).join("\n");

  const catDist = (d.category_distribution || []).map(r =>
    `        <tr>
          <td>${scopeBadge(r.category, r.badge_variant)}</td>
          <td>${esc(r.count)}</td>
          <td>${esc(r.skills)}</td>
        </tr>`
  ).join("\n");

  const docs = (d.docs_checklist || []).map(r =>
    `        <tr>
          <td>${esc(r.item)}</td>
          <td>${checkBadge(r.status)}</td>
          <td>${esc(r.notes)}</td>
        </tr>`
  ).join("\n");

  const quality = (d.quality_checklist || []).map(r =>
    `        <tr>
          <td>${esc(r.criterion)}</td>
          <td>${checkBadge(r.status)}</td>
          <td>${esc(r.details)}</td>
        </tr>`
  ).join("\n");

  const skillDesign = (d.skill_design_quality || []).map(r =>
    `        <tr>
          <td>${esc(r.name)}</td>
          <td>${checkBadge(r.description)}</td>
          <td>${checkBadge(r.disclosure)}</td>
          <td>${checkBadge(r.gotchas)}</td>
          <td>${checkBadge(r.scripts)}</td>
          <td>${checkBadge(r.hooks)}</td>
          <td>${checkBadge(r.maturity)}</td>
        </tr>`
  ).join("\n");

  const improvements = (d.improvement_recommendations || []).length > 0
    ? `  <div class="env-fit-recommendations">
    <h4>Design Improvement Opportunities</h4>
    <ul>
${d.improvement_recommendations.map(r => `      <li>${esc(r)}</li>`).join("\n")}
    </ul>
  </div>` : "";

  return `<section id="plugin-profile" class="ve-card ve-card--elevated" style="--i: 9">
  <h2>${esc(d.heading || "Plugin Profile")}</h2>
  <h3>Component Inventory</h3>
  <div class="table-wrapper">
    <table>
      <thead><tr><th>Type</th><th>Count</th><th>Components</th></tr></thead>
      <tbody>
${inventory}
      </tbody>
    </table>
  </div>
  <h3>Skill Category Distribution</h3>
  <div class="table-wrapper">
    <table>
      <thead><tr><th>Category</th><th>Count</th><th>Skills</th></tr></thead>
      <tbody>
${catDist}
      </tbody>
    </table>
  </div>
  <h3>Documentation Checklist</h3>
  <div class="table-wrapper">
    <table>
      <thead><tr><th>Item</th><th>Status</th><th>Notes</th></tr></thead>
      <tbody>
${docs}
      </tbody>
    </table>
  </div>
  <h3>Security Risk</h3>
  <p>${esc(d.security_summary)}</p>
  <h3>Pattern &amp; Target</h3>
  <p><strong>Primary Pattern:</strong> ${esc(d.pattern)}</p>
  <p><strong>Target Users:</strong> ${esc(d.target_users)}</p>
  <h3>Quality Checklist</h3>
  <div class="table-wrapper">
    <table>
      <thead><tr><th>Criterion</th><th>Status</th><th>Details</th></tr></thead>
      <tbody>
${quality}
      </tbody>
    </table>
  </div>
  <h3>Skill Design Quality</h3>
  <div class="table-wrapper">
    <table>
      <thead><tr><th>Skill</th><th>Description</th><th>Disclosure</th><th>Gotchas</th><th>Scripts</th><th>Hooks</th><th>Maturity</th></tr></thead>
      <tbody>
${skillDesign}
      </tbody>
    </table>
  </div>
${improvements}
</section>`;
}

function renderFooter(d) {
  return `<section id="footer" class="ve-card ve-card--recessed" style="--i: 10">
  <div class="footer-content">
    <p>Generated by <strong>Agent Extension Visual</strong></p>
    <p>${esc(d.date)} &middot; v${esc(d.version)}</p>
  </div>
</section>`;
}

// ---------------------------------------------------------------------------
// TOC generator
// ---------------------------------------------------------------------------

function generateToc(sections) {
  const tocEntries = [
    { id: "header", label: "Header" },
    { id: "plugin-overview", label: sections.overview?.heading || "Plugin Overview" },
    { id: "architecture", label: sections.architecture?.heading || "Architecture" },
    { id: "feature-deep-dive", label: sections.feature_deep_dive?.heading || "Feature Deep Dive" },
    { id: "environment-fit", label: sections.environment_fit?.heading || "Environment Fit" },
    { id: "usage-guide", label: sections.usage_guide?.heading || "Usage Guide" },
    { id: "components", label: sections.components?.heading || "Components" },
    { id: "security-audit", label: sections.security_audit?.heading || "Security Audit" },
    { id: "dependencies", label: sections.dependencies?.heading || "Dependencies" },
    { id: "plugin-profile", label: sections.plugin_profile?.heading || "Plugin Profile" },
    { id: "footer", label: "Footer" },
  ];
  return tocEntries.map(e => `<a href="#${e.id}">${esc(e.label)}</a>`).join("\n");
}

// ---------------------------------------------------------------------------
// Chart.js generator
// ---------------------------------------------------------------------------

function generateChartData(overview) {
  const chart = overview?.chart;
  if (!chart || !chart.labels || !chart.data) return "";

  const labels = JSON.stringify(chart.labels);
  const data = JSON.stringify(chart.data);
  const colors = chart.colors ? JSON.stringify(chart.colors) : null;

  const colorExpr = colors
    ? colors
    : `isDark
      ? ['rgba(34,211,238,0.7)', 'rgba(52,211,153,0.7)', 'rgba(251,191,36,0.7)', 'rgba(248,113,113,0.7)', 'rgba(139,92,246,0.7)', 'rgba(167,139,250,0.7)']
      : ['rgba(8,145,178,0.7)', 'rgba(5,150,105,0.7)', 'rgba(217,119,6,0.7)', 'rgba(220,38,38,0.7)', 'rgba(109,40,217,0.7)', 'rgba(139,92,246,0.7)']`;

  return `<script>
var isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
new Chart(document.getElementById('component-chart'), {
  type: '${esc(chart.type || "doughnut")}',
  data: {
    labels: ${labels},
    datasets: [{
      data: ${data},
      backgroundColor: ${colorExpr},
      borderWidth: 0
    }]
  },
  options: {
    responsive: true,
    plugins: {
      legend: {
        position: 'bottom',
        labels: { color: isDark ? '#e6edf3' : '#1a1a2e', font: { size: 12 } }
      }
    }
  }
});
</script>`;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i += 2) {
    const key = argv[i].replace(/^--/, "");
    args[key] = argv[i + 1];
  }
  return args;
}

function main() {
  const args = parseArgs(process.argv);
  if (!args.data || !args.output) {
    console.error("Usage: node render-sections.js --data <sections-data.json> --output <sections-dir>");
    process.exit(1);
  }

  if (!fs.existsSync(args.data)) {
    console.error(`Error: data file not found: ${args.data}`);
    process.exit(1);
  }

  const input = JSON.parse(fs.readFileSync(args.data, "utf-8"));
  const meta = input.metadata || {};
  const sections = input.sections || {};
  const srcCtx = input.source_context || null;

  // Render all 11 sections
  const rendered = [
    renderHeader(sections.header || {}),
    renderOverview(sections.overview || {}),
    renderArchitecture(sections.architecture || {}),
    renderFeatureDeepDive(sections.feature_deep_dive || {}, srcCtx),
    renderEnvironmentFit(sections.environment_fit),
    renderUsageGuide(sections.usage_guide || {}),
    renderComponents(sections.components || {}, srcCtx),
    renderSecurityAudit(sections.security_audit || {}),
    renderDependencies(sections.dependencies || {}),
    renderPluginProfile(sections.plugin_profile || {}),
    renderFooter(sections.footer || {}),
  ];

  // Write section files
  const outDir = args.output;
  fs.mkdirSync(outDir, { recursive: true });

  for (let i = 0; i < rendered.length; i++) {
    const filePath = path.join(outDir, `section-${i + 1}.html`);
    fs.writeFileSync(filePath, rendered[i], "utf-8");
  }

  // Generate metadata.json
  const metadata = {
    lang: meta.lang || "en",
    title: meta.title || "Agent Extension Visual Report",
    font_link: meta.font_link || "",
    css_variables: meta.css_variables || "",
    css_variables_dark: meta.css_variables_dark || "",
    mermaid_theme: meta.mermaid_theme || "",
    toc_content: generateToc(sections),
    chart_data: generateChartData(sections.overview),
  };

  const metaPath = path.join(outDir, "metadata.json");
  fs.writeFileSync(metaPath, JSON.stringify(metadata, null, 2), "utf-8");

  console.log(`Rendered: ${rendered.length} sections + metadata.json to ${outDir}`);
}

main();
