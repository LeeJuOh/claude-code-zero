# Semantic Tokens

The single color/font source for vision-powers. All Layer 1 skills must reference colors and fonts only through the **semantic roles** in this file.

## Semantic roles

| Role | Purpose | Default (light) | Default (dark) |
|---|---|---|---|
| `paper`, `paper-2` | Page/container background | `#faf7f2` | `#1c1917` |
| `ink` | Primary text/primary line | `#1c1917` | `#faf7f2` |
| `muted`, `soft` | Secondary text/default arrows | `#57534e` | `#a8a29e` |
| `rule` | Hairline | rgba(28,25,23,.12) | rgba(250,247,242,.12) |
| `accent`, `accent-tint` | focal (1–2 / diagram) | `#b5523a` | `#d6724a` |
| `link` | HTTP/API/external | `#2563eb` | `#60a5fa` |

Translucent values invert with the ground they sit on: a light-mode `rgba(ink, X)` becomes `rgba(paper, X)` in dark at the same alpha — that is why the `rule` hairline is `rgba(28,25,23,.12)` in light and `rgba(250,247,242,.12)` in dark. Carrying a light-mode ink tint into a dark page turns a hairline invisible against its own background, so derive the dark value rather than reusing the light one.

## Three font roles

| Role | Family (ship the whole chain) | Usage |
|---|---|---|
| `title` | `Instrument Serif, Georgia, serif` | Page H1, report title |
| `body` | `Geist, system-ui, -apple-system, sans-serif` | Body text, node names |
| `mono` | `Geist Mono, ui-monospace, "SF Mono", Menlo, monospace` | Technical content only (ports/URLs/paths) |

vision-powers does not bundle or `@font-face`-load these web fonts, so always emit the **full fallback chain**, never the bare family name. On a machine without Geist/Instrument Serif (or fully offline), the chain degrades to a system serif/sans/mono and the page still reads as intended instead of falling back to an arbitrary browser default. Kami applies the same local-first + fallback discipline (`references/Kami/styles.css` per-language `--serif` chains).

**Do not set a mono font as body text — mono is for technical content only** (ports, URLs, paths). The specific mono face (Geist Mono is the default; JetBrains Mono and others are fine) is a free choice; what's forbidden is monospacing the prose.

## Mermaid themeVariables mapping

```
paper        → canvasColor, background
paper-2      → secondaryColor, tertiaryColor (subgraph/container background)
ink          → primaryTextColor, primaryBorderColor
muted        → lineColor, secondaryTextColor
accent       → primaryColor (focal node)
accent-tint  → primaryColor fill tint (focal node inner fill)
link         → external edge color
```

Example:
```
%%{init: {
  'theme': 'base',
  'themeVariables': {
    'primaryColor': '#b5523a',
    'primaryBorderColor': '#1c1917',
    'lineColor': '#57534e',
    'primaryTextColor': '#1c1917'
  }
}}%%
```

## Token sets

The authoring model picks one of the following sets per report — vary it from the recent reports you can see so successive artifacts don't all look identical:

1. **warm-stone** (default, light) — defaults from the table above
2. **cool-slate** — paper `#f1f5f9`, ink `#0f172a`, accent `#0369a1`
3. **editorial-ink** — paper `#fafaf9`, ink `#18181b`, accent `#7c2d12`
4. **blueprint** — paper `#eff6ff`, ink `#1e3a8a`, accent `#dc2626`
5. **warm-stone-dark** — the dark column above
6. **cool-slate-dark** — inverse of cool-slate

## FORBIDDEN

- `rgba()` in Mermaid classDef (parser breakage — use 8-digit hex `#RRGGBBAA`)
- violet/fuchsia family (`#8b5cf6`, `#7c3aed`, `#a78bfa`, `#d946ef`) as default palette
- Mono as a blanket body font (mono is for technical spans only — the face itself is unrestricted)
- gradient-clipped text (`background-clip: text`) — decorative slop that hurts readability; use a solid accent colour
- a `font-family` with no generic fallback — the gate fails a bare web-font name (`font-family: Geist`); always end the chain with a system family
