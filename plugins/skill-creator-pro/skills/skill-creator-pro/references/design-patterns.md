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

Four types are available:
- **`command`** — Run a shell script. Most common for linting, logging, validation.
- **`prompt`** — Inject a model prompt. Good for safety checks that need reasoning.
- **`http`** — POST JSON to a URL. Useful for external integrations without shell access (e.g., webhooks, logging services).
- **`agent`** — Spawn a subagent for complex evaluation.

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

`PreToolUse`, `PostToolUse`, `SessionStart`, `Stop`, `SubagentStop`, `StopFailure`, `SessionEnd`, `SubagentStart`, `UserPromptSubmit`, `PreCompact`, `PostCompact`, `Notification`, `PermissionRequest`, `Setup`, `ConfigChange`, `CwdChanged`, `FileChanged`, `TaskCreated`, `TeammateIdle`, `TaskCompleted`, `InstructionsLoaded`, `Elicitation`, `ElicitationResult`, `WorktreeCreate`, `WorktreeRemove`. Verify against official docs — events evolve across releases.

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

---

## Composing Skills

Dependency management is not natively built into skills or marketplaces. Reference other skills by name and Claude will invoke them if installed.

```markdown
## Workflow
1. Use the `fetch-data` skill to gather metrics
2. Process the data using this skill's analysis
3. Use the `format-report` skill to generate the output
```

If a dependency is critical, document it in the skill's description or compatibility field.

---

## Measuring Skills

### Usage Tracking

Use a PreToolUse hook to log skill usage:
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
- Which skills are popular vs underused
- Skills that undertrigger compared to expectations
- Time and token consumption patterns

---

## Description as Trigger

### The Key Insight

When a session starts, Claude builds a listing of every skill with its description. This listing is what Claude scans to decide "is there a skill for this request?" The description is NOT a summary -- it's a trigger condition.

### Formula

```
[What to use it for] + [Specific trigger contexts] + [What NOT to use it for (optional)]
```

### Display Cap and Character Budget

The `/skills` listing truncates descriptions to **250 characters** — front-load key trigger phrases. The full description is still used for triggering, but users can't see past the cap in the menu.

The skill body budget scales to ~2% of the context window. With 1M context, that's ~20K characters; with 200K, ~4K. Keep SKILL.md lean and push detail to reference files.

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
