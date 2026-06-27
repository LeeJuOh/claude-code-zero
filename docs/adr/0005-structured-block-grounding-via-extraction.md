---
status: accepted
---

# 0005 — structured-block content is grounded by mechanical extraction, not a fragmenting pipeline

## Context

vision-powers' `diff-visual` renders file-maps, architecture diagrams, change-classification
tables, and impact quadrants — but never the **actual changed code**. A comparison with
Builder.io's `visual-recap` skill (`references/builderIO-skills/`) surfaced the gap: their
recaps *headline* `split-diff` and `annotated-code` "structured blocks," and require those
blocks to be **true by construction** — built mechanically from the real diff, with the model
writing only the surrounding prose. Showing the load-bearing code is exactly the spatial
preservation the plugin's HTML thesis promises, and it is the single biggest hole in
`diff-visual` today.

We are therefore adding **structured blocks** (see `docs/context/vision-powers.md`) to the
family, starting with `split-diff` and `file-tree` change-flags, then `annotated-code`,
`data-model`, and `api-endpoint`, each surfaced by content auto-detection rather than a user
flag.

To keep a structured block's code **verbatim** (no model retyping → no drift) and HTML-safe,
a small bundled script `extract-hunks.js` pulls the exact hunks from git and HTML-escapes them;
the model only selects which hunks matter and writes the prose (why / risk / annotation).

This *appears* to contradict **[[0002]]**, which removed the generation pipeline and declared
that "the model writes the whole artifact directly in a single pass… the pipeline
infrastructure becomes deletable." A future reader will reasonably ask: *why is a script back
in the generation path?*

## Decision

`extract-hunks.js` is a **grounding helper, not a generation pipeline.** The model still
authors the whole artifact in one pass (per 0002); the script only supplies byte-for-byte
source fragments the model would otherwise retype.

The distinction that resolves the apparent conflict with 0002:

- **What 0002 deleted** were scripts that *fragmented and compressed* — `parse-markdown →
  section-analyzer → diagram-generator` dropped the original body and forced one Mermaid
  diagram per section. They stood *between* the model and the content and lossily reshaped it.
- **What `extract-hunks.js` does** is the opposite: it *preserves* source byte-for-byte, adds
  no structure of its own, and feeds the model rather than replacing it. It serves 0002's
  preservation thesis instead of regressing to per-section slot-filling.

Structured blocks are thus **build-time grounded (true-by-construction)**: their factual
content comes from mechanical extraction; the model contributes only selection and prose. This
also shrinks the **Gate**'s job for these blocks — verbatim and HTML-escaped at the source,
before any gate runs.

Syntax highlighting is applied at **runtime via a CDN** (`highlight.js`), parallel to 0002's
choice to render Mermaid from a CDN `<script>` tag — never by the model emitting pre-highlighted
spans (which would reintroduce retyping and break verbatim grounding).

## Considered options

- **(A) Model copies hunks verbatim by hand, no script.** Rejected: the model paraphrases or
  reflows code under token pressure (drift), and must hand-escape `< > &` — a new gate failure
  mode. Defeats true-by-construction.
- **(B) Model emits pre-highlighted / build-time `<span>` markup.** Rejected: retyping tokens
  breaks verbatim grounding and is token-expensive. Highlighting belongs at runtime (CDN).
- **(C) `extract-hunks.js` mechanical extraction + runtime CDN highlighting (chosen).**
  Verbatim guaranteed, escaping handled at the source, model writes only prose. Consistent with
  0002's preservation thesis and its CDN-for-rendering pattern.

## Consequences

- A script re-enters the generation path, but scoped to **extraction**, not **authoring** —
  0002's "model authors the whole artifact directly" still holds. This ADR exists so that
  re-entry is not misread as a return to the fragmenting pipeline 0002 removed.
- Future structured-block types extend the same *extract-then-prose* **principle** — facts come
  from mechanical extraction, the model writes only the prose — but not necessarily the same
  *tool*. Code blocks (`annotated-code`) reuse `extract-hunks.js`; schema/contract blocks
  (`data-model`, `api-endpoint`) use their own diff-aware extraction (changed fields / route
  contracts, not line-range hunks). The shared commitment is "no model retyping of facts," not
  "one extraction script." None of these is a content-fragmenting pipeline of the kind 0002 removed.
- The Gate's structured-block surface shrinks (verbatim + escaping guaranteed upstream); a
  density/budget check for code blocks may still be added to the Gate later.
- Highlighting depends on a CDN (`highlight.js`), inheriting the same "first view needs network"
  caveat already accepted for Mermaid; with no network the code degrades to un-highlighted but
  correct monospace.
- Rollout is phased and eval-gated (see issue 005): `split-diff` + `file-tree` flags first,
  proven against bare `diff-visual` output, then `annotated-code`, then `data-model` /
  `api-endpoint`.
