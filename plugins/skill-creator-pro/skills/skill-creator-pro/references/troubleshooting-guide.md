# Skill Troubleshooting Guide

Diagnose and fix common problems during skill development. Organized by symptom.

---

## 1. Skill Doesn't Trigger

**Symptom:** Skill never loads automatically when it should.

**Quick checklist:**
- Is the description too generic? ("Helps with projects" won't trigger)
- Does the description include phrases users would actually say?
- Does it mention relevant file types if applicable?

**Debugging technique:** Ask Claude directly:

> "When would you use the [skill-name] skill?"

Claude will quote the description back and explain its reasoning. Whatever's missing from its answer is missing from your description. Adjust and re-test.

**Fixes:**
- Add specific trigger phrases users would say (e.g., "create sprint", "plan tasks")
- Include relevant tool/service names (e.g., "Linear", "Notion", "Figma")
- Front-load the most important phrases (first 250 chars show in `/skills` menu)

---

## 2. Skill Triggers Too Often

**Symptom:** Skill loads for unrelated queries.

**Fixes:**

1. **Add negative triggers:**
   ```yaml
   description: Advanced data analysis for CSV files. Use for statistical
     modeling, regression, clustering. Do NOT use for simple data exploration
     (use data-viz skill instead).
   ```

2. **Be more specific:**
   ```
   # Too broad
   description: Processes documents

   # Better
   description: Processes PDF legal documents for contract review
   ```

3. **Clarify scope:**
   ```
   description: PayFlow payment processing for e-commerce. Use specifically
     for online payment workflows, not for general financial queries.
   ```

---

## 3. Instructions Not Followed

**Symptom:** Skill loads but Claude doesn't follow the instructions.

Four common causes and fixes:

### 3a. Instructions too verbose

Claude loses focus in walls of text.

**Fix:** Keep instructions concise. Use bullet points and numbered lists. Move detailed reference material to separate files in `references/`.

### 3b. Critical instructions buried

Claude weights content near the top more heavily.

**Fix:** Put critical instructions at the top. Use `## Important` or `## Critical` headers. Repeat key points if the skill is long.

### 3c. Ambiguous language

Vague instructions produce inconsistent results.

```markdown
# Bad
Make sure to validate things properly

# Good
CRITICAL: Before calling create_project, verify:
- Project name is non-empty
- At least one team member assigned
- Start date is not in the past
```

**Advanced technique:** For critical validations, bundle a script that performs the checks programmatically rather than relying on language instructions. Code is deterministic; language interpretation isn't.

### 3d. Model laziness (skipping steps)

Claude sometimes shortcuts multi-step processes.

**Fix:** Add explicit encouragement:

```markdown
## Performance Notes
- Take your time to do this thoroughly
- Quality is more important than speed
- Do not skip validation steps
```

**Tip:** Adding this to user prompts is more effective than putting it in SKILL.md, because user prompt content receives higher attention weight.

### 3e. Skill loses effect after auto-compaction

**Symptom:** Skill works initially but loses effect after a long session with many tool calls.

**Cause:** Auto-compaction re-attaches skills with a 5,000-token cap per skill and 25,000-token combined budget. Older invocations get dropped entirely if many skills were invoked. (skills.md)

**Fix:**
- **Re-invoke the skill** after compaction to restore full content
- For long sessions with many skills, prefer **hooks** (deterministic) for invariants instead of skill instructions
- Strengthen the description so the model keeps preferring the skill rather than choosing other tools

---

## 4. Large Context Issues

**Symptom:** Skill seems slow or responses are degraded.

**Causes:**
- Skill content too large
- Too many skills enabled simultaneously
- All content loaded instead of progressive disclosure

**Fixes:**

1. **Optimize SKILL.md size:**
   - Move detailed docs to `references/`
   - Link to references instead of inlining
   - Keep SKILL.md under 5,000 words

2. **Reduce enabled skills:**
   - More than 20-50 skills enabled simultaneously can degrade performance
   - Description budget scales at **1%** of context window (fallback: **8,000 chars**). Set `SLASH_COMMAND_TOOL_CHAR_BUDGET` env var to raise the limit. (skills.md)
   - Consider selective enablement or skill "packs" for related capabilities
   - Run `/context` to check for warnings about excluded skills

---

## 5. Frontmatter Errors

**Symptom:** "Invalid frontmatter", skill won't upload, or validation fails.

### Missing delimiters

```yaml
# Wrong - missing delimiters
name: my-skill
description: Does things

# Correct
---
name: my-skill
description: Does things
---
```

### Invalid skill name

```yaml
# Wrong
name: My Cool Skill

# Correct
name: my-cool-skill
```

Rules: kebab-case only, no spaces, no capitals, no underscores.

### Unclosed quotes

```yaml
# Wrong
description: "Does things

# Correct
description: "Does things"
```

### Colons in description

```yaml
# Wrong - YAML sees two keys
description: Triggers: when user says X

# Correct
description: "Triggers: when user says X"
```

### XML angle brackets

```yaml
# Wrong - security risk (prompt injection vector)
description: Use for <type> files

# Correct
description: Use for [type] files
```

### Forbidden names

Skill names cannot contain "claude" or "anthropic" (reserved).

### YAML boolean keyword names

```yaml
# Wrong - YAML parses these as booleans, not strings
name: on
name: off
name: yes
name: no
name: true
name: false

# Correct - quote to force string
name: "on"
# Or rename to something unambiguous
name: always-on
```

Bare YAML boolean keywords (`on`, `off`, `yes`, `no`, `true`, `false`, and their uppercase variants) get parsed as booleans when used as the `name` value. The slash command picker chokes on boolean names — rename the skill or quote the value.
