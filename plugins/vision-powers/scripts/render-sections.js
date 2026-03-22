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
  if (typeof s === "object") return esc(JSON.stringify(s));
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
  let variant;
  if (s === "already_installed" || s === "installed") variant = "info";
  else if (s === "pass" || s === "available" || s === "ready" || s === "yes" || s === "good" || s === "new") variant = "pass";
  else variant = "fail";
  return `<span class="check-badge check-badge--${variant}">${esc(status)}</span>`;
}

function scopeBadge(text, variant) {
  const v = variant ? ` scope-badge--${esc(String(variant).toLowerCase())}` : "";
  return `<span class="scope-badge${v}">${esc(text)}</span>`;
}

function renderKeywords(kw) {
  if (!kw) return "";
  let tags = [];
  if (Array.isArray(kw)) tags = kw.filter(Boolean);
  else if (typeof kw === "string") tags = kw.split(",").map(s => s.trim()).filter(Boolean);
  if (tags.length === 0) return "";
  return `<span class="keyword-tags">${tags.map(t => `<span class="scope-badge">${esc(t)}</span>`).join(" ")}</span>`;
}

// ---------------------------------------------------------------------------
// Section renderers
// ---------------------------------------------------------------------------

function renderHeader(d) {
  const rl = String(d.risk_level || "low").toLowerCase();
  const scopeBadges = [
    d.version ? `<span class="scope-badge">v${esc(d.version)}</span>` : "",
    d.author ? `<span class="scope-badge">${esc(d.author)}</span>` : "",
    d.date ? `<span class="scope-badge">${esc(d.date)}</span>` : "",
    `<span class="scope-badge scope-badge--${esc(rl)}">${esc(String(d.risk_level || "low").toUpperCase())} Risk</span>`,
  ].filter(Boolean).join("\n    ");

  const metaRows = [
    d.author ? `<tr><td>Author</td><td>${esc(d.author)}</td></tr>` : "",
    d.license ? `<tr><td>License</td><td>${esc(d.license)}</td></tr>` : "",
    d.keywords ? `<tr><td>Keywords</td><td>${renderKeywords(d.keywords)}</td></tr>` : "",
    `<tr><td>Risk Level</td><td>${riskBadge(d.risk_level)}</td></tr>`,
  ].filter(Boolean).join("\n        ");

  return `<section id="header" class="ve-card ve-card--hero" style="--i: 0">
  <h1>${esc(d.plugin_name)}</h1>
  <p class="hero-subtitle">${esc(d.subtitle || "Agent Extension Visual Report")}</p>
  <div class="scope-summary">
    ${scopeBadges}
  </div>
  <div class="table-wrapper">
    <table class="meta-table">
      <tbody>
        ${metaRows}
      </tbody>
    </table>
  </div>
</section>`;
}

function renderOverview(d) {
  const featureItems = (d.features || []).filter(f => f);
  const features = featureItems.length > 0
    ? `  <h3>Key Features</h3>
  <ul class="feature-list">
${featureItems.map(f => `    <li>${esc(f)}</li>`).join("\n")}
  </ul>` : "";

  const kpiItems = (d.kpis || []).filter(k => k && k.label);
  const kpis = kpiItems.length > 0
    ? `  <div class="kpi-grid">
${kpiItems.map(k =>
    `    <div class="kpi-card kpi-card--${esc(k.variant || "info")}">
      <span class="kpi-value">${esc(k.value)}</span>
      <span class="kpi-label">${esc(k.label)}</span>
    </div>`).join("\n")}
  </div>` : "";

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
${features}
${kpis}
  <div class="chart-container">
    <canvas id="component-chart"></canvas>
  </div>
  <div class="pattern-target">
    <p><strong>Pattern:</strong> ${esc(d.pattern)}</p>
    <p><strong>Target Users:</strong> ${esc(d.target_users)}</p>
  </div>
</section>`;
}

/** Quote unquoted Mermaid node labels that contain special chars (: / etc.) */
function sanitizeMermaid(code) {
  if (!code) return "";
  // Match node definitions: ID[label] or ID([label]) or ID{label} etc.
  // Only quote if label contains special chars and isn't already quoted
  return code.replace(/(\w+)(\[|\(\[|\{\{?)([^\]}\n"]+?)(\]|\]\)|\}\}?)/g, function(m, id, open, label, close) {
    if (label.startsWith('"') || !/[:/<>]/.test(label)) return m;
    return id + open + '"' + label + '"' + close;
  });
}

function renderMermaidWrap(title, mermaidCode, size) {
  const sizeClass = size === "compact" ? " mermaid-wrap--compact" : size === "tall" ? " mermaid-wrap--tall" : "";
  return `  <h3>${esc(title)}</h3>
  <div class="mermaid-wrap${sizeClass}">
    <div class="zoom-controls">
      <button class="zoom-btn zoom-in" title="Zoom in">+</button>
      <span class="zoom-level">100%</span>
      <button class="zoom-btn zoom-out" title="Zoom out">&minus;</button>
      <button class="zoom-btn zoom-reset" title="Reset">&#8635;</button>
    </div>
    <pre class="mermaid">
${raw(sanitizeMermaid(mermaidCode))}
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

  const philosophyCards = (d.philosophy || []).filter(p => p && p.name).map(p =>
    `    <div class="philosophy-card">
      <h4>${esc(p.name)}</h4>
      <p>${esc(p.description)}</p>
      ${p.example ? `<p class="philosophy-example"><em>Example:</em> ${esc(p.example)}</p>` : ""}
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
            <td>${scopeBadge(o.classification || "UNKNOWN", (o.classification || "unknown").toLowerCase())}</td>
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
  const prereqItems = (d.prerequisites || []).filter(p => p && (p.requirement || p.details));
  const prereqs = prereqItems.length > 0
    ? `  <h3>Prerequisites</h3>
  <div class="table-wrapper">
    <table>
      <thead><tr><th>Requirement</th><th>Details</th></tr></thead>
      <tbody>
${prereqItems.map(p => `        <tr><td>${esc(p.requirement)}</td><td>${esc(p.details)}</td></tr>`).join("\n")}
      </tbody>
    </table>
  </div>` : "";

  const compItems = (d.key_components || []).filter(c => c && c.name);
  const components = compItems.length > 0
    ? `  <h3>Key Components</h3>
  <ul>
${compItems.map(c => `    <li><strong>${esc(c.name)}</strong> &mdash; ${esc(c.summary)}</li>`).join("\n")}
  </ul>` : "";

  const installBlock = d.installation_cmd
    ? `  <h3>Installation</h3>
  <pre class="code-block"><code>${esc(d.installation_cmd)}</code></pre>` : "";

  const whenUse = (d.when_to_use || []).filter(Boolean);
  const whenNot = (d.when_not_to_use || []).filter(Boolean);
  const guidance = (whenUse.length > 0 || whenNot.length > 0)
    ? `  <div class="usage-guidance">
${whenUse.length > 0 ? `    <div class="usage-do">
      <h4>When to Use</h4>
      <ul>
${whenUse.map(u => `        <li>${esc(u)}</li>`).join("\n")}
      </ul>
    </div>` : ""}
${whenNot.length > 0 ? `    <div class="usage-dont">
      <h4>When NOT to Use</h4>
      <ul>
${whenNot.map(u => `        <li>${esc(u)}</li>`).join("\n")}
      </ul>
    </div>` : ""}
  </div>` : "";

  return `<section id="usage-guide" class="ve-card" style="--i: 5">
  <h2>${esc(d.heading || "Usage Guide")}</h2>
${installBlock}
${prereqs}
${components}
${guidance}
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
      const tds = r.map(c => { const v = c == null ? "" : String(c); return `<td>${v.startsWith("<") ? v : esc(v)}</td>`; }).join("");
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
  // Helper: render a table section only if it has rows
  function profileTable(heading, headers, rows) {
    if (!rows || rows.length === 0) return "";
    return `  <h3>${heading}</h3>
  <div class="table-wrapper">
    <table>
      <thead><tr>${headers.map(h => `<th>${esc(h)}</th>`).join("")}</tr></thead>
      <tbody>
${rows}
      </tbody>
    </table>
  </div>`;
  }

  const inventory = (d.inventory || []).filter(r => r && r.type).map(r =>
    `        <tr><td>${esc(r.type)}</td><td>${esc(r.count)}</td><td>${esc(r.names)}</td></tr>`
  ).join("\n");

  const catDist = (d.category_distribution || []).filter(r => r && r.category).map(r =>
    `        <tr>
          <td>${scopeBadge(r.category, r.badge_variant)}</td>
          <td>${esc(r.count)}</td>
          <td>${esc(r.skills)}</td>
        </tr>`
  ).join("\n");

  const docs = (d.docs_checklist || []).filter(r => r && r.item).map(r =>
    `        <tr>
          <td>${esc(r.item)}</td>
          <td>${checkBadge(r.status)}</td>
          <td>${esc(r.notes)}</td>
        </tr>`
  ).join("\n");

  const quality = (d.quality_checklist || []).filter(r => r && r.criterion).map(r =>
    `        <tr>
          <td>${esc(r.criterion)}</td>
          <td>${checkBadge(r.status)}</td>
          <td>${esc(r.details)}</td>
        </tr>`
  ).join("\n");

  const skillDesignItems = (d.skill_design_quality || []).filter(r => r && r.name);
  const skillDesign = skillDesignItems.map(r =>
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

  const improvements = (d.improvement_recommendations || []).filter(Boolean);
  const improvementsHtml = improvements.length > 0
    ? `  <div class="env-fit-recommendations">
    <h4>Design Improvement Opportunities</h4>
    <ul>
${improvements.map(r => `      <li>${esc(r)}</li>`).join("\n")}
    </ul>
  </div>` : "";

  // Resolve security_summary — handle string or object
  let secSummary = d.security_summary;
  if (typeof secSummary === "object" && secSummary !== null) {
    if (secSummary.summary) secSummary = secSummary.summary;
    else if (secSummary.text) secSummary = secSummary.text;
    else {
      // Build readable summary from structured data
      const parts = [];
      if (secSummary.risk_level) parts.push(`Risk level: ${String(secSummary.risk_level).toUpperCase()}.`);
      const f = secSummary.findings_by_severity;
      if (f) parts.push(`Findings: ${f.critical || 0} critical, ${f.high || 0} high, ${f.medium || 0} medium, ${f.low || 0} low.`);
      if (Array.isArray(secSummary.positive_features) && secSummary.positive_features.length > 0)
        parts.push(`Positive: ${secSummary.positive_features.join("; ")}`);
      secSummary = parts.length > 0 ? parts.join(" ") : null;
    }
  }

  const sections = [
    profileTable("Component Inventory", ["Type", "Count", "Components"], inventory),
    profileTable("Skill Category Distribution", ["Category", "Count", "Skills"], catDist),
    profileTable("Documentation Checklist", ["Item", "Status", "Notes"], docs),
    secSummary ? `  <h3>Security Risk</h3>\n  <p>${esc(secSummary)}</p>` : "",
    (d.pattern || d.target_users) ? `  <h3>Pattern &amp; Target</h3>
  <p><strong>Primary Pattern:</strong> ${esc(d.pattern)}</p>
  <p><strong>Target Users:</strong> ${esc(d.target_users)}</p>` : "",
    profileTable("Quality Checklist", ["Criterion", "Status", "Details"], quality),
    skillDesignItems.length > 0
      ? profileTable("Skill Design Quality", ["Skill", "Description", "Disclosure", "Gotchas", "Scripts", "Hooks", "Maturity"], skillDesign)
      : "",
    improvementsHtml,
  ].filter(Boolean);

  return `<section id="plugin-profile" class="ve-card ve-card--elevated" style="--i: 9">
  <h2>${esc(d.heading || "Plugin Profile")}</h2>
${sections.join("\n")}
</section>`;
}

function renderFooter(d) {
  const parts = [d.date, d.version ? `v${d.version}` : ""].filter(Boolean);
  const meta = parts.length > 0 ? `\n    <p>${parts.map(esc).join(" &middot; ")}</p>` : "";
  return `<section id="footer" class="ve-card ve-card--recessed" style="--i: 10">
  <div class="footer-content">
    <p>Generated by <strong>Agent Extension Visual</strong></p>${meta}
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
      },
      datalabels: {
        color: '#fff',
        font: { weight: 'bold', size: 13 },
        textShadowColor: 'rgba(0,0,0,0.4)',
        textShadowBlur: 4,
        formatter: function(value, ctx) {
          var total = ctx.dataset.data.reduce(function(a, b) { return a + b; }, 0);
          if (value / total < 0.05) return '';
          return ctx.chart.data.labels[ctx.dataIndex] + '\\n' + value;
        }
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

// ---------------------------------------------------------------------------
// JSON Data Normalization — fix common LLM output shape mismatches
// ---------------------------------------------------------------------------

function normalizeSectionsData(input) {
  const fixes = [];
  if (!input.sections) return fixes;
  const s = input.sections;

  // 1. ComponentCard.meta: dict {key: value} → array [{label, value}]
  function normalizeMeta(cards, label) {
    if (!Array.isArray(cards)) return;
    for (const card of cards) {
      if (card && card.meta && !Array.isArray(card.meta)) {
        if (typeof card.meta === "object") {
          card.meta = Object.entries(card.meta).map(([k, v]) => ({ label: k, value: String(v) }));
          fixes.push(`${label}: converted meta dict→array on "${card.name || "?"}"`);
        }
      }
      if (card && card.meta == null) card.meta = [];
    }
  }
  if (s.components) {
    for (const key of ["agents", "commands", "hooks", "mcp", "lsp"]) {
      normalizeMeta(s.components[key], `components.${key}`);
    }
    if (s.components.skills) {
      normalizeMeta(s.components.skills.active, "components.skills.active");
      normalizeMeta(s.components.skills.reference, "components.skills.reference");
    }
  }

  // 2. workflow_trace: dict {title?, steps: [...]} → array [{title, description, source_link}]
  if (s.feature_deep_dive) {
    const wt = s.feature_deep_dive.workflow_trace;
    if (wt && !Array.isArray(wt) && typeof wt === "object") {
      const steps = wt.steps || [];
      s.feature_deep_dive.workflow_trace = steps.map(step => ({
        title: step.command || step.title || step.name || "",
        description: step.description || "",
        source_link: step.source_link || null,
      }));
      fixes.push(`feature_deep_dive.workflow_trace: converted dict→array (${steps.length} steps)`);
    }
  }

  // 3. dependencies: field name aliases + item shape normalization
  if (s.dependencies) {
    const d = s.dependencies;
    // Field name aliases
    if (d.tool_matrix && !d.tools) {
      d.tools = d.tool_matrix.map(t => ({
        tool: t.tool || "",
        used_by: Array.isArray(t.agents) ? t.agents.join(", ") : (t.used_by || t.agents || ""),
        purpose: t.purpose || "Agent tool access",
      }));
      delete d.tool_matrix;
      fixes.push("dependencies: renamed tool_matrix→tools");
    }
    if (d.external_deps && !d.external) {
      d.external = d.external_deps;
      delete d.external_deps;
      fixes.push("dependencies: renamed external_deps→external");
    }
    // env_vars item: name → variable
    if (Array.isArray(d.env_vars)) {
      for (const ev of d.env_vars) {
        if (ev.name && !ev.variable) { ev.variable = ev.name; delete ev.name; }
      }
    }
    // model_usage: string → array
    if (d.model_usage && !d.models) {
      if (typeof d.model_usage === "string") {
        d.models = [{ component: "All agents", model: "Inherited", purpose: d.model_usage.slice(0, 200) }];
      } else if (Array.isArray(d.model_usage)) {
        d.models = d.model_usage;
      }
      delete d.model_usage;
      fixes.push("dependencies: converted model_usage→models");
    }
  }

  // 4. inventory: dict {agents: N, ...} → array [{type, count, names}]
  if (s.plugin_profile) {
    const inv = s.plugin_profile.inventory;
    if (inv && !Array.isArray(inv) && typeof inv === "object") {
      s.plugin_profile.inventory = Object.entries(inv)
        .filter(([, v]) => typeof v === "number")
        .map(([k, v]) => ({ type: k.charAt(0).toUpperCase() + k.slice(1), count: v, names: "" }));
      fixes.push(`plugin_profile.inventory: converted dict→array`);
    }
  }

  // 5. plugin_profile: normalize checklist field names + alias fields
  if (s.plugin_profile) {
    const pp = s.plugin_profile;
    // docs_checklist: present/exists → status
    for (const item of (pp.docs_checklist || [])) {
      if (!item.status) {
        if ("present" in item) { item.status = item.present ? "pass" : "fail"; delete item.present; }
        else if ("exists" in item) { item.status = item.exists ? "pass" : "fail"; delete item.exists; }
      }
    }
    // quality_checklist: pass/result → status
    for (const item of (pp.quality_checklist || [])) {
      if (!item.status) {
        if ("pass" in item) { item.status = item.pass ? "pass" : "fail"; delete item.pass; }
        else if ("result" in item) { item.status = item.result; delete item.result; }
      }
    }
    // command_design_quality alias → skill_design_quality
    if (pp.command_design_quality && !pp.skill_design_quality) {
      pp.skill_design_quality = pp.command_design_quality;
      delete pp.command_design_quality;
      fixes.push("plugin_profile: renamed command_design_quality→skill_design_quality");
    }
    // Ensure array fields exist (empty is fine — render script handles it)
    if (!pp.category_distribution) pp.category_distribution = [];
    if (!pp.skill_design_quality) pp.skill_design_quality = [];
    if (!pp.improvement_recommendations) pp.improvement_recommendations = [];
  }

  // 6. Mermaid double-wrap: strip <pre class="mermaid"> from diagram data
  if (s.architecture && Array.isArray(s.architecture.diagrams)) {
    for (const dg of s.architecture.diagrams) {
      if (dg.mermaid && dg.mermaid.includes('<pre class="mermaid">')) {
        dg.mermaid = dg.mermaid
          .replace(/<pre class="mermaid">\s*/g, "")
          .replace(/\s*<\/pre>/g, "")
          .trim();
        fixes.push(`architecture.diagrams: stripped double <pre> from "${dg.title || "?"}"`);
      }
    }
  }

  // 7. environment_fit.overlap: alias for overlap_findings
  if (s.environment_fit) {
    const ef = s.environment_fit;
    if (ef.overlap_findings && !ef.overlap) {
      ef.overlap = ef.overlap_findings;
      delete ef.overlap_findings;
      fixes.push("environment_fit: renamed overlap_findings→overlap");
    }
  }

  // 8. architecture.philosophy: fill empty name from description
  if (s.architecture && Array.isArray(s.architecture.philosophy)) {
    let fixedCount = 0;
    for (const p of s.architecture.philosophy) {
      if (p && (!p.name || !p.name.trim()) && p.description) {
        // Extract first clause (up to period, comma, or dash) as name
        const match = p.description.match(/^(.{10,60}?)[.,:—–-]\s/);
        if (match) {
          p.name = match[1].trim();
        } else {
          p.name = p.description.slice(0, 50).trim() + (p.description.length > 50 ? "..." : "");
        }
        fixedCount++;
      }
    }
    if (fixedCount > 0) {
      fixes.push(`architecture.philosophy: inferred name for ${fixedCount} card(s)`);
    }
  }

  // 9. overview.features: object array [{title, description}] → string array
  if (s.overview && Array.isArray(s.overview.features)) {
    const feats = s.overview.features;
    const hasObj = feats.some(f => f && typeof f === "object" && !Array.isArray(f));
    if (hasObj) {
      s.overview.features = feats.map(f => {
        if (typeof f === "string") return f;
        if (f && typeof f === "object") {
          const t = f.title || f.name || "";
          const d = f.description || f.detail || "";
          return t && d ? `${t}: ${d}` : t || d || JSON.stringify(f);
        }
        return String(f);
      });
      fixes.push(`overview.features: converted ${feats.length} object(s)→strings`);
    }
  }

  // 9. recommendations: object array [{priority, text}] → string array
  function normalizeStringArray(arr, label) {
    if (!Array.isArray(arr)) return arr;
    const hasObj = arr.some(r => r && typeof r === "object" && !Array.isArray(r));
    if (!hasObj) return arr;
    const result = arr.map(r => {
      if (typeof r === "string") return r;
      if (r && typeof r === "object") {
        return r.text || r.description || r.recommendation || r.detail
          || (r.title && r.description ? `${r.title}: ${r.description}` : "")
          || JSON.stringify(r);
      }
      return String(r);
    }).filter(Boolean);
    fixes.push(`${label}: converted ${arr.length} object(s)→strings`);
    return result;
  }

  if (s.environment_fit) {
    if (s.environment_fit.recommendations) {
      s.environment_fit.recommendations = normalizeStringArray(
        s.environment_fit.recommendations, "environment_fit.recommendations");
    }
  }
  if (s.plugin_profile) {
    if (s.plugin_profile.improvement_recommendations) {
      s.plugin_profile.improvement_recommendations = normalizeStringArray(
        s.plugin_profile.improvement_recommendations, "plugin_profile.improvement_recommendations");
    }
  }

  // 10. installation_status: string → {status, detail} object
  if (s.environment_fit) {
    const is = s.environment_fit.installation_status;
    if (typeof is === "string") {
      s.environment_fit.installation_status = { status: is, detail: "" };
      fixes.push(`environment_fit.installation_status: converted string "${is}"→object`);
    }
  }

  // 11. dependency_check: ensure status and severity fields exist
  if (s.environment_fit && s.environment_fit.dependency_check) {
    const dc = s.environment_fit.dependency_check;
    if (!dc.status) {
      const items = dc.items || [];
      const hasMissing = items.some(i => String(i.status).toUpperCase() === "MISSING" && i.required);
      dc.status = hasMissing ? "ACTION_NEEDED" : items.length > 0 ? "READY" : "UNKNOWN";
      fixes.push(`environment_fit.dependency_check: inferred status="${dc.status}"`);
    }
    if (!dc.severity) {
      const statusMap = { READY: "low", PARTIAL: "medium", ACTION_NEEDED: "high" };
      dc.severity = statusMap[dc.status] || "low";
      fixes.push(`environment_fit.dependency_check: inferred severity="${dc.severity}"`);
    }
  }

  // 12. header.keywords: array → comma-separated string
  if (s.header && Array.isArray(s.header.keywords)) {
    s.header.keywords = s.header.keywords.filter(Boolean).join(", ");
    fixes.push("header.keywords: converted array→comma-separated string");
  }

  // 13. workflow_trace titles: strip leading numbers (e.g. "1. Session Bootstrap" → "Session Bootstrap")
  if (s.feature_deep_dive && Array.isArray(s.feature_deep_dive.workflow_trace)) {
    let stripped = 0;
    for (const t of s.feature_deep_dive.workflow_trace) {
      if (t.title) {
        const clean = t.title.replace(/^\d+\.\s*/, "");
        if (clean !== t.title) { t.title = clean; stripped++; }
      }
    }
    if (stripped > 0) fixes.push(`feature_deep_dive.workflow_trace: stripped leading numbers from ${stripped} title(s)`);
  }

  // 14. overview.chart: auto-generate extension-type chart from component inventory if chart uses purpose categories
  if (s.overview && s.overview.chart && s.components) {
    const chart = s.overview.chart;
    const extensionTypes = ["skills", "agents", "commands", "hooks", "mcp", "lsp"];
    const labels = (chart.labels || []).map(l => String(l).toLowerCase());
    // Detect if chart is NOT using extension types (i.e. using purpose categories)
    const isExtType = labels.some(l => extensionTypes.includes(l));
    if (!isExtType && labels.length > 0) {
      const comp = s.components;
      const skillCount = ((comp.skills?.active || []).length + (comp.skills?.reference || []).length) || 0;
      const agentCount = (comp.agents || []).length;
      const commandCount = (comp.commands || []).length;
      const hookCount = (comp.hooks || []).length;
      const mcpCount = (comp.mcp || []).length;
      const lspCount = (comp.lsp || []).length;
      const newLabels = [];
      const newData = [];
      if (skillCount > 0) { newLabels.push("Skills"); newData.push(skillCount); }
      if (agentCount > 0) { newLabels.push("Agents"); newData.push(agentCount); }
      if (commandCount > 0) { newLabels.push("Commands"); newData.push(commandCount); }
      if (hookCount > 0) { newLabels.push("Hooks"); newData.push(hookCount); }
      if (mcpCount > 0) { newLabels.push("MCP"); newData.push(mcpCount); }
      if (lspCount > 0) { newLabels.push("LSP"); newData.push(lspCount); }
      if (newLabels.length > 0) {
        chart.labels = newLabels;
        chart.data = newData;
        delete chart.colors; // let auto-colors take over
        fixes.push(`overview.chart: replaced purpose-based→extension-type chart (${newLabels.join(", ")})`);
      }
    }
  }

  // 15. context_budget rows: fill empty budget columns with official doc values
  if (s.environment_fit && s.environment_fit.context_budget && Array.isArray(s.environment_fit.context_budget.rows)) {
    for (const r of s.environment_fit.context_budget.rows) {
      const res = (r.resource || "").toLowerCase();
      if (res.includes("skill") || res.includes("description") || res.includes("command")) {
        if (!r.budget_200k) { r.budget_200k = "16,000 chars"; fixes.push("context_budget: filled budget_200k for skill descriptions"); }
        if (!r.budget_1m) { r.budget_1m = "80,000 chars"; fixes.push("context_budget: filled budget_1m for skill descriptions"); }
      } else if (res.includes("mcp")) {
        if (!r.budget_200k) { r.budget_200k = "~20,000 tokens"; fixes.push("context_budget: filled budget_200k for MCP"); }
        if (!r.budget_1m) { r.budget_1m = "~100,000 tokens"; fixes.push("context_budget: filled budget_1m for MCP"); }
      }
    }
  }

  return fixes;
}

// ---------------------------------------------------------------------------
// JSON Data Validation
// ---------------------------------------------------------------------------

function validateSectionsData(input) {
  const warnings = [];
  const errors = [];

  // Top-level structure
  if (!input.metadata) errors.push("Missing top-level 'metadata' object");
  if (!input.sections) errors.push("Missing top-level 'sections' object");
  if (!input.sections) return { warnings, errors };

  const s = input.sections;

  // Required sections
  const requiredSections = ["header", "overview", "architecture", "feature_deep_dive",
    "usage_guide", "components", "security_audit", "plugin_profile", "footer"];
  for (const name of requiredSections) {
    if (!s[name]) errors.push(`Missing required section: '${name}'`);
  }

  // Header checks
  if (s.header) {
    if (!s.header.plugin_name) errors.push("header.plugin_name is required");
    if (!s.header.risk_level) warnings.push("header.risk_level missing (defaulting to 'low')");
  }

  // Overview checks
  if (s.overview) {
    if (!s.overview.summary) warnings.push("overview.summary is empty");
    if (!s.overview.features || s.overview.features.length === 0)
      warnings.push("overview.features is empty — Key Features section will be hidden");
    if (!s.overview.kpis || s.overview.kpis.length === 0)
      warnings.push("overview.kpis is empty — KPI grid will be hidden");
    if (!s.overview.chart || !s.overview.chart.labels)
      warnings.push("overview.chart is missing — component chart will be empty");
  }

  // Architecture checks
  if (s.architecture) {
    const phil = s.architecture.philosophy || [];
    const emptyNames = phil.filter(p => p && (!p.name || !p.name.trim()));
    if (emptyNames.length > 0)
      warnings.push(`architecture.philosophy has ${emptyNames.length} card(s) with empty 'name' — will be filtered out`);
    if (!s.architecture.diagrams || s.architecture.diagrams.length === 0)
      warnings.push("architecture.diagrams is empty — no architecture diagrams will render");
  }

  // Security audit checks
  if (s.security_audit) {
    if (typeof s.security_audit.risk_summary === "object")
      warnings.push("security_audit.risk_summary is an object (should be string) — will be JSON-stringified");
  }

  // Plugin profile checks
  if (s.plugin_profile) {
    if (typeof s.plugin_profile.security_summary === "object")
      warnings.push("plugin_profile.security_summary is an object (should be string) — will be extracted or JSON-stringified");
    if (!s.plugin_profile.inventory || s.plugin_profile.inventory.length === 0)
      warnings.push("plugin_profile.inventory is empty — Component Inventory section will be hidden");
  }

  // Footer checks
  if (s.footer) {
    if (!s.footer.date && !s.footer.version)
      warnings.push("footer has no date or version — footer will be minimal");
  }

  return { warnings, errors };
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

  // Normalize common LLM output mismatches before validation
  const fixes = normalizeSectionsData(input);
  if (fixes.length > 0) {
    console.error(`\n=== NORMALIZED ${fixes.length} field(s) ===`);
    for (const f of fixes) console.error(`  FIX: ${f}`);
  }

  // Validate JSON data before rendering
  const { warnings, errors } = validateSectionsData(input);
  if (errors.length > 0) {
    console.error(`\n=== JSON DATA ERRORS (${errors.length}) ===`);
    for (const e of errors) console.error(`  ERROR: ${e}`);
  }
  if (warnings.length > 0) {
    console.error(`\n=== JSON DATA WARNINGS (${warnings.length}) ===`);
    for (const w of warnings) console.error(`  WARN: ${w}`);
  }
  if (errors.length > 0) {
    console.error("\nRendering will proceed but output may be incomplete.");
  }

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
