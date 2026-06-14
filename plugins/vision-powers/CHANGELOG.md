# Changelog

## 4.3.0 — 2026-06-14

### Added

- **Artifact gate now enforces five rules it previously only documented.** CONTEXT.md and ADR 0002 name the gate as the one form of leverage the model "can't be merely *asked* to guarantee," yet `artifact-gate.js` enforced only 3 checks while `semantic-tokens.md`/`artifact-gate.md` declared more as FORBIDDEN and left them to authoring judgment. Five checks close that gap (all fail-level, run through the existing fix-retry loop):
  - **Mermaid classDef colour traps** — `rgb()`/`rgba()` (Mermaid parser breakage) or an explicit `color:` (overrides CSS dark-mode tokens) inside a classDef.
  - **Forbidden palette** — the violet/fuchsia "AI purple" hexes (`#8b5cf6`, `#7c3aed`, `#a78bfa`, `#d946ef`) banned by `semantic-tokens.md`. Exact-hex match (also catches 8-digit alpha variants); `hsl()`/`oklch()` purple detection deferred.
  - **Anchor href integrity** — `<a>` with missing/empty/`#` href; pure `id`/`name` jump targets are exempt.
  - **Image alt** — `<img>` missing an `alt` attribute (`alt=""` for decorative images is allowed).
  - **Placeholder leak** — unfilled `{{ … }}`, lorem ipsum, or bracketed stubs (`[YOUR NAME]`, `[TODO]`); bare `TODO`/`FIXME` and code regions are deliberately exempt so reports can quote source faithfully.

### Changed

- **Dropped the `semantic-tokens.md` "JetBrains Mono is forbidden" rule** — it was not grounded in the references it claimed to mine. Both Kami (bundles JetBrains Mono as its own `--mono`) and taste-skill (recommends `Satoshi + JetBrains Mono`) treat it as a legitimate mono. The genuine, reference-backed principle — *mono is for technical spans, not body text* — is retained; only the unfounded singling-out of JetBrains Mono by name is removed, and the planned gate check that would have enforced it was cut.

### Docs

- `references/design-system/artifact-gate.md` and `skills/doc-visual/SKILL.md` — the "checks three things" automation lists now enumerate all eight checks, and note that accent ≤ 2 and lang consistency remain authoring-judgment items.

## 4.1.1 — 2026-04-19

### Fixed

- **`scanSkillSecurity` self-exclusion was silently broken.** The frontmatter parser sliced the first 500 chars of each SKILL.md, but real frontmatters can exceed that (`context-health-visual`'s frontmatter is ~875 chars), so the regex never matched and `name:` was always read as `null`. Self-exclusion of `context-health-visual` therefore never fired and the skill flagged its own `rm -rf /tmp/env-health-<pid>` cleanup line. Parser now scans up to the closing `---` (cap 8 KB).
- **`computeConfidence` ignored line content for temp-path heuristic.** The heuristic checked only the *scanned file's* path against `/tmp/`, so legitimate `Bash(rm -rf /tmp/plugin-visual-…)` documentation lines stayed `suspicious`. Added a line-content check covering `/tmp/`, `/var/folders/`, `/var/tmp/`.
- **Pattern-catalogue meta-doc lines triggered prompt-injection alerts.** Any SKILL.md that documents the patterns this scanner looks for (e.g. listing `"ignore previous instructions", "you are now"` in a docs catalogue) hit `prompt_injection` at `suspicious`. Added a `likely_safe` heuristic for lines containing ≥2 quoted phrases, alongside the existing `grep`/`ripgrep`/`re.compile` self-reference check.

### Docs

- `SKILL.md` frontmatter description updated from "5 graded scores plus 5 observational areas" to "6 graded scores plus 5 observational areas" and now mentions skill security and hook schema validation in trigger phrases.
- `references/section-structure.md` — typo `confident` → `safe` in the collapsed-confidence rendering rule.
- `references/health-criteria.md` — confidence-level table now lists every heuristic the scanner applies (line-temp-path, file-temp-path, loopback-host, frontmatter-line, scanner self-reference, quoted-pattern catalogue).

## 4.1.0 — 2026-04-19

### Added

- **Skill security scan** (`context-health-visual` §9): static analysis of all enabled SKILL.md files for 6 pattern categories — prompt_injection, data_exfil, destructive, hardcoded_credential, obfuscation, safety_override. Each finding carries a `confidence` field (`suspicious` / `uncertain` / `likely_safe` / `safe`); grading uses only `uncertain` / `suspicious` findings. Low-risk findings collapsed by default in the report. Self-excludes `context-health-visual` itself by frontmatter `name:`.
- **Hook schema validation** (`context-health-visual` §6): `env-health-scan.js` now checks hook entries for missing `matcher` on `PreToolUse`/`PostToolUse`, missing `command` on command-type hooks, and unknown `type` values. Reported as observational info notes beside hook counts (§6 stays ungraded per threshold rules).

### Removed

- `toolbox/health` skill retired and partially absorbed here. The 6-layer qualitative audit, tier calibration, and conversation-based behavior audit are NOT included (see plan for rationale). Users who invoked `/health` should use `context-health-visual` going forward.

### Tested against

- Claude Code v2.1.112

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
