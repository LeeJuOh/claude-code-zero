---
name: fact-check
disable-model-invocation: true
description: >
  Verify factual accuracy of a document against the codebase and git history.
  Use when asked to verify, fact-check, or audit claims in a report or document.
  Accepts a file path or auto-detects the most recent HTML report.
argument-hint: "[file-path] [--format html|md] [--lang <code>]"
allowed-tools: Read, Glob, Grep, Edit, AskUserQuestion, Artifact, Bash(git diff *), Bash(git log *), Bash(git show *), Bash(git rev-parse *), Bash(git branch *), Bash(git shortlog *), Bash(wc -l *), Bash(ls -t *), Bash(node *)
---

# Fact Check

Verify the factual accuracy of a document against the actual codebase and git history. Extracts verifiable claims, checks each against source, corrects inaccuracies in place, and adds a verification summary.

This is not a re-review. It does not second-guess analysis, opinions, or design judgments. It does not change the document's structure or organization. It is a fact-checker — it verifies that the data presented matches reality, corrects what doesn't, and leaves everything else alone.

## Instructions

### Format Detection

`--format` controls which verification-summary block to inject:

| Flag | Values | Default | Meaning |
|------|--------|---------|---------|
| `--format` | `html` \| `md` | auto | Auto-detected from the input file extension (`.html` → html block, `.md` → markdown block). Override when the input is a generic text file or when you want a markdown summary inside an HTML document |

**Principle:** Fact-check edits the source document in place. The format flag only governs the **verification summary** appended at the end — HTML summary uses KPI cards + `<details>` blocks, markdown summary uses a table + bullet lists. Auto-detection is almost always correct; override only for edge cases.

### Target File Detection

Determine what to verify from `$1`:

1. **Explicit path**: Verify that specific file (`.html`, `.md`, or any text document)
   - Resolve relative paths against cwd
2. **No argument**: Auto-detect the most recent report of either format:
   ```
   ls -t ${CLAUDE_PLUGIN_DATA}/reports/*.html ${CLAUDE_PLUGIN_DATA}/reports/*.md 2>/dev/null | head -1
   ```
   If no reports found, inform the user and stop.

**Document type detection** — auto-detect from page content to adjust verification strategy:

| Document Type | Detection | Verification Focus |
|--------------|-----------|-------------------|
| diff-visual report | Contains "Diff Visual" in title/heading | Verify against the git ref the review was based on |
| doc-visual report | Contains "Doc Visual" in title/heading | Verify file references, names, architecture claims |
| plugin-visual report | Contains plugin analysis markers | Verify plugin structure, file paths, feature descriptions |
| Markdown document | `.md` extension | Verify file references, function/type names, behavior descriptions |
| Other | Fallback | Extract and verify whatever factual claims about code it contains |

**Artifact-channel detection** — after resolving the target, check whether a `<target-path>.artifact.json` sidecar sits next to it. Its presence means the file is a **published Artifact fragment** (an `.artifact.html` living on claude.ai), not a plain local report. This flips two things downstream: the Phase 4 gate runs `--content-only` (the fragment's design layer is owned by the built-in `artifact-design` skill, not this file's CSS), and Phase 4.5 republishes the corrected fragment to the **same** claude.ai URL. A local file with no sidecar takes neither branch — fact-check edits it in place exactly as it always has.

*Why this isn't a channel decision:* fact-check does not author reports, so S0's `capable × format → channel` table does not apply to it — there is nothing to route. It follows the target's **existing** channel: a local file stays local, a published fragment stays published at its link. See `${CLAUDE_PLUGIN_ROOT}/references/design-system/channel-decision.md` (fact-check is explicitly out of that table) and ADR 0009 §Scope.

### Language Detection

Determine the output language for the verification summary:

1. **Explicit argument**: `--lang <code>` (e.g., `--lang ko`, `--lang fr`, `--lang zh`) → use that language. Any language code is valid
2. **User message text**: Detect the language of the message (excluding path) and match it
   - Examples: Korean text → Korean, Japanese text → Japanese, "en español" → Spanish, "auf Deutsch" → German
3. **Document language**: Match the language of the document being verified
4. **Default**: English

### Feedback File Detection

After determining the target file, check for a companion `feedback.json`:

1. **Explicit argument**: `--feedback path/to/feedback.json`
2. **Auto-detect**: Check `~/Downloads/feedback.json` (macOS default download location) — verify `report_path` matches the target file. If multiple `feedback*.json` exist (e.g., `feedback (1).json`), use the most recent one.
3. **No feedback**: Proceed with standard full verification

When feedback.json is present, adjust verification strategy:

- **Sections with status "issue" + feedback text**: These are the user's primary concerns. Verify these sections FIRST and with extra scrutiny. The feedback text describes the specific problem — use it to guide what to check.
- **Sections with status "ok"**: User reviewed and approved. Still verify, but at lower priority — only check quantitative claims and names.
- **Sections with status "not-reviewed"**: Standard verification.

In the Phase 5 Report, include feedback-driven summary:

```
Feedback-guided verification:
  {N} sections flagged by user
  {N} issues confirmed and corrected
  {N} issues not reproduced (user concern was unfounded)
```

### Phase 1: Extract Claims

*Why: Systematic extraction prevents cherry-picking. Every verifiable claim must be identified before verification begins.*

Read the target file. Extract every verifiable factual claim into 5 categories:

1. **Quantitative**: Line counts, file counts, function counts, module counts, test counts, any numeric metrics
2. **Naming**: Function names, type names, module names, file paths referenced in the document
3. **Behavioral**: Descriptions of what code does, how things work, before/after comparisons
4. **Structural**: Architecture claims, dependency relationships, import chains, module boundaries
5. **Temporal**: Git history claims, commit attributions, timeline entries

**Skip** subjective analysis: opinions, design judgments, readability assessments, severity ratings, recommendations. These aren't verifiable facts.

### Phase 2: Verify Against Source

*Why: Each claim category requires a different verification method. Using the wrong method (e.g., Grep for quantitative claims) produces false confirmations.*

For each extracted claim, go to the actual source:

**Naming claims** — Glob + Read:
- Verify every file path exists
- Verify every function name, type name, and module name exists at the claimed location
- Check for typos, renames, or stale references

**Quantitative claims** — Bash git commands:
- Re-run `git diff --stat`, `git log`, `git diff --name-status` and compare output against the document's numbers
- Verify line counts with `wc -l`
- Verify file counts with Glob

**Behavioral claims** — Read source files:
- Read every file referenced and check function signatures, type definitions
- For diff-reviews: read both the ref version (`git show <ref>:file`) and working tree version to verify before/after claims
- Check that described behaviors match actual code logic

**Structural claims** — Grep + Read:
- Verify import/dependency relationships
- Check that architecture descriptions match actual module boundaries
- Verify that claimed connections between modules exist

**Temporal claims** — Git commands:
- Re-run `git log` commands to verify activity narrative
- Verify commit hashes, authors, dates, and messages
- Check that timeline entries match actual git history

Classify each claim:
- **Confirmed**: Claim matches the code/output exactly
- **Corrected**: Claim was inaccurate — note what was wrong and what the correct value is
- **Unverifiable**: Claim can't be checked (e.g., references a file that doesn't exist, or requires runtime testing)

### Phase 3: Correct In Place

*Why: Surgical corrections preserve the document's structure and style. Over-editing risks breaking HTML layout or changing the author's voice.*

Use the `Edit` tool for surgical corrections:

**Do correct**:
- Incorrect numbers (line counts, file counts, commit counts)
- Wrong function names, type names, file paths
- Inaccurate behavior descriptions
- Swapped before/after comparisons
- Wrong git hashes, dates, or attributions
- Factual errors in Mermaid diagram node labels or edge descriptions

**Do NOT change**:
- HTML layout, CSS, or animations
- Document structure or section organization
- Mermaid diagram styling or layout (only fix factual labels/edges)
- Subjective analysis, opinions, or design judgments
- Writing style or tone

If a section contains a factual error, fix only the factual part. If a section is fundamentally wrong (not just a detail error), rewrite that section's content while preserving the surrounding HTML/markdown structure.

### Phase 4: Add Verification Summary

*Why: Transparency — readers can see what was checked, what changed, and what couldn't be verified.*

Insert a verification summary into the document. Choose block type based on resolved `--format` (explicit flag wins, otherwise auto-detect from file extension: `.html` → HTML block, `.md` → Markdown block, other text → Markdown block).

**For HTML files** — insert a verification section matching the page's existing design:

```html
<section id="verification-summary" class="ve-card" style="--i: {next-index}">
  <h2>Verification Summary</h2>
  <div class="kpi-grid">
    <div class="kpi-card kpi-card--info">
      <span class="kpi-value">{total}</span>
      <span class="kpi-label">Claims Checked</span>
    </div>
    <div class="kpi-card kpi-card--success">
      <span class="kpi-value">{confirmed}</span>
      <span class="kpi-label">Confirmed</span>
    </div>
    <div class="kpi-card kpi-card--danger">
      <span class="kpi-value">{corrected}</span>
      <span class="kpi-label">Corrected</span>
    </div>
    <div class="kpi-card kpi-card--warning">
      <span class="kpi-value">{unverifiable}</span>
      <span class="kpi-label">Unverifiable</span>
    </div>
  </div>
  <details>
    <summary>Corrections Made</summary>
    <ul>
      <li>{description of each correction with file:line reference}</li>
    </ul>
  </details>
  <details>
    <summary>Unverifiable Claims</summary>
    <ul>
      <li>{claim that could not be verified and why}</li>
    </ul>
  </details>
</section>
```

Place the verification section as the last content section, before `</main>` or the closing layout wrapper.

**Re-check the gate (HTML output only).** After injecting the HTML verification section, re-run the artifact-gate on the final output to confirm the inserted summary didn't break the artifact:

```
node ${CLAUDE_PLUGIN_ROOT}/scripts/artifact-gate.js <report-path> [--content-only]
```

Pass `--content-only` when the target is a **published Artifact fragment** (the sidecar found during Target File Detection, or a filename ending in `.artifact.html`). The design-layer checks (density, palette, font fallback, Mermaid classDef) belong to the built-in `artifact-design` skill that owns the fragment, not to this file — running the full gate would false-flag it. A plain local HTML report gets the **full** gate (no flag), same as before.

If the gate flags violations, fix them inline (max 2 retries), consistent with how the other skills handle gate output. **Only do this for HTML output** — the artifact-gate is HTML-only. If the summary was appended as Markdown (`.md` file or markdown block), skip the re-check entirely; there is nothing for the gate to validate.

**For Markdown files** — append at the end:

```markdown
## Verification Summary

| Metric | Count |
|--------|-------|
| Claims Checked | {total} |
| Confirmed | {confirmed} |
| Corrected | {corrected} |
| Unverifiable | {unverifiable} |

### Corrections Made
- {description of each correction}

### Unverifiable Claims
- {claim and reason}
```

### Phase 4.5: Republish (published Artifact fragments only)

*Why: a correction that only touches the local `.artifact.html` file leaves the live claude.ai page stale — readers still see the unverified numbers. Re-publishing to the same URL keeps the shared link honest without minting a new one.*

Do this **only** when Target File Detection found a sidecar (or the filename ends in `.artifact.html`). Local files and markdown skip this entirely — there is nothing published to update, so fact-check stops after Phase 4. Mirror the `report-manager` republish contract (its refine step 8):

1. Read the sidecar `<target-path>.artifact.json` for `url`, `title`, and `favicon`.
2. Call the `Artifact` tool with `file_path=<target-path>`, `url=<sidecar url>`, `favicon=<sidecar favicon>`, and a one-sentence `description`. Passing `url` is what stacks the correction onto the **same** claude.ai link instead of creating a new one — a fresh session has no other handle on an existing artifact. You do **not** load `artifact-design` here: the fragment's design is already baked in, and content-only republish needs neither the load nor the grant (see `docs/reference/gotchas.md` carve-out).
3. Rewrite the sidecar so `published_at` reflects this fact-check:
   ```bash
   node ${CLAUDE_PLUGIN_ROOT}/scripts/write-artifact-sidecar.js --report <target-path> --url <url> --title <title> --favicon <favicon>
   ```
4. Report the claude.ai URL in the Phase 5 summary instead of the local `file://` path.

**Edge cases** (same as report-manager step 8):
- **Filename ends in `.artifact.html` but no sidecar**: an earlier publish fell back to local-only. Publish fresh (omit `url`) and write the sidecar for the first time.
- **Sidecar present but the republish call errors** (the link died upstream): publish fresh (omit `url`), overwrite the old sidecar, and tell the user in one line: "New shared link published — any previously shared link now points to a stale version." Don't guess why the old link died.

### Gotchas

- **Over-correcting opinions as facts**: "This architecture is well-designed" is a subjective judgment, not a factual claim. Only correct things that can be verified against source — names, numbers, behaviors, paths. When in doubt, skip it.
- **Modifying HTML structure**: The Edit tool is for surgical text corrections only. Do not reorganize sections, move content between sections, or change HTML wrapper elements. If a section is fundamentally wrong, rewrite the text content inside the existing `<section>` tags.
- **Stale git refs in diff-visual reports**: A diff-visual report captures a snapshot. If new commits landed since the report was generated, the fact-checker sees different data than the report author did. Verify against the same ref the report was based on (look for commit hashes in the report), not HEAD.
- **Feedback.json from wrong report**: The auto-detect checks `~/Downloads/feedback.json` which may be from a completely different report. Always verify the `report_path` field matches the target file before using feedback data.
- **Counting claims too aggressively**: Not every number in a report is a "claim" worth verifying. Focus on claims that matter — metrics in KPI cards, file counts in summaries, function names in architecture descriptions. Ignore incidental numbers in prose.
- **Mermaid diagram labels**: Mermaid node labels that contain function or file names are factual claims. If a diagram says `validateAuth()` but the actual function is `verifyAuth()`, that's a correction. But don't change diagram layout or styling.

### Phase 5: Report

Output a summary to the user:

```
Fact-check complete: {file path — or the claude.ai URL when a published fragment was republished}

  {total} claims checked
  {confirmed} confirmed
  {corrected} corrected
  {unverifiable} unverifiable

{If corrections were made, list the top 3-5 most significant corrections}
{If nothing needed correction, note that verification confirms accuracy}
```
