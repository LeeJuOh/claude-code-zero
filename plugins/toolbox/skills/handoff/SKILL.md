---
name: handoff
description: "Distill session into a resumption-ready handoff document"
argument-hint: "[topic]"
disable-model-invocation: true
---

Distill the current session into a handoff document so the next agent can resume cold.

## Arguments

`$ARGUMENTS` is an optional topic name (e.g., `/handoff auth-refactor`). Used for filename and frontmatter. If empty, infer from session context. If inference fails, ask via AskUserQuestion — never fall back to generic names like "untitled" or "session".

## Setup (first invocation per project)

Check `${CLAUDE_PLUGIN_DATA}/config.json` for a key matching the current working directory.

If missing, prompt via AskUserQuestion: "Where should handoff documents be saved? (relative path from project root, e.g., `docs/handoff`)". Save the answer:

```json
{
  "<cwd>": {
    "handoff_path": "<user-provided-path>"
  }
}
```

Create the directory if it doesn't exist. On subsequent invocations, read config and skip setup.

## Same-topic detection

Before writing, scan the configured handoff directory (flat only, no recursive) for `.md` files. Read YAML frontmatter of each and match by `topic` field.

If a match is found:
- Read it for context (understand prior state)
- **Same date** → overwrite in place
- **Different date** → write new file first, confirm it exists, then delete old file

Never delete before a successful write. Never insert into or append to an existing document — always rewrite from scratch.

## Output

### Filename

`YYYY-MM-DD-<topic>.md` where topic is kebab-case.

### Frontmatter

```yaml
---
topic: <kebab-case-topic>
date: YYYY-MM-DD
---
```

### Sections

**Always present (this order):**

1. **Goal** — What we're trying to accomplish
2. **First Action** — Single most immediate action when resuming. Must be actionable without reading any other section. Include skill recommendation if applicable (e.g., "run `/tdd` to add the missing test" or "run `/diagnose` to investigate the timeout")
3. **Context** — Mental state when pausing: what you were thinking, the plan, where your attention was
4. **Current Progress** — What's done. Include uncommitted changes (`git status`/`git diff --stat`) if any

**Conditional (include only when there's meaningful content):**

5. **Decisions Made** — Key decisions + rationale. Prevents re-debate
6. **What Worked** — Successful approaches worth reusing. Include *how you worked*, not only what you built — a process that paid off (grilling the design before coding, tight commit cadence) is as reusable as a technical fix
7. **What Didn't Work** — Failed approaches. Mark critical constraints with ⚠️. Include *process* lessons too — a working rhythm that dragged (confirming every line, too slow to commit) or misfired, so the next session can adjust instead of repeating it
8. **Blockers** — What must be resolved before proceeding
9. **Next Steps** — Remaining action items after First Action

**Agent discretion (add when relevant):**
- Infrastructure State (running servers, env vars, ports)
- Issues & Solutions (detailed issue breakdown)
- Session Metrics (tokens, duration)
- Any other context-specific section

## Principles

- **Distill, don't copy** — filter session noise. The handoff should be shorter and more structured than the conversation that produced it. Failed experiments, tangential discussions, and corrections belong in What Didn't Work (if informative) or nowhere.
- **Reference, don't duplicate** — if a PRD, ADR, plan, commit, or diff already captures information, point to it by path. Duplicating creates staleness.
- **Rewrite, don't update** — when continuing a topic, read the old handoff for context, then write fresh. Merging old + current into a new document from scratch produces better results than patching.

## Gotchas

1. **Don't copy session dialogue** — distill. Next agent needs a brief, not a transcript.
2. **Don't duplicate artifacts** — existing files get a path reference, not inline content. Duplication drifts from source.
3. **Don't update existing handoff** — read it, then rewrite from scratch. Inserting/appending produces franken-documents that confuse the next agent.
4. **First Action must stand alone** — a fresh agent executes it without reading Goal, Context, or anything else.
5. **Don't include session noise** — corrections, tangents, and dead ends go in What Didn't Work only if they prevent the next agent from repeating them.
6. **Scan before creating** — always check for existing same-topic handoffs. Reuse the topic name for continuity.
7. **Don't guess the topic** — if `$ARGUMENTS` is empty and session context is ambiguous, ask the user. Generic names destroy findability.
