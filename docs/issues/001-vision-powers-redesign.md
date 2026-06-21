# vision-powers 전체 재설계: 파이프라인 폐기 → 모델 직접작성

> 상태: 구현 대기 · 생성: 2026-06-06
> 플랜: `docs/superpowers/plans/2026-06-03-doc-visual-artifact-redesign.md`
> ADR: `docs/adr/0002-doc-visual-direct-model-authoring.md`
> 용어집: `docs/context/vision-powers.md`

## What to build

vision-powers의 생성 파이프라인을 폐기하고 모델 직접작성으로 전환. 파이프라인에 의존하는 **모든** 스킬이 대상 — doc-visual, diff-visual, plugin-visual, context-health-visual 4형제 + report-manager 부분 수정.

**근거:** doc-visual 스킬 출력이 맨손 출력보다 구림. 근본 원인 = `diagram-generator`가 원문 body를 버리고 summary만 뱉음 (압축 = cardinal sin). 형제도 `visual-report-writer` → `assemble-report.js` 파이프라인으로 내용 단편화.

### Before (현재 파이프라인)

```
입력 (마크다운 / git diff / 플러그인 경로 / 환경 데이터)
  ↓
[입력 준비] parse-markdown.js / git commands / 분석 에이전트
  ↓
section-analyzer 에이전트    ← 섹션별 의도·다이어그램 타입 판단
  ↓
diagram-generator 에이전트   ← Mermaid + summary 생성 ⚠️ 원문 body 버림
  ↓
visual-report-writer 에이전트 ← sections-data.json (393줄 스키마 준수)
  ↓
validate-sections-data.js    ← JSON 스키마 검증
  ↓
render-sections.js           ← JSON → HTML 섹션 파일
  ↓
assemble-report.js           ← 템플릿 + 섹션 → 최종 HTML 조립
  ↓
validate-report.js / taste-gate.js ← 검증
  ↓
저장 + open
```

**문제:** 원문이 6단계 거치면서 쪼개지고 압축되고 재조립. 각 에이전트가 앞 단계 출력만 보니까 원문 맥락 유실. 4형제 전부 같은 생성 파이프라인(visual-report-writer → render-sections → assemble-report) 탐.

### After (모델 직접작성)

```
입력 (마크다운 / git diff / 플러그인 경로 / 환경 데이터)
  ↓
[입력 준비] Read / git commands / 분석 에이전트 ← 기존 유지
  ↓
모델이 원문 전체 + SKILL.md 브리프 참고
  ↓
HTML 통짜 직접 작성 ← 중간 포맷 없음, 에이전트 체인 없음
  ↓
artifact-gate.js ← 3항목 기계적 검사
  ↓
(위반 시 모델 인라인 수정, max 2회)
  ↓
저장 + open
```

### 변경 요약

| 항목 | Before | After |
|---|---|---|
| 에이전트 체인 | 3-4개 순차 (analyzer → generator → writer) | 0개. 모델 1회 직접작성 |
| 중간 포맷 | sections-data.json (393줄 스키마) | 없음 |
| 원문 접근 | diagram-generator가 summary만 받음 | 모델이 원문 전체 봄 |
| 템플릿 | 스킬별 HTML 템플릿 4개 | 없음. 모델이 HTML 구조 결정 |
| 조립 | assemble-report.js + render-sections.js | 없음. 통짜 |
| 검증 | validate-sections-data + validate-report + taste-gate | artifact-gate 1개 |
| 스크립트 수 | ~10개 | 1개 (artifact-gate.js) + 기존 유틸 |

### 안 바뀌는 것 (입력 파이프라인)

- plugin-visual: feature-architect, security-auditor 에이전트 (분석 데이터 수집)
- context-health-visual: env-fit-scan.js, env-health-scan.js (환경 스캔)
- diff-visual: git diff/log 명령 (변경 데이터 수집)
- report-manager: 리포트 관리 유틸 (validate-report.js 의존만 제거)
- 저장 경로: `${CLAUDE_PLUGIN_DATA}/reports`

## 구현 범위

### 재작성
- `skills/doc-visual/SKILL.md` — 모델 직접작성 + 브리프(모드·부품메뉴·하드규칙·압축금지) 인라인
- `skills/diff-visual/SKILL.md` — 데이터 수집 유지 + 리포트 생성을 모델 직접작성으로
- `skills/plugin-visual/SKILL.md` — 분석 페이즈 유지 + Phase 5R 제거 → 모델 직접작성
- `skills/context-health-visual/SKILL.md` — HTML 출력이 `report-generation-workflow.md` → `visual-report-writer` 파이프라인 전체 의존. 모델 직접작성으로 전환
- `scripts/taste-gate.js` → `scripts/artifact-gate.js` — 출력파일 무결성 검사
- `scripts/taste-gate.test.js` → `scripts/artifact-gate.test.js` — 3항목 기준 재작성

### 수정
- `skills/report-manager/SKILL.md` — `/refine` 명령이 `validate-report.js` 호출 중. 삭제 후 대체 검증 수단 필요 (artifact-gate.js 또는 제거)
- `references/design-system/taste-gate.md` — artifact-gate 리네임 반영

### 삭제 (생성 파이프라인 인프라)
- `scripts/parse-markdown.js`, `assemble-report.js`, `validate-sections-data.js`, `render-sections.js`, `validate-report.js`, `aesthetic-rotation.js`
- `scripts/parse-markdown.test.js` (삭제 대상의 테스트)
- `agents/visual-report-writer.md`, `section-analyzer.md`, `diagram-generator.md`
- `shared/shared.js`, `shared/feedback.css`
- `templates/doc-visual.html`, `diff-visual.html`, `plugin-visual.html`, `environment-health.html`
- `references/design-system/css-patterns.md`, `references/report-generation-workflow.md`
- `references/design-system/libraries.md`, `navigation.md` (고아 파일 — 삭제 대상인 visual-report-writer만 참조. 모델이 CDN/레이아웃 패턴 자체 지식 보유)
- `scripts/check-report-write.js`, `hooks/hooks.json` — PostToolUse 훅이 placeholder·빈 섹션 검사하는데, 모델 직접작성에서는 고정 구조 없음. artifact-gate.js가 Write 전 검증하므로 이중 검증 불필요
- `skills/*/references/section-structure.md` (4개, plugin-visual 포함) — 파이프라인 중간 포맷(assemble-report.js용 HTML 구조). 범용 아님
- `skills/plugin-visual/references/sections-data-schema.md` — `validate-sections-data.js` 전용 JSON 스키마. 분석 에이전트 미참조 확인됨

### 유지
- `agents/feature-architect.md`, `security-auditor.md` (입력 분석용)
- `agents/coherence-reviewer.md`
- `references/design-system/semantic-tokens.md`, `diagram-type-selection.md`, `diagram-density-rules.md`, `mermaid-patterns.md`
- `skills/plugin-visual/references/platforms/` (분석 기준·보안 규칙 — 파이프라인 무관)
- `scripts/config.js` (사용자 설정 영속화 — 파이프라인 무관)
- `scripts/render-report.js` (Chrome headless 스크린샷 — 파이프라인 무관)
- `scripts/env-fit-scan.js` (plugin-visual 환경 데이터 수집 — 입력 페이즈)
- `scripts/list-reports.js`, `log-report.js` (report-manager 유틸 — 파이프라인 무관)

### 범위 밖
- `skills/fact-check/` — 파이프라인 미사용, 자체 인라인 출력. 영향 없음
- 메타 파일 (`CHANGELOG.md`, `README.md`, `LICENSE`, `CONTEXT.md`) — 구현 완료 후 별도 업데이트

## 설계 결정 요약

### 검증이 3단계 → 1단계로 줄어도 되는 이유

Before 3단계:
1. **validate-sections-data.js** — 에이전트 간 JSON 계약 검증. `visual-report-writer`가 393줄 스키마 맞춰 뱉어야 `render-sections.js`가 안 깨짐. → 중간 JSON 포맷 자체 소멸 → **삭제**
2. **validate-report.js** — 템플릿 조립 결과 검증. `<!-- SECTION_N -->` 플레이스홀더 치환 실패, 빈 섹션 삽입 등 `assemble-report.js` 조립 실패 감지. → 템플릿/조립 자체 소멸 → **삭제**
3. **taste-gate.js** — 출력물 자체 품질 검사. Mermaid 문법(rgba, color:), 다이어그램 밀도(노드/화살표 한도), accent 수 제한 등. → 아키텍처 무관, 출력물이 존재하는 한 필요 → **artifact-gate.js로 리네임 후 유지**

앞 2개는 파이프라인 존재 자체가 전제. 파이프라인 없으면 검증할 대상 없음.

After `artifact-gate.js` 3항목:
1. **이미지 누락** — 참조된 이미지 경로가 실재하는지. 모델이 `<img src="...">` 쓰고 파일 안 만드는 건 흔한 실패
2. **raw md 잔재** — HTML 파일에 마크다운 문법(`##`, `**`, `` ``` ``)이 남아있는지. HTML 직접작성 시 마크다운 습관이 섞이는 실패
3. **mermaid 밀도** — 기존 taste-gate.js의 노드/화살표 밀도 제한 계승. 과밀 다이어그램은 렌더링 깨짐

3개인 이유: 기계적 탐지 가능 + 모델이 인라인 수정 가능 + 모델 직접작성 시 가장 흔한 실패 패턴. 나머지는 eval 돌려보고 실제 실패 패턴 관찰 후 추가.

### 공통
- 소스 = 통짜 passthrough. 이미지 = 경로만, base64 안 함
- 보일러플레이트 = 없음. mermaid CDN script 1줄 모델 직접 포함
- 한글 폰트 = 브리프 하드규칙 1줄, 구체 폰트명 모델 위임
- css-patterns.md 삭제. 추린 규칙 SKILL.md 인라인 (~10줄)

### SKILL.md 작성 철학
- 규칙 나열(MUST/NEVER) 대신 **WHY 설명** 우선. 모델이 이유를 이해하면 규칙 없이도 올바른 판단, 규칙만 있으면 창의적 우회
- 예: "원문 압축 금지" → "이전 파이프라인은 원문을 summary의 summary로 만들어서 실패했다. 너는 원문 전체를 직접 본다 — 그게 이 스킬의 핵심 이점이다. '이 섹션은 X를 다룬다'라고 쓰고 있다면 그건 압축이고, 이 스킬이 고치려는 바로 그 실패 모드다"

### 스킬별
- **doc-visual**: 모드(explainer/structural) 전용. 브리프 패턴 여기서 확립, 나머지 스킬에 적용
- **diff-visual**: git diff/log 데이터 수집 유지. 리포트 생성만 모델 직접작성으로 교체
- **plugin-visual**: feature-architect + security-auditor 분석 페이즈 유지. Phase 5R(visual-report-writer 위임) 제거 → 모델 직접작성
- **context-health-visual**: env-fit-scan.js / env-health-scan.js 환경 스캔 유지. HTML 출력이 report-generation-workflow → visual-report-writer 파이프라인 전체 의존 → 모델 직접작성으로 전환. environment-health.html 템플릿 삭제

## 구현 순서

1. **artifact-gate.js 작성** — 새 인프라 먼저. taste-gate.js 리네임 + 3항목 검사 구현. 테스트도 리네임
2. **doc-visual/SKILL.md 재작성** — 핵심 타겟. 모델 직접작성 브리프, 파이프라인 참조 전부 제거. 여기서 브리프 패턴 확립
3. **diff-visual/SKILL.md 재작성** — doc-visual 브리프 패턴 적용. 데이터 수집 로직 유지
4. **plugin-visual/SKILL.md 재작성** — 분석 페이즈 유지, Phase 5R 제거. 브리프 패턴 적용
5. **context-health-visual/SKILL.md 재작성** — 4번째 형제. 파이프라인 의존 제거
6. **report-manager/SKILL.md 수정** — validate-report.js 의존 제거
7. **수정 항목 처리** — hooks.json 정리, taste-gate.md 리네임
8. **파이프라인 인프라 삭제** — 재작성 완료 후 일괄 삭제. 삭제 목록 전체
9. **검증** — `plugin validate .`, eval 실행

순서 근거: 새 인프라(1) → 재작성(2-6, 기존 파이프라인 아직 참고 가능) → 정리(7) → 삭제(8, 더 이상 참조 없음 확인 후) → 검증(9)

## Acceptance criteria

- [x] `artifact-gate.js` 작성 — 3항목 검사, 위반 시 JSON 출력
- [x] `doc-visual/SKILL.md` 재작성 — 모델 직접작성, 파이프라인 참조 제거
- [x] `diff-visual/SKILL.md` 재작성 — 데이터 수집 유지, 리포트 생성 모델 직접작성
- [x] `plugin-visual/SKILL.md` 재작성 — 분석 페이즈 유지, Phase 5R 제거
- [x] `context-health-visual/SKILL.md` 재작성 — 파이프라인 의존 제거, 모델 직접작성
- [x] `report-manager/SKILL.md` 수정 — `validate-report.js` → `artifact-gate.js`로 교체
- [x] 수정 항목 처리 (taste-gate.md → artifact-gate.md 리네임+재작성, taste-gate 참조 정리)
- [x] 파이프라인 인프라 전부 삭제 — 30파일 + 빈 디렉토리 4개 정리
- [ ] eval: 4개 스킬 각각 테스트 (아래 eval 방법론 참고)
- [ ] `plugin validate .` 통과

## Eval 방법론

스킬별 테스트 입력 1개씩:
- **doc-visual**: 마크다운 파일 (예: ADR 또는 README)
- **diff-visual**: git diff (의미 있는 변경이 포함된 커밋)
- **plugin-visual**: 플러그인 경로 (예: vision-powers 자체)
- **context-health-visual**: 현재 환경

각 테스트:
1. 스킬 적용 출력 + 맨손(스킬 없이) 출력 생성
2. 체크리스트로 비교:

| 기준 | 측정 방법 | 자동/수동 |
|---|---|---|
| artifact-gate 통과 | `artifact-gate.js` 실행 | 자동 |
| 브라우저 렌더링 | HTML 열어서 깨짐 확인 | 수동 |
| 원문 압축 없음 | 입력 핵심 내용이 리포트에 존재하는지 | 수동 spot check |
| Mermaid 렌더링 | 다이어그램 실제 그려지는지 | 수동 |

skill-creator-pro eval 프레임워크로 blind A/B 비교 가능.

## Follow-up

- [ ] ADR 0002 업데이트 — 현재 3형제만 다룸. context-health-visual 포함으로 범위 확장 반영 (구현 완료 후)
