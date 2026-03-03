---
name: fact-check
description: >
  Verify factual accuracy of a document against the actual codebase and git
  history. Extracts verifiable claims, checks each against source, corrects
  inaccuracies in place, and adds a verification summary.
  Use when asked to verify, fact-check, validate, or audit claims in a
  report, plan, or document. Accepts a file path or auto-detects the most
  recent HTML report. Not for re-reviewing analysis or changing document structure.
argument-hint: "[file-path] [--lang ko|en|ja]"
allowed-tools: Read, Glob, Grep, Edit, AskUserQuestion, Bash(git diff *), Bash(git log *), Bash(git show *), Bash(git rev-parse *), Bash(git branch *), Bash(git shortlog *), Bash(wc -l *), Bash(ls -t *)
---

# Fact Check

Verify the factual accuracy of a document against the actual codebase and git history. Extracts verifiable claims, checks each against source, corrects inaccuracies in place, and adds a verification summary.

This is not a re-review. It does not second-guess analysis, opinions, or design judgments. It does not change the document's structure or organization. It is a fact-checker — it verifies that the data presented matches reality, corrects what doesn't, and leaves everything else alone.

## Instructions

### Target File Detection

Determine what to verify from `$1`:

1. **Explicit path**: Verify that specific file (`.html`, `.md`, or any text document)
   - Resolve relative paths against cwd
2. **No argument**: Auto-detect the most recent HTML report:
   ```
   ls -t ~/.claude-code-zero/vision-powers/reports/*.html | head -1
   ```
   If no reports found, inform the user and stop.

**Document type detection** — auto-detect from page content to adjust verification strategy:

| Document Type | Detection | Verification Focus |
|--------------|-----------|-------------------|
| diff-visual report | Contains "Diff Visual" in title/heading | Verify against the git ref the review was based on |
| plan-visual report | Contains "Plan Visual" in title/heading | Verify file references, names, architecture claims |
| project-recap report | Contains "Project Recap" in title/heading | Re-run git commands, verify activity narrative |
| agent-extension-visual report | Contains plugin analysis markers | Verify plugin structure, file paths, feature descriptions |
| Markdown document | `.md` extension | Verify file references, function/type names, behavior descriptions |
| Other | Fallback | Extract and verify whatever factual claims about code it contains |

### Language Detection

Determine the output language for the verification summary:

1. **Explicit argument**: `--lang ko`, `--lang en`, `--lang ja` → use that language
2. **User message text**: If the message (excluding path) contains non-English text, use that language
   - Korean: 한글 텍스트, "한국어", "한글로", "검증해줘"
   - Japanese: 日本語テキスト, "日本語で"
   - English: English text, "in English"
3. **Document language**: Match the language of the document being verified
4. **Default**: English

### Phase 1: Extract Claims

Read the target file. Extract every verifiable factual claim into 5 categories:

1. **Quantitative**: Line counts, file counts, function counts, module counts, test counts, any numeric metrics
2. **Naming**: Function names, type names, module names, file paths referenced in the document
3. **Behavioral**: Descriptions of what code does, how things work, before/after comparisons
4. **Structural**: Architecture claims, dependency relationships, import chains, module boundaries
5. **Temporal**: Git history claims, commit attributions, timeline entries

**Skip** subjective analysis: opinions, design judgments, readability assessments, severity ratings, recommendations. These aren't verifiable facts.

### Phase 2: Verify Against Source

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

Insert a verification summary into the document.

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

### Phase 5: Report

Output a summary to the user:

```
Fact-check complete: {file path}

  {total} claims checked
  {confirmed} confirmed
  {corrected} corrected
  {unverifiable} unverifiable

{If corrections were made, list the top 3-5 most significant corrections}
{If nothing needed correction, note that verification confirms accuracy}
```
