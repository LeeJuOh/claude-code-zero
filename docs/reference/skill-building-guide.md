# Skill Building Guide

Extracted from Anthropic's "The Complete Guide to Building Skills for Claude" (PDF). Covers content NOT found in other reference docs. For file structure see `skill-supporting-files.md`, for allowed-tools see `skill-allowed-tools.md`, for command proxy see `command-proxy-pattern.md`.

## Core Design Principles

### Progressive Disclosure (3-Level System)

- **Level 1 (YAML frontmatter)**: Always loaded in Claude's system prompt. Provides just enough info to decide when to load the skill. Keep it lean.
- **Level 2 (SKILL.md body)**: Loaded only when Claude thinks the skill is relevant. Contains full instructions and guidance.
- **Level 3 (Linked files)**: Additional files in `scripts/`, `references/`, `assets/` that Claude discovers and navigates as needed.

This minimizes token usage while maintaining specialized expertise.

### Composability

Claude loads multiple skills simultaneously. Your skill should work well alongside others, not assume it's the only capability available.

### Portability

Skills work identically across Claude.ai, Claude Code, and API. Create a skill once and it works across all surfaces without modification, provided the environment supports any dependencies the skill requires.

### MCP + Skills Relationship

| MCP (Connectivity) | Skills (Knowledge) |
|---|---|
| Connects Claude to your service | Teaches Claude how to use your service effectively |
| Provides real-time data access and tool invocation | Captures workflows and best practices |
| What Claude can do | How Claude should do it |

**Analogy**: MCP = professional kitchen (tools, ingredients, equipment). Skills = recipes (step-by-step instructions).

## YAML Frontmatter Field Reference

### Required Fields

**name**:
- kebab-case only, no spaces or capitals
- Should match folder name

**description**:
- Must include BOTH: what it does + when to use it (trigger conditions)
- Under 1024 characters
- No XML tags (`<` or `>`)
- Include specific tasks users might say
- Mention file types if relevant

### Optional Fields

**allowed-tools**: Comma-separated tool list (see `skill-allowed-tools.md`)

**license**: MIT, Apache-2.0, etc.

**compatibility**: 1-500 characters. Environment requirements (e.g. intended product, required system packages, network access needs)

**metadata**: Custom key-value pairs (e.g. `author`, `version`, `mcp-server`)

### Security Restrictions

- No XML angle brackets (`<` `>`) in frontmatter — frontmatter appears in Claude's system prompt, malicious content could inject instructions
- Skills with "claude" or "anthropic" in name are reserved

## Description Writing

### Formula

```
[What it does] + [When to use it] + [Key capabilities]
```

### Good Examples

```yaml
# Specific and actionable
description: Analyzes Figma design files and generates developer handoff
  documentation. Use when user uploads .fig files, asks for "design specs",
  "component documentation", or "design-to-code handoff".

# Includes trigger phrases
description: Manages Linear project workflows including sprint planning,
  task creation, and status tracking. Use when user mentions "sprint",
  "Linear tasks", "project planning", or asks to "create tickets".

# Clear value proposition
description: End-to-end customer onboarding workflow for PayFlow. Handles
  account creation, payment setup, and subscription management. Use when
  user says "onboard new customer", "set up subscription", or "create
  PayFlow account".
```

### Bad Examples

```yaml
# Too vague
description: Helps with projects.

# Missing triggers
description: Creates sophisticated multi-page documentation systems.

# Too technical, no user triggers
description: Implements the Project entity model with hierarchical relationships.
```

### Fixing Trigger Issues

**Under-triggering** (skill doesn't load when it should):
- Signals: users manually enabling it, support questions about when to use it
- Fix: Add more detail and nuance to description, include keywords for technical terms

**Over-triggering** (skill loads for irrelevant queries):
- Signals: skill loads for unrelated queries, users disabling it, confusion about purpose
- Fix: Add negative triggers: `Do NOT use for simple data exploration (use data-viz skill instead).`
- Be more specific about scope: `Use specifically for online payment workflows, not for general financial queries.`

**Debugging technique**: Ask Claude "When would you use the [skill name] skill?" — Claude will quote the description back. Adjust based on what's missing.

## Instruction Writing Best Practices

### Recommended SKILL.md Template

```markdown
---
name: your-skill
description: [...]
---

# Your Skill Name

## Instructions

### Step 1: [First Major Step]
Clear explanation of what happens.

Example:
` ` `bash
python scripts/fetch_data.py --project-id PROJECT_ID
Expected output: [describe what success looks like]
` ` `

(Add more steps as needed)

## Examples

### Example 1: [common scenario]
User says: "..."
Actions:
1. ...
2. ...
Result: ...

## Troubleshooting

### Error: [Common error message]
Cause: [Why it happens]
Solution: [How to fix]
```

### Be Specific and Actionable

Good:
```
Run `python scripts/validate.py --input {filename}` to check data format.
If validation fails, common issues include:
- Missing required fields (add them to the CSV)
- Invalid date formats (use YYYY-MM-DD)
```

Bad:
```
Validate the data before proceeding.
```

### Include Error Handling

```markdown
## Common Issues

### MCP Connection Failed
If you see "Connection refused":
1. Verify MCP server is running: Check Settings > Extensions
2. Confirm API key is valid
3. Try reconnecting: Settings > Extensions > [Your Service] > Reconnect
```

### Reference Bundled Resources Clearly

```
Before writing queries, consult `references/api-patterns.md` for:
- Rate limiting guidance
- Pagination patterns
- Error codes and handling
```

### Use Progressive Disclosure

Keep SKILL.md focused on core instructions. Move detailed documentation to `references/` and link to it.

### Combat Model Laziness

Add explicit encouragement (more effective in user prompt than SKILL.md):

```markdown
## Performance Notes
- Take your time to do this thoroughly
- Quality is more important than speed
- Do not skip validation steps
```

### Avoid Ambiguous Language

Bad: `Make sure to validate things properly`

Good:
```
CRITICAL: Before calling create_project, verify:
- Project name is non-empty
- At least one team member assigned
- Start date is not in the past
```

### Instructions Not Followed — Common Causes

1. **Too verbose**: Keep concise, use bullet points and numbered lists
2. **Instructions buried**: Put critical instructions at the top, use `## Important` or `## Critical` headers. Repeat key points if needed
3. **Ambiguous language**: Be precise about what exactly to do
4. **Advanced technique**: Bundle validation scripts for deterministic checks rather than relying on language instructions. Code is deterministic; language interpretation isn't.

## File Structure Rules

```
your-skill-name/
  SKILL.md                  # Required - main skill file
  scripts/                  # Optional - executable code
  references/               # Optional - documentation
  assets/                   # Optional - templates, fonts, icons
```

- **SKILL.md naming**: Must be exactly `SKILL.md` (case-sensitive). No variations (SKILL.MD, skill.md, etc.)
- **Folder naming**: kebab-case only. No spaces (`Notion Project Setup`), no underscores (`notion_project_setup`), no capitals (`NotionProjectSetup`)
- **No README.md** inside skill folder. All documentation goes in SKILL.md or references/. (For GitHub distribution, use a repo-level README separate from the skill folder)

## Skill Design Patterns

### Choosing Your Approach

- **Problem-first**: "I need to set up a project workspace" -> Skill orchestrates the right MCP calls in the right sequence. Users describe outcomes; the skill handles the tools.
- **Tool-first**: "I have Notion MCP connected" -> Skill teaches Claude the optimal workflows and best practices. Users have access; the skill provides expertise.

### Pattern 1: Sequential Workflow Orchestration

**Use when**: Multi-step processes in a specific order.

Key techniques: explicit step ordering, dependencies between steps, validation at each stage, rollback instructions for failures.

### Pattern 2: Multi-MCP Coordination

**Use when**: Workflows span multiple services.

Key techniques: clear phase separation, data passing between MCPs, validation before moving to next phase, centralized error handling.

### Pattern 3: Iterative Refinement

**Use when**: Output quality improves with iteration.

Key techniques: explicit quality criteria, iterative improvement, validation scripts, know when to stop iterating.

### Pattern 4: Context-Aware Tool Selection

**Use when**: Same outcome, different tools depending on context.

Key techniques: clear decision criteria, fallback options, transparency about choices.

### Pattern 5: Domain-Specific Intelligence

**Use when**: Skill adds specialized knowledge beyond tool access.

Key techniques: domain expertise embedded in logic, compliance before action, comprehensive documentation, clear governance.

## Testing Approach

### Testing Methods

- **Manual testing in Claude.ai** — Run queries directly and observe behavior. Fast iteration, no setup required.
- **Scripted testing in Claude Code** — Automate test cases for repeatable validation across changes.
- **Programmatic testing via skills API** — Build evaluation suites that run systematically against defined test sets.

**Pro Tip**: Iterate on a single challenging task until Claude succeeds, then extract the winning approach into a skill. This leverages in-context learning and provides faster signal than broad testing.

### 1. Triggering Tests

Ensure your skill loads at the right times.

- Should trigger on obvious tasks
- Should trigger on paraphrased requests
- Should NOT trigger on unrelated topics

### 2. Functional Tests

Verify the skill produces correct outputs.

- Valid outputs generated
- API calls succeed
- Error handling works
- Edge cases covered

### 3. Performance Comparison

Prove the skill improves results vs. baseline.

Compare with-skill vs without-skill on same task: tool calls count, token consumption, user corrections needed.

## Success Criteria

### Quantitative

- Skill triggers on 90% of relevant queries
  - *How to measure*: Run 10-20 test queries. Track automatic vs explicit invocation.
- Completes workflow in X tool calls (compare with/without skill)
  - *How to measure*: Count tool calls and total tokens consumed.
- 0 failed API calls per workflow
  - *How to measure*: Monitor MCP server logs. Track retry rates and error codes.

### Qualitative

- Users don't need to prompt Claude about next steps
  - *How to assess*: During testing, note how often you need to redirect or clarify.
- Workflows complete without user correction
  - *How to assess*: Run the same request 3-5 times. Compare outputs for consistency and quality.
- Consistent results across sessions
  - *How to assess*: Can a new user accomplish the task on first try with minimal guidance?

## Distribution

### Current Distribution Model

**Individual users**:
1. Download the skill folder
2. Zip the folder (if needed)
3. Upload to Claude.ai via Settings > Capabilities > Skills
4. Or place in Claude Code skills directory

**Organization-level skills**:
- Admins can deploy skills workspace-wide
- Automatic updates
- Centralized management

### Using Skills via API

- `/v1/skills` endpoint for listing and managing skills
- Add skills to Messages API requests via the `container.skills` parameter
- Version control and management through the Claude Console
- Works with the Claude Agent SDK for building custom agents
- Skills in the API require the Code Execution Tool beta

| Use Case | Best Surface |
|---|---|
| End users interacting with skills directly | Claude.ai / Claude Code |
| Manual testing and iteration | Claude.ai / Claude Code |
| Applications using skills programmatically | API |
| Production deployments at scale | API |
| Automated pipelines and agent systems | API |

### Positioning Your Skill

Focus on outcomes, not features:

Good: `"The ProjectHub skill enables teams to set up complete project workspaces in seconds — including pages, databases, and templates — instead of spending 30 minutes on manual setup."`

Bad: `"The ProjectHub skill is a folder containing YAML frontmatter and Markdown instructions that calls our MCP server tools."`

## Use Case Categories

### Category 1: Document & Asset Creation
Creating consistent, high-quality output (documents, presentations, apps, designs, code). Techniques: embedded style guides, template structures, quality checklists, no external tools needed.

### Category 2: Workflow Automation
Multi-step processes with consistent methodology, including coordination across multiple MCP servers. Techniques: step-by-step validation gates, templates for common structures, built-in review suggestions, iterative refinement loops.

### Category 3: MCP Enhancement
Workflow guidance to enhance MCP server tool access. Techniques: coordinates multiple MCP calls in sequence, embeds domain expertise, provides context users would otherwise need to specify, error handling for common MCP issues.

## Troubleshooting

### Skill Won't Upload

**Error: "Could not find SKILL.md in uploaded folder"**
- File not named exactly `SKILL.md` (case-sensitive)
- Verify with: `ls -la` should show `SKILL.md`

**Error: "Invalid frontmatter"**
- YAML formatting issue. Common mistakes:
  - Missing `---` delimiters
  - Unclosed quotes

**Error: "Invalid skill name"**
- Name has spaces or capitals. Use kebab-case only.

### Skill Doesn't Trigger

- Revise description field. Check: Is it too generic? Does it include trigger phrases users would actually say? Does it mention relevant file types?
- Debugging: Ask Claude "When would you use the [skill name] skill?" — Claude will quote the description back. Adjust based on what's missing.

### MCP Connection Issues

**Symptom**: Skill loads but MCP calls fail.

1. **Verify MCP server is connected**: Claude.ai Settings > Extensions > should show "Connected"
2. **Check authentication**: API keys valid, proper permissions/scopes, OAuth tokens refreshed
3. **Test MCP independently**: Ask Claude to call MCP directly without skill. If this fails, issue is MCP not skill.
4. **Verify tool names**: Skill references correct MCP tool names (case-sensitive). Check MCP server documentation.

### Large Context Issues

**Symptom**: Skill seems slow or responses degraded.

Solutions:
1. **Optimize SKILL.md size**: Move detailed docs to `references/`, link instead of inline, keep under 5,000 words
2. **Reduce enabled skills**: Evaluate if >20-50 skills enabled simultaneously. Consider selective enablement or skill "packs".

## Quick Checklist

### Before You Start
- [ ] Identified 2-3 concrete use cases
- [ ] Tools identified (built-in or MCP?)
- [ ] Planned folder structure

### During Development
- [ ] Folder named in kebab-case
- [ ] SKILL.md file exists (exact spelling)
- [ ] YAML frontmatter has `---` delimiters
- [ ] name field: kebab-case, no spaces, no capitals
- [ ] description includes WHAT and WHEN
- [ ] No XML tags (`<` `>`) anywhere in frontmatter
- [ ] Instructions are clear and actionable
- [ ] Error handling included
- [ ] Examples provided
- [ ] References clearly linked

### Before Upload
- [ ] Tested triggering on obvious tasks
- [ ] Tested triggering on paraphrased requests
- [ ] Verified doesn't trigger on unrelated topics
- [ ] Functional tests pass
- [ ] Tool integration works (if applicable)

### After Upload
- [ ] Test in real conversations
- [ ] Monitor for under/over-triggering
- [ ] Collect user feedback
- [ ] Iterate on description and instructions
- [ ] Update version in metadata
