# Anti-Slop Tells — Behavioral Defaults to Break

A named catalogue of the *behaviors* that quietly make an explainer artifact worse than the bare model would. Read it while authoring, not as a fill-in template.

## What this file is (and isn't)

`semantic-tokens.md` and `artifact-gate.js` already catch the **mechanical** slop — AI-purple palettes, gradient-clipped text, missing font fallbacks, Mermaid `classDef` colour traps. Those are CSS/markup defects a script can see. **Do not restate them here.**

This file covers the other half: **behavioral slop** — the authoring habits that pass every mechanical check and still flatten the output. A page can have a flawless palette and zero gate violations and still be a linear dump with a forced diagram on top. No script catches that; the author has to.

Two anchors frame every Tell below:

- **Slop** makes output *worse* than the bare model. If a habit adds nothing a reader can use, it is slop even when it looks polished.
- **Leverage vs delegation.** Taste, layout, and CSS stay delegated to the model — these Tells do **not** dictate design. They name bad *defaults* so the model can choose freely *against* them. The instruction is never "use this layout"; it is "don't fall into this reflex."

The taste-skill convention is borrowed wholesale: **name the default, say why it's slop, show Before → After.** taste-skill names landing-page reflexes (6-line headings, "QUESTION 05" labels, gapless bento). vision-powers ships explainer docs, so the *technique* transfers but the *content* is entirely explainer-specific.

---

## The seven Tells

### 1. Summary-leak

**What it is.** Replacing a body of substance with a one-line gist — "This section explains the auth flow" instead of re-presenting the auth flow.

**Why it's slop.** This is the **cardinal sin**: compression *is* the linear-dump problem turned inward. The artifact exists to preserve substance and change its *shape*; a summary throws the substance away. The reader came for the detail and got a label.

**Before → After.**
- Before: `<p>The retry logic handles transient failures.</p>` (the source had three paragraphs on backoff, jitter, and the dead-letter path)
- After: a callout stating the policy, a small table of the three failure classes and their handling, the backoff formula in a `<code>` span — every fact from the source, re-shaped into scaffolding.

### 2. Linear dump

**What it is.** Emitting the source top-to-bottom with headings bolted on but no actual scaffolding — no TL;DR, no proportion, no navigation. Structurally "has headings," experientially still a wall.

**Why it's slop.** Headings alone don't undo flatness; they index it. The leverage is *re-structuring* — TL;DR box, collapsible steps, comparison tables, margin glossary — applied without dropping content. A dump with `<h2>`s is the failure mode wearing the costume of the fix.

**Before → After.**
- Before: eight `<h2>` sections of equal-weight prose, read once and unnavigable.
- After: a TL;DR box up top, the two load-bearing sections expanded, the routine ones collapsed behind `<details>`, one comparison table where the prose was contrasting options.

### 3. Forced diagram

**What it is.** Reaching for Mermaid (or any diagram) on content that isn't spatial — rendering a sequential list or a two-axis comparison as a flowchart because "diagram-rich" was misread as "diagram per section."

**Why it's slop.** A diagram that a 3-column table would convey better is noise that costs render time and reading effort. `artifact-gate.md` ("Type fit": *could a 3-column table convey the same? → drop the diagram*) and `diagram-type-selection.md` already encode this — consult them. The resolved guidance is "use the *right* visual generously," not "one diagram per section."

**Before → After.**
- Before: a `graph TD` with five nodes restating "config → validate → build → test → deploy."
- After: an ordered list, or a 2-row table of stage × failure-behavior. Save Mermaid for the parts where layout *is* the information (a dependency fan-out, a state machine).

### 4. Generic label

**What it is.** Naming a section by its position or category instead of its content: "Section 1," "Overview," "Details," "Step 2," "Miscellaneous."

**Why it's slop.** taste-skill bans the same reflex ("QUESTION 05," "SECTION 01") for the same reason — a positional label is a wasted naming slot. The reader scanning the page learns nothing from "Details." A label is a free chance to tell the reader what's inside; spending it on an ordinal throws that away.

**Before → After.**
- Before: `## Section 3: Details`
- After: `## Why the cache invalidates on write` — the heading now does navigation work.

### 5. Uniform density

**What it is.** Rendering every section at the same visual weight — a two-line aside and the core argument get identical heading size, identical spacing, identical treatment.

**Why it's slop.** Proportion *is* information. When everything looks equally important, the reader can't find the load-bearing part, so the artifact fails its one job — making the shape graspable at a glance. Flat hierarchy is the visual twin of the linear dump.

**Before → After.**
- Before: six sections, identical `<h2>` + paragraph, no size or density variation.
- After: the central section gets a wider column, a pull-quote, or a diagram; the supporting ones stay compact or collapse. The eye lands on what matters first. (Which section is load-bearing is the model's call — this Tell only says *don't render them all the same*.)

### 6. Empty decoration

**What it is.** A visual element that carries no information — an icon as ornament, a callout with nothing callout-worthy, a diagram that restates a sentence already on the page, a divider purely for texture.

**Why it's slop.** Decoration without information is the behavioral cousin of the CSS slop this design system rejects (glassmorphism, bento, decorative gradients). The gate catches the CSS subset (`background-clip: text`, etc.); it can't catch a *semantically* empty callout. The test from `artifact-gate.md`'s Remove test applies: if deleting the element loses no information, it was decoration.

**Before → After.**
- Before: a highlighted callout reading "This is important." next to a 🎯 icon.
- After: either the callout states *what* is important and *why* (now it carries information), or it's deleted and the emphasis moves to typography.

### 7. Accent overuse

**What it is.** Highlighting many things — multiple accent colours, several "focal" nodes, half the page bolded. Everything shouts.

**Why it's slop.** When everything is emphasized, nothing is. `artifact-gate.md` sets **accent ≤ 2** (one or two focal points per view), but notes this is *authoring judgment, not yet mechanically enforced* — so it lives here as a Tell. Accent is a scarce signal; spending it everywhere spends it nowhere.

**Before → After.**
- Before: four `accent`-coloured nodes in one diagram, three bold inline spans per paragraph.
- After: one focal node the eye goes to first; emphasis elsewhere carried by structure (position, size) rather than colour.

---

## Using this catalogue

These are defaults to break, not rules to obey. The model still chooses the layout, the palette set, the diagram type, the proportion — the entire design surface stays delegated, exactly as the leverage-vs-delegation principle requires. A Tell only flags a reflex worth resisting; the *better* choice is the model's to make. None of these seven are gate-enforced (the gate's reach is `artifact-gate.md`'s automation list) — they're caught by an author who knows their names.
