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

## Three font roles

| Role | Family | Usage |
|---|---|---|
| `title` | Instrument Serif | Page H1, report title |
| `body` | Geist (sans) | Body text, node names |
| `mono` | Geist Mono | Technical content only (ports/URLs/paths) |

**Do not use JetBrains Mono as a blanket dev font.** Mono is for technical content only.

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

## Token sets (for aesthetic-rotation.js)

aesthetic-rotation.js picks one of the following sets:

1. **warm-stone** (default, light) — defaults from the table above
2. **cool-slate** — paper `#f1f5f9`, ink `#0f172a`, accent `#0369a1`
3. **editorial-ink** — paper `#fafaf9`, ink `#18181b`, accent `#7c2d12`
4. **blueprint** — paper `#eff6ff`, ink `#1e3a8a`, accent `#dc2626`
5. **warm-stone-dark** — the dark column above
6. **cool-slate-dark** — inverse of cool-slate

## FORBIDDEN

- `rgba()` in Mermaid classDef (parser breakage — use 8-digit hex `#RRGGBBAA`)
- violet/fuchsia family (`#8b5cf6`, `#7c3aed`, `#a78bfa`, `#d946ef`) as default palette
- Blanket use of JetBrains Mono
