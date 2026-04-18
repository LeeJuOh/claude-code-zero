# Anti-Slop Rules

Quality constraints to prevent AI-generated template aesthetics. Every report must pass these checks.

## Forbidden Colors

| Color | Hex | Reason |
|---|---|---|
| Violet/Indigo | `#8b5cf6`, `#7c3aed`, `#a78bfa` | Default AI template palette |
| Fuchsia | `#d946ef` | Neon AI aesthetic |
| Cyan-Magenta-Pink | — | Neon dashboard cliche |

## Forbidden Patterns

These signal "AI-generated template" — never use:

1. **Neon dashboard** — glowing cards, animated shadows, cyan/magenta accents
2. **Gradient mesh backgrounds** — overlapping pastel gradients as primary background
3. **Gradient-clip text** — `background-clip: text` on every heading
4. **Emoji icons** — emoji leading every section heading or used as status indicators
5. **Animated glowing box-shadows** — `@keyframes glow` pulsing effects
6. **Perfectly uniform card grids** — identical cards with no visual hierarchy
7. **Three-dot code block chrome** — fake macOS window controls on code blocks
8. **Perfectly centered everything** — uniform padding with no spatial variation

## Generic Diagram Labels

> **Canonical examples live in this file.** `diagram-argumentation.md` references these labels for reasoning and multi-zoom context; when adding or revising forbidden labels or fix examples, edit this section and leave `diagram-argumentation.md` to point at it. The validator (`scripts/validate-report.js`) also reads from this list.

Mermaid/Chart nodes and cards must carry **concrete identifiers**, not category placeholders. A diagram labeled with generic category names teaches nothing and reads as AI boilerplate.

### Forbidden (as standalone labels)

| Forbidden | Why | Fix |
|---|---|---|
| `Component` / `Components` | Names nothing | Use the actual component name: `Auth middleware`, `Payment router` |
| `Data` / `Payload` | Shape is invisible | Show field names or sample shape: `{ user_id, amount, status }` |
| `API` / `Endpoint` | Hides the contract | Use the route: `POST /checkout`, `GET /users/:id` |
| `Service` / `Module` | Empty structure | Use the module path: `src/payments/stripe.js` |
| `Database` / `DB` | Vague | Name it: `users table (Postgres)`, `orders collection (Mongo)` |
| `Event` / `Message` | Misses the spec | Use actual event names: `RUN_STARTED`, `STATE_DELTA` |
| `Process` / `Step` | Black box | Name the action: `Validate token`, `Publish to SQS` |

**Rule:** If you can swap a label into any unrelated report and it still fits, it's too generic. The test is specificity — a reader should learn something concrete from each node.

### When generic labels are OK

- **Timeline markers** that represent phases (`Phase 1`, `Setup`, `Teardown`) when the phase itself is the content
- **Role boxes** on a high-level overview (`User`, `System`, `External`) when personas are the abstraction
- **Category buckets** in a distribution chart where the label is the metric (`Features`, `Refactor`, `Tests`)

Even here, prefer specific over generic whenever domain names exist.

See `diagram-argumentation.md` for the full Evidence Artifacts requirement that complements this rule.

## Approved Aesthetics

Pick ONE and commit for the entire report:

| Aesthetic | Feel | Key Traits |
|---|---|---|
| **Blueprint** | Technical drawing | Deep slate/blue background, monospace labels, subtle grid pattern, precise lines |
| **Editorial** | Magazine/journal | Serif or refined sans headings, generous whitespace, muted earth tones or deep navy+gold |
| **Paper/ink** | Warm document | Warm cream `#faf7f5` background, terracotta/sage accents, informal but structured |
| **Monochrome terminal** | Developer console | Green/amber on near-black, monospace everything, minimal decoration |

The aesthetic should match the content type — see `font-system.md` for pairing recommendations.

## Approved Accent Palettes

These are curated alternatives to the default violet/indigo. Pick a complementary pair:

| Palette | Primary | Secondary | Best For |
|---|---|---|---|
| Terracotta + Sage | `#c2410c` | `#65a30d` | Warm, earthy reports |
| Teal + Slate | `#0891b2` | `#0369a1` | Technical, cool-toned |
| Rose + Cranberry | `#be123c` | `#881337` | Bold, attention-grabbing |
| Amber + Emerald | `#d97706` | `#059669` | Balanced, natural |
| Deep Blue + Gold | `#1e3a5f` | `#d4a73a` | Professional, editorial |
| Olive + Charcoal | `#4d7c0f` | `#374151` | Understated, organic |
| Rust + Navy | `#9a3412` | `#1e3a5f` | Classic, authoritative |

### Dark Mode Variants

In dark mode, lighten accents for visibility:
- `#c2410c` → `#fb923c` (terracotta → light orange)
- `#0891b2` → `#22d3ee` (teal → bright cyan)
- `#d97706` → `#fbbf24` (amber → bright yellow)
- `#059669` → `#34d399` (emerald → light green)

## Quality Checklist

Run these checks before delivering any report:

### Squint Test

Blur your eyes at the page. Can you still perceive visual hierarchy? If everything blends together, depth tiers and typography contrast need work.

### Swap Test

Would replacing the fonts and colors with a generic dark theme make this indistinguishable from a template? If yes, the design lacks character — add spatial variation, a distinctive accent, or a non-standard layout element.

### Both Themes

Toggle OS light/dark mode. Both should look intentional, not "one is the real design and the other is broken."

### Information Completeness

Does the report actually convey what was requested? Visual polish means nothing if content is missing.

### No Overflow

Resize the browser window from wide to narrow. Nothing should clip, escape containers, or become unreadable. Check:
- Tables wrapped in `.table-wrapper` with `overflow-x: auto`
- Code blocks have `white-space: pre-wrap`
- Grid/flex children have `min-width: 0`
- Long URLs and paths wrap correctly

### Mermaid Zoom

Every `.mermaid-wrap` has +/-/reset controls, scroll zoom (Ctrl/Cmd), and drag panning.

### No Console Errors

No broken font loads, layout shift warnings, or undefined references in browser console.

### No Emoji

Zero emoji anywhere in the report — headings, badges, labels, status indicators, section intros. Use colored dot indicators (`.status` CSS class) instead.
