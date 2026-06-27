# Changelog

## 4.5.1 — 2026-06-27

### Fixed

- **Security — `extract-hunks.js` no longer lets a crafted diff scope inject git options.** The scope string is split on whitespace and spread *before* git's `--`, so a token like `--output=<path>` reached git as an option, not a pathspec — enough to overwrite an arbitrary file (`git diff --output`) or run an external diff. Any scope token starting with `-` is now rejected with a safe-empty result. Legitimate scopes (`HEAD`, branches, shas, `a..b` ranges) never start with `-`, so they are unaffected.
- **The forbidden-color gate stops false-flagging verbatim code when attributes precede the class.** `artifact-gate.js` only exempted `<code class="language-*">` when the class came immediately after `<code`; a highlighter emitting other attributes first (`<code data-line="1" class="language-js">`) slipped past the exemption and re-triggered the violet/fuchsia violation on quoted source. The match now allows leading attributes.
- **Deleted files keep their real language in the before-pane.** `extract-hunks.js` derived the highlight language from `entry.newPath`, which is `/dev/null` for a deletion (truthy), mislabeling the removed code as `plaintext`. It now uses the user-supplied path, correct for modify, rename-new, and delete alike.

## 4.5.0 — 2026-06-27

### Added

- **diff-visual now shows the actual changed code** — a new **Key Changes** section renders the load-bearing files as side-by-side **split-diff** (before | after), the single biggest hole in the old report (it drew file-maps and diagrams but never a line of code). Surfaced by content auto-detection — **no new user flag**.
  - **`scripts/extract-hunks.js`** (new) — build-time grounding per ADR 0005: pulls the exact hunk from git, HTML-escapes it, and emits paste-ready `<pre><code>` panes with a `language-*` class set from the file extension. The model pastes the code verbatim and writes only the summary/annotations — it never retypes code (no drift, no mis-escape). Handles binary / missing / empty-diff safely; supports `--stdin` for PR diffs (`gh pr diff N | …`) and `--json` for markdown mode.
  - **`references/design-system/structured-blocks.md`** (new) — shared pattern reference: split-diff layout/CSS, highlight.js runtime CDN (github/github-dark, `prefers-color-scheme`, explicit language class), budgets (3–8 files, ≤150 lines), the build-time grounding law, and the network-0 monospace degrade. Written generically for sibling skills to adopt later.
- **File Map change-flags** — each file in the File Map now carries an added / removed / modified / renamed flag, derived mechanically from `git diff --name-status`, coloured from the semantic-tokens palette.

### Fixed

- **`diff-visual <commit-sha>` now shows that commit's own change.** `extract-hunks.js` resolved a lone sha with `git diff <sha>` (commit-vs-working-tree), which returns a cumulative/unrelated diff once the file moves on; it now uses `git show <sha>` and treats it as authoritative. Ranges (`a..b`) and refs (`HEAD`, branches) are unaffected.
- **The forbidden violet/fuchsia gate no longer false-flags quoted source.** `artifact-gate.js`'s palette check scanned the whole document, so a split-diff that legitimately quotes a banned hex (e.g. the very commit that bans it) failed the gate. Verbatim `<code class="language-*">` panels are now exempt; the report's own `<style>`, inline `style=`, and Mermaid colours stay under the ban.

### Notes

- **Invariants kept:** zero-runtime self-contained `.html` (ADR 0002) — no renderer/server added; highlighting is a runtime CDN exactly like Mermaid, with the same first-view-needs-network caveat and a clean offline fallback. Layout/CSS stay delegated to the model; the gate's job for code blocks shrinks because verbatim + escaping are guaranteed at the source.

## 4.4.2 — 2026-06-21

### Changed

- Design-system references (`anti-slop-tells.md`, `visual-self-audit.md`) are now self-contained: the design philosophy they relied on is stated inline instead of pointing at a separate glossary file, so each rule reads fully on its own. No behavior change.

## 4.4.1 — 2026-06-20

### Documentation

- README now advertises the **visual self-audit** behavior (render → PNG → read back → check density/hierarchy/Mermaid/overflow → fix & re-render, max 2; graceful skip without `claude-in-chrome`). The behavior shipped in 4.4.0 wiring but was previously undocumented for users. No code change.

## 4.4.0 — 2026-06-20

### Added

- **Two new gate checks, both reference-grounded and confined to generated chrome** (so neither fights the source-passthrough or taste-delegation principles). Test suite grows 32 → 42:
  - **Gradient-clipped text** (`gradient-text`) — fails on `background-clip: text` in any real `<style>` block or inline `style=` attribute. Decorative gradient/clipped text is the landing-page flourish CONTEXT.md now lists as slop and taste-skill restricts; it hurts readability and never carries source content. CSS quoted inside `<pre>`/`<code>` is exempt, so reports can still document the trick.
  - **Font fallback chain** (`font-fallback`) — fails on any `font-family` that names only web fonts with no generic family (`font-family: Geist` instead of `Geist, system-ui, sans-serif`). This mechanizes the 4.3.1 rule: the plugin bundles no web fonts, so a bare name silently drops to a browser default offline. `@font-face` (which declares a font's own name), bare CSS keywords, and `var()`-only chains are exempt.

### Notes

- **Deliberately not built:** an em-dash ban (would fight vision-powers' verbatim source-passthrough — em-dashes in the source must survive) and an off-palette/token-allowlist check (would fight the delegation of colour/taste to the model and the token-set rotation). An accent-count gate was also declined: how a focal node is marked in Mermaid (themeVariables vs `classDef` vs inline) is too varied to detect mechanically without false fires, so the focal ≤ 2 rule stays authoring guidance, as documented in 4.3.1.

## 4.3.1 — 2026-06-20

A documentation-truth audit of the whole plugin, in the same spirit as the 4.3.0 "JetBrains Mono" correction: every design-system rule and CONTEXT claim was checked against the actual code and against the `Kami` / `taste-skill` reference projects. Findings were corrections to the docs only — no behaviour change.

### Fixed

- **Stale references to scripts and agents removed in the 4.2.0 direct-authoring refactor.** Several design docs still described a pipeline that no longer exists, which would mislead the authoring model into assuming work is done for it:
  - `semantic-tokens.md` claimed `aesthetic-rotation.js` picks the token set — that script is gone; the model now picks the set itself.
  - `diagram-type-selection.md` named `section-analyzer` / `diagram-generator` agents as required readers — those agents no longer exist; the authoring model reads the file directly.
  - `mermaid-patterns.md` attributed the venn SVG to `assemble-report.js` — the SVG is written inline by the model; only the attribution was wrong.
  - `CONTEXT.md` called the design system `css-patterns` — the actual directory is `references/design-system/`.
- **Phantom PNG-export and touch-gesture features cut from `mermaid-patterns.md`.** Both sections claimed a `shared.js` "automatically injects" the behaviour with "no markup needed," but `shared.js` does not exist anywhere in the plugin and no inline implementation was provided — so every report silently shipped without these features. The misleading sections are removed (the real, code-backed zoom/pan/keyboard controls are unchanged).
- **Gate-enforcement overclaims corrected.** `diagram-density-rules.md` said `artifact-gate.js` "enforces the limits in this file"; the gate actually checks only the node/arrow/lifeline/lane/entity/nesting/depth budgets, so the focal-accent, quadrant, venn, pyramid, and per-document caps are now labelled authoring guidance. `CONTEXT.md`'s gate glossary listed "lang consistency" and "accent discipline" as gate checks — neither is implemented, so the glossary now lists the checks that actually run and notes the two as guidance-only.

### Changed

- **Font fallback chains + honest self-containment caveat.** The plugin bundles no web fonts and renders diagrams via the Mermaid CDN, so the "shareable as a single file" promise was overstated. `semantic-tokens.md` and `doc-visual` now require a full system fallback chain on every `font-family` (so output degrades gracefully offline, the way Kami's per-language `--serif` chains do), and `CONTEXT.md` states the two real limits (Mermaid CDN at first view, fonts not bundled) plain.

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
