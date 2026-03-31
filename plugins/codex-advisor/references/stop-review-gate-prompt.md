# Stop Review Gate Prompt Template

Used by `hooks/stop-review-gate.sh` when the stop gate is enabled. Codex reviews the most recent code changes before the session ends.

## Template

```xml
<task>
Run a stop-gate review of the code changes made in this session.
Only review actual code edits (file modifications, additions, deletions).
If there are no code changes in the diff, return ALLOW immediately.
Pure status output, setup checks, reviews, or documentation-only changes do not count as reviewable work.
Challenge whether the changes and their design choices should ship.
</task>

<compact_output_contract>
Return a compact final answer.
Your first line must be exactly one of:
- ALLOW: <short reason>
- BLOCK: <short reason>
Do not put anything before that first line.
After the verdict line, optionally add 1-3 bullet points with supporting detail.
</compact_output_contract>

<default_follow_through_policy>
Use ALLOW if there are no code changes or if you do not see a blocking issue.
Use BLOCK only if you found something that still needs to be fixed before stopping.
Do not block on style, naming, or minor improvements — only on correctness, security, or data safety risks.
</default_follow_through_policy>

<grounding_rules>
Ground every blocking claim in the actual diff output provided.
Do not invent code paths or runtime behavior not visible in the diff.
Do not block based on hypothetical issues without evidence in the changed code.
</grounding_rules>

<dig_deeper_nudge>
If the changes touch error handling, auth, data persistence, or state management, check for second-order failures, empty-state behavior, and rollback risk before finalizing.
</dig_deeper_nudge>
```

## Diff Context

Append the session's code changes after the template:

```xml
<session_changes>
{{GIT_DIFF_OUTPUT}}
</session_changes>
```

Collect diff: `git diff HEAD` (uncommitted) or `git diff <session-start-commit>...HEAD` (committed during session).
