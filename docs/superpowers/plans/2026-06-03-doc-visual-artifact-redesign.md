# vision-powers 전체 재설계 — 파이프라인 폐기, 모델이 아티팩트 직접 작성 (taste-skill 방식)

> 작성 2026-06-03 · **피벗 재작성 2026-06-06** (grill-with-docs) · **설계 완료 2026-06-06** · 상태: 구현 대기
> **스코프 확장 2026-06-06 (grill 2차)**: doc-visual만 → vision-powers 3형제 전부 (ADR 0002 → 옵션 C)
> 근거 문서: [`plugins/vision-powers/CONTEXT.md`](../../../plugins/vision-powers/CONTEXT.md) (용어) · [`docs/adr/0002`](../../adr/0002-doc-visual-direct-model-authoring.md) (생성 아키텍처 결정)

## 의도 (북극성)

AI 출력은 장황·평평. **아무 장황한 출력**(git diff·원본 md·AI 답변 등)을 → **사람이 이해하기 쉬운, 비주얼·다이어그램 풍부한 explainer 아티팩트**(md or html)로 **재구조화**.

- 이건 vision-powers 패밀리 전체 의도. doc-visual = **텍스트/마크다운/답변 슬라이스** 담당 (형제: diff-visual, plugin-visual).
- thesis: Thariq Shihipar *The unreasonable effectiveness of HTML* — HTML은 markdown이 평평하게 짓누르는 구조·공간·상호작용을 **보존**. 카테고리 07 explainer = TL;DR·collapsible·tabbed·표·용어집.
- **북극성 = 재구조화지 압축이 아님.** 원본 알맹이 보존, 모양만 평평한 산문 → 탐색 가능한 scaffolding으로.

## 문제 (왜 졌나)

스킬 출력(B)이 맨손 출력(A)보다 구림 = 스킬이 모델 발목 잡음.

근본 원인 (코드 확인됨):
- doc-visual은 형제와 달리 **JSON 파이프**(`parse-markdown → section-analyzer → diagram-generator → assemble`)를 씀.
- `diagram-generator`가 `{summary, mermaid_code}`만 뱉고 **원문 body를 버림** = 알맹이를 요약으로 압축 = **cardinal sin** = thesis 정반대.
- 7섹션 전부 mermaid 강제, 이미지 7장 버림, 영어혼용·raw md 노출.
- 디자인: 템플릿 CSS 8줄 (css-patterns 미연결).

→ 진단: 장황을 풀어줄 도구가 알맹이를 압축. "압축기한테 압축하지 마."

## 결정 (확정 — grill 2026-06-06)

### 1. 생성 = C (3형제 전부 모델 직접작성). [ADR 0002 → 옵션 C 채택]
**전체** 파이프라인 폐기. 3형제(doc-visual, diff-visual, plugin-visual) 모두 **모델이 아티팩트를 통짜 한 방에 직접 작성** — 각 SKILL.md 브리프로 조건화하되 단편화하지 않음. 삭제 대상: `parse-markdown` · `section-analyzer` · `diagram-generator` · `assemble-report` · `visual-report-writer` · `shared/shared.js` · `shared/feedback.css` · `templates/*.html` · `references/design-system/css-patterns.md` · `scripts/validate-sections-data.js` · `scripts/render-sections.js` · `scripts/validate-report.js` · `scripts/aesthetic-rotation.js`. 유지: 분석 에이전트(`feature-architect`, `security-auditor`) = 입력 분석이지 생성 파이프라인 아님. diff-visual 데이터 수집 단계(git commands) = 입력 준비, 유지.

### 2. 새 흐름 골격
```
입력: 장황한 거 (md / diff텍스트 / AI답변 등)
 1. Read 소스 (+이미지)
 2. 모델이 SKILL.md 브리프 보고 md or html 통짜 작성
 3. 게이트(bash)가 출력 파일 검사
 4. 위반 → 모델이 그 부분만 인라인 수정 (통짜 재생성 X)
 5. ${CLAUDE_PLUGIN_DATA}/reports 저장 + open
```

### 3. md / html 둘 다 = 풍부한 재구조화 explainer
**매체 차이지 야망 차이 아님.** md도 다이어그램·표·구조 꽉 찬 explainer (원본 통짜 복붙 = 실패). html은 CSS 디자인·인터랙티브(접이식/탭) 추가. → **브리프 2벌**(html용 / md용 분기):

| explainer 부품 | html | md |
|---|---|---|
| TL;DR | `.lead`/`.callout` | blockquote+heading |
| 콜아웃 | `.callout` | `> blockquote` |
| 접이식 | `<details>`+css | `<details>` (md도 렌더) |
| 표·다이어그램(mermaid)·이미지 | ✅ | ✅ |
| pull-quote·CSS스타일·탭 | ✅ | ❌ |

### 4. 스킬의 레버리지 = 4개 (강약 솔직히)
| 레버리지 | 강도 | 내용 |
|---|---|---|
| **게이트** | **강 (핵심 해자)** | 이미지누락·raw md·mermaid밀도 = 기계로 잡음. 생모델·taste-skill엔 없음 |
| **압축금지 + 소스 통짜전달** | **강** | cardinal sin 구조적으로 차단. eval로 측정 |
| 디자인 브리프 | **약 (위험)** | SKILL.md에 부품 메뉴 ~10줄 인라인. css-patterns 삭제됨, 모델이 알아서 구현 |

→ 무게는 **게이트 + 압축금지**에. 브리프는 slop 안 끌 만큼만.

### 5. 디자인 브리프 = SKILL.md 인라인 규칙 (css-patterns 삭제됨, 모델이 구현)
**모드 = explainer / structural 2개** (doc-visual 전용, v1). diff-visual·plugin-visual은 입력 타입 고정이므로 모드 선택 불필요 — 각 SKILL.md에 맞는 부품 메뉴 인라인.

- **explainer 부품:** callout · pull-quote · collapsible · 표 · figure · code block · 가끔 mermaid
- **structural 부품:** explainer + architecture diagram · pipeline diagram · tree diagram
- **영구 제외 (slop):** KPI 카드 · sparkline · badge · 배경 분위기 효과 · card depth tiers
- **하드 규칙:** 읽기폭 720px · 강조색 1개 · 한글 문서면 한글 웹폰트 · slop 금지
- 색감·전체 느낌·레이아웃 = 모델 위임

### 6. 게이트 v1 (`artifact-gate.js`)
`taste-gate.js`(mermaid 전용) → `artifact-gate.js`(출력파일 전체). 최소 3항목:

| # | 검사 | html | md |
|---|---|---|---|
| a | 이미지 누락 (원본 N장 vs 출력 M장) | ✅ | ✅ |
| b | raw md 잔재 (`**`, `![` 패턴) | ✅ | ❌ |
| c | mermaid 밀도 (기존 taste-gate 로직 재활용) | mermaid 있을 때만 | 〃 |

v1 제외 (eval 후 추가 검토): 언어혼용 · accent · 링크 · 최소구조화.
위반 루프 max 2회 → 실패 시 경고+저장.

## 변경 파일

### 재작성 (3형제 SKILL.md + 게이트)
- `skills/doc-visual/SKILL.md` — 전면 재작성. 모델 직접작성 + 브리프(모드·부품메뉴·하드규칙·압축금지) 인라인 + 게이트 + 출력.
- `skills/diff-visual/SKILL.md` — 전면 재작성. 데이터 수집 단계 유지 + 리포트 생성을 모델 직접작성으로 전환. report-generation-workflow 의존 제거.
- `skills/plugin-visual/SKILL.md` — 전면 재작성. 분석 페이즈(1~4.5) 유지 + Phase 5R(visual-report-writer JSON→render→assemble) 제거 → 모델 직접작성.
- `scripts/taste-gate.js` → `scripts/artifact-gate.js` — 재작성. mermaid 조각 → 출력파일 무결성 검사 (이미지누락, raw md, mermaid 밀도).

### 삭제 (생성 파이프라인 인프라)
- `scripts/parse-markdown.js`
- `scripts/assemble-report.js`
- `scripts/validate-sections-data.js`
- `scripts/render-sections.js`
- `scripts/validate-report.js`
- `scripts/aesthetic-rotation.js`
- `agents/visual-report-writer.md`
- `agents/section-analyzer.md`
- `agents/diagram-generator.md`
- `shared/shared.js` · `shared/feedback.css`
- `templates/doc-visual.html` · `templates/diff-visual.html` · `templates/plugin-visual.html` · `templates/environment-health.html`
- `references/design-system/css-patterns.md`
- `references/report-generation-workflow.md`

### 유지
- `agents/feature-architect.md` · `agents/security-auditor.md` — 입력 분석용, plugin-visual 전용
- `agents/coherence-reviewer.md` — 선택적 품질 검토
- `scripts/taste-gate.js` — artifact-gate.js로 교체 후 삭제
- `references/design-system/semantic-tokens.md` · `references/design-system/diagram-type-selection.md` · `references/design-system/diagram-density-rules.md` · `references/design-system/mermaid-patterns.md` — mermaid 작성 시 참고용 유지
- `skills/plugin-visual/references/` — 분석 기준·보안 규칙·리포트 템플릿(md용) 유지

## 해결됨
1. **소스 전달 방식** (grill 2026-06-06) — 텍스트 = 무가공 통짜 전달(Read or 컨텍스트 그대로). 이미지 = 경로만 passthrough, base64 인라인 안 함(토큰 폭발 방지). 게이트가 원본 이미지 수 vs 출력 이미지 수 대조, 누락 시 경고.
2. **보일러플레이트 주입** (grill 2026-06-06) — **불필요, 삭제.** 스코프가 vision-powers 전체로 확장 → 3형제 모두 모델 직접작성 → shared.js·feedback.css·assemble-report.js·visual-report-writer·templates 전부 삭제 대상. mermaid 렌더링 = CDN script 1줄 모델이 직접 포함. ADR 0002 → 옵션 C로 전환.

3. **게이트 v1** (grill 2026-06-06) — 최소 필수 3항목만: (a) 이미지 누락 (원본 N장 vs 출력 M장), (b) raw md 잔재 (`**`, `![` 패턴, html만), (c) mermaid 밀도 (기존 taste-gate 로직 재활용). 언어혼용·accent·링크·최소구조화 = v1 제외 (오탐·복잡도·eval이 나음). 위반 루프 max 2회 → 실패 시 경고+저장. skill-creator-pro 원칙: 최소로 시작, eval이 투자처 알려줌.

4. **한글 폰트** (grill 2026-06-06) — 브리프 하드규칙 1줄: "한글 문서면 한글 웹폰트 CDN link 포함." 구체적 폰트명은 모델 위임. semantic-tokens.md 수정 안 함.

5. **eval** (grill 2026-06-06) — 구현 후 skill-creator-pro 프레임워크로 실행. 비교 3종: A(맨손) vs 기존B vs 새B. 합격 = 새B ≥ A. 케이스 4개: doc-visual explainer(grill글) + doc-visual structural + diff-visual(실제 diff) + plugin-visual(실제 플러그인). 측정: 본문보존율(키워드 샘플 스크립트) + 구조화 정도(heading·시각요소 수 스크립트) + 전체 품질(사람 비교). skill-creator-pro 루프: 서브에이전트 with/without → viewer → 피드백 → 반복.

## 미해결
없음. 설계 합의 완료 — 구현 대기.

## 리스크
- 모델 직접작성 = 구조적 본문보장 포기. 긴 문서서 본문 일부 누락 위험 → 게이트+eval로 완화(제거 아님). [ADR 0002 수용]
- 브리프 키울수록 slop 위험↑. 최소 유지.
- 토큰: 본문 통짜가 작성 컨텍스트 점유. doc-visual은 산출물이 유일 deliverable이라 수용. 초장문이면 통짜-서브에이전트 fallback(ADR 0002 C 축소판).

## 참조
- thesis: `../../../../harness-zero/raw/articles/The unreasonable effectiveness of HTML.md` + `harness-zero/wiki/summaries/unreasonable-effectiveness-html.md`
- taste-skill (생성 모양 참고): `references/taste-skill/skills/taste-skill/SKILL.md` — **연구 수치 인용 금지** ($200팁·+115%·겨울게으름 = AI 민담/미확인)
- 현 코드: `plugins/vision-powers/` (skills/doc-visual, scripts, agents, templates, references/design-system)
- 실패사례: harness-zero `grill-failure-modes-ko.html`(맨손A) vs `grill-failure-modes-doc-visual.html`(기존B)
