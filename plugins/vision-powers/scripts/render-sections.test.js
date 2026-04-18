const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const scriptPath = path.join(__dirname, 'render-sections.js');
const repoRoot = path.resolve(__dirname, '..', '..', '..');

function renderEnvironmentHealthReport() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'render-sections-test-'));
  const dataPath = path.join(tempDir, 'sections-data.json');
  const outputDir = path.join(tempDir, 'out');

  const input = {
    metadata: {
      report_type: 'environment-health',
      title: 'Environment Health Report',
      lang: 'en'
    },
    sections: {
      header: {
        title: 'Environment Health Report',
        summary: 'Summary',
        status_tally: {
          healthy: 2,
          attention: 2,
          critical: 1,
          graded_total: 5,
          observational: ['Plugin Inventory', 'Startup Context Budget', 'Trigger Collisions', 'Hook Complexity', 'Plugin Components']
        },
        quick_stats: {
          plugins: 1,
          skills: 2,
          hooks: 0,
          mcp_servers: 1,
          est_startup_tokens: 1234,
          context_window_size: 200000
        },
        top_lever: 'Trim descriptions',
        scan_date: '2026-04-18',
        estimate_caveat: 'Values are estimates. Run `/context` for ground truth.'
      },
      overview: {
        area_type: 'observational',
        chart_data: {
          labels: ['Skills', 'Commands', 'Agents', 'Hooks', 'MCP'],
          datasets: [{ data: [2, 1, 1, 0, 1] }]
        },
        plugins: [
          { name: 'vision-powers', description: 'Visual reports', skill_count: 2, command_count: 1, enabled_state: 'active' }
        ],
        totals: {
          active_plugins: 1,
          disabled_plugins: 0,
          stale_in_cache: 0,
          orphaned_cache_count: 0,
          total_skills: 2,
          total_commands: 1,
          local_skills: 0
        },
        orphans: [],
        plugin_options: {},
        info_notes: []
      },
      context_budget: {
        context_window_size: 200000,
        env_and_settings: {
          enable_tool_search: {
            raw: 'auto',
            effective_mode: 'auto',
            threshold_pct: 10,
            proxy_fallback_applied: false,
            note: 'Uses auto mode'
          },
          add_dir_claude_md: false,
          auto_memory_disabled: false,
          desc_budget_override: null,
          anthropic_base_url: null,
          claude_md_excludes: []
        },
        always_loaded: {
          system_prompt: { tokens: 100, label: 'System prompt' },
          memory: { tokens: 50, label: 'Memory' },
          env_info: { tokens: 25, label: 'Env info' },
          mcp_names: { tokens: 10, label: 'MCP names' },
          skill_descriptions: { tokens: 30, label: 'Skill descriptions' },
          claude_md: { tokens: 20, label: 'CLAUDE.md' },
          rules: { tokens: 15, label: 'Rules' },
          total: { tokens: 250, label: 'Total' }
        },
        deferred: {
          mcp_tools: { tokens: 100, label: 'MCP tools' },
          on_demand_rules: { tokens: 40, label: 'On-demand rules' },
          disabled_skills: { tokens: 20, label: 'Disabled skills' },
          total: { tokens: 160, label: 'Total deferred' }
        },
        est_load_pct: 0.125,
        area_type: 'observational',
        component_status_refs: [
          { component: 'claude_md', owner_section: 8, status: 'critical', rationale: 'Too many files' }
        ],
        top_component_by_weight: { component: 'system_prompt', pct_of_load: 40 },
        estimate_caveat: 'Values are estimates. Run `/context` for ground truth.',
        chart_data: {
          labels: ['Always'],
          datasets: [{ data: [250] }]
        }
      },
      skill_health: {
        description_axis_a_cap: {
          over_cap_entries: [{ plugin: 'vision-powers', skill: 'environment-health', combined_chars: 1700, overflow_chars: 164 }],
          over_cap_count: 1,
          status: 'attention'
        },
        description_axis_b_budget: {
          total_combined_chars: 8200,
          effective_budget: 8000,
          budget_source: '8K fallback',
          pct_of_budget: 102.5,
          status: 'critical'
        },
        description_axis_c_balance: {
          top_consumers: [{ plugin: 'vision-powers', skill: 'environment-health', combined_chars: 1700, pct_of_total: 20.7 }],
          avg_combined_chars: 400,
          outliers: [{ plugin: 'vision-powers', skill: 'environment-health', multiple_of_avg: 4.25 }]
        },
        at_rest_body_sizes: {
          skills: [{ plugin: 'vision-powers', skill: 'environment-health', body_lines: 520, over_500: true }],
          over_500_count: 1,
          status: 'attention'
        },
        post_compact_risk: {
          skills_over_5k: [{ plugin: 'vision-powers', skill: 'environment-health', est_tokens: 5300 }],
          total_est_tokens: 5300,
          would_exceed_25k: false,
          status: 'attention'
        },
        disable_model_invocation: {
          using_count: 1,
          not_using: [{ plugin: 'vision-powers', skill: 'environment-health', combined_chars: 1700, user_invocable: true }]
        },
        subagent_preloads: {
          agents_with_preload: [{ plugin: 'vision-powers', agent: 'writer', preload_skills: ['environment-health'] }],
          total_preloaded_skills: 1
        }
      },
      trigger_analysis: {
        area_type: 'observational',
        inspector: 'trigger-collision-inspector subagent (Waza-style lexical pairwise)',
        total_descriptions_analyzed: 2,
        collisions: [
          { skill_a: 'a', skill_b: 'b', classification: 'OVERLAP', shared_keywords: ['audit'], note: 'Similar trigger words' }
        ],
        mermaid_diagram: 'graph TD; A-->B;',
        info_notes: []
      },
      plugin_components: {
        area_type: 'observational',
        per_plugin: {
          'vision-powers': { bin: 1, monitors: 1, lsp_servers: 0, output_styles: 1, channels: 1 }
        },
        totals: { bin: 1, monitors: 1, lsp_servers: 0, output_styles: 1, channels: 1 },
        info_notes: [{ text: 'Monitors persist for the session', severity: 'info' }]
      },
      hooks_and_mcp: {
        hooks: {
          area_type: 'observational',
          total: 0,
          type_counts: { command: 0, http: 0, prompt: 0, agent: 0 },
          event_counts: {},
          event_collisions: [],
          llm_hooks: 0,
          inline_sources: []
        },
        mcp: {
          server_count: 1,
          effective_mode: 'auto',
          threshold_pct: 10,
          proxy_fallback_applied: false,
          servers: [{ name: 'context7', source_scope: 'plugin:vision-powers' }],
          status: 'healthy'
        },
        chart_data: { labels: ['command'], datasets: [{ data: [0] }] },
        info_notes: []
      },
      claude_md_memory: {
        claude_md: {
          files: [{ path: '/tmp/CLAUDE.md', scope: 'project-root', load_mode: 'always-loaded', compact_resilient: true, lines: 100, bytes: 1000, over_200: false }],
          total_lines: 100,
          total_bytes: 1000,
          total_est_tokens: 250,
          nested_lines: 0,
          nested_bytes: 0,
          nested_est_tokens: 0,
          imports: [],
          excluded_by_settings: [],
          status: 'healthy'
        },
        memory: {
          path: '/tmp/MEMORY.md',
          lines: 50,
          bytes: 500,
          pct_of_limit: 25,
          over_200_lines: false,
          over_25kb: false,
          topic_files: 3,
          status: 'healthy'
        }
      },
      recommendations: {
        items: [
          { area: 'Skill Health', severity: 'critical', action: 'Trim large descriptions', impact_estimate: 'Save 200 chars', current_value: '8200', target_value: '8000', docs_source: 'skills.md' }
        ],
        top_lever: { action: 'Trim descriptions', impact_estimate: 'Save 200 chars' },
        summary: 'Start with description trimming.'
      }
    }
  };

  fs.writeFileSync(dataPath, JSON.stringify(input, null, 2));
  execFileSync(process.execPath, [scriptPath, '--data', dataPath, '--output', outputDir], { stdio: 'pipe' });

  return { outputDir, cleanup: () => fs.rmSync(tempDir, { recursive: true, force: true }) };
}

test('environment-health renderer outputs plugin components as a ninth section', () => {
  const { outputDir, cleanup } = renderEnvironmentHealthReport();

  try {
    const sectionFiles = fs.readdirSync(outputDir).filter(name => /^section-\d+\.html$/.test(name));
    const metadata = JSON.parse(fs.readFileSync(path.join(outputDir, 'metadata.json'), 'utf8'));

    assert.equal(sectionFiles.length, 9);
    assert.match(metadata.toc_content, /Plugin Components/);
    assert.match(fs.readFileSync(path.join(outputDir, 'section-6.html'), 'utf8'), /Plugin Components/);
  } finally {
    cleanup();
  }
});

test('environment-health renderer shows normalized ENABLE_TOOL_SEARCH details', () => {
  const { outputDir, cleanup } = renderEnvironmentHealthReport();

  try {
    const html = fs.readFileSync(path.join(outputDir, 'section-3.html'), 'utf8');

    assert.match(html, /Effective mode<\/code> = auto/);
    assert.match(html, /Raw value<\/code> = auto/);
    assert.match(html, /Threshold<\/code> = 10%/);
  } finally {
    cleanup();
  }
});

test('environment-health renderer uses description axis fields from the new schema', () => {
  const { outputDir, cleanup } = renderEnvironmentHealthReport();

  try {
    const html = fs.readFileSync(path.join(outputDir, 'section-4.html'), 'utf8');

    assert.match(html, /Description axis A/);
    assert.match(html, /Description axis B/);
    assert.match(html, /8,200 \/ 8,000 chars/);
    assert.match(html, /1,700/);
  } finally {
    cleanup();
  }
});

test('vision-powers README uses the same skill names as SKILL frontmatter', () => {
  const readme = fs.readFileSync(path.join(repoRoot, 'plugins/vision-powers/README.md'), 'utf8');
  const skillFiles = [
    'agent-extension-visualizing',
    'diff-visual',
    'plan-visual',
    'project-recap',
    'fact-check',
    'environment-health',
    'report-manager'
  ].map(name => path.join(repoRoot, `plugins/vision-powers/skills/${name}/SKILL.md`));

  const skillNames = skillFiles.map(filePath => {
    const content = fs.readFileSync(filePath, 'utf8');
    const match = content.match(/^name:\s*(.+)$/m);
    assert.ok(match, `missing frontmatter name in ${filePath}`);
    return match[1].trim();
  });

  for (const skillName of skillNames) {
    assert.match(readme, new RegExp('`' + skillName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '`'));
  }
});
