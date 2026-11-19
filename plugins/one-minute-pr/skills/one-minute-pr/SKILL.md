---
name: one-minute-pr
description: "Open a pull request whose body a human reviewer can judge in one minute, with seen evidence and a rollback note. Use when the user asks to open, create, or make a pull request or merge request."
compatibility: "Needs git and Node.js 18 or later. Posts with the forge CLI (such as gh or glab) when signed in, else prints the body."
---

# One-minute PR

Write for a reviewer who has the diff. When rules conflict, favor readability.

## Steps

1. **Check the branch.** If changes are uncommitted, stop and ask the user to commit. Push with an upstream even when posting is unavailable. Never force-push.
2. **Collect the evidence you have seen.** Use existing results and captures. Do not run tests or record new evidence. Never invent a result.
3. **Write the title and the body** with the rules below. Save the body to a temporary file outside the repo.
4. **Check the body.** From this skill's folder, run `node scripts/check-body.mjs <body-file>`. Fix each problem until it exits 0. A line-count warning does not block.
5. **Post.** Find the forge from the remote URL. If its CLI is installed and signed in, create the PR ready for review, not as a draft. If the branch already has an open PR, replace its title and whole body. With no usable CLI, print the title and the body. Do not ask for a preview.
6. **Reply.** Give the PR link. Name each kind of needed evidence that you did not find. When the user sends evidence or a change, edit the body and check it again.

On a second run for the same PR, rewrite the body from the whole branch. Keep old evidence that still matches the code. Include decisions from review. Then read `references/overflow.md` for an earlier overflow comment.

## Title

Follow the format of the repo's recent PR titles and commits. Otherwise use `type(scope): subject`, imperative, no trailing period. Name a real symbol when one carries the change.

## Body

Use these `##` sections in this order, even when the repo has a PR template. Drop a section with nothing to say, but always keep Scope and Rollback.

- `## Why`. The problem and the approach, in one to three short sentences.
- `## What changed`. Show changed contracts, data structures, or settings. Use `diff` for edits to an existing structure. Show mostly new structures in full and tag code blocks with their language, such as `sql` or `json`. For new APIs, show caller code. For changes to calls, data flow, or ownership, follow `references/diagrams.md`. Omit file trees.
- `## Scope`. One to three items on what the change covers and leaves out. With nothing to add, write "Covers the whole change."
- `## Tradeoffs`. Only rejected alternatives a reviewer would ask about.
- `## Blast Radius`. One or two sentences on what the change touches and one fact that makes it safe or risky, with how far you checked it, such as "checked at `app/routes.ts:12`" or "a test covers it". Claim a run-based check only when you saw its result. If you could not check, write "unproven".
- `## Rollback`. How to undo the change, for example "Revert this commit." Name any other step, such as turning off a flag.
- `## Verification`. One to three bullets, each a real run and its result.

Choose the simplest visual that explains the change. Plain prose is enough for a simple point. Place a visual directly below the sentence it illustrates. Omit author lines and SHAs.

## Evidence

Use this table to select evidence. Omit the table itself.

| Change | Evidence |
|---|---|
| UI | Match viewport and crop in before and after screenshots. Use a short recording for motion. Link an existing HTML demo if interaction matters. |
| CLI or build | The real output of the same command before and after, with the exit code. |
| Bug fix | The input and result before and after, and the regression test that failed first. |
| Performance | One primary number with its unit, `before → after`. The rest is overflow. |
| AI or agent behavior | The same real prompts on both sides, and how you graded the answers. |
| New API or feature | The code a caller writes to use it. |
| Other changes needing comparison | A small before-and-after table or diagram. |

Copy output exactly. Use backticks or a fenced block (`text` for plain output). Mark cuts with `…`. When you cannot find a row's evidence or one side of it, write "not found" in Verification, not "not done".

Upload images to the PR, never to the branch. If you cannot, say so in the reply.

## Length

Keep the body to about 40 lines. When it does not fit, read `references/overflow.md`.

## Writing rules

- Short sentences, one idea each. Periods, not semicolons.
- One name for each thing, everywhere.
- No long dashes, curly quotes, mid-sentence colons, or bold-label lists.
- Plain words, not "crucial", "delve", "enhance", "leverage", "robust", "seamless", or "utilize".
- No filler, no hedging, no closing summary.
- Active voice, with the actor named.
- Say what the code does with a mechanism or a number, not how it feels.
- Name a path or symbol only when it carries the change.
