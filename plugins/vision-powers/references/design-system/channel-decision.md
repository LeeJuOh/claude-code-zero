# Channel Decision — Where a Report Lands (SSOT)

The single place that decides **which channel a visual report ships on** — a published claude.ai
Artifact, or a local design-system file — what each flag and config key means, and the rules each
channel follows. The three channel skills (`doc-visual`, `diff-visual`, `plugin-visual`) cite this
file instead of each re-deriving the rule, so the policy can't drift skill-to-skill. Each skill keeps
only its own output paths and commands. `fact-check` and `report-manager` don't author reports: they
keep a file on the channel it already has.

## Why artifact-first

A 2026-07-08 checkpoint rendered the same source through both channels and compared them: content
was parity, but the built-in **artifact-design** rendering won on design, readability, and
visibility. So the durable asset is the **diagram-type selection** (`diagram-type-selection.md`'s
13-type menu + case→diagram mapping) — that is channel-agnostic. **Mermaid is one rendering
technique for it, not the diagram layer**; it is kept for the local and md channels only.

## Decision table

`(Format × artifact-capable?) → Channel + rendering`:

| Format | capable | Channel | Rendering |
|---|---|---|---|
| `html` | yes | **Artifact** (default publish) | built-in artifact-design (inline SVG / HTML+CSS, no Mermaid) |
| `html` | no | Local file | design-system + Mermaid |
| `md` | any | Local (chat body + saved copy); **Artifact only on request** | design-system + Mermaid fences |

Read this as: **HTML defaults to the Artifact channel.** Local is the fallback for a non-capable
session (or an explicit force-local). **`md` defaults to local** — claude.ai's markdown renderer
shows Mermaid fences as code — and publishes only when this turn asks for it. See "Markdown on
request" below.

## Precedence — explicit request > config > default

Resolve the format and channel in this order; the first that speaks wins:

1. **This turn's explicit signal** — a literal flag (`--local`, `--artifact`, `--format`) or its
   natural-language equivalent, in whatever language the user writes. Always overrides everything below.
2. **Stored config** — the skill's `config.js get` command (prints JSON, or `{}`). Check it once,
   only when the request is silent on format or channel. See "Config keys" below.
3. **Default** — `html`, artifact-first for capable HTML, per the table.

## Flags

### `--local` — force-local override (the exception flag)

Forces the **local design-system + Mermaid** file on a capable account that would otherwise publish.
Reach for it when the report needs an analytical chart type the Artifact channel degrades to a table
(quadrant/scatter), or Mermaid's local-only infrastructure (zoom/pan, PNG export, offline render).
Natural-language equivalents count too — "keep it local", "just the local file", "don't publish",
in any language.

### `--artifact` — retained as a no-op alias

On capable HTML, `--artifact` is redundant — it is kept so muscle memory and natural-language
triggers ("as an artifact", "publish as a link", "share as a URL") don't break. Semantics:

- **capable HTML**: no-op — it's already the default.
- **`md`**: the publish request — see "Markdown on request" below.
- **non-capable session**: still *attempts* to publish (then falls back per "Capability detection").
- **`--artifact` and `--local` both given**: **`--local` wins** (the exception flag beats the
  redundant one).

## Config keys

- **`default_format`** → replaces the `html` default.
- **`artifact` absent or `true`** → artifact-first (the table applies unchanged).
- **`artifact: false`** → **persistent force-local**: the config twin of `--local`. Respect it
  exactly as a typed `--local`. A this-turn `--artifact` still overrides it for that one run.

`config.js` is a plain key-value store — these interpretations live here, not in its code. Config
never publishes md.

## Markdown on request

`md` publishes only when **this turn** asks for it — a literal `--artifact` or a natural-language
equivalent ("publish it", "as a link", "share as a URL", in any language). Config never publishes md:
`artifact` absent or `true` means artifact-first for HTML only, so a silent md request stays local.

When the turn asks, publish without asking first — the user already chose the channel:

1. Write the md report as usual, and save the same content to the skill's md path with `.md`
   replaced by `.artifact.md`. Publish it as-is: no rewrite, no `artifact-design` load, no gate —
   md has no design layer to author.
2. Publish that file with the `Artifact` tool, then record the sidecar, same as the HTML publish.
3. Reply with the URL instead of the full report body. If the content has a ` ```mermaid ` fence,
   add one line: the diagrams show as code on this channel, and `--format html` renders them.
4. Publish unavailable or failed → deliver the md in the chat body (the local path) and say so in
   one line.

## Artifact channel (HTML)

Same content decisions as the local channel — sections, diagram types, content integrity, anti-slop
tells. Only the rendering changes:

- **No Mermaid and no highlight.js.** Diagrams become inline SVG or HTML+CSS, drawn to the type you
  chose from `diagram-type-selection.md` — the artifact-design rendering won the comparison above.
  Code snippets render as plain monospace (`structured-blocks.md` "Artifact channel"). The local
  design system (`mermaid-patterns.md`, `semantic-tokens.md`) does not apply.
- **Save** to the skill's `.artifact.html` path — a separate file from the local report, so the two
  never overwrite each other. Re-runs on the same input reuse it.
- **Gate** with `--content-only`: it checks the facts that must survive whoever designed the page
  (missing images, raw markdown, anchor hrefs, image alt, placeholders). Density, palette, classDef,
  and font checks belong to artifact-design on this channel. No visual self-audit — there is no
  local render of what ships.
- **After publish**, record the sidecar (`<report>.artifact.json`, the skill gives the command). It
  holds the URL, so `report-manager refine` and `fact-check` can republish to the same link in a
  later session by passing that `url`.
- **Reply** with the URL plus one line: the report is published, its design comes from Claude's
  built-in Artifact renderer so it looks different from the local version, and `--local` gives the
  local design-system + Mermaid version. Use the reply's language.

## Local channel (HTML)

A self-contained file, `<!DOCTYPE html>` to `</html>`, with inline CSS and scripts. Diagrams are
Mermaid (`mermaid-patterns.md`), colours and fonts from `semantic-tokens.md`, budgets from
`diagram-density-rules.md`.

CSS the gate doesn't check:
- Dark mode through CSS custom properties under `prefers-color-scheme: dark`.
- A CJK font in the font stacks when the content may be Korean, Japanese, or Chinese.
- `min-width: 0` on flex/grid children, so wide content can't push the layout.
- `prefers-reduced-motion: reduce` respected.
- Mermaid zoom by sizing the SVG (`mermaid-patterns.md` `applyZoom()`), not `transform: scale()`
  (reserves no layout space and clips) and not the `zoom` property.

Then, in order:
1. **Full gate** — `artifact-gate.js <path>`. Fix and re-run, max 2 retries; still failing →
   remove the offending element and warn (`artifact-gate.md`).
2. **Visual self-audit** — render, read the PNG, fix; `visual-self-audit.md` has the loop, the
   2-pass cap, and the no-Chrome rule. The skill lists what to look for in its own report.
3. **`open`** the file.

## Capability detection — optimistic-try, then regenerate on failure

There is **no primitive that pre-checks "is this account artifact-capable?"** — you only learn by
trying to publish. So routing is optimistic:

1. Assume capable. Author the Artifact page and publish it.
2. **Publish succeeds** → done, report the URL.
3. **`Artifact` tool absent, or the publish call fails** (API-key / Bedrock / CI session,
   `disableArtifact`, or any tool error) → treat the session as **non-capable**. Don't guess the
   cause and don't ask. **Regenerate a full local report** (Local channel above, at the skill's
   local path), then say so in one line.

**Do not just `open` the Artifact page.** It has no Mermaid and no document skeleton, so a local
browser shows a broken, diagram-free page. One regeneration on a non-capable session is the accepted
cost; a capable session pays nothing.
