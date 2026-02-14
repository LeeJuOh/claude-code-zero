---
description: Write or update a handoff document for the next agent
argument-hint: [path]
---

Write or update a handoff document so the next agent with fresh context can continue this work.

## Arguments

Parse `$ARGUMENTS` as the file path for the handoff document.

- If a path is provided, use it as the save location (e.g., `handoffs/auth-refactor.md`)
- If no path is provided, default to `HANDOFF.md` in the project root

## Steps

1. Determine the target file path from the argument (or default to `HANDOFF.md`)
2. Check if the target file already exists
3. If it exists, read it first to understand prior context before updating
4. Create or update the document with:
   - **Goal**: What we're trying to accomplish
   - **Current Progress**: What's been done so far
   - **What Worked**: Approaches that succeeded
   - **What Didn't Work**: Approaches that failed (so they're not repeated)
   - **Next Steps**: Clear action items for continuing

Save to the determined path and tell the user the file path so they can start a fresh conversation with just that path.