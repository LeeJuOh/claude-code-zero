# Vision-Powers HIGH Priority Improvements

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 4 HIGH priority issues: extract shared JS/CSS from templates, add output validation to visual-report-writer, improve Phase 4.5 bash syntax guidance, enforce LF line endings in assembler.

**Architecture:** Extract identical CSS/JS from 4 HTML templates into shared partial files (`shared/feedback.css`, `shared/shared.js`). Extend `assemble-report.js` to inject these partials via new `<!-- FEEDBACK_CSS -->` and `<!-- SHARED_JS -->` placeholders, plus enforce LF line endings on output. Update agent and skill instructions for validation and clarity.

**Tech Stack:** Node.js (assembler script), HTML/CSS/JS (templates), Markdown (agent/skill instructions)

---

## File Structure

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `plugins/vision-powers/shared/feedback.css` | Feedback system CSS (single source of truth) |
| Create | `plugins/vision-powers/shared/shared.js` | Zoom Controls + Initial Zoom + Scroll Spy + Feedback System JS |
| Modify | `plugins/vision-powers/scripts/assemble-report.js` | Add `--shared` arg, inject partials, enforce LF |
| Modify | `plugins/vision-powers/templates/agent-extension-visual.html` | Replace inline shared code with placeholders |
| Modify | `plugins/vision-powers/templates/diff-visual.html` | Replace inline shared code with placeholders |
| Modify | `plugins/vision-powers/templates/plan-visual.html` | Replace inline shared code with placeholders |
| Modify | `plugins/vision-powers/templates/project-recap.html` | Replace inline shared code with placeholders |
| Modify | `plugins/vision-powers/agents/visual-report-writer.md` | Add output validation checklist |
| Modify | `plugins/vision-powers/skills/agent-extension-visualizing/SKILL.md` | Improve Phase 4.5 bash examples |
| Modify | `plugins/vision-powers/skills/diff-visual/SKILL.md` | Update assembler command with `--shared` |
| Modify | `plugins/vision-powers/skills/plan-visual/SKILL.md` | Update assembler command with `--shared` |
| Modify | `plugins/vision-powers/skills/project-recap/SKILL.md` | Update assembler command with `--shared` |

---

## Chunk 1: Shared Partials and Assembler

### Task 1: Create shared/feedback.css

**Files:**
- Create: `plugins/vision-powers/shared/feedback.css`

- [ ] **Step 1: Create the feedback CSS file**

Extract the `/* ===== FEEDBACK SYSTEM ===== */` block from any template (they are identical). This is lines 262-282 from `templates/agent-extension-visual.html`:

```css
/* ===== FEEDBACK SYSTEM ===== */
.ve-feedback-trigger { position: absolute; top: 8px; right: 8px; width: 28px; height: 28px; border: 1px solid var(--border); border-radius: 6px; background: var(--surface); color: var(--text-dim); font-size: 14px; cursor: pointer; display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity 0.15s, background 0.15s, color 0.15s; z-index: 5; }
section:hover .ve-feedback-trigger, .ve-feedback-trigger.has-feedback { opacity: 1; }
.ve-feedback-trigger:hover { background: var(--accent-dim); color: var(--accent); }
.ve-feedback-trigger.has-feedback { color: var(--warning); border-color: var(--warning); }
.ve-feedback-trigger.marked-ok { color: var(--success); border-color: var(--success); }
.ve-feedback-form { display: none; margin: 0.75rem 0 1rem; padding: 0.75rem; border: 1px solid var(--border); border-radius: 8px; background: color-mix(in srgb, var(--surface) 50%, var(--bg) 50%); }
.ve-feedback-form.is-open { display: block; }
.ve-feedback-form textarea { width: 100%; min-height: 60px; padding: 0.5rem; border: 1px solid var(--border); border-radius: 6px; background: var(--surface); color: var(--text); font-family: var(--font-body); font-size: 0.85rem; resize: vertical; outline: none; box-sizing: border-box; }
.ve-feedback-form textarea:focus { border-color: var(--accent); }
.ve-feedback-actions { display: flex; gap: 0.5rem; margin-top: 0.5rem; align-items: center; }
.ve-feedback-btn { padding: 0.3rem 0.75rem; border: 1px solid var(--border); border-radius: 6px; background: var(--surface); color: var(--text-dim); font-size: 0.8rem; cursor: pointer; transition: all 0.15s; }
.ve-feedback-btn:hover { background: var(--accent-dim); color: var(--accent); }
.ve-feedback-btn--ok { color: var(--success); border-color: var(--success); }
.ve-feedback-btn--ok:hover { background: color-mix(in srgb, var(--success) 10%, var(--surface)); }
.ve-feedback-bar { position: fixed; bottom: 0; left: 0; right: 0; z-index: 500; display: none; align-items: center; justify-content: center; gap: 1rem; padding: 0.75rem 1.5rem; background: var(--surface-elevated); border-top: 1px solid var(--border); box-shadow: 0 -2px 12px rgba(0,0,0,0.1); font-size: 0.85rem; }
.ve-feedback-bar.is-visible { display: flex; }
.ve-feedback-bar__summary { color: var(--text-dim); font-family: var(--font-mono); font-size: 0.8rem; }
.ve-feedback-bar__export { padding: 0.4rem 1rem; border: none; border-radius: 6px; background: var(--accent); color: #fff; font-weight: 600; font-size: 0.85rem; cursor: pointer; transition: opacity 0.15s; }
.ve-feedback-bar__export:hover { opacity: 0.85; }
@media print { .ve-feedback-trigger, .ve-feedback-form, .ve-feedback-bar { display: none !important; } }
```

- [ ] **Step 2: Commit**

```bash
git add plugins/vision-powers/shared/feedback.css
git commit -m "refactor(vision-powers): extract feedback CSS to shared/feedback.css"
```

---

### Task 2: Create shared/shared.js

**Files:**
- Create: `plugins/vision-powers/shared/shared.js`

- [ ] **Step 1: Create the shared JS file**

Combine these 4 identical JS blocks from any template into one file. Order matters — Zoom Controls first, then Initial Zoom, Scroll Spy, Feedback System:

```js
/* ===== Zoom Controls ===== */
var INITIAL_ZOOM = 1.4;
function applyZoom(wrap, level) {
  var target = wrap.querySelector('.mermaid');
  target.dataset.zoom = level;
  target.style.transform = 'scale(' + level + ')';
  var svg = target.querySelector('svg');
  if (svg) { var rect = svg.getBoundingClientRect(); target.style.width = (rect.width / level * level) + 'px'; target.style.height = (rect.height / level * level) + 'px'; }
  var indicator = wrap.querySelector('.zoom-level');
  if (indicator) indicator.textContent = Math.round(level * 100) + '%';
}
function zoomDiagram(btn, factor) { var wrap = btn.closest('.mermaid-wrap'); var target = wrap.querySelector('.mermaid'); var current = parseFloat(target.dataset.zoom || INITIAL_ZOOM); applyZoom(wrap, Math.min(Math.max(current * factor, 0.3), 30)); }
function resetZoom(btn) { applyZoom(btn.closest('.mermaid-wrap'), INITIAL_ZOOM); }
function toggleFullscreen(btn) { var wrap = btn.closest('.mermaid-wrap'); wrap.classList.toggle('is-fullscreen'); document.body.style.overflow = wrap.classList.contains('is-fullscreen') ? 'hidden' : ''; }
document.addEventListener('keydown', function(e) { if (e.key === 'Escape') { var fs = document.querySelector('.mermaid-wrap.is-fullscreen'); if (fs) { fs.classList.remove('is-fullscreen'); document.body.style.overflow = ''; } } });

document.querySelectorAll('.mermaid-wrap').forEach(function(wrap) {
  wrap.addEventListener('wheel', function(e) { if (!e.ctrlKey && !e.metaKey) return; e.preventDefault(); var target = wrap.querySelector('.mermaid'); var current = parseFloat(target.dataset.zoom || INITIAL_ZOOM); var factor = e.deltaY < 0 ? 1.15 : 1 / 1.15; applyZoom(wrap, Math.min(Math.max(current * factor, 0.3), 30)); }, { passive: false });
  var startX, startY, scrollLeft, scrollTop;
  wrap.addEventListener('mousedown', function(e) { if (e.target.closest('.zoom-controls')) return; wrap.classList.add('is-panning'); startX = e.pageX - wrap.offsetLeft; startY = e.pageY - wrap.offsetTop; scrollLeft = wrap.scrollLeft; scrollTop = wrap.scrollTop; });
  wrap.addEventListener('mousemove', function(e) { if (!wrap.classList.contains('is-panning')) return; e.preventDefault(); wrap.scrollLeft = scrollLeft - (e.pageX - wrap.offsetLeft - startX); wrap.scrollTop = scrollTop - (e.pageY - wrap.offsetTop - startY); });
  document.addEventListener('mouseup', function() { wrap.classList.remove('is-panning'); });
});
document.addEventListener('keydown', function(e) { if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return; var wrap = document.querySelector('.mermaid-wrap:hover'); if (!wrap) return; if (e.key === '+' || e.key === '=') { e.preventDefault(); var t = wrap.querySelector('.mermaid'); applyZoom(wrap, Math.min(parseFloat(t.dataset.zoom || INITIAL_ZOOM) * 1.3, 30)); } else if (e.key === '-') { e.preventDefault(); var t = wrap.querySelector('.mermaid'); applyZoom(wrap, Math.max(parseFloat(t.dataset.zoom || INITIAL_ZOOM) / 1.3, 0.3)); } });

/* ===== Initial Zoom: apply after Mermaid renders SVGs ===== */
document.querySelectorAll('.mermaid').forEach(function(el) {
  new MutationObserver(function(mutations, obs) {
    if (el.querySelector('svg')) {
      var wrap = el.closest('.mermaid-wrap');
      if (wrap) applyZoom(wrap, INITIAL_ZOOM);
      obs.disconnect();
    }
  }).observe(el, { childList: true });
});

/* ===== Scroll Spy ===== */
(function() {
  var toc = document.getElementById('toc'); var links = toc.querySelectorAll('a'); var sections = [];
  links.forEach(function(link) { var id = link.getAttribute('href').slice(1); var el = document.getElementById(id); if (el) sections.push({ id: id, el: el, link: link }); });
  var observer = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting) { links.forEach(function(l) { l.classList.remove('active'); }); var match = sections.find(function(s) { return s.el === entry.target; }); if (match) { match.link.classList.add('active'); if (window.innerWidth <= 1000) match.link.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' }); } }
    });
  }, { rootMargin: '-10% 0px -80% 0px' });
  sections.forEach(function(s) { observer.observe(s.el); });
  links.forEach(function(link) { link.addEventListener('click', function(e) { e.preventDefault(); var id = link.getAttribute('href').slice(1); var el = document.getElementById(id); if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); history.replaceState(null, '', '#' + id); } }); });
})();

/* ===== Section Feedback System ===== */
(function() {
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

    var trigger = el('button', 've-feedback-trigger', '\u270E');
    trigger.title = 'Add feedback';
    sec.appendChild(trigger);

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

- [ ] **Step 2: Commit**

```bash
git add plugins/vision-powers/shared/shared.js
git commit -m "refactor(vision-powers): extract shared JS to shared/shared.js"
```

---

### Task 3: Extend assemble-report.js

**Files:**
- Modify: `plugins/vision-powers/scripts/assemble-report.js`

- [ ] **Step 1: Add `--shared` argument and shared partial injection**

Add `shared` to the args parsing. When provided, read all `.css` and `.js` files from the shared directory and inject them at matching placeholders.

The updated script:

```js
#!/usr/bin/env node
/**
 * Assemble an HTML report from a template, section files, metadata, and shared partials.
 *
 * Usage:
 *   node assemble-report.js \
 *     --template path/to/template.html \
 *     --sections path/to/sections-dir/ \
 *     --metadata path/to/metadata.json \
 *     --shared path/to/shared-dir/ \
 *     --output path/to/report.html
 */

const fs = require("fs");
const path = require("path");

const METADATA_KEYS = [
  "lang", "title", "font_link", "css_variables", "css_variables_dark",
  "mermaid_theme", "toc_content", "chart_data",
];

// Maps shared filenames to their template placeholders
const SHARED_PLACEHOLDERS = {
  "feedback.css": "FEEDBACK_CSS",
  "shared.js": "SHARED_JS",
};

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i += 2) {
    const key = argv[i].replace(/^--/, "");
    args[key] = argv[i + 1];
  }
  return args;
}

function main() {
  const args = parseArgs(process.argv);
  const required = ["template", "sections", "metadata", "output"];
  for (const key of required) {
    if (!args[key]) {
      console.error(`Error: --${key} is required`);
      process.exit(1);
    }
  }

  for (const key of ["template", "sections", "metadata"]) {
    if (!fs.existsSync(args[key])) {
      console.error(`Error: ${key} not found: ${args[key]}`);
      process.exit(1);
    }
  }

  let html = fs.readFileSync(args.template, "utf-8");
  const metadata = JSON.parse(fs.readFileSync(args.metadata, "utf-8"));

  // Replace metadata placeholders
  for (const key of METADATA_KEYS) {
    const placeholder = `<!-- ${key.toUpperCase()} -->`;
    html = html.split(placeholder).join(metadata[key] || "");
  }

  // Replace shared partial placeholders
  if (args.shared && fs.existsSync(args.shared)) {
    for (const [filename, placeholder] of Object.entries(SHARED_PLACEHOLDERS)) {
      const filePath = path.join(args.shared, filename);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, "utf-8");
        const pattern = new RegExp(`<!--\\s*${placeholder}\\s*-->`, "g");
        html = html.replace(pattern, content);
      }
    }
  }

  // Replace section placeholders: <!-- SECTION_N: description -->
  const sectionFiles = fs.readdirSync(args.sections)
    .filter(f => /^section-\d+\.html$/.test(f))
    .sort((a, b) => {
      const na = parseInt(a.match(/\d+/)[0]);
      const nb = parseInt(b.match(/\d+/)[0]);
      return na - nb;
    });

  for (const file of sectionFiles) {
    const n = file.match(/section-(\d+)\.html/)[1];
    const content = fs.readFileSync(path.join(args.sections, file), "utf-8");
    const pattern = new RegExp(`<!--\\s*SECTION_${n}\\b[^>]*-->`, "g");
    html = html.replace(pattern, content);
  }

  // Check for unreplaced section placeholders
  const remaining = html.match(/<!--\s*SECTION_\d+\b[^>]*-->/g);
  if (remaining) {
    console.error(`Warning: ${remaining.length} unreplaced section placeholder(s):`);
    remaining.forEach(p => console.error(`  ${p}`));
  }

  // Normalize line endings to LF
  html = html.replace(/\r\n/g, "\n");

  // Write output
  const outputDir = path.dirname(args.output);
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(args.output, html, "utf-8");
  const lineCount = html.split("\n").length;
  console.log(`Assembled: ${args.output} (${lineCount} lines)`);
}

main();
```

- [ ] **Step 2: Commit**

```bash
git add plugins/vision-powers/scripts/assemble-report.js
git commit -m "feat(vision-powers): assembler supports --shared partials and LF normalization"
```

---

### Task 4: Update agent-extension-visual.html template

**Files:**
- Modify: `plugins/vision-powers/templates/agent-extension-visual.html`

- [ ] **Step 1: Replace feedback CSS with placeholder**

Replace the `/* ===== FEEDBACK SYSTEM ===== */` CSS block (lines 262-282) with `<!-- FEEDBACK_CSS -->`.

- [ ] **Step 2: Replace shared JS with placeholder**

Replace the JS blocks for Zoom Controls, Initial Zoom, Scroll Spy, and Feedback System (lines 337-539) with `<!-- SHARED_JS -->`.

Keep the template-specific JS (Tab UI lines 386-389, Concept Tooltips lines 392-396) above the placeholder:

```html
<script>
/* ===== Tab UI ===== */
document.querySelectorAll('.tab-btn').forEach(function(btn) {
  btn.addEventListener('click', function() { var tabId = btn.dataset.tab; btn.closest('section').querySelectorAll('.tab-btn').forEach(function(b) { b.classList.remove('tab-btn--active'); }); btn.closest('section').querySelectorAll('.tab-panel').forEach(function(p) { p.classList.remove('tab-panel--active'); }); btn.classList.add('tab-btn--active'); document.getElementById('tab-' + tabId).classList.add('tab-panel--active'); });
});

/* ===== Concept Tooltips ===== */
var conceptDefs = {};
document.querySelectorAll('.concept-term').forEach(function(el) {
  el.addEventListener('mouseenter', function() { var id = el.dataset.concept; var def = conceptDefs[id]; if (!def) return; var tip = document.createElement('div'); tip.className = 'concept-tooltip'; tip.textContent = def; el.appendChild(tip); });
  el.addEventListener('mouseleave', function() { var tip = el.querySelector('.concept-tooltip'); if (tip) tip.remove(); });
});

<!-- SHARED_JS -->
</script>
```

- [ ] **Step 3: Commit**

```bash
git add plugins/vision-powers/templates/agent-extension-visual.html
git commit -m "refactor(vision-powers): replace inline shared code with placeholders in agent-extension-visual template"
```

---

### Task 5: Update diff-visual.html template

**Files:**
- Modify: `plugins/vision-powers/templates/diff-visual.html`

- [ ] **Step 1: Replace feedback CSS with placeholder**

Replace the `/* ===== FEEDBACK SYSTEM ===== */` CSS block (lines 223-243) with `<!-- FEEDBACK_CSS -->`.

- [ ] **Step 2: Replace shared JS with placeholder**

Replace ALL JS in the second `<script>` block (lines 298-488 — Zoom Controls through Feedback System) with:

```html
<script>
<!-- SHARED_JS -->
</script>
```

This template has no template-specific JS.

- [ ] **Step 3: Commit**

```bash
git add plugins/vision-powers/templates/diff-visual.html
git commit -m "refactor(vision-powers): replace inline shared code with placeholders in diff-visual template"
```

---

### Task 6: Update plan-visual.html template

**Files:**
- Modify: `plugins/vision-powers/templates/plan-visual.html`

- [ ] **Step 1: Replace feedback CSS with placeholder**

Replace the `/* ===== FEEDBACK SYSTEM ===== */` CSS block (lines 228-248) with `<!-- FEEDBACK_CSS -->`.

- [ ] **Step 2: Replace shared JS with placeholder**

Replace ALL JS in the second `<script>` block (lines 302-492 — Zoom Controls through Feedback System) with:

```html
<script>
<!-- SHARED_JS -->
</script>
```

- [ ] **Step 3: Commit**

```bash
git add plugins/vision-powers/templates/plan-visual.html
git commit -m "refactor(vision-powers): replace inline shared code with placeholders in plan-visual template"
```

---

### Task 7: Update project-recap.html template

**Files:**
- Modify: `plugins/vision-powers/templates/project-recap.html`

- [ ] **Step 1: Replace feedback CSS with placeholder**

Replace the `/* ===== FEEDBACK SYSTEM ===== */` CSS block (lines 207-227) with `<!-- FEEDBACK_CSS -->`.

- [ ] **Step 2: Replace shared JS with placeholder**

Replace ALL JS in the second `<script>` block (lines 280-470 — Zoom Controls through Feedback System) with:

```html
<script>
<!-- SHARED_JS -->
</script>
```

- [ ] **Step 3: Commit**

```bash
git add plugins/vision-powers/templates/project-recap.html
git commit -m "refactor(vision-powers): replace inline shared code with placeholders in project-recap template"
```

---

### Task 8: Update orchestrator skills' assembler commands

**Files:**
- Modify: `plugins/vision-powers/skills/agent-extension-visualizing/SKILL.md:330-332`
- Modify: `plugins/vision-powers/skills/diff-visual/SKILL.md` (assembler command)
- Modify: `plugins/vision-powers/skills/plan-visual/SKILL.md` (assembler command)
- Modify: `plugins/vision-powers/skills/project-recap/SKILL.md` (assembler command)

- [ ] **Step 1: Update all 4 skills' assembler Bash commands**

Add `--shared {shared-dir-path}` to each skill's assembler command. The shared directory is at `../../shared/` relative to each skill, resolved to absolute path just like the template path.

For `agent-extension-visualizing/SKILL.md` line 332, change:
```
Bash(node {assembler-path} --template {template-path} --sections {sections-dir} --metadata {sections-dir}/metadata.json --output {output-path})
```
to:
```
Bash(node {assembler-path} --template {template-path} --sections {sections-dir} --metadata {sections-dir}/metadata.json --shared {shared-dir-path} --output {output-path})
```

Add a line in "Resolve reference paths" (step 2) for shared dir:
```
- Shared directory: resolve `../../shared/` to absolute path
```

Apply the same pattern to all 4 orchestrator skills.

- [ ] **Step 2: Commit**

```bash
git add plugins/vision-powers/skills/agent-extension-visualizing/SKILL.md plugins/vision-powers/skills/diff-visual/SKILL.md plugins/vision-powers/skills/plan-visual/SKILL.md plugins/vision-powers/skills/project-recap/SKILL.md
git commit -m "feat(vision-powers): add --shared to assembler commands in all orchestrator skills"
```

---

### Task 9: Validate end-to-end assembly

- [ ] **Step 1: Run plugin validation**

```bash
cd /Users/ljo/Desktop/project/zero-code/claude-code-zero && unset CLAUDECODE && claude plugin validate .
```

- [ ] **Step 2: Dry-run the assembler with the agent-extension-visual template**

Create a minimal test to verify the assembler correctly injects shared partials:

```bash
mkdir -p /tmp/assemble-test-sections
echo '{"lang":"en","title":"Test","font_link":"","css_variables":"","css_variables_dark":"","mermaid_theme":"","toc_content":"","chart_data":""}' > /tmp/assemble-test-sections/metadata.json
echo '<section id="s1"><h2>Test</h2></section>' > /tmp/assemble-test-sections/section-1.html
node plugins/vision-powers/scripts/assemble-report.js \
  --template plugins/vision-powers/templates/agent-extension-visual.html \
  --sections /tmp/assemble-test-sections \
  --metadata /tmp/assemble-test-sections/metadata.json \
  --shared plugins/vision-powers/shared \
  --output /tmp/assemble-test-output.html
```

Verify the output:
- Contains `ve-feedback-trigger` (from feedback.css)
- Contains `INITIAL_ZOOM` (from shared.js)
- Contains NO `<!-- FEEDBACK_CSS -->` or `<!-- SHARED_JS -->` placeholders
- Contains NO `\r\n` line endings

```bash
grep -c 've-feedback-trigger' /tmp/assemble-test-output.html
grep -c 'INITIAL_ZOOM' /tmp/assemble-test-output.html
grep -c '<!-- FEEDBACK_CSS -->' /tmp/assemble-test-output.html
grep -c '<!-- SHARED_JS -->' /tmp/assemble-test-output.html
```

Expected: first two return >0, last two return 0.

- [ ] **Step 3: Cleanup test files**

```bash
rm -rf /tmp/assemble-test-sections /tmp/assemble-test-output.html
```

---

## Chunk 2: Visual-Report-Writer Validation, Phase 4.5 Bash, Agent Updates

### Task 10: Add output validation to visual-report-writer

**Files:**
- Modify: `plugins/vision-powers/agents/visual-report-writer.md:143-152`

- [ ] **Step 1: Add validation section after Anti-Slop Checklist**

Insert a new `## Output Validation` section after the existing `## Anti-Slop Checklist` (line 143). Add it as items 8-10 in the checklist:

```markdown
8. **Section content**: Each section-N.html has meaningful content beyond just `<section id="..."></section>` — at minimum a heading and one content element.
9. **TOC-section ID match**: Every `href="#..."` in metadata.json `toc_content` has a corresponding `<section id="...">` in the section files. Every section file with an `id` attribute has a matching TOC link.
10. **Mermaid syntax**: All `<pre class="mermaid">` blocks contain diagram syntax (not placeholder comments). No `rgba()` in any `classDef` rule — use 8-digit hex instead (e.g., `fill:#0891b226`). No `color:` property in `classDef`.
```

- [ ] **Step 2: Commit**

```bash
git add plugins/vision-powers/agents/visual-report-writer.md
git commit -m "feat(vision-powers): add output validation rules to visual-report-writer"
```

---

### Task 11: Update visual-report-writer feedback system docs

**Files:**
- Modify: `plugins/vision-powers/agents/visual-report-writer.md:130-141`

- [ ] **Step 1: Update Feedback System section**

Replace the warning about updating all templates simultaneously (line 141) with the new shared partials reality:

```markdown
## Feedback System

All templates include a built-in per-section feedback system. The CSS lives in `shared/feedback.css` and the JS in `shared/shared.js` — the assembler injects them at build time via `<!-- FEEDBACK_CSS -->` and `<!-- SHARED_JS -->` placeholders.

**What not to touch:**
- `.ve-feedback-*` CSS classes (injected from shared/feedback.css)
- The `#feedbackBar` element and its children
- The feedback JS block (injected from shared/shared.js)

The feedback system depends on `<section id="...">` elements — ensure every content section has a unique `id` attribute. The feedback JS automatically attaches to all `section[id]` elements.

**When updating shared code:** Edit the files in `shared/` directly. Changes apply to all 4 report types automatically through the assembler.
```

- [ ] **Step 2: Commit**

```bash
git add plugins/vision-powers/agents/visual-report-writer.md
git commit -m "docs(vision-powers): update visual-report-writer for shared partials architecture"
```

---

### Task 12: Improve Phase 4.5 bash syntax in agent-extension-visualizing

**Files:**
- Modify: `plugins/vision-powers/skills/agent-extension-visualizing/SKILL.md:214-228`

- [ ] **Step 1: Replace the abstract bash block with concrete examples**

Replace the current Phase 4.5 Step 2 content (lines 214-228) with clearer guidance:

```markdown
**Step 2**: Construct and run a single bash block. Build dynamically from the requirements list.

Each requirement type uses a specific check pattern:

| Type | Check pattern | Status values |
|------|--------------|---------------|
| CLI | `which {name} >/dev/null 2>&1` | AVAILABLE / MISSING |
| MCP | `grep -q '"{name}"' ~/.claude/.mcp.json 2>/dev/null` | AVAILABLE / MISSING |
| ENV | `[ -n "${name}" ]` | SET / UNSET |
| Plugin | `ls ~/.claude/plugins/cache/ 2>/dev/null \| grep -q "{name}"` | AVAILABLE / MISSING |

**Concrete example** — for a plugin requiring `gh` CLI, `github` MCP server, `GITHUB_TOKEN` env var, and `code-reviewer` plugin:

```bash
echo "=== ENV_COMPAT ==="
echo -n "gh|CLI|required|" ; which gh >/dev/null 2>&1 && echo "AVAILABLE" || echo "MISSING"
echo -n "github|MCP|optional|" ; grep -q '"github"' ~/.claude/.mcp.json 2>/dev/null && echo "AVAILABLE" || echo "MISSING"
echo -n "GITHUB_TOKEN|ENV|required|" ; [ -n "$GITHUB_TOKEN" ] && echo "SET" || echo "UNSET"
echo -n "code-reviewer|Plugin|optional|" ; ls ~/.claude/plugins/cache/ 2>/dev/null | grep -q "code-reviewer" && echo "AVAILABLE" || echo "MISSING"
echo "=== END ==="
```

**Quoting rules**: If a requirement name contains special characters, wrap it in single quotes in the `grep` pattern (e.g., `grep -q '"my-tool"'`). Names in `which` and `[ -n ]` checks are safe without extra quoting since they come from the structured requirements block.

Do NOT use `$()` command substitution — triggers separate security prompt.
```

- [ ] **Step 2: Commit**

```bash
git add plugins/vision-powers/skills/agent-extension-visualizing/SKILL.md
git commit -m "docs(vision-powers): improve Phase 4.5 bash syntax with concrete examples and quoting rules"
```

---

### Task 13: Final validation

- [ ] **Step 1: Run plugin validation**

```bash
cd /Users/ljo/Desktop/project/zero-code/claude-code-zero && unset CLAUDECODE && claude plugin validate .
```

- [ ] **Step 2: Verify no CRLF in any modified file**

```bash
file plugins/vision-powers/shared/feedback.css plugins/vision-powers/shared/shared.js plugins/vision-powers/scripts/assemble-report.js
```

Expected: All files show "ASCII text" or "UTF-8 Unicode text", not "with CRLF line terminators".
