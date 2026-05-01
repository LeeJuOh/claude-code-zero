#!/usr/bin/env node

const fs = require("fs");

function parseArgs(argv) {
  const args = { expectedSections: null };
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--expected-sections") {
      args.expectedSections = Number(argv[++i]);
    } else if (!args.file) {
      args.file = arg;
    }
  }
  return args;
}

function typeOf(value) {
  if (Array.isArray(value)) return "array";
  if (value === null) return "null";
  return typeof value;
}

function getPath(root, path) {
  return path.split(".").reduce((cur, key) => (cur == null ? undefined : cur[key]), root);
}

function requireType(root, path, expected, errors) {
  const value = getPath(root, path);
  if (value === undefined) {
    errors.push(`${path}: missing required field`);
    return;
  }
  const actual = typeOf(value);
  if (actual !== expected) {
    errors.push(`${path}: expected ${expected}, got ${actual}`);
  }
}

function requireArray(root, path, errors) {
  requireType(root, path, "array", errors);
}

function warnBlankStrings(root, warnings, errors) {
  const mechanisms = getPath(root, "sections.feature_deep_dive.mechanisms");
  if (Array.isArray(mechanisms)) {
    mechanisms.forEach((m, mi) => {
      if (m && typeof m === "object") {
        for (const key of ["why_matters", "in_practice", "best_practice"]) {
          if (typeof m[key] === "string" && m[key].trim() === "") {
            warnings.push(`sections.feature_deep_dive.mechanisms[${mi}].${key}: blank string renders empty content`);
          }
        }
        if (Array.isArray(m.steps)) {
          m.steps.forEach((step, si) => {
            if (typeof step === "string") {
              errors.push(`sections.feature_deep_dive.mechanisms[${mi}].steps[${si}]: expected object with text, got string`);
            } else if (step && typeof step === "object" && (!step.text || !String(step.text).trim())) {
              warnings.push(`sections.feature_deep_dive.mechanisms[${mi}].steps[${si}].text: blank string renders empty list item`);
            }
          });
        }
      }
    });
  }

  const trace = getPath(root, "sections.feature_deep_dive.workflow_trace");
  if (Array.isArray(trace)) {
    trace.forEach((step, i) => {
      if (step && typeof step === "object") {
        if (!step.title || !String(step.title).trim()) warnings.push(`sections.feature_deep_dive.workflow_trace[${i}].title: blank title`);
        if (!step.description || !String(step.description).trim()) warnings.push(`sections.feature_deep_dive.workflow_trace[${i}].description: blank description`);
      }
    });
  }
}

function warnMermaid(root, warnings) {
  const diagrams = getPath(root, "sections.architecture.diagrams");
  if (!Array.isArray(diagrams)) return;
  diagrams.forEach((diagram, i) => {
    const code = diagram && diagram.mermaid;
    if (typeof code !== "string") return;
    if (/classDef\s+[^\n]*rgba\(/.test(code)) warnings.push(`sections.architecture.diagrams[${i}].mermaid: classDef uses rgba(), use 8-digit hex`);
    if (/classDef\s+[^\n]*\bcolor\s*:/.test(code)) warnings.push(`sections.architecture.diagrams[${i}].mermaid: classDef uses color:, remove it`);
    if (code.includes('<pre class="mermaid">')) warnings.push(`sections.architecture.diagrams[${i}].mermaid: contains <pre class="mermaid"> wrapper`);
    if (/->>[^\n]*[&<>]/.test(code)) warnings.push(`sections.architecture.diagrams[${i}].mermaid: sequenceDiagram message contains special chars (&, <, >)`);
  });
}

function validate(data, opts = {}) {
  const errors = [];
  const warnings = [];

  requireType(data, "metadata", "object", errors);
  requireType(data, "sections", "object", errors);
  if (!data.sections || typeof data.sections !== "object") return { errors, warnings };

  const requiredSections = [
    "header",
    "overview",
    "architecture",
    "feature_deep_dive",
    "environment_fit",
    "usage_guide",
    "components",
    "security_audit",
    "dependencies",
    "plugin_profile",
    "footer",
  ];

  for (const name of requiredSections) requireType(data, `sections.${name}`, "object", errors);
  if (opts.expectedSections && requiredSections.length !== opts.expectedSections) {
    errors.push(`schema expected sections count is ${requiredSections.length}, requested ${opts.expectedSections}`);
  }

  const arrayPaths = [
    "sections.overview.features",
    "sections.overview.kpis",
    "sections.architecture.philosophy",
    "sections.architecture.diagrams",
    "sections.feature_deep_dive.mechanisms",
    "sections.feature_deep_dive.workflow_trace",
    "sections.feature_deep_dive.tutorial_scenarios",
    "sections.usage_guide.prerequisites",
    "sections.usage_guide.key_components",
    "sections.usage_guide.when_to_use",
    "sections.usage_guide.when_not_to_use",
    "sections.components.agents",
    "sections.components.commands",
    "sections.components.rules",
    "sections.components.hooks",
    "sections.components.mcp",
    "sections.components.lsp",
    "sections.security_audit.permission_matrix",
    "sections.security_audit.findings",
    "sections.dependencies.tools",
    "sections.dependencies.external",
    "sections.dependencies.env_vars",
    "sections.dependencies.models",
    "sections.plugin_profile.inventory",
    "sections.plugin_profile.category_distribution",
    "sections.plugin_profile.docs_checklist",
    "sections.plugin_profile.quality_checklist",
    "sections.plugin_profile.skill_design_quality",
    "sections.plugin_profile.improvement_recommendations",
  ];

  for (const path of arrayPaths) {
    const value = getPath(data, path);
    if (value !== undefined) requireArray(data, path, errors);
  }

  requireType(data, "sections.components.skills", "object", errors);
  if (getPath(data, "sections.components.skills")) {
    requireArray(data, "sections.components.skills.active", errors);
    requireArray(data, "sections.components.skills.reference", errors);
  }

  if (getPath(data, "sections.overview.chart")) {
    requireArray(data, "sections.overview.chart.labels", errors);
    requireArray(data, "sections.overview.chart.data", errors);
  }

  if (getPath(data, "sections.environment_fit.installation_status") !== undefined) {
    requireType(data, "sections.environment_fit.installation_status", "object", errors);
  }
  if (getPath(data, "sections.environment_fit.recommendations") !== undefined) {
    requireArray(data, "sections.environment_fit.recommendations", errors);
  }
  if (getPath(data, "sections.environment_fit.overlap") !== undefined) {
    requireArray(data, "sections.environment_fit.overlap", errors);
  }
  if (getPath(data, "sections.environment_fit.trigger_collisions") !== undefined) {
    requireArray(data, "sections.environment_fit.trigger_collisions", errors);
  }
  if (getPath(data, "sections.environment_fit.component_deps") !== undefined) {
    requireArray(data, "sections.environment_fit.component_deps", errors);
  }

  warnBlankStrings(data, warnings, errors);
  warnMermaid(data, warnings);

  return { errors, warnings };
}

function main() {
  const args = parseArgs(process.argv);
  if (!args.file) {
    console.error("Usage: node validate-sections-data.js <sections-data.json> [--expected-sections 11]");
    process.exit(2);
  }
  if (!fs.existsSync(args.file)) {
    console.error(`Error: data file not found: ${args.file}`);
    process.exit(2);
  }

  let data;
  try {
    data = JSON.parse(fs.readFileSync(args.file, "utf8"));
  } catch (error) {
    console.error(`Result: FAIL — invalid JSON: ${error.message}`);
    process.exit(1);
  }

  const { errors, warnings } = validate(data, { expectedSections: args.expectedSections });
  console.log(`Validated sections data: ${args.file}`);
  if (warnings.length > 0) {
    console.log(`Warnings: ${warnings.length}`);
    warnings.forEach((warning, i) => console.log(`  ${i + 1}. ${warning}`));
  }
  if (errors.length > 0) {
    console.error(`Result: FAIL — ${errors.length} error(s):`);
    errors.forEach((error, i) => console.error(`  ${i + 1}. ${error}`));
    process.exit(1);
  }
  console.log("Result: PASS");
}

if (require.main === module) main();

module.exports = { validate };
