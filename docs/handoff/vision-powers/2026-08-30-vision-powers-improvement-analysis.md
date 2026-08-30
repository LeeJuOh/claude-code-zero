---
topic: vision-powers-improvement-analysis
date: 2026-08-30
---

# vision-powers 개선 분석 핸드오프

## Goal

vision-powers 플러그인을 참고 프로젝트들과 비교분석해 개선안을 도출한다. 초점은 **개발용 실사용 축(doc-visual + diff-visual)**. 이번 세션은 분석·의사결정까지 완료했고, 코드는 아직 손대지 않음. 다음 세션의 목표는 도출된 개선안을 스펙으로 떠서 착수하는 것.

## First Action

`docs/specs/014` + `docs/issues/014` 페어를 새로 작성한다 — 주제: **"diff-visual·doc-visual 다이어그램 위상 검증(diagram topology validation)"**. 013(diff-visual catch-up 재정의)이 직전 번호이므로 014가 다음. 내용의 뼈대는 이 문서 아래 *Decisions Made 1번* + *Next Steps*에 있다. 스펙 작성 전 `docs/reference/gotchas.md`와 공식 문서(`https://code.claude.com/docs/llms.txt`)를 먼저 확인할 것(AGENTS.md 규칙 — 구조 변경 시 필수).

## Context

vision-powers를 "매체 중심(HTML 시각화 도구)"에서 "페인포인트 중심"으로 재규정하는 논의를 거쳤다. 사용자가 강조한 근본 페인포인트는 **"AI 산출물(markdown/프로즈)이 장황·평면적이라 가독성·가시성이 없다 → HTML이 공간·구조·인터랙션으로 회복"**(Thariq Shihipar thesis, wiki `concepts/html-as-agent-artifact.md` · `summaries/unreasonable-effectiveness-html.md`). "이해 부채(comprehension debt)"도 유효하나 그건 근본의 한 응용일 뿐이라는 데 합의.

참고 프로젝트 5종을 서브에이전트로 병렬 딥다이브했고 결과가 모두 도착·소화됨. 마지막으로 사용자에게 "큰 개선 1개 + 저비용 5개로 스펙 뜰까?"를 물은 상태에서 핸드오프 요청이 들어옴. 즉 **스펙 착수 직전에 멈춘 것**.

주의: 이 세션에서 파일 변경은 전혀 없음. 아래 "현재 상태"는 전부 세션 시작 시점의 기존 코드 상태이며, 개선안은 아직 미구현 제안임.

## Current Progress

_repo_facts.sh 기준 (2026-08-30):_
- **Branch:** `develop`
- **Working tree:** clean (변경 없음 — 이번 세션은 분석 전용)
- **최근 커밋:** 508fcda (Merge main into develop before v1.81.0 release), 761f101 (diff-visual catch-up 재정의 4.8.0), adae305 (spec/issue 013 + ADR 0010) — **전부 이전 세션 산출물.** 이번 세션 커밋 없음.

**완료된 것 (산출물 = 이 핸드오프 문서 + 대화 내 분석):**
- vision-powers 정체성/경계 재규정 (아래 Decisions)
- 참고 프로젝트 5종 딥다이브 완료 (archify · effective-html · visual-explainer · gitdiagram · diagram-design)
- 개선안 우선순위화 (큰 것 1개 + 저비용 5개) + 폐기 항목 확정

**미완료:** 스펙 문서(014) 미작성, 코드 변경 0건.

## Decisions Made

### 1. [최우선 개선] 다이어그램 위상 검증 — "구조화·검증·렌더"의 경량판만 채택

- **수렴 근거:** archify · gitdiagram · visual-explainer 3개가 독립적으로 같은 결론에 도달 — *"LLM이 다이어그램 문법을 직접 쓰게 하지 말고, 구조화 데이터(노드/엣지) → 실재 검증 → 결정론적 렌더."*
  - archify: 엣지 양끝·경계 멤버가 실재 노드로 resolve 안 되면 렌더 하드 실패 (git 불필요). 근거: `references/archify/archify/renderers/architecture/render-architecture.mjs` (약 409, 508행 부근 referential-integrity 체크).
  - gitdiagram: 2-pass(설명→schema 검증 JSON graph), `node.path`를 실제 파일트리 Set에 대조 → path-only 오류는 재시도 없이 링크만 제거(`stripUnknownNodePaths`), 구조 오류만 재시도(최대 3회), **Mermaid는 코드가 생성(LLM 아님)**. 근거: `references/gitdiagram/src/server/generate/{prompts.ts,graph-planner.ts,graph.ts}`, README 51–59행.
- **vision-powers의 구멍:** 코드 텍스트는 추출로 grounding하지만(`plugins/vision-powers/scripts/extract-hunks.js`), **다이어그램은 프리핸드=무검증**. 이는 vision-powers가 ADR 0005/0010에서 선언한 실패모드("틀린 스니펫/다이어그램은 틀린 시스템을 가르친다")를 다이어그램 층에서 그대로 노출한 것.
- **채택 범위 (중요 — 전체 도입 아님):**
  - `diff-visual`: **경량 검증 훅만.** fact sheet(SKILL.md의 `### Verification Checkpoint`)에 인용한 노드 집합을 나열 → before/after 다이어그램의 엣지 양끝이 그 집합에 실재하는지 assert. 없으면 거부.
  - `doc-visual`: 동일하되 파일트리가 없으므로 문서 heading/anchor에 대조.
  - `plugin-visual`: 실제 파일트리가 있어 full 적용 가능(구조 intermediate + path 검증 + 결정론 컴파일)하지만 **사용자 개발용 아님 → 후순위**.
- **⚠️ 제약:** `plugins/vision-powers/skills/diff-visual/SKILL.md:33` — *"write it directly — no templates, no intermediate JSON, no agent chains."* 따라서 **전체 typed-IR/컴파일러 재작성은 이 원칙과 정면충돌 → 금지.** 검증 assert 훅만 좁게 채택.

### 2. 저비용 개선 5개 (곁다리로 묶어 함께)

| # | 개선 | 근거 프로젝트 | 현재 상태 |
|---|---|---|---|
| a | `artifact-gate.js`에 `supportedFixes` 구조화 진단 추가 | archify (`renderers/shared/repository-evidence.mjs`, `validator.mjs`) | 현재는 free-text만: `plugins/vision-powers/scripts/artifact-gate.js`의 `violations.push({ rule, hint })` (예: 104,143,148,185행) — `supportedFixes`/severity 없음 |
| b | generic 자가체크("주제 바꿔도 같은 비주얼이 말되면 너무 뻔한 것") | effective-html (`skills/html/SKILL.md:75`) | 없음 → `references/design-system/visual-self-audit.md`에 1줄 추가 |
| c | anti-slop 팔레트 블록리스트 병합(남들이 더 촘촘) | effective-html(`skills/design-artifact/SKILL.md:34`) · visual-explainer(SKILL "Avoid generic defaults") | `plugins/vision-powers/references/design-system/anti-slop-tells.md` 존재하나 목록 더 좁음 |
| d | 다크모드 반전 규칙 1줄(light `rgba(ink,X)`→dark `rgba(paper,X)`) | diagram-design (`references/style-guide.md:34-36`) | `plugins/vision-powers/references/design-system/semantic-tokens.md`에 값은 있으나 파생 규칙 명문화 안 됨 |
| e | phantom(점선) 노드 관례 — before/after 삭제·이동 요소 표기 | archify (`delta/architecture-delta.mjs`) | 없음 → diff-visual before/after Mermaid에 관례 추가 |

### 3. 폐기 확정 (도입 안 함)

- **자동 라우팅(장황 출력 자동 감지→HTML 승격):** visual-explainer 소스 검증 결과 hook/코드 없음. SKILL.md 프로즈 2줄이 전부("출력이 시각적이면 HTML 선호", "테이블 4+행/3+열이면 HTML"). Claude의 스킬 자동선택 행동에 기대는 프롬프트 넛지일 뿐. 이득 없어 폐기. (근거: `references/visual-explainer/plugins/visual-explainer/SKILL.md` 15–20행, `find -iname "*hook*"` 무결과)
- **전체 typed-IR 컴파일러:** Decision 1의 제약 참조.
- **서버 인프라 / 외부 AI API / 10-하네스 이식 / PPTX export / 브랜드 온보딩(URL→팔레트) / `/share-page`(gitdiagram·visual-explainer 코드에 아예 없음, git 이력에도 없음).**

### 4. 정체성/경계

- 코어 = **doc-visual + diff-visual** (사용자 실사용). 사이드카 = plugin-visual · fact-check · context-health-visual · report-manager.
- fact-check = "문서 주장을 실제 코드/git과 대조해 틀린 주장 인플레이스 수정, Artifact면 같은 링크에 재발행" = 사실상 doc-visual의 짝.
- **스킬 추가하지 않음.** 문제는 스킬 수가 아니라 응집도 → 통합·심화 방향.

## What Worked

- **참고 프로젝트 5종을 서브에이전트 병렬 딥다이브**(각 sonnet, "칭찬 말고 이식 가능한 메커니즘 3~5개 + 안티패턴 + 검증한 파일 경로만" 지시) — 정확한 파일:행 근거가 달린 결과가 나와 수렴 패턴을 빠르게 식별할 수 있었음. 다음에도 재사용할 패턴.
- **사용자가 매체 vs 페인포인트 프레이밍을 계속 교정**해줘서 정체성이 실사용에 맞게 좁혀짐. ADR 0010의 "11 reports, all while developing plugins, zero at work" 문장이 결정적 근거였음.

## What Didn't Work

- ⚠️ **초기에 "자동 라우팅을 hook/트리거 층으로 도입"을 근거 없이 제안**했다가 사용자가 출처를 물어 철회함. 교훈: wiki 요약("visual-explainer가 자동 라우팅 표방")을 소스 검증 전에 메커니즘으로 단정하지 말 것. 소스 확인 결과 프로즈 넛지에 불과했음.
- ⚠️ 초기에 "이해 부채"로 정체성을 과도하게 좁혔다가 교정됨. 근본은 가독성/가시성(Thariq thesis), 이해 부채는 그 응용.

## Next Steps

First Action(스펙 014 작성) 이후:

1. **스펙 014 = Decision 1(다이어그램 위상 검증 경량판) 중심**, Decision 2의 5개는 같은 스펙에 곁다리 섹션 or 별도 이슈로.
2. 구현 순서 제안: (a) diff-visual/doc-visual SKILL.md에 "다이어그램 그리기 전 노드 집합 나열 → 엣지 endpoint assert" 지시 추가 → (b) `artifact-gate.js`에 위상 검증 + `supportedFixes` 확장 → (c) 저비용 b~e는 문서/프롬프트 수정.
3. 릴리스: `docs/release-workflow.md` 8단계. 버전은 기능 추가이므로 minor bump (`marketplace.json`). develop에서 작업, main 직접 커밋 금지.

## 근거 파일 위치 (딥다이브 검증 완료)

- archify: `references/archify/archify/{schemas,renderers/shared,renderers/architecture,delta}/…`, `SKILL.md`, `DESIGN.md`, `PRODUCT.md`
- effective-html: `references/effective-html/skills/{html,html-wireframe,html-prototype,html-plan,html-diagram,design-artifact}/SKILL.md`, `examples/release-readiness/`
- visual-explainer: `references/visual-explainer/plugins/visual-explainer/{SKILL.md,commands/,quick/}`, `README.md`, `CHANGELOG.md`
- gitdiagram: `references/gitdiagram/src/server/generate/{prompts.ts,graph-planner.ts,graph.ts,openai.ts}`, `README.md`
- diagram-design: `references/diagram-design/skills/diagram-design/{SKILL.md,references/type-*.md,references/style-guide.md,references/onboarding.md,scripts/verify-geometry.py}`
- vision-powers 현재: `plugins/vision-powers/scripts/{artifact-gate.js,extract-hunks.js,render-report.js}`, `plugins/vision-powers/references/design-system/*.md`, `plugins/vision-powers/skills/{diff-visual,doc-visual}/SKILL.md`
- 정체성 근거: `docs/adr/0010-diff-visual-catch-up-before-review.md`, `docs/specs/013-diff-visual-catch-up.md`, wiki `concepts/html-as-agent-artifact.md` · `summaries/unreasonable-effectiveness-html.md`
