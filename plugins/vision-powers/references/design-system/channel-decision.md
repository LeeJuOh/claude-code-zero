# Channel Decision — Where a Report Lands (SSOT)

The single place that decides **which channel a visual report ships on** — a published claude.ai
Artifact, or a local design-system file — plus what each flag and config key means. The four
channel skills (`doc-visual`, `diff-visual`, `context-health-visual`, `plugin-visual`) cite this
file instead of each re-deriving the rule, so the policy can't drift skill-to-skill. `fact-check`
does not author reports and does not use this table — see its own SKILL.md and ADR 0009 §Scope.

**Regression authority:** if this file and `docs/adr/0009-artifact-first-default-diagram-selection-channel-agnostic.md`
ever disagree, ADR 0009 is the source of truth. This file is the implementation-facing restatement.

## Why artifact-first

A 2026-07-08 dogfooding checkpoint rendered the same source through both channels and compared them:
content was parity, but the built-in **artifact-design** rendering won on design, readability, and
visibility. So the durable asset is the **diagram-type selection intelligence**
(`diagram-type-selection.md`'s 13-type menu + case→diagram mapping) — that is channel-agnostic.
**Mermaid is one rendering technique for that brain, not the diagram layer**; it is retained only as
the local/md fallback rendering. This flips ADR 0007's posture where the local file was default and
`--artifact` was opt-in.

## Decision table

`(Format × artifact-capable?) → Channel + fallback rendering`:

| Format | capable | Channel | Rendering |
|---|---|---|---|
| `html` | yes | **Artifact** (default publish) | built-in artifact-design (inline SVG / HTML+CSS, no Mermaid) |
| `html` | no | Local file | design-system + Mermaid |
| `md` | any | Local (chat body + saved copy) | design-system + Mermaid fences |

Read this as: **HTML defaults to the Artifact channel.** Local is the fallback for a non-capable
session (or an explicit force-local), and `md` never changes — claude.ai's markdown renderer can't
draw Mermaid anyway (ADR 0007), so md stays local.

## Precedence — explicit request > config > default

Resolve the channel in this order; the first that speaks wins:

1. **This turn's explicit signal** — a literal flag (`--local`, `--artifact`) or its natural-language
   equivalent, in whatever language the user writes. Always overrides everything below.
2. **Stored config** — `node ${CLAUDE_PLUGIN_ROOT}/scripts/config.js get` (prints JSON, or `{}`).
   Fills in only when the request is silent on channel. See "config keys" below.
3. **Default** — artifact-first for capable HTML, per the table.

## Flags

### `--local` — force-local override (the exception flag)

Forces the **local design-system + Mermaid** file on a capable account that would otherwise publish.
Reach for it when the report needs an analytical chart type the Artifact channel degrades to a table
(quadrant/scatter), or Mermaid's local-only infrastructure (zoom/pan, PNG export, offline render).
Natural-language equivalents count too — "keep it local", "just the local file", "don't publish",
in any language. `--local` is the confirmed name; `--no-artifact` was rejected as longer.

### `--artifact` — retained as a no-op alias (not removed)

Once artifact is the default, `--artifact` is redundant on capable HTML — but it is **kept**, not
deleted, so existing muscle memory and natural-language triggers ("as an artifact", "publish as a
link", "share as a URL") don't break. Semantics:

- **capable HTML**: no-op — it's already the default.
- **non-capable session**: still *attempts* to publish (then auto-degrades per below).
- **`--artifact` and `--local` both given**: **`--local` wins** (the exception flag beats the
  redundant one).

## Config keys

- **`artifact` absent** → interpret as **artifact-first** (the default; the table applies unchanged).
  This is the flipped interpretation — pre-0009, an absent key meant off.
- **`artifact: false`** → **persistent force-local**: the config twin of `--local`, for a user who
  wants local as their standing default. All four channel skills must respect it exactly as they'd
  respect a typed `--local`. A this-turn `--artifact` (explicit signal, precedence rule 1) still
  overrides it for that one run.
- **`artifact: true`** → explicitly artifact-first (same as absent; harmless to set).

`config.js` itself is a pure key-value store with no default logic — `readConfig()` returns `{}` when
the key is absent. The "absent = artifact-first" interpretation lives **here and in each skill's
Format table**, not in `config.js` code. `config.js`'s header comment documents the interpretation;
its code is unchanged.

## Capability detection — optimistic-try, then regenerate on failure

There is **no primitive that pre-checks "is this account artifact-capable?"** — you only learn by
trying to publish. So routing is optimistic:

1. Assume capable. Author the artifact **fragment** and call the `Artifact` tool to publish.
2. **Publish succeeds** → done, report the URL.
3. **`Artifact` tool absent, or the publish call fails** (API-key / Bedrock / CI session,
   `disableArtifact`, or any tool error) → treat the session as **non-capable** and **regenerate a
   full design-system + Mermaid local report**, then `open` it.

The regenerate step is load-bearing: **do not just `open` the fragment.** The fragment is a
Mermaid-less, skeleton-less page authored for the Artifact viewer's CSP; opening it locally would
serve a broken, diagram-free page and violate ADR 0009 §3's promise that a non-capable session gets
design-system + Mermaid. The cost of the flip is exactly **one regeneration on a non-capable
session** — accepted, because a capable session (the common case) pays nothing.

Each skill's SKILL.md wires the disclosure notice and the per-skill regenerate path; this file is the
contract they implement against.
