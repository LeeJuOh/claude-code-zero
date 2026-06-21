---
name: handoff
description: "Distill session into a resumption-ready handoff document"
argument-hint: "[topic]"
disable-model-invocation: true
---

Distill the current session into a handoff document so the next agent can resume cold.

## Accuracy: verify before asserting

A handoff is only worth writing if the next agent can trust it and act without re-checking. That makes a wrong fact the worst possible output: a bad path, line number, or "done" claim sends a cold agent down a false trail and costs far more than the handoff ever saved. Silence is safer than a confident error.

Almost every wrong fact comes from one habit — writing from memory of the session instead of from the repo as it is *now*. After a long session, or once context has been summarized, recall of specifics gets lossy and the gaps fill with plausible-but-wrong detail. So before a concrete claim goes in, ground it.

Treat two kinds of statement differently:

- **Checkable facts** — paths, symbol and function names, line numbers, commands, branch, commits, dirty files, and anything you describe as done. Confirm each against the repo as you write it: `git status`, `git log --oneline -10`, and `git diff --stat` for state; Read / Grep / Glob for paths and symbols. Don't transcribe these from memory. If you can't confirm one, it doesn't get asserted — drop it, or mark it `(unverified)` so the next agent knows to check.
- **Recollection and judgment** — the plan, why a decision was made, your mental state, what worked and what didn't. These can't be verified against the repo, so write them plainly as recollection and resist inventing specifics to make them sound authoritative.

**Drive Current Progress from git, not memory.** The state of the repo — branch, what's committed, what's still dirty — is the part that most often turns out wrong, because it's written from recall at the end of a long session. So don't recall it. Run `${CLAUDE_PLUGIN_ROOT}/skills/handoff/scripts/repo_facts.sh` first and paste its output as the factual base of Current Progress, then write the narrative around it. A "done" item with no matching commit or diff in that output is the single most common wrong part — demote it to "in progress" or mark it `(unverified)`.

**Prefer durable anchors to line numbers.** Reference `bar.ts` → `parseConfig()` rather than `bar.ts:40`. Line numbers drift between sessions and are easy to misremember, so they age into wrong facts faster than anything else; reach for one only when it genuinely helps, and grep to confirm it as you write.

**Do the review yourself before saving.** Re-read the finished draft and recheck every concrete reference — each path, symbol, and line — against ground truth one last time: grep the path, confirm the symbol exists. This is the review you'd otherwise leave for the next agent to discover the hard way; doing it now is the whole point.

**Hand "done" claims to fresh eyes.** One blind spot survives your own review: the work you believe you finished. You wrote "implemented X" from the memory of doing it and you re-read it through that same memory, so a "done" that isn't rarely catches your eye — and it's the costliest fact to miss, since the next agent then builds on a foundation that isn't there.

So once the draft is saved, hand *just this slice* to a subagent that carries none of your session memory — its lack of any stake in the work being done is exactly what makes it useful here. Point it at the saved draft and have it check each completed claim in Current Progress against `git diff` and `git log`, returning for each one: supported, partial, or unsupported, with the commit hash or diff hunk as evidence. Keep its scope to done-claims only — it has no context to judge the plan, the decisions, or what you were thinking (that's yours to review), and paths and symbols you already confirmed yourself. Then demote anything it can't support to "in progress" or `(unverified)` and save again. Skip the step when Current Progress reports only in-progress or not-yet-started work — with no completed claim there is nothing to falsify, and a fresh agent earns its cost only when there is.

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
4. **Current Progress** — What's done, read off the commits and working tree rather than memory (see *Accuracy: verify before asserting* above). Include uncommitted changes (`git status` / `git diff --stat`) if any

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
- **Verify, don't recall** — confirm every checkable fact against the repo before it goes in. See *Accuracy: verify before asserting* — this is the difference between a handoff the next agent trusts and one it has to re-audit.

## Gotchas

1. **Don't copy session dialogue** — distill. Next agent needs a brief, not a transcript.
2. **Don't duplicate artifacts** — existing files get a path reference, not inline content. Duplication drifts from source.
3. **Don't update existing handoff** — read it, then rewrite from scratch. Inserting/appending produces franken-documents that confuse the next agent.
4. **First Action must stand alone** — a fresh agent executes it without reading Goal, Context, or anything else.
5. **Don't include session noise** — corrections, tangents, and dead ends go in What Didn't Work only if they prevent the next agent from repeating them.
6. **Scan before creating** — always check for existing same-topic handoffs. Reuse the topic name for continuity.
7. **Don't guess the topic** — if `$ARGUMENTS` is empty and session context is ambiguous, ask the user. Generic names destroy findability.
8. **Don't assert from memory** — paths, line numbers, symbol names, and "done" claims are exactly the parts that turn out wrong on review. Confirm each against the repo (git + Read/Grep) as you write; if you can't, mark it `(unverified)` rather than stating it as fact.
