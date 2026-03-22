# Common Codex Advisor Workflow

Shared workflow for all codex-advisor skills. Each skill handles step 1 (building the command) differently, then follows this common flow for steps 2-4.

## 2. Execute Codex

### Prompt Passing (for codex exec skills)

Write the prompt to a temp file to avoid shell quoting issues:

```bash
# Write prompt to temp file (use Write tool)
Write to tmp/codex-advisor-prompt.txt

# Execute with temp file
codex exec "$(cat tmp/codex-advisor-prompt.txt)" --sandbox read-only 2>/dev/null

# Clean up
rm -f tmp/codex-advisor-prompt.txt
```

### Key Flags

| Flag | Purpose |
|------|---------|
| `--sandbox read-only` | Analysis only, no file modifications |
| `2>/dev/null` | Suppress thinking tokens (stderr) to avoid context bloat |
| `-m MODEL` | Override model if user requests (default: use codex config) |

### Timeout

Set Bash timeout to 600000ms (10 min). Codex analysis can take several minutes.

### Error Handling

- If `codex` command not found: "codex CLI is required. Install with `npm install -g @openai/codex`"
- If Codex exits non-zero: report the error and ask the user how to proceed
- If Codex returns empty output: may mean no issues found OR a timeout. Check exit code.

## 3. Critical Evaluation

After reading Codex's output, provide your own assessment. This is the core value of the advisor pattern -- Claude as a second pair of eyes.

### For each finding Codex raised:

- **Agree**: Confirm the finding. Optionally add detail or context.
- **Disagree**: Explain why with evidence. Read the actual code to verify before disagreeing.
- **Nuance**: Add context Codex may have missed (e.g., "this is intentional because...").

### Also check for:

- **False positives**: Test files, framework-handled protections, pre-existing issues, vendored/generated code
- **Missed findings**: Issues you can see that Codex didn't catch
- **Severity accuracy**: Do you agree with Codex's prioritization?

### Important:

- Do NOT blindly agree with Codex. It can hallucinate file paths or line numbers.
- Always read the actual code to verify claims about specific files or lines.
- Codex has knowledge cutoffs -- verify its claims about APIs, libraries, or framework behavior.
- If you and Codex genuinely disagree, present both perspectives and let the user decide.

## 4. Save Results

Write combined output to `codex-reviews/<type>-<YYYYMMDD-HHMMSS>.md`:

```markdown
# Codex <Type> — <date>

## Scope
<what was analyzed, target paths, options used>

## Codex Findings
<Codex's output, preserved as-is>

## Claude's Evaluation

### Agreed
- [finding]: [additional context if any]

### Disputed
- [finding]: [why you disagree, with evidence]

### Additional Findings
- [things Codex missed]

## Summary
- Total Codex findings: N
- Agreed: N | Disputed: N | Additional by Claude: N
```

Create the `codex-reviews/` directory if it doesn't exist.

## Session Resume

After any Codex invocation, inform the user:
> "You can resume this Codex session with `/codex resume` or by asking me to follow up with Codex."

Resume syntax:
```bash
echo "follow-up prompt" | codex exec resume --last 2>/dev/null
```
Resume inherits the original session's model and sandbox settings. Do not add flags between `exec` and `resume` unless the user explicitly requests them.
