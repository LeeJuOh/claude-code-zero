# Section Structure — doc-visual

assemble-report.js가 HTML 출력 시 따르는 섹션 렌더링 패턴.

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

`skip_diagram: true` → `.mermaid-wrap` 생략.
`is_hero: true` → CSS `.doc-section[data-is-hero="true"]`로 시각 강조.

## TOC

문서 시작에 자동 생성:

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
- 배경 `--paper-2`
- 2px `--accent` 왼쪽 보더
- 다이어그램 크기 1.2x
- 섹션 간격 위 아래 2배

## Markdown per section

```
## {heading}

{summary}

```mermaid
{mermaid_code}
```
```

`skip_diagram: true` → mermaid 블록 생략.

마지막 섹션 뒤:
```
---

**원본**: [{source_path}]({source_path})
**생성**: vision-powers doc-visual · {timestamp}
```
