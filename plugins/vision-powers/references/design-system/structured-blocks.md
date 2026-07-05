# Structured Blocks — Showing the Source, Not Describing It

A **structured block** re-presents source *verbatim* in a typed layout: split-diff (before/after
code), annotated-code (code + margin notes), data-model (schema change), api-endpoint (route
contract). It is distinct from a **diagram** (which *abstracts* relationships) and a **callout**
(which the model *writes*): a structured block's factual content **is the source itself, lifted
unchanged**. It widens the design brief past diagrams to the code/contract layer reviewers
actually read. See `docs/context/vision-powers.md` and ADR 0005.

This file is the shared pattern reference for those blocks. Read it when a diff (or a document, or
a plugin) contains code worth showing as code rather than summarizing in prose.

> **Scope today:** this file documents **split-diff**. annotated-code, data-model, and
> api-endpoint join it in later slices (issue 005 S3–S5); each follows the same grounding law
> below, not necessarily the same extraction tool.

## The one law: build-time grounding

A structured block is **true by construction** only when its facts come from *mechanical
extraction*, never from the model retyping. The model selects which hunk/field/route matters and
writes the prose around it (the *why*, the risk, the annotation) — it never re-keys the code.

Why this is non-negotiable: under token pressure a model paraphrases code, reflows it, drops a
line, or mis-escapes `< > &`. A confidently-wrong diff is *worse* than no diff in a review,
because a reviewer who trusts the block may skip the very line it got wrong. Extraction removes
that failure mode at the source.

- **Code blocks** (split-diff / annotated-code) are filled by `scripts/extract-hunks.js` — it
  pulls the exact hunk from git and HTML-escapes it. You paste its `<pre><code>` output and write
  only the surrounding prose.
- **Schema / route blocks** (data-model / api-endpoint) use their own diff-aware extraction
  (changed fields / route contracts, not line-range hunks). Same law, different tool. *(later slices)*

Never hand-type code into a block. Never emit pre-highlighted `<span>` markup — that is retyping
by another name and breaks the verbatim guarantee. Highlighting is a **runtime** concern (below).

## Syntax highlighting: runtime CDN, same shape as Mermaid

**Scope: local channel only.** Everything in this section — the CDN `<link>`/`<script>` tags, the
`<head>` injection — applies to the default local-file HTML output. The Artifact channel forbids
external requests outright (CSP), so it never emits any of this; see "Artifact channel: no CDN,
forced degrade" below for what to do instead.

`diff-visual` already renders Mermaid from a CDN `<script>` (ADR 0002). Highlighting follows the
same pattern with **highlight.js** — the model emits plain escaped `<pre><code class="language-X">`
and the browser colours it at view time. The model does not colour anything.

Drop this once in `<head>` (load both themes, switch on `prefers-color-scheme`):

```html
<link rel="stylesheet" media="(prefers-color-scheme: light)"
      href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github.min.css">
<link rel="stylesheet" media="(prefers-color-scheme: dark)"
      href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css">
<script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>
<script>
  // Only highlight code we tagged; never touch Mermaid's <pre class="mermaid">.
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('pre code[class^="language-"]').forEach(el => {
      if (window.hljs) hljs.highlightElement(el);
    });
  });
</script>
```

Notes:
- **github / github-dark are deliberate** — they use no violet/fuchsia, so they never trip the
  forbidden-palette gate. Don't swap in a theme that paints keywords purple.
- **Always set an explicit `language-` class** (from the file extension — `extract-hunks.js`
  already does this). Auto-detection mis-guesses short hunks; an explicit class is reliable.
- The highlight pass is scoped to `pre code[class^="language-"]` so it never collides with the
  Mermaid `<pre class="mermaid">` blocks on the same page.

### Network-0 degrade (must not break)

The CDN is an enhancement, not a dependency. With no network, highlight.js never loads, the
`.hljs` class is never added, and the code must still render as clean monospace — never as an
unstyled wall or broken layout. Guarantee it with your own CSS on the raw `<pre><code>`, which
applies whether or not hljs runs:

```css
.split-diff pre { margin: 0; overflow: auto; }
.split-diff pre code {
  display: block;
  padding: .75rem .9rem;
  font-family: var(--mono, ui-monospace, "SF Mono", Menlo, monospace);
  font-size: .82rem;
  line-height: 1.5;
  /* fallback colours for the no-CDN case; hljs theme overrides when it loads */
  background: var(--paper-2);
  color: var(--ink);
  white-space: pre;
  tab-size: 2;
}
```

Because the hljs github theme sets its own `.hljs` background/colour on the `<code>`, it cleanly
takes over when present; your rule is the floor it falls back to. Test this: load the report with
the network off and confirm the code is readable, just un-coloured.

### Artifact channel: no CDN, forced degrade

On the Artifact channel, don't emit the highlight.js `<link>`/`<script>` tags at all — the same
zero-external-requests rule that already bans the Mermaid CDN on this channel applies symmetrically
here. There's no "try CDN, degrade if offline" branch on this channel; the no-CDN path above is the
*only* path, always. That's an accepted degrade, not a gap: plain monospace code is exactly what the
Network-0 degrade case above already guarantees looks clean and readable — the Artifact channel just
takes that branch unconditionally instead of as a fallback.

One adjustment when you carry that fallback CSS over: the `var(--paper-2)`, `var(--ink)`, and
`var(--mono)` custom properties above are vision-powers' local-channel design tokens
(`semantic-tokens.md`) — they aren't defined on an Artifact page, which uses whatever palette the
built-in artifact-design skill guided you to for that specific page. Rewrite the block against your
page's actual custom properties (or literal values, if you didn't define one for this role), keeping
the same shape — a block background, an ink colour, and a font stack ending in the generic
`monospace` fallback:

```css
.split-diff pre code {
  display: block;
  padding: .75rem .9rem;
  font-family: ui-monospace, "SF Mono", Menlo, monospace; /* end in the generic family either way */
  font-size: .82rem;
  line-height: 1.5;
  background: #1e1e1e; /* substitute this page's own container colour */
  color: #d4d4d4;      /* substitute this page's own text colour */
  white-space: pre;
  tab-size: 2;
}
```

The grounding law is unaffected by any of this — `extract-hunks.js`'s escaped `<pre><code>` output
is pasted verbatim on every channel; only the CSS/highlight mechanism around it changes.

## split-diff: before | after, side by side

The grilled layout decision (issue 005): **left = before, right = after**, each pane highlighted
*normally* by highlight.js. We deliberately do **not** paint per-line `+/−` backgrounds inside the
panes — line tints fight the token colours and turn the code muddy. The before/after comparison
lives at the **pane** level (labelled headers + a thin edge accent), the token colours stay clean.

### Pipeline

1. Pick the meaningful changed files (budget below). For each, decide the line range worth showing.
2. Run the extractor — it returns paste-ready, escaped `<pre><code>` panes:
   ```bash
   node ${CLAUDE_PLUGIN_ROOT}/scripts/extract-hunks.js <scope> <file> [line-range]
   # PR diffs (no local refs): gh pr diff 123 | node .../extract-hunks.js --stdin <file> [range]
   ```
3. Paste the `BEFORE` and `AFTER` `<pre><code>` blocks into the skeleton. **Write the one-line
   `summary` and any annotations yourself** — that prose is the only part you author.

### Skeleton (yours to restyle — this is a menu, not a template)

```html
<details class="diff-file" open>
  <summary>src/auth/session.ts <span class="flag flag-modified">modified</span></summary>
  <p class="diff-why">Token-expiry check was off-by-one; switch to <code>&lt;=</code> so a token
     expiring this exact second is rejected.</p>
  <div class="split-diff">
    <div class="pane pane-before"><div class="pane-label">− before</div>
      <!-- PASTE extract-hunks BEFORE block here, verbatim -->
    </div>
    <div class="pane pane-after"><div class="pane-label">+ after</div>
      <!-- PASTE extract-hunks AFTER block here, verbatim -->
    </div>
  </div>
</details>
```

```css
.split-diff { display: grid; grid-template-columns: 1fr 1fr; gap: .6rem; }
.split-diff .pane { min-width: 0; border: 1px solid var(--rule); border-radius: 6px; overflow: hidden; }
.pane-label { font: .72rem/1 var(--mono, monospace); padding: .4rem .6rem; border-bottom: 1px solid var(--rule); }
.pane-before .pane-label { color: var(--diff-removed); }
.pane-after  .pane-label { color: var(--diff-added); }
.pane-before { border-left: 3px solid var(--diff-removed); }
.pane-after  { border-left: 3px solid var(--diff-added); }
@media (max-width: 720px) { .split-diff { grid-template-columns: 1fr; } } /* narrow → stack */
```

The add/removed accents are the **one** sanctioned colour pair outside `semantic-tokens.md`,
because diff red/green is a universally-read convention and these touch only the pane chrome
(label + 3px edge), never the code text. Use desaturated, non-purple values and define a dark
variant:

```css
:root { --diff-removed: #b3261e; --diff-added: #1f7a33; }
@media (prefers-color-scheme: dark) { :root { --diff-removed: #f2998f; --diff-added: #7bd393; } }
```

### Budgets (keep it reviewable)

- **3–8 files** of split-diff. Fewer than 3 on a large change under-serves the reviewer; more
  than 8 stops being a recap and becomes the raw diff again.
- **≤ ~150 lines per file.** Past that, show the load-bearing hunks and note the rest:
  `<p class="more">(+128 more lines — see full diff)</p>`.
- One `<details>` **per file**, with only the **1–2 load-bearing files `open`** and the rest
  collapsed. This is native HTML (zero JS) and matches the *uniform-density* Tell in
  `anti-slop-tells.md`: let the key change draw the eye, fold the routine ones away.

### Pure additions / deletions

A hunk with no "before" lines (a brand-new file or a large added block) reads better as
**annotated-code** than as a one-sided split — `extract-hunks.js` flags this in its output. Until
annotated-code lands (S3), show the AFTER pane alone with the `− before` pane omitted, and say in
prose that it is newly added.

## What the gate still checks (and what it no longer needs to)

`extract-hunks.js` guarantees verbatim + HTML-escaped at the source, so the gate does **not**
re-verify code fidelity. The general gate rules still apply to the chrome you author:
- Every `<img>` needs `alt`; every `<a>` a real `href`; no leftover `{{ }}`/lorem/`[STUB]`.
- No `background-clip: text`; no forbidden violet/fuchsia hexes; every `font-family` ends in a
  generic fallback. The CDN theme CSS is loaded by `<link>` (not inline), so it is outside the
  gate's CSS checks — your inline `--mono` chain still must end in `monospace`.

A code-block density/budget check (files > 8, lines > 150) is a *candidate* future gate rule, not
enforced today — keep the budgets by authoring discipline for now.
