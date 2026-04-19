---
name: doc-visual
description: |
  임의 마크다운 문서(research/spec/RFC/ADR/design)를 다이어그램 강화된 리포트로 변환.
  Use when asked to visualize, explain, or make a document easier to understand —
  "이 문서 다이어그램으로 깨줘", "visualize this research", "make this design doc easier to read",
  "summarize this spec with diagrams". 단일 md 파일 입력.
argument-hint: "[md-file-path] [--format html|md] [--lang code]"
allowed-tools: Read, Agent, Bash(node *), Bash(open *), Bash(rm -rf /tmp/doc-visual-*)
---

# doc-visual

마크다운 문서를 읽고 각 섹션의 의미에 맞는 다이어그램(13 타입 중)을 자동으로 끼워 넣은 HTML 또는 마크다운 리포트를 생성.

## Instructions

### Format Detection

| Flag | Values | Default |
|---|---|---|
| `--format` | `html` / `md` | `html` |
| `--lang` | ISO code | 문서 자동 감지 |

### Input Parsing

인자 = 단일 마크다운 파일 경로. 디렉터리/URL/stdin은 미지원.

- 파일 존재 + 마크다운 확장자 검증 (`.md`, `.markdown`, `.txt`)
- 파일 없음/권한 없음 → 즉시 중단

### Pipeline

```
[1] parse-markdown.js       → sections[] JSON
[2] section-analyzer (agent)→ sections[]에 diagram_plan 추가
[3] diagram-generator (agent)→ summary + mermaid_code
[4] taste-gate.js           → Layer 0 위반 검출, 위반 시 [3] 재호출 (max 2회)
[5] assemble-report.js      → HTML 또는 MD 조립
```

### Step 1 — Parse markdown

```bash
node ../../scripts/parse-markdown.js <input-md-path>
```

폴백: 빈 파일 → 중단. H1/H2 없음 → 섹션 1개로 처리.

### Step 2 — Section analyzer (subagent)

Agent 도구로 `section-analyzer` 호출. 프롬프트에 inline:
- `sections[]` JSON
- `references/design-system/diagram-type-selection.md` 내용
- `references/design-system/diagram-density-rules.md` 요약

출력: `diagram_plan` 추가.

### Step 3 — Diagram generator (subagent)

섹션별 병렬 호출 가능. Agent 도구로 `diagram-generator` 호출. 프롬프트에:
- 해당 section
- `references/design-system/semantic-tokens.md` (현재 aesthetic 세트 값)
- `references/design-system/mermaid-patterns.md`의 해당 타입 섹션
- `references/design-system/diagram-density-rules.md`

출력: `summary` + `mermaid_code`.

### Step 4 — Taste gate

```bash
node ../../scripts/taste-gate.js --mermaid <code> --type <type>
```

위반 시 해당 섹션만 Step 3 재호출 (violations 프롬프트에 추가). 최대 2회 재시도 후에도 위반 → 해당 섹션 다이어그램 제외, warn 로그.

### Step 5 — Assemble

```bash
node ../../scripts/assemble-report.js \
  --skill-prefix doc-visual \
  --format <html|md> \
  --sections <json-file> \
  --output <output-path>
```

### Output

- HTML: `${CLAUDE_PLUGIN_DATA}/reports/{doc-basename}-doc-visual.html`. 완료 후 `open` 명령어.
- MD: 응답 본문 직접 삽입. 푸터에 원본 경로 링크.

### Error Handling

| 실패 | 동작 |
|---|---|
| 입력 없음/권한 없음 | 즉시 중단 |
| parse-markdown: 깨진 md | H1 1개로 폴백, 경고 |
| section-analyzer 실패 | 모든 섹션 skip_diagram: true, 요약만 |
| diagram-generator 실패 | 해당 섹션 skip, 요약만 |
| taste-gate 2회 후 위반 | 해당 섹션 다이어그램 제외 |
| assemble 실패 | 에러 전달, 부분 산출물 보존 |

### Gotchas

- **긴 문서(>10000자)** → 섹션 요약 강제
- **짧은 문서(<500자)** → 1섹션 + hero 1개만
- **기존 Mermaid 블록** → Layer 0 토큰으로 업그레이드 후 보존
- **refine 후속** → `report-manager refine`이 특정 섹션만 재생성 (Step 3-4만)
- **venn/pyramid 요청** → fallback SVG/Chart.js로 assemble-report.js가 렌더
- **H4+ 헤더** → `parse-markdown.js`는 H1/H2/H3만 섹션 경계로 인식.
  H4 이상은 해당 부모 H2/H3 섹션의 `body`에 마크다운 그대로 포함되어 요약 대상이 된다.
  독립 섹션으로 분리되지 않음. 요약이 너무 길어질 경우 section-analyzer가 내부
  구조를 인지하고 요약 시 서브 토픽으로 압축 — 그러나 개별 다이어그램을 얻고 싶다면
  원본 md의 H4를 H3로 올려야 한다.

### Reference Files

- `../../references/design-system/semantic-tokens.md`
- `../../references/design-system/diagram-type-selection.md`
- `../../references/design-system/diagram-density-rules.md`
- `../../references/design-system/taste-gate.md`
- `../../references/design-system/mermaid-patterns.md`
- `../../references/report-generation-workflow.md`
- `references/section-structure.md`
