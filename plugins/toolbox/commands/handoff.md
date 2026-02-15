---
description: Write or update a handoff document for the next agent
argument-hint: [path]
disable-model-invocation: true
---

Write or update a handoff document so the next agent with fresh context can continue this work.

## Arguments

- `$0`: file path for the handoff document (optional, defaults to `HANDOFF.md` in the project root)
  - Example: `handoffs/auth-refactor.md`

## Steps

1. Determine the target file path from `$0` (or default to `HANDOFF.md`)
2. Check if the target file already exists
3. If it exists, read it first to understand prior context before updating
4. Create or update the document with:
   - **Goal**: What we're trying to accomplish
   - **Current Progress**: What's been done so far
   - **What Worked**: Approaches that succeeded
   - **What Didn't Work**: Approaches that failed (so they're not repeated)
   - **Next Steps**: Clear action items for continuing

Save to the determined path and tell the user the file path so they can start a fresh conversation with just that path.