---
name: diff-visual
description: >
  Catch up on a git change before you review it — background on the system it lands in, the idea
  behind it, a literate diff of the real extracted code, and a five-question quiz. Use whenever the
  user wants to understand, explain, walk through, or get up to speed on a diff, branch, commit, or
  PR — including agent-written code they didn't write themselves, or a teammate's PR they're about
  to review. Also use for "visualize this diff" and "what changed here". Accepts branch names,
  commit hashes, HEAD, PR numbers, or commit ranges.
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

The quiz is a speed regulator, not a gate. Nothing blocks a push (ADR 0003); "don't send it until
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

**Channel is decided by the shared contract**, not re-derived here — read
`${CLAUDE_PLUGIN_ROOT}/references/design-system/channel-decision.md` (SSOT, restates ADR 0009) for the
`(Format × capable) → channel` table, flag semantics, and the optimistic-try-then-regenerate rule.
The short version: **capable HTML publishes to a claude.ai Artifact by default**; `--local` forces the
local page; `md` and non-capable sessions stay local.

`--local` forces local (Mermaid diagrams, zoom/pan) and triggers on natural-language equivalents —
"keep it local", "don't publish", "just the local file" — in whatever language the user writes.
`--artifact` is the retained alias for the now-default behavior and still triggers on "as an artifact",
"publish as a link", "share as a URL"; if both are signalled, `--local` wins. Both apply to
`--format html` only. If `--artifact` is combined with `--format md`, ignore it and use the normal
markdown response path below — publishing a diff-visual md report as-is is out of scope for this
slice (doc-visual's simpler single-file input validated that combination first; diff-visual's diff
scope makes it a separate follow-up).

**Config precedence.** Explicit this-turn signal > config > default. Before falling back to the
default, check stored preferences once: `node ${CLAUDE_PLUGIN_ROOT}/scripts/config.js get` (prints the
config as JSON, or `{}`). A `default_format` value replaces the `html` default. For the channel: an
**absent `artifact` key means artifact-first** (the default), `artifact: false` is a **persistent
force-local** (the config twin of `--local`), and `artifact: true` is explicit artifact-first. Anything
the user actually says this turn — a literal flag or a natural-language equivalent — always overrides
config; config only fills in when the request is silent on format/channel.

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
  picture in Code exists at all (D5: no change, no picture)

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
3. **Behavior check**: Every behavioral description must be traceable to specific code
4. **Source citation**: For each claim, name the source (commit hash, `file:line`, diff hunk)
5. **Verdict check**: No claim asserts quality. If a sentence contains *should*, *bad*, *better*,
   *recommended* (or their equivalent in the output language), rewrite it as a fact or drop it

If a claim can't be sourced, remove it or mark it uncertain.

### Report Generation

Use extended thinking for the analysis above. The depth of analysis directly determines report quality.

**HTML channel routing (default = Artifact).** For `--format html` the channel is decided by
`${CLAUDE_PLUGIN_ROOT}/references/design-system/channel-decision.md`: on a capable account the default
is the **Artifact channel** — go to "HTML mode — Artifact channel" below. Write the **local
design-system + Mermaid** page only when `--local` is in play, or as the **non-capable regenerate
fallback** after a publish attempt fails (see "Publish"). `md` is unaffected — it stays local either way.

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
- No implementation detail here. If you're naming a function signature, you're in Code's territory.

**3 — Code — the literate diff.** Prose that walks the change in **understanding order**, with
extracted snippets embedded where they're being discussed. Not file-by-file: group the hunks that
belong to one idea even when they live in different files, and lead with whichever one the rest
depends on.
- *Extraction law (ADR 0005)*: every code block is `extract-hunks.js` output pasted verbatim. You
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
  and cycles by colour or style. Caption states facts only ("`auth.ts` now calls `session.ts`";
  a cycle gets a ⚠️ marker and nothing more). No verdict sentence. If dependencies didn't change,
  the block doesn't exist — don't render an empty one.
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
- HTML (both channels): inline `<script>`, zero external requests — this works inside the Artifact
  viewer's CSP. md: answers and explanations in a collapsed block (see markdown mode).
- Never a gate, never a hook (ADR 0003).

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

**Diagrams**: Read these reference files for implementation:
- `${CLAUDE_PLUGIN_ROOT}/references/design-system/mermaid-patterns.md` — Mermaid syntax, theming, dark mode, zoom
- `${CLAUDE_PLUGIN_ROOT}/references/design-system/semantic-tokens.md` — Color/font roles, Mermaid themeVariables
- `${CLAUDE_PLUGIN_ROOT}/references/design-system/diagram-type-selection.md` — 13-type selection guide
- `${CLAUDE_PLUGIN_ROOT}/references/design-system/diagram-density-rules.md` — Complexity budgets

Key diagram rules (always apply):
1. Max 9 nodes, 12 arrows per diagram. Over budget → split
2. 1-2 focal accents only
3. No `rgba()` or `color:` in Mermaid classDef — parser breaks
4. No violet/fuchsia "AI purple" hexes (`#8b5cf6`/`#7c3aed`/`#a78bfa`/`#d946ef`) — the gate fails on these
5. Always `theme: 'base'` with themeVariables from semantic-tokens
6. Table > diagram when a 3-column table conveys it equally well

The gate also fails on dead links, alt-less images, and leftover scaffolding: give every `<a>` a real href, every `<img>` an `alt` (`alt=""` if decorative), and leave no `{{ }}`/lorem/`[STUB]` placeholders.

**CSS essentials**: Write your own CSS inline. Must support:
- `prefers-color-scheme: dark` via CSS custom properties
- Korean font stack (CJK font in font-family)
- Mermaid zoom by SVG sizing (mermaid-patterns.md `applyZoom()`), not `transform: scale()` (which reserves no layout space and clips) and not the `zoom` property
- `min-width: 0` on flex/grid children
- `prefers-reduced-motion: reduce`

**Content integrity**: Every number, file path, function name, and behavioral claim traces back to
the verified fact sheet. Background prose included — its sources are the files you read, cited by
`file:line`.

Beyond integrity, seven authoring reflexes pass every mechanical gate and still flatten the output — summary-leak (a one-line gist where the real substance belongs), linear dump (file-by-file with no proportion), forced diagram, generic label, uniform density, empty decoration, accent overuse. Read `${CLAUDE_PLUGIN_ROOT}/references/design-system/anti-slop-tells.md` for the full catalogue. They're named defaults to break, not design rules: layout and taste stay yours — the catalogue just flags the habits worth resisting (e.g. let the idea in Intuition land before anything else on the page, don't render a two-line aside at the same weight as the before/after flow).

**Output path**: `${CLAUDE_PLUGIN_DATA}/reports/{scope}-diff-visual.html` — where `{scope}` is sanitized from the input (e.g., `feature-auth`, `abc1234`, `pr-123`, `HEAD`).

**Validation**: After writing the HTML, run artifact-gate:
```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/artifact-gate.js <output-path>
```
If violations found: fix inline, max 2 retries.

**Visual self-audit (HTML only)**: The gate reads the HTML as *text* — it never sees the rendered picture. A before/after flow pair can pass the density check and render as an unreadable tangle; a long file path can clip at the container edge. After the gate passes, **render the report and look at it** before delivering:

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/render-report.js <output-path>
```

On success it prints a PNG path. **Read that PNG** (you read images multimodally) and scan it for what the text gate can't judge:

- **Background** — is the deep layer actually collapsed, and the narrow layer visible without a click?
- **Intuition** — do the before/after flow diagrams sit side by side and stay readable, with their example-data labels legible rather than clipped?
- **Code** — do the extracted snippets stay inside their container (`min-width: 0`), highlighted or cleanly monospace, with only the load-bearing ones `open`? Is the full-diff appendix collapsed?
- **Quiz** — do the five questions and their options render as a usable list, options visually equal-weight rather than one obviously longest?
- **Mermaid integrity** — did any diagram render as raw `<pre>` text, or with crossing/overlapping edges?
- **Density / hierarchy** — is any section a uniform grey wall? Does the idea land first, or is every block the same weight? (see *uniform density* / *accent overuse* in anti-slop-tells.md)

Fix what you see and re-render. **Cap at 2 audit passes** — if something still looks off after the second, ship with a one-line note to the user rather than looping. This catches gross breakage, not pixel-perfection.

**If Chrome is absent**, `render-report.js` exits `1` (non-zero). Skip the audit and tell the user it was skipped (e.g. "rendered-image check skipped: Chrome not found — set `CHROME_BIN` or install Chrome"). The report already passed the gate; the visual pass is an enhancement and **never blocks delivery**.

Full procedure, limits (fixed-height clipping, downscaling, render cost), and the rationale for *not* mechanizing this with a measurement script live in `${CLAUDE_PLUGIN_ROOT}/references/design-system/visual-self-audit.md`.

Then run `open <output-path>`.

#### HTML mode — Artifact channel (default on a capable account)

Same four sections and the same content decisions as above — only the page's shape and delivery
mechanism change, because it ships inside Claude Code's official Artifacts feature instead of as a
local file.

**Before writing anything**, load the built-in `artifact-design` skill (Skill tool, skill name
`artifact-design`). This is a tool contract MUST, not a suggestion — it conditions you for the CSP
sandbox this page runs in, and skipping it is how a page ends up broken on publish.

Then write the page as a **fragment**, not a full document:
- No `<!DOCTYPE>`, `<html>`, `<head>`, or `<body>` tags — content only, starting from your first
  real element. The Artifact tool wraps the file in that skeleton at publish time.
- Set a concise `<title>` directly in the content — it names the artifact in the browser tab. Keep
  it stable across every republish of the same diff in this session.
- **Zero external requests** — the Artifact viewer's CSP blocks all of them:
  - **Diagrams**: no Mermaid CDN `<script>`. The Intuition flow pair and the Code dependency
    picture become inline SVG or HTML+CSS layouts instead (follow the artifact-design skill's
    guidance) — same diagram-type decision from `diagram-type-selection.md`, different rendering
    technique. `mermaid-patterns.md`'s CDN setup and `classDef` rules don't apply here.
  - **Code snippets**: no highlight.js CDN either — symmetric with the Mermaid ban. Read
    `${CLAUDE_PLUGIN_ROOT}/references/design-system/structured-blocks.md`'s "Artifact channel: no
    CDN, forced degrade" subsection first: the code always renders as clean monospace, never
    coloured, and the fallback CSS must use this page's own colours (not vision-powers'
    `--paper-2`/`--ink`/`--mono` tokens, which don't exist here). The extraction law doesn't
    change — `extract-hunks.js` output is still pasted verbatim; only the CSS around it does.
  - **Quiz**: inline `<script>` is fine and is the intended technique — it's same-document, not an
    external request, so click feedback works on the published page.
- Support both themes: `@media (prefers-color-scheme: dark)` as the default signal, plus
  `:root[data-theme="dark"]` / `:root[data-theme="light"]` overrides — the artifact viewer's theme
  toggle stamps `data-theme` on the root and it must win in both directions.

Save the fragment to `${CLAUDE_PLUGIN_DATA}/reports/{scope}-diff-visual.artifact.html` — a distinct
filename from the default channel's output, so the two never collide or overwrite each other for
the same scope. Re-running this skill on the same scope within the same conversation reuses that
same path; publishing to the same `file_path` again redeploys to the same URL instead of minting a
new one, so keep the `<title>` and `favicon` identical across those republishes (the tool reads a
changed favicon as a different page). If `${output-path}.artifact.json` already exists from an
earlier publish this session, read it first and reuse its `title`/`favicon` verbatim.

**Validation**: run the gate in content-only mode instead of the full check:
```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/artifact-gate.js <output-path> --content-only
```
This checks only missing images, raw markdown leakage, anchor hrefs, image alt, and placeholders —
the facts that must survive regardless of who designed the page. Density/classDef/palette checks
don't apply: the built-in artifact-design skill owns the design layer on this channel (ADR 0007).

**Skip the visual self-audit (render-report.js) entirely on this channel.** The rendered picture is
the built-in artifact-design skill's responsibility here, not this skill's — there's no local
Chrome render loop to run before publishing.

**Size headroom**: a large single-file diff (1483 changed lines, extracted 2026-07-06) measured
~44 bytes/line through `extract-hunks.js`, so a Code section that keeps to the budget above
(3–8 snippets, ≤150 lines each) plus a collapsed full-diff appendix lands in the tens-to-low-hundreds
of KB — hundreds of times under the platform's 16 MiB artifact render ceiling. The ceiling is only
reachable by ignoring the budget (e.g. pasting a whole large diff into the body as well); no extra
size-limiting logic is needed as long as the section stays inside it.

Once the gate passes, publish — see "Publish (Artifact channel — default for HTML)" below.

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

### Publish (Artifact channel — default for HTML)

After the content-only gate passes (see "HTML mode — Artifact channel" above):

1. Publish with the `Artifact` tool: `file_path` = the fragment you saved, `favicon` = one or two
   emoji fitting the diff's scope (reused unchanged if a sidecar from this session already set
   one — see above), `description` = one sentence on what changed.
2. Record the publish so a later refine (even across sessions, once that lands) can find this URL:
   ```bash
   node ${CLAUDE_PLUGIN_ROOT}/scripts/write-artifact-sidecar.js --report <output-path> --url <artifact-url> --title <title> --favicon <favicon>
   ```
3. Report the URL to the user with one line. This is the **canonical publish notice** shared across
   the channel skills (doc-visual owns the reference form; here the noun is *report*), so keep it
   stable: `Published to claude.ai — design is delegated to Claude's built-in Artifact renderer, so
   it differs from the local page's look; run --local for the local design-system + Mermaid
   version.` This one line does double duty — it discloses the publish (the deliverable is now a URL,
   not a local file) **and** the design delegation. Phrase it in whatever language you're already
   replying in; the structure (published · delegated-design · `--local` escape hatch) is what's
   canonical, not the exact English words.

**Fallback — non-capable session (regenerate, don't just open).** If the `Artifact` tool is
unavailable or the publish call fails, the session is non-capable. Don't guess at the specific cause
and don't ask before falling back. The fragment you authored is a Mermaid-less, skeleton-less page
meant for the Artifact viewer — **do not `open` it** (that serves a broken, diagram-free page and
breaks ADR 0009 §3's promise of design-system + Mermaid on a non-capable session). Instead
**regenerate the full local design-system + Mermaid page** ("HTML mode — local design-system
channel" above), run its full gate + visual self-audit, save to the `{scope}-diff-visual.html` path,
`open` it, and state the fallback in one line (e.g. "Artifact publish unavailable — generated the
local design-system report instead."). Cost = one regeneration, only on a non-capable session.

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
| `${CLAUDE_PLUGIN_ROOT}/references/design-system/mermaid-patterns.md` | Before writing any Mermaid diagram |
| `${CLAUDE_PLUGIN_ROOT}/references/design-system/structured-blocks.md` | Before writing the Code section's snippets (layout, highlight.js CDN, budgets, extraction grounding, degrade — including the Artifact-channel no-CDN variant) |
| `${CLAUDE_PLUGIN_ROOT}/references/design-system/semantic-tokens.md` | When setting up CSS custom properties and Mermaid theme |
| `${CLAUDE_PLUGIN_ROOT}/references/design-system/diagram-type-selection.md` | When deciding diagram type for the flow or dependency picture |
| `${CLAUDE_PLUGIN_ROOT}/references/design-system/diagram-density-rules.md` | When a diagram feels complex |
| `${CLAUDE_PLUGIN_ROOT}/references/design-system/anti-slop-tells.md` | While shaping content — to check you're not falling into a behavioral-slop reflex |
| `${CLAUDE_PLUGIN_ROOT}/references/design-system/visual-self-audit.md` | After the gate passes — the render-and-look loop (full procedure) |
