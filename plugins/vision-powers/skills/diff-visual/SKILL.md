---
name: diff-visual
description: >
  Catch up on a git change before you review it: background on the system it lands in, the idea
  behind it, a literate diff of the real code, and a five-question quiz. Use when the user wants to
  understand, explain, walk through, get up to speed on, or visualize a diff, branch, commit, range,
  or PR — including agent-written code or a teammate's PR — or asks "what changed here".
argument-hint: "<branch|commit|HEAD|#PR|range> [--format html|md] [--lang <code>] [--local (force a local file instead of publishing)]"
allowed-tools: Read, Glob, Grep, AskUserQuestion, Artifact, Skill(artifact-design), Bash(git diff *), Bash(git log *), Bash(git show *), Bash(git rev-parse *), Bash(git branch *), Bash(wc -l *), Bash(gh pr diff *), Bash(gh pr view *), Bash(node *), Bash(open *), Bash(rm -rf /tmp/diff-visual-*)
---

# Diff Visual

Catch a reader up on a change **before** they review it. Most code now arrives written by an
agent, which means the reader has no system already in their head — so the report answers, in
order: what was here before (**Background**), what the idea is (**Intuition**), how the code
realises it (**Code**), and whether the reader actually got it (**Quiz**).

**When to run**
- Your agent finished a task and you're about to push — read it, pass the quiz, then send.
- A teammate's PR is waiting — read it before you form an opinion.

The quiz is a speed regulator, not a gate. Nothing blocks a push; "don't send it until
you can pass" is a rule the reader keeps, not one the tool enforces. And nothing in the report
says whether the change is *good* — that judgement is `/code-review`'s and the reader's.

**Voice**: write like Martin Kleppmann — clear, flowing, each section handing off to the next.
Follow every abstract sentence with something concrete.

Output is a self-contained interactive HTML page (default) or an inline markdown report. You
write it directly — no templates, no intermediate JSON, no agent chains.

## Instructions

### Format Detection

Parse `--format` first:

| Flag | Values | Default | Meaning |
|------|--------|---------|---------|
| `--format` | `html` \| `md` | `html` | `html` → full interactive page at `${CLAUDE_PLUGIN_DATA}/reports/`. `md` → inline markdown report, delivered in the response |
| `--local` | switch | off | Force the local design-system file — capable HTML **publishes to an Artifact by default** |
| `--artifact` | switch | retained no-op alias | Already the default on capable HTML — kept so muscle memory / natural-language triggers don't break |

**Channel, flags, and config** follow `${CLAUDE_PLUGIN_ROOT}/references/design-system/channel-decision.md`
— read it before writing. In short: capable HTML publishes to a claude.ai Artifact; `--local` (or
"keep it local", "don't publish") forces the local page; `md` stays local unless this turn asks to
publish it. Stored config: `node ${CLAUDE_PLUGIN_ROOT}/scripts/config.js get --data-dir "${CLAUDE_PLUGIN_DATA}"`.

**Output paths**, all under `${CLAUDE_PLUGIN_DATA}/reports/`, where `{scope}` is sanitized from the
input (e.g. `feature-auth`, `abc1234`, `pr-123`, `HEAD`):

| Channel | Path |
|---|---|
| HTML, Artifact (default) | `{scope}-diff-visual.artifact.html` |
| HTML, local (`--local` / non-capable fallback) | `{scope}-diff-visual.html` |
| md | `{scope}-diff-visual.md` — also delivered in the response body |
| md, published on request | `{scope}-diff-visual.artifact.md` |

### Scope Detection

Parse the user's argument to determine the diff scope:

| Input | Interpretation | Git command |
|-------|---------------|-------------|
| `HEAD` or nothing | Uncommitted changes | `git diff HEAD` |
| `branch-name` | Branch vs main/master | `git diff main...branch-name` |
| `#123` or PR URL | Pull request diff | `gh pr diff 123` |
| `abc1234` | Single commit | `git show abc1234` |
| `abc..def` | Commit range | `git diff abc..def` |
| `abc...def` | Three-dot range | `git diff abc...def` |

**Default base**: If the scope implies comparison against a base branch, detect the default branch:
```
git rev-parse --verify main 2>/dev/null || git rev-parse --verify master
```

**Scope validation**: Verify the ref/range exists before proceeding. If invalid, inform the user and stop.

### Language Detection

Determine the output language:

1. **Explicit argument**: `--lang <code>` (e.g., `--lang ko`, `--lang fr`, `--lang zh`) → use that language. Any language code is valid
2. **User message text**: Detect the language of the message (excluding ref/path) and match it
   - Examples: Korean text → Korean, Japanese text → Japanese, "en español" → Spanish, "auf Deutsch" → German
3. **Ref-only with no other text**: Default to English

### Intent Check

*Why: how much of this subsystem the reader already knows is the one thing that changes the shape
of the report — it decides whether the deep Background layer opens or stays folded. And a reader
who names what they're unsure about gets Intuition and Code aimed there.*

If the user's message already conveys this (says what they know, or names what they're after),
skip this step and proceed with defaults.

If the request is bare — a branch name and nothing else — use AskUserQuestion for up to 2 questions:

1. **Familiarity**: How well do you know this part of the codebase? (new to it / worked in it before / I wrote most of it)
2. **Focus**: Anything specific you want to understand about this change?

How the answers land: *new to it* → deep Background written and left **open**; *worked in it* or
*I wrote it* → deep Background still written but **collapsed**, and kept short. A named focus pulls
weight into that part of Intuition and Code.

Defaults (when not specified): treat the reader as new to the subsystem, deep Background collapsed,
attention spread evenly across the change.

### Data Gathering

*Why: the diff tells you what moved. It never tells you what the thing was — and "what the thing
was" is the whole first half of a catch-up. Half of this step reads the change; the other half
reads the world the change lands in.*

Run git commands in parallel where possible.

**Step 1 — Stats and metadata** (parallel):
```
git diff {scope} --stat
git diff {scope} --name-status
git log {scope-log-range} --oneline --format="%h %s"
git log {scope-log-range} -- CHANGELOG.md (CHANGELOG update check)
```

Where `{scope-log-range}` is:
- For branch: `main..branch-name`
- For range: `abc..def`
- For single commit: `-1 abc1234`
- For HEAD: `-1 HEAD` (or recent commits if uncommitted)

**Step 2 — Change shape**:
- Files changed, new files, deleted files (from `--name-status`); lines +/− from `--numstat`
- These numbers ground your prose; they are no longer a section of their own

**Step 3 — Content analysis**:
Read the full diff **and the changed files in full** — a hunk without its file is missing the
context that makes it mean anything. Establish:
- What the change does, and which functions/types/endpoints it touches
- Which imports and call sites appear or disappear — this alone decides whether the dependency
  picture in Code exists at all (no change, no picture)

**Step 4 — Surrounding-code exploration** (Background's raw material):
Read *outward* from the changed files until you could describe this subsystem to someone who has
never opened it. Use Glob + Grep:
- Callers and callees of every changed function (grep the symbol repo-wide)
- The module the changed files live in — its entry point, its core data structures, its README
- Tests exercising the changed behaviour — they state the old contract in executable form
- Existing similar code, so the idea can be framed as "like X, but …"

Note each finding as `file:line`. Background prose needs sources exactly as much as numbers do.

### Verification Checkpoint

*Why: Background and Intuition are **authored**, not lifted — that is a real step beyond
re-structuring, and the fact sheet is what keeps it honest.*

Before generating the report, **produce a structured fact sheet** listing every claim you will present:

1. **Quantitative check**: Lines +/−, file counts, module counts — all must match git output exactly
2. **Name check**: Every function name, type name, file path you mention must exist **either in the
   diff or in a source file you actually read** during Step 4 — cite it as `file:line`. (Background
   describes code the diff never touches; that prose is grounded by the read, not by the diff.)
   Diagrams are prose too: **node labels and edge endpoints come only from this verified set of
   names** — never invent a box or an arrow for something you haven't confirmed at a `file:line`.
   A made-up arrow teaches a relationship the system doesn't have, which is the same failure as a
   retyped snippet that drifted. This is a writing discipline you keep, not something a gate can
   check for you — the fact sheet is the only place it gets enforced.
3. **Behavior check**: Every behavioral description must be traceable to specific code
4. **Source citation**: For each claim, name the source (commit hash, `file:line`, diff hunk)
5. **Verdict check**: No claim asserts quality. If a sentence contains *should*, *bad*, *better*,
   *recommended* (or their equivalent in the output language), rewrite it as a fact or drop it

If a claim can't be sourced, remove it or mark it uncertain.

### Report Generation

#### The four sections (all formats, all channels)

Fixed order, no tabs, one page, table of contents at the top. Every format below renders *these*
sections; only the rendering technique changes.

| # | Section | What it holds |
|---|---|---|
| 1 | **Background** | The world before the change. Two layers: deep (the subsystem, collapsed by default) then narrow (the specific code the change touches, always open) |
| 2 | **Intuition** | The idea in one paragraph + a toy-data example + before/after flow diagrams carrying that example data |
| 3 | **Code** | The literate diff — the change walked in understanding order, snippets lifted by extraction. Dependency before/after picture first *if* dependencies changed. Full diff as a collapsed appendix at the bottom |
| 4 | **Quiz** | Five medium multiple-choice questions with click-through feedback |

**1 — Background.** Written from Step 4's exploration, not from the diff.
- *Deep layer*: the subsystem this change lands in — what it is for, how a request moves through
  it, which data structures matter. Enough that someone who has never opened this repo can follow
  what comes next. Collapsed by default (the second PR in the same repo shouldn't re-scroll it);
  open when Intent Check said "new to it".
- *Narrow layer*: the specific functions, files, and data the change touches — as they were
  **before**. Always open. This is the sentence the reader will hold in their head while reading Code.
- Both layers describe existing code, so every name traces to a `file:line` you read.

**2 — Intuition.** The reader should finish this section able to state the change in their own words.
- *The idea*, one paragraph: what this change is trying to accomplish. Not how — that's Code.
- *A toy-data example*: one small concrete input and what happens to it, as a short table or list.
  Small enough to trace by hand. Abstract descriptions slide off; a single traced example sticks.
- *Two flow diagrams*, before and after: the path the request/data takes. **They must carry the
  toy example's actual data as labels** — a picture of unlabelled boxes leaves the reader exactly
  where they started. Keep to one diagram family and reuse it across the report.
- *Phantom notation for what's gone*: anything the change removed or relocated stays on the "after"
  side as a **dotted** node or edge rather than silently vanishing — half of what a before/after pair
  is for is showing the reader what disappeared, and a box that is simply absent reads as an oversight.
  Mermaid (`--local` and md): dotted edge `-.->` plus the `phantom` classDef from
  `mermaid-patterns.md` — plain dotted already means optional/async there, so the faded class is what
  separates "gone" from "sometimes taken". Inline SVG (Artifact channel): `stroke-dasharray="4 3"`
  at reduced opacity. Label it with the fact alone — `removed`, `moved to session.ts` — never why it
  went (no verdicts).
- No implementation detail here. If you're naming a function signature, you're in Code's territory.

**3 — Code — the literate diff.** Prose that walks the change in **understanding order**, with
extracted snippets embedded where they're being discussed. Not file-by-file: group the hunks that
belong to one idea even when they live in different files, and lead with whichever one the rest
depends on.
- *Extraction law*: every code block is `extract-hunks.js` output pasted verbatim. You
  write the prose around it and never a line inside it. A reader who doesn't know the code cannot
  notice when a retyped snippet has drifted — a wrong snippet teaches a wrong system.
  ```bash
  node ${CLAUDE_PLUGIN_ROOT}/scripts/extract-hunks.js <scope> <file> [line-range]
  # PR with no local refs: gh pr diff <N> | node ${CLAUDE_PLUGIN_ROOT}/scripts/extract-hunks.js --stdin <file> [line-range]
  ```
- *Budget*: 3–8 snippets, ≤150 lines each (`structured-blocks.md`). These are the pieces the reader
  must see, not every touched file. Read `structured-blocks.md` before writing the section — layout,
  highlighting, and degrade rules live there.
- *before/after vs after-only*: show both sides only where "what became what" is the point.
  Everywhere else, the after side alone reads faster.
- *Dependency picture* — the section's **first** block, and only when imports or call sites actually
  changed: two box-and-arrow pictures, before and after, distinguishing new arrows, removed arrows,
  and cycles by colour or style — removed arrows and dropped modules take the same phantom (dotted)
  notation as Intuition, so "gone" looks the same everywhere in the report. Caption states facts
  only ("`auth.ts` now calls `session.ts`"; a cycle gets a ⚠️ marker and nothing more). No verdict
  sentence. If dependencies didn't change, the block doesn't exist — don't render an empty one.
- *Appendix*: the complete diff, once, in a collapsed block at the very bottom. The report must not
  grow to the length of the diff.

**4 — Quiz.** Five multiple-choice questions, medium difficulty.
- Answerable only by someone who understood the change — not by re-reading a line number, not by
  general knowledge. No gotchas, no trick wording.
- **Options length-matched**: word counts within ±1 across the options of a question, and don't
  write the correct answer more fully than the others. Form must leak nothing, or the reader passes
  by shape instead of understanding.
- Clicking an option reveals right/wrong **plus one sentence per option** saying why it is or isn't
  the case — the moment right after a wrong guess is when the explanation lands.
- HTML (both channels): inline `<script>`, no library. md: answers and explanations in a
  collapsed block (see markdown mode).

**No verdicts, anywhere.** *should*, *bad*, *better*, *recommended* and their
equivalents don't appear in the prose, the captions, or the quiz explanations. Extracted code blocks
are source, not your prose, and are exempt. Judgement belongs to `/code-review`.

#### HTML mode — local design-system channel (`--local` / non-capable fallback)

Write the entire HTML file yourself — `<!DOCTYPE html>` to `</html>`. A self-contained single file
with inline CSS and scripts, holding the four sections above.

Rendering specifics for this channel:
- **Flow and dependency diagrams**: Mermaid, per `mermaid-patterns.md`.
- **Code snippets**: `extract-hunks.js` `<pre><code>` output, highlight.js from CDN with the
  first-view-needs-network caveat; un-highlighted monospace if offline (`structured-blocks.md`).
  One `<details>` per snippet, the one or two load-bearing ones `open`.
- **Background deep layer** and the **full-diff appendix**: `<details>`, collapsed.
- **Quiz**: inline `<script>`, no CDN.

**Content integrity**: Every number, file path, function name, and behavioral claim traces back to
the verified fact sheet. Background prose included — its sources are the files you read, cited by
`file:line`.

Beyond integrity, read `${CLAUDE_PLUGIN_ROOT}/references/design-system/anti-slop-tells.md` — reflexes
that pass every gate and still flatten the output. Here that means: let the idea in Intuition land
before anything else on the page, and don't render a two-line aside at the same weight as the
before/after flow.

**Visual self-audit — what to look for in this report** (after the full gate; procedure in
`channel-decision.md` "Local channel"):

- **Background** — is the deep layer actually collapsed, and the narrow layer visible without a click?
- **Intuition** — do the before/after flow diagrams sit side by side and stay readable, with their example-data labels legible rather than clipped?
- **Code** — do the extracted snippets stay inside their container, highlighted or cleanly monospace, with only the load-bearing ones `open`? Is the full-diff appendix collapsed?
- **Quiz** — do the five questions and their options render as a usable list, options visually equal-weight rather than one obviously longest?
- **Mermaid integrity** and **density / hierarchy** — no raw `<pre>` text or tangled edges; the idea lands first.

#### HTML mode — Artifact channel (default on a capable account)

Same four sections and content decisions; the rest of the channel rules are in `channel-decision.md`
"Artifact channel". What changes in this report:

- **Diagrams**: the Intuition flow pair and the Code dependency picture become inline SVG or
  HTML+CSS, with phantom notation as above.
- **Code snippets**: plain monospace — read `structured-blocks.md` "Artifact channel" first; its
  fallback CSS must use this page's own colours. `extract-hunks.js` output is still pasted verbatim.
- **Quiz**: inline `<script>`, so click feedback works on the published page.

#### Markdown mode (`--format md`)

Assemble an inline markdown report and deliver it directly in the response, and save the same
content to `${CLAUDE_PLUGIN_DATA}/reports/{scope}-diff-visual.md` — the chat text is the delivery,
the file is the record that lets report-manager list and refine this report later. Same four
sections; what changes is that there is no CSS, no inline JS, and no CDN, so folding is `<details>`
(which renders on GitHub and in most viewers) and diagrams are Mermaid fences.

````
# <scope description> — Catch-up

**Scope:** `<git ref or range>` · **Familiarity:** <what the reader knows> · **Focus:** <focus>

## Background

<details><summary>The subsystem this lands in — skip if you already know it</summary>

<deep layer: what the subsystem is for, how a request moves through it, the data structures
 that matter. Grounded in the files read during Step 4.>

</details>

**What the change touches** — <narrow layer: the specific functions/files/data as they were
before the change. Always visible, never folded.>

## Intuition

<the idea in one paragraph — what this change is trying to accomplish, not how>

**Worked example** — <one small concrete input, traced by hand>

| Input | Before | After |
|---|---|---|
| <toy datum> | <what used to happen> | <what happens now> |

<two Mermaid `flowchart` fences, before and after, whose node/edge labels carry the toy
 example's actual data>

## Code

<if — and only if — imports or call sites changed: two Mermaid fences, dependency before and
 after, with new / removed / cyclic arrows distinguished. Caption states facts only; a cycle
 gets ⚠️ and nothing more. Unchanged dependencies → this block does not appear at all.>

<then 3–8 snippets in understanding order, not file order. Each: a one-line summary of the idea
 it carries, then a ```diff fence populated from `extract-hunks.js --json` — extraction-grounded,
 never retyped.>

<details><summary>Full diff</summary>

<the complete diff in one ```diff fence>

</details>

## Quiz

Five questions. Answers are folded so the first screen never shows them.

**1.** <question>
- **A.** <option> · **B.** <option> · **C.** <option> · **D.** <option>

<... 2 through 5 ...>

<details><summary>Answers and explanations</summary>

**1 — B.** <one sentence per option: why each is or isn't the case>

</details>
````

**Fold-free viewers**: if the target can't render `<details>` (some chat clients), keep the same
order but put the quiz answers below a `---` rule at the very bottom, under an "Answers" heading.
The requirement is that the answer is not on screen with its question, not the tag itself.

**Translation:** Translate section headers, prose, and quiz questions/options to the detected
language. Keep file paths, function names, commit hashes, and code fences untranslated.

**Length cap:** Keep the markdown report under 300 lines. When it doesn't fit, cut in this order —
(1) the full-diff appendix, (2) the deep Background layer, (3) the number of Code snippets — each
with a `(+N more)` note. **Intuition and Quiz are never cut**: they are the two sections that do
the catching up, and a report that drops them has failed at the thing it exists for.

#### Markdown mode — Artifact channel (on request)

Only when this turn asks to publish the md — see "Markdown on request" in `channel-decision.md`.
Same report, saved to the `.artifact.md` path, published without asking.

### Validate and deliver

**Artifact channel (HTML default):**
1. `node ${CLAUDE_PLUGIN_ROOT}/scripts/artifact-gate.js <output-path> --content-only` — fix and re-run, max 2 retries.
2. Publish the file with the `Artifact` tool, `description` = one sentence on what changed.
3. `node ${CLAUDE_PLUGIN_ROOT}/scripts/write-artifact-sidecar.js --report <output-path> --url <artifact-url> --title <title>`
4. Reply with the URL and the publish notice (`channel-decision.md` "Artifact channel").

**Local channel (`--local` / non-capable fallback):**
1. `node ${CLAUDE_PLUGIN_ROOT}/scripts/artifact-gate.js <output-path>`
2. `node ${CLAUDE_PLUGIN_ROOT}/scripts/render-report.js <output-path> --data-dir "${CLAUDE_PLUGIN_DATA}"`, then read the PNG against the checklist above.
3. `open <output-path>`

**md:** deliver in the response body. On a publish request, publish the `.artifact.md` with steps 2–3
above and no gate.

**Publish unavailable or failed:** HTML → regenerate as the local page at its local path, don't
open the Artifact file; md → deliver in the response body. Say so in one line, don't ask.

### Gotchas

- **Three-dot vs two-dot range**: `git diff a..b` shows all changes between a and b. `git diff a...b` shows changes on b since it diverged from a. Users often say "compare branches" meaning `...` (three-dot). When in doubt, use three-dot for branch comparisons and two-dot for commit ranges.
- **Detached HEAD or no base branch**: Some repos don't have a `main` or `master` branch. The fallback `git rev-parse --verify main || master` fails silently. If both fail, ask the user for the base branch name.
- **Empty diff for uncommitted changes**: `git diff HEAD` returns nothing when there are no uncommitted changes. This is a valid state — inform the user rather than generating an empty report.
- **PR diff requires `gh` auth**: `gh pr diff` needs authentication. If it fails with 401/403, suggest `gh auth login` rather than falling back to a different approach silently.
- **Binary files in diff**: `git diff --stat` counts binary files but `--numstat` shows `-` for their line counts. Don't report binary file "lines added/removed" — note them separately as binary changes.
- **Very large diffs (>5000 lines)**: Reading the full diff content can overwhelm context. Focus on the `--stat` summary and read in full only the files the literate diff will actually walk.
- **Nothing to catch up on**: a pure lockfile/generated/rename diff has no idea to explain. Say so in one line and skip the report rather than inventing a Background for it.

### Reference Files

Read these during report generation (not upfront — read the relevant one when you need it):

| File | When to read |
|---|---|
| `${CLAUDE_PLUGIN_ROOT}/references/design-system/channel-decision.md` | Before writing — channel, flags, config, per-channel rules |
| `${CLAUDE_PLUGIN_ROOT}/references/design-system/mermaid-patterns.md` | Before writing any Mermaid diagram (local and md) |
| `${CLAUDE_PLUGIN_ROOT}/references/design-system/structured-blocks.md` | Before writing the Code section's snippets (layout, highlight.js CDN, budgets, extraction grounding, degrade — including the Artifact-channel no-CDN variant) |
| `${CLAUDE_PLUGIN_ROOT}/references/design-system/semantic-tokens.md` | When setting up CSS custom properties and Mermaid theme |
| `${CLAUDE_PLUGIN_ROOT}/references/design-system/diagram-type-selection.md` | When deciding diagram type for the flow or dependency picture |
| `${CLAUDE_PLUGIN_ROOT}/references/design-system/diagram-density-rules.md` | When a diagram feels complex |
| `${CLAUDE_PLUGIN_ROOT}/references/design-system/anti-slop-tells.md` | While shaping content — to check you're not falling into a behavioral-slop reflex |
| `${CLAUDE_PLUGIN_ROOT}/references/design-system/visual-self-audit.md` | After the gate passes — the render-and-look loop (full procedure) |
