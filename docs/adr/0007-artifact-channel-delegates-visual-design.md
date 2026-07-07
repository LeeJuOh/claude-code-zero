---
status: accepted
amended-by: 0009
---

# 0007 — the Artifact channel delegates visual design; the CDN rendering pattern is local-only

> **Amended by [[0009]] (2026-07-08).** A dogfooding checkpoint found the built-in artifact
> design *beat* the local design-system look, inverting this ADR's "if it disappoints → Plan B"
> hypothetical. [[0009]] makes the Artifact channel the **default** for HTML on capable
> accounts (not opt-in) and reframes Mermaid as a demoted rendering technique kept only as the
> non-capable/md fallback. This ADR's core — delegate design on the artifact channel, CDN
> pattern is local-only — still holds.

## Context

Claude Code shipped **Artifacts** (official feature, `code.claude.com/docs/en/artifacts`): a
session publishes a self-contained page to a private claude.ai URL. Pages update in place,
version on each publish, and are shareable inside a Team/Enterprise org. The viewer serves
them under a strict CSP: **no external requests of any kind** — CDN scripts, stylesheets,
fonts, images, fetch/XHR are all blocked — plus no backend, single page, 16 MiB rendered
size, and the viewer's light/dark theme.

vision-powers wants this as a delivery channel (grill 2026-07-05): a visual artifact as a
URL instead of a local file — live-updating, versioned, org-shareable.

The conflict: two accepted ADRs mandate CDN rendering. [[0002]] renders Mermaid from a CDN
`<script>` tag; [[0005]] applies syntax highlighting at runtime via CDN `highlight.js` and
explicitly forbids the model emitting pre-highlighted spans. Under the artifact CSP both
CDNs are unreachable — Mermaid sources would display as raw text (not a graceful
degradation), and the local visual layer (design-system CSS, zoom/pan, PNG export, the ✎
feedback widget) was designed for local files where network and local Chrome are available.

Meanwhile the harness ships a built-in **artifact-design skill** that conditions the model
when it writes an artifact page — written specifically for that sandbox: self-contained by
construction, theme-aware, CSP-compliant.

## Decision

On the **Artifact channel**, the skill delegates the visual-design layer to the harness's
built-in artifact-design skill. The skill keeps what makes its output worth publishing:
analysis, explainer scaffolding, **build-time grounding** (extract-hunks output pasted
verbatim, never retyped — per [[0005]]), and the Gate's content checks.

The CDN rendering pattern of [[0002]]/[[0005]] is **rescoped to the local html channel**,
not reversed. On the Artifact channel:

- Diagrams are authored as inline SVG / HTML+CSS under the built-in skill's guidance — no
  Mermaid runtime.
- Code blocks keep extract-hunks' verbatim, HTML-escaped content; highlighting uses the
  no-CDN fallback styling already specified in `structured-blocks.md` (un-highlighted but
  correct monospace was an accepted degradation in [[0005]]).

When publishing is unavailable (plan, auth, provider, `disableArtifact`), the skill
degrades to local delivery and states the reason in one line.

## Considered options

- **(A) Port the local visual layer into the CSP sandbox** — inline the Mermaid bundle
  (~2 MB) or pre-render diagrams to SVG at build time via the existing Chrome renderer.
  Keeps one visual identity across channels. Rejected for v1: heavy build work and page
  weight to reproduce guarantees (CSP compliance, theming) the built-in skill already
  provides. Retained as **Plan B** if delegated design underperforms on domain layouts.
- **(B) Publish markdown only** — the `--format md` file publishes as-is with claude.ai's
  generic markdown styling. Zero CSP work, cheapest tokens, but no design layer at all and
  Mermaid rendering in the viewer is unverified. Kept as the cheap tier, not the answer
  for report-grade pages.
- **(C) Delegate visual design to the built-in artifact-design skill (chosen).**
  Environment-native CSP and theme compliance for free; grounding and content gate remain
  the skill's; the design-brief lever moves to the harness for this channel only.

## Consequences

- **Two visual identities**: local pages carry the design-system look; artifact pages carry
  the built-in skill's look. Disclosed in README, in the publish-time notice line, and in
  the argument hint — users must not expect local-identical pages.
- Artifact-channel v1 drops zoom/pan, PNG export, and the ✎ feedback widget; the refine
  loop falls back to source-based regeneration.
- [[0002]] and [[0005]] are narrowed, not contradicted: their CDN choices now read as
  local-channel decisions. This ADR exists so the absence of the CDN pattern on the
  Artifact channel is not misread as a violation of those ADRs.
- Dogfooding both channels replaces a formal design benchmark; if the built-in design
  disappoints on domain layouts (split-diff, security tables, health grids), option (A)
  activates as Plan B.
- The channel is availability-gated (Pro/Max/Team/Enterprise, claude.ai login, Anthropic
  API); the auto-degrade path keeps every skill usable in API-key/Bedrock/CI sessions.
