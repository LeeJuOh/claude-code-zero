# Font System

Typography is the primary design signal. Every report uses a distinct font triple (heading / body / mono) rotated to prevent visual monotony. Never use the same pairing for consecutive reports.

## Font Pairings

12 curated triples. Load via Google Fonts CDN with `display=swap`.

- **Heading** (`--font-heading`): Used for h1–h4 and pull-quotes. Display/serif fonts OK here.
- **Body** (`--font-body`): Used for paragraphs, tables, lists — ALL running text. **Must be a readable sans-serif** for English legibility at 15px.
- **Mono** (`--font-mono`): Used for code, labels, badges.

| # | Heading | Body | Mono | Feel | Recommended For |
|---|---|---|---|---|---|
| 1 | DM Sans | DM Sans | Fira Code | Friendly, developer | Blueprint, technical docs |
| 2 | Instrument Serif | DM Sans | JetBrains Mono | Editorial, refined | Plan reviews, decision logs |
| 3 | IBM Plex Sans | IBM Plex Sans | IBM Plex Mono | Reliable, readable | Architecture diagrams |
| 4 | Bricolage Grotesque | Bricolage Grotesque | Fragment Mono | Bold, characterful | Data tables, dashboards |
| 5 | Plus Jakarta Sans | Plus Jakarta Sans | Azeret Mono | Rounded, approachable | Wiki reports, audits |
| 6 | Outfit | Outfit | Space Mono | Clean geometric, modern | Flowcharts, pipelines |
| 7 | Sora | Sora | IBM Plex Mono | Technical, precise | ER diagrams, schemas |
| 8 | Crimson Pro | Libre Franklin | Noto Sans Mono | Scholarly, serious | RFC reviews, specs |
| 9 | Fraunces | DM Sans | Source Code Pro | Warm, distinctive | Project recaps |
| 10 | Geist | Geist | Geist Mono | Vercel-inspired, sharp | Modern API docs |
| 11 | Red Hat Display | Red Hat Text | Red Hat Mono | Cohesive family | System overviews |
| 12 | Libre Franklin | Libre Franklin | Inconsolata | Classic, reliable | Data-dense tables |

When heading = body (pairings 1, 3–7, 10, 12), set `--font-heading` to the same value as `--font-body`. When heading ≠ body (pairings 2, 8, 9, 11), load both fonts via Google Fonts.

Pairings 1-5 are the primary rotation set. Use 6-12 for variety when the primary set has been recently used.

## Content-Type Recommendations

| Report Type | Recommended Pairings | Aesthetic |
|---|---|---|
| Wiki (vision-wiki) | #5 (Plus Jakarta Sans), #1 (DM Sans), #3 (IBM Plex Sans) | Approachable, reliable |
| Diff Review (vision-diff) | #2 (Instrument Serif + DM Sans), #6 (Outfit), #4 (Bricolage Grotesque) | Editorial, bold |
| Plan Review (vision-plan) | #1 (DM Sans), #3 (IBM Plex Sans), #7 (Sora) | Blueprint, technical |
| Project Recap | #9 (Fraunces + DM Sans), #2 (Instrument Serif + DM Sans), #8 (Crimson Pro + Libre Franklin) | Warm, editorial |

## Rotation Rules

1. **Never use the same pairing consecutively** — if the last report used DM Sans + Fira Code, pick a different one
2. **Match pairing to content voice** — editorial content gets serif headings with readable sans body, technical content gets geometric sans
3. **The agent chooses** — the report-writer agent selects from this table based on the content type and previous usage
4. **Body must always be sans-serif** — serif and display fonts go to `--font-heading` only, never to `--font-body`

## Forbidden Fonts

These signal "AI-generated template" — never use as `--font-body`:

| Font | Reason |
|---|---|
| Inter | Single most overused AI default |
| Roboto | Generic Android/Google default |
| Arial, Helvetica | System defaults with zero character |
| system-ui (alone) | Signals no design intent |

`system-ui` is acceptable ONLY as a fallback in the font stack (e.g., `'DM Sans', system-ui, sans-serif`), never as the primary font.

## Google Fonts CDN Pattern

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family={Body}:wght@400;500;600;700&family={Mono}:wght@400;500&display=swap" rel="stylesheet">
```

Replace `{Body}` and `{Mono}` with the chosen pairing. Use `+` for spaces in font names (e.g., `Plus+Jakarta+Sans`).

### CSS Variable Override

After loading the font, override all three CSS variables:

```css
:root {
  --font-heading: '{Heading Font}', system-ui, sans-serif;
  --font-body: '{Body Font}', system-ui, sans-serif;
  --font-mono: '{Mono Font}', 'SF Mono', Consolas, monospace;
}
```

When heading = body (most pairings), set both to the same value. When heading ≠ body (serif pairings like #2, #8, #9), the heading font gets a serif fallback:

```css
:root {
  --font-heading: 'Instrument Serif', Georgia, serif;
  --font-body: 'DM Sans', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', 'SF Mono', Consolas, monospace;
}
```

## Multilingual Font Support

For reports containing non-Latin text (Korean, Japanese, Chinese), load the appropriate Noto Sans CJK variant from Google Fonts. Google Fonts applies `unicode-range` subsetting automatically — no manual configuration needed, and English-only reports incur zero download cost.

### Recommended CJK Fonts

| Language | Font | Google Fonts Family |
|----------|------|---------------------|
| Korean (ko) | Noto Sans KR | `Noto+Sans+KR` |
| Japanese (ja) | Noto Sans JP | `Noto+Sans+JP` |
| Chinese Simplified (zh) | Noto Sans SC | `Noto+Sans+SC` |

### CDN Pattern with CJK

Add the CJK font to the existing Google Fonts `<link>`:

```html
<link href="https://fonts.googleapis.com/css2?family={Body}:wght@400;500;600;700&family={Mono}:wght@400;500&family=Noto+Sans+KR:wght@400;500;700&display=swap" rel="stylesheet">
```

Replace `Noto+Sans+KR` with the appropriate CJK font for the output language. Multiple CJK fonts can be loaded simultaneously if needed.

### Font Stack with CJK

Insert the CJK font between each font and its system fallback:

```css
:root {
  --font-heading: '{Heading Font}', 'Noto Sans KR', system-ui, sans-serif;
  --font-body: '{Body Font}', 'Noto Sans KR', system-ui, sans-serif;
}
```

### Inclusion Rules

| Condition | Include CJK Font? |
|-----------|-------------------|
| Non-Latin output language (ko, ja, zh) | **Required** — ensures consistent glyph rendering |
| English-only output | Optional (unicode-range ensures zero download cost for unused glyphs) |
