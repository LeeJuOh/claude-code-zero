# Changelog

## 4.0.0 — 2026-04-19

### Breaking changes

- **Removed**: `plan-visual` skill. Plan review/visualization moves to `doc-visual`.
- **Removed**: `project-recap-visual` skill. Low usage; project recap moves to `doc-visual`.
- **Changed**: `diff-visual` section structure — 10 sections → 7 sections. Removed: Code Review, Decisions, Risks, Test Coverage, Timeline. Added: Hot Spots (quadrant), Dependency Shift (side-by-side).

### Added

- **New skill**: `doc-visual` — visualize any markdown document as a diagram-enhanced report. Automatically selects from 13 Mermaid diagram types based on section intent.
- **Layer 0 design system** (`references/design-system/`):
  - `semantic-tokens.md` — single source for color and font tokens
  - `diagram-type-selection.md` — 13-type selection guide
  - `diagram-density-rules.md` — complexity budget per type
  - `taste-gate.md` — pre-output quality checklist
- **New agents**: `section-analyzer`, `diagram-generator`
- **New scripts**: `parse-markdown.js`, `taste-gate.js` (TDD, 18 tests total)

### Changed

- `aesthetic-rotation.js` — last-3 avoidance rotation across 6 predefined token sets
- `mermaid-patterns.md` — 13-type syntax reference including venn/pyramid fallbacks
- `plugin-visual`, `context-health-visual` — Layer 0 forced load

### Removed

- `references/design-system/color-palette.md` (absorbed into semantic-tokens.md)
- `references/design-system/font-system.md` (absorbed into semantic-tokens.md)
- `references/design-system/diagram-argumentation.md` (split into density-rules + taste-gate)
- `references/design-system/anti-slop-rules.md` (integrated into taste-gate)

### Tested against

- Claude Code v2.1.112
