# Section Structure — doc-visual

The section rendering pattern that assemble-report.js follows when emitting HTML.

## HTML per section

```html
<section id="{section_id}" class="doc-section depth-{level}" data-is-hero="{is_hero}">
  <h{level}>{heading}</h{level}>
  <p class="summary">{summary}</p>
  <div class="mermaid-wrap">
    <div class="zoom-controls">
      <button onclick="zoomDiagram(this, 1.3)">+</button>
      <button onclick="zoomDiagram(this, 1/1.3)">−</button>
      <button onclick="resetZoom(this)">↻</button>
      <span class="zoom-level">140%</span>
      <button onclick="toggleFullscreen(this)">⛶</button>
    </div>
    <pre class="mermaid">{mermaid_code}</pre>
  </div>
</section>
```

`skip_diagram: true` → omit `.mermaid-wrap`.
`is_hero: true` → visually emphasize via CSS `.doc-section[data-is-hero="true"]`.

## TOC

Generated automatically at the start of the document:

```html
<nav class="toc">
  <p class="eyebrow">CONTENTS</p>
  <ol>
    <li><a href="#{section_id}">{heading}</a></li>
  </ol>
</nav>
```

## Hero styling

`.doc-section[data-is-hero="true"]`:
- Background `--paper-2`
- 2px `--accent` left border
- Diagram size 1.2x
- Section spacing 2x above and below

## Markdown per section

```
## {heading}

{summary}

```mermaid
{mermaid_code}
```
```

`skip_diagram: true` → omit the mermaid block.

After the last section:
```
---

**Source**: [{source_path}]({source_path})
**Generated**: vision-powers doc-visual · {timestamp}
```
