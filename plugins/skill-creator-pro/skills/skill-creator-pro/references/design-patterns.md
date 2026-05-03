# Skill Design Patterns

Detailed guidance on writing effective skills, from gotchas sections to progressive disclosure to on-demand hooks.

## Table of Contents

1. [Writing Effective Instructions](#writing-effective-instructions)
2. [Gotchas Section Design](#gotchas-section-design)
3. [Progressive Disclosure](#progressive-disclosure)
4. [On-Demand Hooks](#on-demand-hooks)
5. [Setup Pattern](#setup-pattern)
6. [Memory and Data Persistence](#memory-and-data-persistence)
7. [Scripts and Code Generation](#scripts-and-code-generation)
8. [Composing Skills](#composing-skills)
9. [Measuring Skills](#measuring-skills)
10. [Description as Trigger](#description-as-trigger)

---

## Implementation Patterns

Five common patterns for structuring skill workflows. Choose the one that fits your skill's primary action.

### Pattern 1: Sequential Workflow Orchestration

**Use when:** Users need multi-step processes in a specific order.

```markdown
## Workflow: Onboard New Customer

### Step 1: Create Account
Call MCP tool: `create_customer`
Parameters: name, email, company

### Step 2: Setup Payment
Call MCP tool: `setup_payment_method`
Wait for: payment method verification

### Step 3: Create Subscription
Call MCP tool: `create_subscription`
Parameters: plan_id, customer_id (from Step 1)

### Step 4: Send Welcome Email
Call MCP tool: `send_email`
Template: welcome_email_template
```

Key techniques: explicit step ordering, dependencies between steps, validation at each stage, rollback instructions for failures.

### Pattern 2: Multi-MCP Coordination

**Use when:** Workflows span multiple services (e.g., Figma + Google Drive + Linear + Slack).

```markdown
### Phase 1: Design Export (Figma MCP)
1. Export design assets from Figma
2. Generate design specifications

### Phase 2: Asset Storage (Drive MCP)
1. Create project folder in Drive
2. Upload all assets

### Phase 3: Task Creation (Linear MCP)
1. Create development tasks
2. Attach asset links to tasks

### Phase 4: Notification (Slack MCP)
1. Post handoff summary to #engineering
```

Key techniques: clear phase separation, data passing between MCPs, validation before moving to next phase.

### Pattern 3: Iterative Refinement

**Use when:** Output quality improves with iteration (reports, documents, designs).

```markdown
## Iterative Report Creation

### Initial Draft
1. Fetch data via MCP
2. Generate first draft report
3. Save to temporary file

### Quality Check
1. Run validation script: `scripts/check_report.py`
2. Identify issues:
   - Missing sections
   - Inconsistent formatting
   - Data validation errors

### Refinement Loop
1. Address each identified issue
2. Regenerate affected sections
3. Re-validate
4. Repeat until quality threshold met
```

Key techniques: explicit quality criteria, validation scripts, knowing when to stop iterating.

### Pattern 4: Context-aware Tool Selection

**Use when:** Same outcome, different tools depending on context.

```markdown
### Decision Tree
1. Check file type and size
2. Determine best storage location:
   - Large files (>10MB): Use cloud storage MCP
   - Collaborative docs: Use Notion/Docs MCP
   - Code files: Use GitHub MCP
   - Temporary files: Use local storage

### Execute Storage
Based on decision:
- Call appropriate MCP tool
- Apply service-specific metadata

### Provide Context to User
Explain why that storage was chosen
```

Key techniques: clear decision criteria, fallback options, transparency about choices.

### Pattern 5: Domain-specific Intelligence

**Use when:** Your skill adds specialized knowledge beyond tool access.

```markdown
### Before Processing (Compliance Check)
1. Fetch transaction details via MCP
2. Apply compliance rules:
   - Check sanctions lists
   - Verify jurisdiction allowances
   - Assess risk level
3. Document compliance decision

### Processing
IF compliance passed:
   - Call payment processing MCP tool
   - Apply appropriate fraud checks
ELSE:
   - Flag for review
   - Create compliance case
```

Key techniques: domain expertise embedded in logic, compliance before action, comprehensive documentation.

---

## Writing Effective Instructions

### Use Imperative Form
Write instructions as commands, not descriptions. "Run the validation script" not "The validation script should be run."

### Define Output Formats Explicitly
```markdown
## Report Structure
Use this exact template:
# [Title]
## Executive Summary
## Key Findings
## Recommendations
```

### Include Examples
```markdown
## Commit Message Format
**Example 1:**
Input: Added user authentication with JWT tokens
Output: feat(auth): implement JWT-based authentication
```

### Avoid Ambiguous Language
Bad: "Make sure to validate things properly"

Good:
```markdown
Before calling create_project, verify:
- Project name is non-empty
- At least one team member assigned
- Start date is not in the past
```

### Combat Model Laziness
For critical steps, add explicit encouragement:
```markdown
## Quality Notes
- Take your time to do this thoroughly
- Quality is more important than speed
- Do not skip validation steps
```

### Common Causes of Instructions Not Being Followed
1. **Too verbose** -- Keep concise, use bullet points
2. **Critical instructions buried** -- Put them at the top, use `## Important` headers
3. **Ambiguous language** -- Be precise about what to do
4. **No deterministic checks** -- Bundle validation scripts for automated verification

---

## Gotchas Section Design

The gotchas section is the highest-signal content in any skill. It should be built up from real failure points.

### Structure
```markdown
## Gotchas

### [Category: e.g., API Behavior]
- **Silent failures**: Batch size > 100 drops records without error. Always check response count.
- **Type mismatch**: API returns snake_case, SDK expects camelCase. Transform at boundary.

### [Category: e.g., Testing]
- **Time dependency**: Never use `datetime.now()`. Inject time as a parameter.
- **State leakage**: Tests share database state. Always reset in setUp/tearDown.
```

### How to Build Gotchas
1. **Start with domain knowledge** -- What are known footguns in this area?
2. **Add from test runs** -- When Claude fails during evaluation, capture why
3. **Update continuously** -- Most skills start with 2-3 gotchas and grow to 10+
4. **Be specific** -- "Don't forget error handling" is useless. "The /upload endpoint returns 200 even on failure; check the `status` field in the response body" is actionable.

### Anti-Patterns to Avoid
- Generic warnings that apply to all code ("be careful with null values")
- Gotchas that Claude already knows (basic language features)
- Gotchas without solutions (state the problem AND the fix)

---

## Progressive Disclosure

### The Three-Level System

| Level | What | When Loaded | Size Target |
|-------|------|-------------|-------------|
| 1. Frontmatter | name + description | Always (every session) | ~100 words |
| 2. SKILL.md body | Instructions + navigation | When skill triggers | <500 lines |
| 3. Bundled files | Detailed docs, scripts, templates | When referenced | Unlimited |

### Skill content lifecycle

Invoked skill content enters the conversation as a single message and stays for the rest of the session. Auto-compaction carries skills forward within a token budget — Claude Code re-attaches the most recent invocation of each skill after the summary, keeping the **first 5,000 tokens** of each. Re-attached skills share a combined budget of **25,000 tokens**. Older skills can be dropped entirely after compaction if many were invoked. (skills.md)

If a skill seems to stop influencing behavior after the first response, the content is usually still present and the model is choosing other tools. Strengthen the description and instructions so the model keeps preferring it, or use hooks to enforce behavior deterministically. If the skill is large or you invoked several others after it, **re-invoke it after compaction** to restore the full content.

### SKILL.md as Navigation Hub

Keep SKILL.md focused on the workflow. Move detailed content to referenced files:

```markdown
## API Integration
For endpoint details and rate limits, see [references/api.md](references/api.md).
For authentication flow, see [references/auth.md](references/auth.md).
```

### Domain-Variant Organization

When a skill supports multiple domains/frameworks, organize by variant:

```
cloud-deploy/
SKILL.md (workflow + selection logic)
references/
  aws.md
  gcp.md
  azure.md
```

Claude reads only the relevant reference file based on context.

### When to Split vs Keep Inline

- **Keep inline**: Critical instructions, gotchas, key decision points
- **Split to reference**: API signatures, detailed examples, configuration matrices
- **Split to script**: Validation logic, data transformations, report generation

---

## On-Demand Hooks

Skills can register hooks that activate only when the skill is called and last for the session duration.

### When to Use Hooks
- Touching production data or systems
- Destructive operations that need guardrails
- Enforcing directory boundaries during debugging
- Automated quality checks after file modifications

### Configuration in SKILL.md Frontmatter

```yaml
hooks:
  PreToolUse:
    - matcher: "Bash"
      hooks:
        - type: prompt
          prompt: "Check if this bash command could be destructive (rm -rf, DROP TABLE, force-push, kubectl delete). If so, block it with a warning."
  PostToolUse:
    - matcher: "Write|Edit"
      hooks:
        - type: command
          command: "${CLAUDE_PLUGIN_ROOT}/scripts/lint.sh"
```

### Hook Types

Five types are available:
- **`command`** — Run a shell script. Most common for linting, logging, validation.
- **`prompt`** — Inject a model prompt. Good for safety checks that need reasoning.
- **`http`** — POST JSON to a URL. Useful for external integrations without shell access (e.g., webhooks, logging services).
- **`agent`** — Spawn a subagent for complex evaluation.
- **`mcp_tool`** — Invoke an MCP tool directly (added in v2.1.118). Skip the shell round-trip when the action is already exposed by an MCP server (e.g., post a Linear comment, log to a webhook MCP, write to a Notion page). Specify `tool_name` and `arguments` in the hook entry.

### Conditional Filtering with `if`

Hooks support an `if` field using permission rule syntax to narrow when they fire. This reduces process spawning overhead:

```yaml
hooks:
  PreToolUse:
    - matcher: "Bash"
      hooks:
        - type: command
          command: "${CLAUDE_PLUGIN_ROOT}/scripts/check_destructive.sh"
          if: "Bash(rm *)"  # Only fire for rm commands
```

### Available Hook Events

`PreToolUse`, `PostToolUse`, `SessionStart`, `Stop`, `SubagentStop`, `StopFailure`, `SessionEnd`, `SubagentStart`, `UserPromptSubmit`, `UserPromptExpansion`, `PostToolBatch`, `PostToolUseFailure`, `PreCompact`, `PostCompact`, `Notification`, `PermissionRequest`, `PermissionDenied`, `Setup`, `ConfigChange`, `CwdChanged`, `FileChanged`, `TaskCreated`, `TeammateIdle`, `TaskCompleted`, `InstructionsLoaded`, `Elicitation`, `ElicitationResult`, `WorktreeCreate`, `WorktreeRemove`. Verify against official docs — events evolve across releases.

### Examples

**Safety guard (`/careful`):**
Blocks destructive commands via PreToolUse matcher on Bash. Activate when touching prod.

**Directory freeze (`/freeze`):**
Blocks Edit/Write outside a specific directory. Useful when debugging to prevent accidental "fixes" to unrelated code.

**Auto-lint (`/strict`):**
Runs linter after every Write/Edit. Catches style violations immediately.

---

## Setup Pattern

For skills that need user-specific configuration.

### Lazy Initialization Flow

```
1. Skill invoked
2. Check ${CLAUDE_PLUGIN_DATA}/config.json
3. Config exists? -> Use it
   Config missing? -> Ask user via AskUserQuestion
4. Save config for future invocations
```

### Example Config

```json
{
  "slack_channel": "#eng-standup",
  "team_name": "Platform",
  "timezone": "America/Los_Angeles",
  "configured_at": "2026-01-15T10:30:00Z"
}
```

### AskUserQuestion for Structured Setup

```markdown
If config is not set up, use AskUserQuestion to ask:
- Which Slack channel to post to? (options: #eng-standup, #general, Other)
- What timezone for scheduling? (options: US/Pacific, US/Eastern, UTC, Other)
```

---

## Memory and Data Persistence

### Storage Location

Always use `${CLAUDE_PLUGIN_DATA}` for persistent data. Data in the skill directory is deleted on plugin upgrade.

### Patterns by Complexity

**Simple: Append-only log**
```
${CLAUDE_PLUGIN_DATA}/standups.log
```
Each invocation appends its output. Next invocation reads the log to detect deltas.

**Medium: Structured JSON**
```
${CLAUDE_PLUGIN_DATA}/history.json
```
Maintain a structured record of past invocations with timestamps.

**Advanced: SQLite database**
```
${CLAUDE_PLUGIN_DATA}/data.db
```
For skills that need complex queries across historical data.

### Delta Detection

When a skill maintains history, use it for delta-only reporting:
```markdown
Read ${CLAUDE_PLUGIN_DATA}/history.log to find what changed since the last run.
Only report new items, not everything.
```

---

## Scripts and Code Generation

### Bundle Reusable Scripts

Give Claude scripts and libraries so it spends turns on composition, not reconstructing boilerplate.

```python
# scripts/analytics.py
def fetch_events(start, end, event_types): ...
def compute_retention(cohort_date, window_days): ...
def format_report(title, sections): ...
```

Claude generates scripts on the fly to compose these functions for complex analysis.

### When to Bundle a Script

Strong signal: During testing, all subagents independently write a similar helper script. If 3 test cases result in similar `create_docx.py` or `build_chart.py`, bundle it in `scripts/`.

### Script Best Practices
- Include shebang line (`#!/usr/bin/env python3`)
- Set execute permission (`chmod +x`)
- Use `${CLAUDE_PLUGIN_ROOT}` for paths in hook scripts
- Keep scripts focused on one task for composability

---

## MCP Server Considerations

If your skill includes an MCP server (`.mcp.json`), keep tool descriptions and server instructions under **2KB each** — the platform truncates anything longer. Write concise descriptions and put detailed docs in `references/` files instead.

### `alwaysLoad` Option (v2.1.121)

By default, MCP tools are deferred and surface through `ToolSearch`. Set `"alwaysLoad": true` on a server entry when its tools must be reachable on every turn without a search step — typical for safety checks, mandatory pre-flight queries, or low-tool-count servers tightly bound to the skill's workflow.

```json
{
  "mcpServers": {
    "guardrail-mcp": {
      "command": "node",
      "args": ["${CLAUDE_PLUGIN_ROOT}/mcp/guardrail.js"],
      "alwaysLoad": true
    }
  }
}
```

Use sparingly. Every always-loaded tool consumes startup context budget (~description-length per tool). For servers with many tools, prefer the default deferred behavior.

---

## Composing Skills

Dependency management is not natively built into skills or marketplaces. Reference other skills by name — Claude will invoke them if installed.

### Inline Reference

Mention another skill by name in your instructions. Claude will invoke it if the user has it installed:

```markdown
## Workflow
1. Use the `fetch-data` skill to gather metrics
2. Process the data using this skill's analysis
3. Use the `format-report` skill to generate the output
```

### Skill ↔ Subagent Composition

Two complementary mechanisms link skills and subagents — pick by which side owns the configuration.

**Mechanism 1: Skill drives the subagent (`context: fork`)**

Add `context: fork` + `agent: <type>` to your SKILL.md. The skill body becomes the prompt for a forked subagent context. Use when a skill needs an isolated context but the workflow lives inside the skill.

```yaml
---
name: deep-research
description: Research a topic thoroughly
context: fork
agent: Explore
---
```

**Mechanism 2: Subagent preloads skills (`skills` field on the SUBAGENT)**

The `skills` frontmatter belongs on a **subagent definition** (`.claude/agents/<name>.md`), NOT on a skill. The full content of each listed skill is injected into the subagent's context at startup. Subagents don't inherit skills from the parent conversation; you must list them explicitly.

```yaml
---
name: api-developer
description: Implements API endpoints
skills:
  - api-conventions
  - error-handling
---
Implement API endpoints. Follow the conventions and patterns from the preloaded skills.
```

You cannot preload skills that set `disable-model-invocation: true`.

Pick mechanism 1 when the skill is the entry point and orchestrates a subagent. Pick mechanism 2 when a custom subagent should always have certain skills loaded. See [sub-agents.md "Preload skills into subagents"](https://code.claude.com/docs/en/sub-agents#preload-skills-into-subagents) for the spec.

### Graceful Degradation

A plugin must never assume another plugin is installed. When composing:

- Don't route users to a specific plugin by name ("use `claw-mo` instead")
- Check if the tool/skill is available before depending on it
- Provide a fallback path when the dependency is missing
- Document optional dependencies in the compatibility field, not as hard requirements

```markdown
## Data Visualization
If the `chart-builder` skill is available, use it for graphs.
Otherwise, generate a markdown table with the data.
```

---

## Measuring Skills

### Usage Tracking

Use a PreToolUse hook to log when skills are invoked. This enables data-driven improvement:

```json
{
  "hooks": {
    "PreToolUse": [{
      "matcher": "Skill",
      "hooks": [{ "type": "command", "command": "echo \"$(date) $TOOL_INPUT\" >> ${CLAUDE_PLUGIN_DATA}/usage.log" }]
    }]
  }
}
```

### What to Track
- **Popular vs underused** — High-usage skills justify more investment; low-usage may need description optimization or retirement
- **Under-triggering** — If a skill exists for a task but users invoke it manually instead of auto-triggering, the description needs work
- **Time and token consumption** — Skills that significantly increase token usage without proportional quality gain may need to be leaned down
- **Regression after model updates** — Rerun evals after model changes to catch skills that break or become redundant (see Phase 3: Model Update Check)

**2. OpenTelemetry `claude_code.skill_activated` event (v2.1.126)** — fires on every skill activation and carries `invocation_trigger` (`"user-slash"`, `"claude-proactive"`, or `"nested-skill"`). Aggregate by trigger to spot under-triggering: a skill mostly fired by `user-slash` is probably failing to auto-trigger and needs a description rewrite.

### Detecting Under-triggering

With OTel enabled, query `claude_code.skill_activated` events and group by `invocation_trigger`:
- `user-slash` ratio > ~70% → description fails to auto-trigger; rewrite with more contextual phrasings
- `claude-proactive` healthy mix → auto-triggering works; iterate on output quality instead
- `nested-skill` only → skill is purely a composition target; description optimization is lower priority

Without OTel: review usage logs from the PreToolUse hook above. If a skill is manually invoked (via `/skill-name`) far more often than auto-triggered, run the description optimization loop from Phase 5.

---

## Description as Trigger

### The Key Insight

When a session starts, Claude builds a listing of every skill with its description. This listing is what Claude scans to decide "is there a skill for this request?" The description is NOT a summary -- it's a trigger condition.

### Formula

```
[What to use it for] + [Specific trigger contexts] + [What NOT to use it for (optional)]
```

### Description Length and Body Budget

The combined `description` and `when_to_use` text caps at **1,536 characters** in the skill listing (skills.md). Front-load trigger phrases — attention is strongest at the start. Adding `when_to_use` does not raise the cap; it shares the same 1,536 budget. Long descriptions dilute the trigger signal and gain nothing.

The skill body budget scales to **1% of the context window**, with a fallback of **8,000 characters** (skills.md). Set `SLASH_COMMAND_TOOL_CHAR_BUDGET` env var to raise the limit. Keep SKILL.md lean and push detail to reference files.

### Make It "Pushy"

Claude tends to undertrigger -- it doesn't use skills when they'd be useful. Combat this by making descriptions slightly assertive:

Instead of:
> "How to build a simple fast dashboard to display internal data."

Write:
> "Build dashboards to display internal data. Use this skill whenever the user mentions dashboards, data visualization, internal metrics, or wants to display any kind of company data, even if they don't explicitly ask for a 'dashboard.'"

### Debugging Triggers

Ask Claude: "When would you use the [skill name] skill?" -- Claude will quote the description back. Adjust based on what's missing or wrong.

### Under-triggering Fixes
- Add more keywords and trigger phrases
- Include specific file types if relevant
- Mention adjacent concepts users might say

### Over-triggering Fixes
- Add negative triggers: "Do NOT use for simple data exploration (use data-viz skill instead)"
- Be more specific about scope
- Differentiate from adjacent skills
