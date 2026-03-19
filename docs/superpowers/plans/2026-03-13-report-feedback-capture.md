# Report Feedback Capture Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add GitHub PR review-style per-section feedback capture to all vision-powers HTML report templates, with JSON export for fact-check integration.

**Architecture:** Each template gets inline feedback CSS + JS (no server, no external deps). Per-section feedback buttons appear on hover. Users write comments, mark sections as OK/issue, then export a single `feedback.json` via browser download. The fact-check skill reads this file to focus verification on flagged sections.

**Tech Stack:** Vanilla JS, CSS custom properties (existing design system), localStorage for auto-save, Blob API for JSON download.

**Maintenance note:** Self-contained HTML requires the same ~150 lines CSS + ~140 lines JS to be duplicated across all 4 templates. When modifying the feedback system, all 4 templates must be updated simultaneously.

---

## Chunk 1: Design System & Template Foundation

### Task 1: Add feedback component CSS to design system docs

**Files:**
- Modify: `plugins/vision-powers/references/design-system/css-patterns.md`

This is documentation only — the actual CSS lives inline in each template. But css-patterns.md is the single source of truth that the visual-report-writer and future contributors reference.

- [ ] **Step 1: Append feedback component section to css-patterns.md**

Add after the "SVG Connectors" section:

```css
/* ===== FEEDBACK SYSTEM ===== */

/* Per-section feedback trigger — appears on section hover */
.ve-feedback-trigger {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 28px;
  height: 28px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--surface);
  color: var(--text-dim);
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.15s, background 0.15s, color 0.15s;
  z-index: 5;
}
section:hover .ve-feedback-trigger,
.ve-feedback-trigger.has-feedback {
  opacity: 1;
}
.ve-feedback-trigger:hover {
  background: var(--accent-dim);
  color: var(--accent);
}
.ve-feedback-trigger.has-feedback {
  color: var(--warning);
  border-color: var(--warning);
}
.ve-feedback-trigger.marked-ok {
  color: var(--success);
  border-color: var(--success);
}

/* Inline feedback form — expands below section heading */
.ve-feedback-form {
  display: none;
  margin: 0.75rem 0 1rem;
  padding: 0.75rem;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: color-mix(in srgb, var(--surface) 50%, var(--bg) 50%);
}
.ve-feedback-form.is-open { display: block; }
.ve-feedback-form textarea {
  width: 100%;
  min-height: 60px;
  padding: 0.5rem;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--surface);
  color: var(--text);
  font-family: var(--font-body);
  font-size: 0.85rem;
  resize: vertical;
  outline: none;
  box-sizing: border-box;
}
.ve-feedback-form textarea:focus {
  border-color: var(--accent);
}
.ve-feedback-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.5rem;
  align-items: center;
}
.ve-feedback-btn {
  padding: 0.3rem 0.75rem;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--surface);
  color: var(--text-dim);
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.15s;
}
.ve-feedback-btn:hover { background: var(--accent-dim); color: var(--accent); }
.ve-feedback-btn--ok { color: var(--success); border-color: var(--success); }
.ve-feedback-btn--ok:hover { background: color-mix(in srgb, var(--success) 10%, var(--surface)); }

/* Floating export bar — fixed bottom */
.ve-feedback-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 500;
  display: none;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 0.75rem 1.5rem;
  background: var(--surface-elevated);
  border-top: 1px solid var(--border);
  box-shadow: 0 -2px 12px rgba(0,0,0,0.1);
  font-size: 0.85rem;
}
.ve-feedback-bar.is-visible { display: flex; }
.ve-feedback-bar__summary {
  color: var(--text-dim);
  font-family: var(--font-mono);
  font-size: 0.8rem;
}
.ve-feedback-bar__export {
  padding: 0.4rem 1rem;
  border: none;
  border-radius: 6px;
  background: var(--accent);
  color: #fff;
  font-weight: 600;
  font-size: 0.85rem;
  cursor: pointer;
  transition: opacity 0.15s;
}
.ve-feedback-bar__export:hover { opacity: 0.85; }

/* Print: hide feedback UI */
@media print {
  .ve-feedback-trigger,
  .ve-feedback-form,
  .ve-feedback-bar { display: none !important; }
}
```

- [ ] **Step 2: Commit**

```bash
git add plugins/vision-powers/references/design-system/css-patterns.md
git commit -m "feat(vision-powers): add feedback component CSS to design system"
```

---

### Task 2: Update diff-visual.html template (reference implementation)

**Files:**
- Modify: `plugins/vision-powers/templates/diff-visual.html`

This is the reference implementation. Once validated, the same CSS + JS block gets copied to the other 3 templates.

- [ ] **Step 1: Add feedback CSS to the template's `<style>` block**

Insert the feedback CSS (from Task 1) before the closing `</style>` tag, after the `/* ===== REPORT: Section 9 — Decision Log ===== */` section.

- [ ] **Step 2: Add feedback bar HTML before closing `</body>`**

Insert after `</div>` (closing `.wrap`) and before `<!-- CHART_DATA -->`:

```html
<!-- Feedback bar -->
<div class="ve-feedback-bar" id="feedbackBar">
  <span class="ve-feedback-bar__summary" id="feedbackSummary"></span>
  <button class="ve-feedback-bar__export" onclick="window._veFeedback.export()">Export Feedback</button>
</div>
```

- [ ] **Step 3: Add feedback JS as the last `<script>` block before `</body>`**

Insert a new `<script>` block after all existing scripts (Mermaid module, Chart.js CDN, Zoom/Scroll Spy block) and before `</body>`. The feedback JS must run after all DOM content is rendered. All DOM construction uses createElement/textContent (no innerHTML) to avoid XSS surface:

```javascript
/* ===== Section Feedback System ===== */
(function() {
  /* Key includes full path to avoid collisions when same filename exists in different directories */
  var STORAGE_KEY = 'vp-feedback-' + location.pathname;
  var feedback = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  var sections = document.querySelectorAll('section[id]');
  var bar = document.getElementById('feedbackBar');
  var summaryEl = document.getElementById('feedbackSummary');

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text) e.textContent = text;
    return e;
  }

  sections.forEach(function(sec) {
    sec.style.position = 'relative';

    /* Trigger button */
    var trigger = el('button', 've-feedback-trigger', '\u270E');
    trigger.title = 'Add feedback';
    sec.appendChild(trigger);

    /* Feedback form */
    var form = el('div', 've-feedback-form');
    var textarea = el('textarea');
    textarea.placeholder = 'Write feedback for this section...';
    form.appendChild(textarea);

    var actions = el('div', 've-feedback-actions');
    var btnOk = el('button', 've-feedback-btn ve-feedback-btn--ok', 'OK');
    btnOk.dataset.action = 'ok';
    var btnSave = el('button', 've-feedback-btn', 'Save');
    btnSave.dataset.action = 'save';
    var btnClear = el('button', 've-feedback-btn', 'Clear');
    btnClear.dataset.action = 'clear';
    actions.appendChild(btnOk);
    actions.appendChild(btnSave);
    actions.appendChild(btnClear);
    form.appendChild(actions);

    var heading = sec.querySelector('h2') || sec.firstElementChild;
    if (heading && heading.nextSibling) {
      heading.parentNode.insertBefore(form, heading.nextSibling);
    } else {
      sec.insertBefore(form, sec.firstChild);
    }

    /* Restore saved state */
    if (feedback[sec.id]) {
      textarea.value = feedback[sec.id].text || '';
      if (feedback[sec.id].status === 'ok') trigger.classList.add('marked-ok');
      if (feedback[sec.id].text) trigger.classList.add('has-feedback');
    }

    trigger.addEventListener('click', function() {
      form.classList.toggle('is-open');
      if (form.classList.contains('is-open')) textarea.focus();
    });

    textarea.addEventListener('input', function() {
      save(sec.id, textarea.value, feedback[sec.id] ? feedback[sec.id].status : '');
      updateTrigger(trigger, textarea.value, feedback[sec.id] ? feedback[sec.id].status : '');
      updateBar();
    });

    [btnOk, btnSave, btnClear].forEach(function(btn) {
      btn.addEventListener('click', function() {
        var action = btn.dataset.action;
        if (action === 'ok') {
          save(sec.id, textarea.value, 'ok');
          trigger.classList.add('marked-ok');
          trigger.classList.remove('has-feedback');
          form.classList.remove('is-open');
        } else if (action === 'save') {
          save(sec.id, textarea.value, textarea.value ? 'issue' : '');
          updateTrigger(trigger, textarea.value, textarea.value ? 'issue' : '');
          form.classList.remove('is-open');
        } else if (action === 'clear') {
          textarea.value = '';
          delete feedback[sec.id];
          localStorage.setItem(STORAGE_KEY, JSON.stringify(feedback));
          trigger.classList.remove('has-feedback', 'marked-ok');
          form.classList.remove('is-open');
        }
        updateBar();
      });
    });
  });

  function save(id, text, status) {
    feedback[id] = { text: text, status: status, timestamp: new Date().toISOString() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(feedback));
  }

  function updateTrigger(trigger, text, status) {
    trigger.classList.toggle('has-feedback', !!text);
    trigger.classList.toggle('marked-ok', status === 'ok');
  }

  function updateBar() {
    var keys = Object.keys(feedback);
    var issues = keys.filter(function(k) { return feedback[k].status === 'issue'; }).length;
    var oks = keys.filter(function(k) { return feedback[k].status === 'ok'; }).length;
    var total = keys.length;
    if (total > 0) {
      bar.classList.add('is-visible');
      summaryEl.textContent = total + ' reviewed | ' + oks + ' OK | ' + issues + ' issues';
    } else {
      bar.classList.remove('is-visible');
    }
  }

  window._veFeedback = {
    export: function() {
      var data = {
        report_path: location.pathname,
        report_title: document.title,
        exported_at: new Date().toISOString(),
        sections: []
      };
      sections.forEach(function(sec) {
        var heading = sec.querySelector('h2');
        var entry = feedback[sec.id] || { text: '', status: '', timestamp: '' };
        data.sections.push({
          id: sec.id,
          title: heading ? heading.textContent.trim() : sec.id,
          status: entry.status || 'not-reviewed',
          feedback: entry.text || '',
          timestamp: entry.timestamp || ''
        });
      });
      var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'feedback.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(a.href);
    }
  };

  updateBar();
})();
```

- [ ] **Step 4: Open diff-visual.html in browser and manually verify**

Create a minimal test by temporarily filling one section, then open the file to confirm:
- Feedback button appears on section hover
- Clicking opens textarea
- OK/Save/Clear work
- Export downloads valid JSON
- localStorage persists on refresh
- Print media query hides feedback UI

- [ ] **Step 5: Commit**

```bash
git add plugins/vision-powers/templates/diff-visual.html
git commit -m "feat(vision-powers): add feedback capture system to diff-visual template"
```

---

### Task 3: Update remaining 3 templates

**Files:**
- Modify: `plugins/vision-powers/templates/agent-extension-visual.html`
- Modify: `plugins/vision-powers/templates/plan-visual.html`
- Modify: `plugins/vision-powers/templates/project-recap.html`

Same CSS + JS from Task 2. Each template shares an identical structure (inline `<style>`, `.wrap` container, `<!-- CHART_DATA -->`, script blocks). Insertion points per template:

| Template | CSS: insert before | HTML: insert between | JS: insert before |
|---|---|---|---|
| agent-extension-visual.html | `</style>` (after `Section 10 — Footer` CSS) | `.wrap` closing `</div>` and `<!-- CHART_DATA -->` | `</body>` (after Zoom/Scroll Spy/Tab-UI block) |
| plan-visual.html | `</style>` (after `Section 9 — Understanding Gaps` CSS) | `.wrap` closing `</div>` and `<!-- CHART_DATA -->` | `</body>` (after Zoom/Scroll Spy block) |
| project-recap.html | `</style>` (after `Section 8 — Next Steps` CSS) | `.wrap` closing `</div>` and `<!-- CHART_DATA -->` | `</body>` (after Zoom/Scroll Spy block) |

- [ ] **Step 1: Add feedback CSS + HTML + JS to agent-extension-visual.html**

Insert identical CSS before `</style>`, feedback bar HTML between `.wrap` close and `<!-- CHART_DATA -->`, and feedback JS as a new `<script>` block before `</body>`.

- [ ] **Step 2: Add feedback CSS + HTML + JS to plan-visual.html**

Same 3 insertions at the corresponding positions.

- [ ] **Step 3: Add feedback CSS + HTML + JS to project-recap.html**

Same 3 insertions at the corresponding positions.

- [ ] **Step 4: Spot-check one template in browser**

Open any of the 3 updated templates to verify feedback UI works.

- [ ] **Step 5: Commit**

```bash
git add plugins/vision-powers/templates/agent-extension-visual.html
git add plugins/vision-powers/templates/plan-visual.html
git add plugins/vision-powers/templates/project-recap.html
git commit -m "feat(vision-powers): add feedback capture to all remaining templates"
```

---

## Chunk 2: Skill & Agent Updates

### Task 4: Update fact-check skill to read feedback.json

**Files:**
- Modify: `plugins/vision-powers/skills/fact-check/SKILL.md`

The fact-check skill currently reads a report file, extracts claims, and verifies them. We add an optional feedback.json input that focuses verification on sections the user flagged.

- [ ] **Step 1: Add feedback-aware workflow to fact-check SKILL.md**

Insert a new section after "### Target File Detection" called "### Feedback File Detection":

```markdown
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

    Feedback-guided verification:
      {N} sections flagged by user
      {N} issues confirmed and corrected
      {N} issues not reproduced (user concern was unfounded)
```

- [ ] **Step 2: Commit**

```bash
git add plugins/vision-powers/skills/fact-check/SKILL.md
git commit -m "feat(vision-powers): add feedback.json integration to fact-check skill"
```

---

### Task 5: Document feedback system in visual-report-writer agent

**Files:**
- Modify: `plugins/vision-powers/agents/visual-report-writer.md`

The visual-report-writer does NOT fill feedback UI — it is baked into the template. But the agent should know it exists to avoid accidentally breaking it.

- [ ] **Step 1: Add note to visual-report-writer.md**

Insert after the "## Anti-Slop Checklist" section:

```markdown
## Feedback System

All templates include a built-in per-section feedback system (CSS + JS). This system is entirely client-side — you do not need to fill any feedback-related placeholders or content.

**What not to touch:**
- `.ve-feedback-*` CSS classes (defined in the template `<style>`)
- The `#feedbackBar` element and its children
- The feedback JS block at the end of `<script>` (starts with `/* ===== Section Feedback System ===== */`)

The feedback system depends on `<section id="...">` elements — ensure every content section has a unique `id` attribute. The feedback JS automatically attaches to all `section[id]` elements.

**When updating templates:** Feedback CSS, HTML bar, and JS are duplicated across all 4 templates. If modifying the feedback system, update all templates simultaneously to avoid drift.
```

- [ ] **Step 2: Commit**

```bash
git add plugins/vision-powers/agents/visual-report-writer.md
git commit -m "docs(vision-powers): document feedback system in visual-report-writer"
```

---

### Task 6: Validate plugin

- [ ] **Step 1: Run plugin validation**

```bash
unset CLAUDECODE && claude plugin validate .
```

- [ ] **Step 2: Commit any validation fixes if needed**

---

## Feedback JSON Schema Reference

```json
{
  "report_path": "/path/to/report.html",
  "report_title": "Diff Visual: feature/auth..main",
  "exported_at": "2026-03-13T10:00:00Z",
  "sections": [
    {
      "id": "executive-summary",
      "title": "Executive Summary",
      "status": "ok",
      "feedback": "",
      "timestamp": "2026-03-13T09:55:00Z"
    },
    {
      "id": "kpi-dashboard",
      "title": "KPI Dashboard",
      "status": "issue",
      "feedback": "lines added count does not match git diff --stat output",
      "timestamp": "2026-03-13T09:56:00Z"
    },
    {
      "id": "module-architecture",
      "title": "Module Architecture",
      "status": "not-reviewed",
      "feedback": "",
      "timestamp": ""
    }
  ]
}
```

**Status values:**
- `ok` — User reviewed and approved
- `issue` — User found a problem (feedback text describes it)
- `not-reviewed` — User did not interact with this section

---

## User Flow Summary

```
1. Run /diff-visual develop        -> report generated, opens in browser
2. Browse report sections           -> hover reveals feedback button (pencil icon)
3. Click feedback button            -> inline textarea opens
4. Type "KPI numbers are wrong"     -> auto-saves to localStorage
5. Click "Save" or "OK"             -> button changes color (yellow=issue, green=ok)
6. Bottom bar appears               -> "3 reviewed | 2 OK | 1 issues"
7. Click "Export Feedback"          -> feedback.json downloads
8. Run /fact-check                  -> reads ~/Downloads/feedback.json
9. fact-check focuses on flagged    -> corrects KPI section first
```
