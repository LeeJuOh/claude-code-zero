# Environment Fit Diagnosis Redesign — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the Environment Fit Diagnosis in agent-extension-visualizing: promote to independent report section (after Feature Deep Dive), add context budget analysis with 200K/1M dual scenarios, and add component dependency analysis for cross-plugin skill/MCP references.

**Architecture:** Environment Fit moves from a subsection of Section 9 (Plugin Profile) to a standalone Section 5. All downstream sections renumber +1 (total: 11 sections). Phase 4.5 gains two new diagnostic dimensions (Context Budget, Component Dependency) while merging the existing Overlap + Trigger analyses.

**Tech Stack:** Markdown instruction files, HTML template, Node.js assembler (no changes needed — already dynamic)

---

## Chunk 1: Section Renumbering

Renumber the report from 10 sections to 11 sections. The new Section 5 is "Environment Fit Diagnosis". Old sections 5-10 become 6-11.

### Mapping Reference

| Old # | New # | Section Name |
|-------|-------|--------------|
| 1 | 1 | Header (Hero) |
| 2 | 2 | Plugin Overview |
| 3 | 3 | Architecture |
| 4 | 4 | Feature Deep Dive |
| — | **5** | **Environment Fit Diagnosis (NEW)** |
| 5 | 6 | Usage Guide |
| 6 | 7 | Components |
| 7 | 8 | Security Audit |
| 8 | 9 | Dependencies |
| 9 | 10 | Plugin Profile (env fit removed) |
| 10 | 11 | Footer |

---

### Task 1: Update HTML Template Placeholders

**Files:**
- Modify: `plugins/vision-powers/templates/agent-extension-visual.html` (section placeholder comments)

- [ ] **Step 1: Read the template file** and locate the section placeholder comments (lines ~279-288).

- [ ] **Step 2: Insert new SECTION_5 placeholder and renumber downstream**

Find this block of placeholder comments:
```html
<!-- SECTION_4: Feature Deep Dive — ... -->
<!-- SECTION_5: Usage Guide — ... -->
<!-- SECTION_6: Components — ... -->
<!-- SECTION_7: Security Audit — ... -->
<!-- SECTION_8: Dependencies — ... -->
<!-- SECTION_9: Plugin Profile — ... -->
<!-- SECTION_10: Footer — ... -->
```

Replace with:
```html
<!-- SECTION_4: Feature Deep Dive — core mechanisms, primary workflow walkthrough, annotated sequence diagram -->
<!-- SECTION_5: Environment Fit Diagnosis — verdict, context budget, dependency check, overlap, trigger collision, hook impact, component dependencies -->
<!-- SECTION_6: Usage Guide — installation, prerequisites, key components, when to use/not use -->
<!-- SECTION_7: Components — tab UI with skills, agents, commands, hooks, MCP, LSP -->
<!-- SECTION_8: Security Audit — risk badge, permission matrix, findings cards -->
<!-- SECTION_9: Dependencies — tool deps, external deps, env vars, model requirements -->
<!-- SECTION_10: Plugin Profile — component inventory, docs checklist, security risk, quality checklist -->
<!-- SECTION_11: Footer — generation metadata -->
```

- [ ] **Step 3: Renumber CSS section-label comments** in the `<style>` block.

Find and update these CSS comments to match the new section numbering:
- `/* ===== REPORT: Section 5 — Usage Guide ===== */` → `/* ===== REPORT: Section 6 — Usage Guide ===== */`
- `/* ===== REPORT: Section 6 — Components (Tab UI) ===== */` → `/* ===== REPORT: Section 7 — Components (Tab UI) ===== */`
- `/* ===== REPORT: Section 7 — Security Audit ===== */` → `/* ===== REPORT: Section 8 — Security Audit ===== */`
- `/* ===== REPORT: Section 9 — Plugin Profile ===== */` → `/* ===== REPORT: Section 10 — Plugin Profile ===== */`
- `/* ===== REPORT: Section 10 — Footer ===== */` → `/* ===== REPORT: Section 11 — Footer ===== */`

Add a new CSS comment before the existing `env-fit-*` class declarations:
`/* ===== REPORT: Section 5 — Environment Fit Diagnosis ===== */`

Move the `env-fit-*` CSS declarations from under the Plugin Profile comment group to under this new Section 5 comment group. The `env-fit-note` class uses base paragraph styling (no dedicated CSS class needed — it inherits from `<p>` within `.env-fit-item`). If custom styling is desired, it already inherits from the existing `env-fit-item p` rule.

- [ ] **Step 4: Verify no other hardcoded section-number references exist** in the template. Search for `SECTION_` and `section-` patterns. The assembler handles dynamic replacement, so only the placeholder comments need updating.

- [ ] **Step 5: Commit**

```bash
git add plugins/vision-powers/templates/agent-extension-visual.html
git commit -m "refactor(vision-powers): renumber HTML template to 11 sections for env fit promotion"
```

---

### Task 2: Update Section Structure Reference

**Files:**
- Modify: `plugins/vision-powers/skills/agent-extension-visualizing/references/section-structure.md`

- [ ] **Step 1: Read the full file** (`references/section-structure.md`).

- [ ] **Step 2: Add new Section 5 definition** between Section 4 and the old Section 5 (now Section 6).

Insert after the Section 4 block (after its `---` divider):

```markdown
## Section 5: Environment Fit Diagnosis

**Depth**: `.ve-card--elevated` | **Index**: `--i: 4`

Standalone diagnosis of whether this plugin should be installed in the user's current environment. Verdict card, context budget analysis, dependency check, functional overlap, trigger collisions, hook impact, and component dependencies.

\`\`\`html
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
    <p class="env-fit-note">{context budget notes — e.g. N skills use disable-model-invocation (zero always-on cost), N hooks may inject additionalContext}</p>
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
  <!-- Recommendations (only if not RECOMMENDED) -->
  <div class="env-fit-recommendations">
    <h4>Recommendations</h4>
    <ul>
      <li>{actionable recommendation}</li>
    </ul>
  </div>
</section>
\`\`\`
```

- [ ] **Step 3: Renumber old sections 5-10 to 6-11.**

For each section after the new Section 5:
- Change heading: `## Section N:` → `## Section N+1:`
- Change `--i:` index: increment by 1 (old `--i: 4` → `--i: 5`, old `--i: 5` → `--i: 6`, etc.)
- Change `id` on the section element if applicable

Specifically:
- Old Section 5 (Usage Guide): `--i: 4` → `--i: 5`
- Old Section 6 (Components): `--i: 5` → `--i: 6`
- Old Section 7 (Security Audit): `--i: 6` → `--i: 7`
- Old Section 8 (Dependencies): `--i: 7` → `--i: 8`
- Old Section 9 (Plugin Profile): `--i: 8` → `--i: 9`
- Old Section 10 (Footer): `--i: 9` → `--i: 10`

- [ ] **Step 4: Remove Environment Fit from Section 10 (old Section 9, Plugin Profile).**

In the new Section 10 (Plugin Profile), delete the entire `<h3>Environment Fit Diagnosis</h3>` block and all its child `env-fit-*` elements. Keep: Component Inventory, Documentation Checklist, Security Risk, Pattern & Target, Quality Checklist.

Also update the section description text (the line that says "Component inventory, documentation checklist, security risk summary, pattern, target users, quality checklist, environment fit diagnosis.") — remove ", environment fit diagnosis" from this description since it no longer belongs in this section.

- [ ] **Step 5: Commit**

```bash
git add plugins/vision-powers/skills/agent-extension-visualizing/references/section-structure.md
git commit -m "refactor(vision-powers): add Section 5 env fit, renumber sections to 11 total"
```

---

### Task 3: Update Inline Markdown Report Template

**Files:**
- Modify: `plugins/vision-powers/skills/agent-extension-visualizing/references/platforms/claude-code/report-template.md`

- [ ] **Step 1: Read the full file.**

- [ ] **Step 2: Add Environment Fit as standalone section** in the `Full Report (analyze mode)` template, between `Feature Deep Dive` and `Usage` sections.

Insert after `---` following Feature Deep Dive:

```markdown
## Environment Fit Diagnosis
> {section-intro: Assesses whether this plugin is a good fit for the user's current environment.}

**Verdict**: {RECOMMENDED|CONDITIONAL|REDUNDANT|CONFLICTING}
{1-2 sentence verdict summary}

**Installation Status**: {NEW|ALREADY_INSTALLED} — {detail}

{if context budget data exists:}
**Context Budget**:

| Resource | Current | Adding | Budget (200K) | Budget (1M) | Severity |
|----------|---------|--------|---------------|-------------|----------|
| Skill Descriptions | {n} chars | +{n} chars | {n}/{16K} ({x}%) | {n}/{~80K} ({x}%) | {severity} |
| MCP Tools | {n} servers | +{n} servers | ~{n}/{~20K} tokens | ~{n}/{~100K} tokens | {severity} |

{notes — e.g. N skills with disable-model-invocation, hook context injection patterns}

{if dependencies exist:}
**Dependency Check**: {READY|PARTIAL|ACTION_NEEDED}

| Requirement | Type | Required | Status | Help |
|-------------|------|----------|--------|------|
| {name} | {type} | {required} | {status} | {help} |

{if overlap findings exist:}
**Functional Overlap**:

| This Plugin | Existing Skill | Classification | Detail |
|-------------|----------------|----------------|--------|
| {skill} | {plugin:skill} | {classification} | {explanation} |

{if trigger collisions exist:}
**Trigger Collisions**:
- [{severity}] {analyzed-skill} ↔ {existing-skill}: {collision description}

**Hook Impact**:

| Metric | Current | Adding | Projected | Severity |
|--------|---------|--------|-----------|----------|
| Hooks (command) | {n} | +{n} | {n} | {severity} |
| Hooks (prompt/agent) | {n} | +{n} | {n} | {severity} |

{if component dependencies exist:}
**Component Dependencies**:

| Component | Depends On | Type | Status |
|-----------|------------|------|--------|
| {name} | {target} | {Skill→Skill / Agent→Skill / ...} | {AVAILABLE/MISSING} |

{if recommendations exist:}
**Recommendations**:
1. {actionable recommendation}
```

- [ ] **Step 3: Remove Environment Fit from Plugin Profile section.** Delete the `### Environment Fit Diagnosis` subsection and all its content from the Plugin Profile section in the inline markdown template. Keep Component Inventory, Documentation, Security Risk, Pattern, Target Users, Quality Checklist.

- [ ] **Step 4: Commit**

```bash
git add plugins/vision-powers/skills/agent-extension-visualizing/references/platforms/claude-code/report-template.md
git commit -m "refactor(vision-powers): add env fit as standalone section in report template"
```

---

### Task 4: Update Visual Report Writer Agent

**Files:**
- Modify: `plugins/vision-powers/agents/visual-report-writer.md`

- [ ] **Step 1: Read the full file.**

- [ ] **Step 2: Update section count references.** Find all references to "section-10" or "10 sections" and change to "section-11" / "11 sections".

- [ ] **Step 3: Update Section 9 environment fit reference.** Find references like "Section 9 Environment Fit subsection" and change to "Section 5 (Environment Fit Diagnosis — standalone section)".

- [ ] **Step 4: Update the Inputs section** of the agent's documentation (the section that lists what data the agent receives from the orchestrator).

Update field names to match the new data structure:
- Change `context_impact` → `context_budget` with expanded subfields: `{ skill_desc, mcp_tools, hook_injection, zero_cost_skills }`
- Add `component_deps: [{ source, target, dep_type, status }]` to the input field list
- Update `hook_impact` to document the new `types: {command, prompt, agent}` subfield
- Change "for Section 9 Environment Fit subsection" → "for Section 5 (Environment Fit Diagnosis — standalone section)"

- [ ] **Step 5: Add Section 5 generation instructions.** The agent needs to know it must generate `section-5.html` for the Environment Fit Diagnosis. This section receives its data from the orchestrator (SKILL.md Phase 4.5), not from feature-architect directly.

Add instructions that Section 5 uses the environment fit data passed in the agent prompt, and follows the HTML structure from `section-structure.md` Section 5.

- [ ] **Step 6: Update downstream section file mapping.** Ensure the agent generates:
- `section-1.html` through `section-4.html` (unchanged)
- `section-5.html` (NEW — Environment Fit)
- `section-6.html` through `section-11.html` (renumbered)
- `metadata.json` (unchanged)

- [ ] **Step 7: Commit**

```bash
git add plugins/vision-powers/agents/visual-report-writer.md
git commit -m "refactor(vision-powers): update visual-report-writer for 11-section layout"
```

---

## Chunk 2: Phase 4.5 Diagnostic Redesign

Restructure the diagnostic analyses, add Context Budget Analysis (3C) and Component Dependency Analysis (3F), improve Hook Impact with type tracking, and implement 200K/1M dual scenario.

### Task 5: Restructure Analysis Criteria Reference

**Files:**
- Modify: `plugins/vision-powers/skills/agent-extension-visualizing/references/platforms/claude-code/analysis-criteria.md`

- [ ] **Step 1: Read the full file.**

- [ ] **Step 2: Add Context Budget section** between Dependency Check and Functional Overlap.

```markdown
### Context Budget

Evaluate the plugin's impact on the Claude Code context window. Because the context window varies by model (200K default vs 1M extended), present both scenarios.

#### Skill Description Budget

Claude loads all skill descriptions (from skills without `disable-model-invocation: true`) at session start. Official budget: 2% of context window, with 16,000 character fallback. Overridable via `SLASH_COMMAND_TOOL_CHAR_BUDGET` env var.

| Window | Budget | Threshold (HIGH) | Threshold (MEDIUM) |
|--------|--------|-------------------|---------------------|
| 200K | 16,000 chars (fallback) | Projected > 14,000 chars (87%) | Projected > 10,000 chars (62%) |
| 1M | ~80,000 chars (est. 2% × 1M tokens × ~4 chars/token) | Projected > 70,000 chars (87%) | Projected > 50,000 chars (62%) |

Skills with `disable-model-invocation: true` have zero always-on cost — exclude from calculation.

> **Note**: The 1M budget is an estimated conversion (tokens → chars). If `SLASH_COMMAND_TOOL_CHAR_BUDGET` is set, use that value instead.

#### MCP Tool Surface

MCP tool definitions load at session start, capped at 10% of context. Excess tools are deferred until needed.

| Window | Budget | Threshold (HIGH) | Threshold (MEDIUM) |
|--------|--------|-------------------|---------------------|
| 200K | ~20,000 tokens | Projected > 18,000 tokens | Projected > 12,000 tokens |
| 1M | ~100,000 tokens | Projected > 90,000 tokens | Projected > 60,000 tokens |

Estimation heuristic (not from official docs): ~200 tokens per tool definition, ~25 tools per MCP server. Actual values vary by server — treat as rough approximation.

#### Hook Context Injection

Hooks with `type: command` that return `additionalContext` in their JSON output inject data into the main context. Hooks with `type: prompt` or `type: agent` trigger separate LLM calls (API cost, not context pollution, but worth noting).

| Pattern | Impact |
|---------|--------|
| Hook returns `additionalContext` | Direct context injection — flag |
| Hook `type: prompt` or `type: agent` | Separate LLM call — note API cost |
| Hook `type: command` with no context return | Zero context impact |
```

- [ ] **Step 3: Add Component Dependency section** after Hook & Context Impact.

```markdown
### Component Dependencies

Analyze cross-plugin references where the analyzed plugin's components depend on external skills, agents, or MCP servers.

#### Detection Patterns

| Source | Pattern | Dependency Type |
|--------|---------|-----------------|
| Skill `allowed-tools` | `Skill(plugin:name)` or `Skill(name *)` | Skill → Skill |
| Skill body | "invoke `/plugin:skill`" or "call /plugin:skill" | Skill → Skill (instructional) |
| Skill `context: fork` + `agent` | Agent name not in this plugin's `agents/` | Skill → External Agent |
| Agent `skills` field | Skill name not in this plugin's `skills/` | Agent → External Skill |
| Agent `mcpServers` (string ref) | Server name not inline-defined | Agent → External MCP |
| Skill `allowed-tools` | `mcp__servername__*` | Skill → MCP |
| Skill body | `!`command`` dynamic injection | Skill → CLI tool |

#### Status

| Status | Meaning |
|--------|---------|
| AVAILABLE | Referenced component exists in user's environment |
| MISSING | Referenced component not found — functionality will break |
| INTERNAL | Reference is within the same plugin — no external dependency |
```

- [ ] **Step 4: Update Verdict Priority rules.**

Replace the existing verdict priority list with:

```markdown
### Verdict Priority (highest severity wins)

1. Required dependency MISSING/UNSET → at least CONDITIONAL
2. Required dependency MISSING + DUPLICATE overlap → CONFLICTING
3. DUPLICATE skill with HIGH trigger collision → at least REDUNDANT
4. Multiple OVERLAP findings covering > 50% of plugin's skills → at least REDUNDANT
5. Skill description budget exceeded in 200K scenario → at least CONDITIONAL; exceeded in both 200K and 1M → CONFLICTING
6. MCP tool surface would exceed 10% cap in 200K scenario → at least CONDITIONAL; exceeded in both → CONFLICTING
7. Cross-plugin component dependency MISSING → at least CONDITIONAL
8. Projected hooks > 15 or hook context injection HIGH → at least CONDITIONAL
9. All clear → RECOMMENDED
```

- [ ] **Step 5: Remove old "Hook & Context Impact" table** (the one with hardcoded `> 5,000 (est.)` token thresholds) since it's replaced by the new Context Budget section.

Update the Hook & Context Impact section to focus on hook count and event collisions only (remove the token estimation part which now lives in Context Budget):

```markdown
### Hook Impact

| Metric | Threshold | Severity |
|--------|-----------|----------|
| Projected total hooks | > 15 | HIGH |
| Projected total hooks | 10-15 | MEDIUM |
| Same-event collisions | Any | Note (not inherently bad) |
| Hooks with prompt/agent type | > 3 | MEDIUM (API cost) |
| Hooks returning additionalContext | Any | Note (context injection) |
```

- [ ] **Step 6: Commit**

```bash
git add plugins/vision-powers/skills/agent-extension-visualizing/references/platforms/claude-code/analysis-criteria.md
git commit -m "feat(vision-powers): add context budget and component dependency criteria"
```

---

### Task 6: Rewrite Phase 4.5 in SKILL.md

**Files:**
- Modify: `plugins/vision-powers/skills/agent-extension-visualizing/SKILL.md` (lines ~204-403)

This is the largest single change. The Phase 4.5 section must be rewritten to support the new diagnostic dimensions.

- [ ] **Step 1: Read SKILL.md lines 204-403** (current Phase 4.5).

- [ ] **Step 2: Rewrite Step 1** (extract plugin characteristics).

Replace Step 1 with expanded extraction:

```markdown
**Step 1**: Extract analyzed plugin characteristics from feature-architect output:
- Plugin name and at-a-glance description (from Plugin Summary)
- Skill names and trigger descriptions (from Functionality Analysis → Skills table)
- Skill description character counts (sum of all description text)
- Skills with `disable-model-invocation: true` (zero always-on context cost)
- Hook events, count, and **types** (command / prompt / agent) (from Hooks table; 0 if no hooks)
- Hooks that return `additionalContext` (if identifiable from hook scripts)
- External requirements (`requirements` code block; empty if none)
- MCP server count (from `.mcp.json` if present)
- Component interaction patterns:
  - Skills with `allowed-tools` containing `Skill(...)` → Skill→Skill dependency
  - Skills with `context: fork` + `agent` referencing non-plugin agents → Skill→External Agent
  - Agent `skills:` field entries not in this plugin → Agent→External Skill
  - Agent `mcpServers:` string references (not inline) → Agent→External MCP
  - Skills with `allowed-tools` containing `mcp__*` patterns → Skill→MCP dependency
```

- [ ] **Step 3: Integrate new data collection into existing B3, B4, B5** (no separate B7/B8).

Instead of adding separate blocks, extend the existing scripts that already parse the same files. This also fixes a pre-existing glob path bug across B1, B2, B3, B5 (cache has marketplace/plugin/hash 3-level structure: `~/.claude/plugins/cache/{marketplace}/{plugin}/{hash}/`).

**B1 modifications** (installation check):

Replace the simple `ls | grep` with a glob that accounts for the 3-level cache structure:
```bash
# B1: Is this exact plugin already installed?
echo "=== INSTALL_STATUS ==="
ls -d ~/.claude/plugins/cache/*/{plugin-name}/ 2>/dev/null && echo "INSTALLED" || echo "(not-installed)"
```
This matches the plugin name at the correct directory level (second level under cache), avoiding false matches against marketplace names.

**B2 modifications** (installed plugins):

1. Fix glob: `'~/.claude/plugins/cache/*/.claude-plugin/plugin.json'` → `'~/.claude/plugins/cache/*/*/*/.claude-plugin/plugin.json'`
2. Fix path parsing: update `os.path.basename(os.path.dirname(os.path.dirname(pjson)))` to account for the deeper path (extract plugin name from the 3-level structure)

**B3 modifications** (installed skills):

1. Fix glob: `'~/.claude/plugins/cache/*/skills/*/SKILL.md'` → `'~/.claude/plugins/cache/*/*/*/skills/*/SKILL.md'`
2. Fix path parsing: update index offsets to account for the 3-level structure (`parts[ci+1]` → derive plugin name correctly from the deeper path)
3. Add `disable-model-invocation` detection: after parsing frontmatter, check `re.search(r'disable-model-invocation:\s*true', fm)` and mark as `disabled=1` (else `0`)
4. Add `len(desc)` to each output line (full length, not truncated)
5. Add summary line at end with aggregated char counts

Updated output format (extends existing `SKILL|plugin|skill|desc` lines):
```
SKILL|{plugin}|{skill}|{desc[:300]}|{len(desc)}|{disabled}
```

New summary line at end:
```
DESC_BUDGET_INSTALLED|{total_chars}|{disabled_count}
```

**B4 modifications** (local/user skills):

Apply the same changes as B3:
1. Add `disable-model-invocation` detection
2. Add `len(desc)` to each output line
3. Add summary line: `DESC_BUDGET_LOCAL|{total_chars}|{disabled_count}`

**B5 modifications** (hook inventory):

1. Fix glob: `'~/.claude/plugins/cache/*/hooks/hooks.json'` → `'~/.claude/plugins/cache/*/*/*/hooks/hooks.json'`
2. Fix plugin name extraction: update `hf.split('/cache/')[1].split('/')[0]` to account for 3-level structure (extract from deeper path)
3. Add hook type categorization inside the existing loop: track `command`, `http`, `prompt`, `agent` counts per hook
4. Add summary line at end: `HOOK_TYPES|{command}|{http}|{prompt}|{agent}`

**B6 modifications** (context metrics):

Remove the redundant `plugin_skills` and `local_skills` shell counting lines — B3 and B4 summary lines (`DESC_BUDGET_INSTALLED`, `DESC_BUDGET_LOCAL`) already provide these counts along with character totals. Keep only the MCP server count (reads from `settings.local.json`, no glob issue):

```bash
# B6: MCP server count
echo "=== CONTEXT_METRICS ==="
python3 -c "
import json
try:
    d = json.load(open('.claude/settings.local.json'))
    s = d.get('mcpServers', d.get('enabledMcpjsonServers', {}))
    print('mcp_servers: ' + str(len(s) if isinstance(s, dict) else len(list(s))))
except: print('mcp_servers: 0')
" 2>/dev/null
```

This approach has zero code duplication — each file is opened and parsed exactly once.

- [ ] **Step 4: Rewrite Step 3** with six diagnostic analyses.

Replace the five analyses (3A-3E) with six:

```markdown
**Step 3**: Parse bash output and perform six diagnostic analyses.

**3A: Installation Status** (from B1 output)

- Plugin name found in cache → `ALREADY_INSTALLED`
- Not found → `NEW`

**3B: Dependency Check** (from Section A output, if present)

Build requirements table: `[{name, type, required, status, help}]`.
Determine: READY / PARTIAL / ACTION_NEEDED.
If no requirements block existed → READY.

**3C: Context Budget Analysis** (from B3/B4 summary lines + B6 mcp_servers output + Step 1 data)

Calculate the plugin's context footprint using dual scenarios.

1. **Skill description chars**: Sum description chars for skills in this plugin that do NOT have `disable-model-invocation: true`. Add to current environment total from B3 `DESC_BUDGET_INSTALLED` + B4 `DESC_BUDGET_LOCAL` summary lines.
   - 200K scenario: compare against 16,000 char fallback budget
   - 1M scenario: compare against ~80,000 char budget (2% of 1M)

2. **MCP tool surface**: Count MCP servers this plugin adds (from `.mcp.json`). Estimate tokens using heuristic: servers × 25 tools × 200 tokens/tool.
   - Current MCP token estimate: `existing_servers (from B6 mcp_servers) × 25 × 200`
   - Adding: `new_servers × 25 × 200`
   - 200K scenario: compare projected total against ~20,000 token cap (10% of 200K)
   - 1M scenario: compare projected total against ~100,000 token cap (10% of 1M)

3. **Hook context injection**: Check if any hooks in this plugin return `additionalContext` or use `type: prompt`/`type: agent`. Note but don't score heavily — these are per-event, not always-on.

4. **Zero-cost skills**: Note how many skills use `disable-model-invocation: true` — these have no always-on context cost and should be highlighted as a positive design choice.

Severity determination: use the **more conservative** (200K) scenario for the overall severity, but present both in the report so users on 1M context can judge for themselves.

**3D: Functional Overlap & Trigger Analysis** (compare Step 1 skills vs B3/B4 output)

Compare the analyzed plugin's skills against all installed/local skill descriptions. For each skill, scan for semantic overlap — considering purpose, trigger phrases, and approach.

Classify each meaningful overlap:

| Classification | Condition | Example |
|----------------|-----------|---------|
| DUPLICATE | Same purpose AND same triggers | Two "commit message generator" skills |
| OVERLAP | Similar purpose, partial trigger overlap | Both handle "code review" but different scope |
| COMPLEMENT | Related domain, different purpose | One analyzes PRs, other generates changelogs |
| UPGRADE | Same purpose but analyzed plugin is superior | More features, better design, broader coverage |

For DUPLICATE/OVERLAP findings, assess trigger collision severity:
- **HIGH**: Near-identical descriptions → Claude unpredictably chooses
- **MEDIUM**: Shared keywords but distinguishable intent/scope
- **LOW**: Thematically related but clearly different triggers

**3E: Hook Impact** (from B5 output + `HOOK_TYPES` summary line)

- Current hook count + adding → projected total
- Distinguish hook types from B5 summary: command/http (lightweight, zero context) vs prompt/agent (LLM call per event)
- Flag: projected hooks > 15 (HIGH), 10-15 (MEDIUM)
- Same-event collisions with existing plugins (informational)

**3F: Component Dependency Analysis** (from Step 1 interaction patterns + B3/B4/B6 output)

For each cross-plugin reference found in Step 1:
1. Check if the referenced component exists in the user's environment (installed plugins, local skills, MCP servers)
2. Classify as AVAILABLE or MISSING
3. Internal references (within the same plugin) → INTERNAL, skip

Types to check:
- Skill → Skill: `allowed-tools: Skill(plugin:name)` or instruction-based invocation
- Agent → Skill: `skills:` field with non-plugin skill names
- Skill/Agent → MCP: `mcp__server__*` in allowed-tools, or `mcpServers:` string references
- Skill → Agent: `context: fork` + `agent` field referencing external agent

MISSING dependencies → at least CONDITIONAL verdict.
```

- [ ] **Step 5: Update Step 4** verdict priority.

```markdown
**Step 4**: Determine overall verdict using `references/platforms/claude-code/analysis-criteria.md` (Environment Fit section).

Verdict priority (highest severity wins):

1. Required dependency MISSING/UNSET → at least CONDITIONAL
2. Required dependency MISSING + DUPLICATE overlap → CONFLICTING
3. DUPLICATE skill with HIGH trigger collision → at least REDUNDANT
4. Multiple OVERLAP findings covering > 50% of plugin's skills → at least REDUNDANT
5. Skill description budget exceeded in 200K scenario → at least CONDITIONAL; exceeded in both 200K and 1M → CONFLICTING
6. MCP tool surface would exceed 10% cap in 200K scenario → at least CONDITIONAL; exceeded in both → CONFLICTING
7. Cross-plugin component dependency MISSING → at least CONDITIONAL
8. Projected hooks > 15 or hook context injection HIGH → at least CONDITIONAL
9. All clear → RECOMMENDED
```

- [ ] **Step 6: Update Step 5** diagnosis data structure.

```markdown
**Step 5**: Build diagnosis data for Phase 5/5R:

\`\`\`
environment_fit: {
  verdict: RECOMMENDED | CONDITIONAL | REDUNDANT | CONFLICTING,
  verdict_summary: "1-2 sentence diagnosis in output language",
  installation_status: NEW | ALREADY_INSTALLED,
  context_budget: {
    skill_desc: { current_chars, adding_chars, budget_200k, budget_1m, severity },
    mcp_tools: { current_servers, adding_servers, est_tokens, budget_200k, budget_1m, severity },
    hook_injection: [{ hook_name, type, impact_note }],
    zero_cost_skills: N
  },
  dependency_check: { verdict, requirements[] },
  overlap_findings: [{ analyzed_skill, existing_skill, classification, detail }],
  trigger_collisions: [{ skills, severity, collision_phrases }],
  hook_impact: { current, adding, projected, types: {command, prompt, agent}, event_collisions[], severity },
  component_deps: [{ source, target, dep_type, status }],
  recommendations: ["actionable 1-line recommendation"]
}
\`\`\`
```

- [ ] **Step 7: Commit**

```bash
git add plugins/vision-powers/skills/agent-extension-visualizing/SKILL.md
git commit -m "feat(vision-powers): redesign Phase 4.5 with context budget and component dependency analysis"
```

---

## Chunk 3: Phase 5/5R Section References and Final Integration

### Task 7: Update Phase 5/5R References in SKILL.md

**Files:**
- Modify: `plugins/vision-powers/skills/agent-extension-visualizing/SKILL.md` (Phase 5, Phase 5R sections)

- [ ] **Step 1: Read SKILL.md** Phase 5 (inline markdown) and Phase 5R (HTML) sections.

- [ ] **Step 2: Update Phase 5R** — the visual-report-writer delegation prompt.

In the agent prompt block (Phase 5R step 4), update the environment fit data field. The orchestrator now passes the expanded diagnosis data to the agent, which generates `section-5.html` as a standalone section:

```markdown
environment fit diagnosis: { verdict, verdict_summary, installation_status,
  context_budget: { skill_desc, mcp_tools, hook_injection, zero_cost_skills },
  dependency_check, overlap_findings, trigger_collisions,
  hook_impact: { current, adding, projected, types, event_collisions, severity },
  component_deps,
  recommendations }
```

Also update: "The agent writes `section-1.html` through `section-10.html`" → "through `section-11.html`".

- [ ] **Step 3: Update Phase 5R report validation step** — check for 11 sections instead of 10. Update the unreplaced placeholder check pattern to include `SECTION_11`.

- [ ] **Step 4: Update Phase 5** (inline markdown) — the report assembly instructions.

In the Phase 5 section, find the text that references Environment Fit Diagnosis as part of Plugin Profile:

```
For Environment Fit Diagnosis, include the full diagnosis from Phase 4.5 (if available): verdict, installation status, dependency check, overlap findings, hook/context impact, and recommendations.
```

Replace with:

```
Environment Fit Diagnosis is a standalone section between Feature Deep Dive and Usage (not part of Plugin Profile). Include the full diagnosis from Phase 4.5: verdict, context budget (200K/1M scenarios), installation status, dependency check, overlap/trigger findings, hook impact, component dependencies, and recommendations.
```

Also update the `analyze` mode description to reflect the new section count: "Full report with analysis, **Environment Fit Diagnosis**, and Plugin Profile".

- [ ] **Step 5: Update the Phase 5R "omit if RECOMMENDED with no findings" note.**

Currently the orchestrator prompt says `(from Phase 4.5; omit if RECOMMENDED with no findings)`. This applies to not sending env fit data to the agent. Update to clarify that when RECOMMENDED with no findings, Section 5 should still be generated but with a minimal verdict-only card (no empty subsections).

- [ ] **Step 6: Commit**

```bash
git add plugins/vision-powers/skills/agent-extension-visualizing/SKILL.md
git commit -m "refactor(vision-powers): update Phase 5/5R for 11-section layout and expanded env fit data"
```

---

### Task 8: Validate

- [ ] **Step 1: Run plugin validation**

```bash
cd /Users/ljo/Desktop/project/zero-code/claude-code-zero
unset CLAUDECODE && claude plugin validate .
```

Expected: No validation errors.

- [ ] **Step 2: Verify section-structure.md consistency**

Manually check:
- 11 section headings (`## Section 1:` through `## Section 11:`)
- `--i:` indices run from 0 to 10
- No duplicate section IDs
- Environment Fit removed from Section 10

- [ ] **Step 3: Verify report-template.md consistency**

Check:
- Environment Fit has its own `## Environment Fit Diagnosis` section
- Plugin Profile no longer contains `### Environment Fit Diagnosis`
- Section order matches: Overview → Architecture → Feature Dive → **Env Fit** → Usage → Components → Security → Dependencies → Profile

- [ ] **Step 4: Verify SKILL.md Phase 4.5 consistency**

Check:
- Step 1 extracts component interaction patterns
- Step 2 bash script: B1/B2 use 3-level cache glob, B3 includes desc char count + disabled flag, B5 includes hook type breakdown, B6 is MCP-only (no redundant skill counts)
- Step 3 has six analyses: 3A through 3F
- Step 4 verdict priority has 9 rules (updated)
- Step 5 data structure includes context_budget and component_deps

- [ ] **Step 5: Verify visual-report-writer Inputs section matches data structure**

Check that the agent's Inputs documentation lists:
- `context_budget` (not old `context_impact`)
- `component_deps`
- `hook_impact.types`
- References "Section 5" (not "Section 9") for environment fit

- [ ] **Step 6: Commit validation fixes if any**

```bash
git add -A
git commit -m "fix(vision-powers): address validation issues from env fit redesign"
```

---

## Summary of Changes

| File | Change Type | Description |
|------|-------------|-------------|
| `templates/agent-extension-visual.html` | Modify | Add SECTION_5 placeholder, renumber 5-10 → 6-11 |
| `references/section-structure.md` | Modify | Add Section 5 HTML structure, renumber, remove env fit from Section 10 |
| `references/platforms/claude-code/report-template.md` | Modify | Add env fit standalone section, remove from Plugin Profile |
| `references/platforms/claude-code/analysis-criteria.md` | Modify | Add Context Budget + Component Dependency sections, update verdict priority |
| `SKILL.md` (Phase 4.5) | Modify | Rewrite 5 analyses → 6 analyses, integrate desc budget into B3/B4 + hook types into B5, fix 3-level cache globs (B1/B2/B3/B5), slim B6 to MCP-only, expand data structure |
| `SKILL.md` (Phase 5/5R) | Modify | Update section count references, expand env fit data in agent prompt |
| `agents/visual-report-writer.md` | Modify | Update from 10 → 11 sections, update env fit section reference |

No new files created. No files deleted. All changes are in existing files under `plugins/vision-powers/`.
