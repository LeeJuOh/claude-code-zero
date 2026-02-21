---
name: handoff
description: Write or update a handoff document for the next agent
argument-hint: "[base-path] [filename]"
disable-model-invocation: true
---

Write or update a handoff document so the next agent with fresh context can continue this work.

## Arguments

- `$0`: base path for the handoff document (optional, defaults to project root)
  - Example: `handoffs`, `.`, `docs/handoffs`
- `$1`: filename (optional, defaults to `HANDOFF.md`)
  - Example: `auth.md`, `refactor-notes.md`

### Path Resolution

| Input | Result |
|-------|--------|
| `/handoff` | `HANDOFF.md` |
| `/handoff handoffs` | `handoffs/HANDOFF.md` |
| `/handoff handoffs auth.md` | `handoffs/auth.md` |
| `/handoff . auth.md` | `auth.md` |

## Steps

1. Determine the target file path:
   - If `$0` is empty and `$1` is empty → `HANDOFF.md`
   - If `$0` is provided and `$1` is empty → `$0/HANDOFF.md`
   - If `$0` is `.` and `$1` is provided → `$1`
   - If both `$0` and `$1` are provided → `$0/$1`
2. If the base directory does not exist, create it
3. Check if the target file already exists
4. If it exists, read it first to understand prior context before updating
5. Create or update the document with:
   - **Goal**: What we're trying to accomplish
   - **Current Progress**: What's been done so far
   - **What Worked**: Approaches that succeeded
   - **What Didn't Work**: Approaches that failed (so they're not repeated)
   - **Next Steps**: Clear action items for continuing
6. Save to the determined path and tell the user the file path so they can start a fresh conversation with just that path
